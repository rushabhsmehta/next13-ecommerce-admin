import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { PaymentForm } from "../components/payment-form";

interface PaymentPageProps {
  params: Promise<{ paymentId: string }>;
}

export default async function PaymentPage(props: PaymentPageProps) {
  const params = await props.params;
  /*   const { userId } = await auth();

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
  const [suppliers, customers, bankAccounts, cashAccounts] = await Promise.all([
    prismadb.supplier.findMany(),
    prismadb.customer.findMany(),
    prismadb.bankAccount.findMany({ where: { isActive: true } }),
    prismadb.cashAccount.findMany({ where: { isActive: true } })
  ]);

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <h1 className="text-3xl font-bold tracking-tight">
          {isEdit ? "Edit Payment" : "Create Payment"}
        </h1>
        <PaymentForm
          initialData={payment}
          suppliers={suppliers}
          customers={customers}
          bankAccounts={bankAccounts}
          cashAccounts={cashAccounts as any}
        />
      </div>
    </div>
  );
}
