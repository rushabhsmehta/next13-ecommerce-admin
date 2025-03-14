import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { ChevronDown, ChevronRight, Download, Edit, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface Transaction {
  id: string;
  date: Date | string;
  type: string;
  description: string;
  reference: string;
  amount: number;
  isInflow: boolean;
  note: string;
  transactionId?: string;
}

interface TransactionTableProps {
  transactions: Transaction[];
  openingBalance: number;
  accountName?: string; // Add optional account name for reports title
}

export const TransactionTable: React.FC<TransactionTableProps> = ({ 
  transactions, 
  openingBalance,
  accountName = "Bank Account" // Default title if not provided 
}) => {
  const router = useRouter();
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'INR' });
  
  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Function to navigate to the appropriate edit page based on transaction type
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
  
  // Calculate running balance and totals
  const transactionsWithBalance = transactions.map((transaction, index) => {
    let runningBalance = openingBalance;
    for (let i = 0; i <= index; i++) {
      transactions[i].isInflow 
        ? runningBalance += transactions[i].amount 
        : runningBalance -= transactions[i].amount;
    }
    return { ...transaction, balance: runningBalance };
  });

  const totalInflow = transactions.filter(t => t.isInflow).reduce((sum, t) => sum + t.amount, 0);
  const totalOutflow = transactions.filter(t => !t.isInflow).reduce((sum, t) => sum + t.amount, 0);
  const closingBalance = openingBalance + totalInflow - totalOutflow;

  // Function to generate and download PDF
  const generatePDF = () => {
    const doc = new jsPDF();
    
      // Add a Unicode font that supports the Rupee symbol
      doc.addFont('https://cdn.jsdelivr.net/npm/@fontsource/noto-sans/files/noto-sans-all-400-normal.woff', 'NotoSans', 'normal');
      doc.setFont('NotoSans');
    // Add report title
    doc.setFontSize(18);
    doc.text(`${accountName} Transactions`, 14, 22);
    
    // Add date
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    
    // Add summary metrics
    doc.setFontSize(12);
    doc.text(`Opening Balance: ${formatter.format(openingBalance)}`, 14, 40);
    doc.text(`Total Inflow: ${formatter.format(totalInflow)}`, 14, 48);
    doc.text(`Total Outflow: ${formatter.format(totalOutflow)}`, 14, 56);
    doc.text(`Closing Balance: ${formatter.format(closingBalance)}`, 14, 64);
    
    // Add table data with running balance
    const tableData = [];
    let balance = openingBalance;
    
    // Add opening balance row
    tableData.push(["", "", "Opening Balance", "", "", formatter.format(balance)]);
    
    // Add transaction rows
    transactions.forEach(transaction => {
      transaction.isInflow ? balance += transaction.amount : balance -= transaction.amount;
      
      tableData.push([
        format(new Date(transaction.date), 'dd/MM/yyyy'),
        transaction.type,
        transaction.description,
        transaction.isInflow ? formatter.format(transaction.amount) : '-',
        !transaction.isInflow ? formatter.format(transaction.amount) : '-',
        formatter.format(balance)
      ]);
    });
    
    // Add the table
    autoTable(doc, {
      head: [["Date", "Type", "Description", "Inflow", "Outflow", "Balance"]],
      body: tableData,
      startY: 72,
    });
    
    // Add footer with page numbers
    const pageCount = doc.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
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

  // Function to generate and download Excel
  const generateExcel = () => {
    // Create empty worksheet
    const worksheet = XLSX.utils.aoa_to_sheet([]);
    
    // Add title and summary information with proper spacing
    const summaryRows = [
      [`${accountName} Transactions`],
      [""],
      [`Generated on: ${new Date().toLocaleDateString()}`],
      [""],
      [`Opening Balance: ${formatter.format(openingBalance)}`],
      [`Total Inflow: ${formatter.format(totalInflow)}`],
      [`Total Outflow: ${formatter.format(totalOutflow)}`],
      [`Closing Balance: ${formatter.format(closingBalance)}`],
      [""],
      [""] // Empty row before the table
    ];
    
    XLSX.utils.sheet_add_aoa(worksheet, summaryRows, { origin: "A1" });
    
    // Add data table headers
    const headers = [
      ["Date", "Type", "Description", "Inflow", "Outflow", "Balance"]
    ];
    
    // Prepare transaction data rows with running balance
    const dataRows = [];
    let balance = openingBalance;
    
    // Add opening balance row
    dataRows.push(["", "", "Opening Balance", "", "", formatter.format(balance)]);
    
    // Add transaction rows
    transactions.forEach(transaction => {
      transaction.isInflow ? balance += transaction.amount : balance -= transaction.amount;
      
      dataRows.push([
        format(new Date(transaction.date), 'dd/MM/yyyy'),
        transaction.type,
        transaction.description,
        transaction.isInflow ? formatter.format(transaction.amount) : '',
        !transaction.isInflow ? formatter.format(transaction.amount) : '',
        formatter.format(balance)
      ]);
    });
    
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
    if(!worksheet["!merges"]) worksheet["!merges"] = [];
    worksheet["!merges"].push(
      {s: {r: 0, c: 0}, e: {r: 0, c: 5}} // Merge cells for the title row
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
      {transactions.length > 0 && (
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
              <TableCell className="text-right font-medium">{formatter.format(openingBalance)}</TableCell>
              <TableCell></TableCell>
            </TableRow>
            
            {/* Transaction Rows with Expandable Details */}
            {transactionsWithBalance.map((transaction) => (
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
                    {transaction.isInflow ? formatter.format(transaction.amount) : '-'}
                  </TableCell>
                  <TableCell className="text-right" onClick={() => toggleRow(transaction.id)}>
                    {!transaction.isInflow ? formatter.format(transaction.amount) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium" onClick={() => toggleRow(transaction.id)}>
                    {formatter.format(transaction.balance)}
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
                {formatter.format(totalInflow)}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatter.format(totalOutflow)}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatter.format(closingBalance)}
              </TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

