"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import { CustomersTable } from "./customers-table";
import { Download, FileSpreadsheet } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

type CustomerSummary = {
  id: string;
  name: string;
  contact: string;
  totalSales: number;
  totalReceipts: number;
  balance: number;
};

interface CustomerLedgerClientProps {
  customers: CustomerSummary[];
  totalSales: number;
  totalReceipts: number;
  totalBalance: number;
}

export const CustomerLedgerClient: React.FC<CustomerLedgerClientProps> = ({
  customers,
  totalSales,
  totalReceipts,
  totalBalance
}) => {
  const router = useRouter();

  // Function to generate and download PDF
  const generatePDF = () => {
    const doc = new jsPDF();

    // Add report title
    doc.setFontSize(18);
    doc.text("Customer Ledger Report", 14, 22);

    // Add date
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    // Add summary metrics
    doc.setFontSize(12);
    doc.text(`Total Customers: ${customers.length}`, 14, 40);
    doc.text(`Total Sales: Rs. ${formatPrice(totalSales)}`, 14, 48);
    doc.text(`Total Receipts: Rs. ${formatPrice(totalReceipts)}`, 14, 56);
    doc.text(`Outstanding Balance: Rs. ${formatPrice(totalBalance)}`, 14, 64);

    // Add table data
    const tableData = customers.map(customer => [
      customer.name,
      customer.contact || "-",
      `Rs. ${formatPrice(customer.totalSales)}`,
      `Rs. ${formatPrice(customer.totalReceipts)}`,
      `Rs. ${formatPrice(customer.balance)}`
    ]);

    // Add the table
    autoTable(doc, {
      head: [["Customer", "Contact", "Total Sales", "Total Receipts", "Balance"]],
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
    doc.save(`customer-ledger-report-${today}.pdf`);
  };

  // Function to generate and download Excel
  const generateExcel = () => {
    // Create empty worksheet
    const worksheet = XLSX.utils.aoa_to_sheet([]);

    // Add title and summary information with proper spacing
    const summaryRows = [
      ["Customer Ledger Report"],
      [""],
      [`Generated on: ${new Date().toLocaleDateString()}`],
      [""],
      [`Total Customers: ${customers.length}`],
      [`Total Sales: ${formatPrice(totalSales)}`],
      [`Total Receipts: ${formatPrice(totalReceipts)}`],
      [`Outstanding Balance: ${formatPrice(totalBalance)}`],
      [""],
      [""] // Empty row before the table
    ];

    XLSX.utils.sheet_add_aoa(worksheet, summaryRows, { origin: "A1" });

    // Add data table headers
    const headers = [
      ["Customer", "Contact", "Total Sales", "Total Receipts", "Balance"]
    ];

    const dataRows = customers.map(customer => [
      customer.name,
      customer.contact || "-",
      formatPrice(customer.totalSales),
      formatPrice(customer.totalReceipts),
      formatPrice(customer.balance)
    ]);

    // Add headers and data
    XLSX.utils.sheet_add_aoa(worksheet, headers, { origin: "A11" });
    XLSX.utils.sheet_add_aoa(worksheet, dataRows, { origin: "A12" });

    // Set column widths
    const columnWidths = [
      { wch: 25 }, // Customer
      { wch: 15 }, // Contact
      { wch: 15 }, // Total Sales
      { wch: 15 }, // Total Receipts
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customer Ledger");

    // Generate filename with date
    const today = new Date().toISOString().split('T')[0];
    const fileName = `customer-ledger-${today}.xlsx`;

    // Write to file and trigger download
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <CardTitle className="text-sm font-medium">Total Receipts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(totalReceipts)}</div>
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

      <Card>
        <CardHeader>
          <CardTitle>Customer Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomersTable data={customers} />
        </CardContent>
      </Card>
    </div>
  );
};
