import { Button } from "@/components/ui/button";
import { FormControl, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Plus, Trash } from "lucide-react";

// Room Allocation Component for mixed occupancy handling
const RoomAllocationComponent = ({ 
  itinerary, 
  index, 
  value, 
  onChange, 
  loading 
}: { 
  itinerary: any; 
  index: number; 
  value: any[]; 
  onChange: (value: any[]) => void; 
  loading: boolean;
}) => {
  // Initialize roomAllocations array if it doesn't exist
  const roomAllocations = itinerary.roomAllocations || [];

  const handleAddRoom = () => {
    const newRoomAllocations = [...roomAllocations, { 
      roomType: itinerary.roomType || 'Standard',
      occupancyType: 'Double', 
      quantity: 1,
      guestNames: ''
    }];
    
    const newItineraries = [...value];
    newItineraries[index] = { 
      ...itinerary, 
      roomAllocations: newRoomAllocations 
    };
    onChange(newItineraries);
  };
  const handleRemoveRoom = (roomIndex: number) => {
    const newRoomAllocations = roomAllocations.filter((_: any, i: number) => i !== roomIndex);
    
    const newItineraries = [...value];
    newItineraries[index] = { 
      ...itinerary, 
      roomAllocations: newRoomAllocations 
    };
    onChange(newItineraries);
  };

  const updateRoomDetails = (roomIndex: number, field: string, newValue: any) => {
    const newRoomAllocations = [...roomAllocations];
    newRoomAllocations[roomIndex] = {
      ...newRoomAllocations[roomIndex],
      [field]: field === 'quantity' ? parseInt(newValue) || 1 : newValue
    };
    
    const newItineraries = [...value];
    newItineraries[index] = { 
      ...itinerary, 
      roomAllocations: newRoomAllocations 
    };
    onChange(newItineraries);
  };

  return (
    <div className="space-y-3 border p-3 rounded-md">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Room Allocation (Mixed Occupancy)</h4>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={handleAddRoom}
          disabled={loading}
        >
          <Plus className="h-4 w-4 mr-1" /> Add Room
        </Button>
      </div>

      {roomAllocations.length === 0 ? (
        <p className="text-sm text-gray-500">No rooms allocated. Click &quot;Add Room&quot; to configure mixed occupancy rooms.</p>
      ) : (
        <div className="space-y-3">
          {roomAllocations.map((room: any, roomIndex: number) => (
            <div key={roomIndex} className="grid grid-cols-1 md:grid-cols-5 gap-2 py-2 border-b last:border-0">
              <div>
                <Select
                  disabled={loading}
                  value={room.roomType || ''}
                  onValueChange={(newValue) => updateRoomDetails(roomIndex, 'roomType', newValue)}
                >
                  <SelectTrigger>
                    {room.roomType || 'Select Room Type'}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Standard">Standard</SelectItem>
                    <SelectItem value="Deluxe">Deluxe</SelectItem>
                    <SelectItem value="Super Deluxe">Super Deluxe</SelectItem>
                    <SelectItem value="Premium">Premium</SelectItem>
                    <SelectItem value="Suite">Suite</SelectItem>
                    <SelectItem value="Executive Suite">Executive Suite</SelectItem>
                    <SelectItem value="Presidential Suite">Presidential Suite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Select
                  disabled={loading}
                  value={room.occupancyType || ''}
                  onValueChange={(newValue) => updateRoomDetails(roomIndex, 'occupancyType', newValue)}
                >
                  <SelectTrigger>
                    {room.occupancyType || 'Select Occupancy'}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Single">Single</SelectItem>
                    <SelectItem value="Double">Double</SelectItem>
                    <SelectItem value="Triple">Triple</SelectItem>
                    <SelectItem value="Child with Bed">Child with Bed</SelectItem>
                    <SelectItem value="Child without Bed">Child without Bed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Input
                  disabled={loading}
                  type="number"
                  min="1"
                  placeholder="Number of Rooms"
                  value={room.quantity}
                  onChange={(e) => updateRoomDetails(roomIndex, 'quantity', e.target.value)}
                />
              </div>
              
              <div>
                <Input
                  disabled={loading}
                  placeholder="Guest Names (optional)"
                  value={room.guestNames || ''}
                  onChange={(e) => updateRoomDetails(roomIndex, 'guestNames', e.target.value)}
                />
              </div>
              
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRemoveRoom(roomIndex)}
                  disabled={loading}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </div>          ))}
          
          <div className="text-sm text-blue-600">
            <p>Total Rooms: {roomAllocations.reduce((sum: number, room: any) => sum + (parseInt(room.quantity) || 0), 0)}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomAllocationComponent;
