---
name: new-mcp-tool
description: Add a new tool to the travel-admin MCP server across all 3 layers — tool module, API gateway handler, and optional contracts.
disable-model-invocation: true
context: fork
agent: general-purpose
argument-hint: <tool-name> [description]
---

# Add New MCP Tool

Add a new tool to the travel-admin MCP server (modular layout, ~133 tools).

**Leverages:** `anthropic-skills:mcp-builder`

## Input

- **$0** — Tool name in snake_case (e.g., `list_customers`, `get_sale_balance`)
- **$1** — What the tool should do (optional)

## Live Project State

Tool registrations by module:
```
!`grep -rn "server.tool(" mcp-server/src/tools/ --include="*.ts" | wc -l`
```

```
!`grep -roh 'server.tool("[^"]*"' mcp-server/src/tools/ | sed 's/server.tool("//;s/"$//' | head -40`
```

Gateway:
```
!`ls src/app/api/mcp/handlers/ 2>/dev/null`
```

## Steps

1. Pick the **category module** under `mcp-server/src/tools/` (e.g., `finance.ts`, `inquiries.ts`, `customers.ts`) — add `server.tool(...)` next to related tools
2. Add or extend the **gateway handler** in `src/app/api/mcp/handlers/<category>.ts` (dispatched from `src/app/api/mcp/route.ts` + `handlers/index.ts`)
3. Read the relevant **Prisma model** in `schema.prisma`; reuse helpers in `src/app/api/mcp/lib/` (`resolve-entity`, `date-filter`, `schemas`)
4. If types are shared with the app, add to `mcp-server/src/contracts/` (webpack resolves `.js` → `.ts`)
5. **Build:** `cd mcp-server && npm run build`
6. Smoke-test via MCP client with `x-mcp-api-secret` header
7. Update tool count in `AGENTS.md` / `CLAUDE.md` if documenting externally

## Do not

- Put all tools in a monolithic `server.ts` — orchestrator is `mcp-server/src/server.ts` wiring `tools/*.ts` only
- Skip gateway auth — gateway validates `MCP_API_SECRET`

## Additional resources

- [references/mcp-patterns.md](references/mcp-patterns.md)
