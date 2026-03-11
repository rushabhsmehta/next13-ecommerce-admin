/**
 * HTTP transport for Claude.ai remote MCP.
 *
 * Implements:
 *  - OAuth 2.0 with PKCE  (required by Claude.ai remote connectors)
 *  - Streamable HTTP MCP transport  (MCP spec 2025-03-26)
 *
 * Endpoints:
 *  GET  /.well-known/oauth-authorization-server  OAuth discovery
 *  GET  /authorize                               Show approval page
 *  POST /authorize/approve                       Issue auth code (form submit)
 *  POST /token                                   Exchange code → Bearer token
 *  POST /mcp                                     MCP tool calls
 *  GET  /mcp                                     MCP SSE stream (server-push)
 *  DEL  /mcp                                     Close session
 *  GET  /health                                  Liveness probe
 *
 * Required env vars (HTTP mode):
 *   MCP_PUBLIC_URL   — public base URL, e.g. https://my-mcp.up.railway.app
 */

import crypto from "crypto";
import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// ── In-memory OAuth state ────────────────────────────────────────────────────
// Sufficient for single-tenant use; a restart requires re-auth (that's fine).

interface PendingCode {
  codeChallenge: string;
  codeChallengeMethod: string;
  redirectUri: string;
  clientId: string;
  expiresAt: number; // ms
}

interface StoredToken {
  clientId: string;
  issuedAt: number;
}

const authCodes = new Map<string, PendingCode>();
const accessTokens = new Map<string, StoredToken>();

// Active MCP sessions: sessionId -> transport
const sessions = new Map<string, StreamableHTTPServerTransport>();

// ── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/** Verify PKCE S256: SHA-256(verifier) base64url-encoded must equal challenge */
function verifyS256(verifier: string, challenge: string): boolean {
  const hash = crypto.createHash("sha256").update(verifier).digest();
  return hash.toString("base64url") === challenge;
}

/** Bearer-token auth middleware — used on /mcp */
function makeRequireBearer(baseUrl: string) {
  const resourceMetadata = `${baseUrl}/.well-known/oauth-protected-resource`;
  return function requireBearer(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): void {
    const auth = req.headers.authorization ?? "";
    if (!auth.startsWith("Bearer ")) {
      res
        .status(401)
        .setHeader("WWW-Authenticate", `Bearer resource_metadata="${resourceMetadata}"`)
        .json({ error: "unauthorized", error_description: "Bearer token required" });
      return;
    }
    const token = auth.slice(7);
    if (!accessTokens.has(token)) {
      res
        .status(401)
        .setHeader("WWW-Authenticate", `Bearer resource_metadata="${resourceMetadata}", error="invalid_token"`)
        .json({ error: "invalid_token", error_description: "Unknown or expired token" });
      return;
    }
    next();
  };
}

// ── Server factory ───────────────────────────────────────────────────────────

