"use client";

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

// Define transaction type
export type CashTransaction = {
  id: string;
  date: string;
  type: string;
  description: string;
  inflow: number;
  outflow: number;
  balance: number;
  reference?: string;
};

interface TransactionTableProps {
  data: CashTransaction[];
  openingBalance: number;
  accountName?: string;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({ 
  data, 
  openingBalance, 
  accountName 
}) => {
  const router = useRouter();

  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Add report title
    doc.setFontSize(18);
    doc.text("Cash Book", 14, 22);
    
    // Add account name and date
    doc.setFontSize(10);
    if (accountName) {
      doc.text(`Account: ${accountName}`, 14, 30);
    }
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 38);
    
    // Add opening balance
    doc.setFontSize(12);
    doc.text(`Opening Balance: Rs. ${formatPrice(openingBalance, { forPDF: true })}`, 14, 46);
    
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
      startY: 54,
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
    const today = new Date().toISOString().split('T')[0];
    const fileName = `cash-book${accountName ? `-${accountName.toLowerCase().replace(/\s+/g, '-')}` : ''}-${today}.pdf`;
    doc.save(fileName);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Inflow</TableHead>
            <TableHead className="text-right">Outflow</TableHead>
            <TableHead className="text-right">Balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={5} className="font-medium text-right">Opening Balance:</TableCell>
            <TableCell className="text-right font-medium">{formatPrice(openingBalance)}</TableCell>
          </TableRow>
          
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No transactions found
              </TableCell>
            </TableRow>
          ) : (
            <>
              {data.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{format(new Date(transaction.date), "MMM dd, yyyy")}</TableCell>
                  <TableCell>{transaction.type}</TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell className="text-right">
                    {transaction.inflow ? formatPrice(transaction.inflow) : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {transaction.outflow ? formatPrice(transaction.outflow) : "-"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatPrice(transaction.balance)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={3} className="font-bold">Totals</TableCell>
                <TableCell className="text-right font-bold">
                  {formatPrice(data.reduce((total, item) => total + (item.inflow || 0), 0))}
                </TableCell>
                <TableCell className="text-right font-bold">
                  {formatPrice(data.reduce((total, item) => total + (item.outflow || 0), 0))}
                </TableCell>
                <TableCell className="text-right font-bold">
                  {formatPrice(data[data.length - 1]?.balance || openingBalance)}
                </TableCell>
              </TableRow>
            </>
          )}
        </TableBody>
      </Table>
      <div className="p-4">
        <Button onClick={generatePDF} className="mt-4">
          Download PDF
        </Button>
      </div>
    </div>
  );
};
