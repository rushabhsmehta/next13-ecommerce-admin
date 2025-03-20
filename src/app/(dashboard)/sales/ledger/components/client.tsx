"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Check, ChevronsUpDown, Download, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";
import { SalesTable } from "./sales-table";
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

type Sale = {
  id: string;
  date: string;
  amount: number;
  description: string;
  packageName: string;
  customerName: string;
  customerContact: string;
  gstAmount?: number;
  gstPercentage?: number;
};

interface SaleLedgerClientProps {
  sales: Sale[];
  customers: { id: string; name: string }[];
  totalSales: number;
  totalGst: number;
}

export const SaleLedgerClient: React.FC<SaleLedgerClientProps> = ({
  sales,
  customers,
  totalSales,
  totalGst,
}) => {
  const router = useRouter();
  const [filteredCustomer, setFilteredCustomer] = useState<string>("");
  const [open, setOpen] = useState(false);
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

  // Calculate tax-inclusive totals
  const totalWithGst = totalSales + totalGst;

  const filteredTotal = filteredSales.reduce((sum, sale) => sum + sale.amount, 0);
  const filteredGstTotal = filteredSales.reduce((sum, sale) => sum + (sale.gstAmount || 0), 0);
  const filteredTotalWithGst = filteredTotal + filteredGstTotal;

  const resetFilters = () => {
    setFilteredCustomer("");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  // Function to generate and download PDF
  const generatePDF = () => {
    const doc = new jsPDF();

    // Add report title
    doc.setFontSize(18);
    doc.text("Sales Ledger Report", 14, 22);

    // Add date
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    // Add summary metrics with properly formatted amounts
    doc.setFontSize(12);
    doc.text(`Total Sales: Rs. ${formatPrice(totalSales, { forPDF: true })}`, 14, 40);
    doc.text(`Total GST: Rs. ${formatPrice(totalGst, { forPDF: true })}`, 14, 48);
    if (filteredCustomer || dateFrom || dateTo) {
      doc.text(`Filtered Total: Rs. ${formatPrice(filteredTotal, { forPDF: true })}`, 14, 56);
      doc.text(`Filtered GST: Rs. ${formatPrice(filteredGstTotal, { forPDF: true })}`, 14, 64);
    }

    // Add table data with proper formatting
    const tableData = filteredSales.map(sale => [
      sale.date,
      sale.customerName,
      sale.packageName,
      sale.description,
      `Rs. ${formatPrice(sale.amount, { forPDF: true })}`,
      sale.gstAmount ? `Rs. ${formatPrice(sale.gstAmount, { forPDF: true })}` : "-"
    ]);

    // Add the table
    autoTable(doc, {
      head: [["Date", "Customer", "Package", "Description", "Amount", "GST"]],
      body: tableData,
      startY: filteredCustomer || dateFrom || dateTo ? 70 : 55,
      styles: { fontSize: 10 } // Ensure consistent font size
    });

    // Add footer with page numbers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const pageSize = doc.internal.pageSize;
      const pageWidth = pageSize.getWidth();
      const pageHeight = pageSize.getHeight();

      doc.setFontSize(8);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, pageHeight - 10);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 30, pageHeight - 10);
    }

    // Download the PDF
    const today = new Date().toISOString().split('T')[0];
    doc.save(`sales-ledger-report-${today}.pdf`);
  };

  // Function to generate and download Excel
  const generateExcel = () => {
    // Create empty worksheet
    const worksheet = XLSX.utils.aoa_to_sheet([]);

    // Add title and summary information with proper spacing
    const summaryRows = [
      ["Sales Ledger Report"],
      [""],
      [`Generated on: ${new Date().toLocaleDateString()}`],
      [""],
      [`Total Sales: ${formatPrice(totalSales)}`],
      [`Total GST: ${formatPrice(totalGst)}`],
      filteredCustomer || dateFrom || dateTo ? [`Filtered Total: ${formatPrice(filteredTotal)}`] : [],
      filteredCustomer || dateFrom || dateTo ? [`Filtered GST: ${formatPrice(filteredGstTotal)}`] : [],
      [""],
      [""] // Empty row before the table
    ];

    XLSX.utils.sheet_add_aoa(worksheet, summaryRows, { origin: "A1" });

    // Add data table headers
    const headers = [
      ["Date", "Customer", "Package", "Description", "Amount", "GST"]
    ];

    const dataRows = filteredSales.map(sale => [
      sale.date,
      sale.customerName,
      sale.packageName,
      sale.description,
      formatPrice(sale.amount),
      sale.gstAmount ? formatPrice(sale.gstAmount) : "-"
    ]);

    // Add headers and data
    XLSX.utils.sheet_add_aoa(worksheet, headers, { origin: "A9" });
    XLSX.utils.sheet_add_aoa(worksheet, dataRows, { origin: "A10" });

    // Set column widths
    const columnWidths = [
      { wch: 12 }, // Date
      { wch: 20 }, // Customer
      { wch: 20 }, // Package
      { wch: 30 }, // Description
      { wch: 15 }, // Amount
      { wch: 15 }, // GST
    ];

    worksheet["!cols"] = columnWidths;

    // Add merge cells for the title
    if (!worksheet["!merges"]) worksheet["!merges"] = [];
    worksheet["!merges"].push(
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } } // Merge cells for the title row
    );

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Ledger");

    // Generate filename with date
    const today = new Date().toISOString().split('T')[0];
    const fileName = `sales-ledger-${today}.xlsx`;

    // Write to file and trigger download
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Sales (incl. GST)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(totalWithGst)}</div>
              <div className="text-xs text-gray-500">Base: {formatPrice(totalSales)}, GST: {formatPrice(totalGst)}</div>
            </CardContent>
          </Card>
          
          {/* No need for separate GST card since it's included above */}
          
          {filteredCustomer || dateFrom || dateTo ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Filtered Total (incl. GST)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPrice(filteredTotalWithGst)}</div>
                <div className="text-sm text-gray-500">Base: {formatPrice(filteredTotal)}, GST: {formatPrice(filteredGstTotal)}</div>
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
          <div className="w-full md:w-1/3">
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between"
                >
                  {filteredCustomer
                    ? customers.find((customer) => customer.name === filteredCustomer)?.name
                    : "Filter by customer"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search customer..." />
                  <CommandEmpty>No customer found.</CommandEmpty>
                  <CommandList>
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          setFilteredCustomer("");
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            filteredCustomer === "" ? "opacity-100" : "opacity-0"
                          )}
                        />
                        All Customers
                      </CommandItem>
                      {customers.map((customer) => (
                        <CommandItem
                          key={customer.id}
                          onSelect={() => {
                            setFilteredCustomer(customer.name);
                            setOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              filteredCustomer === customer.name
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {customer.name}
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

