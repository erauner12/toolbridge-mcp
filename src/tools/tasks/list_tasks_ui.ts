/**
 * list_tasks_ui - List tasks with embedded MCP-UI display.
 *
 * Ports Python toolbridge_mcp/ui/tools/tasks.py::list_tasks_ui.
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

export const schema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe("Maximum number of tasks to return"),
  include_deleted: z
    .boolean()
    .default(false)
    .describe("Include soft-deleted tasks"),
  ui_format: z
    .enum(["html", "remote-dom", "both"])
    .default("html")
    .describe("UI format to return"),
});

export type ListTasksUiInput = z.infer<typeof schema>;

// ============================================================================
// Metadata
// ============================================================================

export const metadata = {
  name: "list_tasks_ui",
  description: "List tasks with an interactive UI display. Returns both a text summary and an embedded HTML resource for rich rendering.",
  _meta: {
    "openai/outputTemplate": APPS_TASKS_LIST_URI,
    "openai/widgetAccessible": true,
    "openai/toolInvocation/deleteOnSend": true,
    "openai/toolInvocation/displayDelayMs": 50,
  },
};

// ============================================================================
// Handler
// ============================================================================

export default async function handler(input: ListTasksUiInput) {
  const { limit, include_deleted, ui_format } = input;

  // Get authenticated context for API calls
  const auth = await getBackendAuth();

  // 1. Fetch tasks from API
  const response = await api.listTasks(
    {
      limit,
      includeDeleted: include_deleted,
    },
    auth
  );

  const tasks = response.items;
  const nextCursor = response.nextCursor;

  // 2. Build server-rendered HTML
  const html = renderTasksListHtml(tasks, limit, include_deleted);

  // 3. Build text fallback summary
  const textSummary = tasks.length === 0
    ? "No tasks found."
    : `Found ${tasks.length} task(s). Use the UI to view details.`;

  // 4. Build structured content for Apps SDK
  const structuredContent = serializeTasksList(tasks, limit, include_deleted, nextCursor);

  // 5. Build and return MCP-UI response
  return buildUiWithStructuredContent({
    uri: `ui://toolbridge/tasks/list`,
    html,
    remoteDom: null,
    textSummary,
    uiFormat: ui_format as UIFormat,
    structuredContent,
  });
}
