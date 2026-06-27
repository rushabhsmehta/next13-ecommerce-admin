/**
 * HTTP transport for Claude.ai remote MCP.
 *
 * Implements:
 *  - OAuth 2.0 with PKCE
 *  - Streamable HTTP MCP transport
 *  - Stateless HMAC-signed Bearer tokens (survive Railway restarts)
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { verifyApprovalToken } from "./contracts/oauth.js";
import {
  REDIRECT_URI_NOT_REGISTERED_PAGE,
  UNKNOWN_OAUTH_CLIENT_PAGE,
} from "./oauth-error-page.js";

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

// ── Stateless token config ────────────────────────────────────────────────────
// Tokens are HMAC-signed and self-verifying — no file storage needed.
// They survive Railway restarts as long as MCP_TOKEN_SECRET stays the same.
const TOKEN_SECRET = process.env.MCP_TOKEN_SECRET ?? "";
const TOKEN_TTL_SECONDS = Math.max(60, parseInt(process.env.MCP_TOKEN_TTL_SECONDS ?? "7776000", 10));

if (!TOKEN_SECRET) {
  console.error(
    "[MCP HTTP] WARNING: MCP_TOKEN_SECRET is not set. " +
    "Tokens will be issued with an empty secret and will NOT survive restarts securely. " +
    "Set MCP_TOKEN_SECRET to a long random hex string in your Railway environment variables."
  );
}

// ── Client registration (file-backed, gracefully handles restarts) ────────────
// Clients auto-re-register via the OAuth flow if this file is lost on restart.
const CLIENTS_FILE = path.resolve(process.env.MCP_CLIENTS_FILE ?? "/tmp/mcp-clients.json");

const AUTH_CODE_TTL_MS = 10 * 60 * 1000;
const APPROVAL_REQUEST_TTL_MS = 10 * 60 * 1000;
const NEXT_BASE_URL = (process.env.NEXT_APP_URL ?? "").replace(/\/$/, "");
const APPROVAL_SECRET = process.env.MCP_APPROVAL_SECRET ?? "";

const authCodes = new Map<string, PendingCode>();
const approvalRequests = new Map<string, PendingApprovalRequest>();
const registeredClients = loadMap<RegisteredClient>(CLIENTS_FILE);
const sessions = new Map<string, SessionEntry>();

function isEphemeralClientsFile(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/").toLowerCase();
  return normalized.includes("/tmp/") || normalized.endsWith("/tmp");
}

if (isEphemeralClientsFile(CLIENTS_FILE)) {
  console.error(
    `[MCP HTTP] WARNING: MCP_CLIENTS_FILE=${CLIENTS_FILE} is ephemeral. ` +
    "OAuth client registrations are lost on redeploy. " +
    "Set MCP_CLIENTS_FILE=/data/mcp-clients.json with a persistent Railway volume."
  );
} else {
  console.error(`[MCP HTTP] OAuth client registry: ${CLIENTS_FILE} (${registeredClients.size} client(s))`);
}

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

function saveClients() {
  saveMap(CLIENTS_FILE, registeredClients);
}

// ── Stateless HMAC token helpers ──────────────────────────────────────────────
/**
 * Issues a stateless Bearer token.
 * Format: base64url(JSON payload) + "." + base64url(HMAC-SHA256 signature)
 * No server-side storage needed — the signature proves authenticity.
 */
function issueStatelessToken(clientId: string): {
  rawToken: string;
  issuedAt: number;
  expiresAt: number;
} {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + TOKEN_TTL_SECONDS * 1000;
  const payload = Buffer.from(
    JSON.stringify({ clientId, issuedAt, expiresAt })
  ).toString("base64url");
  const sig = crypto
    .createHmac("sha256", TOKEN_SECRET || "insecure-fallback")
    .update(payload)
    .digest("base64url");
  return { rawToken: `${payload}.${sig}`, issuedAt, expiresAt };
}

/**
 * Verifies a stateless Bearer token.
 * Returns the payload if valid and not expired, otherwise null.
 */
