import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { buildMobileAdminProfile } from "@/lib/mobile-admin-access";
import { resolveInquiryAccessContext } from "@/lib/inquiry-access";

export const dynamic = "force-dynamic";

async function requireFinanceRead(userId: string) {
  const [membership, inquiryAccess] = await Promise.all([
    prismadb.organizationMember.findFirst({
      where: { userId, isActive: true },
      select: { role: true },
    }),
    resolveInquiryAccessContext(userId),
  ]);
  const profile = buildMobileAdminProfile(
    membership?.role ?? null,
    inquiryAccess.isAssociate
  );
  return profile.permissions.includes("finance.read");
}

/**
 * Bank + cash account list with authoritative current balances. Read-only.
 * Requires finance.read.
 */
export async function GET(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    if (!(await requireFinanceRead(userId))) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const [bank, cash] = await Promise.all([
      prismadb.bankAccount.findMany({
        where: { isActive: true },
        select: {
          id: true,
          accountName: true,
          bankName: true,
          accountNumber: true,
          openingBalance: true,
          currentBalance: true,
        },
        orderBy: { accountName: "asc" },
      }),
      prismadb.cashAccount.findMany({
        where: { isActive: true },
        select: {
          id: true,
          accountName: true,
          openingBalance: true,
          currentBalance: true,
        },
        orderBy: { accountName: "asc" },
      }),
    ]);

    const accounts = [
      ...bank.map((b) => ({
        id: b.id,
        kind: "bank" as const,
        name: b.accountName,
        subtitle: `${b.bankName} · ${b.accountNumber}`,
        openingBalance: b.openingBalance,
        currentBalance: b.currentBalance,
      })),
      ...cash.map((c) => ({
        id: c.id,
        kind: "cash" as const,
        name: c.accountName,
        subtitle: "Cash account",
        openingBalance: c.openingBalance,
        currentBalance: c.currentBalance,
      })),
    ];

    const totalBalance = accounts.reduce(
      (s, a) => s + Number(a.currentBalance ?? 0),
      0
    );

    return NextResponse.json({ accounts, totalBalance });
  } catch (error) {
    console.log("[MOBILE_FINANCE_ACCOUNTS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
