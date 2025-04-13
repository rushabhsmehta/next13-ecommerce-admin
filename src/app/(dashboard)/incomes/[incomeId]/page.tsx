import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { IncomeForm } from "../components/income-form";

interface IncomePageProps {
  params: { incomeId: string };
}

export default async function IncomePage({ params }: IncomePageProps) {
  /* const { userId } = auth();

  if (!userId) {
    redirect("/sign-in");
  } */

  // Check if this is an "edit" or "new" page
  const isEdit = params.incomeId !== "new";

  let income = null;
  if (isEdit) {
    income = await prismadb.incomeDetail.findUnique({
      where: {
        id: params.incomeId
      },
      include: {
        incomeCategory: true,
        bankAccount: true,
        cashAccount: true,
        tourPackageQuery: true
      }
    });

    if (!income) {
      redirect("/incomes");
    }
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
          title={isEdit ? "Edit Income" : "Create Income"}
          description={isEdit ? "Update income details" : "Add a new income record"}
        />        <Separator />
        <IncomeForm
          initialData={income || undefined}
          incomeCategories={incomeCategories}
          bankAccounts={bankAccounts}
          cashAccounts={cashAccounts}
          onSuccess={() => {}}
        />
      </div>
    </div>
  );
}
