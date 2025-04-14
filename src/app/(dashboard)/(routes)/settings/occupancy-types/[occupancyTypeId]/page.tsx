import prismadb from "@/lib/prismadb";
import { OccupancyTypeForm } from "../components/occupancy-type-form";

const OccupancyTypePage = async ({
  params
}: {
  params: { occupancyTypeId: string }
}) => {
  const occupancyType = await prismadb.occupancyType.findUnique({
    where: {
      id: params.occupancyTypeId
    }
  });

  return ( 
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <OccupancyTypeForm initialData={occupancyType} />
      </div>
    </div>
  );
}

export default OccupancyTypePage;
