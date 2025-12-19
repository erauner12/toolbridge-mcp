/**
 * process_task_ui - Process a task action (start, complete, reopen).
 *
 * Ports Python toolbridge_mcp/ui/tools/tasks.py::process_task_ui.
 */

import { z } from "zod";
import * as api from "../../lib/api/toolbridgeClient.js";
import { getBackendAuth } from "../../lib/auth/index.js";
import { buildUiWithStructuredContent, type UIFormat } from "../../lib/ui/mcpUi.js";
import { renderTasksListHtml } from "../../lib/ui/html/tasks.js";
import { serializeTasksList } from "../../lib/ui/structured/serialize.js";
import { APPS_TASKS_LIST_URI } from "../../config/env.js";

// ============================================================================
// Schema
// ============================================================================

export const schema = {
  uid: z.string().describe("The unique identifier of the task to process"),
  action: z
    .enum(["start", "complete", "reopen"])
    .describe("The action to perform on the task"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe("Maximum number of tasks to return in refreshed list"),
  include_deleted: z
    .boolean()
    .default(false)
    .describe("Include soft-deleted tasks in refreshed list"),
  ui_format: z
    .enum(["html", "remote-dom", "both"])
    .default("html")
    .describe("UI format to return"),
};

export type ProcessTaskUiInput = z.infer<z.ZodObject<typeof schema>>;

// ============================================================================
// Metadata
// ============================================================================

export const metadata = {
  name: "process_task_ui",
  description: "Process a task action (start, complete, or reopen) and return an updated tasks list UI.",
  _meta: {
    "openai/outputTemplate": APPS_TASKS_LIST_URI,
    "openai/widgetAccessible": true,
    "openai/visibility": "private",
    "openai/toolInvocation/deleteOnSend": true,
    "openai/toolInvocation/displayDelayMs": 50,
  },
};

// ============================================================================
// Handler
// ============================================================================

export default async function handler(input: ProcessTaskUiInput) {
  const { uid, action, limit, include_deleted, ui_format } = input;

  // Get authenticated context for API calls
  const auth = await getBackendAuth();

  // 1. Process the task action
  await api.processTask(
    {
      uid,
      action,
    },
    auth
  );

  // 2. Fetch updated tasks list
  const response = await api.listTasks(
    {
      limit,
      includeDeleted: include_deleted,
    },
    auth
  );

  const tasks = response.items;
  const nextCursor = response.nextCursor;

  // 3. Build server-rendered HTML
  const html = renderTasksListHtml(tasks, limit, include_deleted);

  // 4. Build text fallback summary
  const actionPast = action === "start" ? "started" : action === "complete" ? "completed" : "reopened";
  const textSummary = `Task ${actionPast}. ${tasks.length} task(s) in list.`;

  // 5. Build structured content for Apps SDK
  const structuredContent = serializeTasksList(tasks, limit, include_deleted, nextCursor);

  // 6. Build and return MCP-UI response
  return buildUiWithStructuredContent({
    uri: `ui://toolbridge/tasks/list`,
    html,
    remoteDom: null,
    textSummary,
    uiFormat: ui_format as UIFormat,
    structuredContent,
  });
}
