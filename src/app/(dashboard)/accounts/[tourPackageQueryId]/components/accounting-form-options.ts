export type AccountingSelectOption = {
  id: string;
  name: string;
  contact?: string | null;
};

export type AccountingAccountOption = {
  id: string;
  displayName: string;
  type: "bank" | "cash";
  accountName: string;
  bankName?: string;
};

export type AccountingFormBootstrapData = {
  suppliers: AccountingSelectOption[];
  customers: AccountingSelectOption[];
  allAccounts: AccountingAccountOption[];
  expenseCategories: AccountingSelectOption[];
  incomeCategories: AccountingSelectOption[];
};

export function buildAccountingAccountOptions(
  bankAccounts: Array<{ id: string; accountName: string; bankName: string }> = [],
  cashAccounts: Array<{ id: string; accountName: string }> = []
): AccountingAccountOption[] {
  return [
    ...bankAccounts.map((account) => ({
      id: account.id,
      displayName: account.accountName,
      type: "bank" as const,
      accountName: account.accountName,
      bankName: account.bankName,
    })),
    ...cashAccounts.map((account) => ({
      id: account.id,
      displayName: account.accountName,
      type: "cash" as const,
      accountName: account.accountName,
    })),
  ];
}
