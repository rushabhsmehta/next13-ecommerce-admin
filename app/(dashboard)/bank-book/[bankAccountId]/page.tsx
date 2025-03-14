import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { notFound } from "next/navigation";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { TransactionTable } from "@/components/bank-book/transaction-table";
import { FormattedTransaction } from "@/types";

interface BankBookPageProps {
  params: {
    bankAccountId: string;
  };
}

const BankBookPage = async ({ params }: BankBookPageProps) => {
  // Get bank account details
  const bankAccount = await prismadb.bankAccount.findUnique({
    where: {
      id: params.bankAccountId,
    },
  });

  if (!bankAccount) {
    return notFound();
  }

  // Get transactions for this bank account
  const dbTransactions = await prismadb.transaction.findMany({
    where: {
      bankAccountId: params.bankAccountId,
    },
    orderBy: {
      date: 'asc',
    },
  });

  // Calculate running balance
  let runningBalance = bankAccount.openingBalance;
  
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
          title={`${bankAccount.name} - Bank Book`}
          description={`View transactions and balance for ${bankAccount.name}`}
        />
        <Separator />
        
        <TransactionTable 
          data={transactions}
          openingBalance={bankAccount.openingBalance} 
          accountName={bankAccount.name} 
        />
      </div>
    </div>
  );
};

export default BankBookPage;
