'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircleIcon,
  CreditCardIcon,
  IndianRupeeIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  ReceiptIcon,
  WalletIcon,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import SalesSection from './transactions/sales-section';
import SaleReturnsSection from './transactions/sale-returns-section';
import PurchasesSection from './transactions/purchases-section';
import PurchaseReturnsSection from './transactions/purchase-returns-section';
import PaymentsSection from './transactions/payments-section';
import ReceiptsSection from './transactions/receipts-section';
import ExpensesSection from './transactions/expenses-section';
import IncomesSection from './transactions/incomes-section';
import { BankAccount, CashAccount, Customer, ExpenseCategory, ExpenseDetail, IncomeCategory, IncomeDetail, PaymentDetail, PurchaseDetail, PurchaseReturn, ReceiptDetail, SaleDetail, SaleReturn, Supplier, TaxSlab, TourPackageQuery, UnitOfMeasure } from '@prisma/client';

interface TourPackageQueryDisplayProps {
  initialData: TourPackageQuery & {
    saleDetails: (SaleDetail & {
      saleReturns?: SaleReturn[];
    })[];
    purchaseDetails: (PurchaseDetail & {
      purchaseReturns?: PurchaseReturn[];
    })[];
    expenseDetails: ExpenseDetail[];
    incomeDetails: IncomeDetail[];
    receiptDetails: ReceiptDetail[];
    paymentDetails: PaymentDetail[];
  };
  taxSlabs?: TaxSlab[];
  units?: UnitOfMeasure[];
  suppliers?: Supplier[];
  customers?: Customer[];
  bankAccounts?: BankAccount[];
  cashAccounts?: CashAccount[];
  expenseCategories?: ExpenseCategory[];
  incomeCategories?: IncomeCategory[];
}

