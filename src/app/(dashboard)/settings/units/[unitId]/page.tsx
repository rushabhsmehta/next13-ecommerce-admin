import prismadb from "@/lib/prismadb";
import { UnitForm } from "../components/unit-form";

const UnitPage = async ({
  params
}: {
  params: { unitId: string }
}) => {
  const unit = await prismadb.unitOfMeasure.findUnique({
    where: {
      id: params.unitId
    }
  });

  return ( 
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <UnitForm initialData={unit} />
      </div>
    </div>
  );
}

export default UnitPage;