function verifyStatelessToken(
  rawToken: string
): { clientId: string; issuedAt: number; expiresAt: number } | null {
  const dotIdx = rawToken.lastIndexOf(".");
  if (dotIdx === -1) return null;
  const payload = rawToken.slice(0, dotIdx);
  const sig = rawToken.slice(dotIdx + 1);
  const expected = crypto
    .createHmac("sha256", TOKEN_SECRET || "insecure-fallback")
    .update(payload)
    .digest("base64url");
  // Constant-time comparison to prevent timing attacks
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      clientId: string; issuedAt: number; expiresAt: number;
    };
    if (Date.now() > data.expiresAt) return null;
    return data;
  } catch { return null; }
}

// ── Cleanup loop ───────────────────────────────────────────────────────────────
function pruneExpiredState(): void {
  const now = Date.now();
  for (const [code, pending] of authCodes.entries()) {
    if (pending.expiresAt <= now) authCodes.delete(code);
  }
  for (const [approvalId, pending] of approvalRequests.entries()) {
    if (pending.expiresAt <= now) approvalRequests.delete(approvalId);
  }
}

function startCleanupLoop(): void {
  const timer = setInterval(() => pruneExpiredState(), 60_000);
  timer.unref?.();
}

// ── Misc helpers ───────────────────────────────────────────────────────────────
function redirectToClient(res: express.Response, redirectUri: string, params: Record<string, string>) {
  const destination = new URL(redirectUri);
  for (const [key, value] of Object.entries(params)) destination.searchParams.set(key, value);
  res.redirect(destination.toString());
}

function isRedirectUriAllowed(client: RegisteredClient, redirectUri: string): boolean {
  return client.redirectUris.includes(redirectUri);
}

function makeRequireBearer(baseUrl: string) {
  const resourceMetadata = `${baseUrl}/.well-known/oauth-protected-resource`;
  return function requireBearer(
    req: express.Request, res: express.Response, next: express.NextFunction
  ): void {
    pruneExpiredState();
    const auth = req.headers.authorization ?? "";
    if (!auth.startsWith("Bearer ")) {
      log("BEARER", `401 No Bearer token on ${req.method} ${req.path}`, {
        authHeaderPresent: !!req.headers.authorization,
        authHeaderPrefix: auth.slice(0, 10) || "(empty)",
      });
      res.status(401)
        .setHeader("WWW-Authenticate", `Bearer resource_metadata="${resourceMetadata}"`)
        .json({ error: "unauthorized", error_description: "Bearer token required" });
      return;
    }
    const rawToken = auth.slice(7);
    const token = verifyStatelessToken(rawToken);
    if (!token) {
      log("BEARER", `401 Invalid/expired stateless token on ${req.method} ${req.path}`, {
        tokenPrefix: rawToken.slice(0, 12),
      });
      res.status(401)
        .setHeader("WWW-Authenticate", `Bearer resource_metadata="${resourceMetadata}", error="invalid_token"`)
        .json({ error: "invalid_token", error_description: "Unknown or expired token" });
      return;
    }
    log("BEARER", `Token OK for ${req.method} ${req.path}`, {
      clientId: token.clientId,
      issuedAt: new Date(token.issuedAt).toISOString(),
      expiresAt: new Date(token.expiresAt).toISOString(),
    });
    next();
  };
}

async function closeMcpServer(server: McpServer): Promise<void> {
  const close = (server as { close?: () => Promise<void> | void }).close;
  const disconnect = (server as { disconnect?: () => Promise<void> | void }).disconnect;
  try {
    if (typeof close === "function") { await close.call(server); return; }
    if (typeof disconnect === "function") { await disconnect.call(server); }
  } catch (err) { console.error("[MCP HTTP] Failed to close MCP server cleanly:", err); }
}

async function closeTransport(transport: StreamableHTTPServerTransport): Promise<void> {
  const close = (transport as { close?: () => Promise<void> | void }).close;
  if (typeof close !== "function") return;
  try { await close.call(transport); } catch (err) {
    console.error("[MCP HTTP] Failed to close MCP transport cleanly:", err);
  }
}

