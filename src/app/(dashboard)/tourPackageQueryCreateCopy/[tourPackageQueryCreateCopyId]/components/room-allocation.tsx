import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFormContext, useFieldArray, Controller } from 'react-hook-form';
import { MealPlan, OccupancyType, RoomType } from '@prisma/client';
import { TourPackageQueryCreateCopyFormValues } from './tourPackageQueryCreateCopy-form';

interface RoomAllocationComponentProps {
  itineraryIndex: number;
  loading: boolean;
  roomTypes: RoomType[];
  occupancyTypes: OccupancyType[];
  mealPlans: MealPlan[];
}

interface TransportDetailsComponentProps {
  itineraryIndex: number;
  loading: boolean;
  vehicleTypes: { id: string; name: string }[];
}

// Component for handling multiple room allocations with different occupancy types
const RoomAllocationComponent: React.FC<RoomAllocationComponentProps> = ({ itineraryIndex, loading, roomTypes, occupancyTypes, mealPlans }) => {
  const { control, register } = useFormContext<TourPackageQueryCreateCopyFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `itineraries.${itineraryIndex}.roomAllocations`
  });
  return (
    <div className="space-y-3 border p-3 rounded-md">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Room Allocations</h4>
        <Button type="button" variant="outline" size="sm" onClick={() => append({ roomTypeId: '', occupancyTypeId: '', mealPlanId: '', quantity: 1, guestNames: '' })} disabled={loading}>
          <Plus className="h-4 w-4 mr-1" /> Add Room
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="text-sm text-gray-500">No room allocations added. Click &quot;Add Room&quot; to specify room requirements.</p>
      ) : (
        <div className="space-y-3">
          {fields.map((field, idx) => (
            <div key={field.id} className="grid grid-cols-1 md:grid-cols-5 gap-2 py-2 border-b last:border-0">
              {/* Room Type select from database */}
              <Controller
                control={control}
                name={`itineraries.${itineraryIndex}.roomAllocations.${idx}.roomTypeId`}
                render={({ field }) => (
                  <Select disabled={loading} value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Room Type" /></SelectTrigger>
                    <SelectContent>
                      {roomTypes.map(rt => (
                        <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <Controller
                control={control}
                name={`itineraries.${itineraryIndex}.roomAllocations.${idx}.occupancyTypeId`}
                render={({ field }) => (
                  <Select disabled={loading} value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Occupancy Type" /></SelectTrigger>
                    <SelectContent>
                      {occupancyTypes.map(ot => (
                        <SelectItem key={ot.id} value={ot.id}>{ot.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <Controller
                control={control}
                name={`itineraries.${itineraryIndex}.roomAllocations.${idx}.mealPlanId`}
                render={({ field }) => (
                  <Select disabled={loading} value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Meal Plan" /></SelectTrigger>
                    <SelectContent>
                      {mealPlans.map(mp => (
                        <SelectItem key={mp.id} value={mp.id}>{mp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <Input
                disabled={loading}
                type="number"
                min={1}
                {...register(`itineraries.${itineraryIndex}.roomAllocations.${idx}.quantity`, { valueAsNumber: true })}
              />
              <div className="flex items-center gap-2">
                <Input
                  disabled={loading}
                  {...register(`itineraries.${itineraryIndex}.roomAllocations.${idx}.guestNames`)}
                  className="flex-1"
                />
                <Button type="button" variant="destructive" size="sm" onClick={() => remove(idx)} disabled={loading}>
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

// Component for transport details per itinerary
const TransportDetailsComponent: React.FC<TransportDetailsComponentProps> = ({ itineraryIndex, loading, vehicleTypes }) => {
  const { control, register } = useFormContext<TourPackageQueryCreateCopyFormValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `itineraries.${itineraryIndex}.transportDetails`
  });  return (
    <div className="space-y-3 border p-3 rounded-md">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Transport Details</h4>
        <Button type="button" variant="outline" size="sm" onClick={() => append({ vehicleTypeId: '', transportType: '', quantity: 1, description: '' })} disabled={loading}>
          <Plus className="h-4 w-4 mr-1" /> Add Transport
        </Button>
      </div>
      
      {fields.length === 0 ? (
        <p className="text-sm text-gray-500">No transport details. Click &quot;Add Transport&quot;.</p>
      ) : (
        <div className="space-y-3">
          {fields.map((field, idx) => (
            <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-2 py-2 border-b last:border-0">
              {/* Vehicle Type select */}
              <Controller
                control={control}
                name={`itineraries.${itineraryIndex}.transportDetails.${idx}.vehicleTypeId`}
                render={({ field }) => (
                  <Select disabled={loading} value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicleTypes.map(vt => (
                        <SelectItem key={vt.id} value={vt.id}>{vt.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {/* Transport Type input */}
              <Input
                disabled={loading}
                placeholder="Transport Type"
                {...register(`itineraries.${itineraryIndex}.transportDetails.${idx}.transportType`)}
              />
              {/* Quantity input */}
              <Input
                disabled={loading}
                type="number"
                min={1}
                {...register(`itineraries.${itineraryIndex}.transportDetails.${idx}.quantity`, { valueAsNumber: true })}
              />
              {/* Description input and remove */}
              <div className="flex items-center gap-2">
                <Input
                  disabled={loading}
                  placeholder="Description"
                  {...register(`itineraries.${itineraryIndex}.transportDetails.${idx}.description`)}
                  className="flex-1"
                />
                <Button type="button" variant="destructive" size="sm" onClick={() => remove(idx)} disabled={loading}>
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

export { RoomAllocationComponent, TransportDetailsComponent };
