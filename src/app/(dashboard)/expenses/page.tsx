import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { ExpensesListTable } from "./components/expenses-list-table";

export default async function ExpensesPage() {
 /*  const { userId } = auth();

  if (!userId) {
    redirect("/sign-in");
  } */

  const expenses = await prismadb.expenseDetail.findMany({
    orderBy: { expenseDate: "desc" },
    include: {
      expenseCategory: {
        select: {
          name: true
        }
      }
    }
  });

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Expenses</h2>
          <Link href="/expenses/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add New
            </Button>
          </Link>
        </div>
        <ExpensesListTable data={expenses} />
      </div>
    </div>
  );
}

