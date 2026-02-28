import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { ExpenseLedgerClient } from "./components/client";
import { ExpenseDetail, TourPackageQuery, BankAccount, CashAccount, ExpenseCategory } from "@prisma/client";

const ExpenseLedgerPage = async () => {
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

  // Format expenses data
  const formattedExpenses = expenses.map((expense) => ({
    id: expense.id,
    date: format(expense.expenseDate, 'MMMM d, yyyy'),
    amount: expense.amount,
    description: expense.description || "Expense",
    packageName: expense.tourPackageQuery?.tourPackageQueryName || "-",
    category: expense.expenseCategory?.name || "Uncategorized",
    paymentMode: expense.bankAccount ? "Bank" : expense.cashAccount ? "Cash" : "Unknown",
    account: expense.bankAccount?.accountName || expense.cashAccount?.accountName || "-",
  }));

  // Get all expense categories for filter dropdown
  const categories = await prismadb.expenseCategory.findMany({
    orderBy: {
      name: 'asc'
    }
  });

  // Extract unique categories from formatted expenses
  const uniqueCategories = Array.from(new Set(formattedExpenses.map(expense => expense.category)));

  // Calculate total expenses
  const totalExpenses = formattedExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <Heading 
          title="Expense Ledger" 
          description="View all expense transactions"
        />
        <Separator />
        
        <ExpenseLedgerClient 
          expenses={formattedExpenses}
          categories={uniqueCategories}
          totalExpenses={totalExpenses}
        />
      </div>
    </div>
  );
};

export default ExpenseLedgerPage;

