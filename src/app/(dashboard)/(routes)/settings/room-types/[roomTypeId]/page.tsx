import prismadb from "@/lib/prismadb";
import { RoomTypeForm } from "../components/room-type-form";

const RoomTypePage = async (
  props: {
    params: Promise<{ roomTypeId: string }>
  }
) => {
  const params = await props.params;
  const roomType = await prismadb.roomType.findUnique({
    where: {
      id: params.roomTypeId
    }
  });

  return ( 
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <RoomTypeForm initialData={roomType} />
      </div>
    </div>
  );
}

export default RoomTypePage;
