/**
 * Apps SDK template for note detail view.
 *
 * Ports Python apps_templates.note_detail_template_html().
 */

import { appsBaseStyles, appsBaseScript, escapeHtmlScript } from "./appsBase.js";

/**
 * Generate the Apps SDK note detail template HTML.
 *
 * Expected structuredContent:
 * {
 *   "note": {"uid": "...", "version": 1, "payload": {"title": "...", "content": "...", "tags": []}}
 * }
 */
export function noteDetailTemplateHtml(): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    ${appsBaseStyles()}

    .note-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    h1 {
      margin: 0;
      color: #111827;
      font-size: 24px;
      flex: 1;
    }
    .content {
      background: #f9fafb;
      padding: 16px;
      border-radius: 8px;
      white-space: pre-wrap;
      line-height: 1.6;
      font-size: 15px;
    }
    .meta {
      color: #6b7280;
      font-size: 12px;
      margin-top: 16px;
    }
    .tags {
      margin-top: 12px;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
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
    .status-archived {
      background: #fef3c7;
      color: #92400e;
    }
    .status-pinned {
      background: #d1fae5;
      color: #065f46;
    }
    .actions {
      margin-top: 20px;
      display: flex;
      gap: 8px;
    }
  </style>
</head>
<body>
  <div id="content">
    <div class="loading">Loading note...</div>
  </div>

  <script>
    ${appsBaseScript()}
    ${escapeHtmlScript()}

    function render() {
      const container = document.getElementById('content');
      const data = window.widgetData;

      if (!data || !data.note) {
        container.innerHTML = '<div class="error">Note not found</div>';
        return;
      }

      const note = data.note;
      const title = escapeHtml(note.payload?.title || 'Untitled');
      const content = escapeHtml(note.payload?.content || 'No content');
      const uid = note.uid;
      const version = note.version || 1;
      const updatedAt = note.updatedAt || '';
      const tags = note.payload?.tags || [];
      const status = note.payload?.status || '';

      let tagsHtml = '';
      if (tags.length > 0) {
        tagsHtml = '<div class="tags">' + tags.map(t => \`<span class="tag">\${escapeHtml(String(t))}</span>\`).join('') + '</div>';
      }

      let statusHtml = '';
      if (status) {
        statusHtml = \`<span class="status-badge status-\${escapeHtml(status)}">\${escapeHtml(status)}</span>\`;
      }

      container.innerHTML = \`
        <div class="note-header">
          <h1>\${title}</h1>
          \${statusHtml}
        </div>
        \${tagsHtml}
        <div class="content">\${content}</div>
        <div class="meta">
          UID: \${uid} | Version: \${version} | Updated: \${escapeHtml(updatedAt)}
        </div>
        <div class="actions">
          <button class="btn btn-secondary" onclick="backToList()">Back to List</button>
          <button class="btn btn-danger" onclick="deleteNote('\${uid}')">Delete</button>
        </div>
      \`;
    }

    function backToList() {
      callTool('list_notes_ui', {});
    }

    function deleteNote(uid) {
      callTool('delete_note_ui', { uid: uid });
    }
  </script>
</body>
</html>
`;
}
