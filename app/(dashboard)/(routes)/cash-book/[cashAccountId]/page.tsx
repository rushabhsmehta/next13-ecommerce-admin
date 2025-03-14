"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import axios from "axios";
import { useParams } from "next/navigation";
import { format, subDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { CalendarIcon, Download, FileSpreadsheet } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

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
import { TransactionTable, CashTransaction } from "../components/transaction-table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import prismadb from "@/lib/prismadb";
import { notFound } from "next/navigation";

interface CashAccount {
  id: string;
  accountName: string;
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
}

interface CashBookPageProps {
  params: {
    cashAccountId: string;
  };
}

const CashBookPage = async ({ params }: CashBookPageProps) => {
  // Get cash account details
  const cashAccount = await prismadb.cashAccount.findUnique({
    where: {
      id: params.cashAccountId,
    },
  });

  if (!cashAccount) {
    return notFound();
  }

  // Get transactions for this cash account
  const dbTransactions = await prismadb.transaction.findMany({
    where: {
      cashAccountId: params.cashAccountId,
    },
    orderBy: {
      date: 'asc',
    },
  });

  // Calculate opening balance and running balance
  let runningBalance = cashAccount.openingBalance;
  
  // Transform to the expected transaction format
  const formattedTransactions: CashTransaction[] = dbTransactions.map(transaction => {
    // Update running balance
    const amount = transaction.amount;
    runningBalance += amount;

    return {
      id: transaction.id,
      date: format(transaction.date, "yyyy-MM-dd"),
      type: transaction.type,
      description: transaction.description,
      inflow: amount > 0 ? amount : 0,
      outflow: amount < 0 ? Math.abs(amount) : 0,
      balance: runningBalance,
      reference: transaction.reference || undefined
    };
  });

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Heading 
          title={`${cashAccount.name} - Cash Book`}
          description={`View transactions and balance for ${cashAccount.name}`}
        />
        <Separator />
        
        <TransactionTable 
          data={formattedTransactions}
          openingBalance={cashAccount.openingBalance} 
          accountName={cashAccount.name} 
        />
      </div>
    </div>
  );
};

export default CashBookPage;
