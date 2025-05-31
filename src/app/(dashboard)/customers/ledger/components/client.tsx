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
import { CalendarIcon, Check, ChevronsUpDown, Download, FileSpreadsheet, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { CustomersTable } from "./customers-table";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

type Customer = {
  id: string;
  name: string;
  contact: string;
  email: string;
  associatePartner: string;
  createdAt: string;
  totalSales: number;
  totalSaleReturns: number;
  totalReceipts: number;
  outstanding: number;
};

interface CustomerLedgerClientProps {
  customers: Customer[];
  associatePartners: string[];
  totalSales: number;
  totalSaleReturns: number;
  totalReceipts: number;
  totalOutstanding: number;
}

export const CustomerLedgerClient: React.FC<CustomerLedgerClientProps> = ({
  customers,
  associatePartners,
  totalSales,
  totalSaleReturns,
  totalReceipts,
  totalOutstanding,
}) => {
  const router = useRouter();
  const [filteredPartner, setFilteredPartner] = useState<string>("");
  const [filteredCustomerId, setFilteredCustomerId] = useState<string>(""); // Change to track customer ID instead of name
  const [filteredCustomerDisplay, setFilteredCustomerDisplay] = useState<string>("");
  const [partnerOpen, setPartnerOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [outstandingOnly, setOutstandingOnly] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string>("");

  // Filter customers based on all filter criteria
  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      // Filter by customer ID directly
      if (filteredCustomerId && customer.id !== filteredCustomerId) {
        return false;
      }

      // Filter by associate partner
      if (filteredPartner && customer.associatePartner !== filteredPartner) {
        return false;
      }

      // Filter by search query (search in name, contact, and email)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = customer.name.toLowerCase().includes(query);
        const matchesContact = customer.contact.toLowerCase().includes(query);
        const matchesEmail = customer.email.toLowerCase().includes(query);

        if (!matchesName && !matchesContact && !matchesEmail) {
          return false;
        }
      }

      // Filter by date range
      if (dateFrom || dateTo) {
        const createdDate = new Date(customer.createdAt);

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
        if (paymentStatus === "outstanding" && customer.outstanding <= 0) {
          return false;
        } else if (paymentStatus === "paid" && customer.outstanding !== 0) {
          return false;
        } else if (paymentStatus === "overpaid" && customer.outstanding >= 0) {
          return false;
        }
      }

      // Filter by outstanding amount
      if (outstandingOnly && customer.outstanding <= 0) {
        return false;
      }

      return true;
    });
  }, [customers, filteredCustomerId, filteredPartner, searchQuery, dateFrom, dateTo, outstandingOnly, paymentStatus]);
  // Calculate filtered totals
  const filteredTotalSales = useMemo(() =>
    filteredCustomers.reduce((sum, customer) => sum + customer.totalSales, 0),
    [filteredCustomers]);

  const filteredTotalSaleReturns = useMemo(() =>
    filteredCustomers.reduce((sum, customer) => sum + customer.totalSaleReturns, 0),
    [filteredCustomers]);

  const filteredTotalReceipts = useMemo(() =>
    filteredCustomers.reduce((sum, customer) => sum + customer.totalReceipts, 0),
    [filteredCustomers]);

  const filteredTotalOutstanding = useMemo(() =>
    filteredCustomers.reduce((sum, customer) => sum + customer.outstanding, 0),
    [filteredCustomers]);

  const resetFilters = () => {
    setFilteredPartner("");
    setFilteredCustomerId(""); // Reset customer ID filter
    setFilteredCustomerDisplay("");
    setDateFrom(undefined);
    setDateTo(undefined);
    setSearchQuery("");
    setOutstandingOnly(false);
    setPaymentStatus("");
  };

  // Get sorted list of customers for the dropdown (no deduplication)
  const sortedCustomers = useMemo(() => {
    return [...customers].sort((a, b) => a.name.localeCompare(b.name));
  }, [customers]);

  // Function to generate and download PDF
  const generatePDF = () => {
    const doc = new jsPDF();

    // Add report title
    doc.setFontSize(18);
    doc.text("Customer Ledger Report", 14, 22);

    // Add date
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);    // Add summary metrics
    doc.setFontSize(12);
    doc.text(`Total Sales: ${formatPrice(totalSales)}`, 14, 40);
    doc.text(`Total Sale Returns: ${formatPrice(totalSaleReturns)}`, 14, 48);
    doc.text(`Total Receipts: ${formatPrice(totalReceipts)}`, 14, 56);
    doc.text(`Total Outstanding: ${formatPrice(totalOutstanding)}`, 14, 64);

    if (filteredPartner || dateFrom || dateTo || searchQuery || outstandingOnly) {
      doc.text(`Filtered Sales: ${formatPrice(filteredTotalSales)}`, 14, 72);
      doc.text(`Filtered Sale Returns: ${formatPrice(filteredTotalSaleReturns)}`, 14, 80);
      doc.text(`Filtered Receipts: ${formatPrice(filteredTotalReceipts)}`, 14, 88);
      doc.text(`Filtered Outstanding: ${formatPrice(filteredTotalOutstanding)}`, 14, 96);
    }    // Add table data
    const tableData = filteredCustomers.map(customer => [
      customer.name,
      customer.contact,
      customer.email,
      customer.associatePartner,
      customer.createdAt,
      formatPrice(customer.totalSales),
      formatPrice(customer.totalSaleReturns),
      formatPrice(customer.totalReceipts),
      formatPrice(customer.outstanding)
    ]);

    // Add the table
    autoTable(doc, {
      head: [["Name", "Contact", "Email", "Associate", "Created", "Sales", "Sale Returns", "Receipts", "Outstanding"]],
      body: tableData,
      startY: filteredPartner || dateFrom || dateTo || searchQuery || outstandingOnly ? 106 : 72,
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 20 },
        2: { cellWidth: 30 },
        3: { cellWidth: 20 },
        4: { cellWidth: 20 },
        5: { cellWidth: 18 },
        6: { cellWidth: 18 },
        7: { cellWidth: 18 },
        8: { cellWidth: 18 }
      }
    });

    // Download the PDF
    const today = new Date().toISOString().split('T')[0];
    doc.save(`customer-ledger-report-${today}.pdf`);
  };

  // Function to generate and download Excel
  const generateExcel = () => {
    // Create worksheet data
    const workSheetData = [
      ["Customer Ledger Report"],
      [],
      [`Generated on: ${new Date().toLocaleDateString()}`],
      [],      [`Total Sales: ${formatPrice(totalSales)}`],
      [`Total Sale Returns: ${formatPrice(totalSaleReturns)}`],
      [`Total Receipts: ${formatPrice(totalReceipts)}`],
      [`Total Outstanding: ${formatPrice(totalOutstanding)}`],
      []
    ];

    if (filteredPartner || dateFrom || dateTo || searchQuery || outstandingOnly) {
      workSheetData.push(
        [`Filtered Sales: ${formatPrice(filteredTotalSales)}`],
        [`Filtered Sale Returns: ${formatPrice(filteredTotalSaleReturns)}`],
        [`Filtered Receipts: ${formatPrice(filteredTotalReceipts)}`],
        [`Filtered Outstanding: ${formatPrice(filteredTotalOutstanding)}`],
        []
      );
    }

    // Add headers
    workSheetData.push(["Name", "Contact", "Email", "Associate", "Created", "Sales", "Sale Returns", "Receipts", "Outstanding"]);    // Add data rows
    filteredCustomers.forEach(customer => {
      workSheetData.push([
        customer.name,
        customer.contact,
        customer.email,
        customer.associatePartner,
        customer.createdAt,
        formatPrice(customer.totalSales),
        formatPrice(customer.totalSaleReturns),
        formatPrice(customer.totalReceipts),
        formatPrice(customer.outstanding)
      ]);
    });

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(workSheetData);

    // Set column widths
    const colWidths = [
      { wch: 30 }, // Name
      { wch: 15 }, // Contact
      { wch: 25 }, // Email
      { wch: 20 }, // Associate
      { wch: 20 }, // Created
      { wch: 15 }, // Sales
      { wch: 15 }, // Sale Returns
      { wch: 15 }, // Receipts
      { wch: 15 }, // Outstanding
    ];

    ws["!cols"] = colWidths;

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customer Ledger");

    // Generate filename and download
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `customer-ledger-${today}.xlsx`);
  };

  return (
    <div className="space-y-6">      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(totalSales)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Sale Returns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(totalSaleReturns)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Receipts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(totalReceipts)}</div>
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
      </div>      {(filteredPartner || filteredCustomerId || dateFrom || dateTo || searchQuery || outstandingOnly || paymentStatus) && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Filtered Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(filteredTotalSales)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Filtered Sale Returns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(filteredTotalSaleReturns)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Filtered Receipts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(filteredTotalReceipts)}</div>
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
          {/* Customer filter */}
          <div className="w-full md:w-1/5">
            <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={customerOpen}
                  className="w-full justify-between"
                >
                  {filteredCustomerDisplay || "Filter by customer"}
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
                          setFilteredCustomerId("");
                          setFilteredCustomerDisplay("");
                          setCustomerOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            filteredCustomerId === "" ? "opacity-100" : "opacity-0"
                          )}
                        />
                        All Customers
                      </CommandItem>
                      {/* Display all customers with name and contact */}
                      {sortedCustomers.map((customer) => (
                        <CommandItem
                          key={customer.id}
                          onSelect={() => {
                            setFilteredCustomerId(customer.id);
                            setFilteredCustomerDisplay(`${customer.name} - ${customer.contact}`);
                            setCustomerOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              filteredCustomerId === customer.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {customer.name} - {customer.contact}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Associate partner filter */}
          <div className="w-full md:w-1/5">
            <Popover open={partnerOpen} onOpenChange={setPartnerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={partnerOpen}
                  className="w-full justify-between"
                >
                  {filteredPartner || "Filter by associate"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search associate..." />
                  <CommandEmpty>No associate found.</CommandEmpty>
                  <CommandList>
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          setFilteredPartner("");
                          setPartnerOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            filteredPartner === "" ? "opacity-100" : "opacity-0"
                          )}
                        />
                        All Associates
                      </CommandItem>
                      {associatePartners.map((partner) => (
                        <CommandItem
                          key={partner}
                          onSelect={() => {
                            setFilteredPartner(partner);
                            setPartnerOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              filteredPartner === partner ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {partner}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Payment status filter */}
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
          <CardTitle>Customer Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomersTable data={filteredCustomers} />
        </CardContent>
      </Card>
    </div>
  );
};

