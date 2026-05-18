import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { buildMobileAdminProfile } from "@/lib/mobile-admin-access";
import { resolveInquiryAccessContext } from "@/lib/inquiry-access";
import {
  getBankAccountTransactions,
  getCashAccountTransactions,
} from "@/lib/transaction-service";

export const dynamic = "force-dynamic";

async function requireFinanceRead(userId: string) {
  const [membership, inquiryAccess] = await Promise.all([
    prismadb.organizationMember.findFirst({
      where: { userId, isActive: true },
      select: { role: true },
    }),
    resolveInquiryAccessContext(userId),
  ]);
  return buildMobileAdminProfile(
    membership?.role ?? null,
    inquiryAccess.isAssociate
  ).permissions.includes("finance.read");
}

/**
 * Account detail: authoritative balance + recent transactions (most recent
 * 25). `?kind=bank|cash` selects the account type. Read-only.
 */
export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    if (!(await requireFinanceRead(userId))) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    if (!params.id) return new NextResponse("Missing id", { status: 400 });

    const { searchParams } = new URL(req.url);
    const kind = searchParams.get("kind") === "cash" ? "cash" : "bank";

    if (kind === "bank") {
      const acct = await prismadb.bankAccount.findUnique({
        where: { id: params.id },
        select: {
          id: true,
          accountName: true,
          bankName: true,
          accountNumber: true,
          openingBalance: true,
          currentBalance: true,
        },
      });
      if (!acct) return new NextResponse("Not found", { status: 404 });
      const txns = await getBankAccountTransactions(params.id);
      return NextResponse.json({
        account: { ...acct, kind: "bank" },
        transactions: txns.slice(0, 25),
      });
    }

    const acct = await prismadb.cashAccount.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        accountName: true,
        openingBalance: true,
        currentBalance: true,
      },
    });
    if (!acct) return new NextResponse("Not found", { status: 404 });
    const txns = await getCashAccountTransactions(params.id);
    return NextResponse.json({
      account: { ...acct, kind: "cash" },
      transactions: txns.slice(0, 25),
    });
  } catch (error) {
    console.log("[MOBILE_FINANCE_ACCOUNT_DETAIL]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
