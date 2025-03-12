"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-hot-toast";

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
        <Heading
          title="Edit Payment"
          description="Update an existing payment record"
        />
        <Separator />
        {paymentData && <PaymentForm initialData={paymentData} />}
      </div>
    </div>
  );
};

export default PaymentEditPage;
