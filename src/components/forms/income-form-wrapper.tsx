"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { IncomeFormDialog } from "@/components/forms/income-form-dialog"; // Updated path
import { Loader } from "lucide-react";
import { IncomeFormProps } from "@/types/index";

interface IncomeFormWrapperProps extends IncomeFormProps {
  isModal?: boolean;
  redirectPath?: string;
}

export const IncomeFormWrapper = ({
  initialData,
  onSuccess,
  submitButtonText = "Create",
  isModal = false,
  redirectPath,
  ...props
}: IncomeFormWrapperProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [incomeCategories, setIncomeCategories] = useState(props.incomeCategories || []);
  const [bankAccounts, setBankAccounts] = useState(props.bankAccounts || []);
  const [cashAccounts, setCashAccounts] = useState(props.cashAccounts || []);
  
  // Only fetch data if not provided as props
  useEffect(() => {
    const fetchData = async () => {
      if (!props.incomeCategories || !props.bankAccounts || !props.cashAccounts) {
        try {
          const [categoriesResponse, bankAccountsResponse, cashAccountsResponse] = await Promise.all([
            axios.get('/api/income-categories'),
            axios.get('/api/bank-accounts'),
            axios.get('/api/cash-accounts')
          ]);
          
          setIncomeCategories(categoriesResponse.data || []);
          setBankAccounts(bankAccountsResponse.data || []);
          setCashAccounts(cashAccountsResponse.data || []);
        } catch (error) {
          toast.error("Failed to load data");
          console.error(error);
        }
      }
      setIsLoading(false);
    };
    
    fetchData();
  }, [props.incomeCategories, props.bankAccounts, props.cashAccounts]);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-24">
        <Loader className="w-6 h-6 animate-spin" />
      </div>
    );
  }
  
  return (
    <IncomeFormDialog
      initialData={initialData}
      incomeCategories={incomeCategories}
      bankAccounts={bankAccounts}
      cashAccounts={cashAccounts}
      onSuccess={onSuccess}
      submitButtonText={submitButtonText}
    />
  );
};

