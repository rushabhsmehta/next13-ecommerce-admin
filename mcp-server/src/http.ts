/**
 * HTTP/SSE transport for Claude.ai remote MCP.
 * Exposes two endpoints:
 *   GET /sse    → Claude connects here to open the SSE stream
 *   POST /messages?sessionId=xxx → Claude sends tool calls here
 */

import express from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export async function startHttpServer(server: McpServer): Promise<void> {
  const app = express();
  app.use(express.json());

  // Track active SSE sessions: sessionId → transport
  const transports = new Map<string, SSEServerTransport>();

  // ── SSE connection endpoint ────────────────────────────────────────────────
  app.get("/sse", async (_req, res) => {
    const transport = new SSEServerTransport("/messages", res);
    transports.set(transport.sessionId, transport);

    transport.onclose = () => {
      transports.delete(transport.sessionId);
      console.error(`[MCP HTTP] Session closed: ${transport.sessionId}`);
    };

    console.error(`[MCP HTTP] New session: ${transport.sessionId}`);
    await server.connect(transport);
  });

  // ── Message endpoint (Claude sends tool calls here) ────────────────────────
  app.post("/messages", async (req, res) => {
    const sessionId = req.query.sessionId as string;
    const transport = transports.get(sessionId);

    if (!transport) {
      res.status(404).json({ error: "Session not found. Connect to /sse first." });
      return;
    }

    await transport.handlePostMessage(req, res);
  });

  // ── Health check ───────────────────────────────────────────────────────────
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      server: "travel-admin-mcp",
      activeSessions: transports.size,
    });
  });

  const port = parseInt(process.env.MCP_PORT || "3100", 10);

  await new Promise<void>((resolve) => {
    app.listen(port, () => {
      console.error(`[MCP HTTP] Server running on port ${port}`);
      console.error(`[MCP HTTP] SSE endpoint:  http://localhost:${port}/sse`);
      console.error(`[MCP HTTP] Health check:  http://localhost:${port}/health`);
      resolve();
    });
  });
}
