import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { buildMobileAdminProfile } from "@/lib/mobile-admin-access";
import { resolveInquiryAccessContext } from "@/lib/inquiry-access";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";

export const dynamic = "force-dynamic";

type Summary = { label: string; value: string | number; tone?: "ok" | "warn" | "bad" };
type Row = { id: string; title: string; subtitle?: string | null; amount?: number | null; status?: string | null };

async function requireReportsRead(userId: string) {
  const [member, access] = await Promise.all([
    prismadb.organizationMember.findFirst({
      where: { userId, isActive: true },
      select: { role: true },
    }),
    resolveInquiryAccessContext(userId),
  ]);
  const profile = buildMobileAdminProfile(member?.role ?? null, access.isAssociate);
  if (!profile.permissions.includes("reports.read")) {
    return { ok: false as const, response: new NextResponse("Forbidden", { status: 403 }) };
  }
  return { ok: true as const };
}

function n(value: number | null | undefined): number {
  return Number.isFinite(value ?? NaN) ? Number(value) : 0;
}

function iso(value: Date | string | null | undefined): string | null {
  return value instanceof Date ? value.toISOString() : value ? String(value) : null;
}

function sinceFrom(req: Request) {
  const { searchParams } = new URL(req.url);
  const days = Math.min(Math.max(Number.parseInt(searchParams.get("days") ?? "90", 10) || 90, 1), 730);
  const since = new Date();
  since.setDate(since.getDate() - days);
  return { days, since };
}

async function upcomingTrips(): Promise<{ summary: Summary[]; rows: Row[] }> {
  const today = new Date();
  const rows = await prismadb.tourPackageQuery.findMany({
    where: { isFeatured: true, isArchived: false, tourStartsFrom: { gte: today } },
    select: {
      id: true,
      tourPackageQueryNumber: true,
      tourPackageQueryName: true,
      customerName: true,
      tourStartsFrom: true,
      tourEndsOn: true,
      totalPrice: true,
    },
    orderBy: { tourStartsFrom: "asc" },
    take: 50,
  });
  return {
    summary: [{ label: "Upcoming trips", value: rows.length, tone: "ok" }],
    rows: rows.map((r) => ({
      id: r.id,
      title: r.tourPackageQueryName || r.tourPackageQueryNumber || "Trip",
      subtitle: `${r.customerName ?? "Customer TBD"} - ${iso(r.tourStartsFrom)?.slice(0, 10) ?? "Date TBD"}`,
      amount: typeof r.totalPrice === "string" ? Number.parseFloat(r.totalPrice) : (r.totalPrice as any),
      status: "confirmed",
    })),
  };
}

async function queryList(confirmed: boolean): Promise<{ summary: Summary[]; rows: Row[] }> {
  const rows = await prismadb.tourPackageQuery.findMany({
    where: { isFeatured: confirmed, isArchived: false },
    select: {
      id: true,
      tourPackageQueryNumber: true,
      tourPackageQueryName: true,
      customerName: true,
      tourStartsFrom: true,
      totalPrice: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 75,
  });
  return {
    summary: [{ label: confirmed ? "Confirmed queries" : "Unconfirmed queries", value: rows.length }],
    rows: rows.map((r) => ({
      id: r.id,
      title: r.tourPackageQueryName || r.tourPackageQueryNumber || "Query",
      subtitle: `${r.customerName ?? "Customer TBD"} - ${iso(r.tourStartsFrom)?.slice(0, 10) ?? "Date TBD"}`,
      amount: typeof r.totalPrice === "string" ? Number.parseFloat(r.totalPrice) : (r.totalPrice as any),
      status: confirmed ? "confirmed" : "draft",
    })),
  };
}

async function inquirySummary(since: Date): Promise<{ summary: Summary[]; rows: Row[] }> {
  const grouped = await prismadb.inquiry.groupBy({
    by: ["status"],
    where: { createdAt: { gte: since } },
    _count: { _all: true },
  });
  const total = grouped.reduce((sum, row) => sum + row._count._all, 0);
  return {
    summary: [{ label: "Inquiries", value: total }],
    rows: grouped.map((row) => ({
      id: row.status || "unknown",
      title: row.status || "Unknown",
      subtitle: `${row._count._all} inquiry(s)`,
      amount: row._count._all,
    })),
  };
}

async function associatePerformance(since: Date): Promise<{ summary: Summary[]; rows: Row[] }> {
  const rows = await prismadb.inquiry.findMany({
    where: { createdAt: { gte: since } },
    select: {
      id: true,
      status: true,
      associatePartnerId: true,
      associatePartner: { select: { name: true } },
    },
  });
  const map = new Map<string, { name: string; total: number; confirmed: number }>();
  for (const row of rows) {
    const id = row.associatePartnerId || "unassigned";
    const current = map.get(id) ?? {
      name: row.associatePartner?.name || "Unassigned",
      total: 0,
      confirmed: 0,
    };
    current.total += 1;
    if (String(row.status).toLowerCase().includes("confirm")) current.confirmed += 1;
    map.set(id, current);
  }
  const out = Array.from(map.entries()).map(([id, v]) => ({
    id,
    title: v.name,
    subtitle: `${v.confirmed}/${v.total} confirmed`,
    amount: v.total,
    status: `${Math.round((v.confirmed / Math.max(v.total, 1)) * 100)}%`,
  }));
  return {
    summary: [{ label: "Associates", value: out.length }],
    rows: out.sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0)),
  };
}

