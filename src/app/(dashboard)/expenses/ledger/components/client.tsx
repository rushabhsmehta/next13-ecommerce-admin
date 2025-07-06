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
import { CalendarIcon, Check, ChevronsUpDown, Download, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExpensesTable } from "./expenses-table";
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
  const [categoryOpen, setCategoryOpen] = useState(false);
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

  // Function to generate and download PDF
  const generatePDF = () => {
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
    doc.text("EXPENSE LEDGER REPORT", 14, 45);

    // Report metadata
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on: ${format(new Date(), "EEEE, MMMM d, yyyy 'at' h:mm a")}`, 14, 55);

    // Filter information
    let yPosition = 65;
    if (filteredCategory || filteredPaymentMode || dateFrom || dateTo) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Applied Filters:", 14, yPosition);
      yPosition += 8;
      
      doc.setFont("helvetica", "normal");
      if (filteredCategory) {
        doc.text(`• Category: ${filteredCategory}`, 20, yPosition);
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
    doc.text("SUMMARY", 14, yPosition);
    yPosition += 10;

    // Summary box background
    doc.setFillColor(245, 245, 245);
    doc.rect(14, yPosition - 5, 180, 25, 'F');
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Expenses (All): ${formatPrice(totalExpenses)}`, 20, yPosition + 5);
    doc.text(`Number of Transactions (All): ${expenses.length}`, 20, yPosition + 12);
    
    if (filteredCategory || filteredPaymentMode || dateFrom || dateTo) {
      doc.setFont("helvetica", "bold");
      doc.text(`Filtered Total: ${formatPrice(filteredTotal)}`, 110, yPosition + 5);
      doc.text(`Filtered Transactions: ${filteredExpenses.length}`, 110, yPosition + 12);
    }
    
    yPosition += 35;

    // Category breakdown if we have data
    if (filteredExpenses.length > 0) {
      const categoryTotals = filteredExpenses.reduce((acc, expense) => {
        const category = expense.category;
        acc[category] = (acc[category] || 0) + expense.amount;
        return acc;
      }, {} as Record<string, number>);

      if (Object.keys(categoryTotals).length > 1) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("CATEGORY BREAKDOWN", 14, yPosition);
        yPosition += 10;

        Object.entries(categoryTotals)
          .sort(([,a], [,b]) => (b as number) - (a as number))
          .slice(0, 5) // Top 5 categories
          .forEach(([category, amount]) => {
            const categoryAmount = amount as number;
            const percentage = ((categoryAmount / filteredTotal) * 100).toFixed(1);
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.text(`• ${category}: ${formatPrice(categoryAmount)} (${percentage}%)`, 20, yPosition);
            yPosition += 6;
          });
        
        yPosition += 10;
      }
    }

    // Transactions table
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("EXPENSE TRANSACTION DETAILS", 14, yPosition);
    yPosition += 10;

    // Prepare table data with better formatting
    const tableData = filteredExpenses.map(expense => [
      format(new Date(expense.date), "dd/MM/yyyy"),
      expense.category,
      expense.packageName || "General",
      expense.description || "No description",
      expense.paymentMode,
      expense.account,
      formatPrice(expense.amount)
    ]);

    // Enhanced table styling
    autoTable(doc, {
      head: [["Date", "Category", "Package", "Description", "Mode", "Account", "Amount"]],
      body: tableData,
      startY: yPosition,
      styles: { 
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak',
        halign: 'left'
      },
      headStyles: { 
        fillColor: [220, 38, 38],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 20, halign: 'center' }, // Date
        1: { cellWidth: 25 }, // Category
        2: { cellWidth: 25 }, // Package
        3: { cellWidth: 40 }, // Description
        4: { cellWidth: 20, halign: 'center' }, // Mode
        5: { cellWidth: 25 }, // Account
        6: { cellWidth: 25, halign: 'right' } // Amount
      },
      alternateRowStyles: {
        fillColor: [254, 242, 242]
      },
      tableLineColor: [200, 200, 200],
      tableLineWidth: 0.1,
      margin: { left: 14, right: 14 }
    });

    // Footer with totals
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    
    doc.setFillColor(220, 38, 38);
    doc.rect(14, finalY - 5, 180, 20, 'F');
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(`TOTAL EXPENSES: ${formatPrice(filteredTotal)}`, 130, finalY + 8);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text(`Report generated by Aagam Holidays Management System`, 14, finalY + 25);

    // Add footer with page numbers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const pageSize = doc.internal.pageSize;
      const pageWidth = pageSize.getWidth();
      const pageHeight = pageSize.getHeight();

      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 30, pageHeight - 10);
    }

    // Download the PDF
    const today = new Date().toISOString().split('T')[0];
    doc.save(`expense-ledger-report-${today}.pdf`);
  };

  // Function to generate and download Excel
  const generateExcel = () => {
    // Create empty worksheet
    const worksheet = XLSX.utils.aoa_to_sheet([]);

    // Add title and summary information with proper spacing
    const summaryRows = [
      ["Expense Ledger Report"],
      [""],
      [`Generated on: ${new Date().toLocaleDateString()}`],
      [""],
      [`Total Expenses: ${formatPrice(totalExpenses)}`],
      (filteredCategory || filteredPaymentMode || dateFrom || dateTo) ? [`Filtered Total: ${formatPrice(filteredTotal)}`] : [],
      [""],
      [""] // Empty row before the table
    ];

    XLSX.utils.sheet_add_aoa(worksheet, summaryRows, { origin: "A1" });

    // Add data table headers
    const headers = [
      ["Date", "Category", "Package", "Description", "Mode", "Account", "Amount"]
    ];

    const dataRows = filteredExpenses.map(expense => [
      expense.date,
      expense.category,
      expense.packageName,
      expense.description,
      expense.paymentMode,
      expense.account,
      formatPrice(expense.amount)
    ]);

    // Add headers and data
    XLSX.utils.sheet_add_aoa(worksheet, headers, { origin: "A9" });
    XLSX.utils.sheet_add_aoa(worksheet, dataRows, { origin: "A10" });

    // Set column widths
    const columnWidths = [
      { wch: 12 }, // Date
      { wch: 15 }, // Category
      { wch: 15 }, // Package
      { wch: 30 }, // Description
      { wch: 12 }, // Mode
      { wch: 15 }, // Account
      { wch: 15 }, // Amount
    ];

    worksheet["!cols"] = columnWidths;

    // Add merge cells for the title
    if (!worksheet["!merges"]) worksheet["!merges"] = [];
    worksheet["!merges"].push(
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } } // Merge cells for the title row
    );

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Expense Ledger");

    // Generate filename with date
    const today = new Date().toISOString().split('T')[0];
    const fileName = `expense-ledger-${today}.xlsx`;

    // Write to file and trigger download
    XLSX.writeFile(workbook, fileName);
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
        <div className="flex gap-2">
          <Button
            onClick={generateExcel}
            variant="outline"
            className="flex gap-2 items-center"
          >
            <FileSpreadsheet size={16} />
            Excel
          </Button>
          <Button
            onClick={generatePDF}
            variant="outline"
            className="flex gap-2 items-center"
          >
            <Download size={16} />
            PDF
          </Button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-md shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
          <div className="w-full md:w-1/4">
            <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={categoryOpen}
                  className="w-full justify-between"
                >
                  {filteredCategory || "Filter by category"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search category..." />
                  <CommandEmpty>No category found.</CommandEmpty>
                  <CommandList>
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
                        All Categories
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
                              filteredCategory === category
                                ? "opacity-100"
                                : "opacity-0"
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

