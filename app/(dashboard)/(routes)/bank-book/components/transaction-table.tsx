"use client";

import React, { useState } from 'react';
import { formatPrice } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { ChevronDown, ChevronRight, Edit, FileSpreadsheet, Download } from "lucide-react";

// Explicitly define the transaction type
type Transaction = {
  id: string;
  date: string;
  type: string;
  description: string;
  inflow: number;
  outflow: number;
  balance: number;
};

interface TransactionTableProps {
  data: Transaction[];
  openingBalance: number;
  accountName?: string;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({ 
  data, 
  openingBalance, 
  accountName = "Bank Account" 
}) => {
  const router = useRouter();
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleEditTransaction = (transaction: Transaction) => {
    const type = transaction.type.toLowerCase();

    if (type.startsWith('income')) {
      router.push(`/incomes/${transaction.id}`);
    } else if (type.startsWith('expense')) {
      router.push(`/expenses/${transaction.id}`);
    } else if (type === 'receipt') {
      router.push(`/receipts/${transaction.id}`);
    } else if (type === 'payment') {
      router.push(`/payments/${transaction.id}`);
    } else if (type.includes('transfer')) {
      router.push(`/transfers/${transaction.id}`);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();

    // Add report title
    doc.setFontSize(18);
    doc.text(`${accountName} Transactions`, 14, 22);

    // Add date
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    // Add summary metrics
    doc.setFontSize(12);
    doc.text(`Opening Balance: Rs. ${formatPrice(openingBalance)}`, 14, 40);
    doc.text(`Total Inflow: Rs. ${formatPrice(data.reduce((sum, t) => sum + t.inflow, 0))}`, 14, 48);
    doc.text(`Total Outflow: Rs. ${formatPrice(data.reduce((sum, t) => sum + t.outflow, 0))}`, 14, 56);
    doc.text(`Closing Balance: Rs. ${formatPrice(data[data.length - 1]?.balance || openingBalance)}`, 14, 64);

    // Prepare transaction data for table with proper formatting
    const tableData = data.map(transaction => [
      format(new Date(transaction.date), 'MM/dd/yyyy'),
      transaction.type,
      transaction.description,
      transaction.inflow ? `Rs. ${formatPrice(transaction.inflow, { forPDF: true })}` : "-",
      transaction.outflow ? `Rs. ${formatPrice(transaction.outflow, { forPDF: true })}` : "-",
      `Rs. ${formatPrice(transaction.balance, { forPDF: true })}` // Fix balance formatting
    ]);

    // Add the transactions table
    autoTable(doc, {
      head: [["Date", "Type", "Description", "Inflow", "Outflow", "Balance"]],
      body: tableData,
      startY: 72,
      styles: { fontSize: 10 }
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
    const safeAccountName = accountName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    doc.save(`bank-transactions-${safeAccountName}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const generateExcel = () => {
    // Create empty worksheet
    const worksheet = XLSX.utils.aoa_to_sheet([]);

    // Add title and summary information with proper spacing
    const summaryRows = [
      [`${accountName} Transactions`],
      [""],
      [`Generated on: ${new Date().toLocaleDateString()}`],
      [""],
      [`Opening Balance: ${formatPrice(openingBalance)}`],
      [`Total Inflow: ${formatPrice(data.reduce((sum, t) => sum + t.inflow, 0))}`],
      [`Total Outflow: ${formatPrice(data.reduce((sum, t) => sum + t.outflow, 0))}`],
      [`Closing Balance: ${formatPrice(data[data.length - 1]?.balance || openingBalance)}`],
      [""],
      [""] // Empty row before the table
    ];

    XLSX.utils.sheet_add_aoa(worksheet, summaryRows, { origin: "A1" });

    // Add data table headers
    const headers = [
      ["Date", "Type", "Description", "Inflow", "Outflow", "Balance"]
    ];

    // Prepare transaction data rows with running balance
    const dataRows = data.map(transaction => [
      format(new Date(transaction.date), 'dd/MM/yyyy'),
      transaction.type,
      transaction.description,
      transaction.inflow ? formatPrice(transaction.inflow) : '',
      transaction.outflow ? formatPrice(transaction.outflow) : '',
      formatPrice(transaction.balance)
    ]);

    // Add headers and data
    XLSX.utils.sheet_add_aoa(worksheet, headers, { origin: "A11" });
    XLSX.utils.sheet_add_aoa(worksheet, dataRows, { origin: "A12" });

    // Set column widths
    const columnWidths = [
      { wch: 12 }, // Date
      { wch: 18 }, // Type
      { wch: 30 }, // Description
      { wch: 15 }, // Inflow
      { wch: 15 }, // Outflow
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bank Transactions");

    // Generate filename with date
    const today = new Date().toISOString().split('T')[0];
    const safeAccountName = accountName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const fileName = `bank-transactions-${safeAccountName}-${today}.xlsx`;

    // Write to file and trigger download
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="space-y-4">
      {/* Export buttons */}
      {data.length > 0 && (
        <div className="flex justify-end gap-2">
          <Button
            onClick={generateExcel}
            variant="outline"
            className="flex gap-2 items-center"
            size="sm"
          >
            <FileSpreadsheet size={16} />
            Excel
          </Button>
          <Button
            onClick={generatePDF}
            variant="outline"
            className="flex gap-2 items-center"
            size="sm"
          >
            <Download size={16} />
            PDF
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Inflow</TableHead>
              <TableHead className="text-right">Outflow</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="w-10">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Opening Balance Row */}
            <TableRow>
              <TableCell></TableCell>
              <TableCell colSpan={5} className="font-medium">Opening Balance</TableCell>
              <TableCell className="text-right font-medium">{formatPrice(openingBalance)}</TableCell>
              <TableCell></TableCell>
            </TableRow>

            {/* Transaction Rows with Expandable Details */}
            {data.map((transaction) => (
              <React.Fragment key={transaction.id}>
                <TableRow className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 p-0"
                      onClick={() => toggleRow(transaction.id)}
                    >
                      {expandedRows[transaction.id]
                        ? <ChevronDown className="h-4 w-4" />
                        : <ChevronRight className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                  <TableCell onClick={() => toggleRow(transaction.id)}>
                    {format(new Date(transaction.date), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell onClick={() => toggleRow(transaction.id)}>
                    {transaction.type}
                  </TableCell>
                  <TableCell onClick={() => toggleRow(transaction.id)}>
                    {transaction.description}
                  </TableCell>
                  <TableCell className="text-right" onClick={() => toggleRow(transaction.id)}>
                    {transaction.inflow ? formatPrice(transaction.inflow) : '-'}
                  </TableCell>
                  <TableCell className="text-right" onClick={() => toggleRow(transaction.id)}>
                    {transaction.outflow ? formatPrice(transaction.outflow) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium" onClick={() => toggleRow(transaction.id)}>
                    {formatPrice(transaction.balance)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 p-0"
                      onClick={() => handleEditTransaction(transaction)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>

                {/* Expandable Details */}
                {expandedRows[transaction.id] && (
                  <TableRow className="bg-muted/50">
                    <TableCell></TableCell>
                    <TableCell colSpan={7} className="py-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {transaction.reference && (
                          <div><span className="font-semibold">Reference:</span> {transaction.reference}</div>
                        )}
                        {transaction.note && (
                          <div><span className="font-semibold">Note:</span> {transaction.note}</div>
                        )}
                        {transaction.transactionId && (
                          <div><span className="font-semibold">Transaction ID:</span> {transaction.transactionId}</div>
                        )}
                        <div className="col-span-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditTransaction(transaction)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Transaction
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}

            {/* Totals Row */}
            <TableRow className="bg-slate-100 dark:bg-slate-800">
              <TableCell></TableCell>
              <TableCell colSpan={3} className="font-medium">Totals</TableCell>
              <TableCell className="text-right font-medium">
                {formatPrice(data.reduce((sum, t) => sum + t.inflow, 0))}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatPrice(data.reduce((sum, t) => sum + t.outflow, 0))}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatPrice(data[data.length - 1]?.balance || openingBalance)}
              </TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

