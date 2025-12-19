/**
 * Serialization functions for Apps SDK structuredContent.
 *
 * These functions convert internal types to the shapes expected by widget templates.
 */

import type { Note, Task } from "../../api/types.js";
import type { NoteEditHunkState } from "../../noteEdits/sessions.js";
import type {
  SerializedNote,
  SerializedTask,
  SerializedHunk,
  AppsNotesListSC,
  AppsNoteDetailSC,
  AppsTasksListSC,
  AppsTaskDetailSC,
  AppsNoteEditSC,
  HunkCounts,
} from "./shapes.js";

// ============================================================================
// Note Serialization
// ============================================================================

export function serializeNote(note: Note): SerializedNote {
  return {
    uid: note.uid,
    version: note.version,
    updatedAt: note.updatedAt,
    deletedAt: note.deletedAt,
    payload: note.payload,
  };
}

export function serializeNotesList(
  notes: Note[],
  limit: number,
  includeDeleted: boolean,
  nextCursor: string | null = null
): AppsNotesListSC {
  return {
    notes: notes.map(serializeNote),
    limit,
    includeDeleted,
    nextCursor,
  };
}

export function serializeNoteDetail(note: Note): AppsNoteDetailSC {
  return {
    note: serializeNote(note),
  };
}

// ============================================================================
// Task Serialization
// ============================================================================

export function serializeTask(task: Task): SerializedTask {
  return {
    uid: task.uid,
    version: task.version,
    updatedAt: task.updatedAt,
    deletedAt: task.deletedAt,
    payload: task.payload,
  };
}

export function serializeTasksList(
  tasks: Task[],
  limit: number,
  includeDeleted: boolean,
  nextCursor: string | null = null
): AppsTasksListSC {
  return {
    tasks: tasks.map(serializeTask),
    limit,
    includeDeleted,
    nextCursor,
  };
}

export function serializeTaskDetail(task: Task): AppsTaskDetailSC {
  return {
    task: serializeTask(task),
  };
}

// ============================================================================
// Note Edit Session Serialization
// ============================================================================

export function serializeHunk(hunk: NoteEditHunkState): SerializedHunk {
  return {
    id: hunk.id,
    kind: hunk.kind,
    original: hunk.original,
    proposed: hunk.proposed,
    status: hunk.status,
    revisedText: hunk.revisedText,
    origStart: hunk.origStart,
    origEnd: hunk.origEnd,
    newStart: hunk.newStart,
    newEnd: hunk.newEnd,
  };
}

export function serializeEditSession(
  editId: string,
  note: Note,
  hunks: NoteEditHunkState[],
  summary: string | null = null,
  counts?: HunkCounts
): AppsNoteEditSC {
  return {
    editId,
    note: serializeNote(note),
    hunks: hunks.map(serializeHunk),
    summary,
    counts,
  };
}

export function computeHunkCounts(hunks: NoteEditHunkState[]): HunkCounts {
  const counts: HunkCounts = {
    pending: 0,
    accepted: 0,
    rejected: 0,
    revised: 0,
  };

  for (const hunk of hunks) {
    // Only count changed hunks (exclude unchanged)
    if (hunk.kind !== "unchanged") {
      counts[hunk.status]++;
    }
  }

  return counts;
}
