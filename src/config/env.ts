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

  // Auth settings - AuthKit OAuth
  authkitDomain: z
    .string()
    .optional()
    .describe("WorkOS AuthKit domain for OAuth (e.g., https://your-app.authkit.app)"),
  backendApiAudience: z
    .string()
    .optional()
    .describe("JWT audience for backend API"),
  tenantId: z
    .string()
    .optional()
    .describe("Default tenant ID (static tenant mode only)"),
  jwtSigningKey: z
    .string()
    .optional()
    .describe("JWT signing key for local token issuance (RS256 PEM or HS256 secret)"),

  // Auth mode configuration
  authMode: z
    .enum(["exchange", "passthrough"])
    .default("exchange")
    .describe(
      "Token auth mode: 'exchange' uses backend /auth/token-exchange endpoint (recommended), " +
      "'passthrough' calls Go API with AuthKit token directly"
    ),
  tenantMode: z
    .enum(["backend", "claim", "static"])
    .default("backend")
    .describe(
      "Tenant resolution mode: 'backend' calls /v1/auth/tenant (recommended), " +
      "'claim' reads tenant_id from token claim, 'static' uses env.tenantId"
    ),

  // Derived auth endpoints (can be overridden)
  backendTokenExchangeUrl: z
    .string()
    .url()
    .optional()
    .describe("Backend token exchange endpoint (default: {goApiBaseUrl}/auth/token-exchange)"),
  tenantResolutionUrl: z
    .string()
    .url()
    .optional()
    .describe("Tenant resolution endpoint (default: {goApiBaseUrl}/v1/auth/tenant)"),

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
  const goApiBaseUrl = process.env.TOOLBRIDGE_GO_API_BASE_URL;

  const raw = {
    publicBaseUrl: process.env.TOOLBRIDGE_PUBLIC_BASE_URL,
    goApiBaseUrl,
    authkitDomain: process.env.TOOLBRIDGE_AUTHKIT_DOMAIN,
    backendApiAudience: process.env.TOOLBRIDGE_BACKEND_API_AUDIENCE,
    tenantId: process.env.TOOLBRIDGE_TENANT_ID,
    jwtSigningKey: process.env.TOOLBRIDGE_JWT_SIGNING_KEY,
    // Auth mode configuration
    authMode: process.env.TOOLBRIDGE_AUTH_MODE,
    tenantMode: process.env.TOOLBRIDGE_TENANT_MODE,
    // Auth endpoints (defaults derived from goApiBaseUrl)
    backendTokenExchangeUrl:
      process.env.TOOLBRIDGE_BACKEND_TOKEN_EXCHANGE_URL ||
      (goApiBaseUrl ? `${goApiBaseUrl}/auth/token-exchange` : undefined),
    tenantResolutionUrl:
      process.env.TOOLBRIDGE_TENANT_RESOLUTION_URL ||
      (goApiBaseUrl ? `${goApiBaseUrl}/v1/auth/tenant` : undefined),
    // UI settings
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
