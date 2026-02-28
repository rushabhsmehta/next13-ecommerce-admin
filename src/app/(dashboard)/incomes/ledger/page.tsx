import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { IncomeLedgerClient } from "./components/client";

const IncomeLedgerPage = async () => {
  // Get all income transactions with tour package details and category relation
  const incomes = await prismadb.incomeDetail.findMany({
    include: {
      tourPackageQuery: true,
      bankAccount: true,
      cashAccount: true,
      incomeCategory: true // Include the income category relation
    },
    orderBy: {
      incomeDate: 'desc'
    }
  });
  

  // Format incomes data
  const formattedIncomes = incomes.map(income => ({
    id: income.id,
    date: format(income.incomeDate, 'MMMM d, yyyy'),
    amount: income.amount,
    description: income.description || "Income",
    packageName: income.tourPackageQuery?.tourPackageQueryName || "-",
    category: income.incomeCategory?.name || "Uncategorized", // Access name through the relation
    paymentMode: income.bankAccount ? "Bank" : income.cashAccount ? "Cash" : "Unknown",
    account: income.bankAccount?.accountName || income.cashAccount?.accountName || "-",
  }));

  // Extract unique categories
  const uniqueCategories = Array.from(new Set(formattedIncomes.map(income => income.category)));

  // Calculate total incomes
  const totalIncomes = formattedIncomes.reduce((sum, income) => sum + income.amount, 0);

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <Heading 
          title="Income Ledger" 
          description="View all income transactions"
        />
        <Separator />
        
        <IncomeLedgerClient 
          incomes={formattedIncomes}
          categories={uniqueCategories}
          totalIncomes={totalIncomes}
        />
      </div>
    </div>
  );
};

export default IncomeLedgerPage;

