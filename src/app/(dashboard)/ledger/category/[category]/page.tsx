import { format } from "date-fns";
import { notFound } from "next/navigation";
import prismadb from "@/lib/prismadb";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { CategoryLedgerClient } from "./components/client";

const CategoryLedgerPage = async (
  props: {
    params: Promise<{ category: string }>;
    searchParams: Promise<{ type?: 'income' | 'expense' | 'all' }>;
  }
) => {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const categoryName = decodeURIComponent(params?.category || '');
  const transactionType = searchParams?.type || 'all';

  let expenses: any[] = [];
  let incomes: any[] = [];

  // Get expense transactions for this category
  if (transactionType === 'expense' || transactionType === 'all') {
    const expenseCategory = await prismadb.expenseCategory.findFirst({
      where: {
        name: {
          equals: categoryName
        }
      }
    });

    if (expenseCategory) {
      expenses = await prismadb.expenseDetail.findMany({
        where: {
          expenseCategoryId: expenseCategory.id
        },
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
    }
  }

  // Get income transactions for this category
  if (transactionType === 'income' || transactionType === 'all') {
    const incomeCategory = await prismadb.incomeCategory.findFirst({
      where: {
        name: {
          equals: categoryName
        }
      }
    });

    if (incomeCategory) {
      incomes = await prismadb.incomeDetail.findMany({
        where: {
          incomeCategoryId: incomeCategory.id
        },
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
    }
  }

  // If no transactions found for this category, return not found
  if (expenses.length === 0 && incomes.length === 0) {
    notFound();
  }

  // Format and combine all transactions
  const formattedExpenses = expenses.map((expense) => ({
    id: expense.id,
    date: format(expense.expenseDate, 'MMMM d, yyyy'),
    rawDate: expense.expenseDate,
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
    rawDate: income.incomeDate,
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
    return new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime();
  });

  // Calculate totals
  const totalExpenses = formattedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalIncomes = formattedIncomes.reduce((sum, income) => sum + income.amount, 0);

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <Heading
          title={`${categoryName} - Category Ledger`}
          description={`All transactions for category: ${categoryName}`}
        />
        <Separator />

        <CategoryLedgerClient
          transactions={allTransactions}
          expenses={formattedExpenses}
          incomes={formattedIncomes}
          categoryName={categoryName}
          totalExpenses={totalExpenses}
          totalIncomes={totalIncomes}
        />
      </div>
    </div>
  );
};

export default CategoryLedgerPage;
