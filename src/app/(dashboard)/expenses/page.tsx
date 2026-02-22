import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { ExpensesClient } from "./components/expenses-client";

export default async function ExpensesPage() {
 /*  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  } */  const expenses = await prismadb.expenseDetail.findMany({
    orderBy: { expenseDate: "desc" },
    include: {
      expenseCategory: {
        select: {
          name: true,
          id: true
        }
      }
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

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <ExpensesClient 
          expenses={expenses}
          categories={categories}
        />
      </div>
    </div>
  );
}

