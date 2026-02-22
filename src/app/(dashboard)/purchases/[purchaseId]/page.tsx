import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import PurchaseForm from "../components/purchase-form";

interface PurchasePageProps {
  params: Promise<{ purchaseId: string }>;
}

export default async function PurchasePage(props: PurchasePageProps) {
  const params = await props.params;
  /*  const { userId } = await auth();

   if (!userId) {
     redirect("/sign-in");
   } */

  // Check if this is an "edit" or "new" page
  const isEdit = params.purchaseId !== "new";

  let purchase = null;
  if (isEdit) {
    purchase = await prismadb.purchaseDetail.findUnique({
      where: {
        id: params.purchaseId
      },
      include: {
        items: true
      }
    });

    if (!purchase) {
      redirect("/purchases");
    }
  }

  // Get the data we need for the form
  const [taxSlabs, units, suppliers] = await Promise.all([
    prismadb.taxSlab.findMany({ where: { isActive: true } }),
    prismadb.unitOfMeasure.findMany({ where: { isActive: true } }),
    prismadb.supplier.findMany()
  ]);

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <h2 className="text-3xl font-bold tracking-tight">
          {isEdit ? "Edit Purchase" : "Create Purchase"}
        </h2>
        <PurchaseForm
          initialData={purchase}
          taxSlabs={taxSlabs}
          units={units}
          suppliers={suppliers}
        />
      </div>
    </div>
  );
}
