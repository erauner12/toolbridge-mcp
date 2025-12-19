/**
 * delete_note_ui - Delete a note and refresh the notes list UI.
 *
 * Ports Python toolbridge_mcp/ui/tools/notes.py::delete_note_ui.
 */

import { z } from "zod";
import * as api from "../../lib/api/toolbridgeClient.js";
import { getBackendAuth } from "../../lib/auth/index.js";
import { buildUiWithStructuredContent, type UIFormat } from "../../lib/ui/mcpUi.js";
import { renderNotesListHtml } from "../../lib/ui/html/notes.js";
import { serializeNotesList } from "../../lib/ui/structured/serialize.js";
import { APPS_NOTES_LIST_URI } from "../../config/env.js";

// ============================================================================
// Schema
// ============================================================================

export const schema = z.object({
  uid: z.string().describe("The unique identifier of the note to delete"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe("Maximum number of notes to return in refreshed list"),
  include_deleted: z
    .boolean()
    .default(false)
    .describe("Include soft-deleted notes in refreshed list"),
  ui_format: z
    .enum(["html", "remote-dom", "both"])
    .default("html")
    .describe("UI format to return"),
});

export type DeleteNoteUiInput = z.infer<typeof schema>;

// ============================================================================
// Metadata
// ============================================================================

export const metadata = {
  name: "delete_note_ui",
  description: "Delete a note and return an updated notes list UI. The note is soft-deleted and can be restored later.",
  _meta: {
    "openai/outputTemplate": APPS_NOTES_LIST_URI,
    "openai/widgetAccessible": true,
    "openai/visibility": "private",
    "openai/toolInvocation/deleteOnSend": true,
    "openai/toolInvocation/displayDelayMs": 50,
  },
};

// ============================================================================
// Handler
// ============================================================================

export default async function handler(input: DeleteNoteUiInput) {
  const { uid, limit, include_deleted, ui_format } = input;

  // Get authenticated context for API calls
  const auth = await getBackendAuth();

  // 1. Delete the note
  await api.deleteNote(uid, auth);

  // 2. Fetch updated notes list
  const response = await api.listNotes(
    {
      limit,
      includeDeleted: include_deleted,
    },
    auth
  );

  const notes = response.items;
  const nextCursor = response.nextCursor;

  // 3. Build server-rendered HTML
  const html = renderNotesListHtml(notes, limit, include_deleted);

  // 4. Build text fallback summary
  const textSummary = `Note deleted. ${notes.length} note(s) remaining.`;

  // 5. Build structured content for Apps SDK
  const structuredContent = serializeNotesList(notes, limit, include_deleted, nextCursor);

  // 6. Build and return MCP-UI response
  return buildUiWithStructuredContent({
    uri: `ui://toolbridge/notes/list`,
    html,
    remoteDom: null,
    textSummary,
    uiFormat: ui_format as UIFormat,
    structuredContent,
  });
}
