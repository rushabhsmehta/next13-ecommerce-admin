"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { ExpenseFormDialog } from "@/components/forms/expense-form-dialog"; // Updated path
import { Loader } from "lucide-react";
import { ExpenseFormProps } from "@/types";

interface ExpenseFormWrapperProps extends ExpenseFormProps {
  isModal?: boolean;
  redirectPath?: string;
}

export const ExpenseFormWrapper = ({
  initialData,
  onSuccess,
  submitButtonText = "Create",
  isModal = false,
  redirectPath,
  ...props
}: ExpenseFormWrapperProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [expenseCategories, setExpenseCategories] = useState(props.expenseCategories || []);
  const [bankAccounts, setBankAccounts] = useState(props.bankAccounts || []);
  const [cashAccounts, setCashAccounts] = useState(props.cashAccounts || []);
  
  // Only fetch data if not provided as props
  useEffect(() => {
    const fetchData = async () => {
      if (!props.expenseCategories || !props.bankAccounts || !props.cashAccounts) {
        try {
          const [categoriesResponse, bankAccountsResponse, cashAccountsResponse] = await Promise.all([
            axios.get('/api/expense-categories'),
            axios.get('/api/bank-accounts'),
            axios.get('/api/cash-accounts')
          ]);
          
          setExpenseCategories(categoriesResponse.data || []);
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
  }, [props.expenseCategories, props.bankAccounts, props.cashAccounts]);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-24">
        <Loader className="w-6 h-6 animate-spin" />
      </div>
    );
  }
  
  return (
    <ExpenseFormDialog
      initialData={initialData}
      expenseCategories={expenseCategories}
      bankAccounts={bankAccounts}
      cashAccounts={cashAccounts}
      onSuccess={onSuccess}
      submitButtonText={submitButtonText}
    />
  );
};