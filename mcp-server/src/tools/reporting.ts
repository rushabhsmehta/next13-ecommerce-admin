import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callTool, toolError } from "../helpers.js";

export function registerReportingTools(server: McpServer) {
  server.tool(
    "get_profit_loss",
    "Get profit & loss statement for a period: total revenue (sales + income) minus total costs (purchases + expenses).",
    {
      startDate: z.string().optional().describe("Start of period (YYYY-MM-DD, defaults to first of current month)"),
      endDate: z.string().optional().describe("End of period (YYYY-MM-DD, defaults to today)"),
    },
    async (params) => {
      try {
        const data = await callTool("get_profit_loss", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("get_profit_loss", err);
      }
    }
  );

  server.tool(
    "get_customer_statement",
    "Get a complete customer account statement: all invoices, receipts, and running balance for a period.",
    {
      customerId: z.string().describe("The customer ID"),
      startDate: z.string().optional().describe("Start of period (YYYY-MM-DD)"),
      endDate: z.string().optional().describe("End of period (YYYY-MM-DD)"),
    },
    async (params) => {
      try {
        const data = await callTool("get_customer_statement", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("get_customer_statement", err);
      }
    }
  );

  server.tool(
    "get_supplier_statement",
    "Get a complete supplier account statement: all bills, payments, and running balance for a period.",
    {
      supplierId: z.string().describe("The supplier ID"),
      startDate: z.string().optional().describe("Start of period (YYYY-MM-DD)"),
      endDate: z.string().optional().describe("End of period (YYYY-MM-DD)"),
    },
    async (params) => {
      try {
        const data = await callTool("get_supplier_statement", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("get_supplier_statement", err);
      }
    }
  );

  server.tool(
    "get_cash_book",
    "Get cash book entries (all transactions through cash accounts) for a period.",
    {
      startDate: z.string().optional().describe("Start of period (YYYY-MM-DD)"),
      endDate: z.string().optional().describe("End of period (YYYY-MM-DD)"),
      cashAccountId: z.string().optional().describe("Filter by specific cash account ID"),
    },
    async (params) => {
      try {
        const data = await callTool("get_cash_book", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("get_cash_book", err);
      }
    }
  );

  server.tool(
    "get_bank_book",
    "Get bank book entries (all transactions through bank accounts) for a period.",
    {
      startDate: z.string().optional().describe("Start of period (YYYY-MM-DD)"),
      endDate: z.string().optional().describe("End of period (YYYY-MM-DD)"),
      bankAccountId: z.string().optional().describe("Filter by specific bank account ID"),
    },
    async (params) => {
      try {
        const data = await callTool("get_bank_book", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("get_bank_book", err);
      }
    }
  );

  server.tool(
    "get_tds_summary",
    "Get TDS summary: total deducted, deposited, and pending by section for a financial year/quarter.",
    {
      financialYear: z.string().optional().describe("Financial year (e.g. '2025-26'). Defaults to current FY."),
      quarter: z.number().int().min(1).max(4).optional().describe("Quarter number (1-4)"),
    },
    async (params) => {
      try {
        const data = await callTool("get_tds_summary", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("get_tds_summary", err);
      }
    }
  );

  server.tool(
    "get_gst_summary",
    "Get GST summary: total CGST/SGST/IGST collected on sales and paid on purchases for a period.",
    {
      startDate: z.string().optional().describe("Start of period (YYYY-MM-DD)"),
      endDate: z.string().optional().describe("End of period (YYYY-MM-DD)"),
    },
    async (params) => {
      try {
        const data = await callTool("get_gst_summary", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("get_gst_summary", err);
      }
    }
  );

  server.tool(
    "get_expense_breakdown",
    "Get expenses grouped by category for a period -- useful for cost analysis.",
    {
      startDate: z.string().optional().describe("Start of period (YYYY-MM-DD)"),
      endDate: z.string().optional().describe("End of period (YYYY-MM-DD)"),
    },
    async (params) => {
      try {
        const data = await callTool("get_expense_breakdown", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("get_expense_breakdown", err);
      }
    }
  );

  server.tool(
    "get_revenue_by_location",
    "Get revenue grouped by travel destination for a period.",
    {
      startDate: z.string().optional().describe("Start of period (YYYY-MM-DD)"),
      endDate: z.string().optional().describe("End of period (YYYY-MM-DD)"),
    },
    async (params) => {
      try {
        const data = await callTool("get_revenue_by_location", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("get_revenue_by_location", err);
      }
    }
  );

  server.tool(
    "get_daily_collection_report",
    "Get day-by-day receipts and payments for a period -- useful for cash flow tracking.",
    {
      startDate: z.string().optional().describe("Start of period (YYYY-MM-DD)"),
      endDate: z.string().optional().describe("End of period (YYYY-MM-DD)"),
    },
    async (params) => {
      try {
        const data = await callTool("get_daily_collection_report", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("get_daily_collection_report", err);
      }
    }
  );
}
