"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-hot-toast";

import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { TransferForm } from "../components/transfer-form";
import { Skeleton } from "@/components/ui/skeleton";

const TransferEditPage = () => {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [transferData, setTransferData] = useState(null);

  useEffect(() => {
    const fetchTransferDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/transfers/${params.transferId}`);
        setTransferData(response.data);
      } catch (error) {
        toast.error("Failed to load transfer details");
        router.push('/transfers');
      } finally {
        setLoading(false);
      }
    };

    if (params.transferId) {
      fetchTransferDetails();
    }
  }, [params.transferId, router]);

  if (loading) {
    return (
      <div className="flex-col p-8 space-y-4">
        <Skeleton className="h-10 w-1/4" />
        <Separator />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Heading
          title="Edit Fund Transfer"
          description="Update an existing fund transfer record"
        />
        <Separator />
        {transferData && <TransferForm initialData={transferData} />}
      </div>
    </div>
  );
};

export default TransferEditPage;
