"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPrice } from "@/lib/utils";
import { SalesTable } from "./purchase-table";
import { ReceiptsTable } from "./payments-table";

type Purchase = {
  id: string;
  date: string;
  amount: number;
  description: string;
  packageName: string;
  type: "PURCHASE";
};

type Payment = {
  id: string;
  date: string;
  amount: number;
  description: string;
  packageName: string;
  reference: string;
  paymentMode: string;
  account: string;
  type: "PAYMENT";
};

interface SupplierLedgerClientProps {
  supplier: any;
  purchases: Purchase[];
  payments: Payment[];
  totalPurchases: number;
  totalPayments: number;
  balance: number;
}

export const SupplierLedgerClient: React.FC<SupplierLedgerClientProps> = ({
  supplier,
  purchases,
  payments,
  totalPurchases,
  totalPayments,
  balance
}) => {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{supplier.name}</h2>
          <p className="text-sm text-muted-foreground">
            {supplier.contact || "No contact information"}
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
            <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(totalPurchases)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(totalPayments)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Balance Due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${balance > 0 ? "text-red-600" : "text-green-600"}`}>
              {formatPrice(balance)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Transactions</TabsTrigger>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="space-y-4">
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>All Transactions</CardTitle>
              <CardDescription>
                Showing all financial transactions for this supplier
              </CardDescription>
            </CardHeader>
            <CardContent>
              {purchases.length === 0 && payments.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">No transactions found for this supplier</p>
              ) : (
                <div className="space-y-8">
                  {purchases.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Purchases</h3>
                      <SalesTable data={purchases} />
                    </div>
                  )}
                  {payments.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Payments</h3>
                      <ReceiptsTable data={payments} />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="purchases">
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Purchases</CardTitle>
              <CardDescription>
                Showing all purchases from this supplier
              </CardDescription>
            </CardHeader>
            <CardContent>
              {purchases.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">No purchases found for this supplier</p>
              ) : (
                <SalesTable data={purchases} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="payments">
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Payments</CardTitle>
              <CardDescription>
                Showing all payments to this supplier
              </CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">No payments found for this supplier</p>
              ) : (
                <ReceiptsTable data={payments} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
