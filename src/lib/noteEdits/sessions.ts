/**
 * In-memory note edit session storage.
 *
 * Ports Python toolbridge_mcp/note_edit_sessions.py functionality.
 *
 * Maintains short-lived "pending edits" so that:
 * - `edit_note_ui` can create a session (original + proposed)
 * - `apply_note_edit` / `discard_note_edit` can refer to that session by ID
 * - We can do optimistic concurrency checks (version at create vs version at apply)
 *
 * Note: This is per-process storage. Multi-instance deployments will need
 * a shared store (Redis/DB) in the future.
 */

import { v4 as uuidv4 } from "uuid";
import type { Note } from "../api/types.js";
import {
  type DiffHunk,
  type HunkKind,
  type HunkStatus,
  type HunkDecision,
  computeLineDiff,
  annotateHunksWithIds,
  applyHunkDecisions,
} from "./diff.js";

// ============================================================================
// Types
// ============================================================================

export interface NoteEditHunkState {
  id: string;
  kind: HunkKind;
  original: string;
  proposed: string;
  status: HunkStatus;
  revisedText: string | null;
  origStart: number | null;
  origEnd: number | null;
  newStart: number | null;
  newEnd: number | null;
}

export interface NoteEditSession {
  id: string;
  noteUid: string;
  baseVersion: number;
  title: string;
  originalContent: string;
  proposedContent: string;
  summary: string | null;
  createdAt: Date;
  createdBy: string | null;
  hunks: NoteEditHunkState[];
  currentContent: string | null; // Merged content based on decisions
}

export interface HunkCounts {
  pending: number;
  accepted: number;
  rejected: number;
  revised: number;
}

// ============================================================================
// Session Storage
// ============================================================================

const sessions = new Map<string, NoteEditSession>();

// Session expiration (1 hour)
const SESSION_MAX_AGE_MS = 60 * 60 * 1000;

/**
 * Create a new note edit session.
 */
export function createSession(args: {
  note: Note;
  proposedContent: string;
  summary?: string | null;
  userId?: string | null;
  hunks?: DiffHunk[];
}): NoteEditSession {
  const { note, proposedContent, summary = null, userId = null, hunks } = args;

  const sessionId = uuidv4().replace(/-/g, "");

  // Build per-hunk state from DiffHunks
  const hunkStates: NoteEditHunkState[] = [];
  if (hunks) {
    for (const h of hunks) {
      // Unchanged hunks are implicitly accepted; changed hunks start pending
      const status: HunkStatus = h.kind === "unchanged" ? "accepted" : "pending";
      hunkStates.push({
        id: h.id ?? "",
        kind: h.kind,
        original: h.original,
        proposed: h.proposed,
        status,
        revisedText: null,
        origStart: h.origStart,
        origEnd: h.origEnd,
        newStart: h.newStart,
        newEnd: h.newEnd,
      });
    }
  }

  const session: NoteEditSession = {
    id: sessionId,
    noteUid: note.uid,
    baseVersion: note.version,
    title: (note.payload.title ?? "Untitled note").toString().trim(),
    originalContent: (note.payload.content ?? "").toString(),
    proposedContent,
    summary,
    createdAt: new Date(),
    createdBy: userId,
    hunks: hunkStates,
    currentContent: null,
  };

  sessions.set(sessionId, session);
  return session;
}

/**
 * Retrieve a session by ID.
 */
export function getSession(editId: string): NoteEditSession | null {
  return sessions.get(editId) ?? null;
}

/**
 * Remove and return a session.
 */
export function discardSession(editId: string): NoteEditSession | null {
  const session = sessions.get(editId);
  if (session) {
    sessions.delete(editId);
    return session;
  }
  return null;
}

/**
 * Update the status of a specific hunk in a session.
 */
export function setHunkStatus(
  editId: string,
  hunkId: string,
  status: HunkStatus,
  revisedText?: string | null
): NoteEditSession | null {
  const session = sessions.get(editId);
  if (!session) {
    return null;
  }

  // Find and update the hunk
  for (const hunk of session.hunks) {
    if (hunk.id === hunkId) {
      hunk.status = status;
      hunk.revisedText = status === "revised" ? (revisedText ?? null) : null;
      break;
    }
  }

  // Recompute current_content if all changed hunks are resolved
  recomputeCurrentContent(session);

  return session;
}

/**
 * Recompute session.currentContent based on hunk statuses.
 */
function recomputeCurrentContent(session: NoteEditSession): void {
  // Check if any changed hunk is still pending
  const anyPending = session.hunks.some(
    (h) => h.status === "pending" && h.kind !== "unchanged"
  );

  if (anyPending) {
    session.currentContent = null;
    return;
  }

  // Build decisions map from session hunks
  const decisions = new Map<string, HunkDecision>();
  for (const h of session.hunks) {
    if (h.id) {
      decisions.set(h.id, {
        status: h.status,
        revisedText: h.revisedText,
      });
    }
  }

  // Recompute diff from full content (no truncation) to avoid data loss
  let fullHunks = computeLineDiff(session.originalContent, session.proposedContent, {
    truncateUnchanged: false,
  });
  fullHunks = annotateHunksWithIds(fullHunks);

  try {
    session.currentContent = applyHunkDecisions(fullHunks, decisions);
  } catch {
    session.currentContent = null;
  }
}

/**
 * Get all pending (non-unchanged) hunks for a session.
 */
export function getPendingHunks(editId: string): NoteEditHunkState[] {
  const session = sessions.get(editId);
  if (!session) {
    return [];
  }

  return session.hunks.filter(
    (h) => h.kind !== "unchanged" && h.status === "pending"
  );
}

/**
 * Get counts of hunks by status for a session.
 */
export function getHunkCounts(editId: string): HunkCounts {
  const counts: HunkCounts = {
    pending: 0,
    accepted: 0,
    rejected: 0,
    revised: 0,
  };

  const session = sessions.get(editId);
  if (!session) {
    return counts;
  }

  for (const h of session.hunks) {
    // Only count changed hunks (exclude unchanged)
    if (h.kind !== "unchanged") {
      counts[h.status]++;
    }
  }

  return counts;
}

/**
 * Remove sessions older than max_age.
 */
export function cleanupExpiredSessions(
  maxAgeMs: number = SESSION_MAX_AGE_MS
): number {
  const now = Date.now();
  let count = 0;

  for (const [id, session] of sessions) {
    if (now - session.createdAt.getTime() > maxAgeMs) {
      sessions.delete(id);
      count++;
    }
  }

  return count;
}

/**
 * Get the current number of active sessions.
 */
export function getSessionCount(): number {
  return sessions.size;
}
