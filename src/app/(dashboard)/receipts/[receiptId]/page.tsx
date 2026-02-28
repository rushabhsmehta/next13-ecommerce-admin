import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import ReceiptForm from "../components/receipt-form";

interface ReceiptPageProps {
  params: Promise<{ receiptId: string }>;
}

export default async function ReceiptPage(props: ReceiptPageProps) {
  const params = await props.params;
  /*   const { userId } = await auth();

    if (!userId) {
      redirect("/sign-in");
    } */

  // Check if this is an "edit" or "new" page
  const isEdit = params.receiptId !== "new";

  let receipt = null;
  if (isEdit) {
    receipt = await prismadb.receiptDetail.findUnique({
      where: {
        id: params.receiptId
      }
    });

    if (!receipt) {
      redirect("/receipts");
    }
  }

  // Get the data we need for the form
  const [customers, suppliers, bankAccounts, cashAccounts] = await Promise.all([
    prismadb.customer.findMany(),
    prismadb.supplier.findMany(),
    prismadb.bankAccount.findMany({ where: { isActive: true } }),
    prismadb.cashAccount.findMany({ where: { isActive: true } })
  ]);

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <h1 className="text-3xl font-bold tracking-tight">
          {isEdit ? "Edit Receipt" : "Create Receipt"}
        </h1>
        <ReceiptForm
          initialData={receipt}
          customers={customers}
          suppliers={suppliers}
          bankAccounts={bankAccounts}
          cashAccounts={cashAccounts as any}
        />
      </div>
    </div>
  );
}
