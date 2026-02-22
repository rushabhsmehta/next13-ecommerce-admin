import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import SaleForm from "../components/sale-form";

interface SalePageProps {
  params: Promise<{ saleId: string }>;
}

export default async function SalePage(props: SalePageProps) {
  const params = await props.params;
  /*   const { userId } = await auth();

    if (!userId) {
      redirect("/sign-in");
    }
   */
  // Check if this is an "edit" or "new" page
  const isEdit = params.saleId !== "new";

  let sale = null;
  if (isEdit) {
    sale = await prismadb.saleDetail.findUnique({
      where: {
        id: params.saleId
      },
      include: {
        customer: true,
        tourPackageQuery: true,
        items: {
          include: {
            unitOfMeasure: true,
            taxSlab: true
          }
        }
      }
    });

    if (!sale) {
      redirect("/sales");
    }
  }

  // Get the data we need for the form
  const [taxSlabs, units, customers] = await Promise.all([
    prismadb.taxSlab.findMany({ where: { isActive: true } }),
    prismadb.unitOfMeasure.findMany({ where: { isActive: true } }),
    prismadb.customer.findMany()
  ]);

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <h2 className="text-3xl font-bold tracking-tight">
          {isEdit ? "Edit Sale" : "Create Sale"}
        </h2>
        <SaleForm
          initialData={sale}
          units = {units}
          taxSlabs={taxSlabs}
          customers={customers}
        />
      </div>
    </div>
  );
}
