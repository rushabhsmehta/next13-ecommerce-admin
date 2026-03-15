---
name: new-mcp-tool
description: Add a new tool to the travel-admin MCP server across all 3 layers — server definition, API client, and gateway handler.
disable-model-invocation: true
context: fork
agent: general-purpose
argument-hint: <tool-name> [description]
---

# Add New MCP Tool

Add a new tool to the travel-admin MCP server across all 3 layers.

**Leverages:** `anthropic-skills:mcp-builder`

## Input

- **$0** — Tool name in snake_case (e.g., `list_customers`, `get_sale_details`)
- **$1** — Description of what the tool should do (optional)

## Live Project State

Current tool count and names:
```
!`grep -c "server.tool(" mcp-server/src/server.ts 2>/dev/null`
```

```
!`grep "server.tool(" mcp-server/src/server.ts | sed 's/.*server.tool("\([^"]*\)".*/\1/' 2>/dev/null`
```

Gateway route size:
```
!`wc -l src/app/api/mcp/route.ts 2>/dev/null`
```

## Steps

1. Read `mcp-server/src/server.ts` to find the exact insertion point (add after related tools)
2. Read `src/app/api/mcp/route.ts` to find the dispatch section for the tool category
3. Read the relevant Prisma model from `schema.prisma` to understand fields and relations
4. **Add the tool definition** in `mcp-server/src/server.ts`
5. **Add the gateway handler** in `src/app/api/mcp/route.ts`
6. **Build and verify:** Run `npm run build` in `mcp-server/` directory
7. **Update tool count** in CLAUDE.md MCP Tools section if needed

## Additional resources

- For MCP server patterns, see [references/mcp-patterns.md](references/mcp-patterns.md)
