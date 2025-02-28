'use client'

import Image from 'next/image';
import Link from 'next/link';
import { CheckCircleIcon, CreditCardIcon, InfoIcon, PlaneIcon, PlaneTakeoffIcon, Shield, XCircleIcon, ArrowUpCircle, ArrowDownCircle, DollarSign } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Location, Images, Hotel, TourPackageQuery, Itinerary, FlightDetails, Activity, PurchaseDetail, SaleDetail, PaymentDetail, ReceiptDetail, ExpenseDetail, Supplier, Customer } from "@prisma/client";
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns';
import { Separator } from '@radix-ui/react-separator';

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
    }> | null;
    receiptDetails: Array<ReceiptDetail & {
      customer: Customer | null;
    }> | null;
    expenseDetails: ExpenseDetail[] | null;
  } | null;
}

const calculateTotals = (initialData: any) => {
  const totalSales = initialData.saleDetails?.reduce((sum: number, detail: any) => 
    sum + (detail.salePrice || 0), 0) || 0;
  
  const totalReceipts = initialData.receiptDetails?.reduce((sum: number, detail: any) => 
    sum + (detail.amount || 0), 0) || 0;

  const totalPurchases = initialData.purchaseDetails?.reduce((sum: number, detail: any) => 
    sum + (detail.price || 0), 0) || 0;
  
  const totalPayments = initialData.paymentDetails?.reduce((sum: number, detail: any) => 
    sum + (detail.amount || 0), 0) || 0;

  const totalExpenses = initialData.expenseDetails?.reduce((sum: number, detail: any) => 
    sum + (detail.amount || 0), 0) || 0;

  const profit = totalSales - (totalPurchases + totalExpenses);
  const pendingSales = totalSales - totalReceipts;
  const pendingPayments = totalPurchases - totalPayments;

  return {
    totalSales,
    totalReceipts,
    totalPurchases,
    totalPayments,
    totalExpenses,
    profit,
    pendingSales,
    pendingPayments
  };
};

export const TourPackageQueryDisplay: React.FC<TourPackageQueryDisplayProps> = ({
  initialData,
}) => {
  const searchParams = useSearchParams();

  if (!initialData) return <div>No data available</div>;

  return (
    <div className="space-y-8 w-full max-w-4xl mx-auto">
      {/* Existing Package Header Card */}
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

      {/* Financial Summary Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-purple-800 mb-4">Financial Overview</h2>
        <Card className="shadow-lg rounded-lg border-l-4 border-purple-500">
          <CardContent className="p-6">
            {(() => {
              const totals = calculateTotals(initialData);
              return (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Revenue Card */}
                    <Card className="bg-green-50 border-green-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
                          <ArrowUpCircle className="h-4 w-4" />
                          Revenue
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-700">
                          ₹{totals.totalSales.toLocaleString('en-IN')}
                        </div>
                        <p className="text-xs text-green-600 mt-1">
                          Received: ₹{totals.totalReceipts.toLocaleString('en-IN')}
                        </p>
                      </CardContent>
                    </Card>

                    {/* Expenses Card */}
                    <Card className="bg-red-50 border-red-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
                          <ArrowDownCircle className="h-4 w-4" />
                          Expenses
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-red-700">
                          ₹{(totals.totalPurchases + totals.totalExpenses).toLocaleString('en-IN')}
                        </div>
                        <p className="text-xs text-red-600 mt-1">
                          Paid: ₹{totals.totalPayments.toLocaleString('en-IN')}
                        </p>
                      </CardContent>
                    </Card>

                    {/* Profit Card */}
                    <Card className={`${totals.profit >= 0 ? 'bg-purple-50 border-purple-200' : 'bg-red-50 border-red-200'}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className={`text-sm font-medium flex items-center gap-2 ${
                          totals.profit >= 0 ? 'text-purple-700' : 'text-red-700'
                        }`}>
                          <DollarSign className="h-4 w-4" />
                          Net Profit/Loss
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-2xl font-bold ${
                          totals.profit >= 0 ? 'text-purple-700' : 'text-red-700'
                        }`}>
                          ₹{Math.abs(totals.profit).toLocaleString('en-IN')}
                          <span className="text-xs ml-1">
                            {totals.profit >= 0 ? 'Profit' : 'Loss'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Pending Amounts */}
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <h3 className="font-semibold text-yellow-800 mb-2">Pending Receivables</h3>
                      <p className="text-lg font-bold text-yellow-700">
                        ₹{totals.pendingSales.toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <h3 className="font-semibold text-yellow-800 mb-2">Pending Payables</h3>
                      <p className="text-lg font-bold text-yellow-700">
                        ₹{totals.pendingPayments.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* ... Rest of your existing code ... */}
    </div>
  );
};

export default TourPackageQueryDisplay;