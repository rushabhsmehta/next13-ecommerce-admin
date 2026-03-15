import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callTool, toolError } from "../helpers.js";

export function registerAiTools(server: McpServer) {
  server.tool(
    "generate_itinerary",
    `Use AI (Gemini) to generate a detailed day-by-day travel itinerary.
    Returns a structured itinerary JSON that can be used to create a tour query.
    Great for quickly drafting a proposal for a customer.`,
    {
      destination: z.string().describe("Travel destination (e.g. 'Goa', 'Kerala Backwaters')"),
      nights: z.number().int().min(1).max(30).describe("Number of nights"),
      days: z.number().int().min(1).max(31).describe("Number of days"),
      groupType: z
        .enum(["family", "couple", "friends", "solo", "corporate", "seniors"])
        .describe("Type of travel group"),
      budgetCategory: z
        .enum(["budget", "mid-range", "premium", "luxury"])
        .describe("Budget category"),
      specialRequirements: z
        .string()
        .optional()
        .describe("Any special requirements (e.g. 'vegetarian food', 'beach resort', 'adventure activities')"),
      customerName: z.string().optional().describe("Customer name to personalize the proposal"),
      startDate: z.string().optional().describe("Trip start date (ISO: YYYY-MM-DD)"),
      numAdults: z.number().int().optional().describe("Number of adults"),
      numChildren: z.number().int().optional().describe("Number of children"),
    },
    async (params) => {
      try {
        const data = await callTool("generate_itinerary", params);
        return {
          content: [{
            type: "text",
            text: `AI-Generated Itinerary for ${params.destination}\n\n${JSON.stringify(data, null, 2)}`,
          }],
        };
      } catch (err) {
        return toolError("generate_itinerary", err);
      }
    }
  );
}
