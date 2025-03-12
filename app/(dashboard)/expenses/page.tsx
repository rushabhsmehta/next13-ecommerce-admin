"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { DataTable } from "@/components/ui/data-table";
import { ApiList } from "@/components/ui/api-list";
import { format } from "date-fns";

import { columns } from "./components/columns";

const ExpensesPage = () => {
  const router = useRouter();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/expenses');
        setExpenses(response.data.map((expense: any) => ({
          ...expense,
          formattedDate: format(new Date(expense.expenseDate), 'MMMM dd, yyyy'),
          formattedAmount: new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
          }).format(expense.amount),
          accountName: expense.bankAccount?.accountName || expense.cashAccount?.accountName || 'N/A'
        })));
      } catch (error) {
        console.error("Error fetching expenses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchExpenses();
  }, []);

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <Heading
            title={`Expenses (${expenses.length})`}
            description="Manage your expense entries"
          />
          <Button onClick={() => router.push(`/expenses/new`)}>
            <Plus className="mr-2 h-4 w-4" />
            Add New
          </Button>
        </div>
        <Separator />
        <DataTable
          columns={columns}
          data={expenses}
          searchKey="description"
        />
        <Heading title="API" description="API calls for Expenses" />
        <Separator />
        <ApiList entityName="expenses" entityIdName="expenseId" />
      </div>
    </div>
  );
};

export default ExpensesPage;
