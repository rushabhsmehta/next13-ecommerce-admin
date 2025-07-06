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
  Check, 
  ChevronsUpDown, 
  Download, 
  FileSpreadsheet, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { ComprehensiveLedgerTable } from "./comprehensive-ledger-table";

type Transaction = {
  id: string;
  date: string;
  amount: number;
  description: string;
  packageName: string;
  category: string;
  paymentMode: string;
  account: string;
  type: "income" | "expense";
  viewLink: string;
};

interface ComprehensiveLedgerClientProps {
  transactions: Transaction[];
  categories: string[];
  totalExpenses: number;
  totalIncomes: number;
  netBalance: number;
}

export const ComprehensiveLedgerClient: React.FC<ComprehensiveLedgerClientProps> = ({
  transactions,
  categories,
  totalExpenses,
  totalIncomes,
  netBalance,
}) => {
  const router = useRouter();
  const [filteredCategory, setFilteredCategory] = useState<string>("");
  const [filteredPaymentMode, setFilteredPaymentMode] = useState<string>("");
  const [filteredType, setFilteredType] = useState<string>("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  const filteredTransactions = transactions.filter((transaction) => {
    if (filteredCategory && transaction.category !== filteredCategory) {
      return false;
    }

    if (filteredPaymentMode && transaction.paymentMode !== filteredPaymentMode) {
      return false;
    }

    if (filteredType && transaction.type !== filteredType) {
      return false;
    }

    if (dateFrom) {
      const transactionDate = new Date(transaction.date);
      if (transactionDate < dateFrom) return false;
    }

    if (dateTo) {
      const transactionDate = new Date(transaction.date);
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
    setFilteredCategory("");
    setFilteredPaymentMode("");
    setFilteredType("");
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
    doc.text("COMPREHENSIVE FINANCIAL LEDGER", 14, 45);

    // Report metadata
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on: ${format(new Date(), "EEEE, MMMM d, yyyy 'at' h:mm a")}`, 14, 55);

    // Filter information
    let yPosition = 65;
    if (filteredCategory || filteredPaymentMode || filteredType || dateFrom || dateTo) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Applied Filters:", 14, yPosition);
      yPosition += 8;
      
      doc.setFont("helvetica", "normal");
      if (filteredCategory) {
        doc.text(`• Category: ${filteredCategory}`, 20, yPosition);
        yPosition += 6;
      }
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
    doc.text("FINANCIAL SUMMARY", 14, yPosition);
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
    doc.text("TRANSACTION DETAILS", 14, yPosition);
    yPosition += 10;

    const tableData = filteredTransactions.map(transaction => [
      format(new Date(transaction.date), 'dd/MM/yyyy'),
      transaction.type.toUpperCase(),
      transaction.category,
      transaction.packageName || 'General',
      transaction.description || 'No description',
      transaction.paymentMode,
      transaction.account,
      formatPrice(transaction.amount, { forPDF: true })
    ]);

    // Enhanced table styling
    autoTable(doc, {
      head: [['Date', 'Type', 'Category', 'Package', 'Description', 'Mode', 'Account', 'Amount']],
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
        2: { cellWidth: 25 }, // Category
        3: { cellWidth: 25 }, // Package
        4: { cellWidth: 35 }, // Description
        5: { cellWidth: 20, halign: 'center' }, // Mode
        6: { cellWidth: 25 }, // Account
        7: { cellWidth: 25, halign: 'right' } // Amount
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
    const categoryText = filteredCategory ? `-${filteredCategory.replace(/\s+/g, '-')}` : '';
    const filename = `comprehensive-ledger${categoryText}-${today}.pdf`;
    doc.save(filename);
  };

  // Function to generate and download Excel
  const downloadExcel = () => {
    const worksheetData = filteredTransactions.map(transaction => ({
      Date: format(new Date(transaction.date), 'MMMM d, yyyy'),
      Type: transaction.type.toUpperCase(),
      Category: transaction.category,
      Package: transaction.packageName || 'N/A',
      Description: transaction.description || 'No description',
      'Payment Mode': transaction.paymentMode,
      Account: transaction.account,
      Amount: transaction.amount
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Comprehensive Ledger');
    XLSX.writeFile(workbook, 'comprehensive-ledger.xlsx');
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              {formatPrice(Math.abs(filteredNetBalance))}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredNetBalance >= 0 ? 'Profit' : 'Loss'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredTransactions.length}
            </div>
            <p className="text-xs text-muted-foreground">
              All transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            {/* Transaction Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={filteredType} onValueChange={setFilteredType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={categoryOpen}
                    className="w-full justify-between"
                  >
                    {filteredCategory || "All categories"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search category..." />
                    <CommandList>
                      <CommandEmpty>No category found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          onSelect={() => {
                            setFilteredCategory("");
                            setCategoryOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              filteredCategory === "" ? "opacity-100" : "opacity-0"
                            )}
                          />
                          All categories
                        </CommandItem>
                        {categories.map((category) => (
                          <CommandItem
                            key={category}
                            onSelect={() => {
                              setFilteredCategory(category);
                              setCategoryOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                filteredCategory === category ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {category}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Payment Mode Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Mode</label>
              <Select value={filteredPaymentMode} onValueChange={setFilteredPaymentMode}>
                <SelectTrigger>
                  <SelectValue placeholder="All modes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All modes</SelectItem>
                  <SelectItem value="Bank">Bank</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date From Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">From Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "PPP") : "Pick a date"}
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
            </div>

            {/* Date To Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">To Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "PPP") : "Pick a date"}
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
            </div>

            {/* Reset and Export Buttons */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Actions</label>
              <div className="flex flex-col gap-2">
                <Button 
                  variant="outline" 
                  onClick={resetFilters}
                  className="w-full"
                >
                  Reset Filters
                </Button>
              </div>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex gap-2 mt-4">
            <Button onClick={downloadPDF} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
            <Button onClick={downloadExcel} variant="outline" size="sm">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <ComprehensiveLedgerTable data={filteredTransactions} />
    </div>  
  );
};
