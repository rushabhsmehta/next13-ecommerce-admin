import prismadb from "@/lib/prismadb";
import { RoomTypeForm } from "../components/room-type-form";

const RoomTypePage = async ({
  params
}: {
  params: { roomTypeId: string }
}) => {
  const roomType = await prismadb.roomType.findUnique({
    where: {
      id: params.roomTypeId
    }
  });

  return ( 
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <RoomTypeForm initialData={roomType} />
      </div>
    </div>
  );
}

export default RoomTypePage;
