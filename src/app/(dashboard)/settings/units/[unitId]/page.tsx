import prismadb from "@/lib/prismadb";
import { UnitForm } from "../components/unit-form";

const UnitPage = async (
  props: {
    params: Promise<{ unitId: string }>
  }
) => {
  const params = await props.params;
  const unit = await prismadb.unitOfMeasure.findUnique({
    where: {
      id: params.unitId
    }
  });

  return ( 
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <UnitForm initialData={unit} />
      </div>
    </div>
  );
}

export default UnitPage;
