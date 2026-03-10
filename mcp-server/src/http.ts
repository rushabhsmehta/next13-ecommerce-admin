/**
 * HTTP/SSE transport for Claude.ai remote MCP.
 * Exposes two endpoints:
 *
 *  GET /sse  -> Claude connects here to open the SSE stream
 *  POST /.messages?sessionId=xxx -> Claude sends tool calls here
 *
 * No Bearer token auth - Claude.ai custom connectors don't support it.
 * Session isolation is enforced by the random UUID sessionId.
 */

import express from "express";
import type { Request, Response, NextFunction } from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export async function startHttpServer(server: McpServer): Promise<void> {
    const app = express();

  app.use(express.json());

  // Track active SSE sessions: sessionId -> transport
  const transports = new Map<string, SSEServerTransport>();

  // --- SSE connection endpoint
  app.get("/sse", async (_req, res) => {
        const transport = new SSEServerTransport("/.messages", res);

              transports.set(transport.sessionId, transport);

              transport.onclose = () => {
                      transports.delete(transport.sessionId);
                      console.error(`[MCP HTTP] Session closed: ${transport.sessionId}`);
              };

              console.error(`[MCP HTTP] New session: ${transport.sessionId}`);
        try {
                await server.connect(transport);
        } catch (err) {
                transports.delete(transport.sessionId);
                console.error(`[MCP HTTP] Session ${transport.sessionId} connect failed:`, err);
                if (!res.headersSent) {
                          res.status(500).json({ error: "MCP server failed to initialize session", code: "INTERNAL_ERROR" });
                } else {
                          res.write(`event: error\ndata: ${JSON.stringify({ error: "Session setup failed", code: "INTERNAL_ERROR" })}\n\n`);
                          res.end();
                }
        }
  });

  // --- Message endpoint
  app.post("/.messages", async (req, res) => {
        const sessionId = req.query.sessionId as string;

               if (!sessionId) {
                       res.status(400).json({ error: "Missing sessionId query parameter", code: "INVALID_INPUT" });
                       return;
               }

               const transport = transports.get(sessionId);
        if (!transport) {
                res.status(404).json({ error: "Session not found. Connect to /sse first.", code: "NOT_FOUND" });
                return;
        }

               const body = await readBody(req);
        if (!body) {
                res.status(400).json({ error: "Empty request body", code: "INVALID_INPUT" });
                return;
        }

               try {
                       transport.handleRequest(body, (result) => {
                                 res.json(result);
                       });
               } catch (err) {
                       console.error(`[MCP HTTP] Error processing message for ${sessionId}:`, err);
                       res.status(500).json({ error: "Failed to process message", code: "INTERNAL_ERROR" });
               }
  });

  async function readBody(req: Request): Promise<string | null> {
        return new Promise((resolve) => {
                let body = "";
                req.on("data", (chunk) => {
                          body += chunk.toString();
                });
                req.on("end", () => {
                          resolve(body || null);
                });
        });
  }

  const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
          console.log(`[MCP HTTP] Server running on port ${PORT}`);
    });
}

export async function onclose() {
    console.log("[MCP HTTP] Server closing");
}
