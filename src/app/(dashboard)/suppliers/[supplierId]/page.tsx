import prismadb from "@/lib/prismadb";

// Replace LocationForm with SupplierForm import:
import { SupplierForm } from "./components/supplier-form";

const SupplierPage = async ({ params }: { params: { supplierId: string } }) => {
  const supplier = await prismadb.supplier.findUnique({
    where: { id: params.supplierId },
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
