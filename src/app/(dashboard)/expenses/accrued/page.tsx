import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { AccruedExpensesClient } from "./components/accrued-expenses-client";

export default async function AccruedExpensesPage() {
  /* const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  } */
  // Get all accrued expenses
  const accruedExpenses = await prismadb.expenseDetail.findMany({
    where: { isAccrued: true },
    orderBy: { accruedDate: "desc" },
    include: {
      expenseCategory: {
        select: {
          name: true,
          id: true
        }
      },
      tourPackageQuery: {
        select: {
          tourPackageQueryName: true,
          customerName: true,
          id: true
        }
      },
      images: true
    }
  });

  // Get all expense categories for filtering
  const categories = await prismadb.expenseCategory.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true
    }
  });

  // Get bank and cash accounts for payment processing
  const bankAccounts = await prismadb.bankAccount.findMany({
    where: { isActive: true },
    orderBy: { accountName: 'asc' },
    select: {
      id: true,
      accountName: true,
      currentBalance: true
    }
  });

  const cashAccounts = await prismadb.cashAccount.findMany({
    where: { isActive: true },
    orderBy: { accountName: 'asc' },
    select: {
      id: true,
      accountName: true,
      currentBalance: true
    }
  });

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <AccruedExpensesClient 
          accruedExpenses={accruedExpenses}
          categories={categories}
          bankAccounts={bankAccounts}
          cashAccounts={cashAccounts}
        />
      </div>
    </div>
  );
}
