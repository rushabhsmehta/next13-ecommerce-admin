import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import ReceiptForm from "../components/receipt-form";

interface ReceiptPageProps {
  params: { receiptId: string };
}

export default async function ReceiptPage({ params }: ReceiptPageProps) {
/*   const { userId } = auth();

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
      <div className="flex-1 space-y-4 p-8 pt-6">
        <h2 className="text-3xl font-bold tracking-tight">
          {isEdit ? "Edit Receipt" : "Create Receipt"}
        </h2>
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
