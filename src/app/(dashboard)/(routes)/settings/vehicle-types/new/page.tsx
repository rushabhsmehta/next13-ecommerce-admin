import { VehicleTypeForm } from "../components/vehicle-type-form";

const NewVehicleTypePage = () => {
  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <VehicleTypeForm initialData={null} />
      </div>
    </div>
  );
};

export default NewVehicleTypePage;
