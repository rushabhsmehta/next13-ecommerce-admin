import prismadb from "@/lib/prismadb";
import { TaxSlabForm } from "../components/tax-slab-form";

const TaxSlabPage = async (
  props: {
    params: Promise<{ taxSlabId: string }>
  }
) => {
  const params = await props.params;
  const taxSlab = await prismadb.taxSlab.findUnique({
    where: {
      id: params.taxSlabId
    }
  });

  return ( 
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <TaxSlabForm initialData={taxSlab} />
      </div>
    </div>
  );
}

export default TaxSlabPage;
