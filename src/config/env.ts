/**
 * Environment configuration for ToolBridge XMCP server.
 *
 * Mirrors the Python toolbridge_mcp/config.py settings for deployment parity.
 */

import { z } from "zod";

const envSchema = z.object({
  // Required settings
  publicBaseUrl: z
    .string()
    .url()
    .describe("Public base URL for the server (e.g., https://api.toolbridge.io)"),
  goApiBaseUrl: z
    .string()
    .url()
    .describe("Go backend API base URL"),

  // Optional auth settings
  authkitDomain: z
    .string()
    .optional()
    .describe("WorkOS AuthKit domain for OAuth"),
  backendApiAudience: z
    .string()
    .optional()
    .describe("JWT audience for backend API"),
  tenantId: z
    .string()
    .optional()
    .describe("Default tenant ID (optional)"),
  jwtSigningKey: z
    .string()
    .optional()
    .describe("JWT signing key for token exchange"),

  // UI settings
  uiHtmlMimeType: z
    .enum(["text/html", "text/html+skybridge"])
    .default("text/html")
    .describe("MIME type for MCP-UI HTML resources"),
  appsSdkMimeType: z
    .literal("text/html+skybridge")
    .default("text/html+skybridge")
    .describe("MIME type for Apps SDK widget templates"),

  // Apps template addressing mode
  appsOutputTemplateMode: z
    .enum(["resource", "http"])
    .default("http")
    .describe("How outputTemplate URIs are generated: 'resource' for ui:// URIs, 'http' for HTTP URLs"),

  // Server settings
  host: z.string().default("0.0.0.0"),
  port: z.coerce.number().int().positive().default(8080),
  logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
  shutdownTimeoutSeconds: z.coerce.number().int().positive().default(30),
  maxTimestampSkewSeconds: z.coerce.number().int().positive().default(300),
});

type EnvConfig = z.infer<typeof envSchema>;

function loadEnv(): EnvConfig {
  const raw = {
    publicBaseUrl: process.env.TOOLBRIDGE_PUBLIC_BASE_URL,
    goApiBaseUrl: process.env.TOOLBRIDGE_GO_API_BASE_URL,
    authkitDomain: process.env.TOOLBRIDGE_AUTHKIT_DOMAIN,
    backendApiAudience: process.env.TOOLBRIDGE_BACKEND_API_AUDIENCE,
    tenantId: process.env.TOOLBRIDGE_TENANT_ID,
    jwtSigningKey: process.env.TOOLBRIDGE_JWT_SIGNING_KEY,
    uiHtmlMimeType: process.env.TOOLBRIDGE_UI_HTML_MIME_TYPE,
    appsSdkMimeType: process.env.TOOLBRIDGE_APPS_SDK_MIME_TYPE,
    appsOutputTemplateMode: process.env.TOOLBRIDGE_APPS_OUTPUT_TEMPLATE_MODE,
    host: process.env.TOOLBRIDGE_HOST,
    port: process.env.TOOLBRIDGE_PORT,
    logLevel: process.env.TOOLBRIDGE_LOG_LEVEL,
    shutdownTimeoutSeconds: process.env.TOOLBRIDGE_SHUTDOWN_TIMEOUT_SECONDS,
    maxTimestampSkewSeconds: process.env.TOOLBRIDGE_MAX_TIMESTAMP_SKEW_SECONDS,
  };

  const result = envSchema.safeParse(raw);

  if (!result.success) {
    console.error("Environment validation failed:");
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    throw new Error("Invalid environment configuration");
  }

  return result.data;
}

// Export singleton config
export const env = loadEnv();

// Helper to get Apps SDK template URIs based on mode
export function getAppsTemplateUri(templatePath: string): string {
  if (env.appsOutputTemplateMode === "resource") {
    // Use MCP resource URI (ui:// scheme)
    return `ui://toolbridge/apps/${templatePath}`;
  }
  // Use HTTP URL
  return `${env.publicBaseUrl}/apps/templates/${templatePath}`;
}

// Apps SDK template URIs (matching Python apps_resources.py)
export const APPS_NOTES_LIST_URI = getAppsTemplateUri("notes/list");
export const APPS_NOTE_DETAIL_URI = getAppsTemplateUri("notes/detail");
export const APPS_NOTE_EDIT_URI = getAppsTemplateUri("notes/edit");
export const APPS_TASKS_LIST_URI = getAppsTemplateUri("tasks/list");
export const APPS_TASK_DETAIL_URI = getAppsTemplateUri("tasks/detail");
