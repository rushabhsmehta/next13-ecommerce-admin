import { format } from "date-fns";
import { notFound } from "next/navigation";
import prismadb from "@/lib/prismadb";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { IncomeDetailView } from "@/components/ui/income-detail-view";

const IncomeViewPage = async ({
  params
}: {
  params: { incomeId: string }
}) => {
  // Get the specific income with all related data
  const income = await prismadb.incomeDetail.findUnique({
    where: {
      id: params.incomeId
    },
    include: {
      tourPackageQuery: true,
      bankAccount: true,
      cashAccount: true,
      incomeCategory: true,
    }
  });

  if (!income) {
    notFound();
  }

  // Format income data
  const formattedIncome = {
    id: income.id,
    date: format(income.incomeDate, 'MMMM d, yyyy'),
    amount: income.amount,
    description: income.description || "Income",
    packageName: income.tourPackageQuery?.tourPackageQueryName || "-",
    category: income.incomeCategory?.name || "Uncategorized",
    paymentMode: income.bankAccount ? "Bank" : income.cashAccount ? "Cash" : "Unknown",
    account: income.bankAccount?.accountName || income.cashAccount?.accountName || "-",
    createdAt: income.createdAt.toISOString(),
    updatedAt: income.updatedAt.toISOString(),
  };

  return (
    <IncomeDetailView income={formattedIncome} />
  );
};

export default IncomeViewPage;
