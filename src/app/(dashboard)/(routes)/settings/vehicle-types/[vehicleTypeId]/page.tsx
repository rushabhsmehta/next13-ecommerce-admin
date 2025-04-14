import prismadb from "@/lib/prismadb";
import { VehicleTypeForm } from "../components/vehicle-type-form";

const VehicleTypePage = async ({
  params
}: {
  params: { vehicleTypeId: string }
}) => {
  const vehicleType = await prismadb.vehicleType.findUnique({
    where: {
      id: params.vehicleTypeId
    }
  });

  return ( 
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <VehicleTypeForm initialData={vehicleType} />
      </div>
    </div>
  );
}

export default VehicleTypePage;
