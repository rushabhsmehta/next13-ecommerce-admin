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

// Add these types to your existing types file or create a new one

export interface TransactionBase {
  id: string;
  date: Date;
  type: string;
  description: string;
  amount: number;
  reference?: string;
  balance: number; // Running balance calculated during processing
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
  name: string;
  accountNumber: string;
  openingBalance: number;
}

export interface CashAccount {
  id: string;
  name: string;
  openingBalance: number;
}
