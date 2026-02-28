import { RoomTypeForm } from "../components/room-type-form";

const NewRoomTypePage = () => {
  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <RoomTypeForm initialData={null} />
      </div>
    </div>
  );
};

export default NewRoomTypePage;
