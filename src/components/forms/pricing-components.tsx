import React from 'react';
import { Control, useFieldArray, Controller } from 'react-hook-form'; // Import necessary hooks/components
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
import { FormDescription, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form'; // Import Form components

// ===== Room Allocation Component =====
interface RoomAllocationComponentProps {
  control: Control<any>; // Add control prop
  itineraryIndex: number; // Keep index to build field names
  roomTypes: RoomType[]; // Add lookup props
  occupancyTypes: OccupancyType[]; // Add lookup props
  mealPlans: MealPlan[]; // Add lookup props
  loading: boolean;
}

export const RoomAllocationComponent: React.FC<RoomAllocationComponentProps> = ({
  control,
  itineraryIndex,
  roomTypes, // Use passed props
  occupancyTypes, // Use passed props
  mealPlans, // Use passed props
  loading
}) => {
  // Use useFieldArray for dynamic room allocations
  const { fields, append, remove } = useFieldArray({
    control,
    name: `itineraries.${itineraryIndex}.roomAllocations` // Correct path based on form structure
  });

  // Remove internal state and useEffect for fetching lookups

  const handleAddRoom = () => {
    append({ // Append default values matching the schema
      roomTypeId: roomTypes.length > 0 ? roomTypes[0].id : '',
      occupancyTypeId: occupancyTypes.length > 0 ? occupancyTypes[0].id : '',
      mealPlanId: mealPlans.length > 0 ? mealPlans[0].id : '',
      quantity: 1, // Ensure quantity is number if schema expects number
      guestNames: ''
    });
  };

  // handleUpdateRoom and handleRemoveRoom are now managed by useFieldArray and Controller/register

  return (
    <div className="space-y-4">
      {/* Removed internal isLoading check */}
      {fields.map((field, roomIndex) => (
        <div key={field.id} className="border rounded-lg p-3 bg-white shadow-sm mb-3">
          <div className="flex items-center justify-between mb-2 pb-2 border-b">
            <h4 className="text-sm font-medium">Room Details #{roomIndex + 1}</h4>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={loading}
              onClick={() => remove(roomIndex)} // Use remove from useFieldArray
              className="h-8 px-2"
            >
              <Trash className="h-4 w-4 mr-1" /> Remove
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Room Type */}
            <FormField
              control={control}
              name={`itineraries.${itineraryIndex}.roomAllocations.${roomIndex}.roomTypeId`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Room Type</FormLabel>
                  <Select
                    disabled={loading}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Room Type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roomTypes.map((roomType) => (
                        <SelectItem key={roomType.id} value={roomType.id}>
                          {roomType.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Occupancy Type */}
            <FormField
              control={control}
              name={`itineraries.${itineraryIndex}.roomAllocations.${roomIndex}.occupancyTypeId`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Occupancy</FormLabel>
                  <Select
                    disabled={loading}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Occupancy" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {occupancyTypes.map((occupancyType) => (
                        <SelectItem key={occupancyType.id} value={occupancyType.id}>
                          {occupancyType.name} ({occupancyType.maxPersons} person{occupancyType.maxPersons > 1 ? 's' : ''})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Meal Plan */}
            <FormField
              control={control}
              name={`itineraries.${itineraryIndex}.roomAllocations.${roomIndex}.mealPlanId`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Meal Plan</FormLabel>
                  <Select
                    disabled={loading}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Meal Plan" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {mealPlans.map((mealPlan) => (
                        <SelectItem key={mealPlan.id} value={mealPlan.id}>
                          {mealPlan.code} ({mealPlan.description})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quantity */}
            <FormField
              control={control}
              name={`itineraries.${itineraryIndex}.roomAllocations.${roomIndex}.quantity`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Quantity</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={loading}
                      type="number"
                      min={1}
                      className="text-sm"
                      // Ensure value is handled correctly (might need transformation if schema expects number)
                      onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                      value={field.value || 1}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
    </div>
  );
};

// ===== Transport Details Component =====
interface TransportDetailsComponentProps {
  control: Control<any>; // Add control prop
  itineraryIndex: number; // Keep index
  vehicleTypes: VehicleType[]; // Add lookup prop
  loading: boolean;
}

export const TransportDetailsComponent: React.FC<TransportDetailsComponentProps> = ({
  control,
  itineraryIndex,
  vehicleTypes, // Use passed prop
  loading
}) => {
  // Use useFieldArray for dynamic transport details
  const { fields, append, remove } = useFieldArray({
    control,
    name: `itineraries.${itineraryIndex}.transportDetails` // Correct path
  });

  // Remove internal state and useEffect for fetching lookups

  const handleAddTransport = () => {
    append({ // Append default values matching the schema
      vehicleTypeId: vehicleTypes.length > 0 ? vehicleTypes[0].id : '',
      transportType: 'PerDay',
      quantity: 1, // Ensure quantity is number if schema expects number
      description: ''
    });
  };

  // handleUpdateTransport and handleRemoveTransport are now managed by useFieldArray and Controller/register

  return (
    <div className="space-y-4">
      {/* Removed internal isLoading check */}
      {fields.map((field, transportIndex) => (
        <div key={field.id} className="border rounded-lg p-3 bg-white shadow-sm mb-3">
          <div className="flex items-center justify-between mb-2 pb-2 border-b">
            <h4 className="text-sm font-medium">Transport #{transportIndex + 1}</h4>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={loading}
              onClick={() => remove(transportIndex)} // Use remove from useFieldArray
              className="h-8 px-2"
            >
              <Trash className="h-4 w-4 mr-1" /> Remove
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Vehicle Type */}
            <FormField
              control={control}
              name={`itineraries.${itineraryIndex}.transportDetails.${transportIndex}.vehicleTypeId`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Vehicle Type</FormLabel>
                  <Select
                    disabled={loading}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Vehicle Type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vehicleTypes.map((vehicleType) => (
                        <SelectItem key={vehicleType.id} value={vehicleType.id}>
                          {vehicleType.name} (Capacity: {vehicleType.capacity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Transport Type */}
            <FormField
              control={control}
              name={`itineraries.${itineraryIndex}.transportDetails.${transportIndex}.transportType`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Transport Type</FormLabel>
                  <Select
                    disabled={loading}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Transport Type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PerDay">Per Day</SelectItem>
                      <SelectItem value="PerTrip">Per Trip</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quantity */}
            <FormField
              control={control}
              name={`itineraries.${itineraryIndex}.transportDetails.${transportIndex}.quantity`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Quantity</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={loading}
                      type="number"
                      min={1}
                      className="text-sm"
                      // Ensure value is handled correctly
                      onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                      value={field.value || 1}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={control}
              name={`itineraries.${itineraryIndex}.transportDetails.${transportIndex}.description`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Description (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={loading}
                      placeholder="e.g. Airport to Hotel"
                      className="text-sm"
                      value={field.value || ''} // Handle potential null/undefined
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
    </div>
  );
};