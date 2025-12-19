/**
 * AuthKit token extraction and verification.
 *
 * Provides utilities for extracting bearer tokens from XMCP request headers
 * and verifying them against WorkOS AuthKit JWKS.
 */

import { headers } from "xmcp/headers";
import { jwtVerify, createRemoteJWKSet, type JWTPayload, type JWTVerifyResult } from "jose";
import { env } from "../../config/env.js";
import type { AuthKitClaims } from "./types.js";

/**
 * Error thrown when AuthKit token operations fail.
 */
export class AuthKitError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "NO_TOKEN"
      | "INVALID_TOKEN"
      | "EXPIRED_TOKEN"
      | "VERIFICATION_FAILED"
      | "MISSING_CONFIG"
  ) {
    super(message);
    this.name = "AuthKitError";
  }
}

// Singleton JWKS instance (lazy-initialized)
let jwksInstance: ReturnType<typeof createRemoteJWKSet> | null = null;

/**
 * Get or create the JWKS instance for AuthKit token verification.
 */
function getJWKS(): ReturnType<typeof createRemoteJWKSet> {
  if (!env.authkitDomain) {
    throw new AuthKitError(
      "TOOLBRIDGE_AUTHKIT_DOMAIN not configured",
      "MISSING_CONFIG"
    );
  }

  if (!jwksInstance) {
    jwksInstance = createRemoteJWKSet(
      new URL(`${env.authkitDomain}/oauth2/jwks`)
    );
  }

  return jwksInstance;
}

/**
 * Extract the bearer token from the incoming request headers.
 *
 * Uses XMCP's headers() function to access request context.
 *
 * @returns The raw bearer token string
 * @throws AuthKitError if no token is found
 */
export function getIncomingBearerToken(): string {
  const requestHeaders = headers();
  const authHeader = requestHeaders.authorization;

  if (!authHeader) {
    throw new AuthKitError(
      "No Authorization header found in request",
      "NO_TOKEN"
    );
  }

  if (!authHeader.startsWith("Bearer ")) {
    throw new AuthKitError(
      "Authorization header must use Bearer scheme",
      "NO_TOKEN"
    );
  }

  const token = authHeader.slice(7);
  if (!token) {
    throw new AuthKitError(
      "Bearer token is empty",
      "NO_TOKEN"
    );
  }

  return token;
}

/**
 * Verify an AuthKit JWT and extract its claims.
 *
 * Validates:
 * - Signature against AuthKit JWKS
 * - Issuer matches AuthKit domain
 * - Expiration time
 *
 * Note: Audience validation is intentionally skipped to support DCR
 * (Dynamic Client Registration) tokens which may have unpredictable audiences.
 *
 * @param token - The raw JWT string to verify
 * @returns Verified claims payload
 * @throws AuthKitError if verification fails
 */
export async function verifyAuthKitJwt(token: string): Promise<AuthKitClaims> {
  const jwks = getJWKS();

  try {
    const result: JWTVerifyResult<JWTPayload> = await jwtVerify(token, jwks, {
      issuer: env.authkitDomain!,
      // Skip audience validation for DCR token flexibility
      // Backend will validate audience when processing requests
    });

    const { payload } = result;

    // Ensure required claims exist
    if (!payload.sub) {
      throw new AuthKitError(
        "Token missing required 'sub' claim",
        "INVALID_TOKEN"
      );
    }

    // Map JWT payload to AuthKitClaims
    const claims: AuthKitClaims = {
      sub: payload.sub,
      email: typeof payload.email === "string" ? payload.email : undefined,
      exp: payload.exp,
      iat: payload.iat,
      tenant_id:
        typeof payload.tenant_id === "string" ? payload.tenant_id : undefined,
      scope: typeof payload.scope === "string" ? payload.scope : undefined,
    };

    // Copy any additional claims
    for (const [key, value] of Object.entries(payload)) {
      if (!(key in claims)) {
        claims[key] = value;
      }
    }

    return claims;
  } catch (error) {
    if (error instanceof AuthKitError) {
      throw error;
    }

    // Handle jose-specific errors
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes("expired")) {
      throw new AuthKitError(
        `Token has expired: ${message}`,
        "EXPIRED_TOKEN"
      );
    }

    throw new AuthKitError(
      `Token verification failed: ${message}`,
      "VERIFICATION_FAILED"
    );
  }
}

/**
 * Extract and verify the AuthKit token from the current request.
 *
 * Combines getIncomingBearerToken() and verifyAuthKitJwt() into a single call.
 *
 * @returns Tuple of [rawToken, verifiedClaims]
 * @throws AuthKitError if extraction or verification fails
 */
export async function getVerifiedAuthKitToken(): Promise<[string, AuthKitClaims]> {
  const token = getIncomingBearerToken();
  const claims = await verifyAuthKitJwt(token);
  return [token, claims];
}
