import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { callTool, toolError } from "../helpers.js";

export function registerExpenseIncomeTools(server: McpServer) {
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
            text: `Expense of ${params.amount} recorded successfully!\n\n${JSON.stringify(data, null, 2)}`,
          }],
        };
      } catch (err) {
        return toolError("create_expense", err);
      }
    }
  );

  server.tool(
    "delete_expense",
    "Delete an expense by its ID. This will also revert the account balance if the expense was already paid.",
    {
      expenseId: z.string().describe("The ID of the expense to delete"),
    },
    async ({ expenseId }) => {
      try {
        const data = await callTool("delete_expense", { expenseId });
        return {
          content: [{ type: "text", text: `Expense deleted successfully!\n\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (err) {
        return toolError("delete_expense", err);
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
            text: `Income of ${params.amount} recorded successfully!\n\n${JSON.stringify(data, null, 2)}`,
          }],
        };
      } catch (err) {
        return toolError("create_income", err);
      }
    }
  );

  server.tool(
    "list_expenses",
    "List expenses with filters for category, date range, and accrued status.",
    {
      expenseCategoryId: z.string().optional().describe("Filter by expense category ID"),
      startDate: z.string().optional().describe("Filter from this date (YYYY-MM-DD)"),
      endDate: z.string().optional().describe("Filter to this date (YYYY-MM-DD)"),
      isAccrued: z.boolean().optional().describe("Filter by accrued status (true = accrued only, false = paid only)"),
      tourPackageQueryId: z.string().optional().describe("Filter by tour query ID"),
      limit: z.number().int().min(1).max(100).optional().default(25).describe("Max results"),
    },
    async (params) => {
      try {
        const data = await callTool("list_expenses", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("list_expenses", err);
      }
    }
  );

  server.tool(
    "list_incomes",
    "List income records with filters for category and date range.",
    {
      incomeCategoryId: z.string().optional().describe("Filter by income category ID"),
      startDate: z.string().optional().describe("Filter from this date (YYYY-MM-DD)"),
      endDate: z.string().optional().describe("Filter to this date (YYYY-MM-DD)"),
      tourPackageQueryId: z.string().optional().describe("Filter by tour query ID"),
      limit: z.number().int().min(1).max(100).optional().default(25).describe("Max results"),
    },
    async (params) => {
      try {
        const data = await callTool("list_incomes", params);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("list_incomes", err);
      }
    }
  );

  server.tool(
    "list_expense_categories",
    "List all expense categories. Use this to find category IDs for create_expense.",
    {},
    async () => {
      try {
        const data = await callTool("list_expense_categories", {});
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("list_expense_categories", err);
      }
    }
  );

  server.tool(
    "list_income_categories",
    "List all income categories. Use this to find category IDs for create_income.",
    {},
    async () => {
      try {
        const data = await callTool("list_income_categories", {});
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return toolError("list_income_categories", err);
      }
    }
  );

  server.tool(
    "create_accrued_expense",
    "Record an accrued (unpaid) expense -- no account balance is affected until it's paid.",
    {
      expenseDate: z.string().describe("Accrual date (YYYY-MM-DD)"),
      amount: z.number().positive().describe("Accrued expense amount"),
      expenseCategoryId: z.string().optional().describe("Expense category ID"),
      expenseCategoryName: z.string().optional().describe("Expense category name if ID unknown"),
      description: z.string().optional().describe("Description of the accrued expense"),
      tourPackageQueryId: z.string().optional().describe("Optional: link to a confirmed tour query ID"),
      supplierId: z.string().optional().describe("Supplier ID this expense is for"),
    },
    async (params) => {
      try {
        const data = await callTool("create_accrued_expense", params);
        return {
          content: [{ type: "text", text: `Accrued expense recorded\n\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (err) {
        return toolError("create_accrued_expense", err);
      }
    }
  );

  server.tool(
    "pay_accrued_expense",
    "Pay a previously accrued expense from a bank or cash account. Updates the account balance.",
    {
      expenseId: z.string().describe("The accrued expense ID to pay"),
      bankAccountId: z.string().optional().describe("Bank account ID to pay from"),
      bankAccountName: z.string().optional().describe("Bank account name if ID unknown"),
      cashAccountId: z.string().optional().describe("Cash account ID to pay from"),
      cashAccountName: z.string().optional().describe("Cash account name if ID unknown"),
      paymentDate: z.string().optional().describe("Payment date (YYYY-MM-DD, defaults to today)"),
    },
    async (params) => {
      try {
        const data = await callTool("pay_accrued_expense", params);
        return {
          content: [{ type: "text", text: `Accrued expense paid\n\n${JSON.stringify(data, null, 2)}` }],
        };
      } catch (err) {
        return toolError("pay_accrued_expense", err);
      }
    }
  );
}
