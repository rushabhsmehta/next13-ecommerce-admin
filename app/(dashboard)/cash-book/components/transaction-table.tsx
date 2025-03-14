"use client";

import { useState } from "react";
import { format } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FormattedTransaction } from "@/types/index";
import { formatPrice } from "@/lib/utils";";
import { Download } from "lucide-react";import { Download } from "lucide-react";

interface TransactionTableProps { {
  data: FormattedTransaction[];ion[];
  openingBalance: number;er;
  accountName: string; accountName: string;
}}

export const TransactionTable: React.FC<TransactionTableProps> = ({const TransactionTable: React.FC<TransactionTableProps> = ({
  data,
  openingBalance,ce,
  accountName,ntName,
}) => {
  // Calculate totals
  const totalInflow = data.reduce((sum, item) => sum + item.inflow, 0);
  const totalOutflow = data.reduce((sum, item) => sum + item.outflow, 0);, item) => sum + item.outflow, 0);
  const finalBalance = data.length > 0  0 
    ? data[data.length - 1].balance h - 1].balance 
    : openingBalance;    : openingBalance;

  const generatePDF = () => {{
    const doc = new jsPDF();const doc = new jsPDF();
    
    // Add title and header informationder information
    doc.setFontSize(18);
    doc.text("Cash Book", 14, 20);doc.text("Cash Book", 14, 20);
    
    doc.setFontSize(11);
    doc.text(`Account: ${accountName}`, 14, 30);
    doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 14, 36);
    doc.text(`Opening Balance: Rs. ${formatPrice(openingBalance, { forPDF: true })}`, 14, 42);doc.text(`Opening Balance: Rs. ${formatPrice(openingBalance, { forPDF: true })}`, 14, 42);
    
    // Prepare table data
    const tableData = data.map(transaction => [
      format(new Date(transaction.date), 'dd/MM/yyyy'),ransaction.date), 'dd/MM/yyyy'),
      transaction.type,
      transaction.description,
      transaction.inflow ? `Rs. ${formatPrice(transaction.inflow, { forPDF: true })}` : "-",
      transaction.outflow ? `Rs. ${formatPrice(transaction.outflow, { forPDF: true })}` : "-",w, { forPDF: true })}` : "-",
      `Rs. ${formatPrice(transaction.balance, { forPDF: true })}`Rs. ${formatPrice(transaction.balance, { forPDF: true })}`
    ]);]);
    
    // Add summary rowow
    tableData.push([push([
      'Total',tal',
      '',
      '',
      `Rs. ${formatPrice(totalInflow, { forPDF: true })}`,
      `Rs. ${formatPrice(totalOutflow, { forPDF: true })}`,,
      `Rs. ${formatPrice(finalBalance, { forPDF: true })}`Rs. ${formatPrice(finalBalance, { forPDF: true })}`
    ]);]);
    
    // Generate the tabletable
    autoTable(doc, {
      head: [['Date', 'Type', 'Description', 'Inflow', 'Outflow', 'Balance']],'Type', 'Description', 'Inflow', 'Outflow', 'Balance']],
      body: tableData,Data,
      startY: 48,
      headStyles: { fillColor: [46, 125, 50] }, // Green color for cash book
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }ootStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
    });});
    
    // Add footer
    const pageCount = doc.getNumberOfPages();();
    for (let i = 1; i <= pageCount; i++) { <= pageCount; i++) {
      doc.setPage(i);
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 40, doc.internal.pageSize.height - 10); doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 40, doc.internal.pageSize.height - 10);
    }}
    
    // Save the PDF
    const fileName = `cash-book-${accountName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;ash-book-${accountName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);doc.save(fileName);
  };  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">Name="flex justify-end">
        <Button 
          variant="outline" 
          onClick={generatePDF} 
          className="flex items-center gap-2" className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />Name="h-4 w-4" />
          Download Reportd Report
        </Button>tton>
      </div></div>
      
      <div className="rounded-md border">sName="rounded-md border">
        <Table>
          <TableHeader>>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Inflow</TableHead>
              <TableHead className="text-right">Outflow</TableHead>
              <TableHead className="text-right">Balance</TableHead>d className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>er>
          <TableBody>
            <TableRow className="bg-muted/50">
              <TableCell colSpan={5} className="font-medium text-right">Opening Balance:</TableCell>
              <TableCell className="text-right font-medium">{formatPrice(openingBalance)}</TableCell>l className="text-right font-medium">{formatPrice(openingBalance)}</TableCell>
            </TableRow></TableRow>
            
            {data.length === 0 ? ( === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">className="h-24 text-center">
                  No transactions foundtions found
                </TableCell>ll>
              </TableRow>ableRow>
            ) : ((
              <>
                {data.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{format(new Date(transaction.date), "MMM dd, yyyy")}</TableCell>ate), "MMM dd, yyyy")}</TableCell>
                    <TableCell>{transaction.type}</TableCell>
                    <TableCell>{transaction.description}</TableCell>n}</TableCell>
                    <TableCell className="text-right">
                      {transaction.inflow ? formatPrice(transaction.inflow) : "-"}on.inflow ? formatPrice(transaction.inflow) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {transaction.outflow ? formatPrice(transaction.outflow) : "-"}on.outflow ? formatPrice(transaction.outflow) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">t-medium">
                      {formatPrice(transaction.balance)}ce(transaction.balance)}
                    </TableCell>ll>
                  </TableRow>/TableRow>
                ))}
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={3} className="font-bold">Totals</TableCell>
                  <TableCell className="text-right font-bold">{formatPrice(totalInflow)}</TableCell>
                  <TableCell className="text-right font-bold">{formatPrice(totalOutflow)}</TableCell>
                  <TableCell className="text-right font-bold">{formatPrice(finalBalance)}</TableCell>l className="text-right font-bold">{formatPrice(finalBalance)}</TableCell>
                </TableRow>/TableRow>
              </></>
            )}
          </TableBody>eBody>
        </Table>ble>
      </div>v>
    </div></div>
  ););
};};

