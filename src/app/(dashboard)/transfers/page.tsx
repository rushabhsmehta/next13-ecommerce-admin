import { format } from "date-fns";
import { formatLocalDate } from "@/lib/timezone-utils";
import prismadb from "@/lib/prismadb";
import { TransferClient } from "./components/client";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";

const TransfersPage = async () => {
  const transfers = await prismadb.transfer.findMany({
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
  const formattedTransfers = transfers.map((item) => ({
    id: item.id,
    date: formatLocalDate(item.transferDate, "MMMM d, yyyy"),
    amount: item.amount,
    reference: item.reference || "",
    fromAccount: getAccountName(item, 'from'),
    toAccount: getAccountName(item, 'to'),
    fromType: getAccountType(item, 'from'),
    toType: getAccountType(item, 'to'),
    description: item.description || "",
  }));

  // Get all bank and cash accounts for the transfer form
  const bankAccounts = await prismadb.bankAccount.findMany({
    where: { isActive: true },
    orderBy: { accountName: 'asc' }
  });
  
  const cashAccounts = await prismadb.cashAccount.findMany({
    where: { isActive: true },
    orderBy: { accountName: 'asc' }
  });

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
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

