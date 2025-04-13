"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { PaymentFormDialog } from "@/components/forms/payment-form-dialog"; // Updated path
import { Loader } from "lucide-react";
import { PaymentFormProps } from "@/types/index"; // Fixed import path

interface PaymentFormWrapperProps {
  initialData?: any;
  tourPackageQueryId?: string; // Explicitly include tourPackageQueryId
  suppliers?: any[];
  bankAccounts?: any[];
  cashAccounts?: any[];
  onSuccess: () => void;
  submitButtonText?: string;
  isModal?: boolean;
  redirectPath?: string;
}

export const PaymentFormWrapper = ({
  initialData,
  onSuccess,
  submitButtonText = "Create",
  isModal = false,
  redirectPath,
  ...props
}: PaymentFormWrapperProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [suppliers, setSuppliers] = useState(props.suppliers || []);
  const [bankAccounts, setBankAccounts] = useState(props.bankAccounts || []);
  const [cashAccounts, setCashAccounts] = useState(props.cashAccounts || []);
  
  // Only fetch data if not provided as props
  useEffect(() => {
    const fetchData = async () => {
      if (!props.suppliers || !props.bankAccounts || !props.cashAccounts) {
        try {
          const [suppliersResponse, bankAccountsResponse, cashAccountsResponse] = await Promise.all([
            axios.get('/api/suppliers'),
            axios.get('/api/bank-accounts'),
            axios.get('/api/cash-accounts')
          ]);
          
          setSuppliers(suppliersResponse.data || []);
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
  }, [props.suppliers, props.bankAccounts, props.cashAccounts]);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-24">
        <Loader className="w-6 h-6 animate-spin" />
      </div>
    );
  }
  
  return (
    <PaymentFormDialog
      initialData={initialData}
      suppliers={suppliers}
      bankAccounts={bankAccounts}
      cashAccounts={cashAccounts}
      onSuccess={onSuccess}
      submitButtonText={submitButtonText}
    />
  );
};

