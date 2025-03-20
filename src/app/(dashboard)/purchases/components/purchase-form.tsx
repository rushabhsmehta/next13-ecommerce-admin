"use client";

import { PurchaseFormWrapper } from "@/components/forms/purchase-form-wrapper";
import { useRouter } from "next/navigation";
import { Supplier, TaxSlab, UnitOfMeasure } from "@prisma/client";

interface PurchaseFormProps {
  initialData: any;
  taxSlabs: TaxSlab[];
  units: UnitOfMeasure[];
  suppliers: Supplier[];
}

export const PurchaseForm = ({ initialData, taxSlabs, units, suppliers }: PurchaseFormProps) => {
  const router = useRouter();
  
  const onSuccess = () => {
    router.push("/purchases");
    router.refresh();
  };
  
  return (
    <PurchaseFormWrapper
      initialData={initialData}
      taxSlabs={taxSlabs}
      units={units}
      suppliers={suppliers}
      onSuccess={onSuccess}
      submitButtonText={initialData?.id ? "Update Purchase" : "Create Purchase"}
    />
  );
};

export default PurchaseForm;
