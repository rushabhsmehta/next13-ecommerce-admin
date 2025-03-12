"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-hot-toast";

import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { ReceiptForm } from "../components/receipt-form";

const ReceiptEditPage = () => {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [receiptData, setReceiptData] = useState(null);

  useEffect(() => {
    const fetchReceiptDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/receipts/${params.receiptId}`);
        setReceiptData(response.data);
      } catch (error) {
        toast.error("Failed to load receipt details");
        router.push('/receipts');
      } finally {
        setLoading(false);
      }
    };

    if (params.receiptId) {
      fetchReceiptDetails();
    }
  }, [params.receiptId, router]);

  if (loading) {
    return <div className="flex-col p-8">Loading...</div>;
  }

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Heading
          title="Edit Receipt"
          description="Update an existing receipt record"
        />
        <Separator />
        {receiptData && <ReceiptForm initialData={receiptData} />}
      </div>
    </div>
  );
};

export default ReceiptEditPage;
