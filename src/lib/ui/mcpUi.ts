/**
 * MCP-UI resource helpers.
 *
 * Mirrors Python toolbridge_mcp/ui/resources.py functionality.
 * Builds embedded UI resources for tool responses.
 */

import { createUIResource } from "@mcp-ui/server";
import { env } from "../../config/env.js";

// ============================================================================
// Types
// ============================================================================

export type UIFormat = "html" | "remote-dom" | "both";

export interface UIContentBlock {
  type: "text" | "resource";
  text?: string;
  resource?: {
    uri: string;
    mimeType: string;
    text?: string;
    blob?: string;
  };
}

export interface UIMetadata {
  "preferred-frame-size"?: [string, string];
  [key: string]: unknown;
}

// ============================================================================
// Constants
// ============================================================================

const HTML_MIME_TYPE = env.uiHtmlMimeType;
const APPS_SDK_MIME_TYPE = env.appsSdkMimeType;

const DEFAULT_UI_METADATA: UIMetadata = {
  "preferred-frame-size": ["100%", "100%"],
};

// ============================================================================
// Resource Builders
// ============================================================================

/**
 * Build a text content block for fallback display.
 */
function buildTextContent(text: string): UIContentBlock {
  return {
    type: "text",
    text,
  };
}

/**
 * Build an HTML embedded resource.
 */
function buildHtmlResource(uri: string, html: string): UIContentBlock {
  const resource = createUIResource({
    uri,
    encoding: "text",
    content: {
      type: "rawHtml",
      htmlString: html,
    },
    metadata: {
      ...DEFAULT_UI_METADATA,
      "ai.nanobot.meta/workspace": true,
    },
  });

  return {
    type: "resource",
    resource: {
      uri: resource.resource.uri,
      mimeType: HTML_MIME_TYPE,
      text: html,
    },
  };
}

/**
 * Build UI content with text fallback and HTML.
 *
 * Returns an array of content blocks suitable for MCP tool responses.
 */
export function buildUiWithTextAndHtml(args: {
  uri: string;
  html: string;
  textSummary: string;
  htmlMimeType?: "text/html" | "text/html+skybridge";
}): UIContentBlock[] {
  const { uri, html, textSummary, htmlMimeType = HTML_MIME_TYPE } = args;

  const content: UIContentBlock[] = [];

  // Text fallback first
  content.push(buildTextContent(textSummary));

  // HTML resource
  const resource = createUIResource({
    uri,
    encoding: "text",
    content: {
      type: "rawHtml",
      htmlString: html,
    },
    metadata: {
      ...DEFAULT_UI_METADATA,
      "ai.nanobot.meta/workspace": true,
    },
  });

  content.push({
    type: "resource",
    resource: {
      uri: resource.resource.uri,
      mimeType: htmlMimeType,
      text: html,
    },
  });

  return content;
}

/**
 * Build UI content based on format preference.
 *
 * Supports HTML-only, Remote DOM-only, or both formats.
 * Mirrors Python build_ui_with_text_and_dom function.
 */
export function buildUiWithTextAndDom(args: {
  uri: string;
  html: string | null;
  remoteDom: Record<string, unknown> | null;
  textSummary: string;
  uiFormat: UIFormat;
  remoteDomUiMetadata?: UIMetadata | null;
  remoteDomMetadata?: Record<string, unknown> | null;
}): UIContentBlock[] {
  const {
    uri,
    html,
    remoteDom,
    textSummary,
    uiFormat,
    remoteDomUiMetadata,
    remoteDomMetadata,
  } = args;

  const content: UIContentBlock[] = [];

  // Text fallback first
  content.push(buildTextContent(textSummary));

  // Add HTML if requested
  if (uiFormat === "html" || uiFormat === "both") {
    if (html) {
      const resource = createUIResource({
        uri,
        encoding: "text",
        content: {
          type: "rawHtml",
          htmlString: html,
        },
        metadata: {
          ...DEFAULT_UI_METADATA,
          "ai.nanobot.meta/workspace": true,
        },
      });

      content.push({
        type: "resource",
        resource: {
          uri: resource.resource.uri,
          mimeType: HTML_MIME_TYPE,
          text: html,
        },
      });
    }
  }

  // Add Remote DOM if requested
  // Note: Remote DOM support would require additional implementation
  // For now, we focus on HTML which is the primary format
  if (uiFormat === "remote-dom" || uiFormat === "both") {
    if (remoteDom) {
      // Remote DOM would be added here
      // For now, log a warning and continue with HTML fallback
      console.warn("Remote DOM format not yet implemented in TypeScript port");
    }
  }

  return content;
}

/**
 * Build UI content with structured content for Apps SDK.
 *
 * Returns both the content array and structured content for the tool response.
 */
export function buildUiWithStructuredContent<T extends Record<string, unknown>>(args: {
  uri: string;
  html: string | null;
  remoteDom: Record<string, unknown> | null;
  textSummary: string;
  uiFormat: UIFormat;
  structuredContent: T;
  remoteDomUiMetadata?: UIMetadata | null;
  remoteDomMetadata?: Record<string, unknown> | null;
}): { content: UIContentBlock[]; structuredContent: T } {
  const content = buildUiWithTextAndDom({
    uri: args.uri,
    html: args.html,
    remoteDom: args.remoteDom,
    textSummary: args.textSummary,
    uiFormat: args.uiFormat,
    remoteDomUiMetadata: args.remoteDomUiMetadata,
    remoteDomMetadata: args.remoteDomMetadata,
  });

  return {
    content,
    structuredContent: args.structuredContent,
  };
}
