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

  // Bundler configuration
  bundler: (config: any) => {
    // Configure resolve extensions to handle .js -> .ts mapping
    config.resolve = config.resolve || {};
    config.resolve.extensions = [".ts", ".tsx", ".js", ".jsx", ".json"];
    config.resolve.extensionAlias = {
      ".js": [".ts", ".js"],
      ".mjs": [".mts", ".mjs"],
    };

    // Force CommonJS output to avoid ESM/CJS mismatch issues
    // rspack's default bundling uses require() for externals
    config.output = config.output || {};
    config.output.module = false;
    config.output.chunkFormat = "commonjs";
    config.output.library = { type: "commonjs2" };

    // Disable ESM experiments
    config.experiments = config.experiments || {};
    config.experiments.outputModule = false;

    return config;
  },
};

export default config;
