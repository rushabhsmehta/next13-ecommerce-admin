import prismadb from "@/lib/prismadb";
import { TaxSlabForm } from "../components/tax-slab-form";

const TaxSlabPage = async ({
  params
}: {
  params: { taxSlabId: string }
}) => {
  const taxSlab = await prismadb.taxSlab.findUnique({
    where: {
      id: params.taxSlabId
    }
  });

  return ( 
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <TaxSlabForm initialData={taxSlab} />
      </div>
    </div>
  );
}

export default TaxSlabPage;
