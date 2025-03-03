import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { CashAccountColumn } from "./components/columns"
import { CashAccountsClient } from "./components/client";

const CashAccountsPage = async () => {
  const cashAccounts = await prismadb.cashAccount.findMany({
    orderBy: {
      createdAt: 'desc'
    }
  });

  const formattedAccounts: CashAccountColumn[] = cashAccounts.map((item) => ({
    id: item.id,
    accountName: item.accountName,
    currentBalance: item.currentBalance,
    createdAt: format(item.createdAt, 'MMMM do, yyyy'),
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <CashAccountsClient data={formattedAccounts} />
      </div>
    </div>
  );
};

export default CashAccountsPage;
