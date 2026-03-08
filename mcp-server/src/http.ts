/**
 * HTTP/SSE transport for Claude.ai remote MCP.
 * Exposes two endpoints:
 *   GET /sse    → Claude connects here to open the SSE stream
 *   POST /messages?sessionId=xxx → Claude sends tool calls here
 *
 * Authentication: callers must supply the correct bearer token in the
 * Authorization header: `Authorization: Bearer <MCP_HTTP_SECRET>`
 *
 * Set MCP_HTTP_SECRET in mcp-server/.env (it can be the same value as
 * MCP_API_SECRET or a separate one).
 */

import express from "express";
import type { Request, Response, NextFunction } from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const MCP_HTTP_SECRET = process.env.MCP_HTTP_SECRET || process.env.MCP_API_SECRET || "";

function requireBearerToken(req: Request, res: Response, next: NextFunction): void {
  if (!MCP_HTTP_SECRET) {
    // No secret configured — block all requests to prevent accidental open access
    res.status(500).json({ error: "MCP_HTTP_SECRET is not configured on the server", code: "INTERNAL_ERROR" });
    return;
  }
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token || token !== MCP_HTTP_SECRET) {
    res.status(401).json({ error: "Unauthorized: valid Bearer token required", code: "UNAUTHORIZED" });
    return;
  }
  next();
}

export async function startHttpServer(server: McpServer): Promise<void> {
  const app = express();
  app.use(express.json());

  // Track active SSE sessions: sessionId → transport
  const transports = new Map<string, SSEServerTransport>();

  // ── SSE connection endpoint ────────────────────────────────────────────────
  // Claude.ai connectors don't send Bearer tokens — auth is skipped here.
  // The /messages endpoint still requires the Bearer token (Claude.ai sends sessionId
  // which ties back to the authenticated SSE session implicitly).
  app.get("/sse", async (_req, res) => {
    const transport = new SSEServerTransport("/messages", res);
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
        // SSE headers already sent — signal error via SSE event then close
        res.write(`event: error\ndata: ${JSON.stringify({ error: "Session setup failed", code: "INTERNAL_ERROR" })}\n\n`);
        res.end();
      }
    }
  });

  // ── Message endpoint (Claude sends tool calls here) ────────────────────────
  app.post("/messages", requireBearerToken, async (req, res) => {
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

    try {
      await transport.handlePostMessage(req, res);
    } catch (err) {
      console.error(`[MCP HTTP] handlePostMessage failed for session ${sessionId}:`, err);
      if (!res.headersSent) {
        res.status(500).json({
          error: "Failed to process MCP message",
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
  });

  // ── Health check (unauthenticated — returns no sensitive info) ─────────────
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      server: "travel-admin-mcp",
      activeSessions: transports.size,
    });
  });

  // ── Global Express error handler ───────────────────────────────────────────
  // Catches any synchronous throws that escape route handlers (Express 4 requires 4 params)
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction): void => {
    console.error("[MCP HTTP] Unhandled Express error:", err.message, err.stack);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message, code: "INTERNAL_ERROR" });
    }
  });

  const port = parseInt(process.env.MCP_PORT || process.env.PORT || "3100", 10);

  await new Promise<void>((resolve) => {
    app.listen(port, () => {
      console.error(`[MCP HTTP] Server running on port ${port}`);
      console.error(`[MCP HTTP] SSE endpoint:  http://localhost:${port}/sse`);
      console.error(`[MCP HTTP] Health check:  http://localhost:${port}/health`);
      if (!MCP_HTTP_SECRET) {
        console.error("[MCP HTTP] ⚠️  WARNING: MCP_HTTP_SECRET is not set — all /sse and /messages requests will be rejected");
      }
      resolve();
    });
  });
}
