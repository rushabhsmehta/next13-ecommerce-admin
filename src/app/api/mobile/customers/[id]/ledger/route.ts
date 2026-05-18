import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  assertCrmApiAccessForRequest,
  crmAccessErrorResponse,
} from "@/lib/crm-route-access";

export const dynamic = "force-dynamic";

/**
 * Mobile customer ledger: returns a chronological transaction stream (sales,
 * sale returns, receipts) with a running balance and aggregate totals. Mirrors
 * the dashboard ledger at `/customers/[customerId]/ledger` but trimmed to the
 * fields a mobile screen needs.
 */
export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    try {
      await assertCrmApiAccessForRequest(userId, req.url);
    } catch (e) {
      const denied = crmAccessErrorResponse(e);
      if (denied) return denied;
      throw e;
    }

    if (!params.id) {
      return new NextResponse("Customer ID is required", { status: 400 });
    }

    const customer = await prismadb.customer.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, contact: true, email: true },
    });
    if (!customer) return new NextResponse("Not found", { status: 404 });

    const [sales, receipts] = await Promise.all([
      prismadb.saleDetail.findMany({
        where: { customerId: params.id },
        select: {
          id: true,
          invoiceNumber: true,
          salePrice: true,
          gstAmount: true,
          status: true,
          saleDate: true,
          tourPackageQuery: { select: { id: true, tourPackageQueryName: true } },
          saleReturns: {
            select: {
              id: true,
              reference: true,
              amount: true,
              gstAmount: true,
              returnDate: true,
              status: true,
            },
          },
        },
        orderBy: { saleDate: "asc" },
      }),
      prismadb.receiptDetail.findMany({
        where: { customerId: params.id },
        select: {
          id: true,
          reference: true,
          amount: true,
          receiptDate: true,
          tourPackageQuery: { select: { id: true, tourPackageQueryName: true } },
          bankAccount: { select: { id: true, accountName: true } },
          cashAccount: { select: { id: true, accountName: true } },
        },
        orderBy: { receiptDate: "asc" },
      }),
    ]);

    type LedgerEntry = {
      id: string;
      date: Date;
      type: "Sale" | "Sale Return" | "Receipt";
      description: string;
      debit: number;
      credit: number;
      balance: number;
      status: string;
      reference: string;
      packageId: string | null;
      packageName: string | null;
    };

    const entries: LedgerEntry[] = [];

    for (const sale of sales) {
      const gst = Number(sale.gstAmount ?? 0);
      const total = Number(sale.salePrice ?? 0) + gst;
      entries.push({
        id: sale.id,
        date: sale.saleDate,
        type: "Sale",
        description: sale.tourPackageQuery?.tourPackageQueryName
          ? `Sale for ${sale.tourPackageQuery.tourPackageQueryName}`
          : `Invoice ${sale.invoiceNumber || "#" + sale.id.substring(0, 8)}`,
        debit: total,
        credit: 0,
        balance: 0,
        status: sale.status ?? "pending",
        reference: sale.invoiceNumber ?? "",
        packageId: sale.tourPackageQuery?.id ?? null,
        packageName: sale.tourPackageQuery?.tourPackageQueryName ?? null,
      });

      for (const ret of sale.saleReturns) {
        const retGst = Number(ret.gstAmount ?? 0);
        const retTotal = Number(ret.amount ?? 0) + retGst;
        entries.push({
          id: ret.id,
          date: ret.returnDate,
          type: "Sale Return",
          description: sale.tourPackageQuery?.tourPackageQueryName
            ? `Return for ${sale.tourPackageQuery.tourPackageQueryName}`
            : `Return ${ret.reference || "#" + ret.id.substring(0, 8)}`,
          debit: 0,
          credit: retTotal,
          balance: 0,
          status: ret.status ?? "completed",
          reference: ret.reference ?? "",
          packageId: sale.tourPackageQuery?.id ?? null,
          packageName: sale.tourPackageQuery?.tourPackageQueryName ?? null,
        });
      }
    }

    for (const receipt of receipts) {
      entries.push({
        id: receipt.id,
        date: receipt.receiptDate,
        type: "Receipt",
        description: receipt.tourPackageQuery?.tourPackageQueryName
          ? `Payment for ${receipt.tourPackageQuery.tourPackageQueryName}`
          : `Receipt ${receipt.reference || "#" + receipt.id.substring(0, 8)}`,
        debit: 0,
        credit: Number(receipt.amount ?? 0),
        balance: 0,
        status: "completed",
        reference: receipt.reference ?? "",
        packageId: receipt.tourPackageQuery?.id ?? null,
        packageName: receipt.tourPackageQuery?.tourPackageQueryName ?? null,
      });
    }

    entries.sort((a, b) => a.date.getTime() - b.date.getTime());

    let running = 0;
    const transactions = entries.map((e) => {
      running += e.debit - e.credit;
      return { ...e, date: e.date.toISOString(), balance: running };
    });

    const totalSales = sales.reduce(
      (acc, s) => acc + Number(s.salePrice ?? 0) + Number(s.gstAmount ?? 0),
      0
    );
    const totalReturns = sales.reduce(
      (acc, s) =>
        acc +
        s.saleReturns.reduce(
          (rAcc, r) => rAcc + Number(r.amount ?? 0) + Number(r.gstAmount ?? 0),
          0
        ),
      0
    );
    const totalReceipts = receipts.reduce(
      (acc, r) => acc + Number(r.amount ?? 0),
      0
    );

    return NextResponse.json({
      customer,
      transactions,
      summary: {
        totalSales,
        totalReturns,
        totalReceipts,
        currentBalance: totalSales - totalReturns - totalReceipts,
      },
    });
  } catch (error) {
    console.log("[MOBILE_CUSTOMER_LEDGER]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
