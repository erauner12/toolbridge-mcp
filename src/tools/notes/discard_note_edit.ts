/**
 * discard_note_edit - Discard an edit session without applying changes.
 *
 * Ports Python toolbridge_mcp/ui/tools/notes.py::discard_note_edit.
 */

import { z } from "zod";
import { buildUiWithTextAndHtml } from "../../lib/ui/mcpUi.js";
import {
  renderNoteEditDiscardedHtml,
  renderNoteEditErrorHtml,
} from "../../lib/ui/html/noteEdits.js";
import { getSession, discardSession } from "../../lib/noteEdits/sessions.js";

// ============================================================================
// Schema
// ============================================================================

export const schema = {
  edit_id: z.string().describe("The edit session ID to discard"),
};

export type DiscardNoteEditInput = z.infer<z.ZodObject<typeof schema>>;

// ============================================================================
// Metadata
// ============================================================================

export const metadata = {
  name: "discard_note_edit",
  description: "Discard an edit session without applying any changes. All pending changes will be lost.",
  _meta: {
    "openai/visibility": "private",
    "openai/widgetAccessible": true,
    "openai/toolInvocation/deleteOnSend": true,
    "openai/toolInvocation/displayDelayMs": 50,
  },
};

// ============================================================================
// Handler
// ============================================================================

export default async function handler(input: DiscardNoteEditInput) {
  const { edit_id } = input;

  // 1. Get session info before discarding
  const session = getSession(edit_id);
  if (!session) {
    const html = renderNoteEditErrorHtml("Edit session not found or already discarded.");
    return buildUiWithTextAndHtml({
      uri: `ui://toolbridge/notes/edit/error`,
      html,
      textSummary: "Error: Edit session not found or already discarded.",
    });
  }

  const title = session.title;

  // 2. Discard the session
  discardSession(edit_id);

  // 3. Build response
  const html = renderNoteEditDiscardedHtml(title);
  return buildUiWithTextAndHtml({
    uri: `ui://toolbridge/notes/edit/discarded`,
    html,
    textSummary: `Edit discarded for "${title}". No changes were applied.`,
  });
}
