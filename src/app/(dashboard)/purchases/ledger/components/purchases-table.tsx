"use client";

import { formatPrice } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { PercentIcon, Download, FileSpreadsheet } from "lucide-react"; 
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CellAction } from "./cell-action";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

type Purchase = {
  id: string;
  date: string;
  amount: number;
  description: string;
  packageName: string;
  supplierName: string;
  supplierContact: string;
  // Add GST fields
  gstAmount?: number;
  gstPercentage?: number;
};

interface PurchasesTableProps {
  // Support both the old format (data) and new format (purchases, suppliers, totalAmount, totalGst)
  data?: Purchase[];
  purchases?: Purchase[];
  suppliers?: { id: string; name: string; contact?: string }[];
  totalAmount?: number;
  totalGst?: number;
}

export const PurchasesTable: React.FC<PurchasesTableProps> = ({ 
  data,
  purchases,
  totalAmount: propsTotalAmount,
  totalGst: propsTotalGst
}) => {
  const router = useRouter();
  
  // Use purchases prop if provided, otherwise use data prop
  const items = purchases || data || [];
  
  // Calculate totals if not provided in props
  const totalAmount = propsTotalAmount !== undefined
    ? propsTotalAmount 
    : items.reduce((sum, item) => sum + item.amount, 0);
  
  const totalGst = propsTotalGst !== undefined
    ? propsTotalGst
    : items.reduce((sum, item) => sum + (item.gstAmount || 0), 0);
  
  // Function to generate and download PDF
  const generatePDF = () => {
    const doc = new jsPDF();

    // Add report title
    doc.setFontSize(18);
    doc.text("Purchase Ledger Report", 14, 22);

    // Add date
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    // Add summary metrics with properly formatted amounts
    doc.setFontSize(12);
    doc.text(`Total Purchases: Rs. ${formatPrice(totalAmount, { forPDF: true })}`, 14, 40);
    doc.text(`Total GST: Rs. ${formatPrice(totalGst, { forPDF: true })}`, 14, 48);

    // Add table data with proper formatting
    const tableData = items.map(purchase => [
      purchase.date,
      purchase.supplierName,
      purchase.packageName,
      purchase.description,
      `Rs. ${formatPrice(purchase.amount, { forPDF: true })}`,
      purchase.gstAmount ? `Rs. ${formatPrice(purchase.gstAmount, { forPDF: true })}` : "-"
    ]);

    // Add the table
    autoTable(doc, {
      head: [["Date", "Supplier", "Package", "Description", "Amount", "GST"]],
      body: tableData,
      startY: 55,
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
    doc.save(`purchase-ledger-report-${today}.pdf`);
  };

  // Function to generate and download Excel
  const generateExcel = () => {
    // Create empty worksheet
    const worksheet = XLSX.utils.aoa_to_sheet([]);

    // Add title and summary information with proper spacing
    const summaryRows = [
      ["Purchase Ledger Report"],
      [""],
      [`Generated on: ${new Date().toLocaleDateString()}`],
      [""],
      [`Total Purchases: ${formatPrice(totalAmount)}`],
      [`Total GST: ${formatPrice(totalGst)}`],
      [""],
      [""] // Empty row before the table
    ];

    XLSX.utils.sheet_add_aoa(worksheet, summaryRows, { origin: "A1" });

    // Add data table headers
    const headers = [
      ["Date", "Supplier", "Package", "Description", "Amount", "GST"]
    ];

    const dataRows = items.map(purchase => [
      purchase.date,
      purchase.supplierName,
      purchase.packageName,
      purchase.description,
      formatPrice(purchase.amount),
      purchase.gstAmount ? formatPrice(purchase.gstAmount) : "-"
    ]);

    // Add headers and data
    XLSX.utils.sheet_add_aoa(worksheet, headers, { origin: "A9" });
    XLSX.utils.sheet_add_aoa(worksheet, dataRows, { origin: "A10" });

    // Set column widths
    const columnWidths = [
      { wch: 12 }, // Date
      { wch: 20 }, // Supplier
      { wch: 20 }, // Package
      { wch: 30 }, // Description
      { wch: 15 }, // Amount
      { wch: 15 }, // GST
    ];

    worksheet["!cols"] = columnWidths;

    // Add merge cells for the title
    if (!worksheet["!merges"]) worksheet["!merges"] = [];
    worksheet["!merges"].push(
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } } // Merge cells for the title row
    );

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Purchase Ledger");

    // Generate filename with date
    const today = new Date().toISOString().split('T')[0];
    const fileName = `purchase-ledger-${today}.xlsx`;

    // Write to file and trigger download
    XLSX.writeFile(workbook, fileName);
  };
  
  return (
    <>
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(totalAmount)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total GST</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(totalGst)}</div>
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
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Package</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">GST</TableHead>
              <TableHead className="text-center w-[70px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No purchases found
                </TableCell>
              </TableRow>
            ) : (
              <>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.date}</TableCell>
                    <TableCell>{item.supplierName}</TableCell>
                    <TableCell>{item.packageName}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(item.amount)}
                      {item.gstPercentage ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="ml-1 inline-flex items-center text-xs text-muted-foreground">
                                <PercentIcon className="h-3 w-3" />
                              </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Includes GST: {item.gstPercentage}%</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.gstAmount ? formatPrice(item.gstAmount) : '-'}
                    {item.gstPercentage ? ` (${item.gstPercentage}%)` : ''}
                  </TableCell>
                  <TableCell>
                    <CellAction data={item} />
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={4} className="font-bold">Total</TableCell>
                <TableCell className="text-right font-bold">
                  {formatPrice(totalAmount)}
                </TableCell>
                <TableCell className="text-right font-bold">
                  {formatPrice(totalGst)}
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </>
          )}
        </TableBody>
      </Table>
    </div>
  </>
);
};

