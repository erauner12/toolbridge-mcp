/**
 * reject_note_edit_hunk - Reject a specific hunk in an edit session.
 *
 * Ports Python toolbridge_mcp/ui/tools/notes.py::reject_note_edit_hunk.
 */

import { z } from "zod";
import * as api from "../../lib/api/toolbridgeClient.js";
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
  hunk_id: z.string().describe("The hunk ID to reject"),
  ui_format: z
    .enum(["html", "remote-dom", "both"])
    .default("html")
    .describe("UI format to return"),
});

export type RejectNoteEditHunkInput = z.infer<typeof schema>;

// ============================================================================
// Metadata
// ============================================================================

export const metadata = {
  name: "reject_note_edit_hunk",
  description: "Reject a specific change (hunk) in an edit session. The original content will be kept instead.",
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

interface ToolContext {
  accessToken: string;
}

export default async function handler(
  input: RejectNoteEditHunkInput,
  context: ToolContext
) {
  const { edit_id, hunk_id, ui_format } = input;
  const { accessToken } = context;

  // 1. Update hunk status
  const session = setHunkStatus(edit_id, hunk_id, "rejected");
  if (!session) {
    const html = renderNoteEditErrorHtml("Edit session not found or expired.");
    return buildUiWithTextAndHtml({
      uri: `ui://toolbridge/notes/edit/error`,
      html,
      textSummary: "Error: Edit session not found or expired.",
    });
  }

  // 2. Fetch note for display
  const note = await api.getNote({ uid: session.noteUid }, accessToken);

  // 3. Build updated diff preview HTML
  const html = renderNoteEditDiffHtml(
    note,
    session.hunks,
    session.id,
    session.summary
  );

  // 4. Build text summary
  const counts = computeHunkCounts(session.hunks);
  const textSummary = `Hunk rejected. Pending: ${counts.pending}, Accepted: ${counts.accepted}, Rejected: ${counts.rejected}`;

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
