import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { IncomeForm } from "../components/income-form";

interface IncomePageProps {
  params: Promise<{ incomeId: string }>;
}

export default async function IncomePage(props: IncomePageProps) {
  const params = await props.params;
  /* const { userId } = await auth();

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

  // Transform the income object to ensure null nested properties are converted to undefined
  const transformedIncome = income ? {
    ...income,
    incomeCategory: income.incomeCategory || undefined,
    bankAccount: income.bankAccount || undefined, 
    cashAccount: income.cashAccount || undefined,
    tourPackageQuery: income.tourPackageQuery || undefined
  } : undefined;

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <Heading
          title={isEdit ? "Edit Income" : "Create Income"}
          description={isEdit ? "Update income details" : "Add a new income record"}
        />  
              <Separator />
        <IncomeForm
          initialData={transformedIncome}
          incomeCategories={incomeCategories}
          bankAccounts={bankAccounts}
          cashAccounts={cashAccounts}
          onSuccess={() => {}}
        />
      </div>
    </div>
  );
}
