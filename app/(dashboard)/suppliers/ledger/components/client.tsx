"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatPrice } from "@/lib/utils";
import { SuppliersTable } from "./suppliers-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Download, FileSpreadsheet } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

type SupplierSummary = {
  id: string;
  name: string;
  contact: string | null; // Updated to accept null values
  totalPurchases: number;
  totalPayments: number;
  balance: number;
};

interface SuppliersLedgerClientProps {
  suppliers: SupplierSummary[];
  totalPurchases: number;
  totalPayments: number;
  totalBalance: number;
}

export const SupplierLedgerClient: React.FC<SuppliersLedgerClientProps> = ({
  suppliers,
  totalPurchases,
  totalPayments,
  totalBalance,
}) => {
  const router = useRouter();
  const [balanceFilter, setBalanceFilter] = useState<string>("all");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [open, setOpen] = useState(false);

  const filteredSuppliers = suppliers.filter((supplier) => {
    if (balanceFilter === "due") return supplier.balance > 0;
    if (balanceFilter === "overpaid") return supplier.balance < 0;
    if (balanceFilter === "settled") return supplier.balance === 0;
    return true; // "all" filter
  });

  // Function to generate and download PDF
  const generatePDF = () => {
    const doc = new jsPDF();

    // Add report title
    doc.setFontSize(18);
    doc.text("Supplier Ledger Report", 14, 22);

    // Add date
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    // Add summary metrics
    doc.setFontSize(12);
    doc.text(`Total Suppliers: ${suppliers.length}`, 14, 40);
    doc.text(`Total Purchases: Rs. ${formatPrice(totalPurchases)}`, 14, 48);
    doc.text(`Total Payments: Rs. ${formatPrice(totalPayments)}`, 14, 56);
    doc.text(`Outstanding Balance: Rs. ${formatPrice(totalBalance)}`, 14, 64);

    // Add table data
    const tableData = suppliers.map(supplier => [
      supplier.name,
      supplier.contact || "-",
      `Rs. ${formatPrice(supplier.totalPurchases)}`,
      `Rs. ${formatPrice(supplier.totalPayments)}`,
      `Rs. ${formatPrice(supplier.balance)}`
    ]);

    // Add the table
    autoTable(doc, {
      head: [["Supplier", "Contact", "Total Purchases", "Total Payments", "Balance"]],
      body: tableData,
      startY: 72,
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
    doc.save(`supplier-ledger-report-${today}.pdf`);
  };

  // Function to generate and download Excel
  const generateExcel = () => {
    // Create empty worksheet
    const worksheet = XLSX.utils.aoa_to_sheet([]);

    // Add title and summary information with proper spacing
    const summaryRows = [
      ["Supplier Ledger Report"],
      [""],
      [`Generated on: ${new Date().toLocaleDateString()}`],
      [""],
      [`Total Suppliers: ${suppliers.length}`],
      [`Total Purchases: ${formatPrice(totalPurchases)}`],
      [`Total Payments: ${formatPrice(totalPayments)}`],
      [`Outstanding Balance: ${formatPrice(totalBalance)}`],
      [""],
      [""] // Empty row before the table
    ];

    XLSX.utils.sheet_add_aoa(worksheet, summaryRows, { origin: "A1" });

    // Add data table headers
    const headers = [
      ["Supplier", "Contact", "Total Purchases", "Total Payments", "Balance"]
    ];

    const dataRows = suppliers.map(supplier => [
      supplier.name,
      supplier.contact || "-",
      formatPrice(supplier.totalPurchases),
      formatPrice(supplier.totalPayments),
      formatPrice(supplier.balance)
    ]);

    // Add headers and data
    XLSX.utils.sheet_add_aoa(worksheet, headers, { origin: "A11" });
    XLSX.utils.sheet_add_aoa(worksheet, dataRows, { origin: "A12" });

    // Set column widths
    const columnWidths = [
      { wch: 25 }, // Supplier
      { wch: 15 }, // Contact
      { wch: 15 }, // Total Purchases
      { wch: 15 }, // Total Payments
      { wch: 15 }, // Balance
    ];

    worksheet["!cols"] = columnWidths;

    // Add merge cells for the title
    if (!worksheet["!merges"]) worksheet["!merges"] = [];
    worksheet["!merges"].push(
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } } // Merge cells for the title row
    );

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Supplier Ledger");

    // Generate filename with date
    const today = new Date().toISOString().split('T')[0];
    const fileName = `supplier-ledger-${today}.xlsx`;

    // Write to file and trigger download
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(totalPurchases)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(totalPayments)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(totalBalance)}</div>
            </CardContent>
          </Card>
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
        <div className="flex items-center gap-4 mb-4">
          <div className="w-full md:w-1/4">
            <Select
              value={balanceFilter}
              onValueChange={setBalanceFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by balance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                <SelectItem value="due">With Balance Due</SelectItem>
                <SelectItem value="overpaid">Overpaid</SelectItem>
                <SelectItem value="settled">Fully Settled</SelectItem>
              </SelectContent>
            </Select>
          </div>


          <div className="w-full md:w-1/4">
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between"
                >
                  {selectedSupplierId
                    ? suppliers.find((supplier) => supplier.id === selectedSupplierId)?.name
                    : "Search Supplier..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search Supplier..." />
                  <CommandEmpty>No Supplier found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        setSelectedSupplierId("");
                        setOpen(false);
                      }}
                      className="text-sm"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          !selectedSupplierId ? "opacity-100" : "opacity-0"
                        )}
                      />
                      All Suppliers
                    </CommandItem>
                    {suppliers.map((supplier) => (
                      <CommandItem
                        key={supplier.id}
                        onSelect={() => {
                          setSelectedSupplierId(
                            selectedSupplierId === supplier.id ? "" : supplier.id
                          );
                          setOpen(false);
                        }}
                        className="text-sm"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedSupplierId === supplier.id
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {supplier.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <Button
            onClick={() => router.push('/suppliers/new')}
            className="ml-auto"
          >
            Add New Supplier
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Supplier Statements</CardTitle>
        </CardHeader>
        <CardContent>
          <SuppliersTable data={filteredSuppliers} />
        </CardContent>
      </Card>
    </div>
  );
};
