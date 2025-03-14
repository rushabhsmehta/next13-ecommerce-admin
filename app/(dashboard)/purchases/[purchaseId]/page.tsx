"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-hot-toast";
import { ArrowLeft, FileText, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { PurchaseForm } from "../components/purchase-form";

const PurchaseDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [purchaseData, setPurchaseData] = useState(null);

  useEffect(() => {
    const fetchPurchaseDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/purchases/${params.purchaseId}`);
        setPurchaseData(response.data);
      } catch (error) {
        toast.error("Failed to load purchase details");
        router.push('/purchases');
      } finally {
        setLoading(false);
      }
    };

    if (params.purchaseId) {
      fetchPurchaseDetails();
    }
  }, [params.purchaseId, router]);

  if (loading) {
    return <div className="flex-col p-8">Loading...</div>;
  }

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <Heading title="Purchase Details" description="View purchase information" />
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => router.push(`/purchases/${params.purchaseId}/edit`)}
            >
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
            <Button
              variant="secondary"
              onClick={() => router.push(`/purchases/${params.purchaseId}/voucher`)}
            >
              <FileText className="mr-2 h-4 w-4" /> Voucher
            </Button>
          </div>
        </div>
        <Separator />
        {purchaseData && <PurchaseForm initialData={purchaseData} />}
      </div>
    </div>
  );
};

export default PurchaseDetailPage;
