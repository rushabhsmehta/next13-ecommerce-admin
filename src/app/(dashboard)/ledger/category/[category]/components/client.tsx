"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { 
  CalendarIcon, 
  Download, 
  FileSpreadsheet, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Eye,
  ArrowLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { ComprehensiveLedgerTable } from "../../../components/comprehensive-ledger-table";
import Link from "next/link";

type Transaction = {
  id: string;
  date: string;
  rawDate: Date;
  amount: number;
  description: string;
  packageName: string;
  category: string;
  paymentMode: string;
  account: string;
  type: "expense" | "income";
  viewLink: string;
};

interface CategoryLedgerClientProps {
  transactions: Transaction[];
  expenses: Transaction[];
  incomes: Transaction[];
  categoryName: string;
  totalExpenses: number;
  totalIncomes: number;
}

export const CategoryLedgerClient: React.FC<CategoryLedgerClientProps> = ({
  transactions,
  expenses,
  incomes,
  categoryName,
  totalExpenses,
  totalIncomes
}) => {
  const router = useRouter();
  const [filteredType, setFilteredType] = useState<string>("");
  const [filteredPaymentMode, setFilteredPaymentMode] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  // Apply filters
  const filteredTransactions = transactions.filter((transaction) => {
    if (filteredType && transaction.type !== filteredType) {
      return false;
    }

    if (filteredPaymentMode && transaction.paymentMode !== filteredPaymentMode) {
      return false;
    }

    if (dateFrom) {
      const transactionDate = new Date(transaction.rawDate);
      if (transactionDate < dateFrom) return false;
    }

    if (dateTo) {
      const transactionDate = new Date(transaction.rawDate);
      const endDate = new Date(dateTo);
      endDate.setDate(endDate.getDate() + 1);
      if (transactionDate > endDate) return false;
    }

    return true;
  });

  const filteredExpenses = filteredTransactions.filter(t => t.type === "expense");
  const filteredIncomes = filteredTransactions.filter(t => t.type === "income");
  const filteredExpenseTotal = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const filteredIncomeTotal = filteredIncomes.reduce((sum, income) => sum + income.amount, 0);
  const filteredNetBalance = filteredIncomeTotal - filteredExpenseTotal;

  const resetFilters = () => {
    setFilteredType("");
    setFilteredPaymentMode("");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  // Function to generate and download PDF
  const downloadPDF = () => {
    const doc = new jsPDF();
    
    // Company header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Aagam Holidays", 14, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Travel & Tourism Services", 14, 28);

    // Report title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`${categoryName.toUpperCase()} - CATEGORY LEDGER`, 14, 45);

    // Report metadata
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on: ${format(new Date(), "EEEE, MMMM d, yyyy 'at' h:mm a")}`, 14, 55);

    // Filter information
    let yPosition = 65;
    if (filteredType || filteredPaymentMode || dateFrom || dateTo) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Applied Filters:", 14, yPosition);
      yPosition += 8;
      
      doc.setFont("helvetica", "normal");
      if (filteredType) {
        doc.text(`• Type: ${filteredType}`, 20, yPosition);
        yPosition += 6;
      }
      if (filteredPaymentMode) {
        doc.text(`• Payment Mode: ${filteredPaymentMode}`, 20, yPosition);
        yPosition += 6;
      }
      if (dateFrom) {
        doc.text(`• Date From: ${format(dateFrom, "MMM d, yyyy")}`, 20, yPosition);
        yPosition += 6;
      }
      if (dateTo) {
        doc.text(`• Date To: ${format(dateTo, "MMM d, yyyy")}`, 20, yPosition);
        yPosition += 6;
      }
      yPosition += 5;
    }

    // Summary section
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`${categoryName.toUpperCase()} SUMMARY`, 14, yPosition);
    yPosition += 10;

    // Summary boxes
    doc.setFillColor(229, 231, 235);
    doc.rect(14, yPosition - 5, 180, 30, 'F');
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Income: ${formatPrice(filteredIncomeTotal, { forPDF: true })}`, 20, yPosition + 5);
    doc.text(`Total Expenses: ${formatPrice(filteredExpenseTotal, { forPDF: true })}`, 20, yPosition + 12);
    doc.setFont("helvetica", "bold");
    const netColor = filteredNetBalance >= 0 ? [34, 197, 94] : [239, 68, 68];
    doc.setTextColor(netColor[0], netColor[1], netColor[2]);
    doc.text(`Net Balance: ${formatPrice(filteredNetBalance, { forPDF: true })}`, 20, yPosition + 19);
    doc.setTextColor(0, 0, 0);
    
    doc.setFont("helvetica", "normal");
    doc.text(`Income Transactions: ${filteredIncomes.length}`, 110, yPosition + 5);
    doc.text(`Expense Transactions: ${filteredExpenses.length}`, 110, yPosition + 12);
    doc.text(`Total Transactions: ${filteredTransactions.length}`, 110, yPosition + 19);
    
    yPosition += 40;

    // Transactions table
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`${categoryName.toUpperCase()} TRANSACTION DETAILS`, 14, yPosition);
    yPosition += 10;

    const tableData = filteredTransactions.map(transaction => [
      format(new Date(transaction.rawDate), 'dd/MM/yyyy'),
      transaction.type.toUpperCase(),
      transaction.packageName || 'General',
      transaction.description || 'No description',
      transaction.paymentMode,
      transaction.account,
      formatPrice(transaction.amount, { forPDF: true })
    ]);

    // Enhanced table styling
    autoTable(doc, {
      head: [['Date', 'Type', 'Package', 'Description', 'Mode', 'Account', 'Amount']],
      body: tableData,
      startY: yPosition,
      styles: { 
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak',
        halign: 'left'
      },
      headStyles: { 
        fillColor: [52, 73, 94],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 20, halign: 'center' }, // Date
        1: { cellWidth: 15, halign: 'center' }, // Type
        2: { cellWidth: 30 }, // Package
        3: { cellWidth: 40 }, // Description
        4: { cellWidth: 20, halign: 'center' }, // Mode
        5: { cellWidth: 30 }, // Account
        6: { cellWidth: 25, halign: 'right' } // Amount
      },
      alternateRowStyles: {
        fillColor: [249, 249, 249]
      },
      tableLineColor: [200, 200, 200],
      tableLineWidth: 0.1,
      margin: { left: 14, right: 14 }
    });

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    
    doc.setFillColor(52, 73, 94);
    doc.rect(14, finalY - 5, 180, 20, 'F');
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(`NET BALANCE: ${formatPrice(filteredNetBalance, { forPDF: true })}`, 130, finalY + 8);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text(`Report generated by Aagam Holidays Management System`, 14, finalY + 25);

    const today = new Date().toISOString().split('T')[0];
    const filename = `${categoryName.toLowerCase().replace(/\s+/g, '-')}-ledger-${today}.pdf`;
    doc.save(filename);
  };

  // Function to generate and download Excel
  const downloadExcel = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([]);

    // Add title and summary information
    const summaryRows = [
      [`${categoryName} Category Ledger`],
      [""],
      [`Generated on: ${new Date().toLocaleDateString()}`],
      [""],
      [`Total Income: ${formatPrice(filteredIncomeTotal)}`],
      [`Total Expenses: ${formatPrice(filteredExpenseTotal)}`],
      [`Net Balance: ${formatPrice(filteredNetBalance)}`],
      [""],
      [""] // Empty row before the table
    ];

    XLSX.utils.sheet_add_aoa(worksheet, summaryRows, { origin: "A1" });

    // Add data table headers
    const headers = [
      ["Date", "Type", "Package", "Description", "Payment Mode", "Account", "Amount"]
    ];

    const dataRows = filteredTransactions.map(transaction => [
      format(new Date(transaction.rawDate), "MMM d, yyyy"),
      transaction.type.toUpperCase(),
      transaction.packageName || "N/A",
      transaction.description || "No description",
      transaction.paymentMode,
      transaction.account,
      formatPrice(transaction.amount)
    ]);

    XLSX.utils.sheet_add_aoa(worksheet, headers, { origin: "A10" });
    XLSX.utils.sheet_add_aoa(worksheet, dataRows, { origin: "A11" });

    // Set column widths
    const columnWidths = [
      { wch: 12 }, // Date
      { wch: 10 }, // Type
      { wch: 25 }, // Package
      { wch: 40 }, // Description
      { wch: 15 }, // Payment Mode
      { wch: 20 }, // Account
      { wch: 15 }, // Amount
    ];

    worksheet["!cols"] = columnWidths;

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${categoryName} Ledger`);

    // Generate filename with date
    const today = new Date().toISOString().split('T')[0];
    const filename = `${categoryName.toLowerCase().replace(/\s+/g, '-')}-ledger-${today}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  return (
    <>
      <div className="flex-col space-y-6">
        {/* Back Button */}
        <div className="flex items-center justify-between">
          <Link href="/ledger">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Full Ledger
            </Button>
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatPrice(filteredIncomeTotal)}
              </div>
              <p className="text-xs text-muted-foreground">
                {filteredIncomes.length} transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatPrice(filteredExpenseTotal)}
              </div>
              <p className="text-xs text-muted-foreground">
                {filteredExpenses.length} transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${filteredNetBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPrice(filteredNetBalance)}
              </div>
              <p className="text-xs text-muted-foreground">
                {filteredTransactions.length} total transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Category</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {categoryName}
              </div>
              <p className="text-xs text-muted-foreground">
                All transactions for this category
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Export */}
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex flex-col md:flex-row items-center gap-4">
            {/* Transaction Type Filter */}
            <Select value={filteredType} onValueChange={setFilteredType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>

            {/* Payment Mode Filter */}
            <Select value={filteredPaymentMode} onValueChange={setFilteredPaymentMode}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by payment mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Payment Modes</SelectItem>
                <SelectItem value="Bank">Bank</SelectItem>
                <SelectItem value="Cash">Cash</SelectItem>
              </SelectContent>
            </Select>

            {/* Date From Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[200px] justify-start text-left font-normal",
                    !dateFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "PPP") : <span>From date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Date To Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[200px] justify-start text-left font-normal",
                    !dateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "PPP") : <span>To date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Reset Filters */}
            {(filteredType || filteredPaymentMode || dateFrom || dateTo) && (
              <Button variant="outline" onClick={resetFilters}>
                Reset Filters
              </Button>
            )}
          </div>

          {/* Export Buttons */}
          <div className="flex gap-2">
            <Button onClick={downloadPDF} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              PDF
            </Button>
            <Button onClick={downloadExcel} variant="outline" size="sm">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Excel
            </Button>
          </div>
        </div>

        {/* Transactions Table */}
        <ComprehensiveLedgerTable data={filteredTransactions} />
      </div>
    </>
  );
};
