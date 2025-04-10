import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface RoomAllocationComponentProps {
  itinerary: any;
  index: number;
  value: any[];
  onChange: (value: any[]) => void;
  loading: boolean;
}

// Component for handling multiple room allocations with different occupancy types
const RoomAllocationComponent: React.FC<RoomAllocationComponentProps> = ({
  itinerary,
  index,
  value,
  onChange,
  loading
}) => {
  // Initialize roomAllocations array if it doesn't exist
  const roomAllocations = itinerary.roomAllocations || [];
  const handleAddRoom = () => {
    const newRoomAllocations = [...roomAllocations, {
      roomType: itinerary.roomType || itinerary.roomCategory || 'Standard',
      occupancyType: 'Double',
      mealPlan: itinerary.mealPlan || 'CP (Breakfast Only)',
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

  const updateRoomAllocation = (roomIndex: number, field: string, newValue: any) => {
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
        <h4 className="text-sm font-semibold">Room Allocations</h4>
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
        <p className="text-sm text-gray-500">No room allocations added. Click &quot;Add Room&quot; to specify room requirements.</p>
      ) : (
        <div className="space-y-3">
          {roomAllocations.map((room: any, roomIndex: number) => (            <div key={roomIndex} className="grid grid-cols-1 md:grid-cols-5 gap-2 py-2 border-b last:border-0">
              <div>
                <Select
                  disabled={loading}
                  value={room.roomType || ''}
                  onValueChange={(newValue) => updateRoomAllocation(roomIndex, 'roomType', newValue)}
                >
                  <SelectTrigger>
                    {room.roomType || 'Room Type'}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Standard">Standard</SelectItem>
                    <SelectItem value="Deluxe">Deluxe</SelectItem>
                    <SelectItem value="Super Deluxe">Super Deluxe</SelectItem>
                    <SelectItem value="Premium">Premium</SelectItem>
                    <SelectItem value="Suite">Suite</SelectItem>
                    <SelectItem value="Executive Suite">Executive Suite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Select
                  disabled={loading}
                  value={room.occupancyType || ''}
                  onValueChange={(newValue) => updateRoomAllocation(roomIndex, 'occupancyType', newValue)}
                >
                  <SelectTrigger>
                    {room.occupancyType || 'Occupancy Type'}
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
                <Select
                  disabled={loading}
                  value={room.mealPlan || ''}
                  onValueChange={(newValue) => updateRoomAllocation(roomIndex, 'mealPlan', newValue)}
                >
                  <SelectTrigger>
                    {room.mealPlan || 'Meal Plan'}
                  </SelectTrigger>
                  <SelectContent>                    <SelectItem value="No Meal Plan">No Meal Plan</SelectItem>
                    <SelectItem value="CP (Breakfast Only)">CP (Breakfast Only)</SelectItem>
                    <SelectItem value="MAP (Breakfast + Dinner)">MAP (Breakfast + Dinner)</SelectItem>
                    <SelectItem value="AP (All Meals)">AP (All Meals)</SelectItem>
                    <SelectItem value="EP (European Plan - No Meals)">EP (European Plan - No Meals)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Input
                  disabled={loading}
                  type="number"
                  min="1"
                  placeholder="Quantity"
                  value={room.quantity}
                  onChange={(e) => updateRoomAllocation(roomIndex, 'quantity', e.target.value)}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Input
                  disabled={loading}
                  placeholder="Guest Names (optional)"
                  value={room.guestNames || ''}
                  onChange={(e) => updateRoomAllocation(roomIndex, 'guestNames', e.target.value)}
                  className="flex-1"
                />
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RoomAllocationComponent;
