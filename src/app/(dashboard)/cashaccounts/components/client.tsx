'use client'

import { Plus, Download, FileSpreadsheet } from "lucide-react";
import { useRouter } from "next/navigation";
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { CashAccountColumn, columns } from "./columns";

interface CashAccountsClientProps {
  data: CashAccountColumn[];
}

export const CashAccountsClient: React.FC<CashAccountsClientProps> = ({
  data
}) => {
  const router = useRouter();
  
  // Format currency for reports
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'INR'
  });

  // Function to generate and download PDF
  const generatePDF = () => {
    const doc = new jsPDF();
      // Add a Unicode font that supports the Rupee symbol
      doc.addFont('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf', 'Roboto', 'normal');
      doc.setFont('Roboto');
    // Add report title
    doc.setFontSize(18);
    doc.text("Cash Accounts Report", 14, 22);
    
    // Add date
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    
    // Add summary count
    doc.setFontSize(12);
    doc.text(`Total Cash Accounts: ${data.length}`, 14, 40);
    
    // Calculate total balance
    const totalBalance = data.reduce((sum, item) => sum + item.currentBalance, 0);
    doc.text(`Total Balance: ${formatter.format(totalBalance)}`, 14, 48);
    
    // Add table data
    const tableData = data.map(item => [
      item.accountName,
      formatter.format(item.currentBalance),
      item.createdAt
    ]);
    
    // Add the table
    autoTable(doc, {
      head: [["Account Name", "Current Balance", "Created Date"]],
      body: tableData,
      startY: 55,
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
    doc.save("cash-accounts-report.pdf");
  };

  // Function to generate and download Excel
  const generateExcel = () => {
    // Create empty worksheet
    const worksheet = XLSX.utils.aoa_to_sheet([]);
    
    // Calculate total balance
    const totalBalance = data.reduce((sum, item) => sum + item.currentBalance, 0);
    
    // Add title and summary information with proper spacing
    const summaryRows = [
      ["Cash Accounts Report"],
      [""],
      [`Generated on: ${new Date().toLocaleDateString()}`],
      [""],
      [`Total Cash Accounts: ${data.length}`],
      [`Total Balance: ${formatter.format(totalBalance)}`],
      [""],
      [""] // Empty row before the table
    ];
    
    XLSX.utils.sheet_add_aoa(worksheet, summaryRows, { origin: "A1" });
    
    // Add data table headers
    const headers = [
      ["Account Name", "Current Balance", "Created Date"]
    ];
    
    const dataRows = data.map(item => [
      item.accountName,
      formatter.format(item.currentBalance),
      item.createdAt
    ]);
    
    // Add headers and data
    XLSX.utils.sheet_add_aoa(worksheet, headers, { origin: "A9" });
    XLSX.utils.sheet_add_aoa(worksheet, dataRows, { origin: "A10" });
    
    // Set column widths
    const columnWidths = [
      { wch: 25 }, // Account Name
      { wch: 20 }, // Current Balance
      { wch: 20 }, // Created Date
    ];
    
    worksheet["!cols"] = columnWidths;
    
    // Add merge cells for the title
    if(!worksheet["!merges"]) worksheet["!merges"] = [];
    worksheet["!merges"].push(
      {s: {r: 0, c: 0}, e: {r: 0, c: 2}} // Merge cells for the title row
    );
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Cash Accounts");
    
    // Generate filename with date
    const today = new Date().toISOString().split('T')[0];
    const fileName = `cash-accounts-report-${today}.xlsx`;
    
    // Write to file and trigger download
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading title={`Cash Accounts (${data.length})`} description="Manage your cash accounts" />
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
          <Button onClick={() => router.push(`/cashaccounts/new`)}>
            <Plus className="mr-2 h-4 w-4" /> Add New
          </Button>
        </div>
      </div>
      <Separator />
      <DataTable searchKey="name" columns={columns} data={data} />
    </>
  );
};

