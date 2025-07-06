import React from 'react';
import { Control, useFieldArray, Controller } from 'react-hook-form';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Minus, Trash, Home, Car } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  RoomAllocation,
  TransportDetail,
  RoomType,
  OccupancyType,
  MealPlan,
  VehicleType
} from '@prisma/client';
import { FormDescription, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';

// ===== Room Allocation Component =====
interface RoomAllocationComponentProps {
  control: Control<any>;
  itineraryIndex: number;
  roomTypes: RoomType[];
  occupancyTypes: OccupancyType[];
  mealPlans: MealPlan[];
  loading: boolean;
}

export const RoomAllocationComponent: React.FC<RoomAllocationComponentProps> = ({
  control,
  itineraryIndex,
  roomTypes,
  occupancyTypes,
  mealPlans,
  loading
}) => {
  // Add comprehensive logging
  console.log('=== RoomAllocationComponent Debug ===');
  console.log('itineraryIndex:', itineraryIndex);
  console.log('roomTypes:', roomTypes, 'isArray:', Array.isArray(roomTypes));
  console.log('occupancyTypes:', occupancyTypes, 'isArray:', Array.isArray(occupancyTypes));
  console.log('mealPlans:', mealPlans, 'isArray:', Array.isArray(mealPlans));
  console.log('loading:', loading);

  let fields, append, remove;
  try {
    console.log('Attempting useFieldArray with name:', `itineraries.${itineraryIndex}.roomAllocations`);
    const fieldArray = useFieldArray({
      control,
      name: `itineraries.${itineraryIndex}.roomAllocations`
    });
    fields = fieldArray.fields;
    append = fieldArray.append;
    remove = fieldArray.remove;
    console.log('useFieldArray successful, fields:', fields, 'isArray:', Array.isArray(fields));
  } catch (error) {
    console.error('Error in useFieldArray:', error);
    console.log('control object:', control);
    throw error;
  }

  const handleAddRoom = () => {
    console.log('=== handleAddRoom called ===');
    console.log('roomTypes before append:', roomTypes);
    console.log('occupancyTypes before append:', occupancyTypes);
    console.log('mealPlans before append:', mealPlans);
    
    try {
      const newRoom = {
        roomTypeId: Array.isArray(roomTypes) && roomTypes.length > 0 ? roomTypes[0].id : '',
        occupancyTypeId: Array.isArray(occupancyTypes) && occupancyTypes.length > 0 ? occupancyTypes[0].id : '',
        mealPlanId: Array.isArray(mealPlans) && mealPlans.length > 0 ? mealPlans[0].id : '',
        quantity: 1,
        guestNames: ''
      };
      console.log('Appending room:', newRoom);
      append(newRoom);
      console.log('Room appended successfully');
    } catch (error) {
      console.error('Error in handleAddRoom:', error);
      throw error;
    }
  };

  return (
    <div className="space-y-4">
      {/* Modern card header with icon and description */}
      <div className="bg-gradient-to-r from-blue-100 to-indigo-100 border-b border-blue-200 p-4 rounded-t-lg">
        <h3 className="text-base font-semibold text-blue-900 flex items-center gap-2">
          <Home className="h-5 w-5" />
          Room Allocations
        </h3>
        <p className="text-sm text-blue-700 mt-1">Configure room types, occupancy, and meal plans for this day</p>
      </div>

      <div className="p-4 space-y-4">
        {(() => {
          console.log('=== Render section debug ===');
          console.log('fields before map:', fields);
          console.log('fields type:', typeof fields);
          console.log('fields isArray:', Array.isArray(fields));
          console.log('fields length:', fields?.length);
          
          if (!Array.isArray(fields)) {
            console.error('CRITICAL: fields is not an array!', fields);
            return (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium">Error: Room allocations data is not properly formatted</p>
                <p className="text-red-600 text-sm mt-1">Expected array, got: {typeof fields}</p>
                <pre className="text-xs mt-2 bg-red-100 p-2 rounded">{JSON.stringify(fields, null, 2)}</pre>
              </div>
            );
          }

          try {
            return fields.map((field, roomIndex) => {
              console.log(`Rendering room ${roomIndex}:`, field);
              return (
          <div key={field.id} className="border border-blue-200 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-blue-100">
              <h4 className="text-sm font-medium text-blue-900 flex items-center gap-2">
                <Home className="h-4 w-4" />
                Room #{roomIndex + 1}
              </h4>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={loading}
                onClick={() => remove(roomIndex)}
                className="h-8 px-3 hover:bg-red-600 focus:ring-2 focus:ring-red-200"
              >
                <Trash className="h-4 w-4 mr-1" /> Remove
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Room Type */}
              <FormField
                control={control}
                name={`itineraries.${itineraryIndex}.roomAllocations.${roomIndex}.roomTypeId`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-gray-700">Room Type</FormLabel>
                    <Select
                      disabled={loading}
                      onValueChange={field.onChange}
                      value={field.value}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11 border-blue-200 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200">
                          <SelectValue placeholder="Select room type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roomTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
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
                    <FormLabel className="text-xs font-medium text-gray-700">Occupancy</FormLabel>
                    <Select
                      disabled={loading}
                      onValueChange={field.onChange}
                      value={field.value}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11 border-blue-200 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200">
                          <SelectValue placeholder="Select occupancy" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {occupancyTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
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
                    <FormLabel className="text-xs font-medium text-gray-700">Meal Plan</FormLabel>
                    <Select
                      disabled={loading}
                      onValueChange={field.onChange}
                      value={field.value}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11 border-blue-200 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200">
                          <SelectValue placeholder="Select meal plan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {mealPlans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name}
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
                    <FormLabel className="text-xs font-medium text-gray-700">Quantity</FormLabel>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={loading || (field.value as number) <= 1}
                        onClick={() => field.onChange(Math.max(1, (field.value as number || 1) - 1))}
                        className="h-11 w-11 p-0 border-blue-200 hover:border-blue-400 hover:bg-blue-50"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <FormControl>
                        <Input
                          type="number"
                          disabled={loading}
                          placeholder="1"
                          {...field}
                          className="h-11 text-center border-blue-200 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          min="1"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={loading}
                        onClick={() => field.onChange((field.value as number || 1) + 1)}
                        className="h-11 w-11 p-0 border-blue-200 hover:border-blue-400 hover:bg-blue-50"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Guest Names Field */}
            <div className="mt-4">
              <FormField
                control={control}
                name={`itineraries.${itineraryIndex}.roomAllocations.${roomIndex}.guestNames`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-gray-700">Guest Names (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        disabled={loading}
                        placeholder="Enter guest names (comma separated)"
                        {...field}
                        className="h-11 border-blue-200 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-gray-500">
                      Optional: List guest names for this room allocation
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
              );
            });
          } catch (error) {
            console.error('Error in fields.map:', error);
            return (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium">Error rendering room allocations</p>
                <pre className="text-xs mt-2 bg-red-100 p-2 rounded">{String(error)}</pre>
              </div>
            );
          }
        })()}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-0 hover:from-blue-600 hover:to-indigo-600 focus:ring-2 focus:ring-blue-200"
          disabled={loading}
          onClick={handleAddRoom}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Room Allocation
        </Button>
      </div>
    </div>
  );
};

// ===== Transport Details Component =====
interface TransportDetailsComponentProps {
  control: Control<any>;
  itineraryIndex: number;
  vehicleTypes: VehicleType[];
  loading: boolean;
}

export const TransportDetailsComponent: React.FC<TransportDetailsComponentProps> = ({
  control,
  itineraryIndex,
  vehicleTypes,
  loading
}) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `itineraries.${itineraryIndex}.transportDetails`
  });

  const handleAddTransport = () => {
    append({
      vehicleTypeId: vehicleTypes.length > 0 ? vehicleTypes[0].id : '',
      transportType: 'PerDay',
      quantity: 1,
      description: ''
    });
  };

  return (
    <div className="space-y-4">
      {/* Modern card header with icon and description */}
      <div className="bg-gradient-to-r from-green-100 to-teal-100 border-b border-green-200 p-4 rounded-t-lg">
        <h3 className="text-base font-semibold text-green-900 flex items-center gap-2">
          <Car className="h-5 w-5" />
          Transport Details
        </h3>
        <p className="text-sm text-green-700 mt-1">Configure vehicle types and transport arrangements for this day</p>
      </div>

      <div className="p-4 space-y-4">
        {fields.map((field, transportIndex) => (
          <div key={field.id} className="border border-green-200 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-green-100">
              <h4 className="text-sm font-medium text-green-900 flex items-center gap-2">
                <Car className="h-4 w-4" />
                Transport #{transportIndex + 1}
              </h4>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={loading}
                onClick={() => remove(transportIndex)}
                className="h-8 px-3 hover:bg-red-600 focus:ring-2 focus:ring-red-200"
              >
                <Trash className="h-4 w-4 mr-1" /> Remove
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Vehicle Type */}
              <FormField
                control={control}
                name={`itineraries.${itineraryIndex}.transportDetails.${transportIndex}.vehicleTypeId`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-gray-700">Vehicle Type</FormLabel>
                    <Select
                      disabled={loading}
                      onValueChange={field.onChange}
                      value={field.value}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11 border-green-200 hover:border-green-400 focus:border-green-500 focus:ring-2 focus:ring-green-200">
                          <SelectValue placeholder="Select vehicle" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>                        {vehicleTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
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
                    <FormLabel className="text-xs font-medium text-gray-700">Pricing Type</FormLabel>
                    <Select
                      disabled={loading}
                      onValueChange={field.onChange}
                      value={field.value}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11 border-green-200 hover:border-green-400 focus:border-green-500 focus:ring-2 focus:ring-green-200">
                          <SelectValue placeholder="Select type" />
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
                    <FormLabel className="text-xs font-medium text-gray-700">Quantity</FormLabel>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={loading || (field.value as number) <= 1}
                        onClick={() => field.onChange(Math.max(1, (field.value as number || 1) - 1))}
                        className="h-11 w-11 p-0 border-green-200 hover:border-green-400 hover:bg-green-50"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <FormControl>
                        <Input
                          type="number"
                          disabled={loading}
                          placeholder="1"
                          {...field}
                          className="h-11 text-center border-green-200 hover:border-green-400 focus:border-green-500 focus:ring-2 focus:ring-green-200"
                          min="1"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={loading}
                        onClick={() => field.onChange((field.value as number || 1) + 1)}
                        className="h-11 w-11 p-0 border-green-200 hover:border-green-400 hover:bg-green-50"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Description Field */}
            <div className="mt-4">
              <FormField
                control={control}
                name={`itineraries.${itineraryIndex}.transportDetails.${transportIndex}.description`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-gray-700">Description (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        disabled={loading}
                        placeholder="e.g. Airport to Hotel"
                        className="h-11 border-green-200 hover:border-green-400 focus:border-green-500 focus:ring-2 focus:ring-green-200"
                        value={field.value || ''}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-gray-500">
                      Optional: Add transport details or route information
                    </FormDescription>
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
          className="mt-4 bg-gradient-to-r from-green-500 to-teal-500 text-white border-0 hover:from-green-600 hover:to-teal-600 focus:ring-2 focus:ring-green-200"
          disabled={loading}
          onClick={handleAddTransport}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Transport Detail
        </Button>
      </div>
    </div>
  );
};