/**
 * Express server for ToolBridge XMCP.
 *
 * Provides:
 * - HTTP template endpoints for Apps SDK widgets
 * - Health check endpoint
 * - CORS support for cross-origin widget embedding
 */

import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { env } from "../src/config/env.js";
import {
  notesListTemplateHtml,
  noteDetailTemplateHtml,
  noteEditTemplateHtml,
  tasksListTemplateHtml,
  taskDetailTemplateHtml,
} from "../src/lib/ui/apps/index.js";

// ============================================================================
// App Configuration
// ============================================================================

const app = express();

// CORS for widget embedding
app.use(cors({
  origin: "*", // Allow all origins for Apps SDK widgets
  methods: ["GET", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// Health Check
// ============================================================================

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// ============================================================================
// Apps SDK Template Endpoints
// ============================================================================

const APPS_SDK_MIME_TYPE = env.appsSdkMimeType;

/**
 * Notes list template.
 * GET /apps/templates/notes/list
 */
app.get("/apps/templates/notes/list", (_req: Request, res: Response) => {
  const html = notesListTemplateHtml();
  res.set("Content-Type", APPS_SDK_MIME_TYPE);
  res.send(html);
});

/**
 * Note detail template.
 * GET /apps/templates/notes/detail
 */
app.get("/apps/templates/notes/detail", (_req: Request, res: Response) => {
  const html = noteDetailTemplateHtml();
  res.set("Content-Type", APPS_SDK_MIME_TYPE);
  res.send(html);
});

/**
 * Note edit template.
 * GET /apps/templates/notes/edit
 */
app.get("/apps/templates/notes/edit", (_req: Request, res: Response) => {
  const html = noteEditTemplateHtml();
  res.set("Content-Type", APPS_SDK_MIME_TYPE);
  res.send(html);
});

/**
 * Tasks list template.
 * GET /apps/templates/tasks/list
 */
app.get("/apps/templates/tasks/list", (_req: Request, res: Response) => {
  const html = tasksListTemplateHtml();
  res.set("Content-Type", APPS_SDK_MIME_TYPE);
  res.send(html);
});

/**
 * Task detail template.
 * GET /apps/templates/tasks/detail
 */
app.get("/apps/templates/tasks/detail", (_req: Request, res: Response) => {
  const html = taskDetailTemplateHtml();
  res.set("Content-Type", APPS_SDK_MIME_TYPE);
  res.send(html);
});

// ============================================================================
// Error Handling
// ============================================================================

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Server error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: "Not found",
    message: "The requested resource was not found",
  });
});

// ============================================================================
// Server Start
// ============================================================================

const port = env.port;
const host = env.host;

app.listen(port, host, () => {
  console.log(`ToolBridge XMCP Express server running at http://${host}:${port}`);
  console.log(`Apps templates available at http://${host}:${port}/apps/templates/*`);
  console.log(`Health check at http://${host}:${port}/health`);
});

export default app;
