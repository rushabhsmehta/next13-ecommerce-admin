"use client";

import { ExpenseFormWrapper } from "@/components/forms/expense-form-wrapper";
import { useRouter } from "next/navigation";
import { BankAccount, CashAccount, ExpenseCategory } from "@prisma/client";

interface ExpenseFormProps {
  initialData: any;
  expenseCategories: ExpenseCategory[];
  bankAccounts: BankAccount[];
  cashAccounts: CashAccount[];
}

export const ExpenseForm = ({ initialData, expenseCategories, bankAccounts, cashAccounts }: ExpenseFormProps) => {
  const router = useRouter();
  
  const onSuccess = () => {
    router.push("/expenses");
    router.refresh();
  };
  
  return (
    <ExpenseFormWrapper
      initialData={initialData}
      expenseCategories={expenseCategories}
      bankAccounts={bankAccounts}
      cashAccounts={cashAccounts}
      onSuccess={onSuccess}
      submitButtonText={initialData?.id ? "Update Expense" : "Create Expense"}
    />
  );
};

export default ExpenseForm;

