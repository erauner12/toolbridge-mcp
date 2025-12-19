/**
 * Tool authentication context orchestration.
 *
 * Provides a unified interface for tools to obtain authenticated context
 * including verified token claims, backend JWT, and tenant ID.
 *
 * Implements caching to avoid repeated token exchange and tenant resolution
 * calls within a session.
 */

import { env } from "../../config/env.js";
import type { ToolAuthContext, AuthKitClaims } from "./types.js";
import {
  getIncomingBearerToken,
  verifyAuthKitJwt,
  AuthKitError,
} from "./authkit.js";
import { exchangeForBackendToken, TokenExchangeError } from "./tokenExchange.js";
import {
  resolveTenantId,
  TenantResolutionError,
  MultiOrganizationError,
} from "./tenantResolve.js";

// Re-export errors for convenient imports
export {
  AuthKitError,
  TokenExchangeError,
  TenantResolutionError,
  MultiOrganizationError,
};

/**
 * Cached auth context entry.
 */
interface CachedContext {
  ctx: ToolAuthContext;
  expiresAtMs: number;
}

/**
 * In-memory cache for auth contexts, keyed by raw AuthKit token.
 *
 * This prevents repeated token exchange and tenant resolution calls
 * for the same user within a session.
 */
const authContextCache = new Map<string, CachedContext>();

/**
 * Expiry margin in milliseconds.
 *
 * Context is considered expired this many ms before the actual token expiry.
 */
const EXPIRY_MARGIN_MS = 60_000; // 60 seconds

/**
 * Build a complete ToolAuthContext from the current request.
 *
 * Performs:
 * 1. Token extraction from request headers
 * 2. Token verification against AuthKit JWKS
 * 3. Tenant resolution (backend, claim, or static based on config)
 * 4. Token exchange for backend JWT (if authMode is "exchange")
 *
 * Results are cached until token expiry minus a safety margin.
 *
 * @param opts - Optional overrides
 * @param opts.authkitToken - Use this token instead of extracting from headers
 * @returns Complete tool authentication context
 * @throws AuthKitError if token extraction or verification fails
 * @throws TokenExchangeError if token exchange fails
 * @throws TenantResolutionError if tenant resolution fails
 * @throws MultiOrganizationError if user must select an organization
 */
export async function getToolAuthContext(opts?: {
  authkitToken?: string;
}): Promise<ToolAuthContext> {
  // Get or extract the AuthKit token
  const authkitToken = opts?.authkitToken ?? getIncomingBearerToken();

  // Check cache first
  const cached = authContextCache.get(authkitToken);
  if (cached && cached.expiresAtMs > Date.now()) {
    return cached.ctx;
  }

  // Verify the token
  const claims = await verifyAuthKitJwt(authkitToken);

  // Resolve tenant
  const { tenantId } = await resolveTenantId(authkitToken, claims);

  // Exchange for backend token
  const backendToken = await exchangeForBackendToken(authkitToken);

  // Build context
  const ctx: ToolAuthContext = {
    authkitToken,
    claims,
    tenantId,
    backendToken,
  };

  // Cache with expiry
  const expiresAtMs = claims.exp
    ? claims.exp * 1000 - EXPIRY_MARGIN_MS
    : Date.now() + 3600_000 - EXPIRY_MARGIN_MS; // Default 1 hour if no exp

  authContextCache.set(authkitToken, {
    ctx,
    expiresAtMs,
  });

  // Cleanup expired entries periodically
  cleanupExpiredCache();

  return ctx;
}

/**
 * Get the backend auth bundle for API calls.
 *
 * Convenience function that returns just the auth fields needed
 * for toolbridgeClient API calls.
 *
 * @param opts - Optional overrides
 * @param opts.authkitToken - Use this token instead of extracting from headers
 * @returns Backend auth bundle with accessToken and tenantId
 */
export async function getBackendAuth(opts?: {
  authkitToken?: string;
}): Promise<{ accessToken: string; tenantId: string }> {
  const ctx = await getToolAuthContext(opts);
  return {
    accessToken: ctx.backendToken,
    tenantId: ctx.tenantId,
  };
}

/**
 * Clear the auth context cache.
 *
 * Primarily useful for testing.
 */
export function clearAuthContextCache(): void {
  authContextCache.clear();
}

/**
 * Remove expired entries from the cache.
 *
 * Called automatically during getToolAuthContext() to prevent unbounded growth.
 */
function cleanupExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of authContextCache.entries()) {
    if (entry.expiresAtMs <= now) {
      authContextCache.delete(key);
    }
  }
}

/**
 * Get the current user's subject ID from the request context.
 *
 * Convenience function for logging/debugging.
 *
 * @returns User subject ID or undefined if not available
 */
export async function getCurrentUserId(): Promise<string | undefined> {
  try {
    const ctx = await getToolAuthContext();
    return ctx.claims.sub;
  } catch {
    return undefined;
  }
}
