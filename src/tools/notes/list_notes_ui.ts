/**
 * list_notes_ui - List notes with embedded MCP-UI display.
 *
 * Ports Python toolbridge_mcp/ui/tools/notes.py::list_notes_ui.
 */

import { z } from "zod";
import * as api from "../../lib/api/toolbridgeClient.js";
import { buildUiWithStructuredContent, type UIFormat } from "../../lib/ui/mcpUi.js";
import { renderNotesListHtml } from "../../lib/ui/html/notes.js";
import { serializeNotesList } from "../../lib/ui/structured/serialize.js";
import { APPS_NOTES_LIST_URI } from "../../config/env.js";

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
    .describe("Maximum number of notes to return"),
  include_deleted: z
    .boolean()
    .default(false)
    .describe("Include soft-deleted notes"),
  ui_format: z
    .enum(["html", "remote-dom", "both"])
    .default("html")
    .describe("UI format to return"),
});

export type ListNotesUiInput = z.infer<typeof schema>;

// ============================================================================
// Metadata
// ============================================================================

export const metadata = {
  name: "list_notes_ui",
  description: "List notes with an interactive UI display. Returns both a text summary and an embedded HTML/Remote-DOM resource for rich rendering.",
  _meta: {
    "openai/outputTemplate": APPS_NOTES_LIST_URI,
    "openai/widgetAccessible": true,
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
  input: ListNotesUiInput,
  context: ToolContext
) {
  const { limit, include_deleted, ui_format } = input;
  const { accessToken } = context;

  // 1. Fetch notes from API
  const response = await api.listNotes(
    {
      limit,
      includeDeleted: include_deleted,
    },
    accessToken
  );

  const notes = response.items;
  const nextCursor = response.nextCursor;

  // 2. Build server-rendered HTML
  const html = renderNotesListHtml(notes, limit, include_deleted);

  // 3. Build text fallback summary
  const textSummary = notes.length === 0
    ? "No notes found."
    : `Found ${notes.length} note(s). Use the UI to view details.`;

  // 4. Build structured content for Apps SDK
  const structuredContent = serializeNotesList(notes, limit, include_deleted, nextCursor);

  // 5. Build and return MCP-UI response
  return buildUiWithStructuredContent({
    uri: `ui://toolbridge/notes/list`,
    html,
    remoteDom: null,
    textSummary,
    uiFormat: ui_format as UIFormat,
    structuredContent,
  });
}
