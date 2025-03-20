"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Check, ChevronsUpDown, Download, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";
import { PaymentsTable } from "./payments-table";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

type Payment = {
  id: string;
  date: string;
  amount: number;
  description: string;
  packageName: string;
  supplierName: string;
  supplierContact: string;
  reference: string;
  paymentMode: string;
  account: string;
};

interface PaymentLedgerClientProps {
  payments: Payment[];
  suppliers: { id: string; name: string }[];
  totalPayments: number;
}

export const PaymentLedgerClient: React.FC<PaymentLedgerClientProps> = ({
  payments,
  suppliers,
  totalPayments,
}) => {
  const router = useRouter();
  const [filteredSupplier, setFilteredSupplier] = useState<string>("");
  const [filteredPaymentMode, setFilteredPaymentMode] = useState<string>("");
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  const filteredPayments = payments.filter((payment) => {
    if (filteredSupplier && payment.supplierName !== filteredSupplier) {
      return false;
    }

    if (filteredPaymentMode && payment.paymentMode !== filteredPaymentMode) {
      return false;
    }

    if (dateFrom) {
      const paymentDate = new Date(payment.date);
      if (paymentDate < dateFrom) return false;
    }

    if (dateTo) {
      const paymentDate = new Date(payment.date);
      // Add one day to include the end date
      const endDate = new Date(dateTo);
      endDate.setDate(endDate.getDate() + 1);
      if (paymentDate > endDate) return false;
    }

    return true;
  });

  const filteredTotal = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);

  const resetFilters = () => {
    setFilteredSupplier("");
    setFilteredPaymentMode("");
    setDateFrom(undefined);
    setDateTo(undefined);
  };
  
  // Function to generate and download PDF
  const generatePDF = () => {
    const doc = new jsPDF();

    // Add report title
    doc.setFontSize(18);
    doc.text("Payment Ledger Report", 14, 22);

    // Add date
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    // Add summary metrics
    doc.setFontSize(12);
    doc.text(`Total Payments: Rs. ${formatPrice(totalPayments, { forPDF: true })}`, 14, 40);
    if (filteredSupplier || filteredPaymentMode || dateFrom || dateTo) {
      doc.text(`Filtered Total: Rs. ${formatPrice(filteredTotal, { forPDF: true })}`, 14, 48);
    }

    // Add table data
    const tableData = filteredPayments.map(payment => [
      payment.date,
      payment.supplierName,
      payment.packageName,
      payment.description,
      payment.reference,
      payment.paymentMode,
      `Rs. ${formatPrice(payment.amount, { forPDF: true })}`
    ]);

    // Add the table
    autoTable(doc, {
      head: [["Date", "Supplier", "Package", "Description", "Reference", "Payment Mode", "Amount"]],
      body: tableData,
      startY: 55,
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
    doc.save(`payment-ledger-report-${today}.pdf`);
  };

  // Function to generate and download Excel
  const generateExcel = () => {
    // Create empty worksheet
    const worksheet = XLSX.utils.aoa_to_sheet([]);

    // Add title and summary information with proper spacing
    const summaryRows = [
      ["Payment Ledger Report"],
      [""],
      [`Generated on: ${new Date().toLocaleDateString()}`],
      [""],
      [`Total Payments: ${formatPrice(totalPayments)}`],
      (filteredSupplier || filteredPaymentMode || dateFrom || dateTo) ? [`Filtered Total: ${formatPrice(filteredTotal)}`] : [],
      [""],
      [""] // Empty row before the table
    ];

    XLSX.utils.sheet_add_aoa(worksheet, summaryRows, { origin: "A1" });

    // Add data table headers
    const headers = [
      ["Date", "Supplier", "Package", "Description", "Reference", "Payment Mode", "Account", "Amount"]
    ];

    const dataRows = filteredPayments.map(payment => [
      payment.date,
      payment.supplierName,
      payment.packageName,
      payment.description,
      payment.reference,
      payment.paymentMode,
      payment.account,
      formatPrice(payment.amount)
    ]);

    // Add headers and data
    XLSX.utils.sheet_add_aoa(worksheet, headers, { origin: "A9" });
    XLSX.utils.sheet_add_aoa(worksheet, dataRows, { origin: "A10" });

    // Set column widths
    const columnWidths = [
      { wch: 12 }, // Date
      { wch: 20 }, // Supplier
      { wch: 20 }, // Package
      { wch: 30 }, // Description
      { wch: 15 }, // Reference
      { wch: 15 }, // Payment Mode
      { wch: 15 }, // Account
      { wch: 15 }, // Amount
    ];

    worksheet["!cols"] = columnWidths;

    // Add merge cells for the title
    if (!worksheet["!merges"]) worksheet["!merges"] = [];
    worksheet["!merges"].push(
      { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } } // Merge cells for the title row
    );

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payment Ledger");

    // Generate filename with date
    const today = new Date().toISOString().split('T')[0];
    const fileName = `payment-ledger-${today}.xlsx`;

    // Write to file and trigger download
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(totalPayments)}</div>
            </CardContent>
          </Card>
          {(filteredSupplier || filteredPaymentMode || dateFrom || dateTo) ? (
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
            <Popover open={supplierOpen} onOpenChange={setSupplierOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={supplierOpen}
                  className="w-full justify-between"
                >
                  {filteredSupplier
                    ? suppliers.find((supplier) => supplier.name === filteredSupplier)?.name
                    : "Filter by supplier"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search supplier..." />
                  <CommandEmpty>No supplier found.</CommandEmpty>
                  <CommandList>
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          setFilteredSupplier("");
                          setSupplierOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            filteredSupplier === "" ? "opacity-100" : "opacity-0"
                          )}
                        />
                        All Suppliers
                      </CommandItem>
                      {suppliers.map((supplier) => (
                        <CommandItem
                          key={supplier.id}
                          onSelect={() => {
                            setFilteredSupplier(supplier.name);
                            setSupplierOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              filteredSupplier === supplier.name
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {supplier.name}
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
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="Card">Card</SelectItem>
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
          <CardTitle>Payment Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentsTable data={filteredPayments} />
        </CardContent>
      </Card>
    </div>
  );
};

