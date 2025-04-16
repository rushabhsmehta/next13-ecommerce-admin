import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { TransferClient } from "./components/client";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";

const TransfersPage = async () => {
  // Use transaction to batch all database queries into a single connection
  const { transfers, bankAccounts, cashAccounts } = await prismadb.$transaction(async (tx) => {
    const transfers = await tx.transfer.findMany({
      include: {
        fromBankAccount: true,
        fromCashAccount: true,
        toBankAccount: true,
        toCashAccount: true,
      },
      orderBy: {
        transferDate: 'desc',
      },
    });
    
    // Get all bank and cash accounts for the transfer form
    const bankAccounts = await tx.bankAccount.findMany({
      where: { isActive: true },
      orderBy: { accountName: 'asc' }
    });
    
    const cashAccounts = await tx.cashAccount.findMany({
      where: { isActive: true },
      orderBy: { accountName: 'asc' }
    });
    
    return { transfers, bankAccounts, cashAccounts };
  });

  const formattedTransfers = transfers.map((item) => ({
    id: item.id,
    date: format(item.transferDate, "MMMM d, yyyy"),
    amount: item.amount,
    reference: item.reference || "",
    fromAccount: getAccountName(item, 'from'),
    toAccount: getAccountName(item, 'to'),
    fromType: getAccountType(item, 'from'),
    toType: getAccountType(item, 'to'),
    description: item.description || "",
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Heading title="Fund Transfers" description="Transfer funds between accounts" />
        <Separator />
        <TransferClient 
          data={formattedTransfers}
          bankAccounts={bankAccounts}
          cashAccounts={cashAccounts} 
        />
      </div>
    </div>
  );
};


// Helper function to get account name
function getAccountName(transfer: any, direction: 'from' | 'to') {
  if (direction === 'from') {
    return transfer.fromBankAccount?.accountName || 
           transfer.fromCashAccount?.accountName || 
           "Unknown";
  } else {
    return transfer.toBankAccount?.accountName || 
           transfer.toCashAccount?.accountName || 
           "Unknown";
  }
}

// Helper function to get account type
function getAccountType(transfer: any, direction: 'from' | 'to') {
  if (direction === 'from') {
    return transfer.fromBankAccount ? "Bank" : "Cash";
  } else {
    return transfer.toBankAccount ? "Bank" : "Cash";
  }
}

export default TransfersPage;

