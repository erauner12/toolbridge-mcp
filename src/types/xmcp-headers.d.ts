/**
 * Type declarations for xmcp/headers module.
 *
 * The xmcp package provides a headers() function through its runtime bundler
 * that gives access to incoming HTTP request headers. This declaration allows
 * TypeScript to understand the module during compilation, even though the
 * actual module resolution happens at runtime via xmcp's bundler.
 */

declare module "xmcp/headers" {
  import type { IncomingHttpHeaders } from "http";

  /**
   * Get the incoming HTTP request headers for the current tool invocation.
   *
   * This function is only available in the context of an XMCP HTTP server
   * handling a tool request. It uses AsyncLocalStorage internally to access
   * the request context.
   *
   * @returns The incoming HTTP headers from the current request
   */
  export function headers(): IncomingHttpHeaders;
}
