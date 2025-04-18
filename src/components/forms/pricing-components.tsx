import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  RoomAllocation, 
  TransportDetail, 
  RoomType, 
  OccupancyType, 
  MealPlan, 
  VehicleType 
} from '@prisma/client';

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
  // State for configuration options - using Prisma models directly
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [occupancyTypes, setOccupancyTypes] = useState<OccupancyType[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch configuration options on component mount
  useEffect(() => {
    const fetchConfigOptions = async () => {
      setIsLoading(true);
      try {
        // Fetch all configuration options in parallel from existing API endpoints
        const [roomTypesRes, occupancyTypesRes, mealPlansRes] = await Promise.all([
          axios.get('/api/room-types'),
          axios.get('/api/occupancy-types'),
          axios.get('/api/meal-plans')
        ]);
        
        setRoomTypes(roomTypesRes.data);
        setOccupancyTypes(occupancyTypesRes.data);
        setMealPlans(mealPlansRes.data);
      } catch (error) {
        console.error('Error fetching configuration options:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchConfigOptions();
  }, []);
  
  // Initialize roomAllocations array if it doesn't exist
  const roomAllocations = itinerary.roomAllocations || [];
  
  const handleAddRoom = () => {
    const newRoomAllocations = [...roomAllocations, {
      roomTypeId: roomTypes.length > 0 ? roomTypes[0].id : '',
      occupancyTypeId: occupancyTypes.length > 0 ? occupancyTypes[0].id : '',
      mealPlanId: mealPlans.length > 0 ? mealPlans[0].id : '',
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
    const newRoomAllocations = roomAllocations.filter((_: any, i: number) => i !== roomIndex);
    
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
      
      {isLoading ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>      {roomAllocations.map((room: any, roomIndex: number) => (
            <div key={roomIndex} className="border rounded-lg p-3 bg-white shadow-sm mb-3">
              <div className="flex items-center justify-between mb-2 pb-2 border-b">
                <h4 className="text-sm font-medium">Room Details</h4>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={loading || roomAllocations.length <= 1}
                  onClick={() => handleRemoveRoom(roomIndex)}
                  className="h-8 px-2"
                >
                  <Trash className="h-4 w-4 mr-1" /> Remove
                </Button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Room Type</label>
                  <Select
                    disabled={loading}
                    value={room.roomTypeId}
                    onValueChange={(newValue) => handleUpdateRoom(roomIndex, 'roomTypeId', newValue)}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Room Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {roomTypes.map((roomType) => (
                        <SelectItem key={roomType.id} value={roomType.id}>
                          {roomType.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-xs font-medium mb-1 block">Occupancy</label>
                  <Select
                    disabled={loading}
                    value={room.occupancyTypeId}
                    onValueChange={(newValue) => handleUpdateRoom(roomIndex, 'occupancyTypeId', newValue)}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Occupancy" />
                    </SelectTrigger>
                    <SelectContent>
                      {occupancyTypes.map((occupancyType) => (
                        <SelectItem key={occupancyType.id} value={occupancyType.id}>
                          {occupancyType.name} ({occupancyType.maxPersons} person{occupancyType.maxPersons > 1 ? 's' : ''})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-xs font-medium mb-1 block">Meal Plan</label>
                  <Select
                    disabled={loading}
                    value={room.mealPlanId}
                    onValueChange={(newValue) => handleUpdateRoom(roomIndex, 'mealPlanId', newValue)}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Meal Plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {mealPlans.map((mealPlan) => (
                        <SelectItem key={mealPlan.id} value={mealPlan.id}>
                          {mealPlan.code} ({mealPlan.description})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-xs font-medium mb-1 block">Quantity</label>
                  <Input
                    disabled={loading}
                    type="number"
                    min={1}
                    value={room.quantity}
                    onChange={(e) => handleUpdateRoom(roomIndex, 'quantity', e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
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
        </>
      )}
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
  // State for vehicle types - using Prisma model directly
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch vehicle types on component mount
  useEffect(() => {
    const fetchVehicleTypes = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get('/api/vehicle-types');
        setVehicleTypes(response.data);
      } catch (error) {
        console.error('Error fetching vehicle types:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchVehicleTypes();
  }, []);
  
  // Initialize transportDetails array if it doesn't exist
  const transportDetails = itinerary.transportDetails || [];
  
  const handleAddTransport = () => {
    const newTransportDetails = [...transportDetails, {
      vehicleTypeId: vehicleTypes.length > 0 ? vehicleTypes[0].id : '',
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
    const newTransportDetails = transportDetails.filter((_: any, i: number) => i !== transportIndex);
    
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
      
      {isLoading ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>          {transportDetails.map((transport: any, transportIndex: number) => (
            <div key={transportIndex} className="border rounded-lg p-3 bg-white shadow-sm mb-3">
              <div className="flex items-center justify-between mb-2 pb-2 border-b">
                <h4 className="text-sm font-medium">Transport #{transportIndex + 1}</h4>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={loading}
                  onClick={() => handleRemoveTransport(transportIndex)}
                  className="h-8 px-2"
                >
                  <Trash className="h-4 w-4 mr-1" /> Remove
                </Button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Vehicle Type</label>
                  <Select
                    disabled={loading}
                    value={transport.vehicleTypeId}
                    onValueChange={(newValue) => handleUpdateTransport(transportIndex, 'vehicleTypeId', newValue)}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Vehicle Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicleTypes.map((vehicleType) => (
                        <SelectItem key={vehicleType.id} value={vehicleType.id}>
                          {vehicleType.name} (Capacity: {vehicleType.capacity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-xs font-medium mb-1 block">Transport Type</label>
                  <Select
                    disabled={loading}
                    value={transport.transportType}
                    onValueChange={(newValue) => handleUpdateTransport(transportIndex, 'transportType', newValue)}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Transport Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PerDay">Per Day</SelectItem>
                      <SelectItem value="PerTrip">Per Trip</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-xs font-medium mb-1 block">Quantity</label>
                  <Input
                    disabled={loading}
                    type="number"
                    min={1}
                    value={transport.quantity}
                    onChange={(e) => handleUpdateTransport(transportIndex, 'quantity', e.target.value)}
                    className="text-sm"
                  />
                </div>
                
                <div>
                  <label className="text-xs font-medium mb-1 block">Description (Optional)</label>
                  <Input
                    disabled={loading}
                    value={transport.description || ''}
                    onChange={(e) => handleUpdateTransport(transportIndex, 'description', e.target.value)}
                    placeholder="e.g. Airport to Hotel"
                    className="text-sm"
                  />
                </div>
              </div>
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
        </>
      )}
    </div>
  );
};