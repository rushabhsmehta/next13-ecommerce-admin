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
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SalesTable } from "./sales-table";

type Sale = {
  id: string;
  date: string;
  amount: number;
  description: string;
  packageName: string;
  customerName: string;
  customerContact: string;
};

interface SaleLedgerClientProps {
  sales: Sale[];
  customers: { id: string; name: string }[];
  totalSales: number;
}

export const SaleLedgerClient: React.FC<SaleLedgerClientProps> = ({
  sales,
  customers,
  totalSales,
}) => {
  const router = useRouter();
  const [filteredCustomer, setFilteredCustomer] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  const filteredSales = sales.filter((sale) => {
    if (filteredCustomer && sale.customerName !== filteredCustomer) {
      return false;
    }

    if (dateFrom) {
      const saleDate = new Date(sale.date);
      if (saleDate < dateFrom) return false;
    }

    if (dateTo) {
      const saleDate = new Date(sale.date);
      // Add one day to include the end date
      const endDate = new Date(dateTo);
      endDate.setDate(endDate.getDate() + 1);
      if (saleDate > endDate) return false;
    }

    return true;
  });

  const filteredTotal = filteredSales.reduce((sum, sale) => sum + sale.amount, 0);

  const resetFilters = () => {
    setFilteredCustomer("");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(totalSales)}</div>
            </CardContent>
          </Card>
          {filteredCustomer || dateFrom || dateTo ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Filtered Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPrice(filteredTotal)}</div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <div className="bg-white p-4 rounded-md shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
          <div className="w-full md:w-1/3">
            <Select
              value={filteredCustomer}
              onValueChange={setFilteredCustomer}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Customers</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.name}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full md:w-1/3 flex flex-col md:flex-row gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className="w-full md:w-auto justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "PPP") : "From Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className="w-full md:w-auto justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "PPP") : "To Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button
            variant="secondary"
            className="w-full md:w-auto"
            onClick={resetFilters}
          >
            Reset Filters
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sale Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <SalesTable data={filteredSales} />
        </CardContent>
      </Card>
    </div>
  );
};
