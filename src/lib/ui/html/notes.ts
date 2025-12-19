/**
 * MCP-UI HTML templates for Notes.
 *
 * Ports Python toolbridge_mcp/ui/templates/notes.py.
 * Server-rendered HTML for embedded MCP-UI resources.
 */

import escapeHtml from "escape-html";
import type { Note } from "../../api/types.js";

/**
 * Render notes list as HTML.
 */
export function renderNotesListHtml(
  notes: Note[],
  limit: number = 20,
  includeDeleted: boolean = false
): string {
  const count = notes.length;

  let notesHtml = "";
  for (const note of notes) {
    const title = escapeHtml(String(note.payload.title ?? "Untitled"));
    const content = String(note.payload.content ?? "");
    const preview = escapeHtml(content.substring(0, 100)) + (content.length > 100 ? "..." : "");
    const uid = note.uid;
    const version = note.version;

    notesHtml += `
      <li class="note-item" data-uid="${uid}">
        <div class="note-title">${title}</div>
        <div class="note-preview">${preview}</div>
        <div class="note-meta">UID: ${uid.substring(0, 8)}... | v${version}</div>
        <div class="note-actions">
          <button class="btn btn-primary" onclick="callTool('show_note_ui', {uid: '${uid}', include_deleted: ${includeDeleted}})">View</button>
          <button class="btn btn-danger" onclick="callTool('delete_note_ui', {uid: '${uid}', limit: ${limit}, include_deleted: ${includeDeleted}})">Delete</button>
        </div>
      </li>
    `;
  }

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
      background: #ffffff;
      color: #1a1a1a;
    }
    h2 { margin: 0 0 16px 0; color: #111827; font-size: 24px; }
    .count { color: #6b7280; font-size: 14px; margin-bottom: 16px; }
    .notes-list { list-style: none; padding: 0; margin: 0; }
    .note-item {
      padding: 16px;
      margin-bottom: 12px;
      background: #f9fafb;
      border-radius: 12px;
      border-left: 4px solid #3b82f6;
    }
    .note-title { font-weight: 600; color: #111827; margin-bottom: 8px; font-size: 18px; }
    .note-preview { color: #4b5563; font-size: 14px; margin-bottom: 8px; line-height: 1.5; }
    .note-meta { color: #9ca3af; font-size: 12px; }
    .note-actions { margin-top: 12px; display: flex; gap: 8px; }
    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-primary { background: #3b82f6; color: white; }
    .btn-danger { background: #ef4444; color: white; }
    .empty { color: #6b7280; font-style: italic; text-align: center; padding: 32px; }
  </style>
</head>
<body>
  <h2>Notes</h2>
  <p class="count">Showing ${count} note(s)</p>
  ${count === 0 ? '<p class="empty">No notes found.</p>' : `<ul class="notes-list">${notesHtml}</ul>`}
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
 * Render single note detail as HTML.
 */
export function renderNoteDetailHtml(note: Note): string {
  const title = escapeHtml(String(note.payload.title ?? "Untitled"));
  const content = escapeHtml(String(note.payload.content ?? "No content"));
  const uid = note.uid;
  const version = note.version;
  const updatedAt = note.updatedAt ?? "";
  const tags = (note.payload.tags as string[]) ?? [];
  const status = String(note.payload.status ?? "");

  let tagsHtml = "";
  if (tags.length > 0) {
    tagsHtml = '<div class="tags">' + tags.map((t) => `<span class="tag">${escapeHtml(String(t))}</span>`).join("") + "</div>";
  }

  let statusHtml = "";
  if (status) {
    statusHtml = `<span class="status-badge status-${escapeHtml(status)}">${escapeHtml(status)}</span>`;
  }

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
      background: #ffffff;
      color: #1a1a1a;
    }
    .note-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    h1 { margin: 0; color: #111827; font-size: 24px; flex: 1; }
    .content {
      background: #f9fafb;
      padding: 16px;
      border-radius: 8px;
      white-space: pre-wrap;
      line-height: 1.6;
      font-size: 15px;
    }
    .meta { color: #6b7280; font-size: 12px; margin-top: 16px; }
    .tags { margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap; }
    .tag {
      display: inline-block;
      background: #e5e7eb;
      padding: 4px 10px;
      border-radius: 16px;
      font-size: 12px;
      color: #374151;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 500;
    }
    .status-archived { background: #fef3c7; color: #92400e; }
    .status-pinned { background: #d1fae5; color: #065f46; }
    .actions { margin-top: 20px; display: flex; gap: 8px; }
    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-secondary { background: #6b7280; color: white; }
    .btn-danger { background: #ef4444; color: white; }
  </style>
</head>
<body>
  <div class="note-header">
    <h1>${title}</h1>
    ${statusHtml}
  </div>
  ${tagsHtml}
  <div class="content">${content}</div>
  <div class="meta">
    UID: ${uid} | Version: ${version} | Updated: ${escapeHtml(updatedAt)}
  </div>
  <div class="actions">
    <button class="btn btn-secondary" onclick="callTool('list_notes_ui', {})">Back to List</button>
    <button class="btn btn-danger" onclick="callTool('delete_note_ui', {uid: '${uid}'})">Delete</button>
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
