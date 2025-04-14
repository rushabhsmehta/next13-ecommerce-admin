import { OccupancyTypeForm } from "../components/occupancy-type-form";

const NewOccupancyTypePage = () => {
  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <OccupancyTypeForm initialData={null} />
      </div>
    </div>
  );
};

export default NewOccupancyTypePage;
