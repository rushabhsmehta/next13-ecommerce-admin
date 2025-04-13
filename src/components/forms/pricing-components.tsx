import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RoomAllocation } from '@prisma/client';

// ===== Room Allocation Component =====
interface RoomAllocationComponentProps {
  itinerary: any;
  index: number;
  value: any[];
  onChange: (value: any[]) => void;
  loading: boolean;
}

export const RoomAllocationComponent: React.FC<RoomAllocationComponentProps> = ({
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
    
    // Update the itinerary at the specific index with the new room allocations
    const newItineraries = [...value];
    newItineraries[index] = {
      ...itinerary,
      roomAllocations: newRoomAllocations
    };
    
    onChange(newItineraries);
  };

  const handleUpdateRoom = (roomIndex: number, field: string, newValue: any) => {
    const newRoomAllocations = [...roomAllocations];
    newRoomAllocations[roomIndex] = {
      ...newRoomAllocations[roomIndex],
      [field]: newValue
    };
    
    // Update the itinerary at the specific index with the updated room allocation
    const newItineraries = [...value];
    newItineraries[index] = {
      ...itinerary,
      roomAllocations: newRoomAllocations
    };
    
    onChange(newItineraries);
  };

  const handleRemoveRoom = (roomIndex: number) => {
    const newRoomAllocations: RoomAllocation[] = roomAllocations.filter(( i: number) => i !== roomIndex);
    
    // Update the itinerary at the specific index with the filtered room allocations
    const newItineraries = [...value];
    newItineraries[index] = {
      ...itinerary,
      roomAllocations: newRoomAllocations
    };
    
    onChange(newItineraries);
  };

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-sm">Room Allocations</h4>
      
      {roomAllocations.map((room: any, roomIndex: number) => (
        <div key={roomIndex} className="grid grid-cols-5 gap-2 items-end">
          <div>
            <label className="text-xs">Room Type</label>
            <Select
              disabled={loading}
              value={room.roomType}
              onValueChange={(newValue) => handleUpdateRoom(roomIndex, 'roomType', newValue)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Room Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Standard">Standard</SelectItem>
                <SelectItem value="Deluxe">Deluxe</SelectItem>
                <SelectItem value="Super Deluxe">Super Deluxe</SelectItem>
                <SelectItem value="Semi Deluxe">Semi Deluxe</SelectItem>
                <SelectItem value="Premium">Premium</SelectItem>
                <SelectItem value="Executive">Executive</SelectItem>
                <SelectItem value="Suite">Suite</SelectItem>
                <SelectItem value="Family Suite">Family Suite</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-xs">Occupancy</label>
            <Select
              disabled={loading}
              value={room.occupancyType}
              onValueChange={(newValue) => handleUpdateRoom(roomIndex, 'occupancyType', newValue)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Occupancy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Single">Single</SelectItem>
                <SelectItem value="Double">Double</SelectItem>
                <SelectItem value="Triple">Triple</SelectItem>
                <SelectItem value="Quad">Quad</SelectItem>
                <SelectItem value="Child with Bed">Child with Bed</SelectItem>
                <SelectItem value="Child without Bed">Child without Bed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-xs">Meal Plan</label>
            <Select
              disabled={loading}
              value={room.mealPlan}
              onValueChange={(newValue) => handleUpdateRoom(roomIndex, 'mealPlan', newValue)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Meal Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CP (Breakfast Only)">CP (Breakfast Only)</SelectItem>
                <SelectItem value="MAP (Breakfast + Dinner)">MAP (Breakfast + Dinner)</SelectItem>
                <SelectItem value="AP (All Meals)">AP (All Meals)</SelectItem>
                <SelectItem value="EP (No Meals)">EP (No Meals)</SelectItem>
                <SelectItem value="AI (All Inclusive)">AI (All Inclusive)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-xs">Quantity</label>
            <Input
              disabled={loading}
              type="number"
              min={1}
              value={room.quantity}
              onChange={(e) => handleUpdateRoom(roomIndex, 'quantity', e.target.value)}
            />
          </div>
          
          <Button
            type="button"
            variant="destructive"
            size="icon"
            disabled={loading || roomAllocations.length <= 1}
            onClick={() => handleRemoveRoom(roomIndex)}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      ))}
      
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2"
        disabled={loading}
        onClick={handleAddRoom}
      >
        <Plus className="mr-1 h-4 w-4" />
        Add Room
      </Button>
    </div>
  );
};

// ===== Transport Details Component =====
interface TransportDetailsComponentProps {
  itinerary: any;
  index: number;
  value: any[];
  onChange: (value: any[]) => void;
  loading: boolean;
}

export const TransportDetailsComponent: React.FC<TransportDetailsComponentProps> = ({
  itinerary,
  index,
  value,
  onChange,
  loading
}) => {
  // Initialize transportDetails array if it doesn't exist
  const transportDetails = itinerary.transportDetails || [];
  
  const handleAddTransport = () => {
    const newTransportDetails = [...transportDetails, {
      vehicleType: 'Sedan',
      transportType: 'PerDay',
      quantity: 1,
      description: ''
    }];
    
    // Update the itinerary at the specific index with the new transport details
    const newItineraries = [...value];
    newItineraries[index] = {
      ...itinerary,
      transportDetails: newTransportDetails
    };
    
    onChange(newItineraries);
  };
  
  const handleUpdateTransport = (transportIndex: number, field: string, newValue: any) => {
    const newTransportDetails = [...transportDetails];
    newTransportDetails[transportIndex] = {
      ...newTransportDetails[transportIndex],
      [field]: newValue
    };
    
    // Update the itinerary at the specific index with the updated transport details
    const newItineraries = [...value];
    newItineraries[index] = {
      ...itinerary,
      transportDetails: newTransportDetails
    };
    
    onChange(newItineraries);
  };
  
  const handleRemoveTransport = (transportIndex: number) => {
    const newTransportDetails = transportDetails.filter((i: number) => i !== transportIndex);
    
    // Update the itinerary at the specific index with the filtered transport details
    const newItineraries = [...value];
    newItineraries[index] = {
      ...itinerary,
      transportDetails: newTransportDetails
    };
    
    onChange(newItineraries);
  };
  
  return (
    <div className="space-y-4">
      <h4 className="font-medium text-sm">Transport Details</h4>
      
      {transportDetails.map((transport: any, transportIndex: number) => (
        <div key={transportIndex} className="grid grid-cols-5 gap-2 items-end">
          <div>
            <label className="text-xs">Vehicle Type</label>
            <Select
              disabled={loading}
              value={transport.vehicleType}
              onValueChange={(newValue) => handleUpdateTransport(transportIndex, 'vehicleType', newValue)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Vehicle Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Sedan">Sedan</SelectItem>
                <SelectItem value="SUV">SUV</SelectItem>
                <SelectItem value="Tempo Traveller">Tempo Traveller</SelectItem>
                <SelectItem value="Luxury Sedan">Luxury Sedan</SelectItem>
                <SelectItem value="Luxury SUV">Luxury SUV</SelectItem>
                <SelectItem value="Mini Bus">Mini Bus</SelectItem>
                <SelectItem value="Bus">Bus</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-xs">Transport Type</label>
            <Select
              disabled={loading}
              value={transport.transportType}
              onValueChange={(newValue) => handleUpdateTransport(transportIndex, 'transportType', newValue)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Transport Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PerDay">Per Day</SelectItem>
                <SelectItem value="PointToPoint">Point to Point</SelectItem>
                <SelectItem value="Airport">Airport Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-xs">Quantity</label>
            <Input
              disabled={loading}
              type="number"
              min={1}
              value={transport.quantity}
              onChange={(e) => handleUpdateTransport(transportIndex, 'quantity', e.target.value)}
            />
          </div>
          
          <div>
            <label className="text-xs">Description (Optional)</label>
            <Input
              disabled={loading}
              value={transport.description || ''}
              onChange={(e) => handleUpdateTransport(transportIndex, 'description', e.target.value)}
              placeholder="e.g. Airport to Hotel"
            />
          </div>
          
          <Button
            type="button"
            variant="destructive"
            size="icon"
            disabled={loading}
            onClick={() => handleRemoveTransport(transportIndex)}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      ))}
      
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2"
        disabled={loading}
        onClick={handleAddTransport}
      >
        <Plus className="mr-1 h-4 w-4" />
        Add Transport
      </Button>
    </div>
  );
};