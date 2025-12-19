import { type XmcpConfig } from "xmcp";

/**
 * ToolBridge XMCP server configuration with WorkOS AuthKit OAuth.
 *
 * OAuth endpoints are derived from TOOLBRIDGE_AUTHKIT_DOMAIN environment variable.
 * Redirect URLs must be configured in the WorkOS dashboard to point to your
 * server's /callback endpoint (e.g., https://toolbridge-xmcp.vercel.app/callback).
 */
// Fallback for build time when env vars aren't available
const authkitDomain = process.env.TOOLBRIDGE_AUTHKIT_DOMAIN || "https://authkit.example.com";
const publicBaseUrl = process.env.TOOLBRIDGE_PUBLIC_BASE_URL || "http://localhost:8080";

const config: XmcpConfig = {
  // Paths configuration
  paths: {
    tools: "src/tools",
    prompts: false,
    resources: false,
  },

  // WorkOS AuthKit OAuth configuration
  experimental: {
    oauth: {
      // Base URL for OAuth callbacks - must match WorkOS dashboard redirect URL
      baseUrl: publicBaseUrl,
      endpoints: {
        authorizationUrl: authkitDomain + "/oauth2/authorize",
        tokenUrl: authkitDomain + "/oauth2/token",
        registerUrl: authkitDomain + "/oauth2/register",
        userInfoUrl: authkitDomain + "/oauth2/userinfo",
      },
      issuerUrl: authkitDomain,
      defaultScopes: ["openid", "profile", "email"],
    },
  },

  // HTTP server configuration
  http: {
    port: Number(process.env.TOOLBRIDGE_PORT ?? 8080),
  },

  // Bundler configuration - externalize Node.js-specific packages
  bundler: (config: any) => {
    config.externals = config.externals || [];
    config.externals.push("@mcp-ui/server", "fs", "path", "crypto", "node:fs", "node:path", "node:crypto");
    return config;
  },
};

export default config;
