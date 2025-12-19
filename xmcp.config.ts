import { defineConfig } from "xmcp";

/**
 * ToolBridge XMCP server configuration with WorkOS AuthKit OAuth.
 *
 * OAuth endpoints are derived from TOOLBRIDGE_AUTHKIT_DOMAIN environment variable.
 * Redirect URLs must be configured in the WorkOS dashboard to point to your
 * server's /callback endpoint (e.g., https://api.toolbridge.io/callback).
 */
export default defineConfig({
  name: "toolbridge",
  version: "1.0.0",
  description: "ToolBridge MCP server with Notes and Tasks UI tools",

  // File-based routing directories
  tools: "src/tools",
  prompts: "src/prompts",
  resources: "src/resources",

  // Build output
  outDir: ".xmcp",

  // WorkOS AuthKit OAuth configuration
  experimental: {
    oauth: {
      // Base URL for OAuth callbacks - must match WorkOS dashboard redirect URL
      baseUrl: process.env.TOOLBRIDGE_PUBLIC_BASE_URL!,
      endpoints: {
        authorizationUrl: `${process.env.TOOLBRIDGE_AUTHKIT_DOMAIN}/oauth2/authorize`,
        tokenUrl: `${process.env.TOOLBRIDGE_AUTHKIT_DOMAIN}/oauth2/token`,
        registerUrl: `${process.env.TOOLBRIDGE_AUTHKIT_DOMAIN}/oauth2/register`,
        userInfoUrl: `${process.env.TOOLBRIDGE_AUTHKIT_DOMAIN}/oauth2/userinfo`,
      },
      issuerUrl: process.env.TOOLBRIDGE_AUTHKIT_DOMAIN!,
      defaultScopes: ["openid", "profile", "email"],
    },
  },

  // HTTP server configuration (required for OAuth callback)
  http: {
    port: Number(process.env.TOOLBRIDGE_PORT ?? 8080),
  },
});
