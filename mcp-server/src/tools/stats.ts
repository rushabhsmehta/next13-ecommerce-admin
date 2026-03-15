import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { callTool, toolError } from "../helpers.js";

export function registerStatsTools(server: McpServer) {
  server.tool(
    "get_stats",
    "Get dashboard statistics: inquiry counts by status and total tour queries.",
    {},
    async () => {
      try {
        const data = await callTool("get_stats", {});
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("get_stats", err);
      }
    }
  );
}
