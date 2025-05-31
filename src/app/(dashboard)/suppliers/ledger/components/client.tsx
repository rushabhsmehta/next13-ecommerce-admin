"use client";

import { useState, useMemo } from "react";
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
import { CalendarIcon, Download, ChevronsUpDown, FileSpreadsheet, Search } from "lucide-react";
import { SuppliersTable } from "./suppliers-table";
import { Input } from "@/components/ui/input";
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList, CommandInput } from "@/components/ui/command";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Supplier = {
  id: string;
  name: string;
  contact: string;
  email: string;
  createdAt: string;
  totalPurchases: number;
  totalPurchaseReturns: number;
  totalPayments: number;
  outstanding: number;
};

interface SupplierLedgerClientProps {
  suppliers: Supplier[];
  totalPurchases: number;
  totalPurchaseReturns: number;
  totalPayments: number;
  totalOutstanding: number;
}

export const SupplierLedgerClient: React.FC<SupplierLedgerClientProps> = ({
  suppliers,
  totalPurchases,
  totalPurchaseReturns,
  totalPayments,
  totalOutstanding,
}) => {
  const [filteredSupplier, setFilteredSupplier] = useState<string>("");
  const [filteredPaymentMode, setFilteredPaymentMode] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [outstandingOnly, setOutstandingOnly] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string>(""); // Add payment status filter

  // Filter suppliers based on all filter criteria
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      // Filter by supplier name
      if (filteredSupplier && supplier.name !== filteredSupplier) {
        return false;
      }

      // Filter by search query (search in name, contact, and email)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = supplier.name.toLowerCase().includes(query);
        const matchesContact = supplier.contact.toLowerCase().includes(query);
        const matchesEmail = supplier.email.toLowerCase().includes(query);
        
        if (!matchesName && !matchesContact && !matchesEmail) {
          return false;
        }
      }

      // Filter by date range
      if (dateFrom || dateTo) {
        const createdDate = new Date(supplier.createdAt);
        
        if (dateFrom && createdDate < dateFrom) {
          return false;
        }
        
        if (dateTo) {
          // Add one day to dateTo to include the end date in the range
          const adjustedDateTo = new Date(dateTo);
          adjustedDateTo.setDate(adjustedDateTo.getDate() + 1);
          
          if (createdDate > adjustedDateTo) {
            return false;
          }
        }
      }

      // Filter by payment status
      if (paymentStatus) {
        if (paymentStatus === "outstanding" && supplier.outstanding <= 0) {
          return false;
        } else if (paymentStatus === "paid" && supplier.outstanding !== 0) {
          return false;
        } else if (paymentStatus === "overpaid" && supplier.outstanding >= 0) {
          return false;
        }
      }

      // Filter by outstanding amount (legacy filter)
      if (outstandingOnly && supplier.outstanding <= 0) {
        return false;
      }

          return true;
    });
  }, [suppliers, filteredSupplier, searchQuery, dateFrom, dateTo, outstandingOnly, paymentStatus]);
  // Calculate filtered totals
  const filteredTotalPurchases = useMemo(() => 
    filteredSuppliers.reduce((sum, supplier) => sum + supplier.totalPurchases, 0),
  [filteredSuppliers]);
  
  const filteredTotalPurchaseReturns = useMemo(() => 
    filteredSuppliers.reduce((sum, supplier) => sum + supplier.totalPurchaseReturns, 0),
  [filteredSuppliers]);
  
  const filteredTotalPayments = useMemo(() => 
    filteredSuppliers.reduce((sum, supplier) => sum + supplier.totalPayments, 0),
  [filteredSuppliers]);
  
  const filteredTotalOutstanding = useMemo(() => 
    filteredSuppliers.reduce((sum, supplier) => sum + supplier.outstanding, 0),
  [filteredSuppliers]);

  // Function to reset all filters
  const resetFilters = () => {
    setFilteredSupplier("");
    setFilteredPaymentMode("");
    setDateFrom(undefined);
    setDateTo(undefined);
    setSearchQuery("");
    setOutstandingOnly(false);
    setPaymentStatus(""); // Reset payment status filter
  };
  
  // Function to generate and download PDF
  const generatePDF = () => {
    const doc = new jsPDF();

    // Add report title
    doc.setFontSize(18);
    doc.text("Supplier Ledger Report", 14, 22);

    // Add date
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);    // Add summary metrics
    doc.setFontSize(12);
    doc.text(`Total Purchases: ${formatPrice(totalPurchases, { forPDF: true })}`, 14, 40);
    doc.text(`Total Purchase Returns: ${formatPrice(totalPurchaseReturns, { forPDF: true })}`, 14, 48);
    doc.text(`Total Payments: ${formatPrice(totalPayments, { forPDF: true })}`, 14, 56);
    doc.text(`Total Outstanding: ${formatPrice(totalOutstanding, { forPDF: true })}`, 14, 64);

    if (dateFrom || dateTo || searchQuery || outstandingOnly || filteredSupplier) {
      doc.text(`Filtered Purchases: ${formatPrice(filteredTotalPurchases, { forPDF: true })}`, 14, 72);
      doc.text(`Filtered Purchase Returns: ${formatPrice(filteredTotalPurchaseReturns, { forPDF: true })}`, 14, 80);
      doc.text(`Filtered Payments: ${formatPrice(filteredTotalPayments, { forPDF: true })}`, 14, 88);
      doc.text(`Filtered Outstanding: ${formatPrice(filteredTotalOutstanding, { forPDF: true })}`, 14, 96);
    }    // Add table data
    const tableData = filteredSuppliers.map(supplier => [
      supplier.name,
      supplier.contact,
      supplier.email,
      supplier.createdAt,
      formatPrice(supplier.totalPurchases, { forPDF: true }),
      formatPrice(supplier.totalPurchaseReturns, { forPDF: true }),
      formatPrice(supplier.totalPayments, { forPDF: true }),
      formatPrice(supplier.outstanding, { forPDF: true })
    ]);    // Add the table
    autoTable(doc, {
      head: [["Name", "Contact", "Email", "Created", "Purchases", "Purchase Returns", "Payments", "Outstanding"]],
      body: tableData,
      startY: (dateFrom || dateTo || searchQuery || outstandingOnly || filteredSupplier) ? 106 : 72,
      styles: { 
        fontSize: 8,
        cellPadding: 3,
        overflow: 'linebreak',
        cellWidth: 'wrap',
        halign: 'left'
      },
      columnStyles: {
        0: { cellWidth: 22, halign: 'left' }, // Name
        1: { cellWidth: 18, halign: 'left' }, // Contact
        2: { cellWidth: 25, halign: 'left' }, // Email
        3: { cellWidth: 18, halign: 'center' }, // Created - center aligned
        4: { cellWidth: 32, halign: 'right' }, // Purchases - increased and right-aligned
        5: { cellWidth: 32, halign: 'right' }, // Purchase Returns - increased and right-aligned
        6: { cellWidth: 32, halign: 'right' }, // Payments - increased and right-aligned
        7: { cellWidth: 32, halign: 'right' }  // Outstanding - increased and right-aligned
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center'
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
      [],      [`Generated on: ${new Date().toLocaleDateString()}`],
      [],
      [`Total Purchases: ${formatPrice(totalPurchases)}`],
      [`Total Purchase Returns: ${formatPrice(totalPurchaseReturns)}`],
      [`Total Payments: ${formatPrice(totalPayments)}`],
      [`Total Outstanding: ${formatPrice(totalOutstanding)}`],
      []
    ];

    if (dateFrom || dateTo || searchQuery || outstandingOnly || filteredSupplier) {
      workSheetData.push(
        [`Filtered Purchases: ${formatPrice(filteredTotalPurchases)}`],
        [`Filtered Purchase Returns: ${formatPrice(filteredTotalPurchaseReturns)}`],
        [`Filtered Payments: ${formatPrice(filteredTotalPayments)}`],
        [`Filtered Outstanding: ${formatPrice(filteredTotalOutstanding)}`],
        []
      );
    }

    // Add headers
    workSheetData.push(["Name", "Contact", "Email", "Created", "Purchases", "Purchase Returns", "Payments", "Outstanding"]);    // Add data rows
    filteredSuppliers.forEach(supplier => {
      workSheetData.push([
        supplier.name,
        supplier.contact,
        supplier.email,
        supplier.createdAt,
        supplier.totalPurchases.toString(),
        supplier.totalPurchaseReturns.toString(),
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
      { wch: 18 }, // Purchase Returns
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
    <div className="space-y-6">      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <CardTitle className="text-sm font-medium">Total Purchase Returns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(totalPurchaseReturns)}</div>
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
      </div>      {(dateFrom || dateTo || searchQuery || outstandingOnly || filteredSupplier) && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <CardTitle className="text-sm font-medium">Filtered Returns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(filteredTotalPurchaseReturns)}</div>
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
          <div className="w-full md:w-1/5">
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

          <div className="w-full md:w-1/5">
            <Select
              value={paymentStatus}
              onValueChange={setPaymentStatus}
            >
              <SelectTrigger>
                <SelectValue placeholder="Payment status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="outstanding">Outstanding</SelectItem>
                <SelectItem value="paid">Fully Paid</SelectItem>
                <SelectItem value="overpaid">Overpaid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full md:w-1/5">
            <Select
              value={filteredPaymentMode}
              onValueChange={setFilteredPaymentMode}
            >
              <SelectTrigger>
                <SelectValue placeholder="Payment mode" />
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

        

          <div className="w-full md:w-1/5 flex flex-col md:flex-row gap-2">
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
          <CardTitle>Supplier Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <SuppliersTable data={filteredSuppliers} />
        </CardContent>
      </Card>
    </div>
  );
};