async function profit(since: Date): Promise<{ summary: Summary[]; rows: Row[] }> {
  const [sales, purchases, expenses, incomes] = await Promise.all([
    prismadb.saleDetail.aggregate({ where: { saleDate: { gte: since } }, _sum: { salePrice: true, gstAmount: true } }),
    prismadb.purchaseDetail.aggregate({ where: { purchaseDate: { gte: since } }, _sum: { netPayable: true, price: true, gstAmount: true } }),
    prismadb.expenseDetail.aggregate({ where: { expenseDate: { gte: since } }, _sum: { amount: true } }),
    prismadb.incomeDetail.aggregate({ where: { incomeDate: { gte: since } }, _sum: { amount: true } }),
  ]);
  const revenue = n(sales._sum.salePrice) + n(sales._sum.gstAmount) + n(incomes._sum.amount);
  const cost = (n(purchases._sum.netPayable) || n(purchases._sum.price) + n(purchases._sum.gstAmount)) + n(expenses._sum.amount);
  return {
    summary: [
      { label: "Revenue", value: revenue, tone: "ok" },
      { label: "Cost", value: cost, tone: "warn" },
      { label: "Profit", value: revenue - cost, tone: revenue - cost >= 0 ? "ok" : "bad" },
    ],
    rows: [
      { id: "sales", title: "Sales and income", amount: revenue },
      { id: "purchases", title: "Purchases and expenses", amount: cost },
      { id: "profit", title: "Net profit", amount: revenue - cost },
    ],
  };
}

async function gst(since: Date): Promise<{ summary: Summary[]; rows: Row[] }> {
  const [sales, purchases] = await Promise.all([
    prismadb.saleDetail.aggregate({ where: { saleDate: { gte: since } }, _sum: { gstAmount: true } }),
    prismadb.purchaseDetail.aggregate({ where: { purchaseDate: { gte: since } }, _sum: { gstAmount: true } }),
  ]);
  const out = n(sales._sum.gstAmount);
  const input = n(purchases._sum.gstAmount);
  return {
    summary: [
      { label: "Output GST", value: out, tone: "warn" },
      { label: "Input GST", value: input, tone: "ok" },
      { label: "Net GST", value: out - input, tone: out - input >= 0 ? "warn" : "ok" },
    ],
    rows: [
      { id: "output", title: "Output GST", amount: out },
      { id: "input", title: "Input GST", amount: input },
      { id: "net", title: "Net GST", amount: out - input },
    ],
  };
}

async function tds(): Promise<{ summary: Summary[]; rows: Row[] }> {
  const grouped = await prismadb.tDSTransaction.groupBy({
    by: ["status"],
    _sum: { tdsAmount: true },
    _count: { _all: true },
  });
  return {
    summary: [{ label: "TDS transactions", value: grouped.reduce((s, r) => s + r._count._all, 0) }],
    rows: grouped.map((r) => ({
      id: r.status,
      title: r.status,
      subtitle: `${r._count._all} transaction(s)`,
      amount: n(r._sum.tdsAmount),
    })),
  };
}

