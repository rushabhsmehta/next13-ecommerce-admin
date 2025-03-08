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
import { ExpensesTable } from "./expenses-table";

type Expense = {
  id: string;
  date: string;
  amount: number;
  description: string;
  packageName: string;
  category: string;
  paymentMode: string;
  account: string;
};

interface ExpenseLedgerClientProps {
  expenses: Expense[];
  categories: string[];
  totalExpenses: number;
}

export const ExpenseLedgerClient: React.FC<ExpenseLedgerClientProps> = ({
  expenses,
  categories,
  totalExpenses,
}) => {
  const router = useRouter();
  const [filteredCategory, setFilteredCategory] = useState<string>("");
  const [filteredPaymentMode, setFilteredPaymentMode] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  const filteredExpenses = expenses.filter((expense) => {
    if (filteredCategory && expense.category !== filteredCategory) {
      return false;
    }

    if (filteredPaymentMode && expense.paymentMode !== filteredPaymentMode) {
      return false;
    }

    if (dateFrom) {
      const expenseDate = new Date(expense.date);
      if (expenseDate < dateFrom) return false;
    }

    if (dateTo) {
      const expenseDate = new Date(expense.date);
      // Add one day to include the end date
      const endDate = new Date(dateTo);
      endDate.setDate(endDate.getDate() + 1);
      if (expenseDate > endDate) return false;
    }

    return true;
  });

  const filteredTotal = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  const resetFilters = () => {
    setFilteredCategory("");
    setFilteredPaymentMode("");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(totalExpenses)}</div>
            </CardContent>
          </Card>
          {(filteredCategory || filteredPaymentMode || dateFrom || dateTo) ? (
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
          <div className="w-full md:w-1/4">
            <Select
              value={filteredCategory}
              onValueChange={setFilteredCategory}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full md:w-1/4">
            <Select
              value={filteredPaymentMode}
              onValueChange={setFilteredPaymentMode}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by payment mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Modes</SelectItem>
                <SelectItem value="Bank">Bank</SelectItem>
                <SelectItem value="Cash">Cash</SelectItem>
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
          <CardTitle>Expense Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpensesTable data={filteredExpenses} />
        </CardContent>
      </Card>
    </div>
  );
};
