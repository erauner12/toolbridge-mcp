/**
 * edit_note_ui - Create a note edit session with diff preview.
 *
 * Ports Python toolbridge_mcp/ui/tools/notes.py::edit_note_ui.
 * Creates a session for reviewing proposed changes with hunk-level accept/reject.
 */

import { z } from "zod";
import * as api from "../../lib/api/toolbridgeClient.js";
import { getBackendAuth, getCurrentUserId } from "../../lib/auth/index.js";
import { buildUiWithStructuredContent, type UIFormat } from "../../lib/ui/mcpUi.js";
import { renderNoteEditDiffHtml } from "../../lib/ui/html/noteEdits.js";
import {
  serializeEditSession,
  computeHunkCounts,
} from "../../lib/ui/structured/serialize.js";
import {
  createSession,
  type NoteEditSession,
} from "../../lib/noteEdits/sessions.js";
import { computeLineDiff, annotateHunksWithIds } from "../../lib/noteEdits/diff.js";
import { APPS_NOTE_EDIT_URI } from "../../config/env.js";

// ============================================================================
// Schema
// ============================================================================

export const schema = z.object({
  uid: z.string().describe("The unique identifier of the note to edit"),
  proposed_content: z
    .string()
    .describe("The proposed new content for the note"),
  summary: z
    .string()
    .optional()
    .describe("A brief summary of the proposed changes"),
  ui_format: z
    .enum(["html", "remote-dom", "both"])
    .default("html")
    .describe("UI format to return"),
});

export type EditNoteUiInput = z.infer<typeof schema>;

// ============================================================================
// Metadata
// ============================================================================

export const metadata = {
  name: "edit_note_ui",
  description: "Create a note edit session with a diff preview UI. Shows changes between current and proposed content with hunk-level accept/reject controls.",
  _meta: {
    "openai/outputTemplate": APPS_NOTE_EDIT_URI,
    "openai/widgetAccessible": true,
    "openai/toolInvocation/deleteOnSend": true,
    "openai/toolInvocation/displayDelayMs": 50,
  },
};

// ============================================================================
// Handler
// ============================================================================

export default async function handler(input: EditNoteUiInput) {
  const { uid, proposed_content, summary, ui_format } = input;

  // Get authenticated context for API calls
  const auth = await getBackendAuth();
  const userId = await getCurrentUserId();

  // 1. Fetch the current note
  const note = await api.getNote({ uid }, auth);
  const originalContent = (note.payload.content ?? "").toString();

  // 2. Compute line-level diff
  let hunks = computeLineDiff(originalContent, proposed_content, {
    truncateUnchanged: true,
    contextLines: 3,
  });
  hunks = annotateHunksWithIds(hunks);

  // 3. Create edit session
  const session: NoteEditSession = createSession({
    note,
    proposedContent: proposed_content,
    summary: summary ?? null,
    userId: userId ?? null,
    hunks,
  });

  // 4. Build server-rendered HTML diff preview
  const html = renderNoteEditDiffHtml(
    note,
    session.hunks,
    session.id,
    summary ?? null
  );

  // 5. Build text fallback summary
  const counts = computeHunkCounts(session.hunks);
  const totalChanges = counts.pending + counts.accepted + counts.rejected + counts.revised;
  const textSummary = `Edit session created for "${note.payload.title ?? "Untitled"}". ${totalChanges} change(s) to review.`;

  // 6. Build structured content for Apps SDK
  const structuredContent = serializeEditSession(
    session.id,
    note,
    session.hunks,
    summary ?? null,
    counts
  );

  // 7. Build and return MCP-UI response
  return buildUiWithStructuredContent({
    uri: `ui://toolbridge/notes/${uid}/edit/${session.id}`,
    html,
    remoteDom: null,
    textSummary,
    uiFormat: ui_format as UIFormat,
    structuredContent,
  });
}
