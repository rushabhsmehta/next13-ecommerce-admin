"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { ReceiptFormDialog } from "@/components/forms/receipt-form-dialog"; // Updated path
import { Loader } from "lucide-react";
import { ReceiptFormProps } from "@/types";

interface ReceiptFormWrapperProps extends ReceiptFormProps {
  isModal?: boolean;
  redirectPath?: string;
}

export const ReceiptFormWrapper = ({
  initialData,
  onSuccess,
  submitButtonText = "Create",
  isModal = false,
  redirectPath,
  ...props
}: ReceiptFormWrapperProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [customers, setCustomers] = useState(props.customers || []);
  const [bankAccounts, setBankAccounts] = useState(props.bankAccounts || []);
  const [cashAccounts, setCashAccounts] = useState(props.cashAccounts || []);
  const [confirmedTourPackageQueries, setConfirmedTourPackageQueries] = useState([]);
  
  // Only fetch data if not provided as props
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch core data if not provided in props
        if (!props.customers || !props.bankAccounts || !props.cashAccounts) {
          const [customersResponse, bankAccountsResponse, cashAccountsResponse] = await Promise.all([
            axios.get('/api/customers'),
            axios.get('/api/bank-accounts'),
            axios.get('/api/cash-accounts')
          ]);
          
          setCustomers(customersResponse.data || []);
          setBankAccounts(bankAccountsResponse.data || []);
          setCashAccounts(cashAccountsResponse.data || []);
        }
        
        // Always fetch confirmed tour package queries
        const tourPackageQueriesResponse = await axios.get('/api/tourPackageQuery?isFeatured=true');
        setConfirmedTourPackageQueries(tourPackageQueriesResponse.data || []);
      } catch (error) {
        toast.error("Failed to load data");
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [props.customers, props.bankAccounts, props.cashAccounts]);
    if (isLoading) {
    return (
      <div className="flex justify-center items-center h-24">
        <Loader className="w-6 h-6 animate-spin" />
      </div>
    );
  }
  
  return (
    <ReceiptFormDialog
      initialData={{
        ...initialData,
        confirmedTourPackageQueries: confirmedTourPackageQueries
      }}
      customers={customers}
      bankAccounts={bankAccounts}
      cashAccounts={cashAccounts}
      onSuccess={onSuccess}
      submitButtonText={submitButtonText}
    />
  );
};