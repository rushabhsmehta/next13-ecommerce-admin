# MCP Server — Railway Deployment

Deploy `mcp-server` as a **separate Railway service** from the Next.js admin app.

## Required environment variables

| Variable | Example | Notes |
|----------|---------|-------|
| `MCP_TRANSPORT` | `http` | Required for remote connectors |
| `NEXT_APP_URL` | `https://admin.aagamholidays.com` | Admin app base URL |
| `MCP_PUBLIC_URL` | `https://your-mcp.up.railway.app` | This service's public HTTPS URL |
| `MCP_API_SECRET` | (hex) | Must match Next.js `MCP_API_SECRET` |
| `MCP_APPROVAL_SECRET` | (hex) | Must match Next.js `MCP_APPROVAL_SECRET` |
| `MCP_TOKEN_SECRET` | (hex) | Generate once; do not rotate casually |
| `MCP_CLIENTS_FILE` | `/data/mcp-clients.json` | Requires persistent volume (see below) |

Generate secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Persistent OAuth client registry (critical)

By default, OAuth clients are stored in `/tmp/mcp-clients.json`, which is **wiped on every Railway redeploy**. Remote connectors (ChatGPT, Claude.ai) then fail with **Unknown OAuth client**.

### Setup

1. In the MCP server Railway service: **Volumes → Add Volume**
2. Mount path: `/data`
3. Set variable: `MCP_CLIENTS_FILE=/data/mcp-clients.json`
4. Redeploy the service

Verify after deploy:

```bash
curl https://your-mcp.up.railway.app/health
```

Expected `config` fields:

```json
{
  "tokenSecretSet": true,
  "clientsFile": "/data/mcp-clients.json",
  "clientsFilePersistent": true,
  "registeredClients": 0
}
```

## Health check

- Path: `/health`
- Start command: `npm run start:http` (see `railway.json`)

## Verify configuration locally

```bash
cd mcp-server
npm run verify:env
npm run verify:env -- --health https://your-mcp.up.railway.app/health
```

## After redeploy

If `MCP_CLIENTS_FILE` is not persistent, users must **remove and re-add** the MCP connector in ChatGPT or Claude.ai so a fresh OAuth client is registered.
