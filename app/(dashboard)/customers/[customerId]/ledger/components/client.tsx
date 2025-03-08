"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import { SalesTable } from "./sales-table";
import { ReceiptsTable } from "./receipts-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LedgerTransactionsTable } from "./ledger-transactions-table";

type Sale = {
  id: string;
  date: string;
  amount: number;
  description: string;
  packageName: string;
  type: "SALE";
};

type Receipt = {
  id: string;
  date: string;
  amount: number;
  description: string;
  packageName: string;
  reference: string;
  paymentMode: string;
  account: string;
  type: "RECEIPT";
};

interface CustomerLedgerClientProps {
  customer: any;
  sales: Sale[];
  receipts: Receipt[];
  totalSales: number;
  totalReceipts: number;
  balance: number;
}

export const CustomerLedgerClient: React.FC<CustomerLedgerClientProps> = ({
  customer,
  sales,
  receipts,
  totalSales,
  totalReceipts,
  balance
}) => {
  const router = useRouter();

  // Combine transactions for the full ledger view
  const allTransactions = [
    ...sales,
    ...receipts,
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{customer.name}</h2>
          <p className="text-sm text-muted-foreground">
            {customer.contact || "No contact information"}
          </p>
        </div>
        <Button
          onClick={() => router.back()}
          variant="outline"
        >
          Back
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(totalSales)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Receipts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(totalReceipts)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              balance > 0 ? "text-red-600" : balance < 0 ? "text-green-600" : ""
            }`}>
              {formatPrice(balance)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Transactions</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="receipts">Receipts</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="space-y-4">
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Ledger Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <LedgerTransactionsTable data={allTransactions} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="sales">
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <SalesTable data={sales} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="receipts">
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Receipts</CardTitle>
            </CardHeader>
            <CardContent>
              <ReceiptsTable data={receipts} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
