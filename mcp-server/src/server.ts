import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callTool } from "./api-client.js";

/**
 * Formats a callTool() error into an MCP isError content block.
 * Using isError:true tells the MCP SDK the tool call failed, so the AI agent
 * sees structured error JSON in context and can reason about/explain it.
 */
function toolError(toolName: string, err: unknown): {
  isError: true;
  content: Array<{ type: "text"; text: string }>;
} {
  const message = err instanceof Error ? err.message : String(err);
  const code = (err as any)?.code ?? "INTERNAL_ERROR";
  const details = (err as any)?.details;
  console.error(`[MCP server] Tool "${toolName}" failed: [${code}] ${message}`);
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: JSON.stringify(
          { error: true, tool: toolName, code, message, ...(details ? { details } : {}) },
          null,
          2
        ),
      },
    ],
  };
}

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "travel-admin",
    version: "1.0.0",
  });

  // ── Locations ───────────────────────────────────────────────────────────────

  server.tool(
    "search_locations",
    "Search travel destinations/locations by name. Use this first to find location IDs before creating inquiries or queries.",
    {
      query: z.string().describe("Destination name to search (e.g. 'Goa', 'Kerala', 'Maldives')"),
      limit: z.number().int().min(1).max(50).optional().default(10).describe("Max results to return"),
    },
    async ({ query, limit }) => {
      try {
        const data = await callTool("search_locations", { query, limit });
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      } catch (err) {
        return toolError("search_locations", err);
      }
    }
  );

  // ── Tour Packages ───────────────────────────────────────────────────────────

  server.tool(
    "list_tour_packages",
    "Browse available tour packages. Filter by destination or category.",
    {
      locationId: z.string().optional().describe("Filter by location ID (from search_locations)"),
      tourCategory: z.enum(["Domestic", "International"]).optional().describe("Filter by tour category"),
      limit: z.number().int().min(1).max(50).optional().default(20).describe("Max results"),
    },
    async ({ locationId, tourCategory, limit }) => {
      try {
        const data = await callTool("list_tour_packages", { locationId, tourCategory, limit });
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      } catch (err) {
        return toolError("list_tour_packages", err);
      }
    }
  );

  // ── Hotels ──────────────────────────────────────────────────────────────────

  server.tool(
    "list_hotels",
    "Browse hotels available in the system, optionally filtered by location or name.",
    {
      locationId: z.string().optional().describe("Filter by location ID"),
      name: z.string().optional().describe("Search by hotel name"),
      limit: z.number().int().min(1).max(50).optional().default(20).describe("Max results"),
    },
    async ({ locationId, name, limit }) => {
      try {
        const data = await callTool("list_hotels", { locationId, name, limit });
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      } catch (err) {
        return toolError("list_hotels", err);
      }
    }
  );

  // ── Inquiries ───────────────────────────────────────────────────────────────

  server.tool(
    "create_inquiry",
    `Create a new customer travel inquiry.
    You can provide locationName (e.g. 'Goa') instead of locationId and it will be resolved automatically.
    journeyDate must be an ISO date string like '2026-04-15'.
    Example: "Create inquiry for Rahul Sharma, 9876543210, wants to go to Goa on April 15 with 2 adults"`,
    {
      customerName: z.string().describe("Full name of the customer"),
      customerMobileNumber: z.string().describe("Customer mobile number (10 digits)"),
      locationId: z.string().optional().describe("Location/destination ID (from search_locations)"),
      locationName: z.string().optional().describe("Location name if ID is unknown (e.g. 'Goa')"),
      numAdults: z.number().int().min(1).describe("Number of adults"),
      numChildrenAbove11: z.number().int().min(0).optional().default(0).describe("Children above 11 years"),
      numChildren5to11: z.number().int().min(0).optional().default(0).describe("Children 5-11 years"),
      numChildrenBelow5: z.number().int().min(0).optional().default(0).describe("Children below 5 years"),
      journeyDate: z.string().describe("Planned travel date (ISO format: YYYY-MM-DD)"),
      remarks: z.string().optional().describe("Additional notes or requirements"),
      status: z.string().optional().default("PENDING").describe("Inquiry status (default: PENDING)"),
    },
    async (params) => {
      try {
        const data = await callTool("create_inquiry", params);
        return {
          content: [
            {
              type: "text",
              text: `✅ Inquiry created successfully!\n\n${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      } catch (err) {
        return toolError("create_inquiry", err);
      }
    }
  );

  server.tool(
    "list_inquiries",
    "List customer inquiries with optional filters. Shows recent inquiries by default.",
    {
      status: z.string().optional().describe("Filter by status: PENDING, CONFIRMED, CANCELLED, HOT_QUERY, QUERY_SENT, ALL"),
      customerName: z.string().optional().describe("Search by customer name"),
      limit: z.number().int().min(1).max(100).optional().default(25).describe("Max results"),
    },
    async ({ status, customerName, limit }) => {
      try {
        const data = await callTool("list_inquiries", { status, customerName, limit });
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      } catch (err) {
        return toolError("list_inquiries", err);
      }
    }
  );

  server.tool(
    "get_inquiry",
    "Get full details of a specific inquiry including actions/notes and linked tour queries.",
    {
      inquiryId: z.string().describe("The inquiry ID to retrieve"),
    },
    async ({ inquiryId }) => {
      try {
        const data = await callTool("get_inquiry", { inquiryId });
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      } catch (err) {
        return toolError("get_inquiry", err);
      }
    }
  );

  server.tool(
    "update_inquiry_status",
    "Update the status of an inquiry. Valid statuses: PENDING, CONFIRMED, CANCELLED, HOT_QUERY, QUERY_SENT.",
    {
      inquiryId: z.string().describe("The inquiry ID to update"),
      status: z
        .enum(["PENDING", "CONFIRMED", "CANCELLED", "HOT_QUERY", "QUERY_SENT"])
        .describe("New status for the inquiry"),
      remarks: z.string().optional().describe("Optional remarks/reason for the status change"),
    },
    async ({ inquiryId, status, remarks }) => {
      try {
        const data = await callTool("update_inquiry_status", { inquiryId, status, remarks });
        return {
          content: [
            {
              type: "text",
              text: `✅ Status updated to ${status}\n\n${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      } catch (err) {
        return toolError("update_inquiry_status", err);
      }
    }
  );

  server.tool(
    "add_inquiry_note",
    "Add a follow-up note or action log to an inquiry.",
    {
      inquiryId: z.string().describe("The inquiry ID"),
      note: z.string().describe("The note content to add"),
      actionType: z
        .string()
        .optional()
        .default("NOTE")
        .describe("Type of action: NOTE, CALL, EMAIL, WHATSAPP, MEETING"),
    },
    async ({ inquiryId, note, actionType }) => {
      try {
        const data = await callTool("add_inquiry_note", { inquiryId, note, actionType });
        return {
          content: [
            {
              type: "text",
              text: `✅ Note added to inquiry\n\n${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      } catch (err) {
        return toolError("add_inquiry_note", err);
      }
    }
  );

  // ── Tour Queries (Quotes) ───────────────────────────────────────────────────

  server.tool(
    "create_tour_query",
    `Create a new tour package query (quote) for a customer.
    A tour query is a detailed quote/itinerary proposal for a customer.
    You can link it to an existing inquiry via inquiryId.
    Use locationName if you don't have the locationId.`,
    {
      customerName: z.string().describe("Customer name"),
      customerNumber: z.string().optional().describe("Customer phone number"),
      locationId: z.string().optional().describe("Location ID (from search_locations)"),
      locationName: z.string().optional().describe("Location name if ID unknown (e.g. 'Goa')"),
      numDaysNight: z.string().optional().describe("Duration e.g. '4 Nights / 5 Days'"),
      tourCategory: z.enum(["Domestic", "International"]).optional().default("Domestic"),
      tourPackageQueryType: z.string().optional().describe("Tour type e.g. 'Honeymoon', 'Family', 'Adventure'"),
      numAdults: z.string().optional().describe("Number of adults as string"),
      numChild5to12: z.string().optional().describe("Children 5-12 years"),
      numChild0to5: z.string().optional().describe("Children 0-5 years"),
      tourStartsFrom: z.string().optional().describe("Tour start date (ISO: YYYY-MM-DD)"),
      tourEndsOn: z.string().optional().describe("Tour end date (ISO: YYYY-MM-DD)"),
      transport: z.string().optional().describe("Transport type e.g. 'Private Cab', 'Flight + Cab'"),
      pickup_location: z.string().optional().describe("Pickup location"),
      drop_location: z.string().optional().describe("Drop location"),
      remarks: z.string().optional().describe("Additional notes"),
      inquiryId: z.string().optional().describe("Link to existing inquiry ID"),
      price: z.string().optional().describe("Base price"),
      totalPrice: z.string().optional().describe("Total price"),
    },
    async (params) => {
      try {
        const data = await callTool("create_tour_query", params);
        return {
          content: [
            {
              type: "text",
              text: `✅ Tour query created!\n\n${JSON.stringify(data, null, 2)}\n\nOpen it in the admin at /tourPackageQuery/${(data as any).id}`,
            },
          ],
        };
      } catch (err) {
        return toolError("create_tour_query", err);
      }
    }
  );

  server.tool(
    "list_tour_queries",
    "List existing tour package queries (quotes). Filter by customer name or location.",
    {
      locationId: z.string().optional().describe("Filter by location ID"),
      customerName: z.string().optional().describe("Search by customer name"),
      limit: z.number().int().min(1).max(100).optional().default(20).describe("Max results"),
    },
    async ({ locationId, customerName, limit }) => {
      try {
        const data = await callTool("list_tour_queries", { locationId, customerName, limit });
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      } catch (err) {
        return toolError("list_tour_queries", err);
      }
    }
  );

  // ── AI Itinerary Generation ─────────────────────────────────────────────────

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
          content: [
            {
              type: "text",
              text: `🗺️ AI-Generated Itinerary for ${params.destination}\n\n${JSON.stringify(data, null, 2)}`,
            },
          ],
        };
      } catch (err) {
        return toolError("generate_itinerary", err);
      }
    }
  );

  // ── Dashboard Stats ─────────────────────────────────────────────────────────

  server.tool(
    "get_stats",
    "Get dashboard statistics: inquiry counts by status and total tour queries.",
    {},
    async () => {
      try {
        const data = await callTool("get_stats", {});
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      } catch (err) {
        return toolError("get_stats", err);
      }
    }
  );

  // ── Accounts ────────────────────────────────────────────────────────────────

  server.tool(
    "list_accounts",
    "List all bank and cash accounts with their current balances. Use this first to find account IDs or names before recording transactions.",
    {
      includeInactive: z.boolean().optional().default(false).describe("Include inactive accounts (default: false)"),
    },
    async ({ includeInactive }) => {
      try {
        const data = await callTool("list_accounts", { includeInactive });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("list_accounts", err);
      }
    }
  );

  server.tool(
    "get_account_transactions",
    "Get transaction history for a specific bank or cash account. Returns receipts, payments, incomes, expenses, and transfers. Use list_accounts first to get account IDs.",
    {
      accountId: z.string().describe("The account ID (from list_accounts)"),
      accountType: z.enum(["bank", "cash"]).describe("Whether this is a bank or cash account"),
      startDate: z.string().optional().describe("Filter from this date (YYYY-MM-DD)"),
      endDate: z.string().optional().describe("Filter to this date (YYYY-MM-DD)"),
      limit: z.number().int().min(1).max(500).optional().default(100).describe("Max transactions per type"),
    },
    async (params) => {
      try {
        const data = await callTool("get_account_transactions", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("get_account_transactions", err);
      }
    }
  );

  server.tool(
    "get_financial_summary",
    "Get a financial overview: total inflows (receipts + income), outflows (payments + expenses), net cash flow, and current balances across all accounts. Defaults to current month-to-date.",
    {
      startDate: z.string().optional().describe("Start of period (YYYY-MM-DD, defaults to first of current month)"),
      endDate: z.string().optional().describe("End of period (YYYY-MM-DD, defaults to today)"),
    },
    async ({ startDate, endDate }) => {
      try {
        const data = await callTool("get_financial_summary", { startDate, endDate });
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("get_financial_summary", err);
      }
    }
  );

  server.tool(
    "create_payment",
    `Record an outgoing payment from a bank or cash account. Automatically updates the account balance.
    IMPORTANT: tourPackageQueryId is REQUIRED and the tour query must be confirmed before you can record a payment.
    Use list_tour_queries to find the confirmed tour query ID first.
    You can specify the account by ID (bankAccountId/cashAccountId) or by name (bankAccountName/cashAccountName).
    Example: "Pay 5000 to supplier from HDFC account on 2026-03-10 for tour query TPQ-20260301-XYZ"`,
    {
      paymentDate: z.string().describe("Payment date (YYYY-MM-DD)"),
      amount: z.number().positive().describe("Payment amount"),
      tourPackageQueryId: z.string().describe("REQUIRED: The confirmed tour package query ID this payment is for (use list_tour_queries to find it)"),
      bankAccountId: z.string().optional().describe("Bank account ID (from list_accounts)"),
      bankAccountName: z.string().optional().describe("Bank account name if ID unknown (e.g. 'HDFC Current')"),
      cashAccountId: z.string().optional().describe("Cash account ID (from list_accounts)"),
      cashAccountName: z.string().optional().describe("Cash account name if ID unknown (e.g. 'Main Cash')"),
      method: z.string().optional().describe("Payment method (e.g. 'NEFT', 'Cheque', 'UPI')"),
      transactionId: z.string().optional().describe("Bank transaction reference number"),
      remarks: z.string().optional().describe("Notes about this payment"),
      supplierId: z.string().optional().describe("Supplier ID this payment is for"),
      customerId: z.string().optional().describe("Customer ID (for customer refunds)"),
      paymentType: z.enum(["supplier_payment", "customer_refund"]).optional().default("supplier_payment").describe("Type of payment"),
    },
    async (params) => {
      try {
        const data = await callTool("create_payment", params);
        return {
          content: [{
            type: "text",
            text: `✅ Payment of ${(params as any).amount} recorded successfully!\n\n${JSON.stringify(data, null, 2)}`,
          }],
        };
      } catch (err) {
        return toolError("create_payment", err);
      }
    }
  );

  server.tool(
    "create_receipt",
    `Record an incoming receipt/payment received into a bank or cash account. Automatically updates the account balance.
    IMPORTANT: tourPackageQueryId is REQUIRED and the tour query must be confirmed before you can record a receipt.
    Use list_tour_queries to find the confirmed tour query ID first.
    You can specify the account by ID or by name.
    Example: "Record receipt of 15000 from customer into SBI account on 2026-03-09 for tour query TPQ-20260301-XYZ"`,
    {
      receiptDate: z.string().describe("Receipt date (YYYY-MM-DD)"),
      amount: z.number().positive().describe("Receipt amount"),
      tourPackageQueryId: z.string().describe("REQUIRED: The confirmed tour package query ID this receipt is for (use list_tour_queries to find it)"),
      bankAccountId: z.string().optional().describe("Bank account ID (from list_accounts)"),
      bankAccountName: z.string().optional().describe("Bank account name if ID unknown"),
      cashAccountId: z.string().optional().describe("Cash account ID (from list_accounts)"),
      cashAccountName: z.string().optional().describe("Cash account name if ID unknown"),
      reference: z.string().optional().describe("Reference/UTR number"),
      remarks: z.string().optional().describe("Notes about this receipt"),
      customerId: z.string().optional().describe("Customer ID this receipt is from"),
      supplierId: z.string().optional().describe("Supplier ID (for supplier refunds)"),
      receiptType: z.string().optional().default("customer_receipt").describe("Receipt type: customer_receipt or supplier_refund"),
    },
    async (params) => {
      try {
        const data = await callTool("create_receipt", params);
        return {
          content: [{
            type: "text",
            text: `✅ Receipt of ${(params as any).amount} recorded successfully!\n\n${JSON.stringify(data, null, 2)}`,
          }],
        };
      } catch (err) {
        return toolError("create_receipt", err);
      }
    }
  );

  server.tool(
    "create_expense",
    `Record an expense paid from a bank or cash account. Automatically updates the account balance.
    You can resolve the expense category by name (expenseCategoryName) if you don't have the ID.
    Example: "Record office rent expense of 20000 from HDFC account on 2026-03-01"`,
    {
      expenseDate: z.string().describe("Expense date (YYYY-MM-DD)"),
      amount: z.number().positive().describe("Expense amount"),
      bankAccountId: z.string().optional().describe("Bank account ID (from list_accounts)"),
      bankAccountName: z.string().optional().describe("Bank account name if ID unknown"),
      cashAccountId: z.string().optional().describe("Cash account ID (from list_accounts)"),
      cashAccountName: z.string().optional().describe("Cash account name if ID unknown"),
      expenseCategoryId: z.string().optional().describe("Expense category ID"),
      expenseCategoryName: z.string().optional().describe("Expense category name if ID unknown (e.g. 'Office Expenses')"),
      description: z.string().optional().describe("Description of the expense"),
      tourPackageQueryId: z.string().optional().describe("Optional: link to a confirmed tour query ID. If provided, the query must be confirmed."),
    },
    async (params) => {
      try {
        const data = await callTool("create_expense", params);
        return {
          content: [{
            type: "text",
            text: `✅ Expense of ${(params as any).amount} recorded successfully!\n\n${JSON.stringify(data, null, 2)}`,
          }],
        };
      } catch (err) {
        return toolError("create_expense", err);
      }
    }
  );

  server.tool(
    "create_income",
    `Record income received into a bank or cash account. Automatically updates the account balance.
    You can resolve the income category by name (incomeCategoryName) if you don't have the ID.
    Example: "Record commission income of 3000 into SBI account on 2026-03-05"`,
    {
      incomeDate: z.string().describe("Income date (YYYY-MM-DD)"),
      amount: z.number().positive().describe("Income amount"),
      bankAccountId: z.string().optional().describe("Bank account ID (from list_accounts)"),
      bankAccountName: z.string().optional().describe("Bank account name if ID unknown"),
      cashAccountId: z.string().optional().describe("Cash account ID (from list_accounts)"),
      cashAccountName: z.string().optional().describe("Cash account name if ID unknown"),
      incomeCategoryId: z.string().optional().describe("Income category ID"),
      incomeCategoryName: z.string().optional().describe("Income category name if ID unknown (e.g. 'Commissions')"),
      description: z.string().optional().describe("Description of the income"),
      tourPackageQueryId: z.string().optional().describe("Optional: link to a confirmed tour query ID. If provided, the query must be confirmed."),
    },
    async (params) => {
      try {
        const data = await callTool("create_income", params);
        return {
          content: [{
            type: "text",
            text: `✅ Income of ${(params as any).amount} recorded successfully!\n\n${JSON.stringify(data, null, 2)}`,
          }],
        };
      } catch (err) {
        return toolError("create_income", err);
      }
    }
  );

  server.tool(
    "create_transfer",
    `Transfer money between accounts (bank-to-bank, bank-to-cash, cash-to-bank, cash-to-cash). Both account balances are updated automatically.
    Specify accounts by ID or by name.
    Example: "Transfer 50000 from HDFC bank to Main Cash account on 2026-03-09"`,
    {
      transferDate: z.string().describe("Transfer date (YYYY-MM-DD)"),
      amount: z.number().positive().describe("Transfer amount"),
      fromBankAccountId: z.string().optional().describe("Source bank account ID"),
      fromBankAccountName: z.string().optional().describe("Source bank account name if ID unknown"),
      fromCashAccountId: z.string().optional().describe("Source cash account ID"),
      fromCashAccountName: z.string().optional().describe("Source cash account name if ID unknown"),
      toBankAccountId: z.string().optional().describe("Destination bank account ID"),
      toBankAccountName: z.string().optional().describe("Destination bank account name if ID unknown"),
      toCashAccountId: z.string().optional().describe("Destination cash account ID"),
      toCashAccountName: z.string().optional().describe("Destination cash account name if ID unknown"),
      reference: z.string().optional().describe("Reference/transaction number"),
      description: z.string().optional().describe("Description of the transfer"),
    },
    async (params) => {
      try {
        const data = await callTool("create_transfer", params);
        return {
          content: [{
            type: "text",
            text: `✅ Transfer of ${(params as any).amount} completed successfully!\n\n${JSON.stringify(data, null, 2)}`,
          }],
        };
      } catch (err) {
        return toolError("create_transfer", err);
      }
    }
  );

  return server;
}
