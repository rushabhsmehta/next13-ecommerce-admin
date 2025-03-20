"use client";

import { PaymentFormWrapper } from "@/components/forms/payment-form-wrapper";
import { useRouter } from "next/navigation";
import { BankAccount, CashAccount, Supplier } from "@prisma/client";

interface PaymentFormProps {
  initialData: any;
  suppliers: Supplier[];
  bankAccounts: BankAccount[];
  cashAccounts: CashAccount[];
}

export const PaymentForm = ({ initialData, suppliers, bankAccounts, cashAccounts }: PaymentFormProps) => {
  const router = useRouter();
  
  const onSuccess = () => {
    router.push("/payments");
    router.refresh();
  };
  
  return (
    <PaymentFormWrapper
      initialData={initialData}
      suppliers={suppliers}
      bankAccounts={bankAccounts}
      cashAccounts={cashAccounts}
      onSuccess={onSuccess}
      submitButtonText={initialData?.id ? "Update Payment" : "Create Payment"}
    />
  );
};

export default PaymentForm;