export const TourPackageQueryDisplay: React.FC<TourPackageQueryDisplayProps> = ({
  initialData,
  taxSlabs = [],
  units = [],
  suppliers = [],
  customers = [],
  bankAccounts = [],
  cashAccounts = [],
  expenseCategories = [],
  incomeCategories = []
}) => {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!initialData) return <div>No data available</div>;

  const refreshData = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // ── Totals ──────────────────────────────────────────────────────────────────
  const totalSales = initialData.saleDetails?.reduce((sum: number, s: any) => sum + (s.salePrice || 0), 0) ?? 0;
  const totalPurchases = initialData.purchaseDetails?.reduce((sum: number, p: any) => sum + (p.price || 0), 0) ?? 0;
  const totalExpenses = initialData.expenseDetails?.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) ?? 0;
  const totalIncomes = initialData.incomeDetails?.reduce((sum: number, i: any) => sum + (i.amount || 0), 0) ?? 0;

  const totalSaleReturns = initialData.saleDetails?.reduce((sum: number, s: any) =>
    sum + (s.saleReturns?.reduce((r: number, sr: any) => r + (sr.amount || 0), 0) || 0), 0) ?? 0;
  const totalPurchaseReturns = initialData.purchaseDetails?.reduce((sum: number, p: any) =>
    sum + (p.purchaseReturns?.reduce((r: number, pr: any) => r + (pr.amount || 0), 0) || 0), 0) ?? 0;

  const totalSalesGST = initialData.saleDetails?.reduce((sum: number, s: any) => sum + (s.gstAmount || 0), 0) ?? 0;
  const totalPurchasesGST = initialData.purchaseDetails?.reduce((sum: number, p: any) => sum + (p.gstAmount || 0), 0) ?? 0;
  const totalSaleReturnsGST = initialData.saleDetails?.reduce((sum: number, s: any) =>
    sum + (s.saleReturns?.reduce((r: number, sr: any) => r + (sr.gstAmount || 0), 0) || 0), 0) ?? 0;
  const totalPurchaseReturnsGST = initialData.purchaseDetails?.reduce((sum: number, p: any) =>
    sum + (p.purchaseReturns?.reduce((r: number, pr: any) => r + (pr.gstAmount || 0), 0) || 0), 0) ?? 0;

  const totalSalesWithGST = totalSales + totalSalesGST;
  const totalPurchasesWithGST = totalPurchases + totalPurchasesGST;
  const netSalesWithGST = totalSalesWithGST - totalSaleReturns;
  const netPurchasesWithGST = totalPurchasesWithGST - totalPurchaseReturns;
  const netProfit = netSalesWithGST + totalIncomes - (netPurchasesWithGST + totalExpenses);

  const totalReceipts = initialData.receiptDetails?.reduce((sum: number, r: any) => sum + r.amount, 0) ?? 0;
  const totalPayments = initialData.paymentDetails?.reduce((sum: number, p: any) => sum + p.amount, 0) ?? 0;
  const paymentStatus = totalPurchasesWithGST > 0 ? totalPayments / totalPurchasesWithGST : 0;
  const receiptStatus = totalSalesWithGST > 0 ? totalReceipts / totalSalesWithGST : 0;

  const fmt = (n: number) => `₹${n.toFixed(2)}`;

  const sharedProps = { tourPackageId: initialData.id, tourPackageName: initialData.tourPackageQueryName || "", onRefresh: refreshData, isRefreshing };

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto">
      {/* Package Header */}
      <Card className="shadow-md">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-t-lg">
          <div className="flex flex-col space-y-2">
            <CardTitle className="text-2xl font-bold text-center">
              {initialData.tourPackageQueryName || "Untitled Package"}
            </CardTitle>
            <div className="flex justify-between items-center text-sm">
              <span>Package ID: {initialData.tourPackageQueryNumber || initialData.id.substring(0, 8)}</span>
              <span>Type: {initialData.tourPackageQueryType || "N/A"}</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="shadow-md border-l-4 border-green-500">
          <CardContent className="p-4 flex flex-col items-center">
            <p className="text-sm text-muted-foreground mb-1">Sales</p>
            <p className="text-2xl font-bold text-green-600">{fmt(totalSalesWithGST)}</p>
            <p className="text-xs text-gray-500">GST: {fmt(totalSalesGST)}</p>
            <Badge variant={receiptStatus >= 1 ? "default" : receiptStatus >= 0.5 ? "secondary" : "destructive"} className="mt-2">
              {Math.round(receiptStatus * 100)}% received
            </Badge>
          </CardContent>
        </Card>

        <Card className="shadow-md border-l-4 border-amber-500">
          <CardContent className="p-4 flex flex-col items-center">
            <p className="text-sm text-muted-foreground mb-1">Sale Returns</p>
            <p className="text-2xl font-bold text-amber-600">{fmt(totalSaleReturns)}</p>
            <p className="text-xs text-gray-500">GST: {fmt(totalSaleReturnsGST)}</p>
          </CardContent>
        </Card>

        <Card className="shadow-md border-l-4 border-blue-500">
          <CardContent className="p-4 flex flex-col items-center">
            <p className="text-sm text-muted-foreground mb-1">Purchases</p>
            <p className="text-2xl font-bold text-blue-600">{fmt(totalPurchasesWithGST)}</p>
            <p className="text-xs text-gray-500">GST: {fmt(totalPurchasesGST)}</p>
            <Badge variant={paymentStatus >= 1 ? "default" : paymentStatus >= 0.5 ? "secondary" : "destructive"} className="mt-2">
              {Math.round(paymentStatus * 100)}% paid
            </Badge>
          </CardContent>
        </Card>

        <Card className="shadow-md border-l-4 border-cyan-500">
          <CardContent className="p-4 flex flex-col items-center">
            <p className="text-sm text-muted-foreground mb-1">Pur. Returns</p>
            <p className="text-2xl font-bold text-cyan-600">{fmt(totalPurchaseReturns)}</p>
            <p className="text-xs text-gray-500">GST: {fmt(totalPurchaseReturnsGST)}</p>
          </CardContent>
        </Card>

        <Card className="shadow-md border-l-4 border-red-500">
          <CardContent className="p-4 flex flex-col items-center">
            <p className="text-sm text-muted-foreground mb-1">Expenses</p>
            <p className="text-2xl font-bold text-red-600">{fmt(totalExpenses)}</p>
            <Badge variant="outline" className="mt-2">
              {initialData.expenseDetails?.length || 0} items
            </Badge>
          </CardContent>
        </Card>

        <Card className="shadow-md border-l-4 border-purple-500">
          <CardContent className="p-4 flex flex-col items-center">
            <p className="text-sm text-muted-foreground mb-1">Net Profit</p>
            <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {fmt(netProfit)}
            </p>
            <Badge variant={netProfit >= 0 ? "default" : "destructive"} className="mt-2">
              {netProfit >= 0 ? 'Profitable' : 'Loss'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="sales">
            Sales
            <Badge variant="secondary" className="ml-1.5 text-xs">
              {fmt(totalSalesWithGST)}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="purchases">
            Purchases
            <Badge variant="secondary" className="ml-1.5 text-xs">
              {fmt(totalPurchasesWithGST)}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="cashflow">
            Cash Flow
          </TabsTrigger>
          <TabsTrigger value="other">Other</TabsTrigger>
        </TabsList>

        {/* ── Summary Tab ─────────────────────────────────────────────────────── */}
        <TabsContent value="summary" className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <IndianRupeeIcon className="h-5 w-5 text-green-600" /> Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Sales (incl. GST)</span>
                    <span className="font-medium">{fmt(totalSalesWithGST)}</span>
                  </div>
                  <div className="flex justify-between text-amber-600">
                    <span>Less: Sale Returns</span>
                    <span>-{fmt(totalSaleReturns)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Other Income</span>
                    <span className="font-medium">{fmt(totalIncomes)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Net Revenue</span>
                    <span className="text-green-600">{fmt(netSalesWithGST + totalIncomes)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCardIcon className="h-5 w-5 text-red-600" /> Costs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Purchases (incl. GST)</span>
                    <span className="font-medium">{fmt(totalPurchasesWithGST)}</span>
                  </div>
                  <div className="flex justify-between text-cyan-600">
                    <span>Less: Purchase Returns</span>
                    <span>-{fmt(totalPurchaseReturns)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Other Expenses</span>
                    <span className="font-medium">{fmt(totalExpenses)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Net Costs</span>
                    <span className="text-red-600">{fmt(netPurchasesWithGST + totalExpenses)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold">Net Profit / Loss</span>
                <span className={`text-xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {fmt(netProfit)}
                </span>
              </div>
              {totalSalesWithGST > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  Margin: {((netProfit / totalSalesWithGST) * 100).toFixed(1)}%
                </p>
              )}
            </CardContent>
          </Card>

          {/* Cash position */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Receipts</p>
                <p className="text-2xl font-bold text-green-600">{fmt(totalReceipts)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  of {fmt(totalSalesWithGST)} invoiced
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Payments</p>
                <p className="text-2xl font-bold text-blue-600">{fmt(totalPayments)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  of {fmt(totalPurchasesWithGST)} billed
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Sales Tab ───────────────────────────────────────────────────────── */}
        <TabsContent value="sales" className="mt-6 space-y-6">
          <div>
            <h3 className="text-base font-semibold flex items-center gap-2 mb-3">
              <IndianRupeeIcon className="h-4 w-4 text-green-600" /> Sales Details
            </h3>
            <SalesSection
              salesData={initialData.saleDetails || []}
              units={units}
              taxSlabs={taxSlabs}
              customers={customers}
              {...sharedProps}
            />
          </div>

          <div>
            <h3 className="text-base font-semibold flex items-center gap-2 mb-3">
              <ArrowDownIcon className="h-4 w-4 text-amber-600" /> Sale Returns
            </h3>
            <SaleReturnsSection
              saleReturnsData={initialData.saleDetails?.flatMap(s => s.saleReturns || []) || []}
              sales={initialData.saleDetails || []}
              units={units}
              taxSlabs={taxSlabs}
              customers={customers}
              {...sharedProps}
            />
          </div>
        </TabsContent>

        {/* ── Purchases Tab ────────────────────────────────────────────────────── */}
        <TabsContent value="purchases" className="mt-6 space-y-6">
          <div>
            <h3 className="text-base font-semibold flex items-center gap-2 mb-3">
              <CreditCardIcon className="h-4 w-4 text-blue-600" /> Purchase Details
            </h3>
            <PurchasesSection
              purchasesData={initialData.purchaseDetails || []}
              suppliers={suppliers}
              taxSlabs={taxSlabs}
              units={units}
              {...sharedProps}
            />
          </div>

          <div>
            <h3 className="text-base font-semibold flex items-center gap-2 mb-3">
              <ArrowUpIcon className="h-4 w-4 text-cyan-600" /> Purchase Returns
            </h3>
            <PurchaseReturnsSection
              purchaseReturnsData={initialData.purchaseDetails?.flatMap(p => p.purchaseReturns || []) || []}
              suppliers={suppliers}
              taxSlabs={taxSlabs}
              units={units}
              initialData={initialData}
              {...sharedProps}
            />
          </div>
        </TabsContent>

        {/* ── Cash Flow Tab ────────────────────────────────────────────────────── */}
        <TabsContent value="cashflow" className="mt-6 space-y-6">
          <div>
            <h3 className="text-base font-semibold flex items-center gap-2 mb-3">
              <ReceiptIcon className="h-4 w-4 text-emerald-600" /> Receipts
              <Badge variant="outline">{fmt(totalReceipts)}</Badge>
            </h3>
            <ReceiptsSection
              receiptsData={initialData.receiptDetails || []}
              customers={customers}
              suppliers={suppliers}
              bankAccounts={bankAccounts}
              cashAccounts={cashAccounts}
              {...sharedProps}
            />
          </div>

          <div>
            <h3 className="text-base font-semibold flex items-center gap-2 mb-3">
              <ArrowUpIcon className="h-4 w-4 text-indigo-600" /> Payments
              <Badge variant="outline">{fmt(totalPayments)}</Badge>
            </h3>
            <PaymentsSection
              paymentsData={initialData.paymentDetails || []}
              suppliers={suppliers}
              customers={customers}
              bankAccounts={bankAccounts}
              cashAccounts={cashAccounts}
              {...sharedProps}
            />
          </div>
        </TabsContent>

        {/* ── Other Tab ────────────────────────────────────────────────────────── */}
        <TabsContent value="other" className="mt-6 space-y-6">
          <div>
            <h3 className="text-base font-semibold flex items-center gap-2 mb-3">
              <ArrowDownIcon className="h-4 w-4 text-red-600" /> Expenses
              <Badge variant="outline">{fmt(totalExpenses)}</Badge>
            </h3>
            <ExpensesSection
              expensesData={initialData.expenseDetails || []}
              expenseCategories={expenseCategories}
              bankAccounts={bankAccounts}
              cashAccounts={cashAccounts}
              {...sharedProps}
            />
          </div>

          <div>
            <h3 className="text-base font-semibold flex items-center gap-2 mb-3">
              <WalletIcon className="h-4 w-4 text-green-600" /> Other Income
              <Badge variant="outline">{fmt(totalIncomes)}</Badge>
            </h3>
            <IncomesSection
              incomesData={initialData.incomeDetails || []}
              incomeCategories={incomeCategories}
              bankAccounts={bankAccounts}
              cashAccounts={cashAccounts}
              {...sharedProps}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TourPackageQueryDisplay;
