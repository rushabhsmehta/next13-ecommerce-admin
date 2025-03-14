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
import { BankAccountColumn, columns } from "./columns";

interface BankAccountsClientProps {
  data: BankAccountColumn[];
}

export const BankAccountsClient: React.FC<BankAccountsClientProps> = ({
  data
}) => {
  const router = useRouter();

  // Function to generate and download PDF
  const generatePDF = () => {
    const doc = new jsPDF();
    // Add a Unicode font that supports the Rupee symbol
    doc.addFont('https://cdn.jsdelivr.net/npm/@fontsource/noto-sans/files/noto-sans-all-400-normal.woff', 'NotoSans', 'normal');
    doc.setFont('NotoSans');
    // Add report title
    doc.setFontSize(18);
    doc.text("Bank Accounts Report", 14, 22);

    // Add date
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    // Add summary count
    doc.setFontSize(12);
    doc.text(`Total Bank Accounts: ${data.length}`, 14, 40);

    // Add table data
    const tableData = data.map(item => [
      item.accountName,
      item.accountNumber,
      item.bankName,
      item.createdAt
    ]);

    // Add the table
    autoTable(doc, {
      head: [["Account Name", "Account Number", "Bank Name", "Created Date"]],
      body: tableData,
      startY: 50,
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
    doc.save("bank-accounts-report.pdf");
  };

  // Function to generate and download Excel
  const generateExcel = () => {
    // Create empty worksheet
    const worksheet = XLSX.utils.aoa_to_sheet([]);

    // Add title and summary information with proper spacing
    const summaryRows = [
      ["Bank Accounts Report"],
      [""],
      [`Generated on: ${new Date().toLocaleDateString()}`],
      [""],
      [`Total Bank Accounts: ${data.length}`],
      [""],
      [""] // Empty row before the table
    ];

    XLSX.utils.sheet_add_aoa(worksheet, summaryRows, { origin: "A1" });

    // Add data table headers
    const headers = [
      ["Account Name", "Account Number", "Bank Name", "Created Date"]
    ];

    const dataRows = data.map(item => [
      item.accountName,
      item.accountNumber,
      item.bankName,
      item.createdAt
    ]);

    // Add headers and data
    XLSX.utils.sheet_add_aoa(worksheet, headers, { origin: "A8" });
    XLSX.utils.sheet_add_aoa(worksheet, dataRows, { origin: "A9" });

    // Set column widths
    const columnWidths = [
      { wch: 25 }, // Account Name
      { wch: 20 }, // Account Number
      { wch: 20 }, // Bank Name
      { wch: 20 }, // Created Date
    ];

    worksheet["!cols"] = columnWidths;

    // Add merge cells for the title
    if (!worksheet["!merges"]) worksheet["!merges"] = [];
    worksheet["!merges"].push(
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } } // Merge cells for the title row
    );

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bank Accounts");

    // Generate filename with date
    const today = new Date().toISOString().split('T')[0];
    const fileName = `bank-accounts-report-${today}.xlsx`;

    // Write to file and trigger download
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading title={`Bank Accounts (${data.length})`} description="Manage bank accounts" />
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
          <Button onClick={() => router.push(`/bankaccounts/new`)}>
            <Plus className="mr-2 h-4 w-4" /> Add New
          </Button>
        </div>
      </div>
      <Separator />
      <DataTable searchKey="accountName" columns={columns} data={data} />
    </>
  );
};
