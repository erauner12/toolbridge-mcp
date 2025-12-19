# ToolBridge XMCP Makefile
# TypeScript MCP server with UI tools

.PHONY: install dev dev-http dev-all build start start-http typecheck clean test-mcp test-http help

# Default environment variables
export TOOLBRIDGE_PUBLIC_BASE_URL ?= http://localhost:8080
export TOOLBRIDGE_GO_API_BASE_URL ?= http://localhost:9090
export TOOLBRIDGE_PORT ?= 8080

# Install dependencies
install:
	npm install

# Development mode - MCP server with hot reload
dev:
	npm run dev

# Development mode - HTTP server with hot reload
dev-http:
	npm run dev:http

# Development mode - both servers
dev-all:
	npm run dev:all

# Build TypeScript
build:
	npm run build

# Start MCP server (production)
start:
	npm run start

# Start HTTP server (production)
start-http:
	npm run start:http

# Type check
typecheck:
	npm run typecheck

# Clean build artifacts
clean:
	rm -rf dist node_modules/.cache

# Test MCP server - list tools
test-mcp:
	@echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | npm run mcp 2>/dev/null | jq .

# Test HTTP server health
test-http:
	@curl -s http://localhost:$(TOOLBRIDGE_PORT)/health | jq .

# Test HTTP templates
test-templates:
	@echo "Testing /apps/templates/notes/list..."
	@curl -s -I http://localhost:$(TOOLBRIDGE_PORT)/apps/templates/notes/list | grep -i content-type
	@echo "Testing /apps/templates/notes/detail..."
	@curl -s -I http://localhost:$(TOOLBRIDGE_PORT)/apps/templates/notes/detail | grep -i content-type
	@echo "Testing /apps/templates/tasks/list..."
	@curl -s -I http://localhost:$(TOOLBRIDGE_PORT)/apps/templates/tasks/list | grep -i content-type

# Help
help:
	@echo "ToolBridge XMCP - TypeScript MCP Server"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  install       Install npm dependencies"
	@echo "  dev           Run MCP server in dev mode (hot reload)"
	@echo "  dev-http      Run HTTP server in dev mode (hot reload)"
	@echo "  dev-all       Run both servers in dev mode"
	@echo "  build         Build TypeScript to dist/"
	@echo "  start         Start MCP server (production)"
	@echo "  start-http    Start HTTP server (production)"
	@echo "  typecheck     Run TypeScript type checking"
	@echo "  clean         Remove build artifacts"
	@echo "  test-mcp      Test MCP server tools/list"
	@echo "  test-http     Test HTTP server health endpoint"
	@echo "  test-templates Test Apps SDK template endpoints"
	@echo "  help          Show this help message"
	@echo ""
	@echo "Environment Variables:"
	@echo "  TOOLBRIDGE_PUBLIC_BASE_URL   Public URL (default: http://localhost:8080)"
	@echo "  TOOLBRIDGE_GO_API_BASE_URL   Go backend URL (default: http://localhost:9090)"
	@echo "  TOOLBRIDGE_PORT              HTTP server port (default: 8080)"
