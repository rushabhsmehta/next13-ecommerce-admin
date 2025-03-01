'use client'

import Image from 'next/image';
import Link from 'next/link';
import { CheckCircleIcon, CreditCardIcon, InfoIcon, PlaneIcon, PlaneTakeoffIcon, Shield, XCircleIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Location, Images, Hotel, TourPackageQuery, Itinerary, FlightDetails, Activity, PurchaseDetail, SaleDetail, PaymentDetail, ReceiptDetail, ExpenseDetail, Supplier, Customer } from "@prisma/client";
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns';
import { Separator } from '@radix-ui/react-separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TourPackageQueryDisplayProps {
  initialData: TourPackageQuery & {
    purchaseDetails: Array<PurchaseDetail & {
      supplier: Supplier | null;  // Make supplier nullable
    }> | null;
    saleDetails: Array<SaleDetail & {
      customer: Customer | null;  // Make customer nullable
    }> | null;
    paymentDetails: Array<PaymentDetail & {
      supplier: Supplier | null;  // Make supplier nullable
    }> | null;
    receiptDetails: Array<ReceiptDetail & {
      customer: Customer | null;  // Make customer nullable
    }> | null;
    expenseDetails: ExpenseDetail[] | null;  // Make array nullable
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

  return (
    <div className="space-y-8 w-full max-w-4xl mx-auto">
      {/* Package Header Card */}
      <Card className="break-inside-avoid font-bold">
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

      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sales" className="flex flex-col">
            <span>Sales</span>
            <span className="text-sm font-semibold">Rs. {totalSales.toFixed(2)}</span>
          </TabsTrigger>
          <TabsTrigger value="purchases" className="flex flex-col">
            <span>Purchases</span>
            <span className="text-sm font-semibold">Rs. {totalPurchases.toFixed(2)}</span>
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex flex-col">
            <span>Expenses</span>
            <span className="text-sm font-semibold">Rs. {totalExpenses.toFixed(2)}</span>
          </TabsTrigger>
          <TabsTrigger value="profit" className="flex flex-col">
            <span>Profit</span>
            <span className={`text-sm font-semibold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Rs. {netProfit.toFixed(2)}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <Tabs defaultValue="salesDetails" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="salesDetails">Sales Details</TabsTrigger>
              <TabsTrigger value="receiptDetails">Receipt Details</TabsTrigger>
            </TabsList>
            
            <TabsContent value="salesDetails">
              {initialData.saleDetails && initialData.saleDetails.length > 0 ? (
                <Card className="shadow-lg rounded-lg border-l-4 border-emerald-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircleIcon className="h-5 w-5 text-emerald-500" />
                      <span>Sales Details</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="max-h-[400px] overflow-y-auto">
                    {initialData.saleDetails.map((detail) => (
                      <div key={detail.id} className="mb-4 p-4 border rounded-lg bg-emerald-50">
                        <p className="font-semibold text-emerald-800">
                          Customer : {detail.customer?.name || 'N/A'}
                        </p>
                        <div className="mt-2 space-y-1 text-sm">
                          <p>Date: {format(new Date(detail.saleDate), "PPP")}</p>
                          <p className="font-medium">Amount: Rs. {detail.salePrice.toFixed(2)}</p>
                          <p className="text-gray-600">{detail.description || 'N/A'}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : <p>No sales details available</p>}
            </TabsContent>

            <TabsContent value="receiptDetails">
              {initialData.receiptDetails && initialData.receiptDetails.length > 0 ? (
                <Card className="shadow-lg rounded-lg border-l-4 border-emerald-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <InfoIcon className="h-5 w-5 text-emerald-500" />
                      <span>Receipt Details</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="max-h-[400px] overflow-y-auto">
                    {initialData.receiptDetails.map((detail) => (
                      <div key={detail.id} className="mb-4 p-4 border rounded-lg bg-emerald-50">
                        <p className="font-semibold text-emerald-800">
                          Customer : {detail.customer?.name || 'N/A'}
                        </p>
                        <div className="mt-2 space-y-1 text-sm">
                          <p>Date: {format(new Date(detail.receiptDate), "PPP")}</p>
                          <p className="font-medium">Amount: Rs. {detail.amount.toFixed(2)}</p>
                          <p className="text-gray-500">Ref: {detail.reference || 'N/A'}</p>
                          <p className="text-gray-600">{detail.note || 'N/A'}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : <p>No receipt details available</p>}
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="purchases">
          <Tabs defaultValue="purchaseDetails" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="purchaseDetails">Purchase Details</TabsTrigger>
              <TabsTrigger value="paymentDetails">Payment Details</TabsTrigger>
            </TabsList>
            
            <TabsContent value="purchaseDetails">
              {initialData.purchaseDetails && initialData.purchaseDetails.length > 0 ? (
                <Card className="shadow-lg rounded-lg border-l-4 border-blue-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCardIcon className="h-5 w-5 text-blue-500" />
                      <span>Purchase Details</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="max-h-[400px] overflow-y-auto">
                    {initialData.purchaseDetails.map((detail) => (
                      <div key={detail.id} className="mb-4 p-4 border rounded-lg bg-blue-50">
                        <p className="font-semibold text-blue-800">
                          Supplier: {detail.supplier?.name || 'N/A'}
                        </p>
                        <div className="mt-2 space-y-1 text-sm">
                          <p>Date: {format(new Date(detail.purchaseDate), "PPP")}</p>
                          <p className="font-medium">Amount: Rs. {detail.price.toFixed(2)}</p>
                          <p className="text-gray-600">{detail.description || 'N/A'}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : <p>No purchase details available</p>}
            </TabsContent>

            <TabsContent value="paymentDetails">
              {initialData.paymentDetails && initialData.paymentDetails.length > 0 ? (
                <Card className="shadow-lg rounded-lg border-l-4 border-blue-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-blue-500" />
                      <span>Payment Details</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="max-h-[400px] overflow-y-auto">
                    {initialData.paymentDetails.map((detail) => (
                      <div key={detail.id} className="mb-4 p-4 border rounded-lg bg-blue-50">
                        <p className="font-semibold text-blue-800">
                          Supplier: {detail.supplier?.name || 'N/A'}
                        </p>
                        <div className="mt-2 space-y-1 text-sm">
                          <p>Date: {format(new Date(detail.paymentDate), "PPP")}</p>
                          <p className="font-medium">Amount: Rs. {detail.amount.toFixed(2)}</p>
                          <p>Method: {detail.method || 'N/A'}</p>
                          <p className="text-gray-500">Ref: {detail.transactionId || 'N/A'}</p>
                          <p className="text-gray-600">{detail.note || 'N/A'}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : <p>No payment details available</p>}
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="expenses">
          {initialData.expenseDetails && initialData.expenseDetails.length > 0 ? (
            <Card className="shadow-lg rounded-lg border-l-4 border-red-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircleIcon className="h-5 w-5 text-red-500" />
                  <span>Expense Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-[400px] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {initialData.expenseDetails.map((detail) => (
                    <div key={detail.id} className="p-4 border rounded-lg bg-red-50">
                      <p className="font-semibold text-red-800">
                        {detail.expenseCategory}
                      </p>
                      <div className="mt-2 space-y-1 text-sm">
                        <p>Date: {format(new Date(detail.expenseDate), "PPP")}</p>
                        <p className="font-medium">Amount: Rs. {detail.amount.toFixed(2)}</p>
                        <p className="text-gray-600">{detail.description || 'N/A'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : <p>No expense details available</p>}
        </TabsContent>

        <TabsContent value="profit">
          <Card className="break-inside-avoid border-2 border-gray-200">
            <CardHeader className="bg-gradient-to-r from-gray-100 to-gray-200">
              <CardTitle className="text-xl font-bold">Profit Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-green-600 font-semibold">Total Sales</p>
                  <p className="text-2xl font-bold">Rs. {totalSales.toFixed(2)}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-red-600 font-semibold">Total Expenses</p>
                  <p className="text-2xl font-bold">Rs. {(totalPurchases + totalExpenses).toFixed(2)}</p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t-2">
                <div className="flex justify-between items-center">
                  <p className="text-lg font-bold">Net Profit:</p>
                  <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    Rs. {netProfit.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TourPackageQueryDisplay;