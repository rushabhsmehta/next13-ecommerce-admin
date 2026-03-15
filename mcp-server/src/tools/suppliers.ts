import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callTool, toolError } from "../helpers.js";

export function registerSupplierTools(server: McpServer) {
  server.tool(
    "list_suppliers",
    "Search suppliers by name or location.",
    {
      name: z.string().optional().describe("Search by supplier name (partial match)"),
      locationId: z.string().optional().describe("Filter by location ID"),
      limit: z.number().int().min(1).max(100).optional().default(25).describe("Max results"),
    },
    async (params) => {
      try {
        const data = await callTool("list_suppliers", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("list_suppliers", err);
      }
    }
  );

  server.tool(
    "get_supplier",
    "Get full supplier details including TDS info and contacts.",
    {
      supplierId: z.string().describe("The supplier ID"),
    },
    async ({ supplierId }) => {
      try {
        const data = await callTool("get_supplier", { supplierId });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("get_supplier", err);
      }
    }
  );

  server.tool(
    "create_supplier",
    "Create a new supplier record.",
    {
      name: z.string().describe("Supplier name"),
      contactNumber: z.string().optional().describe("Contact phone number"),
      email: z.string().optional().describe("Email address"),
      address: z.string().optional().describe("Address"),
      gstNumber: z.string().optional().describe("GST registration number"),
      panNumber: z.string().optional().describe("PAN number"),
      tdsApplicable: z.boolean().optional().default(false).describe("Whether TDS is applicable"),
      tdsPercentage: z.number().optional().describe("TDS percentage if applicable"),
    },
    async (params) => {
      try {
        const data = await callTool("create_supplier", params);
        return {
          content: [{ type: "text", text: `Supplier created\n\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (err) {
        return toolError("create_supplier", err);
      }
    }
  );

  server.tool(
    "get_supplier_outstanding",
    "Get a supplier's total outstanding payables -- total billed minus total paid, with per-purchase breakdown.",
    {
      supplierId: z.string().describe("The supplier ID"),
    },
    async ({ supplierId }) => {
      try {
        const data = await callTool("get_supplier_outstanding", { supplierId });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("get_supplier_outstanding", err);
      }
    }
  );

  server.tool(
    "list_supplier_purchases",
    "List all purchase bills from a specific supplier with allocation details.",
    {
      supplierId: z.string().describe("The supplier ID"),
      limit: z.number().int().min(1).max(100).optional().default(50).describe("Max results"),
    },
    async (params) => {
      try {
        const data = await callTool("list_supplier_purchases", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("list_supplier_purchases", err);
      }
    }
  );
}
