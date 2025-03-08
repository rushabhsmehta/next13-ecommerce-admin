"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomersTable } from "./customers-table";

type CustomerSummary = {
  id: string;
  name: string;
  contact: string;
  totalSales: number;
  totalReceipts: number;
  balance: number;
};

interface CustomersLedgerClientProps {
  customers: CustomerSummary[];
  totalSales: number;
  totalReceipts: number;
  totalBalance: number;
}

export const CustomersLedgerClient: React.FC<CustomersLedgerClientProps> = ({
  customers,
  totalSales,
  totalReceipts,
  totalBalance,
}) => {
  const router = useRouter();
  const [balanceFilter, setBalanceFilter] = useState<string>("all");

  const filteredCustomers = customers.filter((customer) => {
    if (balanceFilter === "due") return customer.balance > 0;
    if (balanceFilter === "overpaid") return customer.balance < 0;
    if (balanceFilter === "settled") return customer.balance === 0;
    return true; // "all" filter
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
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
            <CardTitle className="text-sm font-medium">Balance Due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalBalance > 0 ? "text-red-600" : totalBalance < 0 ? "text-green-600" : ""}`}>
              {formatPrice(totalBalance)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Customers Count</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white p-4 rounded-md shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-full md:w-1/4">
            <Select
              value={balanceFilter}
              onValueChange={setBalanceFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by balance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                <SelectItem value="due">With Balance Due</SelectItem>
                <SelectItem value="overpaid">Overpaid</SelectItem>
                <SelectItem value="settled">Fully Settled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={() => router.push('/customers/new')} 
            className="ml-auto"
          >
            Add New Customer
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer Statements</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomersTable data={filteredCustomers} />
        </CardContent>
      </Card>
    </div>
  );
};
