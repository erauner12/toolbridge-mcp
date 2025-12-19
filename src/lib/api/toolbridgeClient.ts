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
// Auth Types
// ============================================================================

/**
 * Authentication bundle for Go backend API calls.
 *
 * This is passed to API functions to provide both the access token
 * and tenant header required by the Go backend.
 */
export interface BackendAuth {
  /** Bearer token for Authorization header */
  accessToken: string;
  /** Tenant ID for X-TB-Tenant-ID header */
  tenantId: string;
}

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
  auth: BackendAuth;
  params?: Record<string, string | number | boolean>;
  body?: unknown;
  ifMatch?: number;
}

async function makeRequest<T>(options: RequestOptions): Promise<T> {
  const { method, path, auth, params, body, ifMatch } = options;

  // Build URL with query params
  const url = new URL(path, env.goApiBaseUrl);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  // Build headers with tenant ID
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${auth.accessToken}`,
    "X-TB-Tenant-ID": auth.tenantId,
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
  auth: BackendAuth
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
    auth,
    params: queryParams,
  });
}

export async function getNote(
  params: GetParams,
  auth: BackendAuth
): Promise<Note> {
  const queryParams: Record<string, string | boolean> = {};
  if (params.includeDeleted) {
    queryParams.includeDeleted = "true";
  }

  return makeRequest<Note>({
    method: "GET",
    path: `/v1/notes/${params.uid}`,
    auth,
    params: queryParams,
  });
}

export async function createNote(
  params: CreateNoteParams,
  auth: BackendAuth
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
    auth,
    body: payload,
  });
}

export async function updateNote(
  params: UpdateNoteParams,
  auth: BackendAuth
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
    auth,
    body: payload,
    ifMatch: params.ifMatch,
  });
}

export async function patchNote(
  params: PatchNoteParams,
  auth: BackendAuth
): Promise<Note> {
  return makeRequest<Note>({
    method: "PATCH",
    path: `/v1/notes/${params.uid}`,
    auth,
    body: params.updates,
  });
}

export async function deleteNote(uid: string, auth: BackendAuth): Promise<Note> {
  return makeRequest<Note>({
    method: "DELETE",
    path: `/v1/notes/${uid}`,
    auth,
  });
}

export async function archiveNote(uid: string, auth: BackendAuth): Promise<Note> {
  return makeRequest<Note>({
    method: "POST",
    path: `/v1/notes/${uid}/archive`,
    auth,
    body: {},
  });
}

export async function processNote(
  params: ProcessNoteParams,
  auth: BackendAuth
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
    auth,
    body: payload,
  });
}

// ============================================================================
// Tasks API
// ============================================================================

export async function listTasks(
  params: ListParams,
  auth: BackendAuth
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
    auth,
    params: queryParams,
  });
}

export async function getTask(
  params: GetParams,
  auth: BackendAuth
): Promise<Task> {
  const queryParams: Record<string, string | boolean> = {};
  if (params.includeDeleted) {
    queryParams.includeDeleted = "true";
  }

  return makeRequest<Task>({
    method: "GET",
    path: `/v1/tasks/${params.uid}`,
    auth,
    params: queryParams,
  });
}

export async function createTask(
  params: CreateTaskParams,
  auth: BackendAuth
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
    auth,
    body: payload,
  });
}

export async function updateTask(
  params: UpdateTaskParams,
  auth: BackendAuth
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
    auth,
    body: payload,
    ifMatch: params.ifMatch,
  });
}

export async function patchTask(
  params: PatchTaskParams,
  auth: BackendAuth
): Promise<Task> {
  return makeRequest<Task>({
    method: "PATCH",
    path: `/v1/tasks/${params.uid}`,
    auth,
    body: params.updates,
  });
}

export async function deleteTask(uid: string, auth: BackendAuth): Promise<Task> {
  return makeRequest<Task>({
    method: "DELETE",
    path: `/v1/tasks/${uid}`,
    auth,
  });
}

export async function archiveTask(uid: string, auth: BackendAuth): Promise<Task> {
  return makeRequest<Task>({
    method: "POST",
    path: `/v1/tasks/${uid}/archive`,
    auth,
    body: {},
  });
}

export async function processTask(
  params: ProcessTaskParams,
  auth: BackendAuth
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
    auth,
    body: payload,
  });
}
