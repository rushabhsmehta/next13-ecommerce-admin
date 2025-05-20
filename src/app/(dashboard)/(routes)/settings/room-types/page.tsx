import { format } from "date-fns";

import prismadb from "@/lib/prismadb";

import { RoomTypesClient } from "./components/client";

const RoomTypesPage = async () => {
  const roomTypes = await prismadb.roomType.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });

  const formattedRoomTypes = roomTypes.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description || '',
    isActive: item.isActive,
    createdAt: format(item.createdAt, 'MMMM d, yyyy'),
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <RoomTypesClient data={formattedRoomTypes} />
      </div>
    </div>
  );
};

export default RoomTypesPage;
