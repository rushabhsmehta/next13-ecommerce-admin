import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { callTool, toolError } from "../helpers.js";
import { SHARED_TOOL_CONTRACT_OVERRIDES } from "../contracts/overrides.js";

const listCustomersContract = SHARED_TOOL_CONTRACT_OVERRIDES.list_customers;
const createCustomerContract = SHARED_TOOL_CONTRACT_OVERRIDES.create_customer;

export function registerCustomerTools(server: McpServer) {
  server.tool(
    listCustomersContract.name,
    listCustomersContract.description,
    listCustomersContract.inputSchema,
    async (params) => {
      try {
        const data = await callTool(listCustomersContract.name, params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError(listCustomersContract.name, err);
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
    createCustomerContract.name,
    createCustomerContract.description,
    createCustomerContract.inputSchema,
    async (params) => {
      try {
        const data = await callTool(createCustomerContract.name, params);
        return {
          content: [{ type: "text", text: `Customer created\n\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (err) {
        return toolError(createCustomerContract.name, err);
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