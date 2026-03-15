import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callTool, toolError } from "../helpers.js";

export function registerSalesTools(server: McpServer) {
  server.tool(
    "list_sales",
    "List sales invoices with filters for customer, tour query, date range, and status.",
    {
      customerId: z.string().optional().describe("Filter by customer ID"),
      tourPackageQueryId: z.string().optional().describe("Filter by tour query ID"),
      startDate: z.string().optional().describe("Filter from this date (YYYY-MM-DD)"),
      endDate: z.string().optional().describe("Filter to this date (YYYY-MM-DD)"),
      status: z.string().optional().describe("Filter by status (e.g. PAID, PARTIAL, UNPAID)"),
      limit: z.number().int().min(1).max(100).optional().default(25).describe("Max results"),
    },
    async (params) => {
      try {
        const data = await callTool("list_sales", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("list_sales", err);
      }
    }
  );

  server.tool(
    "get_sale",
    "Get a specific sale's details including line items, receipt allocations, and outstanding balance.",
    {
      saleId: z.string().describe("The sale ID"),
    },
    async ({ saleId }) => {
      try {
        const data = await callTool("get_sale", { saleId });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("get_sale", err);
      }
    }
  );

  server.tool(
    "create_sale",
    "Create a customer invoice (sale). The tour query must be confirmed first.",
    {
      tourPackageQueryId: z.string().describe("The confirmed tour query ID"),
      customerId: z.string().describe("The customer ID"),
      saleDate: z.string().describe("Invoice date (YYYY-MM-DD)"),
      salePrice: z.number().positive().describe("Sale amount (excluding GST)"),
      gstAmount: z.number().min(0).optional().default(0).describe("GST amount"),
      description: z.string().optional().describe("Invoice description"),
      invoiceNumber: z.string().optional().describe("Invoice number (auto-generated if not provided)"),
    },
    async (params) => {
      try {
        const data = await callTool("create_sale", params);
        return {
          content: [{ type: "text", text: `Sale created\n\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (err) {
        return toolError("create_sale", err);
      }
    }
  );

  server.tool(
    "get_sale_balance",
    "Get the outstanding balance for a specific sale invoice.",
    {
      saleId: z.string().describe("The sale ID"),
    },
    async ({ saleId }) => {
      try {
        const data = await callTool("get_sale_balance", { saleId });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("get_sale_balance", err);
      }
    }
  );
}
