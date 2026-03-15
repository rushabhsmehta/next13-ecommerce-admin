import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { callTool, toolError } from "../helpers.js";

export function registerStaffTools(server: McpServer) {
  server.tool(
    "list_operational_staff",
    "List operational staff members.",
    {},
    async () => {
      try {
        const data = await callTool("list_operational_staff", {});
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("list_operational_staff", err);
      }
    }
  );

  server.tool(
    "list_associate_partners",
    "List associate/referral partners.",
    {},
    async () => {
      try {
        const data = await callTool("list_associate_partners", {});
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("list_associate_partners", err);
      }
    }
  );
}
