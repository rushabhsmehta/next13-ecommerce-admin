import { callTool } from "./api-client.js";

export { callTool };

export function toolError(toolName: string, err: unknown): {
  isError: true;
  content: Array<{ type: "text"; text: string }>;
} {
  const message = err instanceof Error ? err.message : String(err);
  const code = (err as any)?.code ?? "INTERNAL_ERROR";
  const details = (err as any)?.details;
  console.error(`[MCP server] Tool "${toolName}" failed: [${code}] ${message}`);
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: JSON.stringify(
          { error: true, tool: toolName, code, message, ...(details ? { details } : {}) },
          null,
          2
        ),
      },
    ],
  };
}
