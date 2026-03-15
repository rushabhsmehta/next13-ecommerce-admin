import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerLocationTools } from "./tools/locations.js";
import { registerInquiryTools } from "./tools/inquiries.js";
import { registerTourQueryTools } from "./tools/tour-queries.js";
import { registerCustomerTools } from "./tools/customers.js";
import { registerSupplierTools } from "./tools/suppliers.js";
import { registerSalesTools } from "./tools/sales.js";
import { registerPurchaseTools } from "./tools/purchases.js";
import { registerFinanceTools } from "./tools/finance.js";
import { registerExpenseIncomeTools } from "./tools/expenses-income.js";
import { registerReturnsTools } from "./tools/returns.js";
import { registerReportingTools } from "./tools/reporting.js";
import { registerConfigTools } from "./tools/config.js";
import { registerStaffTools } from "./tools/staff.js";
import { registerFlightTools } from "./tools/flights.js";
import { registerWhatsappTools } from "./tools/whatsapp.js";
import { registerAiTools } from "./tools/ai.js";
import { registerStatsTools } from "./tools/stats.js";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "travel-admin",
    version: "1.0.0",
  });

  registerLocationTools(server);
  registerInquiryTools(server);
  registerTourQueryTools(server);
  registerCustomerTools(server);
  registerSupplierTools(server);
  registerSalesTools(server);
  registerPurchaseTools(server);
  registerFinanceTools(server);
  registerExpenseIncomeTools(server);
  registerReturnsTools(server);
  registerReportingTools(server);
  registerConfigTools(server);
  registerStaffTools(server);
  registerFlightTools(server);
  registerWhatsappTools(server);
  registerAiTools(server);
  registerStatsTools(server);

  return server;
}
