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
import { TransactionTable } from "../components/transaction-table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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

const CashBookPage = () => {
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [cashAccount, setCashAccount] = useState<CashAccount | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [openingBalance, setOpeningBalance] = useState(0);

  // Date range for filtering (default to last 30 days)
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  // Fetch cash account details
  useEffect(() => {
    const fetchCashAccount = async () => {
      try {
        const response = await axios.get(`/api/cash-accounts/${params.cashAccountId}`);
        setCashAccount(response.data);
      } catch (error) {
        console.error("Failed to fetch cash account:", error);
      }
    };

    if (params.cashAccountId) {
      fetchCashAccount();
    }
  }, [params.cashAccountId]);

  // Fetch transactions when date range changes
  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const startDate = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : '';
        const endDate = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : '';

        const response = await axios.get(
          `/api/cash-accounts/${params.cashAccountId}/transactions?startDate=${startDate}&endDate=${endDate}`
        );

        setTransactions(response.data.transactions);
        setOpeningBalance(response.data.openingBalance);
      } catch (error) {
        console.error("Failed to fetch transactions:", error);
      } finally {
        setLoading(false);
      }
    };

    if (params.cashAccountId && dateRange.from && dateRange.to) {
      fetchTransactions();
    }
  }, [params.cashAccountId, dateRange]);

  const handleFromDateChange = (date: Date | undefined) => {
    if (date) {
      setDateRange(prev => ({
        from: date,
        to: prev.to
      }));
    }
  };

  const handleToDateChange = (date: Date | undefined) => {
    if (date) {
      setDateRange(prev => ({
        from: prev.from,
        to: date
      }));
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

  // Function to generate and download PDF
  const generatePDF = () => {
    if (!cashAccount) return;
    
    const doc = new jsPDF();

    // Add report title
    doc.setFontSize(18);
    doc.text("Cash Book Report", 14, 22);

    // Add account information
    doc.setFontSize(12);
    doc.text(`Account: ${cashAccount.accountName}`, 14, 32);
    
    // Add date range
    const fromDate = dateRange.from ? format(dateRange.from, 'MMMM d, yyyy') : 'N/A';
    const toDate = dateRange.to ? format(dateRange.to, 'MMMM d, yyyy') : 'N/A';
    doc.text(`Period: ${fromDate} to ${toDate}`, 14, 40);
    
    // Add generation date
    doc.setFontSize(10);
    doc.text(`Generated on: ${format(new Date(), 'MMMM d, yyyy h:mm a')}`, 14, 48);

    // Add summary metrics
    doc.setFontSize(12);
    const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'INR' });
    doc.text(`Opening Balance: ${formatter.format(openingBalance)}`, 14, 56);
    
    // Calculate totals
    const totalInflow = transactions.filter(t => t.isInflow).reduce((sum, t) => sum + t.amount, 0);
    const totalOutflow = transactions.filter(t => !t.isInflow).reduce((sum, t) => sum + t.amount, 0);
    const closingBalance = openingBalance + totalInflow - totalOutflow;
    
    doc.text(`Total Inflow: ${formatter.format(totalInflow)}`, 14, 64);
    doc.text(`Total Outflow: ${formatter.format(totalOutflow)}`, 14, 72);
    doc.text(`Closing Balance: ${formatter.format(closingBalance)}`, 14, 80);

    // Add table data
    const tableData = transactions.map(transaction => [
      format(new Date(transaction.date), 'dd/MM/yyyy'),
      transaction.type,
      transaction.description,
      transaction.reference || '-',
      transaction.isInflow ? formatter.format(transaction.amount) : '-',
      !transaction.isInflow ? formatter.format(transaction.amount) : '-',
    ]);

    // Add the table
    autoTable(doc, {
      head: [["Date", "Type", "Description", "Reference", "Inflow", "Outflow"]],
      body: tableData,
      startY: 90,
      styles: { fontSize: 10 }
    });

    // Add footer with page numbers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const pageSize = doc.internal.pageSize;
      const pageWidth = pageSize.getWidth();
      const pageHeight = pageSize.getHeight();

      doc.setFontSize(8);
      doc.text(`Generated on: ${format(new Date(), 'MMMM d, yyyy h:mm a')}`, 14, pageHeight - 10);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 30, pageHeight - 10);
    }

    // Download the PDF
    doc.save(`cash-book-${cashAccount.accountName}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  // Function to generate and download Excel
  const generateExcel = () => {
    if (!cashAccount) return;
    
    // Create empty worksheet
    const worksheet = XLSX.utils.aoa_to_sheet([]);

    // Add title and account information
    const titleRows = [
      ["Cash Book Report"],
      [`Account: ${cashAccount.accountName}`],
      [`Period: ${dateRange.from ? format(dateRange.from, 'MMMM d, yyyy') : 'N/A'} to ${dateRange.to ? format(dateRange.to, 'MMMM d, yyyy') : 'N/A'}`],
      [`Generated on: ${format(new Date(), 'MMMM d, yyyy h:mm a')}`],
      [""],
    ];

    XLSX.utils.sheet_add_aoa(worksheet, titleRows, { origin: "A1" });

    // Add summary information
    const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'INR' });
    const totalInflow = transactions.filter(t => t.isInflow).reduce((sum, t) => sum + t.amount, 0);
    const totalOutflow = transactions.filter(t => !t.isInflow).reduce((sum, t) => sum + t.amount, 0);
    const closingBalance = openingBalance + totalInflow - totalOutflow;

    const summaryRows = [
      ["Summary:"],
      ["Opening Balance:", formatter.format(openingBalance)],
      ["Total Inflow:", formatter.format(totalInflow)],
      ["Total Outflow:", formatter.format(totalOutflow)],
      ["Closing Balance:", formatter.format(closingBalance)],
      [""],
    ];

    XLSX.utils.sheet_add_aoa(worksheet, summaryRows, { origin: "A6" });

    // Add data table headers
    const headers = [
      ["Date", "Type", "Description", "Reference", "Inflow", "Outflow", "Note"]
    ];

    const dataRows = transactions.map(transaction => [
      format(new Date(transaction.date), 'dd/MM/yyyy'),
      transaction.type,
      transaction.description,
      transaction.reference || '-',
      transaction.isInflow ? transaction.amount : null,
      !transaction.isInflow ? transaction.amount : null,
      transaction.note || ''
    ]);

    // Add headers and data
    XLSX.utils.sheet_add_aoa(worksheet, headers, { origin: "A13" });
    XLSX.utils.sheet_add_aoa(worksheet, dataRows, { origin: "A14" });

    // Format numbers as currency
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:G1000');
    for (let R = 13; R <= range.e.r; ++R) {
      const inflowCell = XLSX.utils.encode_cell({r: R, c: 4}); // Column E (Inflow)
      const outflowCell = XLSX.utils.encode_cell({r: R, c: 5}); // Column F (Outflow)

      if (worksheet[inflowCell] && worksheet[inflowCell].v) {
        worksheet[inflowCell].z = '"Rs. "#,##0.00';
      }
      if (worksheet[outflowCell] && worksheet[outflowCell].v) {
        worksheet[outflowCell].z = '"Rs. "#,##0.00';
      }
    }

    // Set column widths
    const columnWidths = [
      { wch: 12 },  // Date
      { wch: 15 },  // Type
      { wch: 30 },  // Description
      { wch: 15 },  // Reference
      { wch: 15 },  // Inflow
      { wch: 15 },  // Outflow
      { wch: 20 },  // Note
    ];

    worksheet["!cols"] = columnWidths;

    // Add merge cells for the title
    if (!worksheet["!merges"]) worksheet["!merges"] = [];
    worksheet["!merges"].push(
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } } // Merge cells for title
    );

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Cash Book");

    // Generate filename with date
    const today = format(new Date(), 'yyyy-MM-dd');
    const fileName = `cash-book-${cashAccount.accountName}-${today}.xlsx`;

    // Write to file and trigger download
    XLSX.writeFile(workbook, fileName);
  };

  if (!cashAccount && loading) {
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
          title={`Cash Book - ${cashAccount?.accountName || ''}`}
          description="View all transactions in this cash account"
        />
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <Button
              onClick={generateExcel}
              variant="outline"
              className="flex gap-2 items-center"
              disabled={loading || !cashAccount}
            >
              <FileSpreadsheet size={16} />
              Excel
            </Button>
            <Button
              onClick={generatePDF}
              variant="outline"
              className="flex gap-2 items-center"
              disabled={loading || !cashAccount}
            >
              <Download size={16} />
              PDF
            </Button>
          </div>
          {/* From Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[180px] justify-start text-left font-normal",
                  !dateRange.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  format(dateRange.from, "LLL dd, y")
                ) : (
                  <span>Start date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="flex w-auto flex-col space-y-2 p-2" align="start">
              <div className="rounded-md border">
                <Calendar
                  initialFocus
                  mode="single"
                  selected={dateRange.from}
                  onSelect={handleFromDateChange}
                  disabled={(date) => date > new Date()}
                />
              </div>
            </PopoverContent>
          </Popover>

          <span className="text-muted-foreground">to</span>

          {/* To Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[180px] justify-start text-left font-normal",
                  !dateRange.to && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.to ? (
                  format(dateRange.to, "LLL dd, y")
                ) : (
                  <span>End date</span>
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
                  mode="single"
                  selected={dateRange.to}
                  onSelect={handleToDateChange}
                  disabled={(date) => date > new Date() || (dateRange.from ? date < dateRange.from : false)}
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

export default CashBookPage;