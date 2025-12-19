import { defineConfig } from "xmcp";

export default defineConfig({
  name: "toolbridge",
  version: "1.0.0",
  description: "ToolBridge MCP server with Notes and Tasks UI tools",

  // File-based routing directories
  tools: "src/tools",
  prompts: "src/prompts",
  resources: "src/resources",

  // Build output
  outDir: ".xmcp",
});
