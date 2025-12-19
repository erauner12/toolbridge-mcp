/**
 * show_note_ui - Show a single note with embedded MCP-UI display.
 *
 * Ports Python toolbridge_mcp/ui/tools/notes.py::show_note_ui.
 */

import { z } from "zod";
import * as api from "../../lib/api/toolbridgeClient.js";
import { buildUiWithStructuredContent, type UIFormat } from "../../lib/ui/mcpUi.js";
import { renderNoteDetailHtml } from "../../lib/ui/html/notes.js";
import { serializeNoteDetail } from "../../lib/ui/structured/serialize.js";
import { APPS_NOTE_DETAIL_URI } from "../../config/env.js";

// ============================================================================
// Schema
// ============================================================================

export const schema = z.object({
  uid: z.string().describe("The unique identifier of the note to show"),
  include_deleted: z
    .boolean()
    .default(false)
    .describe("Include soft-deleted notes"),
  ui_format: z
    .enum(["html", "remote-dom", "both"])
    .default("html")
    .describe("UI format to return"),
});

export type ShowNoteUiInput = z.infer<typeof schema>;

// ============================================================================
// Metadata
// ============================================================================

export const metadata = {
  name: "show_note_ui",
  description: "Show a single note with an interactive UI display. Returns both a text summary and an embedded HTML resource for rich rendering.",
  _meta: {
    "openai/outputTemplate": APPS_NOTE_DETAIL_URI,
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
  input: ShowNoteUiInput,
  context: ToolContext
) {
  const { uid, include_deleted, ui_format } = input;
  const { accessToken } = context;

  // 1. Fetch note from API
  const note = await api.getNote(
    {
      uid,
      includeDeleted: include_deleted,
    },
    accessToken
  );

  // 2. Build server-rendered HTML
  const html = renderNoteDetailHtml(note);

  // 3. Build text fallback summary
  const title = note.payload.title ?? "Untitled";
  const content = (note.payload.content ?? "").toString();
  const preview = content.substring(0, 100) + (content.length > 100 ? "..." : "");
  const textSummary = `Note: "${title}"\n\n${preview}`;

  // 4. Build structured content for Apps SDK
  const structuredContent = serializeNoteDetail(note);

  // 5. Build and return MCP-UI response
  return buildUiWithStructuredContent({
    uri: `ui://toolbridge/notes/${uid}`,
    html,
    remoteDom: null,
    textSummary,
    uiFormat: ui_format as UIFormat,
    structuredContent,
  });
}
