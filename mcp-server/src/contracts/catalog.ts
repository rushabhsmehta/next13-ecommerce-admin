import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { registerAiTools } from "../tools/ai.js";
import { registerConfigTools } from "../tools/config.js";
import { registerCustomerTools } from "../tools/customers.js";
import { registerExpenseIncomeTools } from "../tools/expenses-income.js";
import { registerFinanceTools } from "../tools/finance.js";
import { registerFlightTools } from "../tools/flights.js";
import { registerInquiryTools } from "../tools/inquiries.js";
import { registerLocationTools } from "../tools/locations.js";
import { registerPurchaseTools } from "../tools/purchases.js";
import { registerReportingTools } from "../tools/reporting.js";
import { registerReturnsTools } from "../tools/returns.js";
import { registerSalesTools } from "../tools/sales.js";
import { registerStaffTools } from "../tools/staff.js";
import { registerStatsTools } from "../tools/stats.js";
import { registerSupplierTools } from "../tools/suppliers.js";
import { registerTourQueryTools } from "../tools/tour-queries.js";
import { registerWhatsappTools } from "../tools/whatsapp.js";
import { defineToolContract, type ToolContract } from "./core.js";
import { inferToolMetadata } from "./metadata.js";

type ToolCatalog = Record<string, ToolContract>;

type RegisterToolsFn = (server: McpServer) => void;

const REGISTER_TOOL_GROUPS: RegisterToolsFn[] = [
  registerLocationTools,
  registerInquiryTools,
  registerTourQueryTools,
  registerCustomerTools,
  registerSupplierTools,
  registerSalesTools,
  registerPurchaseTools,
  registerFinanceTools,
  registerExpenseIncomeTools,
  registerReturnsTools,
  registerReportingTools,
  registerConfigTools,
  registerStaffTools,
  registerFlightTools,
  registerWhatsappTools,
  registerAiTools,
  registerStatsTools,
];

function createCatalogServer(registrations: Map<string, ToolContract>): McpServer {
  return {
    tool(name: string, description: string, inputSchema: ZodRawShape) {
      if (registrations.has(name)) {
        throw new Error(`Duplicate MCP tool registration found while building contract catalog: ${name}`);
      }

      registrations.set(
        name,
        defineToolContract({
          name,
          description,
          inputSchema,
          ...inferToolMetadata(name),
        })
      );
    },
  } as unknown as McpServer;
}

function buildGeneratedToolContracts(): ToolCatalog {
  const registrations = new Map<string, ToolContract>();
  const server = createCatalogServer(registrations);

  for (const registerTools of REGISTER_TOOL_GROUPS) {
    registerTools(server);
  }

  return Object.fromEntries(registrations) as ToolCatalog;
}

export const GENERATED_TOOL_CONTRACTS = buildGeneratedToolContracts();

export function getGeneratedToolContract(toolName: string): ToolContract | null {
  return GENERATED_TOOL_CONTRACTS[toolName] ?? null;
}
