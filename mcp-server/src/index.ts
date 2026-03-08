#!/usr/bin/env node
/**
 * Travel Admin MCP Server
 *
 * Supports two transport modes:
 *   - stdio (default): for Claude Desktop
 *   - http: for Claude.ai remote MCP
 *
 * Set MCP_TRANSPORT=http to enable HTTP mode.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./server.js";

const transportMode = process.env.MCP_TRANSPORT || "stdio";

async function main() {
  const server = createMcpServer();

  if (transportMode === "http") {
    const { startHttpServer } = await import("./http.js");
    await startHttpServer(server);
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    // Note: use stderr for logs in stdio mode — stdout is used for MCP protocol
    console.error("[MCP stdio] Travel Admin MCP Server running");
    console.error(`[MCP stdio] Connecting to: ${process.env.NEXT_APP_URL || "http://localhost:3000"}`);
  }
}

main().catch((err) => {
  console.error("[MCP] Fatal error:", err);
  process.exit(1);
});
