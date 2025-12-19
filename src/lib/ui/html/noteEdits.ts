/**
 * MCP-UI HTML templates for Note Edits.
 *
 * Ports Python toolbridge_mcp/ui/templates/note_edits.py.
 * Server-rendered HTML for diff preview embedded resources.
 */

import escapeHtml from "escape-html";
import type { Note } from "../../api/types.js";
import type { NoteEditHunkState } from "../../noteEdits/sessions.js";

const STATUS_BG: Record<string, string> = {
  pending: "#fef3c7",
  accepted: "#d1fae5",
  rejected: "#fee2e2",
  revised: "#dbeafe",
};

const STATUS_BORDER: Record<string, string> = {
  pending: "#f59e0b",
  accepted: "#10b981",
  rejected: "#ef4444",
  revised: "#3b82f6",
};

const DIFF_ADDED_BG = "#1c4428";
const DIFF_ADDED_TEXT = "#3fb950";
const DIFF_REMOVED_BG = "#5c1a1b";
const DIFF_REMOVED_TEXT = "#f85149";
const DIFF_CONTEXT_BG = "#21262d";
const DIFF_CONTEXT_TEXT = "#8b949e";

/**
 * Render diff content for a hunk.
 */
function renderDiffContentHtml(
  kind: string,
  original: string,
  proposed: string,
  revisedText?: string | null
): string {
  let html = "";

  if (kind === "unchanged") {
    for (const line of original.split("\n")) {
      html += `<div class="diff-line diff-context">  ${escapeHtml(line)}</div>`;
    }
  } else if (kind === "removed") {
    for (const line of original.split("\n")) {
      html += `<div class="diff-line diff-removed">- ${escapeHtml(line)}</div>`;
    }
  } else if (kind === "added") {
    const text = revisedText ?? proposed;
    for (const line of text.split("\n")) {
      html += `<div class="diff-line diff-added">+ ${escapeHtml(line)}</div>`;
    }
  } else {
    // Modified - show both
    for (const line of original.split("\n")) {
      html += `<div class="diff-line diff-removed">- ${escapeHtml(line)}</div>`;
    }
    const text = revisedText ?? proposed;
    for (const line of text.split("\n")) {
      html += `<div class="diff-line diff-added">+ ${escapeHtml(line)}</div>`;
    }
  }

  return html;
}

/**
 * Render a single hunk block.
 */
function renderHunkBlockHtml(editId: string, hunk: NoteEditHunkState): string {
  if (hunk.kind === "unchanged") {
    // Optionally show truncated unchanged content
    return "";
  }

  const statusBg = STATUS_BG[hunk.status] ?? STATUS_BG.pending;
  const statusBorder = STATUS_BORDER[hunk.status] ?? STATUS_BORDER.pending;
  const diffContent = renderDiffContentHtml(hunk.kind, hunk.original, hunk.proposed, hunk.revisedText);

  const lineRangeInfo = [];
  if (hunk.origStart !== null && hunk.origEnd !== null) {
    lineRangeInfo.push(`orig: ${hunk.origStart}-${hunk.origEnd}`);
  }
  if (hunk.newStart !== null && hunk.newEnd !== null) {
    lineRangeInfo.push(`new: ${hunk.newStart}-${hunk.newEnd}`);
  }
  const lineRange = lineRangeInfo.length > 0 ? ` (${lineRangeInfo.join(", ")})` : "";

  const isPending = hunk.status === "pending";
  const disabledAttr = isPending ? "" : "disabled";

  return `
    <div class="hunk" style="border-left: 4px solid ${statusBorder}; background: ${statusBg}20;">
      <div class="hunk-header">
        <span>Change ${hunk.id} (${hunk.kind})${lineRange}</span>
        <span class="hunk-status" style="background: ${statusBg}; border: 1px solid ${statusBorder};">
          ${hunk.status.toUpperCase()}
        </span>
      </div>
      <div class="hunk-content">
        ${diffContent}
      </div>
      <div class="hunk-actions">
        <button class="btn btn-success" onclick="callTool('accept_note_edit_hunk', {edit_id: '${editId}', hunk_id: '${hunk.id}'})" ${disabledAttr}>Accept</button>
        <button class="btn btn-danger" onclick="callTool('reject_note_edit_hunk', {edit_id: '${editId}', hunk_id: '${hunk.id}'})" ${disabledAttr}>Reject</button>
      </div>
    </div>
  `;
}

/**
 * Render note edit diff preview as HTML.
 */
