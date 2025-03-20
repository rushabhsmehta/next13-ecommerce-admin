import prismadb from "@/lib/prismadb";
import { SupplierForm } from "./components/supplier-form";

const SupplierPage = async ({ params }: { params: { supplierId: string } }) => {
  // Update the query to include the supplier's locations
  const supplier = await prismadb.supplier.findUnique({
    where: { id: params.supplierId },
    include: {
      locations: {
        include: {
          location: {
            select: {
              id: true,
              label: true
            }
          }
        }
      }
    }
  });

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <SupplierForm initialData={supplier} />
      </div>
    </div>
  );
};

export default SupplierPage;
