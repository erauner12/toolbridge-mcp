/**
 * ToolBridge XMCP MCP Server.
 *
 * Main entry point for the MCP server with all UI tools registered.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// Import tool handlers and schemas
import {
  // Notes
  listNotesUi, listNotesUiSchema, listNotesUiMeta,
  showNoteUi, showNoteUiSchema, showNoteUiMeta,
  deleteNoteUi, deleteNoteUiSchema, deleteNoteUiMeta,
  editNoteUi, editNoteUiSchema, editNoteUiMeta,
  applyNoteEdit, applyNoteEditSchema, applyNoteEditMeta,
  discardNoteEdit, discardNoteEditSchema, discardNoteEditMeta,
  acceptNoteEditHunk, acceptNoteEditHunkSchema, acceptNoteEditHunkMeta,
  rejectNoteEditHunk, rejectNoteEditHunkSchema, rejectNoteEditHunkMeta,
  reviseNoteEditHunk, reviseNoteEditHunkSchema, reviseNoteEditHunkMeta,
  // Tasks
  listTasksUi, listTasksUiSchema, listTasksUiMeta,
  showTaskUi, showTaskUiSchema, showTaskUiMeta,
  processTaskUi, processTaskUiSchema, processTaskUiMeta,
  archiveTaskUi, archiveTaskUiSchema, archiveTaskUiMeta,
} from "./tools/index.js";
import { extractBearerToken } from "./lib/api/toolbridgeClient.js";

// ============================================================================
// Tool Registry
// ============================================================================

interface ToolDefinition {
  name: string;
  description: string;
  schema: z.ZodSchema;
  handler: (input: unknown, context: { accessToken: string; userId?: string }) => Promise<unknown>;
  _meta?: Record<string, unknown>;
}

const tools: ToolDefinition[] = [
  // Notes
  { name: listNotesUiMeta.name, description: listNotesUiMeta.description, schema: listNotesUiSchema, handler: listNotesUi, _meta: listNotesUiMeta._meta },
  { name: showNoteUiMeta.name, description: showNoteUiMeta.description, schema: showNoteUiSchema, handler: showNoteUi, _meta: showNoteUiMeta._meta },
  { name: deleteNoteUiMeta.name, description: deleteNoteUiMeta.description, schema: deleteNoteUiSchema, handler: deleteNoteUi, _meta: deleteNoteUiMeta._meta },
  { name: editNoteUiMeta.name, description: editNoteUiMeta.description, schema: editNoteUiSchema, handler: editNoteUi, _meta: editNoteUiMeta._meta },
  { name: applyNoteEditMeta.name, description: applyNoteEditMeta.description, schema: applyNoteEditSchema, handler: applyNoteEdit, _meta: applyNoteEditMeta._meta },
  { name: discardNoteEditMeta.name, description: discardNoteEditMeta.description, schema: discardNoteEditSchema, handler: discardNoteEdit, _meta: discardNoteEditMeta._meta },
  { name: acceptNoteEditHunkMeta.name, description: acceptNoteEditHunkMeta.description, schema: acceptNoteEditHunkSchema, handler: acceptNoteEditHunk, _meta: acceptNoteEditHunkMeta._meta },
  { name: rejectNoteEditHunkMeta.name, description: rejectNoteEditHunkMeta.description, schema: rejectNoteEditHunkSchema, handler: rejectNoteEditHunk, _meta: rejectNoteEditHunkMeta._meta },
  { name: reviseNoteEditHunkMeta.name, description: reviseNoteEditHunkMeta.description, schema: reviseNoteEditHunkSchema, handler: reviseNoteEditHunk, _meta: reviseNoteEditHunkMeta._meta },
  // Tasks
  { name: listTasksUiMeta.name, description: listTasksUiMeta.description, schema: listTasksUiSchema, handler: listTasksUi, _meta: listTasksUiMeta._meta },
  { name: showTaskUiMeta.name, description: showTaskUiMeta.description, schema: showTaskUiSchema, handler: showTaskUi, _meta: showTaskUiMeta._meta },
  { name: processTaskUiMeta.name, description: processTaskUiMeta.description, schema: processTaskUiSchema, handler: processTaskUi, _meta: processTaskUiMeta._meta },
  { name: archiveTaskUiMeta.name, description: archiveTaskUiMeta.description, schema: archiveTaskUiSchema, handler: archiveTaskUi, _meta: archiveTaskUiMeta._meta },
];

// ============================================================================
// Zod Schema to JSON Schema Conversion
// ============================================================================

function zodToJsonSchema(schema: z.ZodSchema): Record<string, unknown> {
  // This is a simplified conversion - in production, use zod-to-json-schema
  const shape = (schema as z.ZodObject<z.ZodRawShape>).shape;
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(shape)) {
    const zodType = value as z.ZodTypeAny;
    let type = "string";
    let description = "";
    let enumValues: string[] | undefined;

    // Handle optional wrapper
    const isOptional = zodType instanceof z.ZodOptional || zodType instanceof z.ZodDefault;
    const innerType = isOptional
      ? (zodType as z.ZodOptional<z.ZodTypeAny> | z.ZodDefault<z.ZodTypeAny>)._def.innerType
      : zodType;

    // Extract description
    if (innerType._def.description) {
      description = innerType._def.description;
    }

    // Determine type
    if (innerType instanceof z.ZodString) {
      type = "string";
    } else if (innerType instanceof z.ZodNumber) {
      type = "number";
    } else if (innerType instanceof z.ZodBoolean) {
      type = "boolean";
    } else if (innerType instanceof z.ZodEnum) {
      type = "string";
      enumValues = innerType._def.values;
    }

    const prop: Record<string, unknown> = { type };
    if (description) prop.description = description;
    if (enumValues) prop.enum = enumValues;

    properties[key] = prop;

    if (!isOptional) {
      required.push(key);
    }
  }

  return {
    type: "object",
    properties,
    required: required.length > 0 ? required : undefined,
  };
}

// ============================================================================
// MCP Server Setup
// ============================================================================

const server = new Server(
  {
    name: "toolbridge-xmcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: zodToJsonSchema(tool.schema),
      _meta: tool._meta,
    })),
  };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const tool = tools.find((t) => t.name === name);
  if (!tool) {
    return {
      content: [
        {
          type: "text",
          text: `Unknown tool: ${name}`,
        },
      ],
      isError: true,
    };
  }

  try {
    // Parse and validate input
    const input = tool.schema.parse(args);

    // Extract access token from request meta (this is simplified - actual implementation
    // depends on how the transport layer passes authentication)
    // In production, this would be extracted from the request headers or context
    const accessToken = process.env.TOOLBRIDGE_ACCESS_TOKEN || "";

    // Call the tool handler
    const result = await tool.handler(input, { accessToken });

    // Return the result
    return result as {
      content: Array<{ type: string; text?: string; resource?: unknown }>;
      structuredContent?: unknown;
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [
        {
          type: "text",
          text: `Error: ${message}`,
        },
      ],
      isError: true,
    };
  }
});

// ============================================================================
// Start Server
// ============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("ToolBridge XMCP MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
