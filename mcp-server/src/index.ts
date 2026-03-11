#!/usr/bin/env node
/**
 * Travel Admin MCP Server
 *
 * Transport modes (set MCP_TRANSPORT env var):
 *   stdio  (default) — for Claude Desktop
 *   http             — for Claude.ai remote MCP (OAuth 2.0 + Streamable HTTP)
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./server.js";

const transportMode = process.env.MCP_TRANSPORT ?? "stdio";

function validateStartupEnv(mode: string): void {
  const required: Array<{ key: string; desc: string }> = [
    { key: "NEXT_APP_URL",   desc: "URL of the Next.js admin app (e.g. https://your-app.up.railway.app)" },
    { key: "MCP_API_SECRET", desc: "Shared secret for MCP gateway auth" },
  ];
  if (mode === "http") {
    required.push({
      key: "MCP_PUBLIC_URL",
      desc: "Public base URL of this MCP server (e.g. https://my-mcp.up.railway.app)",
    });
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

  if (transportMode === "http") {
    const { startHttpServer } = await import("./http.js");
    // Pass factory so each MCP session gets a fresh server instance
    startHttpServer(createMcpServer);
  } else {
    const server = createMcpServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("[MCP stdio] Travel Admin MCP Server running");
    console.error(`[MCP stdio] Connecting to: ${process.env.NEXT_APP_URL}`);
  }
}

main().catch((err) => {
  console.error("[MCP] Fatal error:", err);
  process.exit(1);
});
