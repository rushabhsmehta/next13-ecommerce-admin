import prismadb from "@/lib/prismadb";
import { AccountsDashboardClient } from "./components/accounts-dashboard-client";

export default async function AccountsDashboardPage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Bank and cash accounts
  const [bankAccounts, cashAccounts] = await Promise.all([
    prismadb.bankAccount.findMany({
      where: { isActive: true },
      select: {
        id: true,
        accountName: true,
        bankName: true,
        currentBalance: true,
        accountNumber: true,
      },
      orderBy: { accountName: "asc" },
    }),
    prismadb.cashAccount.findMany({
      where: { isActive: true },
      select: { id: true, accountName: true, currentBalance: true },
      orderBy: { accountName: "asc" },
    }),
  ]);

  // Outstanding receivables: total invoiced - total collected via allocations
  const salesWithAllocations = await prismadb.saleDetail.findMany({
    select: {
      salePrice: true,
      gstAmount: true,
      receiptAllocations: { select: { allocatedAmount: true } },
    },
  });
  const totalInvoiced = salesWithAllocations.reduce(
    (sum, s) => sum + s.salePrice + (s.gstAmount || 0),
    0
  );
  const totalCollected = salesWithAllocations.reduce(
    (sum, s) =>
      sum + s.receiptAllocations.reduce((a, r) => a + r.allocatedAmount, 0),
    0
  );
  const outstandingReceivables = Math.max(0, totalInvoiced - totalCollected);

  // Outstanding payables: total billed - total paid via allocations
  const purchasesWithAllocations = await prismadb.purchaseDetail.findMany({
    select: {
      price: true,
      gstAmount: true,
      netPayable: true,
      paymentAllocations: { select: { allocatedAmount: true } },
    },
  });
  const totalBilled = purchasesWithAllocations.reduce(
    (sum, p) => sum + (p.netPayable ?? p.price + (p.gstAmount || 0)),
    0
  );
  const totalPaid = purchasesWithAllocations.reduce(
    (sum, p) =>
      sum + p.paymentAllocations.reduce((a, pay) => a + pay.allocatedAmount, 0),
    0
  );
  const outstandingPayables = Math.max(0, totalBilled - totalPaid);

  // MTD Revenue (sales this calendar month)
  const mtdSalesAgg = await prismadb.saleDetail.aggregate({
    where: { saleDate: { gte: startOfMonth } },
    _sum: { salePrice: true, gstAmount: true },
  });
  const mtdRevenue =
    (mtdSalesAgg._sum.salePrice || 0) + (mtdSalesAgg._sum.gstAmount || 0);

  // MTD Expenses (purchases + expense details this month)
  const [mtdPurchasesAgg, mtdExpensesAgg] = await Promise.all([
    prismadb.purchaseDetail.aggregate({
      where: { purchaseDate: { gte: startOfMonth } },
      _sum: { price: true, gstAmount: true, netPayable: true },
    }),
    prismadb.expenseDetail.aggregate({
      where: { expenseDate: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
  ]);
  const mtdPurchaseAmount =
    mtdPurchasesAgg._sum.netPayable ??
    (mtdPurchasesAgg._sum.price || 0) + (mtdPurchasesAgg._sum.gstAmount || 0);
  const mtdExpenses = mtdPurchaseAmount + (mtdExpensesAgg._sum.amount || 0);

  // Recent 10 transactions (payments + receipts merged)
  const [recentPayments, recentReceipts] = await Promise.all([
    prismadb.paymentDetail.findMany({
      take: 10,
      orderBy: { paymentDate: "desc" },
      select: {
        id: true,
        paymentDate: true,
        amount: true,
        note: true,
        supplier: { select: { name: true } },
        customer: { select: { name: true } },
        bankAccount: { select: { accountName: true } },
        cashAccount: { select: { accountName: true } },
      },
    }),
    prismadb.receiptDetail.findMany({
      take: 10,
      orderBy: { receiptDate: "desc" },
      select: {
        id: true,
        receiptDate: true,
        amount: true,
        note: true,
        customer: { select: { name: true } },
        supplier: { select: { name: true } },
        bankAccount: { select: { accountName: true } },
        cashAccount: { select: { accountName: true } },
      },
    }),
  ]);

  const recentTransactions = [
    ...recentPayments.map((p) => ({
      id: p.id,
      date: p.paymentDate,
      type: "payment" as const,
      party: p.supplier?.name || p.customer?.name || "N/A",
      amount: p.amount,
      account: p.bankAccount?.accountName || p.cashAccount?.accountName || "N/A",
      note: p.note || "",
    })),
    ...recentReceipts.map((r) => ({
      id: r.id,
      date: r.receiptDate,
      type: "receipt" as const,
      party: r.customer?.name || r.supplier?.name || "N/A",
      amount: r.amount,
      account: r.bankAccount?.accountName || r.cashAccount?.accountName || "N/A",
      note: r.note || "",
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  const totalBankBalance = bankAccounts.reduce((sum, b) => sum + b.currentBalance, 0);
  const totalCashBalance = cashAccounts.reduce((sum, c) => sum + c.currentBalance, 0);

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <AccountsDashboardClient
          bankAccounts={bankAccounts}
          cashAccounts={cashAccounts}
          totalBankBalance={totalBankBalance}
          totalCashBalance={totalCashBalance}
          outstandingReceivables={outstandingReceivables}
          outstandingPayables={outstandingPayables}
          mtdRevenue={mtdRevenue}
          mtdExpenses={mtdExpenses}
          recentTransactions={recentTransactions}
        />
      </div>
    </div>
  );
}
