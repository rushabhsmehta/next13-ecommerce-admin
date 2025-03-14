import { LucideIcon } from "lucide-react";

export interface SidebarItem {
  title: string;
  url: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

export interface TransactionBase {
  id: string;
  date: Date;
  type: string;
  description: string;
  amount: number;
  reference?: string;
  balance: number;
}

export interface FormattedTransaction {
  id: string;
  date: string;
  type: string;
  description: string;
  inflow: number;
  outflow: number;
  balance: number;
  reference?: string;
}

export interface BankAccount {
  id: string;
  accountNumber: string;
  name: string;
  openingBalance: number;
}

export interface CashAccount {
  id: string;
  name: string;
  openingBalance: number;
}
