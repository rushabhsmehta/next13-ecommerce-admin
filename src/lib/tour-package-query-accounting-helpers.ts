export type AccountingAccountRoutingInput = {
  accountType?: "bank" | "cash" | "unknown";
  accountId?: string | null;
  bankAccountId?: string | null;
  cashAccountId?: string | null;
};

export function resolveAccountingAccountFields(detail: AccountingAccountRoutingInput) {
  if (detail.accountType === "bank") {
    return {
      bankAccountId: detail.accountId || detail.bankAccountId || null,
      cashAccountId: null,
    };
  }

  if (detail.accountType === "cash") {
    return {
      bankAccountId: null,
      cashAccountId: detail.accountId || detail.cashAccountId || null,
    };
  }

  return {
    bankAccountId: detail.bankAccountId || null,
    cashAccountId: detail.cashAccountId || null,
  };
}
