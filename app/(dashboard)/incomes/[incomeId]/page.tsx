"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-hot-toast";

import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { IncomeForm } from "../components/income-form";

const IncomeEditPage = () => {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [incomeData, setIncomeData] = useState(null);

  useEffect(() => {
    const fetchIncomeDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/incomes/${params.incomeId}`);
        setIncomeData(response.data);
      } catch (error) {
        toast.error("Failed to load income details");
        router.push('/incomes');
      } finally {
        setLoading(false);
      }
    };

    if (params.incomeId) {
      fetchIncomeDetails();
    }
  }, [params.incomeId, router]);

  if (loading) {
    return <div className="flex-col p-8">Loading...</div>;
  }

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Heading
          title="Edit Income"
          description="Update an existing income record"
        />
        <Separator />
        {incomeData && <IncomeForm initialData={incomeData} />}
      </div>
    </div>
  );
};

export default IncomeEditPage;