export function startHttpServer(createServer: () => McpServer): void {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  const PORT = process.env.PORT ?? 3000;
  const BASE_URL = (process.env.MCP_PUBLIC_URL ?? `http://localhost:${PORT}`).replace(/\/$/, "");
  const requireBearer = makeRequireBearer(BASE_URL);

  // ── Health check ────────────────────────────────────────────────────────────
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // ── OAuth protected resource metadata (RFC 9728) ────────────────────────
  // Claude.ai checks this first to discover which authorization server to use.
  app.get("/.well-known/oauth-protected-resource", (_req, res) => {
    res.json({
      resource: BASE_URL,
      authorization_servers: [BASE_URL],
    });
  });

  // ── OAuth authorization server metadata (RFC 8414) ───────────────────────
  app.get("/.well-known/oauth-authorization-server", (_req, res) => {
    res.json({
      issuer: BASE_URL,
      authorization_endpoint: `${BASE_URL}/authorize`,
      token_endpoint: `${BASE_URL}/token`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
    });
  });

  // ── Authorization page ───────────────────────────────────────────────────
  app.get("/authorize", (req, res) => {
    const q = req.query as Record<string, string>;
    const { response_type, client_id, redirect_uri, code_challenge, state } = q;

    if (response_type !== "code" || !client_id || !redirect_uri || !code_challenge) {
      res.status(400).send("Invalid authorization request — missing required parameters.");
      return;
    }

    const hiddenFields = (
      ["client_id", "redirect_uri", "code_challenge", "code_challenge_method", "state"] as const
    )
      .map(
        (k) =>
          `<input type="hidden" name="${k}" value="${escapeHtml(String(q[k] ?? ""))}">`
      )
      .join("\n      ");

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Authorize — Travel Admin</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #f3f4f6;
           display: flex; align-items: center; justify-content: center;
           min-height: 100vh; margin: 0; padding: 16px; }
    .card { background: #fff; border-radius: 16px; padding: 40px 36px;
            max-width: 440px; width: 100%; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
    h1 { margin: 0 0 8px; font-size: 1.5rem; color: #111827; }
    .subtitle { color: #6b7280; font-size: .95rem; margin: 0 0 28px; line-height: 1.5; }
    .client { font-weight: 600; color: #1d4ed8; }
    .scope-list { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px;
                  padding: 16px 20px; margin-bottom: 28px; }
    .scope-list li { color: #374151; font-size: .9rem; margin: 4px 0; }
    .actions { display: flex; gap: 12px; }
    .btn { flex: 1; padding: 11px 0; border-radius: 8px; font-size: 1rem;
           font-family: inherit; font-weight: 600; cursor: pointer; border: none;
           text-align: center; text-decoration: none; display: inline-block; }
    .allow { background: #2563eb; color: #fff; }
    .allow:hover { background: #1d4ed8; }
    .deny { background: #e5e7eb; color: #374151; }
    .deny:hover { background: #d1d5db; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Authorize Travel Admin</h1>
    <p class="subtitle">
      <span class="client">${escapeHtml(client_id)}</span> is requesting access
      to your Travel Admin platform via Claude.
    </p>
    <ul class="scope-list">
      <li>Read &amp; create inquiries and tour queries</li>
      <li>Read tour packages and hotels</li>
      <li>Read &amp; record financial transactions</li>
      <li>Generate AI itineraries</li>
    </ul>
    <div class="actions">
      <form method="POST" action="/authorize/approve" style="flex:1">
        ${hiddenFields}
        <button type="submit" class="btn allow">Allow</button>
      </form>
      <a class="btn deny"
         href="${escapeHtml(redirect_uri)}?error=access_denied&amp;state=${encodeURIComponent(state ?? "")}">
        Deny
      </a>
    </div>
  </div>
</body>
</html>`);
  });

  // ── Authorization approval ────────────────────────────────────────────────
  app.post("/authorize/approve", (req, res) => {
    const { client_id, redirect_uri, code_challenge, code_challenge_method, state } =
      req.body as Record<string, string>;

    if (!client_id || !redirect_uri || !code_challenge) {
      res.status(400).send("Invalid approval request.");
      return;
    }

    const code = crypto.randomBytes(32).toString("hex");
    authCodes.set(code, {
      codeChallenge: code_challenge,
      codeChallengeMethod: code_challenge_method ?? "S256",
      redirectUri: redirect_uri,
      clientId: client_id,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    const dest = new URL(redirect_uri);
    dest.searchParams.set("code", code);
    if (state) dest.searchParams.set("state", state);

    res.redirect(dest.toString());
  });

  // ── Token endpoint ────────────────────────────────────────────────────────
  app.post("/token", (req, res) => {
    const { grant_type, code, code_verifier, client_id, redirect_uri } =
      req.body as Record<string, string>;

    if (grant_type !== "authorization_code") {
      res.status(400).json({ error: "unsupported_grant_type" });
      return;
    }
    if (!code || !code_verifier || !client_id || !redirect_uri) {
      res.status(400).json({
        error: "invalid_request",
        error_description: "Missing required parameters",
      });
      return;
    }

    const stored = authCodes.get(code);
    if (!stored) {
      res.status(400).json({
        error: "invalid_grant",
        error_description: "Authorization code not found",
      });
      return;
    }
    if (Date.now() > stored.expiresAt) {
      authCodes.delete(code);
      res.status(400).json({ error: "invalid_grant", error_description: "Code expired" });
      return;
    }
    if (stored.clientId !== client_id || stored.redirectUri !== redirect_uri) {
      res
        .status(400)
        .json({ error: "invalid_grant", error_description: "client_id or redirect_uri mismatch" });
      return;
    }
    if (!verifyS256(code_verifier, stored.codeChallenge)) {
      authCodes.delete(code);
      res.status(400).json({ error: "invalid_grant", error_description: "PKCE verification failed" });
      return;
    }

    authCodes.delete(code); // codes are single-use

    const token = crypto.randomBytes(32).toString("hex");
    accessTokens.set(token, { clientId: client_id, issuedAt: Date.now() });

    res.json({
      access_token: token,
      token_type: "Bearer",
      expires_in: 7_776_000, // 90 days
    });
  });

  // ── MCP endpoint (Streamable HTTP) ────────────────────────────────────────

  // POST — client→server messages (tool calls, initialize, etc.)
  app.post("/mcp", requireBearer, async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    // Reuse existing session
    if (sessionId && sessions.has(sessionId)) {
      const transport = sessions.get(sessionId)!;
      try {
        await transport.handleRequest(req, res, req.body);
      } catch (err) {
        console.error(`[MCP HTTP] POST error session=${sessionId}:`, err);
        if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
      }
      return;
    }

    // Must be an initialize request to start a new session
    const body = req.body as Record<string, unknown>;
    if (body?.method !== "initialize") {
      res.status(400).json({
        error: "bad_request",
        error_description: "Send an initialize message to start a new session",
      });
      return;
    }

    // Create new session
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
      onsessioninitialized: (id) => {
        sessions.set(id, transport);
        console.error(`[MCP HTTP] Session created: ${id}`);
      },
    });
    transport.onclose = () => {
      if (transport.sessionId) {
        sessions.delete(transport.sessionId);
        console.error(`[MCP HTTP] Session closed: ${transport.sessionId}`);
      }
    };

    const server = createServer();
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error("[MCP HTTP] Initialize error:", err);
      if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
    }
  });

  // GET — SSE stream for server-initiated messages
  app.get("/mcp", requireBearer, async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !sessions.has(sessionId)) {
      res.status(400).json({ error: "bad_request", error_description: "Unknown session" });
      return;
    }
    const transport = sessions.get(sessionId)!;
    try {
      await transport.handleRequest(req, res);
    } catch (err) {
      console.error(`[MCP HTTP] GET error session=${sessionId}:`, err);
      if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
    }
  });

  // DELETE — client closes session
  app.delete("/mcp", requireBearer, (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (sessionId) {
      sessions.delete(sessionId);
      console.error(`[MCP HTTP] Session deleted: ${sessionId}`);
    }
    res.status(200).end();
  });

  // ── Start ────────────────────────────────────────────────────────────────
  app.listen(PORT, () => {
    console.error(`[MCP HTTP] Listening on port ${PORT}`);
    console.error(`[MCP HTTP] Public URL:      ${BASE_URL}`);
    console.error(`[MCP HTTP] OAuth discovery: ${BASE_URL}/.well-known/oauth-authorization-server`);
    console.error(`[MCP HTTP] MCP endpoint:    ${BASE_URL}/mcp`);
  });
}
