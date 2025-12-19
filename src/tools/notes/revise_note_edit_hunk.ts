/**
 * revise_note_edit_hunk - Revise a specific hunk with custom text.
 *
 * Ports Python toolbridge_mcp/ui/tools/notes.py::revise_note_edit_hunk.
 */

import { z } from "zod";
import * as api from "../../lib/api/toolbridgeClient.js";
import { getBackendAuth } from "../../lib/auth/index.js";
import { buildUiWithStructuredContent, type UIFormat } from "../../lib/ui/mcpUi.js";
import { renderNoteEditDiffHtml, renderNoteEditErrorHtml } from "../../lib/ui/html/noteEdits.js";
import { buildUiWithTextAndHtml } from "../../lib/ui/mcpUi.js";
import {
  serializeEditSession,
  computeHunkCounts,
} from "../../lib/ui/structured/serialize.js";
import { getSession, setHunkStatus } from "../../lib/noteEdits/sessions.js";
import { APPS_NOTE_EDIT_URI } from "../../config/env.js";

// ============================================================================
// Schema
// ============================================================================

export const schema = z.object({
  edit_id: z.string().describe("The edit session ID"),
  hunk_id: z.string().describe("The hunk ID to revise"),
  revised_text: z.string().describe("The revised text to use instead of the proposed change"),
  ui_format: z
    .enum(["html", "remote-dom", "both"])
    .default("html")
    .describe("UI format to return"),
});

export type ReviseNoteEditHunkInput = z.infer<typeof schema>;

// ============================================================================
// Metadata
// ============================================================================

export const metadata = {
  name: "revise_note_edit_hunk",
  description: "Revise a specific change (hunk) with custom text. Use this to modify the proposed change before accepting.",
  _meta: {
    "openai/outputTemplate": APPS_NOTE_EDIT_URI,
    "openai/visibility": "private",
    "openai/widgetAccessible": true,
    "openai/toolInvocation/deleteOnSend": true,
    "openai/toolInvocation/displayDelayMs": 50,
  },
};

// ============================================================================
// Handler
// ============================================================================

export default async function handler(input: ReviseNoteEditHunkInput) {
  const { edit_id, hunk_id, revised_text, ui_format } = input;

  // 1. Update hunk status with revised text
  const session = setHunkStatus(edit_id, hunk_id, "revised", revised_text);
  if (!session) {
    const html = renderNoteEditErrorHtml("Edit session not found or expired.");
    return buildUiWithTextAndHtml({
      uri: `ui://toolbridge/notes/edit/error`,
      html,
      textSummary: "Error: Edit session not found or expired.",
    });
  }

  // 2. Get authenticated context and fetch note for display
  const auth = await getBackendAuth();
  const note = await api.getNote({ uid: session.noteUid }, auth);

  // 3. Build updated diff preview HTML
  const html = renderNoteEditDiffHtml(
    note,
    session.hunks,
    session.id,
    session.summary
  );

  // 4. Build text summary
  const counts = computeHunkCounts(session.hunks);
  const textSummary = `Hunk revised. Pending: ${counts.pending}, Accepted: ${counts.accepted}, Rejected: ${counts.rejected}, Revised: ${counts.revised}`;

  // 5. Build structured content
  const structuredContent = serializeEditSession(
    session.id,
    note,
    session.hunks,
    session.summary,
    counts
  );

  // 6. Return updated UI
  return buildUiWithStructuredContent({
    uri: `ui://toolbridge/notes/${session.noteUid}/edit/${session.id}`,
    html,
    remoteDom: null,
    textSummary,
    uiFormat: ui_format as UIFormat,
    structuredContent,
  });
}
