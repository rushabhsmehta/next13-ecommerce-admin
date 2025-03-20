"use client";

import { IncomeFormWrapper } from "@/components/forms/income-form-wrapper";
import { IncomeFormProps } from "@/types/index";
import { useRouter } from "next/navigation";

export const IncomeForm = ({ initialData, incomeCategories, bankAccounts, cashAccounts }: IncomeFormProps) => {
  const router = useRouter();
  
  const onSuccess = () => {
    router.push("/incomes");
    router.refresh();
  };
  
  return (
    <IncomeFormWrapper
      initialData={initialData}
      incomeCategories={incomeCategories}
      bankAccounts={bankAccounts}
      cashAccounts={cashAccounts}
      onSuccess={onSuccess}
      submitButtonText={initialData?.id ? "Update Income" : "Create Income"}
    />
  );
};

export default IncomeForm;

