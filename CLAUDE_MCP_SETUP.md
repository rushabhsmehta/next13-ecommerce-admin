# MCP Integration Setup Guide

This guide explains how to connect **Claude Desktop**, **Claude.ai**, or **ChatGPT** to the Travel Admin platform through the dedicated `mcp-server` package.

## Architecture

```text
AI client (Claude / ChatGPT)
  -> MCP server (stdio or Streamable HTTP + OAuth)
    -> Next.js MCP gateway at /api/mcp
    -> Prisma / Travel Admin database
```

Remote HTTP mode uses a two-step approval flow:

1. The AI client starts OAuth against `mcp-server`
2. `mcp-server` redirects the browser to the Next.js admin app
3. An authenticated `ADMIN` or `OWNER` approves the connector
4. The app signs the decision with `MCP_APPROVAL_SECRET`
5. `mcp-server` verifies that signed decision, issues an auth code, and exchanges it for a bearer token

## 1. Configure the Next.js app

Add these values to the main app `.env` (or Railway service variables):

```env
MCP_API_SECRET=your-strong-random-secret
MCP_APPROVAL_SECRET=your-second-strong-random-secret
```

Generate strong secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`MCP_API_SECRET` and `MCP_APPROVAL_SECRET` must **exactly match** the values on the MCP server service.

If you use AI itinerary generation, also ensure one of these is present:

```env
GOOGLE_GEMINI_API_KEY=your-gemini-api-key
# or
GEMINI_API_KEY=your-gemini-api-key
```

## 2. Configure the MCP server package

`mcp-server/.env` should contain:

```env
NEXT_APP_URL=https://admin.aagamholidays.com
MCP_API_SECRET=your-strong-random-secret
MCP_APPROVAL_SECRET=your-second-strong-random-secret

# HTTP mode (remote connectors)
MCP_TRANSPORT=http
MCP_PUBLIC_URL=https://your-mcp-server.up.railway.app
PORT=3000

# Strongly recommended for production
MCP_TOKEN_SECRET=your-64-char-hex-secret
MCP_CLIENTS_FILE=/data/mcp-clients.json
```

Optional settings:

```env
MCP_TOKEN_TTL_SECONDS=7776000
MCP_TOOL_TIMEOUT_MS=30000
```

Verify configuration:

```bash
cd mcp-server
npm run verify:env
npm run verify:env -- --health https://your-mcp-server.up.railway.app/health
```

See also [`mcp-server/RAILWAY.md`](mcp-server/RAILWAY.md) for Railway volume setup.

## 3. Install and build

```bash
cd mcp-server
npm install
npm run typecheck
npm run build
npm test
```

## 4. Claude Desktop setup (stdio)

Edit the Claude Desktop config file:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "travel-admin": {
      "command": "node",
      "args": ["/absolute/path/to/next13-ecommerce-admin/mcp-server/dist/index.js"],
      "env": {
        "NEXT_APP_URL": "http://localhost:3000",
        "MCP_API_SECRET": "your-strong-random-secret"
      }
    }
  }
}
```

Then restart Claude Desktop. No OAuth is required for stdio mode.

## 5. Claude.ai setup (remote HTTP)

Start the MCP server in HTTP mode:

```bash
cd mcp-server
npm run start:http
```

Expose it through HTTPS, then add it in Claude.ai:

1. Open **Claude.ai → Settings → Integrations**
2. Click **Add MCP Server**
3. Enter `https://your-mcp-server.com/mcp`
4. Complete the OAuth flow
5. When redirected into the Travel Admin app, sign in as an `ADMIN` or `OWNER`
6. Approve the connector from the in-app approval screen

Notes:

- The approval screen lives in the Next.js app (`/mcp/authorize`), not on the MCP server
- `ADMIN` and `OWNER` are the only roles allowed to approve connectors
- Use the **main admin domain** (`admin.aagamholidays.com`), not `associate.*`

## 6. ChatGPT setup (remote HTTP)

ChatGPT uses the same OAuth + Streamable HTTP protocol as Claude.ai.

1. In ChatGPT: **Settings → Apps** (or **Connectors**)
2. **Remove** any existing Travel Admin MCP connector (important after server redeploys)
3. **Add** a new connector with URL: `https://your-mcp-server.up.railway.app/mcp`
4. Complete OAuth in the browser
5. Sign in on `https://admin.aagamholidays.com/mcp/authorize` as **ADMIN** or **OWNER**
6. Click **Allow Access**

