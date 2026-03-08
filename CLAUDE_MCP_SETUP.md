# MCP Integration Setup Guide

This guide explains how to connect Claude (Desktop or Claude.ai) to your Travel Admin platform so you can manage inquiries, tour packages, and more by just talking to Claude.

---

## How It Works

```
You chat with Claude
     ↓
Claude calls MCP tools (create_inquiry, list_inquiries, etc.)
     ↓
MCP Server (Node.js) running locally or hosted
     ↓
Calls your Next.js app at /api/mcp (authenticated)
     ↓
Prisma → MySQL database
```

---

## Step 1: Add MCP Secret to Your Next.js App

Add this to your `.env` file:

```env
# MCP API Secret — keep this private!
MCP_API_SECRET=your-strong-random-secret-here
```

Generate a strong secret with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Also add your Gemini API key (if not already present) for AI itinerary generation:
```env
GOOGLE_GEMINI_API_KEY=your-gemini-api-key
# OR (the route also checks this name)
GEMINI_API_KEY=your-gemini-api-key
```

---

## Step 2: Install MCP Server Dependencies

```bash
cd mcp-server
npm install
npm run build
```

---

## Step 3A: Claude Desktop Setup (stdio)

Edit your Claude Desktop config file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "travel-admin": {
      "command": "node",
      "args": ["/absolute/path/to/your/project/mcp-server/dist/index.js"],
      "env": {
        "NEXT_APP_URL": "http://localhost:3000",
        "MCP_API_SECRET": "your-strong-random-secret-here"
      }
    }
  }
}
```

> Replace `/absolute/path/to/your/project` with the actual path, e.g. `/Users/yourname/projects/next13-ecommerce-admin`

Then **restart Claude Desktop**. You should see "travel-admin" appear in the tools menu.

---

## Step 3B: Claude.ai Setup (Remote MCP via HTTP)

### Start the MCP HTTP Server

Create `mcp-server/.env`:
```env
NEXT_APP_URL=https://your-production-app.com
MCP_API_SECRET=your-strong-random-secret-here
MCP_TRANSPORT=http
MCP_PORT=3100
```

Start the server:
```bash
cd mcp-server
MCP_TRANSPORT=http node dist/index.js
```

For production, deploy this on Railway, Fly.io, or any Node.js host.

### Add to Claude.ai

1. Go to **Claude.ai → Settings → Integrations**
2. Click **Add MCP Server**
3. Enter your server URL: `https://your-mcp-server.com/sse`
4. Name it: `Travel Admin`

---

## Available Tools

Once connected, you can talk to Claude naturally:

| Tool | Description | Example |
|------|-------------|---------|
| `search_locations` | Find destination IDs | "Search for Goa" |
| `list_tour_packages` | Browse packages | "Show me Kerala packages" |
| `list_hotels` | Browse hotels | "Hotels in Goa" |
| `create_inquiry` | New customer inquiry | "Create inquiry for Rahul..." |
| `list_inquiries` | View inquiries | "Show pending inquiries" |
| `get_inquiry` | Inquiry details | "Get inquiry INQ-123" |
| `update_inquiry_status` | Change status | "Mark inquiry as confirmed" |
| `add_inquiry_note` | Add a note | "Add note: customer called" |
| `create_tour_query` | Create a quote | "Create tour query for Rahul..." |
| `list_tour_queries` | View quotes | "Show recent tour queries" |
| `generate_itinerary` | AI itinerary | "Generate 5-day Goa itinerary for family" |
| `get_stats` | Dashboard stats | "How many inquiries today?" |

---

## Example Conversations

### Create an inquiry
> "Create an inquiry for Priya Sharma, mobile 9876543210, she wants to visit Goa in April 2026 with 2 adults and 1 child."

Claude will:
1. Call `search_locations` to find Goa's ID
2. Call `create_inquiry` with all the details
3. Confirm: "✅ Created inquiry #INQ-20260401-... for Priya Sharma going to Goa"

### Generate and quote an itinerary
> "Generate a 4-night 5-day Goa honeymoon itinerary for premium budget and create a tour query for it."

Claude will:
1. Call `generate_itinerary` to get AI-generated day-by-day plan
2. Show you the itinerary
3. Ask if you want to create the tour query
4. Call `create_tour_query` with the details

### Check dashboard stats
> "How many inquiries do we have today? What's the breakdown by status?"

Claude calls `get_stats` and presents:
```
Inquiries: 47 total
  • New: 12
  • Active: 23
  • Confirmed: 8
  • Cancelled: 4
Tour Queries: 31 active
```

---

## Development

```bash
# Run Next.js dev server
npm run dev

# In another terminal, test MCP server locally (stdio)
cd mcp-server
NEXT_APP_URL=http://localhost:3000 MCP_API_SECRET=your-secret npm run dev

# HTTP mode for testing
cd mcp-server
NEXT_APP_URL=http://localhost:3000 MCP_API_SECRET=your-secret MCP_TRANSPORT=http npm run dev
```

---

## Security Notes

- **Never expose `MCP_API_SECRET` in client-side code**
- The `/api/mcp` endpoint is only accessible with the correct secret header
- For production Claude.ai use, deploy the MCP server behind HTTPS
- The MCP secret bypasses Clerk auth — treat it like a master API key
