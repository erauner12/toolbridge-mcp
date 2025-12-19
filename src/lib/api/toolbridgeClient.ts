/**
 * ToolBridge Go backend API client.
 *
 * Mirrors the Python async_client.py and utils/requests.py functionality.
 */

import { env } from "../../config/env.js";
import type {
  Note,
  NotesListResponse,
  CreateNoteParams,
  UpdateNoteParams,
  PatchNoteParams,
  ProcessNoteParams,
  Task,
  TasksListResponse,
  CreateTaskParams,
  UpdateTaskParams,
  PatchTaskParams,
  ProcessTaskParams,
  ListParams,
  GetParams,
  ApiError,
} from "./types.js";

// ============================================================================
// Token Management
// ============================================================================

/**
 * Get access token from request headers.
 *
 * In xmcp, this would be extracted from the request context.
 * For now, we accept it as a parameter to each API call.
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
}

// ============================================================================
// HTTP Client Helpers
// ============================================================================

interface RequestOptions {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  accessToken: string;
  params?: Record<string, string | number | boolean>;
  body?: unknown;
  ifMatch?: number;
}

async function makeRequest<T>(options: RequestOptions): Promise<T> {
  const { method, path, accessToken, params, body, ifMatch } = options;

  // Build URL with query params
  const url = new URL(path, env.goApiBaseUrl);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  // Build headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };

  if (ifMatch !== undefined) {
    headers["If-Match"] = String(ifMatch);
  }

  // Make request
  const response = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Handle errors
  if (!response.ok) {
    const errorBody = await response.text();
    const error = new Error(
      `API request failed: ${response.status} ${response.statusText}`
    ) as ApiError;
    error.statusCode = response.status;
    error.responseBody = errorBody;
    throw error;
  }

  return response.json() as Promise<T>;
}

// ============================================================================
// Notes API
// ============================================================================

export async function listNotes(
  params: ListParams,
  accessToken: string
): Promise<NotesListResponse> {
  const queryParams: Record<string, string | number | boolean> = {
    limit: params.limit ?? 100,
  };

  if (params.cursor) {
    queryParams.cursor = params.cursor;
  }
  if (params.includeDeleted) {
    queryParams.includeDeleted = "true";
  }

  return makeRequest<NotesListResponse>({
    method: "GET",
    path: "/v1/notes",
    accessToken,
    params: queryParams,
  });
}

export async function getNote(
  params: GetParams,
  accessToken: string
): Promise<Note> {
  const queryParams: Record<string, string | boolean> = {};
  if (params.includeDeleted) {
    queryParams.includeDeleted = "true";
  }

  return makeRequest<Note>({
    method: "GET",
    path: `/v1/notes/${params.uid}`,
    accessToken,
    params: queryParams,
  });
}

export async function createNote(
  params: CreateNoteParams,
  accessToken: string
): Promise<Note> {
  const payload: Record<string, unknown> = {
    title: params.title,
    content: params.content,
  };

  if (params.tags) {
    payload.tags = params.tags;
  }
  if (params.additionalFields) {
    Object.assign(payload, params.additionalFields);
  }

  return makeRequest<Note>({
    method: "POST",
    path: "/v1/notes",
    accessToken,
    body: payload,
  });
}

export async function updateNote(
  params: UpdateNoteParams,
  accessToken: string
): Promise<Note> {
  const payload: Record<string, unknown> = {
    uid: params.uid,
    title: params.title,
    content: params.content,
  };

  if (params.additionalFields) {
    Object.assign(payload, params.additionalFields);
  }

  return makeRequest<Note>({
    method: "PUT",
    path: `/v1/notes/${params.uid}`,
    accessToken,
    body: payload,
    ifMatch: params.ifMatch,
  });
}

export async function patchNote(
  params: PatchNoteParams,
  accessToken: string
): Promise<Note> {
  return makeRequest<Note>({
    method: "PATCH",
    path: `/v1/notes/${params.uid}`,
    accessToken,
    body: params.updates,
  });
}

export async function deleteNote(uid: string, accessToken: string): Promise<Note> {
  return makeRequest<Note>({
    method: "DELETE",
    path: `/v1/notes/${uid}`,
    accessToken,
  });
}

export async function archiveNote(uid: string, accessToken: string): Promise<Note> {
  return makeRequest<Note>({
    method: "POST",
    path: `/v1/notes/${uid}/archive`,
    accessToken,
    body: {},
  });
}

export async function processNote(
  params: ProcessNoteParams,
  accessToken: string
): Promise<Note> {
  const payload: Record<string, unknown> = {
    action: params.action,
  };

  if (params.metadata) {
    payload.metadata = params.metadata;
  }

  return makeRequest<Note>({
    method: "POST",
    path: `/v1/notes/${params.uid}/process`,
    accessToken,
    body: payload,
  });
}

// ============================================================================
// Tasks API
// ============================================================================

export async function listTasks(
  params: ListParams,
  accessToken: string
): Promise<TasksListResponse> {
  const queryParams: Record<string, string | number | boolean> = {
    limit: params.limit ?? 100,
  };

  if (params.cursor) {
    queryParams.cursor = params.cursor;
  }
  if (params.includeDeleted) {
    queryParams.includeDeleted = "true";
  }

  return makeRequest<TasksListResponse>({
    method: "GET",
    path: "/v1/tasks",
    accessToken,
    params: queryParams,
  });
}

export async function getTask(
  params: GetParams,
  accessToken: string
): Promise<Task> {
  const queryParams: Record<string, string | boolean> = {};
  if (params.includeDeleted) {
    queryParams.includeDeleted = "true";
  }

  return makeRequest<Task>({
    method: "GET",
    path: `/v1/tasks/${params.uid}`,
    accessToken,
    params: queryParams,
  });
}

export async function createTask(
  params: CreateTaskParams,
  accessToken: string
): Promise<Task> {
  const payload: Record<string, unknown> = {
    title: params.title,
  };

  if (params.description) payload.description = params.description;
  if (params.status) payload.status = params.status;
  if (params.priority) payload.priority = params.priority;
  if (params.dueDate) payload.dueDate = params.dueDate;
  if (params.tags) payload.tags = params.tags;
  if (params.additionalFields) {
    Object.assign(payload, params.additionalFields);
  }

  return makeRequest<Task>({
    method: "POST",
    path: "/v1/tasks",
    accessToken,
    body: payload,
  });
}

export async function updateTask(
  params: UpdateTaskParams,
  accessToken: string
): Promise<Task> {
  const payload: Record<string, unknown> = {
    uid: params.uid,
    title: params.title,
  };

  if (params.description) payload.description = params.description;
  if (params.status) payload.status = params.status;
  if (params.additionalFields) {
    Object.assign(payload, params.additionalFields);
  }

  return makeRequest<Task>({
    method: "PUT",
    path: `/v1/tasks/${params.uid}`,
    accessToken,
    body: payload,
    ifMatch: params.ifMatch,
  });
}

export async function patchTask(
  params: PatchTaskParams,
  accessToken: string
): Promise<Task> {
  return makeRequest<Task>({
    method: "PATCH",
    path: `/v1/tasks/${params.uid}`,
    accessToken,
    body: params.updates,
  });
}

export async function deleteTask(uid: string, accessToken: string): Promise<Task> {
  return makeRequest<Task>({
    method: "DELETE",
    path: `/v1/tasks/${uid}`,
    accessToken,
  });
}

export async function archiveTask(uid: string, accessToken: string): Promise<Task> {
  return makeRequest<Task>({
    method: "POST",
    path: `/v1/tasks/${uid}/archive`,
    accessToken,
    body: {},
  });
}

export async function processTask(
  params: ProcessTaskParams,
  accessToken: string
): Promise<Task> {
  const payload: Record<string, unknown> = {
    action: params.action,
  };

  if (params.metadata) {
    payload.metadata = params.metadata;
  }

  return makeRequest<Task>({
    method: "POST",
    path: `/v1/tasks/${params.uid}/process`,
    accessToken,
    body: payload,
  });
}