async function closeSession(sessionId: string): Promise<void> {
  const entry = sessions.get(sessionId);
  if (!entry) return;
  sessions.delete(sessionId);
  await closeTransport(entry.transport);
  await closeMcpServer(entry.server);
  console.error(`[MCP HTTP] Session closed: ${sessionId}`);
}

// ── Logging helpers ────────────────────────────────────────────────────────────
function log(tag: string, message: string, extra?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  const extraStr = extra ? " " + JSON.stringify(extra) : "";
  console.error(`[${ts}] [${tag}] ${message}${extraStr}`);
}

function sanitizeHeaders(headers: Record<string, string | string[] | undefined>): Record<string, string | string[] | undefined> {
  const out: Record<string, string | string[] | undefined> = {};
  for (const [k, v] of Object.entries(headers)) {
    out[k] = k.toLowerCase() === "authorization" ? (v ? "Bearer ***" : v) : v;
  }
  return out;
}

function bad400(res: express.Response, tag: string, reason: string, ctx?: Record<string, unknown>): void {
  log(tag, `400 ${reason}`, ctx);
  res.status(400).send(reason);
}

function bad400Html(res: express.Response, tag: string, reason: string, html: string, ctx?: Record<string, unknown>): void {
  log(tag, `400 ${reason}`, ctx);
  res.status(400).type("html").send(html);
}

function bad400json(res: express.Response, tag: string, error: string, error_description: string, ctx?: Record<string, unknown>): void {
  log(tag, `400 ${error}: ${error_description}`, ctx);
  res.status(400).json({ error, error_description });
}

