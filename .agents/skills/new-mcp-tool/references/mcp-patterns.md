# MCP Server Patterns Reference

## Architecture (modular)

| Layer | Location |
|-------|----------|
| Tool definitions | `mcp-server/src/tools/<category>.ts` |
| Orchestrator | `mcp-server/src/server.ts` (imports tool modules) |
| HTTP transport | `mcp-server/src/http.ts` |
| API client | `mcp-server/src/api-client.ts` → `callTool(name, params)` |
| Gateway | `src/app/api/mcp/route.ts` |
| Handlers | `src/app/api/mcp/handlers/<category>.ts` + `handlers/index.ts` |
| Shared lib | `src/app/api/mcp/lib/` (schemas, resolve-entity, date-filter) |
| Contracts | `mcp-server/src/contracts/` |

Auth: gateway checks `x-mcp-api-secret` against `MCP_API_SECRET`.

## Layer 1: Tool definition (`mcp-server/src/tools/finance.ts` example)

```typescript
server.tool(
  "list_receipts",
  "List receipt vouchers. Optional dateFrom/dateTo ISO dates.",
  {
    limit: z.number().optional().default(20),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
  },
  async (args) => {
    try {
      const result = await callTool("list_receipts", args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      return toolError(err);
    }
  }
);
```

Place new tools in the **category file** that matches the domain (finance, inquiries, customers, etc.).

## Layer 2: API client

`callTool(tool, params)` is generic — no change needed per tool.

## Layer 3: Gateway handler

Add case to the appropriate `src/app/api/mcp/handlers/<category>.ts`:

```typescript
export async function handleListReceipts(params: unknown) {
  const parsed = listReceiptsSchema.parse(params);
  const rows = await prismadb.receiptDetail.findMany({
    where: buildDateFilter(parsed.dateFrom, parsed.dateTo),
    orderBy: { createdAt: "desc" },
    take: parsed.limit,
    select: { id: true, receiptNumber: true, amount: true, createdAt: true },
  });
  return { success: true, data: rows };
}
```

Register in `handlers/index.ts` dispatch map.

## Errors

Use shared `McpError` / `NotFoundError` from `src/app/api/mcp/lib/errors.ts` where available; gateway returns structured JSON errors.

## Verify

```bash
cd mcp-server && npm run build
```

Count tools: `grep -rn 'server.tool(' mcp-server/src/tools/`

## Do not

- Add all tools to a single monolithic `server.ts` body
- Skip Zod validation on gateway params
- Expose Prisma errors raw to MCP clients — wrap with clear messages
