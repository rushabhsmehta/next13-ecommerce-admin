import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { BankAccountColumn } from "./components/columns"
import { BankAccountsClient } from "./components/client";
import { BankAccount } from "@prisma/client";

const BankAccountsPage = async () => {
  const bankAccounts = await prismadb.bankAccount.findMany({
    orderBy: {
      createdAt: 'desc'
    }
  });

  const formattedBankAccounts: BankAccountColumn[] = bankAccounts.map((item : BankAccount) => ({
    id: item.id,
    accountName: item.accountName,
    accountNumber: item.accountNumber,
    bankName: item.bankName,
    createdAt: format(item.createdAt, 'MMMM d, yyyy'),
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <BankAccountsClient data={formattedBankAccounts} />
      </div>
    </div>
  );
};

export default BankAccountsPage;

