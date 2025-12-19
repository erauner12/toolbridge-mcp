/**
 * Typed shapes for Apps SDK structuredContent.
 *
 * These define the exact contract between tool responses and widget templates.
 * IMPORTANT: Use snake_case to match existing Apps SDK template expectations.
 */

import type { Note, Task } from "../../api/types.js";

// ============================================================================
// Note Serialization Shapes
// ============================================================================

export interface SerializedNote {
  uid: string;
  version: number;
  updatedAt: string | null;
  deletedAt: string | null;
  payload: Record<string, unknown>;
}

export interface AppsNotesListSC {
  notes: SerializedNote[];
  limit: number;
  includeDeleted: boolean;
  nextCursor: string | null;
}

export interface AppsNoteDetailSC {
  note: SerializedNote;
}

export interface AppsNoteDeletedSC extends AppsNotesListSC {
  deletedNote: SerializedNote;
}

// ============================================================================
// Task Serialization Shapes
// ============================================================================

export interface SerializedTask {
  uid: string;
  version: number;
  updatedAt: string | null;
  deletedAt: string | null;
  payload: Record<string, unknown>;
}

export interface AppsTasksListSC {
  tasks: SerializedTask[];
  limit: number;
  includeDeleted: boolean;
  nextCursor: string | null;
}

export interface AppsTaskDetailSC {
  task: SerializedTask;
}

export interface AppsTaskProcessedSC extends AppsTasksListSC {
  processedTask: SerializedTask;
  action: string;
}

export interface AppsTaskArchivedSC extends AppsTasksListSC {
  archivedTask: SerializedTask;
}

// ============================================================================
// Note Edit Session Shapes
// ============================================================================

export type HunkKind = "unchanged" | "added" | "removed" | "modified";
export type HunkStatus = "pending" | "accepted" | "rejected" | "revised";

export interface SerializedHunk {
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

export interface HunkCounts {
  pending: number;
  accepted: number;
  rejected: number;
  revised: number;
}

export interface AppsNoteEditSC {
  editId: string;
  note: SerializedNote;
  hunks: SerializedHunk[];
  summary: string | null;
  counts?: HunkCounts;
}

export interface AppsNoteEditSuccessSC {
  success: true;
  editId: string;
  note: SerializedNote;
}

export interface AppsNoteEditDiscardedSC {
  discarded: true;
  editId: string;
  noteUid: string | null;
  title: string;
}

export interface AppsNoteEditErrorSC {
  error: string;
  editId: string;
  noteUid?: string | null;
}

export interface AppsHunkActionSC extends AppsNoteEditSC {
  hunkAction: {
    hunkId: string;
    action: "accepted" | "rejected" | "revised";
    revisedText?: string;
  };
}
