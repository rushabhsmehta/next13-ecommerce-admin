import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { notFound } from "next/navigation";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { TransactionTable } from "../components/transaction-table"; // Updated path
import { FormattedTransaction } from "@/types";

interface CashBookPageProps {
  params: {
    cashAccountId: string;
  };
}

const CashBookPage = async ({ params }: CashBookPageProps) => {
  // Get cash account details
  const cashAccount = await prismadb.cashAccount.findUnique({
    where: {
      id: params.cashAccountId,
    },
  });

  if (!cashAccount) {
    return notFound();
  }

  // Get transactions for this cash account
  const dbTransactions = await prismadb.transaction.findMany({
    where: {
      cashAccountId: params.cashAccountId,
    },
    orderBy: {
      date: 'asc',
    },
  });

  // Calculate running balance
  let runningBalance = cashAccount.openingBalance;
  
  // Transform DB transactions to formatted transactions
  const transactions: FormattedTransaction[] = dbTransactions.map(transaction => {
    const amount = transaction.amount;
    runningBalance += amount;
    
    return {
      id: transaction.id,
      date: format(transaction.date, "yyyy-MM-dd"),
      type: transaction.type || 'Transaction',
      description: transaction.description || '',
      inflow: amount > 0 ? amount : 0,
      outflow: amount < 0 ? Math.abs(amount) : 0,
      balance: runningBalance,
      reference: transaction.reference || undefined
    };
  });

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Heading 
          title={`${cashAccount.name} - Cash Book`}
          description={`View transactions and balance for ${cashAccount.name}`}
        />
        <Separator />
        
        <TransactionTable 
          data={transactions}
          openingBalance={cashAccount.openingBalance} 
          accountName={cashAccount.name} 
        />
      </div>
    </div>
  );
};

export default CashBookPage;
