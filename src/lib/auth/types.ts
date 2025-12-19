/**
 * Auth types for ToolBridge XMCP server.
 *
 * Defines canonical types for tool authentication context and backend API calls.
 */

/**
 * Claims extracted from a validated AuthKit JWT.
 */
export interface AuthKitClaims {
  /** Subject identifier (user ID from WorkOS, e.g., "user_abc123") */
  sub: string;
  /** User email address */
  email?: string;
  /** Token expiration timestamp (seconds since epoch) */
  exp?: number;
  /** Token issued at timestamp */
  iat?: number;
  /** Custom tenant claim (if configured in WorkOS) */
  tenant_id?: string;
  /** OAuth scopes granted */
  scope?: string;
  /** Additional claims */
  [key: string]: unknown;
}

/**
 * Complete authentication context for tool invocations.
 *
 * This is the primary interface tools use to access authenticated user context
 * and make authorized API calls to the Go backend.
 */
export interface ToolAuthContext {
  /** Raw AuthKit bearer token (inbound from OAuth) */
  authkitToken: string;
  /** Verified claims from the AuthKit token */
  claims: AuthKitClaims;
  /** Resolved tenant ID (from backend resolution, claim, or static config) */
  tenantId: string;
  /** Backend JWT for Go API calls (from token exchange or local signing) */
  backendToken: string;
}

/**
 * Authentication bundle for Go backend API calls.
 *
 * This is passed to toolbridgeClient functions to provide
 * both the access token and tenant header.
 */
export interface BackendAuth {
  /** Bearer token for Authorization header */
  accessToken: string;
  /** Tenant ID for X-TB-Tenant-ID header */
  tenantId: string;
}

/**
 * Response from the backend /auth/token-exchange endpoint.
 */
export interface TokenExchangeResponse {
  /** Exchanged backend JWT */
  access_token: string;
  /** Token type (typically "Bearer") */
  token_type: string;
  /** Token expiration in seconds */
  expires_in?: number;
}

/**
 * Response from the backend /v1/auth/tenant endpoint.
 */
export interface TenantResolutionResponse {
  /** Resolved tenant ID */
  tenant_id?: string;
  /** Organization name (for logging/display) */
  organization_name?: string;
  /** True if user has multiple orgs and must select one */
  requires_selection?: boolean;
  /** Available organizations (when requires_selection is true) */
  organizations?: Array<{
    id: string;
    name: string;
  }>;
}
