import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import { IncomeForm } from "../../components/income-form";

interface EditIncomePageProps {
  params: {
    incomeId: string;
  };
}

export default async function EditIncomePage({ params }: EditIncomePageProps) {
  const { userId } = auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const income = await prismadb.incomeDetail.findUnique({
    where: {
      id: params.incomeId,
    },
    include: {
      incomeCategory: true,
      bankAccount: true,
      cashAccount: true,
    },
  });

  if (!income) {
    redirect("/incomes");
  }

  const incomeCategories = await prismadb.incomeCategory.findMany();
  const bankAccounts = await prismadb.bankAccount.findMany();
  const cashAccounts = await prismadb.cashAccount.findMany();

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <IncomeForm
          initialData={income}
          incomeCategories={incomeCategories}
          bankAccounts={bankAccounts}
          cashAccounts={cashAccounts}
        />
      </div>
    </div>
  );
}
