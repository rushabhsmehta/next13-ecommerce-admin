"use client";

import { SaleFormWrapper } from "@/components/forms/sale-form-wrapper";
import { useRouter } from "next/navigation";
import { Customer, SaleDetail, TaxSlab, UnitOfMeasure } from "@prisma/client";

interface SaleFormProps {
  initialData: SaleDetail | null; // Make initialData accept null
  units: UnitOfMeasure[];
  taxSlabs: TaxSlab[];
  customers: Customer[];
}

export const SaleForm = ({ initialData, units, taxSlabs, customers }: SaleFormProps) => {
  const router = useRouter();
  
  const onSuccess = () => {
    router.push("/sales/ledger");
    router.refresh();
  };
  
  return (
    <SaleFormWrapper
      initialData={initialData}
      units={units}
      taxSlabs={taxSlabs}
      customers={customers}
      onSuccess={onSuccess}
      submitButtonText={initialData?.id ? "Update Sale" : "Create Sale"}
    />
  );
};

export default SaleForm;

