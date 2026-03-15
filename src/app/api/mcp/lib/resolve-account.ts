import prismadb from "@/lib/prismadb";
import { McpError, NotFoundError } from "./errors";

export type ResolvedAccount = { type: "bank"; id: string } | { type: "cash"; id: string };

export async function resolveAccount(opts: {
  bankAccountId?: string;
  bankAccountName?: string;
  cashAccountId?: string;
  cashAccountName?: string;
}): Promise<ResolvedAccount> {
  const { bankAccountId, bankAccountName, cashAccountId, cashAccountName } = opts;

  if (bankAccountId) {
    const acct = await prismadb.bankAccount.findUnique({ where: { id: bankAccountId }, select: { id: true } });
    if (!acct) throw new NotFoundError(`Bank account "${bankAccountId}" not found`, "ACCOUNT_NOT_FOUND");
    return { type: "bank", id: acct.id };
  }
  if (cashAccountId) {
    const acct = await prismadb.cashAccount.findUnique({ where: { id: cashAccountId }, select: { id: true } });
    if (!acct) throw new NotFoundError(`Cash account "${cashAccountId}" not found`, "ACCOUNT_NOT_FOUND");
    return { type: "cash", id: acct.id };
  }
  if (bankAccountName) {
    const acct = await prismadb.bankAccount.findFirst({
      where: { accountName: { contains: bankAccountName }, isActive: true },
      select: { id: true },
    });
    if (!acct) throw new NotFoundError(`Bank account named "${bankAccountName}" not found`, "ACCOUNT_NOT_FOUND");
    return { type: "bank", id: acct.id };
  }
  if (cashAccountName) {
    const acct = await prismadb.cashAccount.findFirst({
      where: { accountName: { contains: cashAccountName }, isActive: true },
      select: { id: true },
    });
    if (!acct) throw new NotFoundError(`Cash account named "${cashAccountName}" not found`, "ACCOUNT_NOT_FOUND");
    return { type: "cash", id: acct.id };
  }
  throw new McpError("No account specified", "VALIDATION_ERROR", 400);
}
