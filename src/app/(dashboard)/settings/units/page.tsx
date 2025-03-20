import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { UnitClient } from "./components/client";
import { UnitColumn } from "./components/columns";

const UnitsPage = async () => {
  const units = await prismadb.unitOfMeasure.findMany({
    orderBy: {
      createdAt: 'desc'
    }
  });

  
  const formattedUnits: UnitColumn[] = units.map((item) => ({
    id: item.id,
    name: item.name,
    abbreviation: item.abbreviation,
    description: item.description || "",
    isActive: item.isActive,
    createdAt: format(item.createdAt, 'MMMM do, yyyy'),
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <UnitClient data={formattedUnits} />
      </div>
    </div>
  );
};

export default UnitsPage;

