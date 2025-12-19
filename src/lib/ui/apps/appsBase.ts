/**
 * Common CSS styles and JavaScript for Apps SDK widgets.
 *
 * Ports Python toolbridge_mcp/ui/apps_templates.py base functions.
 */

/**
 * Common CSS styles for Apps SDK widgets.
 */
export function appsBaseStyles(): string {
  return `
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      min-height: 100vh;
      width: 100%;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 16px;
      color: #1a1a1a;
      padding: 16px;
      background: #ffffff;
    }
    h2 {
      margin: 0 0 16px 0;
      color: #111827;
      font-size: 24px;
      font-weight: 600;
    }
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 200px;
      color: #6b7280;
      font-style: italic;
    }
    .error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 16px;
      color: #dc2626;
    }
    .empty {
      color: #6b7280;
      font-style: italic;
      text-align: center;
      padding: 32px;
    }
    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    .btn:active {
      transform: translateY(0);
    }
    .btn-primary {
      background: #3b82f6;
      color: white;
    }
    .btn-primary:hover {
      background: #2563eb;
    }
    .btn-danger {
      background: #ef4444;
      color: white;
    }
    .btn-danger:hover {
      background: #dc2626;
    }
    .btn-success {
      background: #22c55e;
      color: white;
    }
    .btn-success:hover {
      background: #16a34a;
    }
    .btn-secondary {
      background: #6b7280;
      color: white;
    }
    .btn-secondary:hover {
      background: #4b5563;
    }
  `;
}

/**
 * Base JavaScript for Apps SDK widgets.
 */
export function appsBaseScript(): string {
  return `
    // ChatGPT Apps SDK widget initialization
    (function() {
      // Store data globally for render functions
      window.widgetData = null;

      // Listen for tool output from Apps SDK
      window.addEventListener('message', function(event) {
        // Apps SDK sends structured content via postMessage
        if (event.data && event.data.type === 'toolOutput') {
          window.widgetData = event.data.payload;
          render();
        }
      });

      // Signal ready to Apps SDK
      if (window.openai && window.openai.ready) {
        window.openai.ready();
      }

      // Check if toolOutput is already available (sync case)
      if (window.openai && window.openai.toolOutput) {
        window.widgetData = window.openai.toolOutput;
        render();
      }
    })();

    // Tool call helper - uses Apps SDK callTool
    function callTool(toolName, params) {
      if (window.openai && typeof window.openai.callTool === 'function') {
        window.openai.callTool(toolName, params || {});
      } else {
        console.warn('Apps SDK callTool not available');
      }
    }
  `;
}

/**
 * HTML escaping helper for use in templates.
 */
export function escapeHtmlScript(): string {
  return `
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text || '';
      return div.innerHTML;
    }
  `;
}
