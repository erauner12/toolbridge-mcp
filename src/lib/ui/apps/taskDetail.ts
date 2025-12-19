/**
 * Apps SDK template for task detail view.
 *
 * Ports Python apps_templates.task_detail_template_html().
 */

import { appsBaseStyles, appsBaseScript, escapeHtmlScript } from "./appsBase.js";

/**
 * Generate the Apps SDK task detail template HTML.
 *
 * Expected structuredContent:
 * {
 *   "task": {"uid": "...", "version": 1, "payload": {"title": "...", "status": "...", "priority": "...", "description": "..."}}
 * }
 */
export function taskDetailTemplateHtml(): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    ${appsBaseStyles()}

    .task-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    .status-icon {
      font-size: 28px;
    }
    h1 {
      margin: 0;
      color: #111827;
      font-size: 24px;
      flex: 1;
    }
    .priority {
      font-size: 12px;
      padding: 4px 12px;
      border-radius: 16px;
      text-transform: uppercase;
      font-weight: 600;
    }
    .priority-high { background: #fee2e2; color: #991b1b; }
    .priority-medium { background: #fef3c7; color: #92400e; }
    .priority-low { background: #f3f4f6; color: #374151; }
    .status {
      margin-top: 8px;
      color: #6b7280;
      font-size: 14px;
    }
    .due-date {
      color: #3b82f6;
      margin-top: 12px;
      font-weight: 500;
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
    .description {
      background: #f9fafb;
      padding: 16px;
      border-radius: 8px;
      white-space: pre-wrap;
      line-height: 1.6;
      font-size: 15px;
      margin-top: 16px;
    }
    .meta {
      color: #6b7280;
      font-size: 12px;
      margin-top: 16px;
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
    <div class="loading">Loading task...</div>
  </div>

  <script>
    ${appsBaseScript()}
    ${escapeHtmlScript()}

    const STATUS_ICONS = {
      'todo': '\\u2B1C',
      'in_progress': '\\uD83D\\uDD04',
      'done': '\\u2705',
      'archived': '\\uD83D\\uDCE6'
    };

    function render() {
      const container = document.getElementById('content');
      const data = window.widgetData;

      if (!data || !data.task) {
        container.innerHTML = '<div class="error">Task not found</div>';
        return;
      }

      const task = data.task;
      const title = escapeHtml(task.payload?.title || 'Untitled');
      const description = escapeHtml(task.payload?.description || 'No description');
      const uid = task.uid;
      const version = task.version || 1;
      const updatedAt = task.updatedAt || '';
      const status = task.payload?.status || 'todo';
      const priority = task.payload?.priority || '';
      const dueDate = task.payload?.dueDate || '';
      const tags = task.payload?.tags || [];

      const statusIcon = STATUS_ICONS[status] || STATUS_ICONS['todo'];
      const priorityClass = priority ? 'priority-' + priority : '';

      let tagsHtml = '';
      if (tags.length > 0) {
        tagsHtml = '<div class="tags">' + tags.map(t => \`<span class="tag">\${escapeHtml(String(t))}</span>\`).join('') + '</div>';
      }

      let dueDateHtml = dueDate ? \`<div class="due-date">Due: \${escapeHtml(dueDate)}</div>\` : '';
      let priorityHtml = priority ? \`<span class="priority \${priorityClass}">\${escapeHtml(priority)}</span>\` : '';

      container.innerHTML = \`
        <div class="task-header">
          <span class="status-icon">\${statusIcon}</span>
          <h1>\${title}</h1>
          \${priorityHtml}
        </div>
        <div class="status">Status: \${escapeHtml(status)}</div>
        \${dueDateHtml}
        \${tagsHtml}
        <h3>Description</h3>
        <div class="description">\${description}</div>
        <div class="meta">
          UID: \${uid} | Version: \${version} | Updated: \${escapeHtml(updatedAt)}
        </div>
        <div class="actions">
          <button class="btn btn-secondary" onclick="backToList()">Back to List</button>
        </div>
      \`;
    }

    function backToList() {
      callTool('list_tasks_ui', {});
    }
  </script>
</body>
</html>
`;
}
