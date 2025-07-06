"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, ChevronsUpDown, Download, FileSpreadsheet, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExpensesListTable } from "./expenses-list-table";
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
import Link from "next/link";

interface ExpensesClientProps {
  expenses: any[];
  categories: { id: string; name: string }[];
}

export const ExpensesClient: React.FC<ExpensesClientProps> = ({
  expenses,
  categories,
}) => {
  const router = useRouter();
  const [filteredCategory, setFilteredCategory] = useState<string>("");
  const [filteredStatus, setFilteredStatus] = useState<string>("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Calculate total amount
  const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  const filteredExpenses = expenses.filter((expense) => {
    // Filter by category
    if (filteredCategory && expense.expenseCategory?.name !== filteredCategory) {
      return false;
    }

    // Filter by status
    if (filteredStatus) {
      if (filteredStatus === "accrued" && !expense.isAccrued) {
        return false;
      }
      if (filteredStatus === "paid" && expense.isAccrued) {
        return false;
      }
    }

    // Filter by start date
    if (dateFrom) {
      const expenseDate = new Date(expense.expenseDate);
      if (expenseDate < dateFrom) return false;
    }

    // Filter by end date
    if (dateTo) {
      const expenseDate = new Date(expense.expenseDate);
      // Add one day to include the end date
      const endDate = new Date(dateTo);
      endDate.setDate(endDate.getDate() + 1);
      if (expenseDate > endDate) return false;
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesDescription = expense.description?.toLowerCase().includes(query);
      const matchesCategory = expense.expenseCategory?.name?.toLowerCase().includes(query);
      const matchesAmount = expense.amount.toString().includes(query);
      
      if (!matchesDescription && !matchesCategory && !matchesAmount) {
        return false;
      }
    }

    return true;
  });

  const filteredTotal = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  const resetFilters = () => {
    setFilteredCategory("");
    setFilteredStatus("");
    setDateFrom(undefined);
    setDateTo(undefined);
    setSearchQuery("");
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
    doc.text("EXPENSE REPORT", 14, 45);

    // Report metadata
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on: ${format(new Date(), "EEEE, MMMM d, yyyy 'at' h:mm a")}`, 14, 55);
    
    // Add filter information if any filters are applied
    let yPosition = 65;
    if (filteredCategory || filteredStatus || dateFrom || dateTo || searchQuery) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Applied Filters:", 14, yPosition);
      yPosition += 8;
      
      doc.setFont("helvetica", "normal");
      if (filteredCategory) {
        doc.text(`• Category: ${filteredCategory}`, 20, yPosition);
        yPosition += 6;
      }
      if (filteredStatus) {
        doc.text(`• Status: ${filteredStatus}`, 20, yPosition);
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
      if (searchQuery) {
        doc.text(`• Search: ${searchQuery}`, 20, yPosition);
        yPosition += 6;
      }
      yPosition += 5;
    }

    // Summary section with better formatting
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("SUMMARY", 14, yPosition);
    yPosition += 10;

    // Summary box background
    doc.setFillColor(245, 245, 245);
    doc.rect(14, yPosition - 5, 180, 25, 'F');
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Expenses (All): ${formatPrice(totalAmount, { forPDF: true })}`, 20, yPosition + 5);
    doc.text(`Number of Transactions (All): ${expenses.length}`, 20, yPosition + 12);
    
    if (filteredCategory || filteredStatus || dateFrom || dateTo || searchQuery) {
      doc.setFont("helvetica", "bold");
      doc.text(`Filtered Total: ${formatPrice(filteredTotal, { forPDF: true })}`, 110, yPosition + 5);
      doc.text(`Filtered Transactions: ${filteredExpenses.length}`, 110, yPosition + 12);
    }
    
    yPosition += 35;

    // Category breakdown if we have data
    if (filteredExpenses.length > 0) {
      const categoryTotals = filteredExpenses.reduce((acc, expense) => {
        const category = expense.expenseCategory?.name || "Uncategorized";
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
            doc.text(`• ${category}: ${formatPrice(categoryAmount, { forPDF: true })} (${percentage}%)`, 20, yPosition);
            yPosition += 6;
          });
        
        yPosition += 10;
      }
    }

    // Transactions table
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("TRANSACTION DETAILS", 14, yPosition);
    yPosition += 10;

    // Prepare table data with better formatting
    const tableData = filteredExpenses.map(expense => [
      format(new Date(expense.expenseDate), "dd/MM/yyyy"),
      expense.expenseCategory?.name || "Uncategorized",
      expense.description || "No description provided",
      expense.isAccrued ? "Accrued" : "Paid",
      formatPrice(expense.amount, { forPDF: true })
    ]);

    // Enhanced table styling
    autoTable(doc, {
      head: [["Date", "Category", "Description", "Status", "Amount"]],
      body: tableData,
      startY: yPosition,
      styles: { 
        fontSize: 9,
        cellPadding: 3,
        overflow: 'linebreak',
        halign: 'left'
      },
      headStyles: { 
        fillColor: [52, 73, 94],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10
      },
      columnStyles: {
        0: { cellWidth: 25, halign: 'center' }, // Date
        1: { cellWidth: 35 }, // Category
        2: { cellWidth: 55 }, // Description
        3: { cellWidth: 25, halign: 'center' }, // Status
        4: { cellWidth: 30, halign: 'right' } // Amount
      },
      alternateRowStyles: {
        fillColor: [249, 249, 249]
      },
      tableLineColor: [200, 200, 200],
      tableLineWidth: 0.1,
      margin: { left: 14, right: 14 }
    });

    // Footer with totals
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    
    doc.setFillColor(52, 73, 94);
    doc.rect(14, finalY - 5, 180, 20, 'F');
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(`TOTAL: ${formatPrice(filteredTotal, { forPDF: true })}`, 150, finalY + 8);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text(`Report generated by Aagam Holidays Management System`, 14, finalY + 25);

    // Download the PDF with descriptive filename
    const today = new Date().toISOString().split('T')[0];
    const categoryText = filteredCategory ? `-${filteredCategory.replace(/\s+/g, '-')}` : '';
    const filename = `expense-report${categoryText}-${today}.pdf`;
    doc.save(filename);
  };

  // Function to generate and download Excel
  const generateExcel = () => {
    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet([]);

    // Add title and summary information
    const summaryRows = [
      ["Expense Report"],
      [""],
      [`Generated on: ${new Date().toLocaleDateString()}`],
      [""],
      [`Total Expenses: ${formatPrice(totalAmount)}`],
      ...(filteredCategory || filteredStatus || dateFrom || dateTo ? [[`Filtered Total: ${formatPrice(filteredTotal)}`]] : []),
      [""],
      [""] // Empty row before the table
    ];

    XLSX.utils.sheet_add_aoa(worksheet, summaryRows, { origin: "A1" });

    // Add data table headers
    const headers = [
      ["Date", "Category", "Description", "Status", "Amount"]
    ];

    const dataRows = filteredExpenses.map(expense => [
      format(new Date(expense.expenseDate), "MMM d, yyyy"),
      expense.expenseCategory?.name || "N/A",
      expense.description || "No description",
      expense.isAccrued ? "Accrued" : "Paid",
      formatPrice(expense.amount)
    ]);

    // Add headers and data
    XLSX.utils.sheet_add_aoa(worksheet, headers, { origin: "A8" });
    XLSX.utils.sheet_add_aoa(worksheet, dataRows, { origin: "A9" });

    // Set column widths
    const columnWidths = [
      { wch: 12 }, // Date
      { wch: 20 }, // Category
      { wch: 40 }, // Description
      { wch: 12 }, // Status
      { wch: 15 }, // Amount
    ];

    worksheet["!cols"] = columnWidths;

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");

    // Generate filename with date
    const today = new Date().toISOString().split('T')[0];
    const fileName = `expense-report-${today}.xlsx`;

    // Write to file and trigger download
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Expenses</h2>
        <Link href="/expenses/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Add New
          </Button>
        </Link>
      </div>
      
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <Card className="w-full md:w-1/2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>            <div className="text-2xl font-bold text-red-600">{formatPrice(totalAmount)}</div>
            {filteredCategory || filteredStatus || dateFrom || dateTo ? (
              <div className="text-sm text-gray-500">Filtered: {formatPrice(filteredTotal)}</div>
            ) : null}
          </CardContent>
        </Card>
        
        <div className="flex gap-2 self-start md:self-end">
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
      </div>      <div className="bg-white p-4 rounded-md shadow-sm">
        {/* Search input */}
        <div className="flex mb-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by description, category, or amount..."
              className="w-full pl-10 pr-4"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
                onClick={() => setSearchQuery("")}
              >
                <span className="sr-only">Clear search</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="15"
                  height="15"
                  viewBox="0 0 15 15"
                  fill="none"
                  className="h-4 w-4"
                >
                  <path
                    d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                    fill="currentColor"
                  />
                </svg>
              </Button>
            )}
          </div>
        </div>
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
                  {filteredCategory
                    ? categories.find((category) => category.name === filteredCategory)?.name
                    : "Filter by category"}
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
                        <div
                          className={cn(
                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            filteredCategory === "" ? "bg-primary text-primary-foreground" : "opacity-50"
                          )}
                        >
                          {filteredCategory === "" ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-3 w-3"
                            >
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          ) : null}
                        </div>
                        All Categories
                      </CommandItem>
                      {categories.map((category) => (
                        <CommandItem
                          key={category.id}
                          onSelect={() => {
                            setFilteredCategory(category.name);
                            setCategoryOpen(false);
                          }}
                        >
                          <div
                            className={cn(
                              "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                              filteredCategory === category.name ? "bg-primary text-primary-foreground" : "opacity-50"
                            )}
                          >
                            {filteredCategory === category.name ? (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-3 w-3"
                              >
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            ) : null}
                          </div>
                          {category.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="w-full md:w-1/4">
            <Popover open={statusOpen} onOpenChange={setStatusOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={statusOpen}
                  className="w-full justify-between"
                >
                  {filteredStatus === "accrued" ? "Accrued" : 
                   filteredStatus === "paid" ? "Paid" : 
                   "Filter by status"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandList>
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          setFilteredStatus("");
                          setStatusOpen(false);
                        }}
                      >
                        <div
                          className={cn(
                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            filteredStatus === "" ? "bg-primary text-primary-foreground" : "opacity-50"
                          )}
                        >
                          {filteredStatus === "" ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-3 w-3"
                            >
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          ) : null}
                        </div>
                        All Status
                      </CommandItem>
                      <CommandItem
                        onSelect={() => {
                          setFilteredStatus("accrued");
                          setStatusOpen(false);
                        }}
                      >
                        <div
                          className={cn(
                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            filteredStatus === "accrued" ? "bg-primary text-primary-foreground" : "opacity-50"
                          )}
                        >
                          {filteredStatus === "accrued" ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-3 w-3"
                            >
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          ) : null}
                        </div>
                        Accrued
                      </CommandItem>
                      <CommandItem
                        onSelect={() => {
                          setFilteredStatus("paid");
                          setStatusOpen(false);
                        }}
                      >
                        <div
                          className={cn(
                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            filteredStatus === "paid" ? "bg-primary text-primary-foreground" : "opacity-50"
                          )}
                        >
                          {filteredStatus === "paid" ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-3 w-3"
                            >
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          ) : null}
                        </div>
                        Paid
                      </CommandItem>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="w-full md:w-2/4 flex flex-col md:flex-row gap-2">
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

      <ExpensesListTable data={filteredExpenses} />
    </div>
  );
};
