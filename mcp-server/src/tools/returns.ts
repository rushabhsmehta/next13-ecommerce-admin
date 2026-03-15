import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callTool, toolError } from "../helpers.js";

export function registerReturnsTools(server: McpServer) {
  server.tool(
    "create_sale_return",
    "Record a sale return (customer credit note) against an existing sale.",
    {
      saleDetailId: z.string().describe("The sale ID to return against"),
      returnDate: z.string().describe("Return date (YYYY-MM-DD)"),
      amount: z.number().positive().describe("Return amount"),
      gstAmount: z.number().min(0).optional().default(0).describe("GST amount on return"),
      reason: z.string().optional().describe("Reason for the return"),
    },
    async (params) => {
      try {
        const data = await callTool("create_sale_return", params);
        return {
          content: [{ type: "text", text: `Sale return recorded\n\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (err) {
        return toolError("create_sale_return", err);
      }
    }
  );

  server.tool(
    "list_sale_returns",
    "List sale returns, optionally filtered by sale.",
    {
      saleDetailId: z.string().optional().describe("Filter by sale ID"),
      startDate: z.string().optional().describe("Filter from this date (YYYY-MM-DD)"),
      endDate: z.string().optional().describe("Filter to this date (YYYY-MM-DD)"),
      limit: z.number().int().min(1).max(100).optional().default(25).describe("Max results"),
    },
    async (params) => {
      try {
        const data = await callTool("list_sale_returns", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("list_sale_returns", err);
      }
    }
  );

  server.tool(
    "create_purchase_return",
    "Record a purchase return (debit note to supplier) against an existing purchase.",
    {
      purchaseDetailId: z.string().describe("The purchase ID to return against"),
      returnDate: z.string().describe("Return date (YYYY-MM-DD)"),
      amount: z.number().positive().describe("Return amount"),
      gstAmount: z.number().min(0).optional().default(0).describe("GST amount on return"),
      reason: z.string().optional().describe("Reason for the return"),
    },
    async (params) => {
      try {
        const data = await callTool("create_purchase_return", params);
        return {
          content: [{ type: "text", text: `Purchase return recorded\n\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (err) {
        return toolError("create_purchase_return", err);
      }
    }
  );

  server.tool(
    "list_purchase_returns",
    "List purchase returns, optionally filtered by purchase.",
    {
      purchaseDetailId: z.string().optional().describe("Filter by purchase ID"),
      startDate: z.string().optional().describe("Filter from this date (YYYY-MM-DD)"),
      endDate: z.string().optional().describe("Filter to this date (YYYY-MM-DD)"),
      limit: z.number().int().min(1).max(100).optional().default(25).describe("Max results"),
    },
    async (params) => {
      try {
        const data = await callTool("list_purchase_returns", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("list_purchase_returns", err);
      }
    }
  );
}
