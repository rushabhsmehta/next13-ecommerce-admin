# MCP Integration Setup Guide

This guide explains how to connect Claude Desktop or Claude.ai to the Travel Admin platform through the dedicated `mcp-server` package.

## Architecture

```text
Claude / Claude.ai
  -> MCP server (stdio or Streamable HTTP)
  -> Next.js MCP gateway at /api/mcp
  -> Prisma / Travel Admin database
```

Remote HTTP mode now uses a two-step approval flow:

1. Claude.ai starts OAuth against `mcp-server`
2. `mcp-server` redirects the browser to the Next.js app
3. An authenticated `ADMIN` or `OWNER` approves the connector in the app
4. The app signs the decision with `MCP_APPROVAL_SECRET`
5. `mcp-server` verifies that signed decision, issues an auth code, and exchanges it for a bearer token

## 1. Configure the Next.js app

Add these values to the main app `.env`:

```env
MCP_API_SECRET=your-strong-random-secret
MCP_APPROVAL_SECRET=your-second-strong-random-secret
```

Generate strong secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

If you use AI itinerary generation, also ensure one of these is present:

```env
GOOGLE_GEMINI_API_KEY=your-gemini-api-key
# or
GEMINI_API_KEY=your-gemini-api-key
```

## 2. Configure the MCP server package

`mcp-server/.env` should contain:

```env
NEXT_APP_URL=https://your-admin-app.com
MCP_API_SECRET=your-strong-random-secret
MCP_APPROVAL_SECRET=your-second-strong-random-secret

# HTTP mode only
MCP_TRANSPORT=http
MCP_PUBLIC_URL=https://your-mcp-server.com
PORT=3000
```

Optional settings:

```env
MCP_TOKEN_TTL_SECONDS=7776000
MCP_TOOL_TIMEOUT_MS=30000
```

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

Then restart Claude Desktop.

## 5. Claude.ai setup (remote HTTP)

Start the MCP server in HTTP mode:

```bash
cd mcp-server
npm run start:http
```

Expose it through HTTPS, then add it in Claude.ai:

1. Open `Claude.ai -> Settings -> Integrations`
2. Click `Add MCP Server`
3. Enter `https://your-mcp-server.com/mcp`
4. Complete the OAuth flow
5. When redirected into the Travel Admin app, sign in as an `ADMIN` or `OWNER`
6. Approve or deny the connector from the in-app approval screen

Notes:

- The approval screen lives in the Next.js app, not in the standalone MCP server
- `ADMIN` and `OWNER` are the only roles allowed to approve connectors
- Existing remote tokens should be considered invalid after redeploying this hardened flow

## 6. Deployment notes

For Railway or any Node host:

- Deploy the `mcp-server` package as its own service
- Set `NEXT_APP_URL`, `MCP_API_SECRET`, `MCP_APPROVAL_SECRET`, `MCP_PUBLIC_URL`, and `PORT`
- Health check path: `/health`
- Start command: `npm run start:http`

## 7. Security notes

- Never expose `MCP_API_SECRET` or `MCP_APPROVAL_SECRET` in client-side code
- `MCP_API_SECRET` protects the private `/api/mcp` gateway inside the Next.js app
- `MCP_APPROVAL_SECRET` is only for signing approval decisions between the Next.js app and `mcp-server`
- Remote bearer tokens are stored as hashes and expire automatically
- Approval requests and OAuth codes are short-lived and single-use

## 8. Troubleshooting

- `401 Unauthorized` from `/api/mcp`: verify `MCP_API_SECRET` matches in both services
- Approval page says forbidden: sign in with an account that has `ADMIN` or `OWNER`
- Claude.ai cannot finish OAuth: verify `MCP_PUBLIC_URL` is public HTTPS and the MCP server can reach `NEXT_APP_URL`
- Remote connector stopped working after redeploy: reconnect it so a fresh token is issued
