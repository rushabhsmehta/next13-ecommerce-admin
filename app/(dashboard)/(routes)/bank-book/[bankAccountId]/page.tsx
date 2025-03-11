"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "next/navigation";
import { format, subDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { CalendarIcon } from "lucide-react";

import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TransactionTable } from "../components/transaction-table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface BankAccount {
  id: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  openingBalance: number;
}

interface Transaction {
  id: string;
  date: string;
  type: string;
  description: string;
  reference: string;
  amount: number;
  isInflow: boolean;
  note: string;
  transactionId?: string;
}

const BankBookPage = () => {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [openingBalance, setOpeningBalance] = useState(0);

  // Date range for filtering (default to last 30 days)
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  
  // Fetch bank account details
  useEffect(() => {
    const fetchBankAccount = async () => {
      try {
        const response = await axios.get(`/api/bank-accounts/${params.bankAccountId}`);
        setBankAccount(response.data);
      } catch (error) {
        console.error("Failed to fetch bank account:", error);
      }
    };

    if (params.bankAccountId) {
      fetchBankAccount();
    }
  }, [params.bankAccountId]);

  // Fetch transactions when date range changes
  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const startDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : '';
        const endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : '';

        const response = await axios.get(
          `/api/bank-accounts/${params.bankAccountId}/transactions?startDate=${startDate}&endDate=${endDate}`
        );

        setTransactions(response.data.transactions);
        setOpeningBalance(response.data.openingBalance);
      } catch (error) {
        console.error("Failed to fetch transactions:", error);
      } finally {
        setLoading(false);
      }
    };

    if (params.bankAccountId && dateRange.from && dateRange.to) {
      fetchTransactions();
    }
  }, [params.bankAccountId, dateRange]);

  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (range) {
      setDateRange(range);
    }
  };

  const handlePresetChange = (value: string) => {
    const now = new Date();
    let newRange: DateRange | undefined;

    switch (value) {
      case "7":
        newRange = {
          from: subDays(now, 7),
          to: now
        };
        break;
      case "30":
        newRange = {
          from: subDays(now, 30),
          to: now
        };
        break;
      case "90":
        newRange = {
          from: subDays(now, 90),
          to: now
        };
        break;
      case "this-month":
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        newRange = {
          from: firstDayOfMonth,
          to: now
        };
        break;
      default:
        return;
    }

    setDateRange(newRange);
  };

  if (!bankAccount && loading) {
    return (
      <div className="p-8">
        <Skeleton className="h-8 w-[200px] mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
      </div>
    );
  }

  return (
    <div className="p-8 pt-6">
      <div className="flex items-center justify-between">
        <Heading
          title={`Bank Book - ${bankAccount?.accountName || ''}`}
          description={bankAccount ? `${bankAccount.bankName} - ${bankAccount.accountNumber}` : ''}
        />
        <div className="flex items-center gap-4">
          {/* Date Range Picker Inline Implementation */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-[300px] justify-start text-left font-normal",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} - {" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Select date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="flex w-auto flex-col space-y-2 p-2" align="start">
              <Select onValueChange={handlePresetChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a preset" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="this-month">This month</SelectItem>
                </SelectContent>
              </Select>
              <div className="rounded-md border">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={handleDateRangeChange}
                  numberOfMonths={2}
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      <Separator className="my-4" />

      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <TransactionTable
          transactions={transactions}
          openingBalance={openingBalance}
        />
      )}
    </div>
  );
};

export default BankBookPage;
