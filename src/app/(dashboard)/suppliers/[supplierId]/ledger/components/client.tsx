"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatPrice, formatSafeDate } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import { TransactionsTable } from "./transactions-table";
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

type SupplierTransaction = {
  id: string;
  date: Date;
  type: string;
  description: string;
  amount: number;
  isInflow: boolean;
  reference: string;
  packageId?: string;
  packageName?: string; // This is string | undefined, not null
  paymentMode?: string;
  accountName?: string;
  balance: number; // Running balance
  // Add the new item-related fields
  items?: Array<{
    productName: string;
    quantity: number;
    pricePerUnit: number;
    totalAmount: number;
  }>;
  itemsSummary?: string;
};

type Supplier = {
  id: string;
  name: string;
  contact: string | null;
};

interface SupplierIndividualLedgerClientProps {
  supplier: Supplier;
  transactions: SupplierTransaction[];
  totalPurchases: number;
  totalReturns: number; // Add total returns
  totalPayments: number;
  currentBalance: number;
}

export const SupplierIndividualLedgerClient: React.FC<SupplierIndividualLedgerClientProps> = ({
  supplier,
  transactions,
  totalPurchases,
  totalReturns,
  totalPayments,
  currentBalance
})=> {
  const router = useRouter();
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  
  // Filter transactions by date if date filters are applied
  const filteredTransactions = transactions.filter((transaction) => {
    if (dateFrom && new Date(transaction.date) < dateFrom) {
      return false;
    }
    
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setDate(endDate.getDate() + 1); // Include transactions on the end date
      if (new Date(transaction.date) > endDate) {
        return false;
      }
    }
    
    return true;
  });
  
  const resetFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  // Generate PDF function
  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Add report title
    doc.setFontSize(18);
    doc.text(`Supplier Ledger - ${supplier.name}`, 14, 22);
    
    // Add supplier details
    doc.setFontSize(10);
    if (supplier.contact) {
      doc.text(`Contact: ${supplier.contact}`, 14, 30);
    }
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 38);    // Add summary metrics with properly formatted amounts
    doc.setFontSize(12);
    doc.text(`Total Purchases: Rs. ${formatPrice(totalPurchases, { forPDF: true })}`, 14, 48);
    doc.text(`Total Returns: Rs. ${formatPrice(totalReturns, { forPDF: true })}`, 14, 56);
    doc.text(`Total Payments: Rs. ${formatPrice(totalPayments, { forPDF: true })}`, 14, 64);
    doc.text(`Current Balance: Rs. ${formatPrice(currentBalance, { forPDF: true })}`, 14, 72);// Add date filters if applied
    if (dateFrom || dateTo) {
      let filterText = "Date Filter: ";
      if (dateFrom) filterText += `From ${formatSafeDate(dateFrom, 'MM/dd/yyyy')}`;
      if (dateFrom && dateTo) filterText += " ";
      if (dateTo) filterText += `To ${formatSafeDate(dateTo, 'MM/dd/yyyy')}`;
      doc.text(filterText, 14, 80);
    }    // Prepare transaction data for table with proper formatting
    const tableData = filteredTransactions.map(transaction => [
      formatSafeDate(transaction.date, 'MM/dd/yyyy'),
      transaction.type,
      transaction.description,
      transaction.isInflow ? `Rs. ${formatPrice(transaction.amount, { forPDF: true })}` : "-",
      !transaction.isInflow ? `Rs. ${formatPrice(transaction.amount, { forPDF: true })}` : "-",
      `Rs. ${formatPrice(transaction.balance, { forPDF: true })}`
    ]);// Add the transactions table
    autoTable(doc, {
      head: [["Date", "Type", "Description", "Purchase", "Payment", "Balance"]],
      body: tableData,
      startY: dateFrom || dateTo ? 86 : 80,
      styles: { 
        fontSize: 9,
        cellPadding: 3,
        overflow: 'linebreak',
        cellWidth: 'wrap',
        halign: 'left'
      },      columnStyles: {
        0: { cellWidth: 22, halign: 'left' }, // Date
        1: { cellWidth: 18, halign: 'left' }, // Type  
        2: { cellWidth: 45, halign: 'left' }, // Description - increased for better readability
        3: { cellWidth: 35, halign: 'right' }, // Purchase - increased to fit "Rs. 1,60,000.00"
        4: { cellWidth: 35, halign: 'right' }, // Payment - increased to fit "Rs. 1,60,000.00"
        5: { cellWidth: 35, halign: 'right' }  // Balance - increased to fit "Rs. 1,60,000.00"
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center'
      }
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
    const safeSupplierName = supplier.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const today = new Date().toISOString().split('T')[0];
    doc.save(`supplier-ledger-${safeSupplierName}-${today}.pdf`);
  };

  // Generate Excel function
  const generateExcel = () => {
    // Create empty worksheet
    const worksheet = XLSX.utils.aoa_to_sheet([]);
    
    // Add title and summary information
    const summaryRows = [
      [`Supplier Ledger - ${supplier.name}`],
      [""],
      supplier.contact ? [`Contact: ${supplier.contact}`] : [""],
      [`Generated on: ${new Date().toLocaleDateString()}`],
      [""],      [`Total Purchases: ${formatPrice(totalPurchases)}`],
      [`Total Returns: ${formatPrice(totalReturns)}`],
      [`Total Payments: ${formatPrice(totalPayments)}`],
      [`Current Balance: ${formatPrice(currentBalance)}`],
      [""],
      dateFrom || dateTo ? [
        `Date Filter: ${dateFrom ? format(dateFrom, 'MM/dd/yyyy') : ''} ${dateFrom && dateTo ? 'to' : ''} ${dateTo ? format(dateTo, 'MM/dd/yyyy') : ''}`
      ] : [""],
      [""] // Empty row before the table
    ];
    
    XLSX.utils.sheet_add_aoa(worksheet, summaryRows, { origin: "A1" });
    
    // Add transaction data headers
    const headers = [
      ["Date", "Type", "Description", "Purchase", "Payment", "Balance"]
    ];
    
    // Prepare transaction data
    const dataRows = filteredTransactions.map(transaction => [
      format(new Date(transaction.date), 'MM/dd/yyyy'),
      transaction.type,
      transaction.description,
      transaction.isInflow ? formatPrice(transaction.amount) : "",
      !transaction.isInflow ? formatPrice(transaction.amount) : "",
      formatPrice(transaction.balance)
    ]);
    
    // Add headers and data
    XLSX.utils.sheet_add_aoa(worksheet, headers, { origin: "A12" });
    XLSX.utils.sheet_add_aoa(worksheet, dataRows, { origin: "A13" });
    
    // Set column widths
    const columnWidths = [
      { wch: 12 }, // Date
      { wch: 10 }, // Type
      { wch: 30 }, // Description
      { wch: 15 }, // Purchase
      { wch: 15 }, // Payment
      { wch: 15 }, // Balance
    ];
    
    worksheet["!cols"] = columnWidths;
    
    // Add merge cells for the title
    if (!worksheet["!merges"]) worksheet["!merges"] = [];
    worksheet["!merges"].push(
      { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } } // Merge cells for the title row
    );
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Supplier Ledger");
    
    // Generate filename with date
    const safeSupplierName = supplier.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const today = new Date().toISOString().split('T')[0];
    const fileName = `supplier-ledger-${safeSupplierName}-${today}.xlsx`;
    
    // Write to file and trigger download
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <CardTitle className="text-sm font-medium">Total Returns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyan-700">{formatPrice(totalReturns)}</div>
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
              <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(currentBalance)}</div>
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
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionsTable data={filteredTransactions} />
        </CardContent>
      </Card>
    </div>
  );
};
