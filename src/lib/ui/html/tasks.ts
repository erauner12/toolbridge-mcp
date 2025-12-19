/**
 * MCP-UI HTML templates for Tasks.
 *
 * Ports Python toolbridge_mcp/ui/templates/tasks.py.
 * Server-rendered HTML for embedded MCP-UI resources.
 */

import escapeHtml from "escape-html";
import type { Task } from "../../api/types.js";

const STATUS_ICONS: Record<string, string> = {
  todo: "\u2B1C",
  in_progress: "\uD83D\uDD04",
  done: "\u2705",
  archived: "\uD83D\uDCE6",
};

function getStatusIcon(status: string): string {
  return STATUS_ICONS[status] ?? STATUS_ICONS.todo;
}

/**
 * Render tasks list as HTML.
 */
export function renderTasksListHtml(
  tasks: Task[],
  limit: number = 20,
  includeDeleted: boolean = false
): string {
  const count = tasks.length;

  let tasksHtml = "";
  for (const task of tasks) {
    const title = escapeHtml(String(task.payload.title ?? "Untitled"));
    const description = String(task.payload.description ?? "");
    const descPreview = escapeHtml(description.substring(0, 80)) + (description.length > 80 ? "..." : "");
    const uid = task.uid;
    const status = String(task.payload.status ?? "todo");
    const priority = String(task.payload.priority ?? "");
    const dueDate = String(task.payload.dueDate ?? "");

    const statusIcon = getStatusIcon(status);
    const priorityClass = priority ? `priority-${priority}` : "";

    const dueDateHtml = dueDate
      ? `<span class="due-date">Due: ${escapeHtml(dueDate.substring(0, 10))}</span>`
      : "";
    const priorityHtml = priority
      ? `<span class="priority ${priorityClass}">${escapeHtml(priority)}</span>`
      : "";

    const actionButton =
      status === "done"
        ? `<button class="btn btn-secondary" onclick="callTool('archive_task_ui', {uid: '${uid}', limit: ${limit}, include_deleted: ${includeDeleted}})">Archive</button>`
        : `<button class="btn btn-success" onclick="callTool('process_task_ui', {uid: '${uid}', action: 'complete', limit: ${limit}, include_deleted: ${includeDeleted}})">Complete</button>`;

    tasksHtml += `
      <li class="task-item ${priorityClass}" data-uid="${uid}" data-status="${status}">
        <div class="task-header">
          <span class="status-icon">${statusIcon}</span>
          <span class="task-title">${title}</span>
          ${priorityHtml}
        </div>
        <div class="task-description">${descPreview}</div>
        <div class="task-meta">
          ${dueDateHtml}
          <span>UID: ${uid.substring(0, 8)}...</span>
        </div>
        <div class="task-actions">
          <button class="btn btn-primary" onclick="callTool('show_task_ui', {uid: '${uid}', include_deleted: ${includeDeleted}})">View</button>
          ${actionButton}
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
    .tasks-list { list-style: none; padding: 0; margin: 0; }
    .task-item {
      padding: 16px;
      margin-bottom: 12px;
      background: #f9fafb;
      border-radius: 12px;
    }
    .task-item.priority-high { border-left: 4px solid #ef4444; }
    .task-item.priority-medium { border-left: 4px solid #f59e0b; }
    .task-item.priority-low { border-left: 4px solid #6b7280; }
    .task-item:not([class*="priority-"]) { border-left: 4px solid #3b82f6; }
    .task-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
    .status-icon { font-size: 20px; }
    .task-title { font-weight: 600; color: #111827; flex: 1; font-size: 16px; }
    .priority {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 12px;
      text-transform: uppercase;
      font-weight: 600;
    }
    .priority-high { background: #fee2e2; color: #991b1b; }
    .priority-medium { background: #fef3c7; color: #92400e; }
    .priority-low { background: #f3f4f6; color: #374151; }
    .task-description { color: #4b5563; font-size: 14px; margin-bottom: 8px; line-height: 1.4; }
    .task-meta { color: #9ca3af; font-size: 12px; display: flex; gap: 16px; }
    .due-date { color: #3b82f6; font-weight: 500; }
    .task-actions { margin-top: 12px; display: flex; gap: 8px; }
    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-primary { background: #3b82f6; color: white; }
    .btn-success { background: #22c55e; color: white; }
    .btn-secondary { background: #6b7280; color: white; }
    .empty { color: #6b7280; font-style: italic; text-align: center; padding: 32px; }
  </style>
</head>
<body>
  <h2>Tasks</h2>
  <p class="count">Showing ${count} task(s)</p>
  ${count === 0 ? '<p class="empty">No tasks found.</p>' : `<ul class="tasks-list">${tasksHtml}</ul>`}
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
 * Render single task detail as HTML.
 */
export function renderTaskDetailHtml(task: Task): string {
  const title = escapeHtml(String(task.payload.title ?? "Untitled"));
  const description = escapeHtml(String(task.payload.description ?? "No description"));
  const uid = task.uid;
  const version = task.version;
  const updatedAt = task.updatedAt ?? "";
  const status = String(task.payload.status ?? "todo");
  const priority = String(task.payload.priority ?? "");
  const dueDate = String(task.payload.dueDate ?? "");
  const tags = (task.payload.tags as string[]) ?? [];

  const statusIcon = getStatusIcon(status);
  const priorityClass = priority ? `priority-${priority}` : "";

  let tagsHtml = "";
  if (tags.length > 0) {
    tagsHtml = '<div class="tags">' + tags.map((t) => `<span class="tag">${escapeHtml(String(t))}</span>`).join("") + "</div>";
  }

  const dueDateHtml = dueDate ? `<div class="due-date">Due: ${escapeHtml(dueDate)}</div>` : "";
  const priorityHtml = priority ? `<span class="priority ${priorityClass}">${escapeHtml(priority)}</span>` : "";

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
    .task-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .status-icon { font-size: 28px; }
    h1 { margin: 0; color: #111827; font-size: 24px; flex: 1; }
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
    .status { margin-top: 8px; color: #6b7280; font-size: 14px; }
    .due-date { color: #3b82f6; margin-top: 12px; font-weight: 500; }
    .tags { margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap; }
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
    .meta { color: #6b7280; font-size: 12px; margin-top: 16px; }
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
  </style>
</head>
<body>
  <div class="task-header">
    <span class="status-icon">${statusIcon}</span>
    <h1>${title}</h1>
    ${priorityHtml}
  </div>
  <div class="status">Status: ${escapeHtml(status)}</div>
  ${dueDateHtml}
  ${tagsHtml}
  <h3>Description</h3>
  <div class="description">${description}</div>
  <div class="meta">
    UID: ${uid} | Version: ${version} | Updated: ${escapeHtml(updatedAt)}
  </div>
  <div class="actions">
    <button class="btn btn-secondary" onclick="callTool('list_tasks_ui', {})">Back to List</button>
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
