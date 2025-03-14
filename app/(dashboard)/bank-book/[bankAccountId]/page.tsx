import prismadb from "@/lib/prismadb";
import { notFound } from "next/navigation";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { TransactionTable } from "../components/transaction-table";
import { getBankAccountTransactions, calculateRunningBalance } from "@/lib/transaction-service";

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

  // Get all transactions for this bank account
  const transactions = await getBankAccountTransactions(params.bankAccountId);
  
  // Calculate running balance
  const transactionsWithBalance = calculateRunningBalance(
    transactions,
    bankAccount.openingBalance
  );

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Heading 
          title={`${bankAccount.accountName} - Bank Book`}
          description={`View transactions and balance for ${bankAccount.accountName}`}
        />
        <Separator />
        
        <TransactionTable 
          data={transactionsWithBalance}
          openingBalance={bankAccount.openingBalance} 
          accountName={bankAccount.accountName} 
        />
      </div>
    </div>
  );
};

export default BankBookPage;
