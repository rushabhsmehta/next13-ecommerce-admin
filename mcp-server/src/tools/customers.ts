import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callTool, toolError } from "../helpers.js";

export function registerCustomerTools(server: McpServer) {
  server.tool(
    "list_customers",
    "Search customers by name or contact number.",
    {
      name: z.string().optional().describe("Search by customer name (partial match)"),
      contactNumber: z.string().optional().describe("Search by contact number"),
      limit: z.number().int().min(1).max(100).optional().default(25).describe("Max results"),
    },
    async (params) => {
      try {
        const data = await callTool("list_customers", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("list_customers", err);
      }
    }
  );

  server.tool(
    "get_customer",
    "Get full customer details including sale and receipt counts.",
    {
      customerId: z.string().describe("The customer ID"),
    },
    async ({ customerId }) => {
      try {
        const data = await callTool("get_customer", { customerId });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("get_customer", err);
      }
    }
  );

  server.tool(
    "create_customer",
    "Create a new customer record.",
    {
      name: z.string().describe("Customer full name"),
      contactNumber: z.string().optional().describe("Contact phone number"),
      email: z.string().optional().describe("Email address"),
      address: z.string().optional().describe("Postal address"),
      gstNumber: z.string().optional().describe("GST registration number"),
    },
    async (params) => {
      try {
        const data = await callTool("create_customer", params);
        return {
          content: [{ type: "text", text: `Customer created\n\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (err) {
        return toolError("create_customer", err);
      }
    }
  );

  server.tool(
    "get_customer_outstanding",
    "Get a customer's total outstanding receivables -- total invoiced minus total received, with per-sale breakdown.",
    {
      customerId: z.string().describe("The customer ID"),
    },
    async ({ customerId }) => {
      try {
        const data = await callTool("get_customer_outstanding", { customerId });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("get_customer_outstanding", err);
      }
    }
  );

  server.tool(
    "list_customer_sales",
    "List all sales invoices for a specific customer with allocation details.",
    {
      customerId: z.string().describe("The customer ID"),
      limit: z.number().int().min(1).max(100).optional().default(50).describe("Max results"),
    },
    async (params) => {
      try {
        const data = await callTool("list_customer_sales", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("list_customer_sales", err);
      }
    }
  );
}
