"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  DollarSign, 
  Calendar, 
  Search, 
  Download,
  FileSpreadsheet,
  CheckCircle,
  Plus
} from "lucide-react";
import { AccruedExpensesTable } from "./accrued-expenses-table";
import { PayAccruedExpenseModal } from "./pay-accrued-expense-modal";
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Link from "next/link";

interface AccruedExpensesClientProps {
  accruedExpenses: any[];
  categories: { id: string; name: string }[];
  bankAccounts: { id: string; accountName: string; currentBalance: number }[];
  cashAccounts: { id: string; accountName: string; currentBalance: number }[];
}

export const AccruedExpensesClient: React.FC<AccruedExpensesClientProps> = ({
  accruedExpenses,
  categories,
  bankAccounts,
  cashAccounts,
}) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);

  // Calculate summary statistics
  const totalAccruedAmount = accruedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const expensesByCategory = accruedExpenses.reduce((acc, expense) => {
    const categoryName = expense.expenseCategory?.name || 'Uncategorized';
    if (!acc[categoryName]) {
      acc[categoryName] = { count: 0, amount: 0 };
    }
    acc[categoryName].count += 1;
    acc[categoryName].amount += expense.amount;
    return acc;
  }, {} as Record<string, { count: number; amount: number }>);

  const oldestExpense = accruedExpenses.length > 0 
    ? accruedExpenses.reduce((oldest, current) => 
        new Date(current.accruedDate) < new Date(oldest.accruedDate) ? current : oldest
      )
    : null;
  // Filter expenses based on search query
  const filteredExpenses = accruedExpenses.filter((expense) => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    const matchesDescription = expense.description?.toLowerCase().includes(query);
    const matchesCategory = expense.expenseCategory?.name?.toLowerCase().includes(query);
    const matchesTour = expense.tourPackageQuery?.tourPackageQueryName?.toLowerCase().includes(query);
    const matchesAmount = expense.amount.toString().includes(query);
    
    return matchesDescription || matchesCategory || matchesTour || matchesAmount;
  });

  const handlePayExpense = (expense: any) => {
    setSelectedExpense(expense);
    setIsPayModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    setIsPayModalOpen(false);
    setSelectedExpense(null);
    router.refresh();
  };

  // Generate PDF report
  const generatePDF = () => {
    const doc = new jsPDF();

    // Add report title
    doc.setFontSize(18);
    doc.text("Accrued Expenses Report", 14, 22);

    // Add date
    doc.setFontSize(12);
    doc.text(`Generated on: ${format(new Date(), "PPP")}`, 14, 30);

    // Add summary
    doc.text(`Total Accrued Amount: ${formatPrice(totalAccruedAmount)}`, 14, 38);
    doc.text(`Total Number of Expenses: ${accruedExpenses.length}`, 14, 46);    // Prepare table data
    const tableData = filteredExpenses.map(expense => [
      format(new Date(expense.accruedDate), "MMM d, yyyy"),
      expense.expenseCategory?.name || "N/A",
      expense.description || "No description",
      expense.tourPackageQuery?.tourPackageQueryName || "N/A",
      formatPrice(expense.amount)
    ]);

    // Add table
    autoTable(doc, {
      head: [["Accrued Date", "Category", "Description", "Tour", "Amount"]],
      body: tableData,
      startY: 54,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [239, 68, 68] },
    });

    // Save the PDF
    const today = new Date().toISOString().split('T')[0];
    doc.save(`accrued-expenses-${today}.pdf`);
  };

  // Generate Excel report
  const generateExcel = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([]);

    // Add title and summary
    XLSX.utils.sheet_add_aoa(worksheet, [["Accrued Expenses Report"]], { origin: "A1" });
    XLSX.utils.sheet_add_aoa(worksheet, [[`Generated on: ${format(new Date(), "PPP")}`]], { origin: "A2" });
    XLSX.utils.sheet_add_aoa(worksheet, [[`Total Accrued Amount: ${formatPrice(totalAccruedAmount)}`]], { origin: "A3" });
    XLSX.utils.sheet_add_aoa(worksheet, [[`Total Number of Expenses: ${accruedExpenses.length}`]], { origin: "A4" });

    // Add empty row
    XLSX.utils.sheet_add_aoa(worksheet, [[""]], { origin: "A5" });

    // Add headers
    const headers = [["Accrued Date", "Category", "Description", "Tour", "Amount"]];
    XLSX.utils.sheet_add_aoa(worksheet, headers, { origin: "A6" });    // Add data
    const dataRows = filteredExpenses.map(expense => [
      format(new Date(expense.accruedDate), "MMM d, yyyy"),
      expense.expenseCategory?.name || "N/A",
      expense.description || "No description",
      expense.tourPackageQuery?.tourPackageQueryName || "N/A",
      formatPrice(expense.amount)
    ]);

    XLSX.utils.sheet_add_aoa(worksheet, dataRows, { origin: "A7" });

    // Set column widths
    const columnWidths = [
      { wch: 12 }, // Date
      { wch: 20 }, // Category  
      { wch: 40 }, // Description
      { wch: 25 }, // Tour
      { wch: 15 }, // Amount
    ];

    worksheet["!cols"] = columnWidths;

    // Create workbook and save
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Accrued Expenses");

    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `accrued-expenses-${today}.xlsx`);
  };

  return (
    <>
      <div className="flex-col space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Accrued Expenses</h2>
            <p className="text-muted-foreground">
              Manage expenses that are incurred but not yet paid
            </p>
          </div>
          <Link href="/expenses/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add New Expense
            </Button>
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Accrued</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatPrice(totalAccruedAmount)}</div>
              <p className="text-xs text-muted-foreground">
                Across {accruedExpenses.length} expenses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Count</CardTitle>
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{accruedExpenses.length}</div>
              <p className="text-xs text-muted-foreground">
                Unpaid expenses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Object.keys(expensesByCategory).length}</div>
              <p className="text-xs text-muted-foreground">
                Expense categories
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Oldest Expense</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {oldestExpense 
                  ? format(new Date(oldestExpense.accruedDate), "MMM d")
                  : "N/A"
                }
              </div>
              <p className="text-xs text-muted-foreground">
                {oldestExpense 
                  ? formatPrice(oldestExpense.amount)
                  : "No expenses"
                }
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Category Breakdown */}
        {Object.keys(expensesByCategory).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Breakdown by Category</CardTitle>
            </CardHeader>            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(expensesByCategory).map(([category, data]) => {
                  const categoryData = data as { count: number; amount: number };
                  return (
                    <Badge key={category} variant="secondary" className="text-sm">
                      {category}: {categoryData.count} ({formatPrice(categoryData.amount)})
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Controls */}
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex gap-2">
            <div className="relative flex-1 md:max-w-sm">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={generatePDF} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              PDF
            </Button>
            <Button onClick={generateExcel} variant="outline" size="sm">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Excel
            </Button>
          </div>
        </div>

        {/* Expenses Table */}
        <AccruedExpensesTable 
          expenses={filteredExpenses}
          onPayExpense={handlePayExpense}
        />
      </div>

      {/* Pay Expense Modal */}
      <PayAccruedExpenseModal
        expense={selectedExpense}
        bankAccounts={bankAccounts}
        cashAccounts={cashAccounts}
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        onSuccess={handlePaymentSuccess}
      />
    </>
  );
};
