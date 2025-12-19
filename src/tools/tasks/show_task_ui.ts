/**
 * show_task_ui - Show a single task with embedded MCP-UI display.
 *
 * Ports Python toolbridge_mcp/ui/tools/tasks.py::show_task_ui.
 */

import { z } from "zod";
import * as api from "../../lib/api/toolbridgeClient.js";
import { getBackendAuth } from "../../lib/auth/index.js";
import { buildUiWithStructuredContent, type UIFormat } from "../../lib/ui/mcpUi.js";
import { renderTaskDetailHtml } from "../../lib/ui/html/tasks.js";
import { serializeTaskDetail } from "../../lib/ui/structured/serialize.js";
import { APPS_TASK_DETAIL_URI } from "../../config/env.js";

// ============================================================================
// Schema
// ============================================================================

export const schema = {
  uid: z.string().describe("The unique identifier of the task to show"),
  include_deleted: z
    .boolean()
    .default(false)
    .describe("Include soft-deleted tasks"),
  ui_format: z
    .enum(["html", "remote-dom", "both"])
    .default("html")
    .describe("UI format to return"),
};

export type ShowTaskUiInput = z.infer<z.ZodObject<typeof schema>>;

// ============================================================================
// Metadata
// ============================================================================

export const metadata = {
  name: "show_task_ui",
  description: "Show a single task with an interactive UI display. Returns both a text summary and an embedded HTML resource for rich rendering.",
  _meta: {
    "openai/outputTemplate": APPS_TASK_DETAIL_URI,
    "openai/widgetAccessible": true,
    "openai/toolInvocation/deleteOnSend": true,
    "openai/toolInvocation/displayDelayMs": 50,
  },
};

// ============================================================================
// Handler
// ============================================================================

export default async function handler(input: ShowTaskUiInput) {
  const { uid, include_deleted, ui_format } = input;

  // Get authenticated context for API calls
  const auth = await getBackendAuth();

  // 1. Fetch task from API
  const task = await api.getTask(
    {
      uid,
      includeDeleted: include_deleted,
    },
    auth
  );

  // 2. Build server-rendered HTML
  const html = renderTaskDetailHtml(task);

  // 3. Build text fallback summary
  const title = task.payload.title ?? "Untitled";
  const status = task.payload.status ?? "todo";
  const description = (task.payload.description ?? "").toString();
  const preview = description.substring(0, 100) + (description.length > 100 ? "..." : "");
  const textSummary = `Task: "${title}" [${status}]\n\n${preview}`;

  // 4. Build structured content for Apps SDK
  const structuredContent = serializeTaskDetail(task);

  // 5. Build and return MCP-UI response
  return buildUiWithStructuredContent({
    uri: `ui://toolbridge/tasks/${uid}`,
    html,
    remoteDom: null,
    textSummary,
    uiFormat: ui_format as UIFormat,
    structuredContent,
  });
}
