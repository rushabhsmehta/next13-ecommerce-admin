'use client'

import { format } from 'date-fns';
import { CheckCircleIcon, CreditCardIcon, WalletIcon, CalendarIcon, DollarSignIcon, UserIcon, BuildingIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Location, Images, Hotel, TourPackageQuery, Itinerary, FlightDetails, Activity, PurchaseDetail, SaleDetail, PaymentDetail, ReceiptDetail, ExpenseDetail, Supplier, Customer, BankAccount, CashAccount, IncomeDetail } from "@prisma/client";
import { useSearchParams } from 'next/navigation';
import { cn } from "@/lib/utils";

// Updated interface to include bank and cash account relations
interface TourPackageQueryDisplayProps {
  initialData: TourPackageQuery & {
    purchaseDetails: Array<PurchaseDetail & {
      supplier: Supplier | null;
    }> | null;
    saleDetails: Array<SaleDetail & {
      customer: Customer | null;
    }> | null;
    paymentDetails: Array<PaymentDetail & {
      supplier: Supplier | null;
      bankAccount: BankAccount | null;
      cashAccount: CashAccount | null;
    }> | null;
    receiptDetails: Array<ReceiptDetail & {
      customer: Customer | null;
      bankAccount: BankAccount | null;
      cashAccount: CashAccount | null;
    }> | null;
    expenseDetails: Array<ExpenseDetail & {
      bankAccount: BankAccount | null;
      cashAccount: CashAccount | null;
    }> | null;
    incomeDetails: Array<IncomeDetail & {
      bankAccount: BankAccount | null;
      cashAccount: CashAccount | null;
    }> | null;
  } | null;
}

