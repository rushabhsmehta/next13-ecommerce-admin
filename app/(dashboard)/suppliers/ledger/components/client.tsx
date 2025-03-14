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
import { CalendarIcon, Download, FileSpreadsheet, Search } from "lucide-react";
import { SuppliersTable } from "./suppliers-table";
import { Input } from "@/components/ui/input";
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

type Supplier = {
  id: string;
  name: string;
  contact: string;
  email: string;
  createdAt: string;
  totalPurchases: number;
  totalPayments: number;
  outstanding: number;
};

interface SupplierLedgerClientProps {
  suppliers: Supplier[];
  totalPurchases: number;
  totalPayments: number;
  totalOutstanding: number;
}

export const SupplierLedgerClient: React.FC<SupplierLedgerClientProps> = ({
  suppliers,
  totalPurchases,
  totalPayments,
  totalOutstanding,
}) => {
  const router = useRouter();
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [outstandingOnly, setOutstandingOnly] = useState(false);

  const filteredSuppliers = suppliers.filter((supplier) => {
    // Filter by date created
    if (dateFrom) {
      const supplierDate = new Date(supplier.createdAt);
      if (supplierDate < dateFrom) return false;
    }

    if (dateTo) {
      const supplierDate = new Date(supplier.createdAt);
      // Add one day to include the end date
      const endDate = new Date(dateTo);
      endDate.setDate(endDate.getDate() + 1);
      if (supplierDate > endDate) return false;
    }

    // Filter by outstanding balance
    if (outstandingOnly && supplier.outstanding <= 0) {
      return false;
    }

    // Search by name, contact, email
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        supplier.name.toLowerCase().includes(query) ||
        supplier.contact.toLowerCase().includes(query) ||
        supplier.email.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Calculate filtered totals
  const filteredTotalPurchases = filteredSuppliers.reduce((sum, supplier) => sum + supplier.totalPurchases, 0);
  const filteredTotalPayments = filteredSuppliers.reduce((sum, supplier) => sum + supplier.totalPayments, 0);
  const filteredTotalOutstanding = filteredSuppliers.reduce((sum, supplier) => sum + supplier.outstanding, 0);

  const resetFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setSearchQuery("");
    setOutstandingOnly(false);
  };

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
    doc.text(`Total Purchases: ${formatPrice(totalPurchases)}`, 14, 40);
    doc.text(`Total Payments: ${formatPrice(totalPayments)}`, 14, 48);
    doc.text(`Total Outstanding: ${formatPrice(totalOutstanding)}`, 14, 56);
    
    if (dateFrom || dateTo || searchQuery || outstandingOnly) {
      doc.text(`Filtered Purchases: ${formatPrice(filteredTotalPurchases)}`, 14, 64);
      doc.text(`Filtered Payments: ${formatPrice(filteredTotalPayments)}`, 14, 72);
      doc.text(`Filtered Outstanding: ${formatPrice(filteredTotalOutstanding)}`, 14, 80);
    }

    // Add table data
    const tableData = filteredSuppliers.map(supplier => [
      supplier.name,
      supplier.contact,
      supplier.email,
      supplier.createdAt,
      formatPrice(supplier.totalPurchases),
      formatPrice(supplier.totalPayments),
      formatPrice(supplier.outstanding)
    ]);

    // Add the table
    autoTable(doc, {
      head: [["Name", "Contact", "Email", "Created", "Purchases", "Payments", "Outstanding"]],
      body: tableData,
      startY: dateFrom || dateTo || searchQuery || outstandingOnly ? 88 : 64,
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 30 },
        2: { cellWidth: 40 },
        3: { cellWidth: 30 },
        4: { cellWidth: 22 },
        5: { cellWidth: 22 },
        6: { cellWidth: 22 }
      }
    });

    // Download the PDF
    const today = new Date().toISOString().split('T')[0];
    doc.save(`supplier-ledger-report-${today}.pdf`);
  };

  // Function to generate and download Excel
  const generateExcel = () => {
    // Create worksheet data
    const workSheetData = [
      ["Supplier Ledger Report"],
      [],
      [`Generated on: ${new Date().toLocaleDateString()}`],
      [],
      [`Total Purchases: ${formatPrice(totalPurchases)}`],
      [`Total Payments: ${formatPrice(totalPayments)}`],
      [`Total Outstanding: ${formatPrice(totalOutstanding)}`],
      []
    ];

    if (dateFrom || dateTo || searchQuery || outstandingOnly) {
      workSheetData.push(
        [`Filtered Purchases: ${formatPrice(filteredTotalPurchases)}`],
        [`Filtered Payments: ${formatPrice(filteredTotalPayments)}`],
        [`Filtered Outstanding: ${formatPrice(filteredTotalOutstanding)}`],
        []
      );
    }

    // Add headers
    workSheetData.push(["Name", "Contact", "Email", "Created", "Purchases", "Payments", "Outstanding"]);

    // Add data rows
    filteredSuppliers.forEach(supplier => {
      workSheetData.push([
        supplier.name,
        supplier.contact,
        supplier.email,
        supplier.createdAt,
        supplier.totalPurchases.toString(),
        supplier.totalPayments.toString(),
        supplier.outstanding.toString()
      ]);
    });

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(workSheetData);

    // Set column widths
    const colWidths = [
      { wch: 30 }, // Name
      { wch: 15 }, // Contact
      { wch: 25 }, // Email
      { wch: 20 }, // Created
      { wch: 15 }, // Purchases
      { wch: 15 }, // Payments
      { wch: 15 }, // Outstanding
    ];

    ws["!cols"] = colWidths;

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Supplier Ledger");

    // Generate filename and download
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `supplier-ledger-${today}.xlsx`);
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
              <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(totalOutstanding)}</div>
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

      {(dateFrom || dateTo || searchQuery || outstandingOnly) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Filtered Purchases</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(filteredTotalPurchases)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Filtered Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(filteredTotalPayments)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Filtered Outstanding</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(filteredTotalOutstanding)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="bg-white p-4 rounded-md shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
          <div className="w-full md:w-1/3 relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search suppliers..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="w-full md:w-2/5 flex flex-col md:flex-row gap-2">
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
            variant={outstandingOnly ? "default" : "outline"}
            className="w-full md:w-auto"
            onClick={() => setOutstandingOnly(!outstandingOnly)}
          >
            {outstandingOnly ? "Outstanding Only" : "Show All"}
          </Button>

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
          <CardTitle>Supplier Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <SuppliersTable data={filteredSuppliers} />
        </CardContent>
      </Card>
    </div>
  );
};
