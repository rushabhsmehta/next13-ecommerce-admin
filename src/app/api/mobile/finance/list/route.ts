import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";

export const dynamic = "force-dynamic";

type FinanceType = "sales" | "purchases" | "receipts" | "payments" | "expenses" | "incomes";

const ALLOWED: FinanceType[] = [
  "sales",
  "purchases",
  "receipts",
  "payments",
  "expenses",
  "incomes",
];

interface FinanceItem {
  id: string;
  title: string;
  subtitle?: string;
  amount: number;
  date: string;
  status?: string | null;
  reference?: string | null;
}

/**
 * Read-only unified list for finance transactions on mobile.
 *   ?type=sales|purchases|receipts|payments|expenses|incomes
 *   &search=...
 *   &days=30 (default 90)
 *   &limit=25 (default 25, max 100)
 *   &offset=0
 */
export async function GET(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(req.url);
    const type = (searchParams.get("type") ?? "sales").toLowerCase() as FinanceType;
    if (!ALLOWED.includes(type)) {
      return NextResponse.json({ error: `Invalid type: ${type}` }, { status: 400 });
    }
    const search = searchParams.get("search")?.trim() ?? "";
    const days = Math.min(Math.max(Number.parseInt(searchParams.get("days") ?? "90", 10) || 90, 1), 365);
    const limitRaw = Number.parseInt(searchParams.get("limit") ?? "25", 10);
    const offsetRaw = Number.parseInt(searchParams.get("offset") ?? "0", 10);
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 25, 1), 100);
    const offset = Math.max(Number.isFinite(offsetRaw) ? offsetRaw : 0, 0);

    const since = new Date();
    since.setDate(since.getDate() - days);

    let items: FinanceItem[] = [];
    let total = 0;
    let totalAmount = 0;

    if (type === "sales") {
      const where: Record<string, unknown> = { saleDate: { gte: since } };
      if (search) {
        where.OR = [
          { invoiceNumber: { contains: search } },
          { customer: { name: { contains: search } } },
          { description: { contains: search } },
        ];
      }
      const [rows, count, sum] = await Promise.all([
        prismadb.saleDetail.findMany({
          where,
          select: {
            id: true,
            saleDate: true,
            salePrice: true,
            gstAmount: true,
            status: true,
            invoiceNumber: true,
            description: true,
            customer: { select: { name: true } },
          },
          orderBy: { saleDate: "desc" },
          skip: offset,
          take: limit,
        }),
        prismadb.saleDetail.count({ where }),
        prismadb.saleDetail.aggregate({ where, _sum: { salePrice: true, gstAmount: true } }),
      ]);
      items = rows.map((r) => ({
        id: r.id,
        title: r.customer?.name ?? r.invoiceNumber ?? "Sale",
        subtitle: r.invoiceNumber ?? r.description ?? undefined,
        amount: (r.salePrice ?? 0) + (r.gstAmount ?? 0),
        date: r.saleDate.toISOString(),
        status: r.status ?? null,
        reference: r.invoiceNumber ?? null,
      }));
      total = count;
      totalAmount = (sum._sum.salePrice ?? 0) + (sum._sum.gstAmount ?? 0);
    } else if (type === "purchases") {
      const where: Record<string, unknown> = { purchaseDate: { gte: since } };
      if (search) {
        where.OR = [
          { billNumber: { contains: search } },
          { supplier: { name: { contains: search } } },
          { description: { contains: search } },
        ];
      }
      const [rows, count, sum] = await Promise.all([
        prismadb.purchaseDetail.findMany({
          where,
          select: {
            id: true,
            purchaseDate: true,
            price: true,
            gstAmount: true,
            netPayable: true,
            status: true,
            billNumber: true,
            description: true,
            supplier: { select: { name: true } },
          },
          orderBy: { purchaseDate: "desc" },
          skip: offset,
          take: limit,
        }),
        prismadb.purchaseDetail.count({ where }),
        prismadb.purchaseDetail.aggregate({ where, _sum: { price: true, gstAmount: true } }),
      ]);
      items = rows.map((r) => ({
        id: r.id,
        title: r.supplier?.name ?? r.billNumber ?? "Purchase",
        subtitle: r.billNumber ?? r.description ?? undefined,
        amount: r.netPayable ?? r.price + (r.gstAmount ?? 0),
        date: r.purchaseDate.toISOString(),
        status: r.status ?? null,
        reference: r.billNumber ?? null,
      }));
      total = count;
      totalAmount = (sum._sum.price ?? 0) + (sum._sum.gstAmount ?? 0);
    } else if (type === "receipts") {
      const where: Record<string, unknown> = { receiptDate: { gte: since } };
      if (search) {
        where.OR = [
          { reference: { contains: search } },
          { customer: { name: { contains: search } } },
          { note: { contains: search } },
        ];
      }
      const [rows, count, sum] = await Promise.all([
        prismadb.receiptDetail.findMany({
          where,
          select: {
            id: true,
            receiptDate: true,
            amount: true,
            reference: true,
            note: true,
            receiptType: true,
            customer: { select: { name: true } },
            bankAccount: { select: { accountName: true } },
            cashAccount: { select: { accountName: true } },
          },
          orderBy: { receiptDate: "desc" },
          skip: offset,
          take: limit,
        }),
        prismadb.receiptDetail.count({ where }),
        prismadb.receiptDetail.aggregate({ where, _sum: { amount: true } }),
      ]);
      items = rows.map((r) => ({
        id: r.id,
        title: r.customer?.name ?? r.reference ?? "Receipt",
        subtitle:
          r.bankAccount?.accountName ??
          r.cashAccount?.accountName ??
          r.note ??
          undefined,
        amount: r.amount,
        date: r.receiptDate.toISOString(),
        status: r.receiptType ?? null,
        reference: r.reference ?? null,
      }));
      total = count;
      totalAmount = sum._sum.amount ?? 0;
    } else if (type === "payments") {
      const where: Record<string, unknown> = { paymentDate: { gte: since } };
      if (search) {
        where.OR = [
          { transactionId: { contains: search } },
          { supplier: { name: { contains: search } } },
          { note: { contains: search } },
        ];
      }
      const [rows, count, sum] = await Promise.all([
        prismadb.paymentDetail.findMany({
          where,
          select: {
            id: true,
            paymentDate: true,
            amount: true,
            method: true,
            transactionId: true,
            note: true,
            paymentType: true,
            supplier: { select: { name: true } },
            customer: { select: { name: true } },
            bankAccount: { select: { accountName: true } },
            cashAccount: { select: { accountName: true } },
          },
          orderBy: { paymentDate: "desc" },
          skip: offset,
          take: limit,
        }),
        prismadb.paymentDetail.count({ where }),
        prismadb.paymentDetail.aggregate({ where, _sum: { amount: true } }),
      ]);
      items = rows.map((r) => ({
        id: r.id,
        title: r.supplier?.name ?? r.customer?.name ?? r.transactionId ?? "Payment",
        subtitle:
          r.bankAccount?.accountName ??
          r.cashAccount?.accountName ??
          r.method ??
          undefined,
        amount: r.amount,
        date: r.paymentDate.toISOString(),
        status: r.paymentType ?? null,
        reference: r.transactionId ?? null,
      }));
      total = count;
      totalAmount = sum._sum.amount ?? 0;
    } else if (type === "expenses") {
      const where: Record<string, unknown> = { expenseDate: { gte: since } };
      if (search) {
        where.OR = [
          { description: { contains: search } },
          { expenseCategory: { name: { contains: search } } },
        ];
      }
      const [rows, count, sum] = await Promise.all([
        prismadb.expenseDetail.findMany({
          where,
          select: {
            id: true,
            expenseDate: true,
            amount: true,
            description: true,
            isAccrued: true,
            expenseCategory: { select: { name: true } },
            bankAccount: { select: { accountName: true } },
            cashAccount: { select: { accountName: true } },
          },
          orderBy: { expenseDate: "desc" },
          skip: offset,
          take: limit,
        }),
        prismadb.expenseDetail.count({ where }),
        prismadb.expenseDetail.aggregate({ where, _sum: { amount: true } }),
      ]);
      items = rows.map((r) => ({
        id: r.id,
        title: r.expenseCategory?.name ?? r.description ?? "Expense",
        subtitle:
          r.bankAccount?.accountName ?? r.cashAccount?.accountName ?? r.description ?? undefined,
        amount: r.amount,
        date: r.expenseDate.toISOString(),
        status: r.isAccrued ? "Accrued" : "Paid",
      }));
      total = count;
      totalAmount = sum._sum.amount ?? 0;
    } else if (type === "incomes") {
      const where: Record<string, unknown> = { incomeDate: { gte: since } };
      if (search) {
        where.OR = [
          { description: { contains: search } },
          { incomeCategory: { name: { contains: search } } },
        ];
      }
      const [rows, count, sum] = await Promise.all([
        prismadb.incomeDetail.findMany({
          where,
          select: {
            id: true,
            incomeDate: true,
            amount: true,
            description: true,
            incomeCategory: { select: { name: true } },
            bankAccount: { select: { accountName: true } },
            cashAccount: { select: { accountName: true } },
          },
          orderBy: { incomeDate: "desc" },
          skip: offset,
          take: limit,
        }),
        prismadb.incomeDetail.count({ where }),
        prismadb.incomeDetail.aggregate({ where, _sum: { amount: true } }),
      ]);
      items = rows.map((r) => ({
        id: r.id,
        title: r.incomeCategory?.name ?? r.description ?? "Income",
        subtitle:
          r.bankAccount?.accountName ?? r.cashAccount?.accountName ?? r.description ?? undefined,
        amount: r.amount,
        date: r.incomeDate.toISOString(),
      }));
      total = count;
      totalAmount = sum._sum.amount ?? 0;
    }

    return NextResponse.json({
      type,
      items,
      total,
      totalAmount,
      hasMore: offset + items.length < total,
      nextOffset: offset + items.length,
    });
  } catch (error) {
    console.log("[MOBILE_FINANCE_LIST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
