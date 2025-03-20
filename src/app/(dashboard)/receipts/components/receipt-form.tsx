"use client";

import { ReceiptFormWrapper } from "@/components/forms/receipt-form-wrapper";
import { useRouter } from "next/navigation";
import { BankAccount, CashAccount,Customer } from "@prisma/client";

interface ReceiptFormProps {
  initialData: any;
  customers: Customer[];
  bankAccounts: BankAccount[];
  cashAccounts: CashAccount[];
}

export const ReceiptForm = ({ initialData, customers, bankAccounts, cashAccounts }: ReceiptFormProps) => {
  const router = useRouter();
  
  const onSuccess = () => {
    router.push("/receipts");
    router.refresh();
  };
  
  return (
    <ReceiptFormWrapper
      initialData={initialData}
      customers={customers}
      bankAccounts={bankAccounts}
      cashAccounts={cashAccounts}
      onSuccess={onSuccess}
      submitButtonText={initialData?.id ? "Update Receipt" : "Create Receipt"}
    />
  );
};

export default ReceiptForm;

