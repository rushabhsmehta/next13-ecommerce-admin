'use client'

import Image from 'next/image';
import Link from 'next/link';
import { CheckCircleIcon, CreditCardIcon, InfoIcon, PlaneIcon, PlaneTakeoffIcon, Shield, XCircleIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Location, Images, Hotel, TourPackageQuery, Itinerary, FlightDetails, Activity, PurchaseDetail, SaleDetail, PaymentDetail, ReceiptDetail, ExpenseDetail, Supplier, Customer } from "@prisma/client";
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns';
import { Separator } from '@radix-ui/react-separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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

  const formatDetailRow = (label: string, value: string) => (
    <div className="flex items-center gap-2">
      <span className="font-medium">{label}:</span>
      <span>{value}</span>
    </div>
  );

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

      <Accordion type="single" collapsible className="w-full space-y-4">
        <AccordionItem value="sales" className="border rounded-lg bg-white shadow-sm">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="flex justify-between w-full items-center">
              <span className="font-semibold text-lg">Sales Details</span>
              <span className="text-green-600 font-bold">Rs. {totalSales.toFixed(2)}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pt-2 pb-4">
            <div className="space-y-6">
              {/* Sales Details Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-emerald-800">Sales Details</h3>
                {initialData.saleDetails && initialData.saleDetails.length > 0 ? (
                  <Card className="shadow-lg rounded-lg border-l-4 border-emerald-500">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm font-medium grid grid-cols-[2fr_1fr_1fr_2fr_1fr] gap-4">
                        <div>Customer</div>
                        <div>Date</div>
                        <div>Amount</div>
                        <div>Description</div>
                        <div>Actions</div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-[400px] overflow-y-auto">
                      {initialData.saleDetails.map((detail) => (
                        <div key={detail.id} 
                          className="grid grid-cols-[2fr_1fr_1fr_2fr_1fr] gap-4 items-center py-2 border-b last:border-0">
                          <div className="font-medium">{detail.customer?.name || 'N/A'}</div>
                          <div>{format(new Date(detail.saleDate), "dd/MM/yy")}</div>
                          <div>Rs. {detail.salePrice.toFixed(2)}</div>
                          <div className="truncate">{detail.description || 'N/A'}</div>
                          <div>
                            {/* Add action buttons if needed */}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ) : <p>No sales details available</p>}
              </div>

              {/* Receipt Details Section */}
              <div className="space-y-4 pt-6 border-t">
                <h3 className="text-lg font-semibold text-emerald-800">Receipt Details</h3>
                {initialData.receiptDetails && initialData.receiptDetails.length > 0 ? (
                  <Card className="shadow-lg rounded-lg border-l-4 border-emerald-500">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm font-medium grid grid-cols-[2fr_1fr_1fr_1fr_2fr] gap-4">
                        <div>Customer</div>
                        <div>Date</div>
                        <div>Amount</div>
                        <div>Reference</div>
                        <div>Note</div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-[400px] overflow-y-auto">
                      {initialData.receiptDetails.map((detail) => (
                        <div key={detail.id} 
                          className="grid grid-cols-[2fr_1fr_1fr_1fr_2fr] gap-4 items-center py-2 border-b last:border-0">
                          <div className="font-medium">{detail.customer?.name || 'N/A'}</div>
                          <div>{format(new Date(detail.receiptDate), "dd/MM/yy")}</div>
                          <div>Rs. {detail.amount.toFixed(2)}</div>
                          <div>{detail.reference || 'N/A'}</div>
                          <div className="truncate">{detail.note || 'N/A'}</div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ) : <p>No receipt details available</p>}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="purchases" className="border rounded-lg bg-white shadow-sm">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="flex justify-between w-full items-center">
              <span className="font-semibold text-lg">Purchase Details</span>
              <span className="text-blue-600 font-bold">Rs. {totalPurchases.toFixed(2)}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pt-2 pb-4">
            <div className="space-y-6">
              {/* Purchase Details Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-blue-800">Purchase Details</h3>
                {initialData.purchaseDetails && initialData.purchaseDetails.length > 0 ? (
                  <Card className="shadow-lg rounded-lg border-l-4 border-blue-500">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm font-medium grid grid-cols-[2fr_1fr_1fr_2fr_1fr] gap-4">
                        <div>Supplier</div>
                        <div>Date</div>
                        <div>Amount</div>
                        <div>Description</div>
                        <div>Actions</div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-[400px] overflow-y-auto">
                      {initialData.purchaseDetails.map((detail) => (
                        <div key={detail.id} 
                          className="grid grid-cols-[2fr_1fr_1fr_2fr_1fr] gap-4 items-center py-2 border-b last:border-0">
                          <div className="font-medium">{detail.supplier?.name || 'N/A'}</div>
                          <div>{format(new Date(detail.purchaseDate), "dd/MM/yy")}</div>
                          <div>Rs. {detail.price.toFixed(2)}</div>
                          <div className="truncate">{detail.description || 'N/A'}</div>
                          <div>
                            {/* Add action buttons if needed */}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ) : <p>No purchase details available</p>}
              </div>

              {/* Payment Details Section */}
              <div className="space-y-4 pt-6 border-t">
                <h3 className="text-lg font-semibold text-blue-800">Payment Details</h3>
                {initialData.paymentDetails && initialData.paymentDetails.length > 0 ? (
                  <Card className="shadow-lg rounded-lg border-l-4 border-blue-500">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm font-medium grid grid-cols-[2fr_1fr_1fr_1fr_2fr] gap-4">
                        <div>Supplier</div>
                        <div>Date</div>
                        <div>Amount</div>
                        <div>Method</div>
                        <div>Reference</div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-[400px] overflow-y-auto">
                      {initialData.paymentDetails.map((detail) => (
                        <div key={detail.id} 
                          className="grid grid-cols-[2fr_1fr_1fr_1fr_2fr] gap-4 items-center py-2 border-b last:border-0">
                          <div className="font-medium">{detail.supplier?.name || 'N/A'}</div>
                          <div>{format(new Date(detail.paymentDate), "dd/MM/yy")}</div>
                          <div>Rs. {detail.amount.toFixed(2)}</div>
                          <div>{detail.method || 'N/A'}</div>
                          <div>{detail.transactionId || 'N/A'}</div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ) : <p>No payment details available</p>}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="expenses" className="border rounded-lg bg-white shadow-sm">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="flex justify-between w-full items-center">
              <span className="font-semibold text-lg">Expense Details</span>
              <span className="text-red-600 font-bold">Rs. {totalExpenses.toFixed(2)}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pt-2 pb-4">
            {initialData.expenseDetails && initialData.expenseDetails.length > 0 ? (
              <Card className="shadow-lg rounded-lg border-l-4 border-red-500">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium grid grid-cols-[2fr_1fr_1fr_2fr_1fr] gap-4">
                    <div>Category</div>
                    <div>Date</div>
                    <div>Amount</div>
                    <div>Description</div>
                    <div>Actions</div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-h-[400px] overflow-y-auto">
                  {initialData.expenseDetails.map((detail) => (
                    <div key={detail.id} 
                      className="grid grid-cols-[2fr_1fr_1fr_2fr_1fr] gap-4 items-center py-2 border-b last:border-0">
                      <div className="font-medium">{detail.expenseCategory}</div>
                      <div>{format(new Date(detail.expenseDate), "dd/MM/yy")}</div>
                      <div>Rs. {detail.amount.toFixed(2)}</div>
                      <div className="truncate">{detail.description || 'N/A'}</div>
                      <div>
                        {/* Add action buttons if needed */}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : <p>No expense details available</p>}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="profit" className="border rounded-lg bg-white shadow-sm">
          <AccordionTrigger className="px-6 hover:no-underline">
            <div className="flex justify-between w-full items-center">
              <span className="font-semibold text-lg">Profit Summary</span>
              <span className={`font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Rs. {netProfit.toFixed(2)}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pt-2 pb-4">
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default TourPackageQueryDisplay;