/**
 * archive_task_ui - Archive a task and refresh the tasks list UI.
 *
 * Ports Python toolbridge_mcp/ui/tools/tasks.py::archive_task_ui.
 */

import { z } from "zod";
import * as api from "../../lib/api/toolbridgeClient.js";
import { buildUiWithStructuredContent, type UIFormat } from "../../lib/ui/mcpUi.js";
import { renderTasksListHtml } from "../../lib/ui/html/tasks.js";
import { serializeTasksList } from "../../lib/ui/structured/serialize.js";
import { APPS_TASKS_LIST_URI } from "../../config/env.js";

// ============================================================================
// Schema
// ============================================================================

export const schema = z.object({
  uid: z.string().describe("The unique identifier of the task to archive"),
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
});

export type ArchiveTaskUiInput = z.infer<typeof schema>;

// ============================================================================
// Metadata
// ============================================================================

export const metadata = {
  name: "archive_task_ui",
  description: "Archive a completed task and return an updated tasks list UI. Archived tasks are hidden from the default view.",
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

interface ToolContext {
  accessToken: string;
}

export default async function handler(
  input: ArchiveTaskUiInput,
  context: ToolContext
) {
  const { uid, limit, include_deleted, ui_format } = input;
  const { accessToken } = context;

  // 1. Archive the task
  await api.archiveTask(uid, accessToken);

  // 2. Fetch updated tasks list
  const response = await api.listTasks(
    {
      limit,
      includeDeleted: include_deleted,
    },
    accessToken
  );

  const tasks = response.items;
  const nextCursor = response.nextCursor;

  // 3. Build server-rendered HTML
  const html = renderTasksListHtml(tasks, limit, include_deleted);

  // 4. Build text fallback summary
  const textSummary = `Task archived. ${tasks.length} task(s) remaining.`;

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
