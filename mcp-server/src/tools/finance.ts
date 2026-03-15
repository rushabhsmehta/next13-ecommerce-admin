import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callTool, toolError } from "../helpers.js";

export function registerFinanceTools(server: McpServer) {
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
            text: `Payment of ${params.amount} recorded successfully!\n\n${JSON.stringify(data, null, 2)}`,
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
            text: `Receipt of ${params.amount} recorded successfully!\n\n${JSON.stringify(data, null, 2)}`,
          }],
        };
      } catch (err) {
        return toolError("create_receipt", err);
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
            text: `Transfer of ${params.amount} completed successfully!\n\n${JSON.stringify(data, null, 2)}`,
          }],
        };
      } catch (err) {
        return toolError("create_transfer", err);
      }
    }
  );

  server.tool(
    "allocate_receipt_to_sale",
    "Link a receipt to a specific sale invoice -- tracks which payment covers which invoice. Cannot over-allocate.",
    {
      receiptDetailId: z.string().describe("The receipt ID to allocate from"),
      saleDetailId: z.string().describe("The sale ID to allocate to"),
      allocatedAmount: z.number().positive().describe("Amount to allocate"),
    },
    async (params) => {
      try {
        const data = await callTool("allocate_receipt_to_sale", params);
        return {
          content: [{ type: "text", text: `Receipt allocated to sale\n\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (err) {
        return toolError("allocate_receipt_to_sale", err);
      }
    }
  );

  server.tool(
    "allocate_payment_to_purchase",
    "Link a payment to a specific purchase bill -- tracks which payment covers which bill. Cannot over-allocate.",
    {
      paymentDetailId: z.string().describe("The payment ID to allocate from"),
      purchaseDetailId: z.string().describe("The purchase ID to allocate to"),
      allocatedAmount: z.number().positive().describe("Amount to allocate"),
    },
    async (params) => {
      try {
        const data = await callTool("allocate_payment_to_purchase", params);
        return {
          content: [{ type: "text", text: `Payment allocated to purchase\n\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (err) {
        return toolError("allocate_payment_to_purchase", err);
      }
    }
  );

  server.tool(
    "get_outstanding_receivables",
    "Get all unpaid customer invoices across the system with outstanding balances.",
    {
      limit: z.number().int().min(1).max(500).optional().default(100).describe("Max results"),
    },
    async (params) => {
      try {
        const data = await callTool("get_outstanding_receivables", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("get_outstanding_receivables", err);
      }
    }
  );

  server.tool(
    "get_outstanding_payables",
    "Get all unpaid supplier bills across the system with outstanding balances.",
    {
      limit: z.number().int().min(1).max(500).optional().default(100).describe("Max results"),
    },
    async (params) => {
      try {
        const data = await callTool("get_outstanding_payables", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("get_outstanding_payables", err);
      }
    }
  );

  server.tool(
    "list_receipts",
    "List receipt records with filters for tour query, customer, and date range.",
    {
      tourPackageQueryId: z.string().optional().describe("Filter by tour query ID"),
      customerId: z.string().optional().describe("Filter by customer ID"),
      startDate: z.string().optional().describe("Filter from this date (YYYY-MM-DD)"),
      endDate: z.string().optional().describe("Filter to this date (YYYY-MM-DD)"),
      limit: z.number().int().min(1).max(100).optional().default(25).describe("Max results"),
    },
    async (params) => {
      try {
        const data = await callTool("list_receipts", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("list_receipts", err);
      }
    }
  );

  server.tool(
    "list_payments",
    "List payment records with filters for tour query, supplier, and date range.",
    {
      tourPackageQueryId: z.string().optional().describe("Filter by tour query ID"),
      supplierId: z.string().optional().describe("Filter by supplier ID"),
      startDate: z.string().optional().describe("Filter from this date (YYYY-MM-DD)"),
      endDate: z.string().optional().describe("Filter to this date (YYYY-MM-DD)"),
      limit: z.number().int().min(1).max(100).optional().default(25).describe("Max results"),
    },
    async (params) => {
      try {
        const data = await callTool("list_payments", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("list_payments", err);
      }
    }
  );

  server.tool(
    "list_transfers",
    "List inter-account fund transfers with date range filters.",
    {
      startDate: z.string().optional().describe("Filter from this date (YYYY-MM-DD)"),
      endDate: z.string().optional().describe("Filter to this date (YYYY-MM-DD)"),
      limit: z.number().int().min(1).max(100).optional().default(25).describe("Max results"),
    },
    async (params) => {
      try {
        const data = await callTool("list_transfers", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("list_transfers", err);
      }
    }
  );
}
