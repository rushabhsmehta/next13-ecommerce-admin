import prismadb from "@/lib/prismadb";
import { AccountsDashboardClient } from "./components/accounts-dashboard-client";

export default async function AccountsDashboardPage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

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

  const mtdSalesAgg = await prismadb.saleDetail.aggregate({
    where: { saleDate: { gte: startOfMonth } },
    _sum: { salePrice: true, gstAmount: true },
  });
  const mtdRevenue =
    (mtdSalesAgg._sum.salePrice || 0) + (mtdSalesAgg._sum.gstAmount || 0);

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

  const [
    recentPayments,
    recentReceipts,
    recentIncomes,
    recentExpenses,
    recentTransfers,
  ] = await Promise.all([
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
    prismadb.incomeDetail.findMany({
      take: 10,
      orderBy: { incomeDate: "desc" },
      select: {
        id: true,
        incomeDate: true,
        amount: true,
        description: true,
        incomeCategory: { select: { name: true } },
        bankAccount: { select: { accountName: true } },
        cashAccount: { select: { accountName: true } },
      },
    }),
    prismadb.expenseDetail.findMany({
      take: 10,
      orderBy: { expenseDate: "desc" },
      select: {
        id: true,
        expenseDate: true,
        amount: true,
        description: true,
        expenseCategory: { select: { name: true } },
        bankAccount: { select: { accountName: true } },
        cashAccount: { select: { accountName: true } },
      },
    }),
    prismadb.transfer.findMany({
      take: 10,
      orderBy: { transferDate: "desc" },
      select: {
        id: true,
        transferDate: true,
        amount: true,
        description: true,
        reference: true,
        fromBankAccount: { select: { accountName: true } },
        fromCashAccount: { select: { accountName: true } },
        toBankAccount: { select: { accountName: true } },
        toCashAccount: { select: { accountName: true } },
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
    ...recentIncomes.map((income) => ({
      id: income.id,
      date: income.incomeDate,
      type: "receipt" as const,
      party: income.incomeCategory?.name || "Income",
      amount: income.amount,
      account:
        income.bankAccount?.accountName || income.cashAccount?.accountName || "N/A",
      note: income.description || "",
    })),
    ...recentExpenses.map((expense) => ({
      id: expense.id,
      date: expense.expenseDate,
      type: "payment" as const,
      party: expense.expenseCategory?.name || "Expense",
      amount: expense.amount,
      account:
        expense.bankAccount?.accountName || expense.cashAccount?.accountName || "N/A",
      note: expense.description || "",
    })),
    ...recentTransfers.map((transfer) => ({
      id: transfer.id,
      date: transfer.transferDate,
      type: "receipt" as const,
      party: `Transfer: ${
        transfer.fromBankAccount?.accountName ||
        transfer.fromCashAccount?.accountName ||
        "Unknown"
      } -> ${
        transfer.toBankAccount?.accountName ||
        transfer.toCashAccount?.accountName ||
        "Unknown"
      }`,
      amount: transfer.amount,
      account:
        transfer.toBankAccount?.accountName ||
        transfer.toCashAccount?.accountName ||
        transfer.fromBankAccount?.accountName ||
        transfer.fromCashAccount?.accountName ||
        "N/A",
      note: transfer.description || transfer.reference || "",
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
