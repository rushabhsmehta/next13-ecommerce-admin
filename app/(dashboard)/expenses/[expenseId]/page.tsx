"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-hot-toast";

import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { ExpenseForm } from "../components/expense-form";

const ExpenseEditPage = () => {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [expenseData, setExpenseData] = useState(null);

  useEffect(() => {
    const fetchExpenseDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/expenses/${params.expenseId}`);
        setExpenseData(response.data);
      } catch (error) {
        toast.error("Failed to load expense details");
        router.push('/expenses');
      } finally {
        setLoading(false);
      }
    };

    if (params.expenseId) {
      fetchExpenseDetails();
    }
  }, [params.expenseId, router]);

  if (loading) {
    return <div className="flex-col p-8">Loading...</div>;
  }

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Heading
          title="Edit Expense"
          description="Update an existing expense record"
        />
        <Separator />
        {expenseData && <ExpenseForm initialData={expenseData} />}
      </div>
    </div>
  );
};

export default ExpenseEditPage;
