import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { callTool, toolError } from "../helpers.js";

export function registerConfigTools(server: McpServer) {
  server.tool(
    "list_room_types",
    "List available room types (e.g. Deluxe, Suite). Useful when building itineraries.",
    {},
    async () => {
      try {
        const data = await callTool("list_room_types", {});
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("list_room_types", err);
      }
    }
  );

  server.tool(
    "list_meal_plans",
    "List available meal plans (e.g. CP, MAP, AP). Useful when building itineraries.",
    {},
    async () => {
      try {
        const data = await callTool("list_meal_plans", {});
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("list_meal_plans", err);
      }
    }
  );

  server.tool(
    "list_vehicle_types",
    "List available vehicle types for transport.",
    {},
    async () => {
      try {
        const data = await callTool("list_vehicle_types", {});
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("list_vehicle_types", err);
      }
    }
  );

  server.tool(
    "list_occupancy_types",
    "List occupancy types (Single, Double, Triple, etc.).",
    {},
    async () => {
      try {
        const data = await callTool("list_occupancy_types", {});
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("list_occupancy_types", err);
      }
    }
  );
}
