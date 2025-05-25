
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import ExpenseForm from "../components/expense-form";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";

export default async function NewExpensePage() {
  /* const { userId } = auth();

  if (!userId) {
    redirect("/sign-in");
  } */

  // Fetch the required data for the ExpenseForm component
  const [expenseCategories, bankAccounts, cashAccounts] = await Promise.all([
    prismadb.expenseCategory.findMany({ where: { isActive: true } }),
    prismadb.bankAccount.findMany({ where: { isActive: true } }),
    prismadb.cashAccount.findMany({ where: { isActive: true } })
  ]);

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
   
        <Separator />
        <ExpenseForm 
          initialData={null} 
          expenseCategories={expenseCategories}
          bankAccounts={bankAccounts}
          cashAccounts={cashAccounts}
        />
      </div>
    </div>
  );
}

