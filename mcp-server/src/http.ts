/**
 * HTTP transport for Claude.ai remote MCP.
 *
 * Implements:
 *  - OAuth 2.0 with PKCE
 *  - Streamable HTTP MCP transport
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { verifyApprovalToken } from "./contracts/oauth.js";

interface PendingCode {
  codeChallenge: string;
  codeChallengeMethod: string;
  redirectUri: string;
  clientId: string;
  expiresAt: number;
}

interface PendingApprovalRequest {
  clientId: string;
  clientName: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  state?: string;
  expiresAt: number;
}

interface StoredToken {
  clientId: string;
  issuedAt: number;
  expiresAt: number;
  lastUsedAt: number;
}

interface RegisteredClient {
  clientId: string;
  clientName: string;
  redirectUris: string[];
  createdAt: number;
}

interface SessionEntry {
  transport: StreamableHTTPServerTransport;
  server: McpServer;
  createdAt: number;
}

const TOKENS_FILE = path.resolve(process.env.MCP_TOKENS_FILE ?? "/tmp/mcp-tokens.json");
const CLIENTS_FILE = path.resolve(process.env.MCP_CLIENTS_FILE ?? "/tmp/mcp-clients.json");
const TOKEN_TTL_SECONDS = Math.max(60, parseInt(process.env.MCP_TOKEN_TTL_SECONDS ?? "7776000", 10));
const AUTH_CODE_TTL_MS = 10 * 60 * 1000;
const APPROVAL_REQUEST_TTL_MS = 10 * 60 * 1000;
const NEXT_BASE_URL = (process.env.NEXT_APP_URL ?? "").replace(/\/$/, "");
const APPROVAL_SECRET = process.env.MCP_APPROVAL_SECRET ?? "";

const authCodes = new Map<string, PendingCode>();
const approvalRequests = new Map<string, PendingApprovalRequest>();
const accessTokens = loadMap<StoredToken>(TOKENS_FILE);
const registeredClients = loadMap<RegisteredClient>(CLIENTS_FILE);
const sessions = new Map<string, SessionEntry>();

function ensureDirectory(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function loadMap<T>(filePath: string): Map<string, T> {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return new Map(Object.entries(JSON.parse(raw) as Record<string, T>));
  } catch {
    return new Map();
  }
}

function saveMap<T>(filePath: string, entries: Map<string, T>) {
  ensureDirectory(filePath);
  fs.writeFileSync(filePath, JSON.stringify(Object.fromEntries(entries), null, 2), "utf8");
}

function saveTokens() {
  saveMap(TOKENS_FILE, accessTokens);
}

function saveClients() {
  saveMap(CLIENTS_FILE, registeredClients);
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function verifyS256(verifier: string, challenge: string): boolean {
  const hash = crypto.createHash("sha256").update(verifier).digest();
  return hash.toString("base64url") === challenge;
}

function pruneExpiredState(): void {
  const now = Date.now();

  for (const [code, pending] of authCodes.entries()) {
    if (pending.expiresAt <= now) {
      authCodes.delete(code);
    }
  }

  for (const [approvalId, pending] of approvalRequests.entries()) {
    if (pending.expiresAt <= now) {
      approvalRequests.delete(approvalId);
    }
  }

  let tokensChanged = false;
  for (const [tokenHash, token] of accessTokens.entries()) {
    if (token.expiresAt <= now) {
      accessTokens.delete(tokenHash);
      tokensChanged = true;
    }
  }
  if (tokensChanged) {
    saveTokens();
  }
}

function startCleanupLoop(): void {
  const timer = setInterval(() => pruneExpiredState(), 60_000);
  timer.unref?.();
}

function redirectToClient(res: express.Response, redirectUri: string, params: Record<string, string>) {
  const destination = new URL(redirectUri);
  for (const [key, value] of Object.entries(params)) {
    destination.searchParams.set(key, value);
  }
  res.redirect(destination.toString());
}

function isRedirectUriAllowed(client: RegisteredClient, redirectUri: string): boolean {
  return client.redirectUris.includes(redirectUri);
}

function makeRequireBearer(baseUrl: string) {
  const resourceMetadata = `${baseUrl}/.well-known/oauth-protected-resource`;
  return function requireBearer(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): void {
    pruneExpiredState();

    const auth = req.headers.authorization ?? "";
    if (!auth.startsWith("Bearer ")) {
      res
        .status(401)
        .setHeader("WWW-Authenticate", `Bearer resource_metadata="${resourceMetadata}"`)
        .json({ error: "unauthorized", error_description: "Bearer token required" });
      return;
    }

    const rawToken = auth.slice(7);
    const tokenHash = hashToken(rawToken);
    const token = accessTokens.get(tokenHash);
    if (!token) {
      res
        .status(401)
        .setHeader("WWW-Authenticate", `Bearer resource_metadata="${resourceMetadata}", error="invalid_token"`)
        .json({ error: "invalid_token", error_description: "Unknown or expired token" });
      return;
    }

    token.lastUsedAt = Date.now();
    accessTokens.set(tokenHash, token);
    saveTokens();
    next();
  };
}

async function closeMcpServer(server: McpServer): Promise<void> {
  const close = (server as { close?: () => Promise<void> | void }).close;
  const disconnect = (server as { disconnect?: () => Promise<void> | void }).disconnect;

  try {
    if (typeof close === "function") {
      await close.call(server);
      return;
    }
    if (typeof disconnect === "function") {
      await disconnect.call(server);
    }
  } catch (err) {
    console.error("[MCP HTTP] Failed to close MCP server cleanly:", err);
  }
}

async function closeTransport(transport: StreamableHTTPServerTransport): Promise<void> {
  const close = (transport as { close?: () => Promise<void> | void }).close;
  if (typeof close !== "function") {
    return;
  }

  try {
    await close.call(transport);
  } catch (err) {
    console.error("[MCP HTTP] Failed to close MCP transport cleanly:", err);
  }
}

async function closeSession(sessionId: string): Promise<void> {
  const entry = sessions.get(sessionId);
  if (!entry) {
    return;
  }

  sessions.delete(sessionId);
  await closeTransport(entry.transport);
  await closeMcpServer(entry.server);
  console.error(`[MCP HTTP] Session closed: ${sessionId}`);
}

export function startHttpServer(createServer: () => McpServer): void {
  startCleanupLoop();

  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false }));
  app.use((_req, _res, next) => {
    pruneExpiredState();
    next();
  });

  const port = process.env.PORT ?? 3000;
  const baseUrl = (process.env.MCP_PUBLIC_URL ?? `http://localhost:${port}`).replace(/\/$/, "");
  const requireBearer = makeRequireBearer(baseUrl);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/.well-known/oauth-protected-resource", (_req, res) => {
    res.json({
      resource: baseUrl,
      authorization_servers: [baseUrl],
    });
  });

  app.get("/.well-known/oauth-authorization-server", (_req, res) => {
    res.json({
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/authorize`,
      token_endpoint: `${baseUrl}/token`,
      registration_endpoint: `${baseUrl}/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
    });
  });

  app.post("/register", (req, res) => {
    const body = req.body as Record<string, unknown>;
    const redirectUris = Array.isArray(body.redirect_uris)
      ? body.redirect_uris.filter((value): value is string => typeof value === "string" && value.length > 0)
      : [];

    const clientId = crypto.randomBytes(16).toString("hex");
    const clientName = typeof body.client_name === "string" && body.client_name.length > 0
      ? body.client_name
      : "MCP Client";

    registeredClients.set(clientId, {
      clientId,
      clientName,
      redirectUris,
      createdAt: Date.now(),
    });
    saveClients();

    res.status(201).json({
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      redirect_uris: redirectUris,
      client_name: clientName,
      grant_types: ["authorization_code"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    });
  });

  app.get("/authorize", (req, res) => {
    const query = req.query as Record<string, string>;
    const { response_type, client_id, redirect_uri, code_challenge, state } = query;
    const codeChallengeMethod = query.code_challenge_method ?? "S256";

    if (response_type !== "code" || !client_id || !redirect_uri || !code_challenge) {
      res.status(400).send("Invalid authorization request - missing required parameters.");
      return;
    }
    if (codeChallengeMethod !== "S256") {
      res.status(400).send("Only PKCE S256 is supported.");
      return;
    }

    const client = registeredClients.get(client_id);
    if (!client) {
      res.status(400).send("Unknown OAuth client.");
      return;
    }
    if (!isRedirectUriAllowed(client, redirect_uri)) {
      res.status(400).send("Redirect URI is not registered for this client.");
      return;
    }

    const approvalId = crypto.randomUUID();
    approvalRequests.set(approvalId, {
      clientId: client_id,
      clientName: client.clientName,
      redirectUri: redirect_uri,
      codeChallenge: code_challenge,
      codeChallengeMethod,
      state,
      expiresAt: Date.now() + APPROVAL_REQUEST_TTL_MS,
    });

    const approvalUrl = new URL("/mcp/authorize", NEXT_BASE_URL || baseUrl);
    approvalUrl.searchParams.set("approvalId", approvalId);
    approvalUrl.searchParams.set("mcpServerUrl", baseUrl);
    approvalUrl.searchParams.set("clientId", client_id);
    approvalUrl.searchParams.set("clientName", client.clientName);

    res.redirect(approvalUrl.toString());
  });

  app.get("/authorize/approve", (req, res) => {
    const approvalToken = req.query.approval_token;
    if (typeof approvalToken !== "string" || !approvalToken) {
      res.status(400).send("Missing approval token.");
      return;
    }

    try {
      const payload = verifyApprovalToken(APPROVAL_SECRET, approvalToken);
      if (payload.decision !== "approve") {
        res.status(400).send("Approval token does not grant access.");
        return;
      }

      const approvalRequest = approvalRequests.get(payload.approvalId);
      if (!approvalRequest || approvalRequest.expiresAt <= Date.now()) {
        approvalRequests.delete(payload.approvalId);
        res.status(400).send("Approval request not found or expired.");
        return;
      }

      approvalRequests.delete(payload.approvalId);
      const code = crypto.randomBytes(32).toString("hex");
      authCodes.set(code, {
        clientId: approvalRequest.clientId,
        redirectUri: approvalRequest.redirectUri,
        codeChallenge: approvalRequest.codeChallenge,
        codeChallengeMethod: approvalRequest.codeChallengeMethod,
        expiresAt: Date.now() + AUTH_CODE_TTL_MS,
      });

      console.error(
        `[MCP HTTP] Approval granted approvalId=${payload.approvalId} clientId=${approvalRequest.clientId} actor=${payload.actorUserId}`
      );

      redirectToClient(res, approvalRequest.redirectUri, {
        code,
        ...(approvalRequest.state ? { state: approvalRequest.state } : {}),
      });
    } catch (err) {
      res.status(400).send(`Invalid approval token: ${String(err)}`);
    }
  });

  app.get("/authorize/deny", (req, res) => {
    const approvalToken = req.query.approval_token;
    if (typeof approvalToken !== "string" || !approvalToken) {
      res.status(400).send("Missing approval token.");
      return;
    }

    try {
      const payload = verifyApprovalToken(APPROVAL_SECRET, approvalToken);
      if (payload.decision !== "deny") {
        res.status(400).send("Approval token does not represent a denial.");
        return;
      }

      const approvalRequest = approvalRequests.get(payload.approvalId);
      if (!approvalRequest || approvalRequest.expiresAt <= Date.now()) {
        approvalRequests.delete(payload.approvalId);
        res.status(400).send("Approval request not found or expired.");
        return;
      }

      approvalRequests.delete(payload.approvalId);
      console.error(
        `[MCP HTTP] Approval denied approvalId=${payload.approvalId} clientId=${approvalRequest.clientId} actor=${payload.actorUserId}`
      );
      redirectToClient(res, approvalRequest.redirectUri, {
        error: "access_denied",
        ...(approvalRequest.state ? { state: approvalRequest.state } : {}),
      });
    } catch (err) {
      res.status(400).send(`Invalid approval token: ${String(err)}`);
    }
  });

  app.post("/token", (req, res) => {
    const body = req.body as Record<string, string>;
    const { grant_type, code, code_verifier, client_id, redirect_uri } = body;

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
      res.status(400).json({ error: "invalid_grant", error_description: "client_id or redirect_uri mismatch" });
      return;
    }
    if (!verifyS256(code_verifier, stored.codeChallenge)) {
      authCodes.delete(code);
      res.status(400).json({ error: "invalid_grant", error_description: "PKCE verification failed" });
      return;
    }

    authCodes.delete(code);

    const rawToken = crypto.randomBytes(32).toString("hex");
    const issuedAt = Date.now();
    const expiresAt = issuedAt + TOKEN_TTL_SECONDS * 1000;
    accessTokens.set(hashToken(rawToken), {
      clientId: client_id,
      issuedAt,
      expiresAt,
      lastUsedAt: issuedAt,
    });
    saveTokens();

    res.json({
      access_token: rawToken,
      token_type: "Bearer",
      expires_in: TOKEN_TTL_SECONDS,
    });
  });

  app.post("/mcp", requireBearer, async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (sessionId && sessions.has(sessionId)) {
      const entry = sessions.get(sessionId)!;
      try {
        await entry.transport.handleRequest(req, res, req.body);
      } catch (err) {
        console.error(`[MCP HTTP] POST error session=${sessionId}:`, err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Internal server error" });
        }
      }
      return;
    }

    const body = req.body as Record<string, unknown>;
    if (body?.method !== "initialize") {
      res.status(400).json({
        error: "bad_request",
        error_description: "Send an initialize message to start a new session",
      });
      return;
    }

    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
      onsessioninitialized: (id) => {
        sessions.set(id, { transport, server, createdAt: Date.now() });
        console.error(`[MCP HTTP] Session created: ${id}`);
      },
    });
    transport.onclose = () => {
      const id = transport.sessionId;
      if (!id) {
        return;
      }
      const entry = sessions.get(id);
      sessions.delete(id);
      if (entry) {
        void closeMcpServer(entry.server);
      }
      console.error(`[MCP HTTP] Session closed by client: ${id}`);
    };

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error("[MCP HTTP] Initialize error:", err);
      await closeMcpServer(server);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  app.get("/mcp", requireBearer, async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !sessions.has(sessionId)) {
      res.status(400).json({ error: "bad_request", error_description: "Unknown session" });
      return;
    }

    const entry = sessions.get(sessionId)!;
    try {
      await entry.transport.handleRequest(req, res);
    } catch (err) {
      console.error(`[MCP HTTP] GET error session=${sessionId}:`, err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  app.delete("/mcp", requireBearer, async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (sessionId) {
      await closeSession(sessionId);
    }
    res.status(200).end();
  });

  app.listen(port, () => {
    console.error(`[MCP HTTP] Listening on port ${port}`);
    console.error(`[MCP HTTP] Public URL:      ${baseUrl}`);
    console.error(`[MCP HTTP] OAuth discovery: ${baseUrl}/.well-known/oauth-authorization-server`);
    console.error(`[MCP HTTP] MCP endpoint:    ${baseUrl}/mcp`);
  });
}
