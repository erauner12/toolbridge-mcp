/**
 * Apps SDK template for notes list.
 *
 * Ports Python apps_templates.notes_list_template_html().
 */

import { appsBaseStyles, appsBaseScript, escapeHtmlScript } from "./appsBase.js";

/**
 * Generate the Apps SDK notes list template HTML.
 *
 * Expected structuredContent:
 * {
 *   "notes": [{"uid": "...", "version": 1, "payload": {"title": "...", "content": "..."}}],
 *   "limit": 20,
 *   "includeDeleted": false,
 *   "nextCursor": null
 * }
 */
export function notesListTemplateHtml(): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    ${appsBaseStyles()}

    .notes-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .note-item {
      padding: 16px;
      margin-bottom: 12px;
      background: #f9fafb;
      border-radius: 12px;
      border-left: 4px solid #3b82f6;
    }
    .note-item:hover {
      background: #f3f4f6;
    }
    .note-title {
      font-weight: 600;
      color: #111827;
      margin-bottom: 8px;
      font-size: 18px;
    }
    .note-preview {
      color: #4b5563;
      font-size: 14px;
      margin-bottom: 8px;
      line-height: 1.5;
    }
    .note-meta {
      color: #9ca3af;
      font-size: 12px;
    }
    .note-actions {
      margin-top: 12px;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .count {
      color: #6b7280;
      font-size: 14px;
      margin-bottom: 16px;
    }
  </style>
</head>
<body>
  <div id="content">
    <div class="loading">Loading notes...</div>
  </div>

  <script>
    ${appsBaseScript()}
    ${escapeHtmlScript()}

    function render() {
      const container = document.getElementById('content');
      const data = window.widgetData;

      if (!data || !data.notes) {
        container.innerHTML = '<div class="error">No data available</div>';
        return;
      }

      const notes = data.notes;
      const limit = data.limit || 20;
      const includeDeleted = data.includeDeleted || false;

      if (notes.length === 0) {
        container.innerHTML = \`
          <h2>Notes</h2>
          <p class="empty">No notes found.</p>
        \`;
        return;
      }

      let html = \`
        <h2>Notes</h2>
        <p class="count">Showing \${notes.length} note(s)</p>
        <ul class="notes-list">
      \`;

      notes.forEach(function(note) {
        const title = escapeHtml(note.payload?.title || 'Untitled');
        const content = note.payload?.content || '';
        const preview = escapeHtml(content.substring(0, 100)) + (content.length > 100 ? '...' : '');
        const uid = note.uid;
        const version = note.version || 1;

        html += \`
          <li class="note-item" data-uid="\${uid}">
            <div class="note-title">\${title}</div>
            <div class="note-preview">\${preview}</div>
            <div class="note-meta">UID: \${uid.substring(0, 8)}... | v\${version}</div>
            <div class="note-actions">
              <button class="btn btn-primary" onclick="viewNote('\${uid}', \${includeDeleted})">View</button>
              <button class="btn btn-danger" onclick="deleteNote('\${uid}', \${limit}, \${includeDeleted})">Delete</button>
            </div>
          </li>
        \`;
      });

      html += '</ul>';
      container.innerHTML = html;
    }

    function viewNote(uid, includeDeleted) {
      callTool('show_note_ui', {
        uid: uid,
        include_deleted: includeDeleted
      });
    }

    function deleteNote(uid, limit, includeDeleted) {
      callTool('delete_note_ui', {
        uid: uid,
        limit: limit,
        include_deleted: includeDeleted
      });
    }
  </script>
</body>
</html>
`;
}
