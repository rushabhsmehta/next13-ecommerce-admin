"use client";

import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { ExpenseForm } from "../components/expense-form";

const NewExpensePage = () => {
  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Heading
          title="Create Expense"
          description="Add a new expense record"
        />
        <Separator />
        <ExpenseForm initialData={null} />
      </div>
    </div>
  );
};

export default NewExpensePage;
