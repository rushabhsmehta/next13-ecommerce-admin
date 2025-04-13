import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { IncomeForm } from "../components/income-form";

export default async function NewIncomePage() {
  const { userId } = auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Get the data we need for the form
  const [incomeCategories, bankAccounts, cashAccounts] = await Promise.all([
    prismadb.incomeCategory.findMany({ 
      where: { isActive: true },
      orderBy: { name: 'asc' } 
    }),
    prismadb.bankAccount.findMany({ 
      where: { isActive: true },
      orderBy: { accountName: 'asc' } 
    }),
    prismadb.cashAccount.findMany({ 
      where: { isActive: true },
      orderBy: { accountName: 'asc' } 
    })
  ]);

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Heading
          title="Create Income"
          description="Add a new income record"
        />
        <Separator />
        <IncomeForm
          initialData={undefined}
          incomeCategories={incomeCategories}
          bankAccounts={bankAccounts}
          cashAccounts={cashAccounts}
        />
      </div>
    </div>
  );
}

