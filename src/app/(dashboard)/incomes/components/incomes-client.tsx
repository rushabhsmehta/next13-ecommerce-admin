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
import { IncomesListTable } from "./incomes-list-table";
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

interface IncomesClientProps {
  incomes: any[];
  categories: { id: string; name: string }[];
}

export const IncomesClient: React.FC<IncomesClientProps> = ({
  incomes,
  categories,
}) => {
  const router = useRouter();
  const [filteredCategory, setFilteredCategory] = useState<string>("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Calculate total amount
  const totalAmount = incomes.reduce((sum, income) => sum + income.amount, 0);

  const filteredIncomes = incomes.filter((income) => {
    // Filter by category
    if (filteredCategory && income.incomeCategory?.name !== filteredCategory) {
      return false;
    }

    // Filter by start date
    if (dateFrom) {
      const incomeDate = new Date(income.incomeDate);
      if (incomeDate < dateFrom) return false;
    }

    // Filter by end date
    if (dateTo) {
      const incomeDate = new Date(income.incomeDate);
      // Add one day to include the end date
      const endDate = new Date(dateTo);
      endDate.setDate(endDate.getDate() + 1);
      if (incomeDate > endDate) return false;
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesDescription = income.description?.toLowerCase().includes(query);
      const matchesCategory = income.incomeCategory?.name?.toLowerCase().includes(query);
      const matchesAmount = income.amount.toString().includes(query);
      const matchesBankAccount = income.bankAccount?.accountName?.toLowerCase().includes(query);
      const matchesCashAccount = income.cashAccount?.accountName?.toLowerCase().includes(query);
      
      if (!matchesDescription && !matchesCategory && !matchesAmount && 
          !matchesBankAccount && !matchesCashAccount) {
        return false;
      }
    }

    return true;
  });

  const filteredTotal = filteredIncomes.reduce((sum, income) => sum + income.amount, 0);

  const resetFilters = () => {
    setFilteredCategory("");
    setDateFrom(undefined);
    setDateTo(undefined);
    setSearchQuery("");
  };

  // Function to generate and download PDF
  const generatePDF = () => {
    const doc = new jsPDF();

    // Add report title
    doc.setFontSize(18);
    doc.text("Income Report", 14, 22);

    // Add date
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    // Add summary metrics
    doc.setFontSize(12);
    doc.text(`Total Income: ${formatPrice(totalAmount)}`, 14, 40);
    if (filteredCategory || dateFrom || dateTo || searchQuery) {
      doc.text(`Filtered Total: ${formatPrice(filteredTotal)}`, 14, 48);
    }

    // Add table data
    const tableData = filteredIncomes.map(income => [
      format(new Date(income.incomeDate), "MMM d, yyyy"),
      income.incomeCategory?.name || "N/A",
      income.description || "No description",
      income.bankAccount?.accountName || income.cashAccount?.accountName || "N/A",
      `${formatPrice(income.amount)}`
    ]);

    // Add the table
    autoTable(doc, {
      head: [["Date", "Category", "Description", "Account", "Amount"]],
      body: tableData,
      startY: (filteredCategory || dateFrom || dateTo || searchQuery) ? 55 : 48,
    });

    // Download the PDF
    const today = new Date().toISOString().split('T')[0];
    doc.save(`income-report-${today}.pdf`);
  };

  // Function to generate and download Excel
  const generateExcel = () => {
    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet([]);

    // Add title and summary information
    const summaryRows = [
      ["Income Report"],
      [""],
      [`Generated on: ${new Date().toLocaleDateString()}`],
      [""],
      [`Total Income: ${formatPrice(totalAmount)}`],
      (filteredCategory || dateFrom || dateTo || searchQuery) ? [`Filtered Total: ${formatPrice(filteredTotal)}`] : [],
      [""],
      [""] // Empty row before the table
    ];

    XLSX.utils.sheet_add_aoa(worksheet, summaryRows, { origin: "A1" });

    // Add data table headers
    const headers = [
      ["Date", "Category", "Description", "Account", "Amount"]
    ];

    const dataRows = filteredIncomes.map(income => [
      format(new Date(income.incomeDate), "MMM d, yyyy"),
      income.incomeCategory?.name || "N/A",
      income.description || "No description",
      income.bankAccount?.accountName || income.cashAccount?.accountName || "N/A",
      formatPrice(income.amount)
    ]);

    // Add headers and data
    XLSX.utils.sheet_add_aoa(worksheet, headers, { origin: "A8" });
    XLSX.utils.sheet_add_aoa(worksheet, dataRows, { origin: "A9" });

    // Set column widths
    const columnWidths = [
      { wch: 12 }, // Date
      { wch: 20 }, // Category
      { wch: 35 }, // Description
      { wch: 20 }, // Account
      { wch: 15 }, // Amount
    ];

    worksheet["!cols"] = columnWidths;

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Incomes");

    // Generate filename with date
    const today = new Date().toISOString().split('T')[0];
    const fileName = `income-report-${today}.xlsx`;

    // Write to file and trigger download
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Incomes</h1>
        <Link href="/incomes/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Add New
          </Button>
        </Link>
      </div>
      
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <Card className="w-full md:w-1/2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatPrice(totalAmount)}</div>
            {(filteredCategory || dateFrom || dateTo || searchQuery) ? (
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
      </div>

      <div className="bg-white p-4 rounded-md shadow-sm">
        {/* Search input */}
        <div className="flex mb-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by description, category, account or amount..."
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
          <div className="w-full md:w-1/3">
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

      <IncomesListTable data={filteredIncomes} />
    </div>
  );
};
