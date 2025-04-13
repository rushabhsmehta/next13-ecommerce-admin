"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { PurchaseFormDialog } from "@/components/forms/purchase-form-dialog"; // Updated path
import { Loader } from "lucide-react";
import { PurchaseFormProps } from "@/types/index"; // Fixed import path

interface PurchaseFormWrapperProps {
  initialData?: any;
  tourPackageQueryId?: string;
  taxSlabs?: any[];
  units?: any[];
  suppliers?: any[];
  onSuccess: () => void;
  submitButtonText?: string;
  isModal?: boolean;
  redirectPath?: string;
}

export const PurchaseFormWrapper = ({
  initialData,
  onSuccess,
  submitButtonText = "Create",
  isModal = false,
  redirectPath,
  ...props
}: PurchaseFormWrapperProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [taxSlabs, setTaxSlabs] = useState(props.taxSlabs || []);
  const [units, setUnits] = useState(props.units || []);
  const [suppliers, setSuppliers] = useState(props.suppliers || []);
  
  // Only fetch data if not provided as props
  useEffect(() => {
    const fetchData = async () => {
      if (!props.taxSlabs || !props.units || !props.suppliers) {
        try {
          const [taxSlabsResponse, unitsResponse, suppliersResponse] = await Promise.all([
            axios.get('/api/tax-slabs'),
            axios.get('/api/units'),
            axios.get('/api/suppliers')
          ]);
          
          setTaxSlabs(taxSlabsResponse.data || []);
          setUnits(unitsResponse.data || []);
          setSuppliers(suppliersResponse.data || []);
        } catch (error) {
          toast.error("Failed to load data");
          console.error(error);
        }
      }
      setIsLoading(false);
    };
    
    fetchData();
  }, [props.taxSlabs, props.units, props.suppliers]);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-24">
        <Loader className="w-6 h-6 animate-spin" />
      </div>
    );
  }
  
  return (
    <PurchaseFormDialog
      initialData={initialData}
      taxSlabs={taxSlabs}
      units={units}
      suppliers={suppliers}
      onSuccess={onSuccess}
      submitButtonText={submitButtonText}
    />
  );
};

