# MCP Server Patterns Reference

## Layer 1: Server Tool Definition (mcp-server/src/server.ts)

### Tool Registration Pattern
```typescript
server.tool(
  "tool_name",
  "Description for AI agent. Include usage hints like 'Use search_locations first to get the locationId'.",
  {
    param1: z.string().describe("What this param is"),
    param2: z.number().optional().describe("Optional filtering param"),
    limit: z.number().optional().default(20).describe("Max results"),
  },
  async ({ param1, param2, limit }) => {
    try {
      const result = await callTool("tool_name", { param1, param2, limit });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      return toolError(err);
    }
  }
);
```

### Error Helper
```typescript
function toolError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return {
    content: [{ type: "text", text: `Error: ${message}` }],
    isError: true,
  };
}
```

## Layer 2: API Client (mcp-server/src/api-client.ts)

No changes needed — `callTool(tool, params)` is generic and works for any tool name.

## Layer 3: Gateway Handler (src/app/api/mcp/route.ts)

### Dispatch Pattern
```typescript
if (tool === "tool_name") {
  const schema = z.object({
    param1: z.string(),
    param2: z.number().optional(),
    limit: z.number().optional().default(20),
  });
  const parsed = schema.parse(params);

  const result = await prismadb.model.findMany({
    where: {
      ...(parsed.param1 && { field: { contains: parsed.param1 } }),
    },
    include: {
      relation1: true,
      relation2: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: parsed.limit,
  });

  return NextResponse.json({ success: true, data: result });
}
```

### Error Classes
```typescript
class McpError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
  }
}

class NotFoundError extends McpError {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`, "NOT_FOUND");
  }
}
```

### Date Handling
Always convert date inputs with `dateToUtc()`:
```typescript
import { dateToUtc } from "@/lib/timezone-utils";
const startDate = parsed.startDate ? dateToUtc(parsed.startDate) : undefined;
```

## Naming Conventions

- Tool names: `snake_case` (e.g., `list_customers`, `get_sale_details`)
- Descriptions: Start with verb, include usage context for AI agents
- Group related tools together in server.ts
- Add new tools AFTER existing tools in the same category
