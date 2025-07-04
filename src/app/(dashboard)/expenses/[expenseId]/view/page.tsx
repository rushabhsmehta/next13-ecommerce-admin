import { format } from "date-fns";
import { notFound } from "next/navigation";
import prismadb from "@/lib/prismadb";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { ExpenseDetailView } from "@/components/ui/expense-detail-view";

const ExpenseViewPage = async ({
  params
}: {
  params: { expenseId: string }
}) => {
  // Get the specific expense with all related data
  const expense = await prismadb.expenseDetail.findUnique({
    where: {
      id: params.expenseId
    },
    include: {
      tourPackageQuery: true,
      bankAccount: true,
      cashAccount: true,
      expenseCategory: true,
    }
  });

  if (!expense) {
    notFound();
  }

  // Format expense data
  const formattedExpense = {
    id: expense.id,
    date: format(expense.expenseDate, 'MMMM d, yyyy'),
    amount: expense.amount,
    description: expense.description || "Expense",
    packageName: expense.tourPackageQuery?.tourPackageQueryName || "-",
    category: expense.expenseCategory?.name || "Uncategorized",
    paymentMode: expense.bankAccount ? "Bank" : expense.cashAccount ? "Cash" : "Unknown",
    account: expense.bankAccount?.accountName || expense.cashAccount?.accountName || "-",
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
    isAccrued: expense.isAccrued,
    accruedDate: expense.accruedDate?.toISOString(),
    paidDate: expense.paidDate?.toISOString(),
  };

  return (
    <ExpenseDetailView expense={formattedExpense} />
  );
};

export default ExpenseViewPage;