If OAuth fails with **Unknown OAuth client**, the MCP server lost its OAuth client registry (see Troubleshooting below). Remove and re-add the connector after fixing persistent storage.

### Posting bank charges via ChatGPT / Claude

There is no dedicated `create_bank_charge` tool. Use this sequence:

1. **`list_accounts`** — find the YES Bank (or other) account ID/name
2. **`list_expense_categories`** — confirm "Bank Charges" category exists
3. **`create_expense`** — one call per charge:

```json
{
  "bankAccountName": "Yes",
  "expenseCategoryName": "Bank Charges",
  "amount": 499.00,
  "description": "NS_LU_PPOS_May26_0007A0272930_3035385A - POS Charges",
  "expenseDate": "2026-05-26"
}
```

For bulk imports, use [`scripts/seed/create-yes-bank-charges-feb2026.js`](scripts/seed/create-yes-bank-charges-feb2026.js) instead.

## 7. Deployment notes (Railway)

Deploy the `mcp-server` package as its **own Railway service** (separate from the Next.js admin app).

| Variable | Service |
|----------|---------|
| `MCP_API_SECRET` | Both (must match) |
| `MCP_APPROVAL_SECRET` | Both (must match) |
| `MCP_TOKEN_SECRET` | MCP server only |
| `MCP_CLIENTS_FILE` | MCP server only |
| `NEXT_APP_URL` | MCP server only |
| `MCP_PUBLIC_URL` | MCP server only |

**Critical:** attach a Railway **volume** at `/data` and set `MCP_CLIENTS_FILE=/data/mcp-clients.json`. Without this, every redeploy wipes OAuth clients and remote connectors break.

- Health check path: `/health`
- Start command: `npm run start:http`
- Full Railway guide: [`mcp-server/RAILWAY.md`](mcp-server/RAILWAY.md)

Expected health response:

```json
{
  "status": "ok",
  "tokenMode": "stateless-hmac",
  "config": {
    "tokenSecretSet": true,
    "clientsFile": "/data/mcp-clients.json",
    "clientsFilePersistent": true,
    "registeredClients": 1,
    "nextAppUrlConfigured": true,
    "approvalSecretSet": true
  }
}
```

## 8. Security notes

- Never expose `MCP_API_SECRET` or `MCP_APPROVAL_SECRET` in client-side code
- `MCP_API_SECRET` protects the private `/api/mcp` gateway inside the Next.js app
- `MCP_APPROVAL_SECRET` signs approval decisions between the Next.js app and `mcp-server`
- Bearer tokens are HMAC-signed and expire automatically (`MCP_TOKEN_TTL_SECONDS`)
- Approval requests and OAuth codes are short-lived (10 minutes) and single-use
- OAuth approval is the human gate; tool handlers do not enforce per-user org RBAC

## 9. Troubleshooting

| Symptom | Fix |
|---------|-----|
| **Unknown OAuth client** on `/authorize` | MCP server restarted and lost client registry. Remove + re-add connector in ChatGPT/Claude.ai. For production, set `MCP_CLIENTS_FILE=/data/mcp-clients.json` with a Railway volume. |
| **Redirect URI not registered** | Remove and re-add the connector so fresh redirect URIs are registered. |
| `401 Unauthorized` from `/api/mcp` | `MCP_API_SECRET` does not match between MCP server and Next.js app. |
| Approval page says **forbidden** | Sign in with `ADMIN` or `OWNER` on the main admin domain. |
| Approval page does not load | Use `admin.aagamholidays.com`, not `associate.*`. |
| OAuth cannot finish | Verify `MCP_PUBLIC_URL` is public HTTPS; MCP server can reach `NEXT_APP_URL`. |
| Connector stopped after redeploy | Reconnect if `MCP_TOKEN_SECRET` or client registry changed. |
| `list_accounts` works but `create_expense` fails | Check account name match (`bankAccountName`), expense category name, and date format (`YYYY-MM-DD`). |
| ChatGPT blocks financial tool calls | ChatGPT may block some finance tools at the platform layer even when OAuth works. Use Claude Desktop (stdio) or the bulk seed script as fallback. |

### Quick reconnect checklist (ChatGPT)

1. Remove existing Travel Admin connector in ChatGPT settings
2. Confirm `curl https://your-mcp-server/health` returns `status: ok`
3. Confirm `config.clientsFilePersistent: true` in health response
4. Add connector: `https://your-mcp-server/mcp`
5. Approve on admin site as ADMIN/OWNER
6. Test with `list_accounts`
