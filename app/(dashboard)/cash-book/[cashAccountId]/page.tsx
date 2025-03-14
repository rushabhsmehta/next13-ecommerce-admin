import prismadb from "@/lib/prismadb";
import { notFound } from "next/navigation";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { TransactionTable } from "../components/transaction-table";
import { getCashAccountTransactions, calculateRunningBalance } from "@/lib/transaction-service";

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

  // Get all transactions for this cash account
  const transactions = await getCashAccountTransactions(params.cashAccountId);
  
  // Calculate running balance
  const transactionsWithBalance = calculateRunningBalance(
    transactions,
    cashAccount.openingBalance
  );

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Heading 
          title={`${cashAccount.accountName} - Cash Book`}
          description={`View transactions and balance for ${cashAccount.accountName}`}
        />
        <Separator />
        
        <TransactionTable 
          data={transactionsWithBalance}
          openingBalance={cashAccount.openingBalance} 
          accountName={cashAccount.accountName} 
        />
      </div>
    </div>
  );
};

export default CashBookPage;
