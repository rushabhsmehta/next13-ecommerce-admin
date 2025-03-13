"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Plus, Download, FileSpreadsheet } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface BankAccount {
  id: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  openingBalance: number;
  currentBalance: number;
  isActive: boolean;
  createdAt: string;
}

const BankBookPage = () => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'INR'
  });
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  useEffect(() => {
    const fetchBankAccounts = async () => {
      try {
        const response = await axios.get("/api/bank-accounts");
        setBankAccounts(response.data);
      } catch (error) {
        console.error("Failed to fetch bank accounts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBankAccounts();
  }, []);

  // Calculate total balance of all accounts
  const totalBalance = useMemo(() => {
    return bankAccounts.reduce((sum, account) => sum + account.currentBalance, 0);
  }, [bankAccounts]);

  // Function to generate and download PDF
  const generatePDF = () => {
    const doc = new jsPDF();
    // Add a Unicode font that supports the Rupee symbol
    doc.addFont('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.setFont('Roboto');
    // Add report title
    doc.setFontSize(18);
    doc.text("Bank Book Summary Report", 14, 22);

    // Add date and summary information
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    doc.setFontSize(12);
    doc.text(`Total Bank Accounts: ${bankAccounts.length}`, 14, 40);
    doc.text(`Total Balance: ${formatter.format(totalBalance)}`, 14, 48);

    // Add table data
    const tableData = bankAccounts.map(account => [
      account.accountName,
      account.bankName,
      account.accountNumber,
      formatter.format(account.currentBalance),
      account.isActive ? "Active" : "Inactive"
    ]);

    // Add the table
    autoTable(doc, {
      head: [["Account Name", "Bank Name", "Account Number", "Current Balance", "Status"]],
      body: tableData,
      startY: 55,
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
    doc.save("bank-book-summary-report.pdf");
  };

  // Function to generate and download Excel
  const generateExcel = () => {
    // Create empty worksheet
    const worksheet = XLSX.utils.aoa_to_sheet([]);

    // Add title and summary information with proper spacing
    const summaryRows = [
      ["Bank Book Summary Report"],
      [""],
      [`Generated on: ${new Date().toLocaleDateString()}`],
      [""],
      [`Total Bank Accounts: ${bankAccounts.length}`],
      [`Total Balance: ${formatter.format(totalBalance)}`],
      [""],
      [""] // Empty row before the table
    ];

    XLSX.utils.sheet_add_aoa(worksheet, summaryRows, { origin: "A1" });

    // Add data table headers
    const headers = [
      ["Account Name", "Bank Name", "Account Number", "Current Balance", "Status"]
    ];

    const dataRows = bankAccounts.map(account => [
      account.accountName,
      account.bankName,
      account.accountNumber,
      formatter.format(account.currentBalance),
      account.isActive ? "Active" : "Inactive"
    ]);

    // Add headers and data
    XLSX.utils.sheet_add_aoa(worksheet, headers, { origin: "A9" });
    XLSX.utils.sheet_add_aoa(worksheet, dataRows, { origin: "A10" });

    // Set column widths
    const columnWidths = [
      { wch: 25 }, // Account Name
      { wch: 20 }, // Bank Name
      { wch: 20 }, // Account Number
      { wch: 20 }, // Current Balance
      { wch: 10 }, // Status
    ];

    worksheet["!cols"] = columnWidths;

    // Add merge cells for the title
    if (!worksheet["!merges"]) worksheet["!merges"] = [];
    worksheet["!merges"].push(
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } } // Merge cells for the title row
    );

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bank Book Summary");

    // Generate filename with date
    const today = new Date().toISOString().split('T')[0];
    const fileName = `bank-book-summary-${today}.xlsx`;

    // Write to file and trigger download
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <Heading
            title={`Bank Book - Closing Balance: ${formatter.format(totalBalance)}`}
            description="Manage and view your bank accounts"
          />
        </div>
        <div className="flex gap-2">
          <Button
            onClick={generateExcel}
            variant="outline"
            className="flex gap-2 items-center"
            disabled={loading || bankAccounts.length === 0}
          >
            <FileSpreadsheet size={16} />
            Excel
          </Button>
          <Button
            onClick={generatePDF}
            variant="outline"
            className="flex gap-2 items-center"
            disabled={loading || bankAccounts.length === 0}
          >
            <Download size={16} />
            PDF
          </Button>
          <Button onClick={() => router.push("/bank-accounts/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Bank Account
          </Button>
        </div>
      </div>
      <Separator className="my-4" />

      {loading ? (
        <div>Loading bank accounts...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bankAccounts.map((account) => (
            <Card key={account.id} className={!account.isActive ? "opacity-70" : ""}>
              <CardHeader>
                <CardTitle>{account.accountName}</CardTitle>
                <CardDescription>
                  {account.bankName} - {account.accountNumber}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Current Balance:</span>
                    <span className="font-medium">
                      {formatter.format(account.currentBalance)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {account.isActive ? "Active Account" : "Inactive Account"}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/bank-book/${account.id}`)}
                >
                  View Bank Book
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {!loading && bankAccounts.length === 0 && (
        <div className="text-center py-10">
          <p className="text-muted-foreground mb-4">
            No bank accounts found. Create your first bank account to start tracking bank transactions.
          </p>
          <Button onClick={() => router.push("/bank-accounts/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Bank Account
          </Button>
        </div>
      )}
    </div>
  );
};

export default BankBookPage;
