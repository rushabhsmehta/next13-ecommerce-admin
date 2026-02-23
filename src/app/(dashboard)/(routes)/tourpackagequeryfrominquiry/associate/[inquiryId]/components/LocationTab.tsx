// filepath: d:\next13-ecommerce-admin\src\components\tour-package-query\LocationTab.tsx
import { Control } from "react-hook-form";
import { TourPackageQueryFormValues } from "./tourPackageQuery-form";
import { ChevronDown, MapPin, Check as CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Location } from "@prisma/client";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
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

// Use a union type for the control prop and form type
interface LocationTabProps {
  control: Control<TourPackageQueryFormValues>;
  loading: boolean;
  locations: Location[];
  form: any; // Use a more specific type if available, consider a union type here too if form methods differ
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
    if (Array.isArray(currentItineraries)) {
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
    }    // Apply location defaults if enabled via updateLocationDefaults prop
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
        'termsconditions',
        'kitchenGroupPolicy'
      ];

      // For each field, let the parent component know we changed location
      // The parent will decide whether to apply defaults based on current settings
      defaultFields.forEach(field => {
        updateLocationDefaults(field, true);
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
          Location
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
        <FormField
          control={control}
          name="locationId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium">
                Location<span className="text-red-500">*</span>
              </FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between min-h-[44px] text-left font-normal",
                        !field.value && "text-muted-foreground",
                        form.formState.errors.locationId ? "border-red-500" : ""
                      )}
                      disabled={loading}
                    >
                      <span className="truncate">
                        {field.value
                          ? locations.find((location) => location.id === field.value)?.label
                          : "Select a location..."}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command>
                    <CommandInput placeholder="Search location..." className="h-9" />
                    <CommandList>
                      <CommandEmpty>No location found.</CommandEmpty>
                      <CommandGroup className="max-h-[200px] overflow-y-auto">
                        {locations.map((location) => (
                          <CommandItem
                            value={location.label}
                            key={location.id}
                            onSelect={() => handleLocationSelection(location.id)}
                            className="px-3 py-2"
                          >
                            <CheckIcon
                              className={cn(
                                "mr-2 h-4 w-4",
                                location.id === field.value ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span className="truncate">{location.label}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage>
                {form.formState.errors.locationId?.message}
              </FormMessage>
            </FormItem>
          )}
        />

        {/* Transport Details */}
        <FormField
          control={control}
          name="transport"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium">Transport Details</FormLabel>
              <FormControl>
                <input
                  className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Transport Details"
                  disabled={loading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Pickup and Drop Locations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={control}
            name="pickup_location"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium">Pickup Location</FormLabel>
                <FormControl>
                  <input
                    className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                <FormLabel className="text-base font-medium">Drop Location</FormLabel>
                <FormControl>
                  <input
                    className="flex min-h-[44px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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

        {/* Mobile-friendly info section */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200 sm:hidden">
          <p className="text-sm text-blue-700">
            💡 Location selection affects itinerary details and default settings
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LocationTab;
