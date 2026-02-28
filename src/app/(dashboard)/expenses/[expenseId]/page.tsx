import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import ExpenseForm from "../components/expense-form";

interface ExpensePageProps {
  params: Promise<{ expenseId: string }>;
}

export default async function ExpensePage(props: ExpensePageProps) {
  const params = await props.params;
  /* const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  } */

  // Check if this is an "edit" or "new" page
  const isEdit = params.expenseId !== "new";

  let expense = null;
  if (isEdit) {
    expense = await prismadb.expenseDetail.findUnique({
      where: {
        id: params.expenseId
      }
    });

    if (!expense) {
      redirect("/expenses");
    }
  }

  // Get the data we need for the form
  const [expenseCategories, bankAccounts, cashAccounts] = await Promise.all([
    prismadb.expenseCategory.findMany({ where: { isActive: true } }),
    prismadb.bankAccount.findMany({ where: { isActive: true } }),
    prismadb.cashAccount.findMany({ where: { isActive: true } })
  ]);

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <h1 className="text-3xl font-bold tracking-tight">
          {isEdit ? "Edit Expense" : "Create Expense"}
        </h1>
        <ExpenseForm
          initialData={expense}
          expenseCategories={expenseCategories}
          bankAccounts={bankAccounts}
          cashAccounts={cashAccounts as any}
        />
      </div>
    </div>
  );
}
