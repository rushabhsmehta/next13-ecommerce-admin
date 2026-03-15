import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callTool, toolError } from "../helpers.js";

export function registerPurchaseTools(server: McpServer) {
  server.tool(
    "list_purchases",
    "List purchase bills with filters for supplier, tour query, date range, and status.",
    {
      supplierId: z.string().optional().describe("Filter by supplier ID"),
      tourPackageQueryId: z.string().optional().describe("Filter by tour query ID"),
      startDate: z.string().optional().describe("Filter from this date (YYYY-MM-DD)"),
      endDate: z.string().optional().describe("Filter to this date (YYYY-MM-DD)"),
      status: z.string().optional().describe("Filter by status (e.g. PAID, PARTIAL, UNPAID)"),
      limit: z.number().int().min(1).max(100).optional().default(25).describe("Max results"),
    },
    async (params) => {
      try {
        const data = await callTool("list_purchases", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("list_purchases", err);
      }
    }
  );

  server.tool(
    "get_purchase",
    "Get a specific purchase's details including line items, payment allocations, and outstanding balance.",
    {
      purchaseId: z.string().describe("The purchase ID"),
    },
    async ({ purchaseId }) => {
      try {
        const data = await callTool("get_purchase", { purchaseId });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("get_purchase", err);
      }
    }
  );

  server.tool(
    "create_purchase",
    "Record a supplier bill (purchase). The tour query must be confirmed first.",
    {
      tourPackageQueryId: z.string().describe("The confirmed tour query ID"),
      supplierId: z.string().describe("The supplier ID"),
      purchaseDate: z.string().describe("Bill date (YYYY-MM-DD)"),
      price: z.number().positive().describe("Purchase amount (excluding GST)"),
      gstAmount: z.number().min(0).optional().default(0).describe("GST amount"),
      description: z.string().optional().describe("Bill description"),
      billNumber: z.string().optional().describe("Supplier bill/invoice number"),
    },
    async (params) => {
      try {
        const data = await callTool("create_purchase", params);
        return {
          content: [{ type: "text", text: `Purchase created\n\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (err) {
        return toolError("create_purchase", err);
      }
    }
  );

  server.tool(
    "get_purchase_balance",
    "Get the outstanding balance for a specific purchase bill.",
    {
      purchaseId: z.string().describe("The purchase ID"),
    },
    async ({ purchaseId }) => {
      try {
        const data = await callTool("get_purchase_balance", { purchaseId });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("get_purchase_balance", err);
      }
    }
  );
}
