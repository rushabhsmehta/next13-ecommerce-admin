"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-hot-toast";
import { ArrowLeft, FileText, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button"; // Added missing import
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { PaymentForm } from "../components/payment-form";

const PaymentEditPage = () => {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState(null);

  useEffect(() => {
    const fetchPaymentDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/payments/${params.paymentId}`);
        setPaymentData(response.data);
      } catch (error) {
        toast.error("Failed to load payment details");
        router.push('/payments');
      } finally {
        setLoading(false);
      }
    };

    if (params.paymentId) {
      fetchPaymentDetails();
    }
  }, [params.paymentId, router]);

  if (loading) {
    return <div className="flex-col p-8">Loading...</div>;
  }

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <Heading title="Payment Details" description="View payment information" />
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => router.push(`/payments/${params.paymentId}/edit`)}
            >
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </Button>
            <Button
              variant="secondary"
              onClick={() => router.push(`/payments/${params.paymentId}/voucher`)}
            >
              <FileText className="mr-2 h-4 w-4" /> Voucher
            </Button>
          </div>
        </div>
        <Separator />
        {paymentData && <PaymentForm initialData={paymentData} />}
      </div>
    </div>
  );
};

export default PaymentEditPage;
