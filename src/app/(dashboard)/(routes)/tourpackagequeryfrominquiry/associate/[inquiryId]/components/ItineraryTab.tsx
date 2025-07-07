// filepath: d:\next13-ecommerce-admin\src\components\tour-package-query\ItineraryTab.tsx
import { useState, useRef } from "react";
import { Control, useFieldArray, useFormContext } from "react-hook-form";
import { TourPackageQueryFormValues } from "./tourPackageQuery-form";
import { ListPlus, ChevronDown, ChevronUp, Trash2, Plus, ImageIcon, Type, AlignLeft, BuildingIcon, CarIcon, MapPinIcon, BedIcon, Check as CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import JoditEditor from "jodit-react";
import { Activity, ActivityMaster, Hotel, Images, ItineraryMaster, Location, RoomType, OccupancyType, MealPlan, VehicleType } from "@prisma/client"; // Added lookup types

// Import necessary UI components
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

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { RoomAllocationComponent, TransportDetailsComponent } from "@/components/forms/pricing-components";
import ImageUpload from "@/components/ui/image-upload";
import Image from 'next/image';

// Define the props interface with a union type for control
interface ItineraryTabProps {
  control: Control<TourPackageQueryFormValues>;
  loading: boolean;
  hotels: (Hotel & {
    images: Images[];
  })[];
  activitiesMaster?: (ActivityMaster & {
    activityMasterImages: Images[];
  })[] | null;
  itinerariesMaster?: (ItineraryMaster & {
    itineraryMasterImages: Images[];
    activities: (Activity & {
      activityImages: Images[];
    })[] | null;
  })[] | null;
  form: any; // Consider using a more specific type or a union type if form methods differ
  // --- ADDED LOOKUP PROPS ---
  roomTypes?: RoomType[];
  occupancyTypes?: OccupancyType[];
  mealPlans?: MealPlan[];
  vehicleTypes?: VehicleType[];
  // --- END ADDED LOOKUP PROPS ---
  // --- ADDED ASSOCIATE PARTNER PROPS ---
  isAssociatePartner?: boolean; // Flag to determine if this is for associate partners
  enableRoomAllocation?: boolean; // Flag to enable room allocation section
  enableTransport?: boolean; // Flag to enable transport section
  // --- END ASSOCIATE PARTNER PROPS ---
}

const ItineraryTab: React.FC<ItineraryTabProps> = ({
  control,
  loading,
  hotels,
  activitiesMaster,
  itinerariesMaster,
  form,
  // --- DESTRUCTURE ADDED PROPS ---
  roomTypes = [],
  occupancyTypes = [],
  mealPlans = [],
  vehicleTypes = [],
  // --- ASSOCIATE PARTNER PROPS ---
  isAssociatePartner = false,
  enableRoomAllocation = false,
  enableTransport = false,
  // --- END DESTRUCTURE ---
}) => {
  // Create a refs object to store multiple editor references instead of a single ref
  const editorsRef = useRef<{[key: string]: any}>({});
  // Handle saving to master itinerary
  const handleSaveToMasterItinerary = async (itinerary: any) => {
    try {
      // Mark as loading
      form.setValue('loading', true);

      // Prepare the data for saving to master itinerary
      const masterItineraryData = {
        itineraryMasterTitle: itinerary.itineraryTitle,
        itineraryMasterDescription: itinerary.itineraryDescription,
        locationId: itinerary.locationId,
        itineraryMasterImages: itinerary.itineraryImages,
        activities: itinerary.activities.map((activity: any) => ({
          activityTitle: activity.activityTitle,
          activityDescription: activity.activityDescription,
          activityImages: activity.activityImages,
          locationId: itinerary.locationId
        })),
        // Include any additional fields required by the API
        dayNumber: itinerary.dayNumber,
        days: itinerary.days,
        hotelId: itinerary.hotelId,
      };

      // Send to existing API endpoint
      const response = await fetch('/api/itinerariesMaster', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(masterItineraryData),
      });

      // Parse the response
      const data = await response.json();

      // Show success message
      alert('Saved to Master Itinerary successfully!');
      console.log('Saved to master itinerary:', data);
    } catch (error: any) {
      console.error('Error saving to master itinerary:', error);
      alert(`Failed to save to Master Itinerary: ${error.message}`);
    } finally {
      // Reset loading state
      form.setValue('loading', false);
    }
  };

  // Handle activity selection
  const handleActivitySelection = (selectedActivityId: string, itineraryIndex: number, activityIndex: number) => {
    const selectedActivityMaster = activitiesMaster?.find(activity => activity.id === selectedActivityId);

    if (selectedActivityMaster) {
      const updatedItineraries = [...form.getValues('itineraries')];
      updatedItineraries[itineraryIndex].activities[activityIndex] = {
        ...updatedItineraries[itineraryIndex].activities[activityIndex],
        activityTitle: selectedActivityMaster.activityMasterTitle || '',
        activityDescription: selectedActivityMaster.activityMasterDescription || '',
        activityImages: selectedActivityMaster.activityMasterImages?.map((image: { url: any }) => ({ url: image.url }))
      };
      form.setValue('itineraries', updatedItineraries);
    }
  };

  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <ListPlus className="h-5 w-5 text-primary" />
            Itinerary Details
          </CardTitle>
          <FormField
            control={control}
            name="itineraries"
            render={({ field: { value = [] } }) => (
              <>
                {value.length > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shadow-sm border-primary hover:bg-primary/10 transition-all flex items-center gap-2"
                    onClick={() => {
                      const itineraries = [...value];
                      if (itineraries.length <= 1) return;

                      const firstDay = itineraries[0];
                      // Get specifically roomAllocations and transportDetails arrays
                      const roomAllocations = firstDay.roomAllocations || [];
                      const transportDetails = firstDay.transportDetails || [];

                      const updatedItineraries = itineraries.map((itinerary, idx) => {
                        if (idx === 0) return itinerary;
                        return {
                          ...itinerary,
                          // Copy only roomAllocations and transportDetails from the first day
                          roomAllocations: JSON.parse(JSON.stringify(roomAllocations)),
                          transportDetails: JSON.parse(JSON.stringify(transportDetails))
                        };
                      });

                      form.setValue('itineraries', updatedItineraries);
                      alert('Room allocations and transport details copied to all days');
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Apply First Day Room Allocations & Transport
                  </Button>
                ) : null}
              </>
            )}
          />
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <FormField
          control={control}
          name="itineraries"
          render={({ field: { value = [], onChange } }) => (
            <FormItem>
              <div className="space-y-6">
                {/* Itinerary Days */}
                {value.map((itinerary, index) => (
                  <Accordion key={index} type="single" collapsible className="w-full border rounded-lg shadow-sm hover:shadow-md transition-all">
                    <AccordionItem value={`item-${index}`} className="border-0">
                      <AccordionTrigger className="bg-gradient-to-r from-white to-slate-50 px-4 py-3 hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100 rounded-t-lg min-h-[60px]">
                        <div className="flex items-center gap-3 w-full">
                          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-white font-bold text-sm">
                            {index + 1}
                          </div>
                          <div className="font-bold text-left truncate flex-1" dangerouslySetInnerHTML={{
                            __html: itinerary.itineraryTitle || `Day ${index + 1}`,
                          }}></div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-4 px-4 pb-6">
                        <div className="flex justify-end mb-4">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={loading}
                            onClick={() => onChange(value.filter((_: any, i: number) => i !== index))}
                            className="h-8 px-2 min-h-[44px]"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">Remove Day</span>
                            <span className="sm:hidden">Remove</span>
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:gap-6">
                        </div>
                        <div className="flex flex-col gap-4 p-3 sm:p-4 bg-slate-50 rounded-lg border border-slate-100">
                          <h3 className="font-medium text-sm text-slate-500">Itinerary Template</h3>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className={cn(
                                    "w-full justify-between bg-white shadow-sm min-h-[44px] text-left font-normal",
                                    !itinerary.itineraryTitle && "text-muted-foreground"
                                  )}
                                  disabled={loading}
                                >
                                  <span className="truncate">
                                    {itinerary.itineraryTitle
                                      ? (itinerariesMaster && itinerariesMaster.find(
                                        (itineraryMaster) => itinerary.itineraryTitle === itineraryMaster.itineraryMasterTitle
                                      )?.itineraryMasterTitle)
                                      : "Select an Itinerary Master"}
                                  </span>
                                  <ChevronUp className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 max-h-[240px] overflow-auto">
                              <Command>
                                <CommandInput
                                  placeholder="Search itinerary master..."
                                  className="h-9"
                                />
                                <CommandEmpty>No itinerary master found.</CommandEmpty>
                                <CommandGroup>
                                  {itinerariesMaster && itinerariesMaster.map((itineraryMaster) => (
                                    <CommandItem
                                      value={itineraryMaster.itineraryMasterTitle ?? ''}
                                      key={itineraryMaster.id} 
                                      onSelect={() => {
                                        const updatedItineraries = [...value];
                                        updatedItineraries[index] = {
                                          ...itinerary,
                                          itineraryTitle: itineraryMaster.itineraryMasterTitle || '',
                                          itineraryDescription: itineraryMaster.itineraryMasterDescription || '',
                                          itineraryImages: itineraryMaster.itineraryMasterImages?.map((image) => ({ url: image.url })) || [],
                                          activities: itineraryMaster.activities?.map(activity => ({
                                            activityTitle: activity.activityTitle || '',
                                            activityDescription: activity.activityDescription || '',
                                            activityImages: activity.activityImages?.map(image => ({ url: image.url })) || [],
                                          })) || [],
                                        };
                                        onChange(updatedItineraries); // Update the state with the new itineraries
                                      }}
                                      className="px-3 py-2"
                                    >
                                      <span className="truncate">{itineraryMaster.itineraryMasterTitle}</span>
                                      <CheckIcon
                                        className={cn(
                                          "ml-auto h-4 w-4",
                                          itineraryMaster.locationId === itinerary.locationId
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                      />
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="col-span-2">
                          <div className="grid grid-cols-1 gap-5">                            <FormItem className="bg-white rounded-lg p-4 shadow-sm border">
                              <FormLabel className="text-base font-medium flex items-center gap-2 mb-2">
                                <Type className="h-4 w-4" />
                                <span>Title</span>
                              </FormLabel>
                              <FormControl>
                                <JoditEditor
                                  ref={(node) => editorsRef.current[`title-${index}`] = node}
                                  value={itinerary.itineraryTitle || ''}
                                  config={{
                                    readonly: loading,
                                    toolbar: true,
                                    theme: 'default',
                                  }}
                                  onBlur={(newContent) => {
                                    const newItineraries = [...value]
                                    newItineraries[index] = { ...itinerary, itineraryTitle: newContent }
                                    onChange(newItineraries)
                                  }}
                                  onChange={() => {}} // Empty onChange to prevent focus loss
                                />
                              </FormControl>
                            </FormItem>                            <FormItem className="bg-white rounded-lg p-4 shadow-sm border">
                              <FormLabel className="text-base font-medium flex items-center gap-2 mb-2">
                                <AlignLeft className="h-4 w-4" />
                                <span>Description</span>
                              </FormLabel>
                              <FormControl>
                                <JoditEditor
                                  ref={(node) => editorsRef.current[`description-${index}`] = node}
                                  value={itinerary.itineraryDescription || ''}
                                  config={{
                                    readonly: loading,
                                    toolbar: true,
                                    theme: 'default',
                                  }}
                                  onBlur={(newContent) => {
                                    const newItineraries = [...value]
                                    newItineraries[index] = { ...itinerary, itineraryDescription: newContent }
                                    onChange(newItineraries)
                                  }}
                                  onChange={() => {}} // Empty onChange to prevent focus loss
                                />
                              </FormControl>
                            </FormItem>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormItem>
                            <FormLabel className="text-base font-medium">Day</FormLabel>
                            <FormControl>
                              <Input
                                disabled={loading}
                                type="number"
                                className="bg-white shadow-sm min-h-[44px]"
                                value={itinerary.dayNumber}
                                onChange={(e) => {
                                  const dayNumber = Number(e.target.value);
                                  const newItineraries = [...value];
                                  newItineraries[index] = { ...itinerary, dayNumber: dayNumber };
                                  onChange(newItineraries);
                                }}
                              />
                            </FormControl>
                          </FormItem>

                          <FormItem>
                            <FormLabel className="text-base font-medium">Date</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Day"
                                disabled={loading}
                                className="bg-white shadow-sm min-h-[44px]"
                                value={itinerary.days}
                                onChange={(e) => {
                                  const newItineraries = [...value];
                                  newItineraries[index] = { ...itinerary, days: e.target.value };
                                  onChange(newItineraries);
                                }}
                              />
                            </FormControl>
                          </FormItem>
                        </div>

                        {/* Destination Images */}
                        <div className="bg-slate-50 p-3 rounded-md mb-4">
                          <h3 className="text-sm font-medium mb-2 flex items-center gap-2 text-slate-700">
                            <ImageIcon className="h-4 w-4 text-primary" />
                            Destination Images
                          </h3>
                          <ImageUpload
                            value={Array.isArray(itinerary.itineraryImages) ? itinerary.itineraryImages.map(img => img.url) : []}
                            disabled={loading}
                            onChange={(url) => {
                              const newItineraries = [...value];
                              const currentImages = Array.isArray(itinerary.itineraryImages) ? itinerary.itineraryImages : [];
                              newItineraries[index] = {
                                ...itinerary,
                                itineraryImages: [...currentImages, { url }]
                              };
                              onChange(newItineraries);
                            }}
                            onRemove={(url) => {
                              const newItineraries = [...value];
                              const currentImages = Array.isArray(itinerary.itineraryImages) ? itinerary.itineraryImages : [];
                              newItineraries[index] = {
                                ...itinerary,
                                itineraryImages: currentImages.filter(img => img.url !== url)
                              };
                              onChange(newItineraries);
                            }}
                          />
                        </div>

                        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                          <h3 className="text-sm font-medium mb-4 flex items-center gap-2 text-slate-700">
                            <BuildingIcon className="h-4 w-4 text-primary" />
                            Accommodation
                          </h3>
                          <div className="space-y-4">
                            <FormItem className="flex flex-col">
                              <FormLabel className="text-base font-medium">Hotel</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      className={cn(
                                        "w-full justify-between min-h-[44px] text-left font-normal",
                                        !itinerary.hotelId && "text-muted-foreground"
                                      )}
                                      disabled={loading}
                                    >
                                      <span className="truncate">
                                        {itinerary.hotelId
                                          ? hotels.find(
                                            (hotel) => hotel.id === itinerary.hotelId
                                          )?.name
                                          : "Select a Hotel"}
                                      </span>
                                      <ChevronUp className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 max-h-[10rem] overflow-auto">
                                  <Command>
                                    <CommandInput
                                      placeholder="Search hotel..."
                                      className="h-9"
                                    />
                                    <CommandEmpty>No hotel found.</CommandEmpty>
                                    <CommandGroup>
                                      {[...hotels.filter(hotel => hotel.locationId === itinerary.locationId || hotel.id === 'cdd32e64-4fc4-4784-9f46-507611eb0168')
                                      ].map((hotel) => (
                                        <CommandItem
                                          value={hotel.name}
                                          key={hotel.id}
                                          onSelect={() => {
                                            const newItineraries = [...value];
                                            newItineraries[index] = {
                                              ...itinerary,
                                              hotelId: hotel.id
                                            };
                                            onChange(newItineraries); // Update the state with the new itineraries
                                          }}
                                          className="px-3 py-2"
                                        >
                                          <span className="truncate">{hotel.name}</span>
                                          <CheckIcon
                                            className={cn(
                                              "ml-auto h-4 w-4",
                                              hotel.id === itinerary.hotelId
                                                ? "opacity-100"
                                                : "opacity-0"
                                            )}
                                          />
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>

                            {/* Display selected hotel images */}
                            {(() => {
                              const hotel = itinerary.hotelId ? hotels.find(h => h.id === itinerary.hotelId) : undefined;
                              if (hotel && hotel.images && hotel.images.length > 0) {
                                return (
                                  <div className="mt-4">
                                    <h4 className="text-sm font-medium mb-2">Hotel Images</h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                      {hotel.images.map((image, imgIndex) => (
                                        <div key={imgIndex} className="relative w-full aspect-square rounded-md overflow-hidden border">
                                          <Image
                                            src={image.url}
                                            alt={`Hotel Image ${imgIndex + 1}`}
                                            fill
                                            className="object-cover"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>

                          {/* Room Allocation Section */}
                          <div className="mt-4 border-t border-slate-100 pt-4">
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-slate-700">
                              <BedIcon className="h-4 w-4 text-primary" />
                              Room Allocations
                              {isAssociatePartner && enableRoomAllocation && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Editable</span>
                              )}
                            </h4>
                            {(() => {
                              // Ensure roomAllocations is always an array
                              console.log('=== ItineraryTab Room Allocation Safety Check ===');
                              console.log('itineraryIndex:', index);
                              
                              const currentItinerary = form.getValues(`itineraries.${index}`);
                              console.log('currentItinerary:', currentItinerary);
                              console.log('currentItinerary.roomAllocations:', currentItinerary?.roomAllocations);
                              console.log('roomAllocations isArray:', Array.isArray(currentItinerary?.roomAllocations));
                              
                              if (!Array.isArray(currentItinerary?.roomAllocations)) {
                                console.warn('FIXING: roomAllocations is not an array, setting to empty array');
                                console.log('Before fix - roomAllocations value:', currentItinerary?.roomAllocations);
                                form.setValue(`itineraries.${index}.roomAllocations`, []);
                                console.log('After fix - roomAllocations set to empty array');
                              } else {
                                console.log('roomAllocations is already an array with length:', currentItinerary.roomAllocations.length);
                              }
                              
                              console.log('Rendering RoomAllocationComponent with props:');
                              console.log('- control:', control);
                              console.log('- itineraryIndex:', index);
                              console.log('- roomTypes:', roomTypes, 'isArray:', Array.isArray(roomTypes));
                              console.log('- occupancyTypes:', occupancyTypes, 'isArray:', Array.isArray(occupancyTypes));
                              console.log('- mealPlans:', mealPlans, 'isArray:', Array.isArray(mealPlans));
                              console.log('- loading:', isAssociatePartner ? !enableRoomAllocation : loading);
                              
                              return (
                                <RoomAllocationComponent
                                  control={control}
                                  itineraryIndex={index}
                                  roomTypes={roomTypes} // Pass down
                                  occupancyTypes={occupancyTypes} // Pass down
                                  mealPlans={mealPlans} // Pass down
                                  loading={isAssociatePartner ? !enableRoomAllocation : loading} // Enable for associate partners when enableRoomAllocation is true
                                />
                              );
                            })()}
                          </div>

                          {/* Transport Details Section */}
                          <div className="mt-4 border-t border-slate-100 pt-4">
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-slate-700">
                              <CarIcon className="h-4 w-4 text-primary" />
                              Transport Details
                              {isAssociatePartner && enableTransport && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Editable</span>
                              )}
                            </h4>
                            {(() => {
                              // Ensure transportDetails is always an array
                              const currentItinerary = form.getValues(`itineraries.${index}`);
                              if (!Array.isArray(currentItinerary?.transportDetails)) {
                                form.setValue(`itineraries.${index}.transportDetails`, []);
                              }
                              return (
                                <TransportDetailsComponent
                                  control={control}
                                  itineraryIndex={index}
                                  vehicleTypes={vehicleTypes} // Pass down
                                  loading={isAssociatePartner ? !enableTransport : loading} // Enable for associate partners when enableTransport is true
                                />
                              );
                            })()}
                          </div>
                        </div>

                        <div className="md:col-span-2">
                          <h3 className="text-sm font-medium mb-4 flex items-center gap-2 text-slate-700">
                            <MapPinIcon className="h-4 w-4 text-primary" />
                            Activities
                          </h3>
                          {Array.isArray(itinerary.activities) ? itinerary.activities.map((activity, activityIndex) => (
                            <div key={activityIndex} className="mb-6 p-4 border border-slate-200 rounded-lg bg-white shadow-sm">
                              <div className="flex justify-between items-center mb-4">
                                <h4 className="text-sm font-medium text-slate-700">Activity {activityIndex + 1}</h4>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    const newItineraries = [...value];
                                    newItineraries[index].activities = newItineraries[index].activities.filter((_, idx: number) => idx !== activityIndex);
                                    onChange(newItineraries);
                                  }}
                                  className="h-8 px-3"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Remove
                                </Button>
                              </div>
                              <div className="space-y-4">
                                <FormItem>
                                  <div className="space-y-4">
                                    <FormItem>
                                      <Select
                                        disabled={loading}
                                        onValueChange={(selectedActivityId) =>
                                          handleActivitySelection(selectedActivityId, index, activityIndex)
                                        }
                                      >
                                        <SelectTrigger className="bg-white">
                                          <SelectValue placeholder="Select an Activity" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {activitiesMaster?.map((activityMaster) => (
                                            <SelectItem key={activityMaster.id} value={activityMaster.id}>
                                              {activityMaster.activityMasterTitle}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>

                                    {/* Activity Title */}
                                    <FormItem>
                                      <FormLabel>Activity Title</FormLabel>
                                      <FormControl>
                                        <Input
                                          disabled={loading}
                                          placeholder="Activity Title"
                                          value={activity.activityTitle || ''}
                                          onChange={(e) => {
                                            const newItineraries = [...value];
                                            newItineraries[index].activities[activityIndex].activityTitle = e.target.value;
                                            onChange(newItineraries);
                                          }}
                                          className="bg-white"
                                        />
                                      </FormControl>
                                    </FormItem>

                                    {/* Activity Description */}
                                    <FormItem>
                                      <FormLabel>Description</FormLabel>
                                      <FormControl>
                                        <Textarea
                                          disabled={loading}
                                          placeholder="Activity Description"
                                          value={activity.activityDescription || ''}
                                          onChange={(e) => {
                                            const newItineraries = [...value];
                                            newItineraries[index].activities[activityIndex].activityDescription = e.target.value;
                                            onChange(newItineraries);
                                          }}
                                          className="bg-white min-h-[100px]"
                                        />
                                      </FormControl>
                                    </FormItem>

                                    {/* Activity Images */}
                                    <FormItem>
                                      <FormLabel>Activity Images</FormLabel>
                                      <div className="bg-slate-50 p-3 rounded-md">
                                        <ImageUpload
                                          value={activity.activityImages?.map(img => img.url) || []}
                                          disabled={loading}
                                          onChange={(url) => {
                                            const newItineraries = [...value];
                                            if (!newItineraries[index].activities[activityIndex].activityImages) {
                                              newItineraries[index].activities[activityIndex].activityImages = [];
                                            }
                                            newItineraries[index].activities[activityIndex].activityImages.push({ url });
                                            onChange(newItineraries);
                                          }}
                                          onRemove={(url) => {
                                            const newItineraries = [...value];
                                            newItineraries[index].activities[activityIndex].activityImages =
                                              newItineraries[index].activities[activityIndex].activityImages?.filter(img => img.url !== url) || [];
                                            onChange(newItineraries);
                                          }}
                                        />
                                      </div>
                                    </FormItem>
                                  </div>
                                </FormItem>
                              </div>
                            </div>
                          )) : (
                            <div className="text-sm text-gray-500 p-4 border rounded-lg">
                              No activities available. Click &quot;Add Activity&quot; to add one.
                            </div>
                          )}

                          <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={loading}
                              onClick={() => {
                                const newItineraries = [...value];
                                const currentActivities = Array.isArray(newItineraries[index].activities) 
                                  ? newItineraries[index].activities 
                                  : [];
                                newItineraries[index].activities = [
                                  ...currentActivities,
                                  { activityTitle: '', activityDescription: '', activityImages: [] }
                                ];
                                onChange(newItineraries);
                              }}
                              className="w-full sm:w-auto min-h-[44px]"
                            >
                              <Plus className="mr-1 h-4 w-4" />
                              Add Activity
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleSaveToMasterItinerary(itinerary)}
                              className="w-full sm:w-auto min-h-[44px]"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Save to Master Itinerary
                            </Button>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                ))}

                <Button
                  type="button"
                  size="default"
                  className="mt-4 w-full sm:w-auto bg-primary/10 hover:bg-primary/20 text-primary hover:text-primary border-dashed border-2 border-primary/30 min-h-[44px]"
                  onClick={() => onChange([...value, {
                    dayNumber: 0,
                    days: '',
                    itineraryImages: [],
                    itineraryTitle: '',
                    itineraryDescription: '',
                    activities: [],
                    roomAllocations: [],
                    transportDetails: [],
                    hotelId: '',
                    locationId: form.getValues('locationId') || ''
                  }])}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Day
                </Button>
              </div>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};

export default ItineraryTab;
