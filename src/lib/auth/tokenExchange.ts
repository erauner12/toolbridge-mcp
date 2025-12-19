/**
 * Token exchange for converting AuthKit OAuth tokens to backend API JWTs.
 *
 * Supports two exchange patterns:
 * 1. Backend token exchange endpoint (recommended) - POST /auth/token-exchange
 * 2. Passthrough - Use AuthKit token directly (only if backend validates it)
 *
 * Mirrors Python toolbridge_mcp/auth/token_exchange.py
 */

import { env } from "../../config/env.js";
import type { TokenExchangeResponse } from "./types.js";

/**
 * Error thrown when token exchange fails.
 */
export class TokenExchangeError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly responseBody?: string
  ) {
    super(message);
    this.name = "TokenExchangeError";
  }
}

/**
 * Exchange an AuthKit token for a backend API JWT.
 *
 * Uses the backend /auth/token-exchange endpoint which:
 * 1. Validates the AuthKit token
 * 2. Issues a backend JWT with appropriate claims
 * 3. Returns the token for use in subsequent API calls
 *
 * @param authkitToken - The validated AuthKit bearer token
 * @returns Backend JWT token string
 * @throws TokenExchangeError if exchange fails
 */
export async function exchangeForBackendToken(
  authkitToken: string
): Promise<string> {
  // In passthrough mode, use the AuthKit token directly
  if (env.authMode === "passthrough") {
    return authkitToken;
  }

  const exchangeUrl = env.backendTokenExchangeUrl;
  if (!exchangeUrl) {
    throw new TokenExchangeError(
      "Backend token exchange URL not configured. " +
        "Set TOOLBRIDGE_BACKEND_TOKEN_EXCHANGE_URL or TOOLBRIDGE_GO_API_BASE_URL."
    );
  }

  try {
    const response = await fetch(exchangeUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authkitToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audience: env.backendApiAudience,
        grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new TokenExchangeError(
        `Token exchange failed with status ${response.status}: ${response.statusText}`,
        response.status,
        errorBody
      );
    }

    const data = (await response.json()) as TokenExchangeResponse;

    if (!data.access_token) {
      throw new TokenExchangeError(
        "Token exchange response missing access_token field"
      );
    }

    return data.access_token;
  } catch (error) {
    if (error instanceof TokenExchangeError) {
      throw error;
    }

    throw new TokenExchangeError(
      `Token exchange request failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Extract user ID from a backend JWT for logging purposes.
 *
 * WARNING: This is for logging only - no signature verification is performed.
 * Do NOT use this for authorization decisions.
 *
 * @param backendJwt - The backend JWT token
 * @returns User ID (sub claim) or "unknown" if extraction fails
 */
export function unsafeExtractUserIdForLogging(backendJwt: string): string {
  try {
    // JWT format: header.payload.signature
    const parts = backendJwt.split(".");
    if (parts.length !== 3) {
      return "unknown";
    }

    // Decode payload (base64url)
    const payloadJson = Buffer.from(parts[1], "base64url").toString("utf-8");
    const payload = JSON.parse(payloadJson);

    return typeof payload.sub === "string" ? payload.sub : "unknown";
  } catch {
    return "unknown";
  }
}
