/**
 * API types for ToolBridge Go backend.
 *
 * These types mirror the Python Pydantic models in toolbridge_mcp/tools/notes.py
 * and toolbridge_mcp/tools/tasks.py.
 */

// ============================================================================
// Note Types
// ============================================================================

export interface Note {
  uid: string;
  version: number;
  updatedAt: string;
  deletedAt: string | null;
  payload: NotePayload;
}

export interface NotePayload {
  title?: string;
  content?: string;
  tags?: string[];
  status?: "active" | "archived" | "pinned";
  [key: string]: unknown; // Allow additional custom fields
}

export interface NotesListResponse {
  items: Note[];
  nextCursor: string | null;
}

export interface CreateNoteParams {
  title: string;
  content: string;
  tags?: string[];
  additionalFields?: Record<string, unknown>;
}

export interface UpdateNoteParams {
  uid: string;
  title: string;
  content: string;
  ifMatch?: number;
  additionalFields?: Record<string, unknown>;
}

export interface PatchNoteParams {
  uid: string;
  updates: Record<string, unknown>;
}

export interface ProcessNoteParams {
  uid: string;
  action: "pin" | "unpin" | "archive" | "unarchive";
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Task Types
// ============================================================================

export interface Task {
  uid: string;
  version: number;
  updatedAt: string;
  deletedAt: string | null;
  payload: TaskPayload;
}

export interface TaskPayload {
  title?: string;
  description?: string;
  status?: "todo" | "in_progress" | "done" | "archived";
  priority?: "low" | "medium" | "high";
  dueDate?: string;
  tags?: string[];
  [key: string]: unknown; // Allow additional custom fields
}

export interface TasksListResponse {
  items: Task[];
  nextCursor: string | null;
}

export interface CreateTaskParams {
  title: string;
  description?: string;
  status?: "todo" | "in_progress" | "done";
  priority?: "low" | "medium" | "high";
  dueDate?: string;
  tags?: string[];
  additionalFields?: Record<string, unknown>;
}

export interface UpdateTaskParams {
  uid: string;
  title: string;
  description?: string;
  status?: string;
  ifMatch?: number;
  additionalFields?: Record<string, unknown>;
}

export interface PatchTaskParams {
  uid: string;
  updates: Record<string, unknown>;
}

export interface ProcessTaskParams {
  uid: string;
  action: "start" | "complete" | "reopen";
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Common Types
// ============================================================================

export interface ListParams {
  limit?: number;
  cursor?: string | null;
  includeDeleted?: boolean;
}

export interface GetParams {
  uid: string;
  includeDeleted?: boolean;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public responseBody?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}
