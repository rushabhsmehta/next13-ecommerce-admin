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

interface CashAccount {
  id: string;
  accountName: string;
  openingBalance: number;
  currentBalance: number;
  isActive: boolean;
  createdAt: string;
}

const CashBookPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);
  
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'INR'
  });

  useEffect(() => {
    const fetchCashAccounts = async () => {
      try {
        const response = await axios.get("/api/cash-accounts");
        setCashAccounts(response.data);
      } catch (error) {
        console.error("Failed to fetch cash accounts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCashAccounts();
  }, []);
  
  // Calculate total balance
  const totalBalance = useMemo(() => {
    return cashAccounts.reduce((sum, account) => sum + account.currentBalance, 0);
  }, [cashAccounts]);
  
  // Function to generate and download PDF
  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Add report title
    doc.setFontSize(18);
    doc.text("Cash Book Summary Report", 14, 22);
    
    // Add date
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    
    // Add summary metrics
    doc.setFontSize(12);
    doc.text(`Total Cash Accounts: ${cashAccounts.length}`, 14, 40);
    doc.text(`Total Cash Balance: ${formatter.format(totalBalance)}`, 14, 48);
    
    // Add table data
    const tableData = cashAccounts.map(account => [
      account.accountName,
      formatter.format(account.currentBalance),
      account.isActive ? "Active" : "Inactive"
    ]);
    
    // Add the table
    autoTable(doc, {
      head: [["Account Name", "Current Balance", "Status"]],
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
    doc.save("cash-book-summary-report.pdf");
  };

  // Function to generate and download Excel
  const generateExcel = () => {
    // Create empty worksheet
    const worksheet = XLSX.utils.aoa_to_sheet([]);
    
    // Add title and summary information with proper spacing
    const summaryRows = [
      ["Cash Book Summary Report"],
      [""],
      [`Generated on: ${new Date().toLocaleDateString()}`],
      [""],
      [`Total Cash Accounts: ${cashAccounts.length}`],
      [`Total Cash Balance: ${formatter.format(totalBalance)}`],
      [""],
      [""] // Empty row before the table
    ];
    
    XLSX.utils.sheet_add_aoa(worksheet, summaryRows, { origin: "A1" });
    
    // Add data table headers
    const headers = [
      ["Account Name", "Current Balance", "Status"]
    ];
    
    const dataRows = cashAccounts.map(account => [
      account.accountName,
      formatter.format(account.currentBalance),
      account.isActive ? "Active" : "Inactive"
    ]);
    
    // Add headers and data
    XLSX.utils.sheet_add_aoa(worksheet, headers, { origin: "A9" });
    XLSX.utils.sheet_add_aoa(worksheet, dataRows, { origin: "A10" });
    
    // Set column widths
    const columnWidths = [
      { wch: 25 }, // Account Name
      { wch: 20 }, // Current Balance
      { wch: 15 }, // Status
    ];
    
    worksheet["!cols"] = columnWidths;
    
    // Add merge cells for the title
    if(!worksheet["!merges"]) worksheet["!merges"] = [];
    worksheet["!merges"].push(
      {s: {r: 0, c: 0}, e: {r: 0, c: 2}} // Merge cells for the title row
    );
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Cash Book Summary");
    
    // Generate filename with date
    const today = new Date().toISOString().split('T')[0];
    const fileName = `cash-book-summary-${today}.xlsx`;
    
    // Write to file and trigger download
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="p-8 pt-6">
      <div className="flex items-center justify-between">
        <Heading
          title="Cash Book"
          description="Manage and view your cash accounts"
        />
        <div className="flex gap-2">
          <Button 
            onClick={generateExcel}
            variant="outline"
            className="flex gap-2 items-center"
            disabled={loading || cashAccounts.length === 0}
          >
            <FileSpreadsheet size={16} />
            Excel
          </Button>
          <Button 
            onClick={generatePDF}
            variant="outline"
            className="flex gap-2 items-center"
            disabled={loading || cashAccounts.length === 0}
          >
            <Download size={16} />
            PDF
          </Button>
          <Button onClick={() => router.push("/cash-accounts/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Cash Account
          </Button>
        </div>
      </div>
      <Separator className="my-4" />

      {loading ? (
        <div>Loading cash accounts...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cashAccounts.map((account) => (
            <Card key={account.id} className={!account.isActive ? "opacity-70" : ""}>
              <CardHeader>
                <CardTitle>{account.accountName}</CardTitle>
                <CardDescription>
                  {account.isActive ? "Active" : "Inactive"} Cash Account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Current Balance:</span>
                    <span className="font-medium">
                      {formatter.format(account.currentBalance)}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => router.push(`/cash-book/${account.id}`)}
                >
                  View Cash Book
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {!loading && cashAccounts.length === 0 && (
        <div className="text-center py-10">
          <p className="text-muted-foreground mb-4">
            No cash accounts found. Create your first cash account to start tracking cash transactions.
          </p>
          <Button onClick={() => router.push("/cash-accounts/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Cash Account
          </Button>
        </div>
      )}
    </div>
  );
};

export default CashBookPage;
