import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-hot-toast";
import { ArrowLeft, FileText, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button"; // Added missing import
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { PaymentForm } from "../components/payment-form";

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

interface PaymentPageProps {
  params: { paymentId: string };
}

export default async function PaymentPage({ params }: PaymentPageProps) {
/*   const { userId } = auth();

  if (!userId) {
    redirect("/sign-in");
  } */

  // Check if this is an "edit" or "new" page
  const isEdit = params.paymentId !== "new";

  let payment = null;
  if (isEdit) {
    payment = await prismadb.paymentDetail.findUnique({
      where: {
        id: params.paymentId
      }
    });

    if (!payment) {
      redirect("/payments");
    }
  }

  // Get the data we need for the form
  const [suppliers, bankAccounts, cashAccounts] = await Promise.all([
    prismadb.supplier.findMany(),
    prismadb.bankAccount.findMany({ where: { isActive: true } }),
    prismadb.cashAccount.findMany({ where: { isActive: true } })
  ]);

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <h2 className="text-3xl font-bold tracking-tight">
          {isEdit ? "Edit Payment" : "Create Payment"}
        </h2>
        <PaymentForm
          initialData={payment}
          suppliers={suppliers}
          bankAccounts={bankAccounts}
          cashAccounts={cashAccounts as any}
        />
      </div>
    </div>
  );
}
