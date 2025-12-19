/**
 * Tenant resolution for multi-tenant MCP deployments.
 *
 * Calls /v1/auth/tenant endpoint to resolve tenant ID from authenticated user.
 * Mirrors Python toolbridge_mcp/auth/tenant_resolver.py
 */

import { env } from "../../config/env.js";
import type { AuthKitClaims, TenantResolutionResponse } from "./types.js";

/**
 * Error thrown when tenant resolution fails.
 */
export class TenantResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantResolutionError";
  }
}

/**
 * Error thrown when user belongs to multiple organizations and must select one.
 */
export class MultiOrganizationError extends TenantResolutionError {
  constructor(
    public readonly organizations: Array<{ id: string; name: string }>
  ) {
    super(
      `User belongs to ${organizations.length} organizations. ` +
        "Organization selection not yet implemented."
    );
    this.name = "MultiOrganizationError";
  }
}

/**
 * Resolved tenant information.
 */
export interface ResolvedTenant {
  tenantId: string;
  organizationName?: string;
}

/**
 * Resolve tenant ID for authenticated user via backend-driven resolution.
 *
 * Calls the backend /v1/auth/tenant endpoint which validates the token
 * and queries WorkOS API to determine which organization(s) the user belongs to.
 *
 * B2C/B2B Hybrid Pattern:
 * - B2C users (no organization memberships) → default tenant (backend configured)
 * - B2B users (single organization) → organization ID
 * - Multi-org users → raises MultiOrganizationError
 *
 * @param authkitToken - The AuthKit bearer token
 * @returns Resolved tenant information
 * @throws TenantResolutionError if resolution fails
 * @throws MultiOrganizationError if user belongs to multiple organizations
 */
async function resolveViaBackend(
  authkitToken: string
): Promise<ResolvedTenant> {
  const tenantUrl = env.tenantResolutionUrl;
  if (!tenantUrl) {
    throw new TenantResolutionError(
      "Tenant resolution URL not configured. " +
        "Set TOOLBRIDGE_TENANT_RESOLUTION_URL or TOOLBRIDGE_GO_API_BASE_URL."
    );
  }

  try {
    const response = await fetch(tenantUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authkitToken}`,
        Accept: "application/json",
      },
    });

    if (response.status === 401) {
      throw new TenantResolutionError(
        "Authentication failed. Token may be expired or invalid."
      );
    }

    if (response.status === 403) {
      throw new TenantResolutionError(
        "User not authorized to access any organizations."
      );
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new TenantResolutionError(
        `Tenant resolution failed with status ${response.status}: ${errorBody}`
      );
    }

    const data = (await response.json()) as TenantResolutionResponse;

    // Check if multi-organization response
    if (data.requires_selection && data.organizations) {
      throw new MultiOrganizationError(data.organizations);
    }

    // Single organization - extract tenant_id
    if (!data.tenant_id) {
      throw new TenantResolutionError(
        "Response missing tenant_id field"
      );
    }

    return {
      tenantId: data.tenant_id,
      organizationName: data.organization_name,
    };
  } catch (error) {
    if (
      error instanceof TenantResolutionError ||
      error instanceof MultiOrganizationError
    ) {
      throw error;
    }

    throw new TenantResolutionError(
      `Tenant resolution request failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Resolve tenant ID from token claim.
 *
 * @param claims - Verified AuthKit claims
 * @returns Resolved tenant information
 * @throws TenantResolutionError if tenant_id claim is missing
 */
function resolveViaClaim(claims: AuthKitClaims): ResolvedTenant {
  if (!claims.tenant_id) {
    throw new TenantResolutionError(
      "Tenant ID claim not found in token. " +
        "Configure WorkOS to include tenant_id claim or use 'backend' tenant mode."
    );
  }

  return {
    tenantId: claims.tenant_id,
  };
}

/**
 * Resolve tenant ID from static configuration.
 *
 * @returns Resolved tenant information
 * @throws TenantResolutionError if TOOLBRIDGE_TENANT_ID is not configured
 */
function resolveViaStatic(): ResolvedTenant {
  if (!env.tenantId) {
    throw new TenantResolutionError(
      "Static tenant ID not configured. " +
        "Set TOOLBRIDGE_TENANT_ID environment variable."
    );
  }

  return {
    tenantId: env.tenantId,
    organizationName: "Static Configuration",
  };
}

/**
 * Resolve tenant ID for the authenticated user.
 *
 * Resolution strategy is determined by env.tenantMode:
 * - "backend": Call /v1/auth/tenant endpoint (recommended)
 * - "claim": Read tenant_id from token claim
 * - "static": Use TOOLBRIDGE_TENANT_ID environment variable
 *
 * @param authkitToken - The AuthKit bearer token
 * @param claims - Verified AuthKit claims
 * @returns Resolved tenant information
 * @throws TenantResolutionError if resolution fails
 * @throws MultiOrganizationError if user belongs to multiple organizations
 */
export async function resolveTenantId(
  authkitToken: string,
  claims: AuthKitClaims
): Promise<ResolvedTenant> {
  switch (env.tenantMode) {
    case "backend":
      return resolveViaBackend(authkitToken);

    case "claim":
      return resolveViaClaim(claims);

    case "static":
      return resolveViaStatic();

    default:
      // TypeScript should catch this, but handle gracefully
      throw new TenantResolutionError(
        `Unknown tenant mode: ${env.tenantMode}`
      );
  }
}
