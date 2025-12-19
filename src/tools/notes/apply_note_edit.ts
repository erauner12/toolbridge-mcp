/**
 * apply_note_edit - Apply an edit session to update the note.
 *
 * Ports Python toolbridge_mcp/ui/tools/notes.py::apply_note_edit.
 * Applies all accepted/revised changes and saves the note.
 */

import { z } from "zod";
import * as api from "../../lib/api/toolbridgeClient.js";
import { getBackendAuth } from "../../lib/auth/index.js";
import { buildUiWithTextAndHtml } from "../../lib/ui/mcpUi.js";
import {
  renderNoteEditSuccessHtml,
  renderNoteEditErrorHtml,
} from "../../lib/ui/html/noteEdits.js";
import { getSession, discardSession, getHunkCounts } from "../../lib/noteEdits/sessions.js";

// ============================================================================
// Schema
// ============================================================================

export const schema = {
  edit_id: z.string().describe("The edit session ID to apply"),
};

export type ApplyNoteEditInput = z.infer<z.ZodObject<typeof schema>>;

// ============================================================================
// Metadata
// ============================================================================

export const metadata = {
  name: "apply_note_edit",
  description: "Apply changes from an edit session to the note. All hunks must be resolved (accepted/rejected/revised) before applying.",
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

export default async function handler(input: ApplyNoteEditInput) {
  const { edit_id } = input;

  // 1. Get the session
  const session = getSession(edit_id);
  if (!session) {
    const html = renderNoteEditErrorHtml("Edit session not found or expired.");
    return buildUiWithTextAndHtml({
      uri: `ui://toolbridge/notes/edit/error`,
      html,
      textSummary: "Error: Edit session not found or expired.",
    });
  }

  // 2. Check all hunks are resolved
  const counts = getHunkCounts(edit_id);
  if (counts.pending > 0) {
    const html = renderNoteEditErrorHtml(
      `Cannot apply: ${counts.pending} change(s) still pending review.`,
      session.noteUid
    );
    return buildUiWithTextAndHtml({
      uri: `ui://toolbridge/notes/edit/error`,
      html,
      textSummary: `Error: ${counts.pending} change(s) still pending review.`,
    });
  }

  // 3. Check if we have computed content
  if (!session.currentContent) {
    const html = renderNoteEditErrorHtml(
      "Cannot compute final content. Try accepting or rejecting all changes.",
      session.noteUid
    );
    return buildUiWithTextAndHtml({
      uri: `ui://toolbridge/notes/edit/error`,
      html,
      textSummary: "Error: Cannot compute final content.",
    });
  }

  // 4. Get authenticated context and attempt to update the note with optimistic concurrency
  const auth = await getBackendAuth();
  try {
    const updatedNote = await api.updateNote(
      {
        uid: session.noteUid,
        title: session.title,
        content: session.currentContent,
        ifMatch: session.baseVersion,
      },
      auth
    );

    // 5. Clean up session
    discardSession(edit_id);

    // 6. Build success response
    const html = renderNoteEditSuccessHtml(updatedNote);
    return buildUiWithTextAndHtml({
      uri: `ui://toolbridge/notes/${session.noteUid}/edit/success`,
      html,
      textSummary: `Changes applied to "${updatedNote.payload.title ?? "Untitled"}". Version: ${updatedNote.version}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const html = renderNoteEditErrorHtml(
      `Failed to save changes: ${message}`,
      session.noteUid
    );
    return buildUiWithTextAndHtml({
      uri: `ui://toolbridge/notes/edit/error`,
      html,
      textSummary: `Error: ${message}`,
    });
  }
}
