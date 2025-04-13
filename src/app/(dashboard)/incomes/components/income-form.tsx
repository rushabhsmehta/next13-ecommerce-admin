"use client";

import { IncomeFormWrapper } from "@/components/forms/income-form-wrapper";
import { useRouter } from "next/navigation";
import { IncomeFormProps } from "../../../../../types";

export const IncomeForm = ({ 
  initialData, 
  incomeCategories, 
  bankAccounts, 
  cashAccounts, 
  onSuccess 
}: IncomeFormProps) => {
  const router = useRouter();
  
  // Default onSuccess handler if none is provided
  const handleSuccess = () => {
    router.push("/incomes");
    router.refresh();
  };
  
  return (
    <IncomeFormWrapper
      initialData={initialData}
      incomeCategories={incomeCategories}
      bankAccounts={bankAccounts}
      cashAccounts={cashAccounts}
      onSuccess={onSuccess || handleSuccess}
      submitButtonText={initialData?.id ? "Update Income" : "Create Income"}
    />
  );
};

export default IncomeForm;

