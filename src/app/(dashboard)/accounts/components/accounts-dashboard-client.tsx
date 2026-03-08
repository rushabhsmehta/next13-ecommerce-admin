"use client";

import { format } from "date-fns";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  DollarSign,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface BankAccountData {
  id: string;
  accountName: string;
  bankName: string;
  currentBalance: number;
  accountNumber: string;
}

interface CashAccountData {
  id: string;
  accountName: string;
  currentBalance: number;
}

interface RecentTransaction {
  id: string;
  date: Date;
  type: "payment" | "receipt";
  party: string;
  amount: number;
  account: string;
  note: string;
}

interface AccountsDashboardClientProps {
  bankAccounts: BankAccountData[];
  cashAccounts: CashAccountData[];
  totalBankBalance: number;
  totalCashBalance: number;
  outstandingReceivables: number;
  outstandingPayables: number;
  mtdRevenue: number;
  mtdExpenses: number;
  recentTransactions: RecentTransaction[];
}

export function AccountsDashboardClient({
  bankAccounts,
  cashAccounts,
  totalBankBalance,
  totalCashBalance,
  outstandingReceivables,
  outstandingPayables,
  mtdRevenue,
  mtdExpenses,
  recentTransactions,
}: AccountsDashboardClientProps) {
  const router = useRouter();
  const mtdProfit = mtdRevenue - mtdExpenses;
  const totalCash = totalBankBalance + totalCashBalance;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Accounts Overview</h1>
          <p className="text-muted-foreground">Financial summary and recent activity</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.refresh()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Top 4 stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">MTD Revenue</p>
                <p className="text-2xl font-bold text-green-600">{formatPrice(mtdRevenue)}</p>
                <p className="text-xs text-muted-foreground mt-1">This month</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500 opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">MTD Expenses</p>
                <p className="text-2xl font-bold text-red-600">{formatPrice(mtdExpenses)}</p>
                <p className="text-xs text-muted-foreground mt-1">This month</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500 opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Receivables</p>
                <p className="text-2xl font-bold text-amber-600">{formatPrice(outstandingReceivables)}</p>
                <p className="text-xs text-muted-foreground mt-1">Outstanding</p>
              </div>
              <ArrowDownLeft className="h-8 w-8 text-amber-500 opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Payables</p>
                <p className="text-2xl font-bold text-blue-600">{formatPrice(outstandingPayables)}</p>
                <p className="text-xs text-muted-foreground mt-1">Outstanding</p>
              </div>
              <ArrowUpRight className="h-8 w-8 text-blue-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MTD Profit + Total Cash */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className={`border-l-4 ${mtdProfit >= 0 ? "border-l-purple-500" : "border-l-rose-500"}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">MTD Net Profit</p>
                <p className={`text-2xl font-bold ${mtdProfit >= 0 ? "text-purple-600" : "text-rose-600"}`}>
                  {mtdProfit < 0 ? "-" : ""}{formatPrice(Math.abs(mtdProfit))}
                </p>
                <Badge variant={mtdProfit >= 0 ? "default" : "destructive"} className="mt-1">
                  {mtdProfit >= 0 ? "Profitable" : "Loss"}
                </Badge>
              </div>
              <DollarSign className={`h-8 w-8 opacity-70 ${mtdProfit >= 0 ? "text-purple-500" : "text-rose-500"}`} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-slate-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Cash in Hand</p>
                <p className="text-2xl font-bold">{formatPrice(totalCash)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Bank: {formatPrice(totalBankBalance)} / Cash: {formatPrice(totalCashBalance)}
                </p>
              </div>
              <Wallet className="h-8 w-8 text-slate-500 opacity-70" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bank and Cash Account Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bank Accounts */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Bank Accounts
            </h2>
            <Link href="/bankaccounts" className="text-sm text-blue-600 hover:underline">
              Manage
            </Link>
          </div>
          {bankAccounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bank accounts configured</p>
          ) : (
            <div className="grid gap-3">
              {bankAccounts.map((account) => (
                <Card key={account.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{account.accountName}</p>
                        <p className="text-sm text-muted-foreground">
                          {account.bankName} / ****{account.accountNumber.slice(-4)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${account.currentBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {formatPrice(account.currentBalance)}
                        </p>
                        <p className="text-xs text-muted-foreground">Current Balance</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Cash Accounts */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Wallet className="h-5 w-5 text-green-600" />
              Cash Accounts
            </h2>
            <Link href="/cashaccounts" className="text-sm text-blue-600 hover:underline">
              Manage
            </Link>
          </div>
          {cashAccounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cash accounts configured</p>
          ) : (
            <div className="grid gap-3">
              {cashAccounts.map((account) => (
                <Card key={account.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{account.accountName}</p>
                        <p className="text-sm text-muted-foreground">Cash Account</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${account.currentBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {formatPrice(account.currentBalance)}
                        </p>
                        <p className="text-xs text-muted-foreground">Current Balance</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Transactions</h2>
          <div className="flex gap-3">
            <Link href="/payments/ledger" className="text-sm text-blue-600 hover:underline">
              All Payments
            </Link>
            <Link href="/receipts/ledger" className="text-sm text-blue-600 hover:underline">
              All Receipts
            </Link>
          </div>
        </div>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Party</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No recent transactions
                  </TableCell>
                </TableRow>
              ) : (
                recentTransactions.map((txn) => (
                  <TableRow key={`${txn.type}-${txn.id}`}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(txn.date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={txn.type === "receipt" ? "default" : "secondary"}>
                        {txn.type === "receipt" ? "Receipt" : "Payment"}
                      </Badge>
                    </TableCell>
                    <TableCell>{txn.party}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{txn.account}</TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        txn.type === "receipt" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {txn.type === "receipt" ? "+" : "-"}{formatPrice(txn.amount)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                      {txn.note}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Quick Links</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/sales/new">
            <Button variant="outline" size="sm">+ New Sale</Button>
          </Link>
          <Link href="/purchases/new">
            <Button variant="outline" size="sm">+ New Purchase</Button>
          </Link>
          <Link href="/sales/ledger">
            <Button variant="outline" size="sm">Sales Ledger</Button>
          </Link>
          <Link href="/purchases/ledger">
            <Button variant="outline" size="sm">Purchase Ledger</Button>
          </Link>
          <Link href="/customers/ledger">
            <Button variant="outline" size="sm">Customer Statements</Button>
          </Link>
          <Link href="/suppliers/ledger">
            <Button variant="outline" size="sm">Supplier Statements</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