export const TourPackageQueryDisplay: React.FC<TourPackageQueryDisplayProps> = ({
  initialData,
}) => {
  const searchParams = useSearchParams();

  if (!initialData) return <div>No data available</div>;

  // Calculate totals
  const totalSales = initialData.saleDetails?.reduce((sum, sale) => sum + sale.salePrice, 0) ?? 0;
  const totalPurchases = initialData.purchaseDetails?.reduce((sum, purchase) => sum + purchase.price, 0) ?? 0;
  const totalExpenses = initialData.expenseDetails?.reduce((sum, expense) => sum + expense.amount, 0) ?? 0;
  const netProfit = totalSales - (totalPurchases + totalExpenses);

  // Calculate totals for payments and receipts
  const totalPayments = initialData.paymentDetails?.reduce((sum, payment) => sum + payment.amount, 0) ?? 0;
  const totalReceipts = initialData.receiptDetails?.reduce((sum, receipt) => sum + receipt.amount, 0) ?? 0;
  
  // Calculate payment and receipt status
  const paymentStatus = totalPayments / totalPurchases;
  const receiptStatus = totalReceipts / totalSales;

  // Add income calculations in the component
  const totalIncomes = initialData.incomeDetails?.reduce((sum, income) => sum + income.amount, 0) ?? 0;

  // Helper function to get account details with icon
  const getAccountDisplay = (detail: {
    bankAccount: BankAccount | null;
    cashAccount: CashAccount | null;
  }) => {
    if (detail.bankAccount) {
      return {
        name: detail.bankAccount.accountName,
        type: 'Bank',
        icon: <BuildingIcon className="h-4 w-4 mr-1" />,
        info: detail.bankAccount.bankName
      };
    } else if (detail.cashAccount) {
      return {
        name: detail.cashAccount.accountName,
        type: 'Cash',
        icon: <WalletIcon className="h-4 w-4 mr-1" />,
        info: null
      };
    }
    return {
      name: 'N/A',
      type: 'Unknown',
      icon: <CreditCardIcon className="h-4 w-4 mr-1" />,
      info: null
    };
  };

  return (
    <div className="space-y-8 w-full max-w-5xl mx-auto">
      {/* Package Header Card */}
      <Card className="break-inside-avoid shadow-md">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-t-lg">
          <div className="flex flex-col space-y-2">
            <CardTitle className="text-2xl font-bold text-center">
              {initialData.tourPackageQueryName}
            </CardTitle>
            <div className="flex justify-between items-center text-sm">
              <span>Package ID: {initialData.tourPackageQueryNumber}</span>
              <span>Type: {initialData.tourPackageQueryType}</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-md">
          <CardContent className="p-4 flex flex-col items-center">
            <p className="text-sm text-muted-foreground mb-1">Sales</p>
            <p className="text-2xl font-bold text-green-600">₹{totalSales.toFixed(2)}</p>
            <Badge variant={receiptStatus >= 1 ? "default" : receiptStatus >= 0.5 ? "secondary" : "destructive"} className="mt-2">
              {totalReceipts.toFixed(2)} received
            </Badge>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardContent className="p-4 flex flex-col items-center">
            <p className="text-sm text-muted-foreground mb-1">Purchases</p>
            <p className="text-2xl font-bold text-blue-600">₹{totalPurchases.toFixed(2)}</p>
            <Badge variant={paymentStatus >= 1 ? "default" : paymentStatus >= 0.5 ? "secondary" : "destructive"} className="mt-2">
              {totalPayments.toFixed(2)} paid
            </Badge>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardContent className="p-4 flex flex-col items-center">
            <p className="text-sm text-muted-foreground mb-1">Expenses</p>
            <p className="text-2xl font-bold text-red-600">₹{totalExpenses.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardContent className="p-4 flex flex-col items-center">
            <p className="text-sm text-muted-foreground mb-1">Net Profit</p>
            <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₹{netProfit.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Accordion type="single" collapsible className="w-full space-y-4">
        {/* Sales Section */}
        <AccordionItem value="sales" className="border rounded-lg bg-white shadow-md">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="flex justify-between w-full items-center">
              <div className="flex items-center">
                <DollarSignIcon className="h-5 w-5 mr-2 text-green-600" />
                <span className="font-semibold text-lg">Sales Details</span>
              </div>
              <span className="text-green-600 font-bold">₹{totalSales.toFixed(2)}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pt-2 pb-4">
            <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
              {/* Sales Details Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-emerald-800">Sales Records</h3>
                  <Badge variant="outline" className="text-emerald-800 border-emerald-800">
                    {initialData.saleDetails?.length || 0} records
                  </Badge>
                </div>
                
                {initialData.saleDetails && initialData.saleDetails.length > 0 ? (
                  <Card className="shadow-lg rounded-lg border-l-4 border-emerald-500">
                    <CardHeader className="py-3 bg-gray-50">
                      <CardTitle className="text-sm font-medium grid grid-cols-[2fr_1fr_1fr_2fr] gap-4">
                        <div>Customer</div>
                        <div>Date</div>
                        <div>Amount</div>
                        <div>Description</div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-[250px] overflow-y-auto p-0">
                      {initialData.saleDetails.map((detail) => (
                        <div key={detail.id} 
                          className="grid grid-cols-[2fr_1fr_1fr_2fr] gap-4 items-center p-3 border-b last:border-0 hover:bg-gray-50">
                          <div className="font-medium flex items-center">
                            <UserIcon className="h-4 w-4 mr-1 text-gray-500" />
                            {detail.customer?.name || 'N/A'}
                          </div>
                          <div className="flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-1 text-gray-500" />
                            {format(new Date(detail.saleDate), "dd MMM yyyy")}
                          </div>
                          <div className="font-bold text-emerald-700">₹{detail.salePrice.toFixed(2)}</div>
                          <div className="truncate text-gray-600">{detail.description || 'No description'}</div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ) : <p className="text-gray-500 italic">No sales details available</p>}
              </div>

              {/* Receipt Details Section */}
              <div className="space-y-4 pt-6 border-t">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-emerald-800">Receipt Records</h3>
                  <Badge variant="outline" className="text-emerald-800 border-emerald-800">
                    {initialData.receiptDetails?.length || 0} records
                  </Badge>
                </div>
                
                {initialData.receiptDetails && initialData.receiptDetails.length > 0 ? (
                  <Card className="shadow-lg rounded-lg border-l-4 border-emerald-500">
                    <CardHeader className="py-3 bg-gray-50">
                      <CardTitle className="text-sm font-medium grid grid-cols-[2fr_1fr_1fr_2fr_2fr] gap-4">
                        <div>Customer</div>
                        <div>Date</div>
                        <div>Amount</div>
                        <div>Account</div>
                        <div>Note</div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-[250px] overflow-y-auto p-0">
                      {initialData.receiptDetails.map((detail) => {
                        const account = getAccountDisplay(detail);
                        return (
                          <div key={detail.id} 
                            className="grid grid-cols-[2fr_1fr_1fr_2fr_2fr] gap-4 items-center p-3 border-b last:border-0 hover:bg-gray-50">
                            <div className="font-medium flex items-center">
                              <UserIcon className="h-4 w-4 mr-1 text-gray-500" />
                              {detail.customer?.name || 'N/A'}
                            </div>
                            <div className="flex items-center">
                              <CalendarIcon className="h-4 w-4 mr-1 text-gray-500" />
                              {format(new Date(detail.receiptDate), "dd MMM yyyy")}
                            </div>
                            <div className="font-bold text-emerald-700">₹{detail.amount.toFixed(2)}</div>
                            <div className="flex items-center">
                              {account.icon}
                              <div>
                                <div className="font-medium">{account.name}</div>
                                {account.info && <div className="text-xs text-gray-500">{account.info}</div>}
                              </div>
                            </div>
                            <div className="truncate text-gray-600">{detail.note || 'No notes'}</div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                ) : <p className="text-gray-500 italic">No receipt details available</p>}
              </div>
            </div>
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
            <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
              {/* Purchase Details Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-blue-800">Purchase Records</h3>
                  <Badge variant="outline" className="text-blue-800 border-blue-800">
                    {initialData.purchaseDetails?.length || 0} records
                  </Badge>
                </div>

                {initialData.purchaseDetails && initialData.purchaseDetails.length > 0 ? (
                  <Card className="shadow-lg rounded-lg border-l-4 border-blue-500">
                    <CardHeader className="py-3 bg-gray-50">
                      <CardTitle className="text-sm font-medium grid grid-cols-[2fr_1fr_1fr_2fr] gap-4">
                        <div>Supplier</div>
                        <div>Date</div>
                        <div>Amount</div>
                        <div>Description</div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-[250px] overflow-y-auto p-0">
                      {initialData.purchaseDetails.map((detail) => (
                        <div key={detail.id} 
                          className="grid grid-cols-[2fr_1fr_1fr_2fr] gap-4 items-center p-3 border-b last:border-0 hover:bg-gray-50">
                          <div className="font-medium flex items-center">
                            <UserIcon className="h-4 w-4 mr-1 text-gray-500" />
                            {detail.supplier?.name || 'N/A'}
                          </div>
                          <div className="flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-1 text-gray-500" />
                            {format(new Date(detail.purchaseDate), "dd MMM yyyy")}
                          </div>
                          <div className="font-bold text-blue-700">₹{detail.price.toFixed(2)}</div>
                          <div className="truncate text-gray-600">{detail.description || 'No description'}</div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ) : <p className="text-gray-500 italic">No purchase details available</p>}
              </div>

              {/* Payment Details Section */}
              <div className="space-y-4 pt-6 border-t">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-blue-800">Payment Records</h3>
                  <Badge variant="outline" className="text-blue-800 border-blue-800">
                    {initialData.paymentDetails?.length || 0} records
                  </Badge>
                </div>
                
                {initialData.paymentDetails && initialData.paymentDetails.length > 0 ? (
                  <Card className="shadow-lg rounded-lg border-l-4 border-blue-500">
                    <CardHeader className="py-3 bg-gray-50">
                      <CardTitle className="text-sm font-medium grid grid-cols-[2fr_1fr_1fr_2fr_2fr] gap-4">
                        <div>Supplier</div>
                        <div>Date</div>
                        <div>Amount</div>
                        <div>Account</div>
                        <div>Reference</div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-[250px] overflow-y-auto p-0">
                      {initialData.paymentDetails.map((detail) => {
                        const account = getAccountDisplay(detail);
                        return (
                          <div key={detail.id} 
                            className="grid grid-cols-[2fr_1fr_1fr_2fr_2fr] gap-4 items-center p-3 border-b last:border-0 hover:bg-gray-50">
                            <div className="font-medium flex items-center">
                              <UserIcon className="h-4 w-4 mr-1 text-gray-500" />
                              {detail.supplier?.name || 'N/A'}
                            </div>
                            <div className="flex items-center">
                              <CalendarIcon className="h-4 w-4 mr-1 text-gray-500" />
                              {format(new Date(detail.paymentDate), "dd MMM yyyy")}
                            </div>
                            <div className="font-bold text-blue-700">₹{detail.amount.toFixed(2)}</div>
                            <div className="flex items-center">
                              {account.icon}
                              <div>
                                <div className="font-medium">{account.name}</div>
                                {account.info && <div className="text-xs text-gray-500">{account.info}</div>}
                              </div>
                            </div>
                            <div className="truncate text-gray-600">
                              {detail.transactionId ? `ID: ${detail.transactionId}` : 'No reference'}
                              {detail.note && <div className="text-xs text-gray-500">{detail.note}</div>}
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                ) : <p className="text-gray-500 italic">No payment details available</p>}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Expenses Section */}
        <AccordionItem value="expenses" className="border rounded-lg bg-white shadow-md">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="flex justify-between w-full items-center">
              <div className="flex items-center">
                <DollarSignIcon className="h-5 w-5 mr-2 text-red-600" />
                <span className="font-semibold text-lg">Expense Details</span>
              </div>
              <span className="text-red-600 font-bold">₹{totalExpenses.toFixed(2)}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pt-2 pb-4">
            <div className="max-h-[500px] overflow-y-auto pr-2">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-red-800">Expense Records</h3>
                <Badge variant="outline" className="text-red-800 border-red-800">
                  {initialData.expenseDetails?.length || 0} records
                </Badge>
              </div>
              
              {initialData.expenseDetails && initialData.expenseDetails.length > 0 ? (
                <Card className="shadow-lg rounded-lg border-l-4 border-red-500">
                  <CardHeader className="py-3 bg-gray-50">
                    <CardTitle className="text-sm font-medium grid grid-cols-[1.5fr_1fr_1fr_2fr_2fr] gap-4">
                      <div>Category</div>
                      <div>Date</div>
                      <div>Amount</div>
                      <div>Account</div>
                      <div>Description</div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="max-h-[250px] overflow-y-auto p-0">
                    {initialData.expenseDetails.map((detail) => {
                      const account = getAccountDisplay(detail);
                      return (
                        <div key={detail.id} 
                          className="grid grid-cols-[1.5fr_1fr_1fr_2fr_2fr] gap-4 items-center p-3 border-b last:border-0 hover:bg-gray-50">
                          <div className="font-medium">
                            {detail.expenseCategory}
                          </div>
                          <div className="flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-1 text-gray-500" />
                            {format(new Date(detail.expenseDate), "dd MMM yyyy")}
                          </div>
                          <div className="font-bold text-red-700">₹{detail.amount.toFixed(2)}</div>
                          <div className="flex items-center">
                            {account.icon}
                            <div>
                              <div className="font-medium">{account.name}</div>
                              {account.info && <div className="text-xs text-gray-500">{account.info}</div>}
                            </div>
                          </div>
                          <div className="truncate text-gray-600">{detail.description || 'No description'}</div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ) : <p className="text-gray-500 italic">No expense details available</p>}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Income Section */}
        <AccordionItem value="incomes" className="border rounded-lg bg-white shadow-md">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="flex justify-between w-full items-center">
              <div className="flex items-center">
                <DollarSignIcon className="h-5 w-5 mr-2 text-green-600" />
                <span className="font-semibold text-lg">Income Details</span>
              </div>
              <span className="text-green-600 font-bold">₹{totalIncomes.toFixed(2)}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pt-2 pb-4">
            <div className="max-h-[500px] overflow-y-auto pr-2">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-green-800">Income Records</h3>
                <Badge variant="outline" className="text-green-800 border-green-800">
                  {initialData.incomeDetails?.length || 0} records
                </Badge>
              </div>
              
              {initialData.incomeDetails && initialData.incomeDetails.length > 0 ? (
                <Card className="shadow-lg rounded-lg border-l-4 border-green-500">
                  <CardHeader className="py-3 bg-gray-50">
                    <CardTitle className="text-sm font-medium grid grid-cols-[1.5fr_1fr_1fr_2fr_2fr] gap-4">
                      <div>Category</div>
                      <div>Date</div>
                      <div>Amount</div>
                      <div>Account</div>
                      <div>Description</div>
                    </CardTitle>
                      </CardHeader>
                      <CardContent className="max-h-[250px] overflow-y-auto p-0">
                        {initialData.incomeDetails.map((detail) => {
                          const account = getAccountDisplay(detail);
                          return (
                            <div key={detail.id} 
                              className="grid grid-cols-[1.5fr_1fr_1fr_2fr_2fr] gap-4 items-center p-3 border-b last:border-0 hover:bg-gray-50">
                              <div className="font-medium">
                                {detail.incomeCategory}
                              </div>
                              <div className="flex items-center">
                                <CalendarIcon className="h-4 w-4 mr-1 text-gray-500" />
                                {format(new Date(detail.incomeDate), "dd MMM yyyy")}
                          </div>
                          <div className="font-bold text-green-700">₹{detail.amount.toFixed(2)}</div>
                          <div className="flex items-center">
                            {account.icon}
                            <div>
                              <div className="font-medium">{account.name}</div>
                              {account.info && <div className="text-xs text-gray-500">{account.info}</div>}
                            </div>
                          </div>
                          <div className="truncate text-gray-600">{detail.description || 'No description'}</div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ) : <p className="text-gray-500 italic">No income details available</p>}
            </div>
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
            <div className="max-h-[500px] overflow-y-auto pr-2">
              <Card className="break-inside-avoid border-2 border-gray-200 shadow-md">
                <CardHeader className="bg-gradient-to-r from-gray-100 to-gray-200">
                  <CardTitle className="text-xl font-bold">Financial Summary</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid gap-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Total Sales</p>
                        <p className="text-2xl font-bold text-green-600">₹{totalSales.toFixed(2)}</p>
                        <p className="text-sm text-gray-500">Received: ₹{totalReceipts.toFixed(2)}</p>
                        <p className="text-sm text-gray-500">Pending: ₹{(totalSales - totalReceipts).toFixed(2)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Total Purchases</p>
                        <p className="text-2xl font-bold text-blue-600">₹{totalPurchases.toFixed(2)}</p>
                        <p className="text-sm text-gray-500">Paid: ₹{totalPayments.toFixed(2)}</p>
                        <p className="text-sm text-gray-500">Pending: ₹{(totalPurchases - totalPayments).toFixed(2)}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Total Expenses</p>
                        <p className="text-2xl font-bold text-red-600">₹{totalExpenses.toFixed(2)}</p>
                      </div>
                      <div className="space-y-1 border-l pl-4">
                        <p className="text-sm text-muted-foreground">Net Profit</p>
                        <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ₹{netProfit.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500">
                          Profit Margin: {totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(2) : '0'}%
                        </p>
                      </div>
                    </div>
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