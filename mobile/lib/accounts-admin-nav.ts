import type { Ionicons } from "@expo/vector-icons";

export type AccountsNavIcon = keyof typeof Ionicons.glyphMap;

export type AccountsNavItem = {
  id: string;
  title: string;
  subtitle?: string;
  icon: AccountsNavIcon;
  route: string;
  accent?: boolean;
};

export type AccountsNavSection = {
  id: string;
  title: string;
  items: AccountsNavItem[];
};

/** Mirrors web admin Finance sidebar — mobile routes only. */
export const ACCOUNTS_ADMIN_SECTIONS: AccountsNavSection[] = [
  {
    id: "overview",
    title: "Overview",
    items: [
      {
        id: "accounts",
        title: "Accounts",
        subtitle: "Bank & cash balances",
        icon: "wallet-outline",
        route: "/admin/finance/accounts",
      },
    ],
  },
  {
    id: "quick-actions",
    title: "Quick actions",
    items: [
      {
        id: "collect",
        title: "Collect",
        subtitle: "Receipt / allocation",
        icon: "arrow-down-circle-outline",
        route: "/admin/finance/collect",
        accent: true,
      },
      {
        id: "record",
        title: "Record",
        subtitle: "Payment or transfer",
        icon: "add-circle-outline",
        route: "/admin/finance/record",
        accent: true,
      },
      {
        id: "invoice",
        title: "Invoice",
        icon: "receipt-outline",
        route: "/admin/finance/invoice",
      },
      {
        id: "return",
        title: "Return",
        icon: "return-down-back-outline",
        route: "/admin/finance/return",
      },
      {
        id: "tds",
        title: "TDS",
        icon: "document-text-outline",
        route: "/admin/finance/tds",
      },
    ],
  },
  {
    id: "transactions",
    title: "Transactions",
    items: [
      {
        id: "sales",
        title: "Sales",
        subtitle: "Customer invoices",
        icon: "receipt-outline",
        route: "/admin/finance/browse?type=sales",
      },
      {
        id: "purchases",
        title: "Purchases",
        subtitle: "Supplier bills",
        icon: "cart-outline",
        route: "/admin/finance/browse?type=purchases",
      },
      {
        id: "receipts",
        title: "Receipts",
        icon: "cash-outline",
        route: "/admin/finance/browse?type=receipts",
      },
      {
        id: "payments",
        title: "Payments",
        icon: "card-outline",
        route: "/admin/finance/browse?type=payments",
      },
      {
        id: "expenses",
        title: "Expenses",
        icon: "wallet-outline",
        route: "/admin/finance/browse?type=expenses",
      },
      {
        id: "incomes",
        title: "Income",
        icon: "trending-up-outline",
        route: "/admin/finance/browse?type=incomes",
      },
    ],
  },
];
