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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
// Import all necessary components
import SalesSection from './transactions/sales-section';
import PurchasesSection from './transactions/purchases-section';
import PaymentsSection from './transactions/payments-section';
import ReceiptsSection from './transactions/receipts-section';
import ExpensesSection from './transactions/expenses-section';
import IncomesSection from './transactions/incomes-section';
import { BankAccount, CashAccount, Customer, ExpenseCategory, ExpenseDetail, IncomeCategory, IncomeDetail, PaymentDetail, PurchaseDetail, ReceiptDetail, SaleDetail, Supplier, TaxSlab, TourPackageQuery, UnitOfMeasure } from '@prisma/client';

interface TourPackageQueryDisplayProps {
  initialData: TourPackageQuery & {
    saleDetails: SaleDetail[];
    purchaseDetails: PurchaseDetail[];
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

  // Helper function to refresh the data
  const refreshData = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  // Calculate totals - handle possible undefined values more safely
  const totalSales = initialData.saleDetails?.reduce((sum: number, sale: any) => 
    sum + (sale.salePrice || 0), 0) ?? 0;
  
  const totalPurchases = initialData.purchaseDetails?.reduce((sum: number, purchase: any) => 
    sum + (purchase.price || 0), 0) ?? 0;
  
  const totalExpenses = initialData.expenseDetails?.reduce((sum: number, expense: any) => 
    sum + (expense.amount || 0), 0) ?? 0;
  
  const totalIncomes = initialData.incomeDetails?.reduce((sum: number, income: any) => 
    sum + (income.amount || 0), 0) ?? 0;

  const netProfit = totalSales + totalIncomes - (totalPurchases + totalExpenses);

  // Calculate GST totals
  const totalSalesGST = initialData.saleDetails?.reduce((sum: number, sale: any) => 
    sum + (sale.gstAmount || 0), 0) ?? 0;
  const totalPurchasesGST = initialData.purchaseDetails?.reduce((sum: number, purchase: any) => 
    sum + (purchase.gstAmount || 0), 0) ?? 0;
  
  // Calculate receipts and payments
  const totalReceipts = initialData.receiptDetails?.reduce((sum: number, receipt: any) => sum + receipt.amount, 0) ?? 0;
  const totalPayments = initialData.paymentDetails?.reduce((sum: number, payment: any) => sum + payment.amount, 0) ?? 0;
  
  // Calculate payment and receipt status
  const paymentStatus = totalPurchases > 0 ? totalPayments / totalPurchases : 0;
  const receiptStatus = totalSales > 0 ? totalReceipts / totalSales : 0;

  return (
    <div className="space-y-8 w-full max-w-5xl mx-auto">
      {/* Package Header Card */}
      <Card className="break-inside-avoid shadow-md">
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

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Sales Summary Card */}
        <Card className="shadow-md border-l-4 border-green-500">
          <CardContent className="p-4 flex flex-col items-center">
            <p className="text-sm text-muted-foreground mb-1">Sales</p>
            <p className="text-2xl font-bold text-green-600">₹{totalSales.toFixed(2)}</p>
            <p className="text-xs text-gray-500">GST: ₹{totalSalesGST.toFixed(2)}</p>
            <Badge variant={receiptStatus >= 1 ? "default" : receiptStatus >= 0.5 ? "secondary" : "destructive"} className="mt-2">
              {Math.round(receiptStatus * 100)}% received
            </Badge>
          </CardContent>
        </Card>
        
        {/* Purchases Summary Card */}
        <Card className="shadow-md border-l-4 border-blue-500">
          <CardContent className="p-4 flex flex-col items-center">
            <p className="text-sm text-muted-foreground mb-1">Purchases</p>
            <p className="text-2xl font-bold text-blue-600">₹{totalPurchases.toFixed(2)}</p>
            <p className="text-xs text-gray-500">GST: ₹{totalPurchasesGST.toFixed(2)}</p>
            <Badge variant={paymentStatus >= 1 ? "default" : paymentStatus >= 0.5 ? "secondary" : "destructive"} className="mt-2">
              {Math.round(paymentStatus * 100)}% paid
            </Badge>
          </CardContent>
        </Card>
        
        {/* Expenses Summary Card */}
        <Card className="shadow-md border-l-4 border-red-500">
          <CardContent className="p-4 flex flex-col items-center">
            <p className="text-sm text-muted-foreground mb-1">Expenses</p>
            <p className="text-2xl font-bold text-red-600">₹{totalExpenses.toFixed(2)}</p>
            <p className="text-xs text-gray-500">&nbsp;</p>
            <Badge variant="outline" className="mt-2">
              {initialData.expenseDetails?.length || 0} transactions
            </Badge>
          </CardContent>
        </Card>
        
        {/* Profit Summary Card */}
        <Card className="shadow-md border-l-4 border-purple-500">
          <CardContent className="p-4 flex flex-col items-center">
            <p className="text-sm text-muted-foreground mb-1">Net Profit</p>
            <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₹{netProfit.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500">&nbsp;</p>
            <Badge variant={netProfit >= 0 ? "default" : "destructive"} className="mt-2">
              {netProfit >= 0 ? 'Profitable' : 'Loss'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Accordion type="single" collapsible className="w-full space-y-4">
        {/* Sales Section */}
        <AccordionItem value="sales" className="border rounded-lg bg-white shadow-md">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="flex justify-between w-full items-center">
              <div className="flex items-center">
                <IndianRupeeIcon className="h-5 w-5 mr-2 text-green-600" />
                <span className="font-semibold text-lg">Sales Details</span>
              </div>
              <span className="text-green-600 font-bold">₹{totalSales.toFixed(2)}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pt-2 pb-4">
            <SalesSection 
              salesData={initialData.saleDetails || []} 
              units={units}
              taxSlabs={taxSlabs}
              customers={customers || []}
              tourPackageId={initialData.id}
              tourPackageName={initialData.tourPackageQueryName || ""}
              onRefresh={refreshData}
              isRefreshing={isRefreshing}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Receipts Section */}
        <AccordionItem value="receipts" className="border rounded-lg bg-white shadow-md">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="flex justify-between w-full items-center">
              <div className="flex items-center">
                <ReceiptIcon className="h-5 w-5 mr-2 text-emerald-600" />
                <span className="font-semibold text-lg">Receipt Details</span>
              </div>
              <span className="text-emerald-600 font-bold">₹{totalReceipts.toFixed(2)}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pt-2 pb-4">
            <ReceiptsSection 
              receiptsData={initialData.receiptDetails || []} 
              customers={customers}
              suppliers={suppliers}
              bankAccounts={bankAccounts}
              cashAccounts={cashAccounts}
              tourPackageId={initialData.id}
              tourPackageName={initialData.tourPackageQueryName || ""}
              onRefresh={refreshData}
              isRefreshing={isRefreshing}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Purchases Section */}
        <AccordionItem value="purchases" className="border rounded-lg bg-white shadow-md">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="flex justify-between w-full items-center">
              <div className="flex items-center">
                <CreditCardIcon className="h-5 w-5 mr-2 text-blue-600" />
                <span className="font-semibold text-lg">Purchase Details</span>
              </div>
              <span className="text-blue-600 font-bold">₹{totalPurchases.toFixed(2)}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pt-2 pb-4">
            <PurchasesSection 
              purchasesData={initialData.purchaseDetails || []} 
              suppliers={suppliers}
              taxSlabs={taxSlabs}
              units={units}
              tourPackageId={initialData.id}
              tourPackageName={initialData.tourPackageQueryName || ""}
              onRefresh={refreshData}
              isRefreshing={isRefreshing}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Payments Section */}
        <AccordionItem value="payments" className="border rounded-lg bg-white shadow-md">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="flex justify-between w-full items-center">
              <div className="flex items-center">
                <ArrowUpIcon className="h-5 w-5 mr-2 text-indigo-600" />
                <span className="font-semibold text-lg">Payment Details</span>
              </div>
              <span className="text-indigo-600 font-bold">₹{totalPayments.toFixed(2)}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pt-2 pb-4">
            <PaymentsSection 
              paymentsData={initialData.paymentDetails || []} 
              suppliers={suppliers}
              customers={customers}
              bankAccounts={bankAccounts}
              cashAccounts={cashAccounts}
              tourPackageId={initialData.id}
              tourPackageName={initialData.tourPackageQueryName || ""}
              onRefresh={refreshData}
              isRefreshing={isRefreshing}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Expenses Section */}
        <AccordionItem value="expenses" className="border rounded-lg bg-white shadow-md">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="flex justify-between w-full items-center">
              <div className="flex items-center">
                <ArrowDownIcon className="h-5 w-5 mr-2 text-red-600" />
                <span className="font-semibold text-lg">Expense Details</span>
              </div>
              <span className="text-red-600 font-bold">₹{totalExpenses.toFixed(2)}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pt-2 pb-4">
            <ExpensesSection 
              expensesData={initialData.expenseDetails || []}
              expenseCategories={expenseCategories}
              bankAccounts={bankAccounts}
              cashAccounts={cashAccounts}
              tourPackageId={initialData.id}
              tourPackageName={initialData.tourPackageQueryName || ""}
              onRefresh={refreshData}
              isRefreshing={isRefreshing}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Income Section */}
        <AccordionItem value="incomes" className="border rounded-lg bg-white shadow-md">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="flex justify-between w-full items-center">
              <div className="flex items-center">
                <WalletIcon className="h-5 w-5 mr-2 text-green-600" />
                <span className="font-semibold text-lg">Income Details</span>
              </div>
              <span className="text-green-600 font-bold">₹{totalIncomes.toFixed(2)}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pt-2 pb-4">
            <IncomesSection 
              incomesData={initialData.incomeDetails || []}
              incomeCategories={incomeCategories}
              bankAccounts={bankAccounts}
              cashAccounts={cashAccounts}
              tourPackageId={initialData.id}
              tourPackageName={initialData.tourPackageQueryName || ""}
              onRefresh={refreshData}
              isRefreshing={isRefreshing}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Profit Summary Section */}
        <AccordionItem value="profit" className="border rounded-lg bg-white shadow-md">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="flex justify-between w-full items-center">
              <div className="flex items-center">
                <CheckCircleIcon className="h-5 w-5 mr-2 text-purple-600" />
                <span className="font-semibold text-lg">Profit Summary</span>
              </div>
              <span className={`font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₹{netProfit.toFixed(2)}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pt-2 pb-4">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Sales:</span>
                        <span className="font-medium">₹{totalSales.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Other Income:</span>
                        <span className="font-medium">₹{totalIncomes.toFixed(2)}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between font-bold">
                        <span>Total Revenue:</span>
                        <span className="text-green-600">₹{(totalSales + totalIncomes).toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Expenses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Purchases:</span>
                        <span className="font-medium">₹{totalPurchases.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Other Expenses:</span>
                        <span className="font-medium">₹{totalExpenses.toFixed(2)}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between font-bold">
                        <span>Total Expenses:</span>
                        <span className="text-red-600">₹{(totalPurchases + totalExpenses).toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold">Net Profit:</span>
                    <span className={`text-xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₹{netProfit.toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default TourPackageQueryDisplay;