// ── Main HTTP server ───────────────────────────────────────────────────────────
export function startHttpServer(createServer: () => McpServer): void {
  startCleanupLoop();
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false }));

  app.use((req, _res, next) => {
    pruneExpiredState();
    log("REQ", `${req.method} ${req.path}`, {
      ip: req.ip,
      query: Object.keys(req.query).length ? req.query : undefined,
      headers: sanitizeHeaders(req.headers as Record<string, string | string[] | undefined>),
    });
    next();
  });

  const port = process.env.PORT ?? 3000;
  const baseUrl = (process.env.MCP_PUBLIC_URL ?? `http://localhost:${port}`).replace(/\/$/, "");
  const requireBearer = makeRequireBearer(baseUrl);

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      tokenMode: "stateless-hmac",
      config: {
        tokenSecretSet: TOKEN_SECRET.length > 0,
        clientsFile: CLIENTS_FILE,
        clientsFilePersistent: !isEphemeralClientsFile(CLIENTS_FILE),
        registeredClients: registeredClients.size,
        nextAppUrlConfigured: NEXT_BASE_URL.length > 0,
        approvalSecretSet: APPROVAL_SECRET.length > 0,
      },
    });
  });

  app.get("/.well-known/oauth-protected-resource", (_req, res) => {
    res.json({ resource: baseUrl, authorization_servers: [baseUrl] });
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
      ? body.redirect_uris.filter((v): v is string => typeof v === "string" && v.length > 0)
      : [];
    const clientId = crypto.randomBytes(16).toString("hex");
    const clientName = typeof body.client_name === "string" && body.client_name.length > 0
      ? body.client_name : "MCP Client";
    registeredClients.set(clientId, { clientId, clientName, redirectUris, createdAt: Date.now() });
    saveClients();
    res.status(201).json({
      client_id: clientId, client_id_issued_at: Math.floor(Date.now() / 1000),
      redirect_uris: redirectUris, client_name: clientName,
      grant_types: ["authorization_code"], response_types: ["code"],
      token_endpoint_auth_method: "none",
    });
  });

  app.get("/authorize", (req, res) => {
    const query = req.query as Record<string, string>;
    const { response_type, client_id, redirect_uri, code_challenge, state } = query;
    const codeChallengeMethod = query.code_challenge_method ?? "S256";
    if (response_type !== "code" || !client_id || !redirect_uri || !code_challenge) {
      bad400(res, "AUTHORIZE", "Invalid authorization request - missing required parameters.");
      return;
    }
    if (codeChallengeMethod !== "S256") {
      bad400(res, "AUTHORIZE", "Only PKCE S256 is supported.", { codeChallengeMethod });
      return;
    }
    const client = registeredClients.get(client_id);
    if (!client) {
      bad400Html(res, "AUTHORIZE", "Unknown OAuth client.", UNKNOWN_OAUTH_CLIENT_PAGE, {
        client_id, registeredClientIds: [...registeredClients.keys()],
      });
      return;
    }
    if (!isRedirectUriAllowed(client, redirect_uri)) {
      bad400Html(res, "AUTHORIZE", "Redirect URI is not registered for this client.", REDIRECT_URI_NOT_REGISTERED_PAGE);
      return;
    }
    const approvalId = crypto.randomUUID();
    approvalRequests.set(approvalId, {
      clientId: client_id, clientName: client.clientName, redirectUri: redirect_uri,
      codeChallenge: code_challenge, codeChallengeMethod, state,
      expiresAt: Date.now() + APPROVAL_REQUEST_TTL_MS,
    });
    const approvalUrl = new URL("/mcp/authorize", NEXT_BASE_URL || baseUrl);
    approvalUrl.searchParams.set("approvalId", approvalId);
    approvalUrl.searchParams.set("mcpServerUrl", baseUrl);
    approvalUrl.searchParams.set("clientId", client_id);
    approvalUrl.searchParams.set("clientName", client.clientName);
    res.redirect(approvalUrl.toString());
  });

  app.all("/authorize/approve", (req, res) => {
    const approvalToken = req.query.approval_token;
    if (typeof approvalToken !== "string" || !approvalToken) {
      bad400(res, "APPROVE", "Missing approval token."); return;
    }
    try {
      const payload = verifyApprovalToken(APPROVAL_SECRET, approvalToken);
      if (payload.decision !== "approve") {
        bad400(res, "APPROVE", "Approval token does not grant access."); return;
      }
      const approvalRequest = approvalRequests.get(payload.approvalId);
      if (!approvalRequest || approvalRequest.expiresAt <= Date.now()) {
        bad400(res, "APPROVE", "Approval request not found or expired.", {
          approvalId: payload.approvalId, pendingIds: [...approvalRequests.keys()],
        });
        approvalRequests.delete(payload.approvalId); return;
      }
      approvalRequests.delete(payload.approvalId);
      const code = crypto.randomBytes(32).toString("hex");
      authCodes.set(code, {
        clientId: approvalRequest.clientId, redirectUri: approvalRequest.redirectUri,
        codeChallenge: approvalRequest.codeChallenge,
        codeChallengeMethod: approvalRequest.codeChallengeMethod,
        expiresAt: Date.now() + AUTH_CODE_TTL_MS,
      });
      console.error(`[MCP HTTP] Approval granted approvalId=${payload.approvalId} clientId=${approvalRequest.clientId}`);
      redirectToClient(res, approvalRequest.redirectUri, {
        code, ...(approvalRequest.state ? { state: approvalRequest.state } : {}),
      });
    } catch (err) { res.status(400).send(`Invalid approval token: ${String(err)}`); }
  });

  app.all("/authorize/deny", (req, res) => {
    const approvalToken = req.query.approval_token;
    if (typeof approvalToken !== "string" || !approvalToken) {
      bad400(res, "DENY", "Missing approval token."); return;
    }
    try {
      const payload = verifyApprovalToken(APPROVAL_SECRET, approvalToken);
      if (payload.decision !== "deny") {
        bad400(res, "DENY", "Approval token does not represent a denial."); return;
      }
      const approvalRequest = approvalRequests.get(payload.approvalId);
      if (!approvalRequest || approvalRequest.expiresAt <= Date.now()) {
        approvalRequests.delete(payload.approvalId);
        bad400(res, "DENY", "Approval request not found or expired."); return;
      }
      approvalRequests.delete(payload.approvalId);
      console.error(`[MCP HTTP] Approval denied approvalId=${payload.approvalId}`);
      redirectToClient(res, approvalRequest.redirectUri, {
        error: "access_denied", ...(approvalRequest.state ? { state: approvalRequest.state } : {}),
      });
    } catch (err) { res.status(400).send(`Invalid approval token: ${String(err)}`); }
  });

  app.post("/token", (req, res) => {
    const body = req.body as Record<string, string>;
    const { grant_type, code, code_verifier, client_id, redirect_uri } = body;
    if (grant_type !== "authorization_code") {
      bad400json(res, "TOKEN", "unsupported_grant_type", `Expected authorization_code, got ${grant_type}`);
      return;
    }
    if (!code || !code_verifier || !client_id || !redirect_uri) {
      bad400json(res, "TOKEN", "invalid_request", "Missing required parameters"); return;
    }
    const stored = authCodes.get(code);
    if (!stored) {
      bad400json(res, "TOKEN", "invalid_grant", "Authorization code not found"); return;
    }
    if (Date.now() > stored.expiresAt) {
      authCodes.delete(code);
      bad400json(res, "TOKEN", "invalid_grant", "Code expired"); return;
    }
    if (stored.clientId !== client_id || stored.redirectUri !== redirect_uri) {
      bad400json(res, "TOKEN", "invalid_grant", "client_id or redirect_uri mismatch"); return;
    }
    // Verify PKCE S256
    const hash = crypto.createHash("sha256").update(code_verifier).digest();
    if (hash.toString("base64url") !== stored.codeChallenge) {
      authCodes.delete(code);
      bad400json(res, "TOKEN", "invalid_grant", "PKCE verification failed"); return;
    }
    authCodes.delete(code);

    // Issue stateless HMAC-signed token — no file storage needed, survives restarts
    const { rawToken, expiresAt } = issueStatelessToken(client_id);
    log("TOKEN", "Stateless token issued", {
      client_id, expiresIn: TOKEN_TTL_SECONDS,
      expiresAt: new Date(expiresAt).toISOString(), tokenMode: "stateless-hmac",
    });
    res.json({ access_token: rawToken, token_type: "Bearer", expires_in: TOKEN_TTL_SECONDS });
  });

  app.post(["/", "/mcp"], requireBearer, async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    const body = req.body as Record<string, unknown>;
    if (sessionId && sessions.has(sessionId)) {
      const entry = sessions.get(sessionId)!;
      try {
        await entry.transport.handleRequest(req, res, req.body);
      } catch (err) {
        if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
      }
      return;
    }
    if (body?.method !== "initialize") {
      log("MCP_POST", "400 non-initialize message without a valid session", {
        sessionId: sessionId ?? "(none)", method: body?.method,
        activeSessions: sessions.size, activeSessionIds: [...sessions.keys()],
      });
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
      if (!id) return;
      sessions.delete(id);
      console.error(`[MCP HTTP] Session closed by client: ${id}`);
    };
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error("[MCP HTTP] Initialize error:", err);
      await closeMcpServer(server);
      if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get(["/", "/mcp"], requireBearer, async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !sessions.has(sessionId)) {
      log("MCP_GET", "400 unknown session", {
        sessionId: sessionId ?? "(none)", activeSessions: sessions.size,
      });
      res.status(400).json({ error: "bad_request", error_description: "Unknown session" });
      return;
    }
    const entry = sessions.get(sessionId)!;
    try {
      await entry.transport.handleRequest(req, res);
    } catch (err) {
      console.error(`[MCP HTTP] GET error session=${sessionId}:`, err);
      if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete(["/", "/mcp"], requireBearer, async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (sessionId) await closeSession(sessionId);
    res.status(200).end();
  });

  app.listen(port, () => {
    console.error(`[MCP HTTP] Listening on port ${port}`);
    console.error(`[MCP HTTP] Public URL:      ${baseUrl}`);
    console.error(`[MCP HTTP] Token mode:      stateless-hmac (restart-safe ✓)`);
    console.error(`[MCP HTTP] OAuth discovery: ${baseUrl}/.well-known/oauth-authorization-server`);
    console.error(`[MCP HTTP] MCP endpoint:    ${baseUrl}/mcp`);
  });
}
