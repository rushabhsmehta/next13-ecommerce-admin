"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpIcon, ArrowDownIcon, FileTextIcon, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface GSTSummaryCardsProps {
  metrics: {
    totalOutputGst: number;
    totalInputGst: number;
    netGstLiability: number;
    totalSalesAmount: number;
    totalPurchasesAmount: number;
    transactionCount: {
      sales: number;
      purchases: number;
    };
  };
}

export function GSTSummaryCards({ metrics }: GSTSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Output GST</CardTitle>
          <ArrowUpIcon className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₹{metrics.totalOutputGst.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            GST collected on sales: ₹{metrics.totalSalesAmount.toFixed(2)}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Input GST</CardTitle>
          <ArrowDownIcon className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₹{metrics.totalInputGst.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            GST paid on purchases: ₹{metrics.totalPurchasesAmount.toFixed(2)}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Net GST Liability</CardTitle>
          <FileTextIcon className={cn("h-4 w-4", metrics.netGstLiability > 0 ? "text-red-500" : "text-green-500")} />
        </CardHeader>
        <CardContent>
          <div className={cn("text-2xl font-bold", metrics.netGstLiability > 0 ? "text-red-500" : "text-green-500")}>
            ₹{metrics.netGstLiability.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {metrics.netGstLiability > 0 
              ? "GST payable to government" 
              : "GST refundable from government"}
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Transactions</CardTitle>
          <CalendarIcon className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {metrics.transactionCount.sales + metrics.transactionCount.purchases}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Sales: {metrics.transactionCount.sales} | Purchases: {metrics.transactionCount.purchases}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
