/**
 * Apps SDK template for tasks list.
 *
 * Ports Python apps_templates.tasks_list_template_html().
 */

import { appsBaseStyles, appsBaseScript, escapeHtmlScript } from "./appsBase.js";

/**
 * Generate the Apps SDK tasks list template HTML.
 *
 * Expected structuredContent:
 * {
 *   "tasks": [{"uid": "...", "version": 1, "payload": {"title": "...", "status": "...", "priority": "..."}}],
 *   "limit": 20,
 *   "includeDeleted": false,
 *   "nextCursor": null
 * }
 */
export function tasksListTemplateHtml(): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    ${appsBaseStyles()}

    .tasks-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .task-item {
      padding: 16px;
      margin-bottom: 12px;
      background: #f9fafb;
      border-radius: 12px;
    }
    .task-item.priority-high {
      border-left: 4px solid #ef4444;
    }
    .task-item.priority-medium {
      border-left: 4px solid #f59e0b;
    }
    .task-item.priority-low {
      border-left: 4px solid #6b7280;
    }
    .task-item:not([class*="priority-"]) {
      border-left: 4px solid #3b82f6;
    }
    .task-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }
    .status-icon {
      font-size: 20px;
    }
    .task-title {
      font-weight: 600;
      color: #111827;
      flex: 1;
      font-size: 16px;
    }
    .priority {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 12px;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .priority-high { background: #fee2e2; color: #991b1b; }
    .priority-medium { background: #fef3c7; color: #92400e; }
    .priority-low { background: #f3f4f6; color: #374151; }
    .task-description {
      color: #4b5563;
      font-size: 14px;
      margin-bottom: 8px;
      line-height: 1.4;
    }
    .task-meta {
      color: #9ca3af;
      font-size: 12px;
      display: flex;
      gap: 16px;
    }
    .due-date {
      color: #3b82f6;
      font-weight: 500;
    }
    .task-actions {
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
    <div class="loading">Loading tasks...</div>
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

      if (!data || !data.tasks) {
        container.innerHTML = '<div class="error">No data available</div>';
        return;
      }

      const tasks = data.tasks;
      const limit = data.limit || 20;
      const includeDeleted = data.includeDeleted || false;

      if (tasks.length === 0) {
        container.innerHTML = \`
          <h2>Tasks</h2>
          <p class="empty">No tasks found.</p>
        \`;
        return;
      }

      let html = \`
        <h2>Tasks</h2>
        <p class="count">Showing \${tasks.length} task(s)</p>
        <ul class="tasks-list">
      \`;

      tasks.forEach(function(task) {
        const title = escapeHtml(task.payload?.title || 'Untitled');
        const description = task.payload?.description || '';
        const descPreview = escapeHtml(description.substring(0, 80)) + (description.length > 80 ? '...' : '');
        const uid = task.uid;
        const status = task.payload?.status || 'todo';
        const priority = task.payload?.priority || '';
        const dueDate = task.payload?.dueDate || '';

        const statusIcon = STATUS_ICONS[status] || STATUS_ICONS['todo'];
        const priorityClass = priority ? 'priority-' + priority : '';

        let dueDateHtml = dueDate ? \`<span class="due-date">Due: \${escapeHtml(dueDate.substring(0, 10))}</span>\` : '';
        let priorityHtml = priority ? \`<span class="priority \${priorityClass}">\${escapeHtml(priority)}</span>\` : '';

        let actionButton = status === 'done'
          ? \`<button class="btn btn-secondary" onclick="archiveTask('\${uid}', \${limit}, \${includeDeleted})">Archive</button>\`
          : \`<button class="btn btn-success" onclick="completeTask('\${uid}', \${limit}, \${includeDeleted})">Complete</button>\`;

        html += \`
          <li class="task-item \${priorityClass}" data-uid="\${uid}" data-status="\${status}">
            <div class="task-header">
              <span class="status-icon">\${statusIcon}</span>
              <span class="task-title">\${title}</span>
              \${priorityHtml}
            </div>
            <div class="task-description">\${descPreview}</div>
            <div class="task-meta">
              \${dueDateHtml}
              <span>UID: \${uid.substring(0, 8)}...</span>
            </div>
            <div class="task-actions">
              <button class="btn btn-primary" onclick="viewTask('\${uid}', \${includeDeleted})">View</button>
              \${actionButton}
            </div>
          </li>
        \`;
      });

      html += '</ul>';
      container.innerHTML = html;
    }

    function viewTask(uid, includeDeleted) {
      callTool('show_task_ui', {
        uid: uid,
        include_deleted: includeDeleted
      });
    }

    function completeTask(uid, limit, includeDeleted) {
      callTool('process_task_ui', {
        uid: uid,
        action: 'complete',
        limit: limit,
        include_deleted: includeDeleted
      });
    }

    function archiveTask(uid, limit, includeDeleted) {
      callTool('archive_task_ui', {
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
