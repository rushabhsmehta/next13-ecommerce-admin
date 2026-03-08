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

/**
 * Validate required env vars before doing anything else.
 * Failing here gives an immediate, readable message rather than a cryptic
 * error deep inside a tool call.
 */
function validateStartupEnv(mode: string): void {
  const required: Array<{ key: string; desc: string }> = [
    { key: "NEXT_APP_URL",   desc: "URL of the Next.js admin app" },
    { key: "MCP_API_SECRET", desc: "Shared secret for MCP gateway auth" },
  ];
  if (mode === "http") {
    required.push({ key: "MCP_HTTP_SECRET", desc: "Bearer token for Claude.ai HTTP transport" });
  }
  const missing = required.filter((r) => !process.env[r.key]);
  if (missing.length === 0) return;
  console.error("[MCP] FATAL: Missing required environment variables:");
  missing.forEach((r) => console.error(`  ${r.key.padEnd(20)} — ${r.desc}`));
  console.error("\nSet these in mcp-server/.env and restart.");
  process.exit(1);
}

async function main() {
  validateStartupEnv(transportMode);
  const server = createMcpServer();

  if (transportMode === "http") {
    const { startHttpServer } = await import("./http.js");
    await startHttpServer(server);
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    // Note: use stderr for logs in stdio mode — stdout is used for MCP protocol
    console.error("[MCP stdio] Travel Admin MCP Server running");
    console.error(`[MCP stdio] Connecting to: ${process.env.NEXT_APP_URL}`);
  }
}

main().catch((err) => {
  console.error("[MCP] Fatal error:", err);
  process.exit(1);
});
