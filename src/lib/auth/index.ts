/**
 * Auth library for ToolBridge XMCP server.
 *
 * Provides WorkOS AuthKit OAuth integration with:
 * - Token extraction and verification (authkit.ts)
 * - Backend token exchange (tokenExchange.ts)
 * - Multi-tenant resolution (tenantResolve.ts)
 * - Unified context orchestration with caching (context.ts)
 *
 * Primary usage in tools:
 *
 * ```typescript
 * import { getToolAuthContext, getBackendAuth } from "../../lib/auth/index.js";
 *
 * export default async function handler(input: MyInput) {
 *   // Get full auth context (claims, tenantId, backendToken)
 *   const auth = await getToolAuthContext();
 *
 *   // Or just get what's needed for API calls
 *   const { accessToken, tenantId } = await getBackendAuth();
 *
 *   // Make authenticated API calls
 *   const result = await api.listNotes(params, { accessToken, tenantId });
 * }
 * ```
 */

// Types
export type {
  AuthKitClaims,
  ToolAuthContext,
  BackendAuth,
  TokenExchangeResponse,
  TenantResolutionResponse,
} from "./types.js";

// AuthKit token operations
export {
  AuthKitError,
  getIncomingBearerToken,
  verifyAuthKitJwt,
  getVerifiedAuthKitToken,
} from "./authkit.js";

// Token exchange
export {
  TokenExchangeError,
  exchangeForBackendToken,
  unsafeExtractUserIdForLogging,
} from "./tokenExchange.js";

// Tenant resolution
export {
  TenantResolutionError,
  MultiOrganizationError,
  resolveTenantId,
  type ResolvedTenant,
} from "./tenantResolve.js";

// Context orchestration (primary interface for tools)
export {
  getToolAuthContext,
  getBackendAuth,
  clearAuthContextCache,
  getCurrentUserId,
} from "./context.js";
