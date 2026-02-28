import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { ComprehensiveLedgerClient } from "./components/client";

const ComprehensiveLedgerPage = async () => {
  // Get all expense transactions with relations
  const expenses = await prismadb.expenseDetail.findMany({
    include: {
      tourPackageQuery: true,
      bankAccount: true,
      cashAccount: true,
      expenseCategory: true,
    },
    orderBy: {
      expenseDate: 'desc'
    }
  });

  // Get all income transactions with relations
  const incomes = await prismadb.incomeDetail.findMany({
    include: {
      tourPackageQuery: true,
      bankAccount: true,
      cashAccount: true,
      incomeCategory: true,
    },
    orderBy: {
      incomeDate: 'desc'
    }
  });

  // Format and combine all transactions
  const formattedExpenses = expenses.map((expense) => ({
    id: expense.id,
    date: format(expense.expenseDate, 'MMMM d, yyyy'),
    amount: expense.amount,
    description: expense.description || "Expense",
    packageName: expense.tourPackageQuery?.tourPackageQueryName || "-",
    category: expense.expenseCategory?.name || "Uncategorized",
    paymentMode: expense.bankAccount ? "Bank" : expense.cashAccount ? "Cash" : "Unknown",
    account: expense.bankAccount?.accountName || expense.cashAccount?.accountName || "-",
    type: "expense" as const,
    viewLink: `/expenses/${expense.id}/view`,
  }));

  const formattedIncomes = incomes.map((income) => ({
    id: income.id,
    date: format(income.incomeDate, 'MMMM d, yyyy'),
    amount: income.amount,
    description: income.description || "Income",
    packageName: income.tourPackageQuery?.tourPackageQueryName || "-",
    category: income.incomeCategory?.name || "Uncategorized",
    paymentMode: income.bankAccount ? "Bank" : income.cashAccount ? "Cash" : "Unknown",
    account: income.bankAccount?.accountName || income.cashAccount?.accountName || "-",
    type: "income" as const,
    viewLink: `/incomes/${income.id}/view`,
  }));

  // Combine and sort all transactions by date
  const allTransactions = [...formattedExpenses, ...formattedIncomes].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Get unique categories from both income and expense
  const expenseCategories = Array.from(new Set(formattedExpenses.map(expense => expense.category)));
  const incomeCategories = Array.from(new Set(formattedIncomes.map(income => income.category)));
  const allCategories = [...expenseCategories, ...incomeCategories];

  // Calculate totals
  const totalExpenses = formattedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalIncomes = formattedIncomes.reduce((sum, income) => sum + income.amount, 0);
  const netBalance = totalIncomes - totalExpenses;

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <Heading 
          title="Complete Financial Ledger" 
          description="View all income and expense transactions in one place"
        />
        <Separator />
        
        <ComprehensiveLedgerClient 
          transactions={allTransactions}
          categories={allCategories}
          totalExpenses={totalExpenses}
          totalIncomes={totalIncomes}
          netBalance={netBalance}
        />
      </div>
    </div>
  );
};

export default ComprehensiveLedgerPage;