export function renderNoteEditDiffHtml(
  note: Note,
  hunks: NoteEditHunkState[],
  editId: string,
  summary?: string | null
): string {
  const title = escapeHtml(String(note.payload.title ?? "Untitled note"));

  // Count hunks by status (excluding unchanged)
  const counts = { pending: 0, accepted: 0, rejected: 0, revised: 0 };
  for (const h of hunks) {
    if (h.kind !== "unchanged") {
      counts[h.status]++;
    }
  }

  const summaryHtml = summary ? `<div class="summary">${escapeHtml(summary)}</div>` : "";

  let hunksHtml = "";
  for (const hunk of hunks) {
    hunksHtml += renderHunkBlockHtml(editId, hunk);
  }

  const canApply = counts.pending === 0;
  const applyDisabled = canApply ? "" : "disabled";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 16px;
      margin: 0;
      background: #0d1117;
      color: #c9d1d9;
    }
    h2 { margin: 0 0 16px 0; color: #f0f6fc; font-size: 20px; }
    .summary {
      color: #8b949e;
      font-size: 14px;
      margin-bottom: 12px;
      padding: 12px;
      background: #161b22;
      border-radius: 8px;
      border-left: 4px solid #3b82f6;
    }
    .counts {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      font-size: 14px;
      flex-wrap: wrap;
    }
    .count-item {
      padding: 4px 12px;
      border-radius: 16px;
      font-weight: 500;
    }
    .hunk {
      margin-bottom: 16px;
      border-radius: 8px;
      overflow: hidden;
    }
    .hunk-header {
      padding: 8px 12px;
      background: #21262d;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      color: #c9d1d9;
    }
    .hunk-status {
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }
    .hunk-content {
      padding: 12px;
      font-family: 'SF Mono', Monaco, 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.5;
      background: #161b22;
    }
    .diff-line {
      padding: 2px 8px;
      margin: 0;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .diff-added { background: ${DIFF_ADDED_BG}; color: ${DIFF_ADDED_TEXT}; }
    .diff-removed { background: ${DIFF_REMOVED_BG}; color: ${DIFF_REMOVED_TEXT}; text-decoration: line-through; }
    .diff-context { background: ${DIFF_CONTEXT_BG}; color: ${DIFF_CONTEXT_TEXT}; }
    .hunk-actions {
      padding: 8px 12px;
      background: #21262d;
      display: flex;
      gap: 8px;
    }
    .hunk-actions .btn { font-size: 12px; padding: 6px 12px; }
    .main-actions {
      display: flex;
      gap: 12px;
      padding-top: 16px;
      border-top: 1px solid #30363d;
    }
    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-success { background: #238636; color: white; }
    .btn-danger { background: #da3633; color: white; }
    .btn-secondary { background: #21262d; color: #c9d1d9; border: 1px solid #30363d; }
  </style>
</head>
<body>
  <h2>Edit: ${title}</h2>
  ${summaryHtml}
  <div class="counts">
    <span class="count-item" style="background: #d1fae5; color: #065f46;">Accepted: ${counts.accepted}</span>
    <span class="count-item" style="background: #fee2e2; color: #991b1b;">Rejected: ${counts.rejected}</span>
    <span class="count-item" style="background: #dbeafe; color: #1e40af;">Revised: ${counts.revised}</span>
    <span class="count-item" style="background: #f3f4f6; color: #374151;">Pending: ${counts.pending}</span>
  </div>
  ${hunksHtml}
  <div class="main-actions">
    <button class="btn btn-success" onclick="callTool('apply_note_edit', {edit_id: '${editId}'})" ${applyDisabled}>Apply All Changes</button>
    <button class="btn btn-secondary" onclick="callTool('discard_note_edit', {edit_id: '${editId}'})">Discard</button>
  </div>
  <script>
    function callTool(toolName, params) {
      if (window.openai && typeof window.openai.callTool === 'function') {
        window.openai.callTool(toolName, params);
      } else if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'tool', payload: { toolName, params } }, '*');
      }
    }
  </script>
</body>
</html>
`;
}

/**
 * Render note edit success confirmation as HTML.
 */
export function renderNoteEditSuccessHtml(note: Note): string {
  const title = escapeHtml(String(note.payload.title ?? "Untitled note"));
  const content = escapeHtml(String(note.payload.content ?? ""));
  const preview = content.substring(0, 200) + (content.length > 200 ? "..." : "");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 16px;
      margin: 0;
      background: #0d1117;
      color: #c9d1d9;
    }
    .success {
      background: #238636;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 16px;
    }
    h2 { margin: 0; color: white; }
    .content {
      background: #161b22;
      padding: 16px;
      border-radius: 8px;
      font-size: 14px;
      line-height: 1.6;
      white-space: pre-wrap;
    }
    .meta { color: #8b949e; font-size: 12px; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="success">
    <h2>\u2705 Changes Applied</h2>
  </div>
  <h3>${title}</h3>
  <div class="content">${preview}</div>
  <div class="meta">Version: ${note.version} | UID: ${note.uid}</div>
</body>
</html>
`;
}

/**
 * Render note edit discarded confirmation as HTML.
 */
export function renderNoteEditDiscardedHtml(title: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 16px;
      margin: 0;
      background: #0d1117;
      color: #c9d1d9;
    }
    .discarded {
      background: #21262d;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid #30363d;
    }
    h2 { margin: 0; color: #c9d1d9; }
    p { color: #8b949e; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="discarded">
    <h2>\uD83D\uDDD1\uFE0F Edit Discarded</h2>
    <p>Changes to "${escapeHtml(title)}" have been discarded.</p>
  </div>
</body>
</html>
`;
}

/**
 * Render note edit error as HTML.
 */
export function renderNoteEditErrorHtml(errorMessage: string, noteUid?: string | null): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 16px;
      margin: 0;
      background: #0d1117;
      color: #c9d1d9;
    }
    .error {
      background: #da3633;
      padding: 16px;
      border-radius: 8px;
    }
    h2 { margin: 0; color: white; }
    p { color: white; margin-top: 8px; opacity: 0.9; }
  </style>
</head>
<body>
  <div class="error">
    <h2>\u26A0\uFE0F Error</h2>
    <p>${escapeHtml(errorMessage)}</p>
  </div>
</body>
</html>
`;
}