async function statements(kind: "customer-statements" | "supplier-statements"): Promise<{ summary: Summary[]; rows: Row[] }> {
  if (kind === "customer-statements") {
    const rows = await prismadb.customer.findMany({
      select: { id: true, name: true, contact: true, saleDetails: { select: { salePrice: true, gstAmount: true } }, receiptDetails: { select: { amount: true } } },
      take: 50,
      orderBy: { updatedAt: "desc" as any },
    } as any);
    return {
      summary: [{ label: "Customers", value: rows.length }],
      rows: rows.map((c: any) => {
        const sold = (c.saleDetails ?? []).reduce((s: number, x: any) => s + n(x.salePrice) + n(x.gstAmount), 0);
        const received = (c.receiptDetails ?? []).reduce((s: number, x: any) => s + n(x.amount), 0);
        return { id: c.id, title: c.name, subtitle: c.contact, amount: sold - received };
      }),
    };
  }
  const rows = await prismadb.supplier.findMany({
    select: { id: true, name: true, contact: true, purchaseDetails: { select: { price: true, gstAmount: true, netPayable: true } }, paymentDetails: { select: { amount: true } } },
    take: 50,
    orderBy: { updatedAt: "desc" as any },
  } as any);
  return {
    summary: [{ label: "Suppliers", value: rows.length }],
    rows: rows.map((s: any) => {
      const bought = (s.purchaseDetails ?? []).reduce((sum: number, x: any) => sum + (n(x.netPayable) || n(x.price) + n(x.gstAmount)), 0);
      const paid = (s.paymentDetails ?? []).reduce((sum: number, x: any) => sum + n(x.amount), 0);
      return { id: s.id, title: s.name, subtitle: s.contact, amount: bought - paid };
    }),
  };
}

async function book(kind: "bank-book" | "cash-book"): Promise<{ summary: Summary[]; rows: Row[] }> {
  if (kind === "bank-book") {
    const rows = await prismadb.bankAccount.findMany({ where: { isActive: true }, orderBy: { bankName: "asc" } });
    return {
      summary: [{ label: "Bank accounts", value: rows.length }],
      rows: rows.map((r) => ({ id: r.id, title: r.accountName, subtitle: r.bankName, amount: r.currentBalance })),
    };
  }
  const rows = await prismadb.cashAccount.findMany({ where: { isActive: true }, orderBy: { accountName: "asc" } });
  return {
    summary: [{ label: "Cash accounts", value: rows.length }],
    rows: rows.map((r) => ({ id: r.id, title: r.accountName, subtitle: "Cash", amount: r.currentBalance })),
  };
}

const TITLES: Record<string, string> = {
  "upcoming-trips": "Upcoming Trips",
  "inquiry-summary": "Inquiry Summary",
  "confirmed-queries": "Confirmed Queries",
  "unconfirmed-queries": "Unconfirmed Queries",
  "associate-performance": "Associate Performance",
  profit: "Profit",
  gst: "GST",
  tds: "TDS",
  "customer-statements": "Customer Statements",
  "supplier-statements": "Supplier Statements",
  "bank-book": "Bank Book",
  "cash-book": "Cash Book",
};

export async function GET(
  req: Request,
  props: { params: Promise<{ kind: string }> }
) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireReportsRead(userId);
    if (!guard.ok) return guard.response;

    const { days, since } = sinceFrom(req);
    let report: { summary: Summary[]; rows: Row[] };
    switch (params.kind) {
      case "upcoming-trips":
        report = await upcomingTrips();
        break;
      case "inquiry-summary":
        report = await inquirySummary(since);
        break;
      case "confirmed-queries":
        report = await queryList(true);
        break;
      case "unconfirmed-queries":
        report = await queryList(false);
        break;
      case "associate-performance":
        report = await associatePerformance(since);
        break;
      case "profit":
        report = await profit(since);
        break;
      case "gst":
        report = await gst(since);
        break;
      case "tds":
        report = await tds();
        break;
      case "customer-statements":
      case "supplier-statements":
        report = await statements(params.kind);
        break;
      case "bank-book":
      case "cash-book":
        report = await book(params.kind);
        break;
      default:
        return NextResponse.json({ error: "Unknown report" }, { status: 404 });
    }

    return NextResponse.json({
      kind: params.kind,
      title: TITLES[params.kind] ?? params.kind,
      windowDays: days,
      generatedAt: new Date().toISOString(),
      ...report,
    });
  } catch (error) {
    console.log("[MOBILE_REPORT_DETAIL]", params.kind, error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
