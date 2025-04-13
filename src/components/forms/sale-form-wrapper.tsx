"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { SaleFormDialog } from "@/components/forms/sale-form-dialog";
import { Loader } from "lucide-react";
import { SaleFormProps } from "@/types/index";

interface SaleFormWrapperProps extends SaleFormProps {
  isModal?: boolean;
  redirectPath?: string;
}

export const SaleFormWrapper = ({
  initialData,
  onSuccess,
  submitButtonText = "Create",
  isModal = false,
  redirectPath,
  ...props
}: SaleFormWrapperProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [taxSlabs, setTaxSlabs] = useState(props.taxSlabs || []);
  const [units, setUnits] = useState(props.units || []);
  const [customers, setCustomers] = useState(props.customers || []);

  // Only fetch data if not provided as props
  useEffect(() => {
    const fetchData = async () => {
      if (!props.taxSlabs || !props.units || !props.customers) {
        try {
          const [taxSlabsResponse, unitsResponse, customersResponse] = await Promise.all([
            axios.get('/api/tax-slabs'),
            axios.get('/api/units'),
            axios.get('/api/customers')
          ]);

          setTaxSlabs(taxSlabsResponse.data || []);
          setUnits(unitsResponse.data || []);
          setCustomers(customersResponse.data || []);
        } catch (error) {
          toast.error("Failed to load data");
          console.error(error);
        }
      }
      setIsLoading(false);
    };

    fetchData();
  }, [props.taxSlabs, props.units, props.customers]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-24">
        <Loader className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <SaleFormDialog
      initialData={initialData}
      taxSlabs={taxSlabs}
      units={units}
      customers={customers}
      onSuccess={onSuccess}
      submitButtonText={submitButtonText}
    />
  );
};