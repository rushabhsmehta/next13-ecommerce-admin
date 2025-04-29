// filepath: d:\next13-ecommerce-admin\src\app\(dashboard)\tourPackageQuery\[tourPackageQueryId]\components\LocationTab.tsx
import { Control } from "react-hook-form";
import { ChevronDown, MapPin, Check as CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Location } from "@prisma/client";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TourPackageQueryCreateCopyFormValues } from "./tourPackageQueryCreateCopy-form";

interface LocationTabProps {
  control: Control<TourPackageQueryCreateCopyFormValues>;
  loading: boolean;
  locations: Location[];
  form: any; // Use a more specific type if available
  updateLocationDefaults?: (field: string, checked: boolean) => void;
}

const LocationTab: React.FC<LocationTabProps> = ({
  control,
  loading,
  locations,
  form,
  updateLocationDefaults
}) => {  
  // Function to handle location selection
  const handleLocationSelection = (locationId: string) => {
    form.setValue("locationId", locationId);
    // Update location-dependent fields if needed
    
    // Define interfaces for itinerary and activity based on your project structure
    interface ItineraryItem {
      dayNumber?: number;
      days?: string;
      itineraryTitle?: string;
      itineraryDescription?: string;
      hotelId?: string;
      locationId?: string;
      activities?: ActivityItem[];
      itineraryImages?: { url: string }[];
      mealsIncluded?: string[] | string;
      roomAllocations?: any[];
      transportDetails?: any[];
      [key: string]: any; // Allow other properties
    }
    
    interface ActivityItem {
      activityTitle?: string;
      activityDescription?: string;
      locationId?: string;
      activityImages?: { url: string }[];
      [key: string]: any; // Allow other properties
    }
    
    // Update locationId in all itineraries
    const currentItineraries = form.getValues('itineraries');
    const updatedItineraries = currentItineraries.map((itinerary: ItineraryItem) => ({
      ...itinerary,
      locationId: locationId,
      // Update activities locationId within itineraries
      activities: itinerary.activities?.map((activity: ActivityItem) => ({
        ...activity,
        locationId: locationId
      })) || []
    }));
    form.setValue('itineraries', updatedItineraries);
    
    // Apply location defaults if enabled via updateLocationDefaults prop
    // This syncs the behavior with the parent component's useLocationDefaults state
    if (updateLocationDefaults) {
      // The parent component should handle which fields to update based on the useLocationDefaults state
      const defaultFields = [
        'inclusions', 
        'exclusions', 
        'importantNotes', 
        'paymentPolicy', 
        'usefulTip', 
        'cancellationPolicy', 
        'airlineCancellationPolicy', 
        'termsconditions'
      ];
      
      // For each field, let the parent component know we changed location
      // The parent will decide whether to apply defaults based on current settings
      defaultFields.forEach(field => {
        updateLocationDefaults(field, true);
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Location
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={control}
          name="locationId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location<span className="text-red-500">*</span></FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between",
                        !field.value && "text-muted-foreground",
                        form.formState.errors.locationId ? "border-red-500" : ""
                      )}
                      disabled={loading}
                    >
                      {field.value
                        ? locations.find((location) => location.id === field.value)?.label
                        : "Select a location..."}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Search location..." />
                    <CommandEmpty>No location found.</CommandEmpty>
                    <CommandGroup>
                      {locations.map((location) => (
                        <CommandItem
                          value={location.label}
                          key={location.id}
                          onSelect={() => handleLocationSelection(location.id)}
                        >
                          <CheckIcon
                            className={cn(
                              "mr-2 h-4 w-4",
                              location.id === field.value ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {location.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage>
                {form.formState.errors.locationId?.message}
              </FormMessage>
            </FormItem>
          )}
        />

        {/* Add additional location-related fields here if needed */}
        <FormField
          control={control}
          name="transport"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Transport Details</FormLabel>
              <FormControl>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Transport Details"
                  disabled={loading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={control}
            name="pickup_location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pickup Location</FormLabel>
                <FormControl>
                  <input
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Pickup Location"
                    disabled={loading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={control}
            name="drop_location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Drop Location</FormLabel>
                <FormControl>
                  <input
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Drop Location"
                    disabled={loading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default LocationTab;
