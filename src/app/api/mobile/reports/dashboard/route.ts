import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";

export const dynamic = "force-dynamic";

/**
 * Mobile dashboard reports — KPIs aggregated over a configurable window.
 *   ?days=30 (default 30, max 365)
 */
export async function GET(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(req.url);
    const days = Math.min(
      Math.max(Number.parseInt(searchParams.get("days") ?? "30", 10) || 30, 1),
      365
    );
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [
      inquiriesByStatus,
      tourQueryCount,
      tourQueryConfirmedCount,
      saleAgg,
      purchaseAgg,
      receiptAgg,
      paymentAgg,
      expenseAgg,
      incomeAgg,
      receiptAllocSum,
      paymentAllocSum,
      saleTotalsAll,
      purchaseTotalsAll,
      bankBalances,
      cashBalances,
    ] = await Promise.all([
      prismadb.inquiry.groupBy({
        by: ["status"],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
      }),
      prismadb.tourPackageQuery.count({
        where: { createdAt: { gte: since }, isArchived: false },
      }),
      prismadb.tourPackageQuery.count({
        where: { createdAt: { gte: since }, isFeatured: true, isArchived: false },
      }),
      prismadb.saleDetail.aggregate({
        where: { saleDate: { gte: since } },
        _sum: { salePrice: true, gstAmount: true },
        _count: { _all: true },
      }),
      prismadb.purchaseDetail.aggregate({
        where: { purchaseDate: { gte: since } },
        _sum: { price: true, gstAmount: true, netPayable: true },
        _count: { _all: true },
      }),
      prismadb.receiptDetail.aggregate({
        where: { receiptDate: { gte: since } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prismadb.paymentDetail.aggregate({
        where: { paymentDate: { gte: since } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prismadb.expenseDetail.aggregate({
        where: { expenseDate: { gte: since } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prismadb.incomeDetail.aggregate({
        where: { incomeDate: { gte: since } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prismadb.receiptSaleAllocation.aggregate({
        _sum: { allocatedAmount: true },
      }),
      prismadb.paymentPurchaseAllocation.aggregate({
        _sum: { allocatedAmount: true },
      }),
      prismadb.saleDetail.aggregate({
        _sum: { salePrice: true, gstAmount: true },
      }),
      prismadb.purchaseDetail.aggregate({
        _sum: { price: true, gstAmount: true, netPayable: true },
      }),
      prismadb.bankAccount.aggregate({
        where: { isActive: true },
        _sum: { currentBalance: true },
        _count: { _all: true },
      }),
      prismadb.cashAccount.aggregate({
        where: { isActive: true },
        _sum: { currentBalance: true },
        _count: { _all: true },
      }),
    ]);

    const inquiriesByStatusMap: Record<string, number> = {};
    let inquiryTotal = 0;
    for (const row of inquiriesByStatus) {
      const status = (row.status || "unknown").toUpperCase();
      inquiriesByStatusMap[status] = row._count._all;
      inquiryTotal += row._count._all;
    }

    const salesTotal = (saleAgg._sum.salePrice ?? 0) + (saleAgg._sum.gstAmount ?? 0);
    const purchasesTotal =
      (purchaseAgg._sum.netPayable ?? 0) ||
      (purchaseAgg._sum.price ?? 0) + (purchaseAgg._sum.gstAmount ?? 0);

    const allSalesTotal =
      (saleTotalsAll._sum.salePrice ?? 0) + (saleTotalsAll._sum.gstAmount ?? 0);
    const allPurchasesTotal =
      (purchaseTotalsAll._sum.netPayable ?? 0) ||
      (purchaseTotalsAll._sum.price ?? 0) + (purchaseTotalsAll._sum.gstAmount ?? 0);

    const outstandingReceivables = Math.max(
      allSalesTotal - (receiptAllocSum._sum.allocatedAmount ?? 0),
      0
    );
    const outstandingPayables = Math.max(
      allPurchasesTotal - (paymentAllocSum._sum.allocatedAmount ?? 0),
      0
    );

    return NextResponse.json({
      windowDays: days,
      since: since.toISOString(),
      inquiries: {
        total: inquiryTotal,
        byStatus: inquiriesByStatusMap,
      },
      tourQueries: {
        total: tourQueryCount,
        confirmed: tourQueryConfirmedCount,
      },
      sales: {
        count: saleAgg._count._all,
        amount: salesTotal,
      },
      purchases: {
        count: purchaseAgg._count._all,
        amount: purchasesTotal,
      },
      receipts: {
        count: receiptAgg._count._all,
        amount: receiptAgg._sum.amount ?? 0,
      },
      payments: {
        count: paymentAgg._count._all,
        amount: paymentAgg._sum.amount ?? 0,
      },
      expenses: {
        count: expenseAgg._count._all,
        amount: expenseAgg._sum.amount ?? 0,
      },
      incomes: {
        count: incomeAgg._count._all,
        amount: incomeAgg._sum.amount ?? 0,
      },
      outstanding: {
        receivables: outstandingReceivables,
        payables: outstandingPayables,
      },
      balances: {
        bankCount: bankBalances._count._all,
        bank: bankBalances._sum.currentBalance ?? 0,
        cashCount: cashBalances._count._all,
        cash: cashBalances._sum.currentBalance ?? 0,
        total: (bankBalances._sum.currentBalance ?? 0) + (cashBalances._sum.currentBalance ?? 0),
      },
    });
  } catch (error) {
    console.log("[MOBILE_REPORTS_DASHBOARD]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
