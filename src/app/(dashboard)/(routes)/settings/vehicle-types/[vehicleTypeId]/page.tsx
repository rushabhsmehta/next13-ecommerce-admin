import prismadb from "@/lib/prismadb";
import { VehicleTypeForm } from "../components/vehicle-type-form";

const VehicleTypePage = async (
  props: {
    params: Promise<{ vehicleTypeId: string }>
  }
) => {
  const params = await props.params;
  const vehicleType = await prismadb.vehicleType.findUnique({
    where: {
      id: params.vehicleTypeId
    }
  });

  return ( 
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <VehicleTypeForm initialData={vehicleType} />
      </div>
    </div>
  );
}

export default VehicleTypePage;
