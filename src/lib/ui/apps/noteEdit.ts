/**
 * Apps SDK template for note edit diff view.
 *
 * Ports Python apps_templates.note_edit_template_html().
 */

import { appsBaseStyles, appsBaseScript, escapeHtmlScript } from "./appsBase.js";

/**
 * Generate the Apps SDK note edit template HTML.
 *
 * Expected structuredContent:
 * {
 *   "editId": "...",
 *   "note": {"uid": "...", "version": 1, "payload": {...}},
 *   "hunks": [
 *     {"id": "h1", "kind": "modified", "status": "pending", "original": "...", "proposed": "..."}
 *   ],
 *   "summary": "...",
 *   "counts": {"accepted": 0, "rejected": 0, "revised": 0, "pending": 3}
 * }
 */
export function noteEditTemplateHtml(): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    ${appsBaseStyles()}

    .edit-header {
      margin-bottom: 16px;
    }
    .summary {
      color: #4b5563;
      font-size: 14px;
      margin-bottom: 12px;
      padding: 12px;
      background: #f0f9ff;
      border-radius: 8px;
      border-left: 4px solid #3b82f6;
    }
    .counts {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      font-size: 14px;
    }
    .count-item {
      padding: 4px 12px;
      border-radius: 16px;
      font-weight: 500;
    }
    .count-accepted { background: #d1fae5; color: #065f46; }
    .count-rejected { background: #fee2e2; color: #991b1b; }
    .count-revised { background: #dbeafe; color: #1e40af; }
    .count-pending { background: #f3f4f6; color: #374151; }

    .hunks-list {
      margin-bottom: 20px;
    }
    .hunk {
      margin-bottom: 16px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
    }
    .hunk-header {
      padding: 8px 12px;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
    }
    .hunk-status {
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }
    .status-pending { background: #fef3c7; color: #92400e; }
    .status-accepted { background: #d1fae5; color: #065f46; }
    .status-rejected { background: #fee2e2; color: #991b1b; }
    .status-revised { background: #dbeafe; color: #1e40af; }

    .hunk-content {
      padding: 12px;
      font-family: 'SF Mono', Monaco, 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.5;
    }
    .diff-line {
      padding: 2px 8px;
      margin: 0;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .diff-added {
      background: #d1fae5;
      color: #065f46;
    }
    .diff-removed {
      background: #fee2e2;
      color: #991b1b;
      text-decoration: line-through;
    }
    .diff-context {
      background: #f9fafb;
      color: #6b7280;
    }

    .hunk-actions {
      padding: 8px 12px;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 8px;
    }
    .hunk-actions .btn {
      font-size: 12px;
      padding: 6px 12px;
    }

    .main-actions {
      display: flex;
      gap: 12px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div id="content">
    <div class="loading">Loading diff...</div>
  </div>

  <script>
    ${appsBaseScript()}
    ${escapeHtmlScript()}

    function render() {
      const container = document.getElementById('content');
      const data = window.widgetData;

      if (!data || !data.editId) {
        container.innerHTML = '<div class="error">Edit session not found</div>';
        return;
      }

      const editId = data.editId;
      const title = escapeHtml(data.note?.payload?.title || 'Note Edit');
      const summary = data.summary ? escapeHtml(data.summary) : '';
      const hunks = data.hunks || [];
      const counts = data.counts || {};

      let summaryHtml = summary ? \`<div class="summary">\${summary}</div>\` : '';

      let countsHtml = \`
        <div class="counts">
          <span class="count-item count-accepted">Accepted: \${counts.accepted || 0}</span>
          <span class="count-item count-rejected">Rejected: \${counts.rejected || 0}</span>
          <span class="count-item count-revised">Revised: \${counts.revised || 0}</span>
          <span class="count-item count-pending">Pending: \${counts.pending || 0}</span>
        </div>
      \`;

      let hunksHtml = '<div class="hunks-list">';
      hunks.forEach(function(hunk, index) {
        const hunkId = hunk.id || 'h' + index;
        const kind = hunk.kind || 'unchanged';
        const status = hunk.status || 'pending';
        const original = hunk.original || '';
        const proposed = hunk.proposed || '';

        if (kind === 'unchanged') {
          // Skip unchanged hunks or show collapsed
          return;
        }

        let diffHtml = '';
        if (kind === 'removed') {
          original.split('\\n').forEach(line => {
            diffHtml += \`<div class="diff-line diff-removed">- \${escapeHtml(line)}</div>\`;
          });
        } else if (kind === 'added') {
          proposed.split('\\n').forEach(line => {
            diffHtml += \`<div class="diff-line diff-added">+ \${escapeHtml(line)}</div>\`;
          });
        } else {
          // Modified - show both
          original.split('\\n').forEach(line => {
            diffHtml += \`<div class="diff-line diff-removed">- \${escapeHtml(line)}</div>\`;
          });
          proposed.split('\\n').forEach(line => {
            diffHtml += \`<div class="diff-line diff-added">+ \${escapeHtml(line)}</div>\`;
          });
        }

        hunksHtml += \`
          <div class="hunk" data-hunk-id="\${hunkId}">
            <div class="hunk-header">
              <span>Change #\${index + 1} (\${kind})</span>
              <span class="hunk-status status-\${status}">\${status.toUpperCase()}</span>
            </div>
            <div class="hunk-content">\${diffHtml}</div>
            <div class="hunk-actions">
              <button class="btn btn-success" onclick="acceptHunk('\${editId}', '\${hunkId}')" \${status !== 'pending' ? 'disabled' : ''}>Accept</button>
              <button class="btn btn-danger" onclick="rejectHunk('\${editId}', '\${hunkId}')" \${status !== 'pending' ? 'disabled' : ''}>Reject</button>
            </div>
          </div>
        \`;
      });
      hunksHtml += '</div>';

      const canApply = (counts.pending || 0) === 0;

      container.innerHTML = \`
        <div class="edit-header">
          <h2>Edit: \${title}</h2>
          \${summaryHtml}
          \${countsHtml}
        </div>
        \${hunksHtml}
        <div class="main-actions">
          <button class="btn btn-success" onclick="applyEdit('\${editId}')" \${!canApply ? 'disabled' : ''}>Apply All Changes</button>
          <button class="btn btn-secondary" onclick="discardEdit('\${editId}')">Discard</button>
        </div>
      \`;
    }

    function acceptHunk(editId, hunkId) {
      callTool('accept_note_edit_hunk', { edit_id: editId, hunk_id: hunkId });
    }

    function rejectHunk(editId, hunkId) {
      callTool('reject_note_edit_hunk', { edit_id: editId, hunk_id: hunkId });
    }

    function applyEdit(editId) {
      callTool('apply_note_edit', { edit_id: editId });
    }

    function discardEdit(editId) {
      callTool('discard_note_edit', { edit_id: editId });
    }
  </script>
</body>
</html>
`;
}
