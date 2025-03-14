"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-hot-toast";
import { ArrowLeft, FileText, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { SaleForm } from "../components/sale-form";

const SaleDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saleData, setSaleData] = useState(null);

  useEffect(() => {
    const fetchSaleDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/sales/${params.saleId}`);
        setSaleData(response.data);
      } catch (error) {
        toast.error("Failed to load sale details");
        router.push('/sales');
      } finally {
        setLoading(false);
      }
    };

    if (params.saleId) {
      fetchSaleDetails();
    }
  }, [params.saleId, router]);

  if (loading) {
    return <div className="flex-col p-8">Loading...</div>;
  }

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <Heading title="Sale Details" description="View sale information" />
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => router.push(`/sales/${params.saleId}/edit`)}
            >
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
            <Button
              variant="secondary"
              onClick={() => router.push(`/sales/${params.saleId}/voucher`)}
            >
              <FileText className="mr-2 h-4 w-4" /> Voucher
            </Button>
          </div>
        </div>
        <Separator />
        {saleData && <SaleForm initialData={saleData} />}
      </div>
    </div>
  );
};

export default SaleDetailPage;
