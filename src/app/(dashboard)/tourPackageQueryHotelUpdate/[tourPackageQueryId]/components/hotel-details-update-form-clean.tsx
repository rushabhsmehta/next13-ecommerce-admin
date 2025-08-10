"use client";

import * as z from "zod";
import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { Trash, Plus, Save, Hotel, Car, Users, ArrowLeft, MapPin, Clock, Info, Check, ChevronsUpDown } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState, useRef } from "react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Heading } from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

// Types
interface Hotel {
  id: string;
  name: string;
  images: any[];
  // Optional metadata used for filtering by location
  city?: string;
  location?: string;
  address?: string;
  destination?: string;
  locationId?: string; // explicit relation to Location
}

interface RoomType {
  id: string;
  name: string;
}

interface OccupancyType {
  id: string;
  name: string;
}

interface MealPlan {
  id: string;
  name: string;
}

interface VehicleType {
  id: string;
  name: string;
}

interface RoomAllocation {
  id?: string;
  roomTypeId: string;
  occupancyTypeId: string;
  mealPlanId: string;
  numberOfRooms: number;
  roomType?: RoomType;
  occupancyType?: OccupancyType;
  mealPlan?: MealPlan;
}

interface TransportDetail {
  id?: string;
  vehicleTypeId: string;
  numberOfVehicles: number;
  vehicleType?: VehicleType;
  description?: string; // optional extra text if present in data
}

interface HotelDetailsUpdateFormProps {
  initialData: any;
  hotels: Hotel[];
  roomTypes: RoomType[];
  occupancyTypes: OccupancyType[];
  mealPlans: MealPlan[];
  vehicleTypes: VehicleType[];
}

const formSchema = z.object({
  itinerary: z.array(z.object({
    id: z.string(),
    hotelAllocation: z.object({
      hotelId: z.string().min(1, "Hotel is required"),
    }),
    roomAllocations: z.array(z.object({
      roomTypeId: z.string().min(1, "Room type is required"),
      occupancyTypeId: z.string().min(1, "Occupancy type is required"),
      mealPlanId: z.string().min(1, "Meal plan is required"),
      numberOfRooms: z.number().min(1, "Number of rooms must be at least 1"),
    })),
    transportDetails: z.array(z.object({
      vehicleTypeId: z.string().min(1, "Vehicle type is required"),
      numberOfVehicles: z.number().min(1, "Number of vehicles must be at least 1"),
    })),
  })),
});

// Define props interfaces for dialog components to avoid inline complex annotations
interface HotelDetailsDialogProps {
  itineraryIndex: number;
  itinerary: any;
  hotels: Hotel[];
  form: any;
  loading: boolean;
  openHotelDialog: number | null;
  setOpenHotelDialog: (value: number | null) => void;
}

interface RoomDetailsDialogProps {
  itineraryIndex: number;
  itinerary: any;
  roomTypes: RoomType[];
  occupancyTypes: OccupancyType[];
  mealPlans: MealPlan[];
  form: any;
  loading: boolean;
  openRoomDialog: number | null;
  setOpenRoomDialog: (value: number | null) => void;
  addRoomAllocation: (index: number) => void;
  removeRoomAllocation: (itineraryIndex: number, roomIndex: number) => void;
}

interface TransportDetailsDialogProps {
  itineraryIndex: number;
  itinerary: any;
  vehicleTypes: VehicleType[];
  form: any;
  loading: boolean;
  openTransportDialog: number | null;
  setOpenTransportDialog: (value: number | null) => void;
  addTransportDetail: (index: number) => void;
  removeTransportDetail: (itineraryIndex: number, transportIndex: number) => void;
}

// Main Component
export const HotelDetailsUpdateForm: React.FC<HotelDetailsUpdateFormProps> = ({
  initialData,
  hotels,
  roomTypes,
  occupancyTypes,
  mealPlans,
  vehicleTypes
}) => {
  const params = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  // Inline editing: track which day's hotel combobox popover is open
  const [hotelComboOpenIndex, setHotelComboOpenIndex] = useState<number | null>(null);

  const title = "Update Hotel Details";
  const description = "Manage hotel allocations, room details, and transport arrangements for this tour package.";
  const action = "Save changes";

  // Map server data -> form defaults
  const defaultValues = {
    itinerary: (initialData?.itineraries || []).map((item: any) => ({
      id: item.id,
      hotelAllocation: {
        hotelId: item.hotelId || "",
      },
      roomAllocations: (item.roomAllocations || []).map((room: any) => ({
        roomTypeId: room.roomTypeId || "",
        occupancyTypeId: room.occupancyTypeId || "",
        mealPlanId: room.mealPlanId || "",
        numberOfRooms: room.quantity ?? room.numberOfRooms ?? 1,
      })),
      transportDetails: (item.transportDetails || []).map((transport: any) => ({
        vehicleTypeId: transport.vehicleTypeId || "",
        numberOfVehicles: transport.quantity ?? transport.numberOfVehicles ?? 1,
      })),
    })),
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      const payload = {
        itineraries: data.itinerary.map((it) => ({
          id: it.id,
          hotelId: it.hotelAllocation?.hotelId || null,
          roomAllocations: (it.roomAllocations || []).map((r) => ({
            roomTypeId: r.roomTypeId,
            occupancyTypeId: r.occupancyTypeId,
            mealPlanId: r.mealPlanId || null,
            quantity: r.numberOfRooms,
          })),
          transportDetails: (it.transportDetails || []).map((t) => ({
            vehicleTypeId: t.vehicleTypeId,
            quantity: t.numberOfVehicles,
          })),
        })),
      };

      await axios.patch(`/api/tourPackageQuery/${params.tourPackageQueryId}/hotel-details`, payload);
      router.refresh();
      router.push(`/tourPackageQuery`);
      toast.success("Hotel details updated successfully.");
    } catch (error: any) {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const addRoomAllocation = (itineraryIndex: number) => {
    const current = form.getValues(`itinerary.${itineraryIndex}.roomAllocations`) || [];
    form.setValue(`itinerary.${itineraryIndex}.roomAllocations`, [
      ...current,
      { roomTypeId: "", occupancyTypeId: "", mealPlanId: "", numberOfRooms: 1 },
    ]);
  };

  const removeRoomAllocation = (itineraryIndex: number, roomIndex: number) => {
    const current = form.getValues(`itinerary.${itineraryIndex}.roomAllocations`) || [];
    form.setValue(
      `itinerary.${itineraryIndex}.roomAllocations`,
      current.filter((_: any, i: number) => i !== roomIndex)
    );
  };

  const addTransportDetail = (itineraryIndex: number) => {
    const current = form.getValues(`itinerary.${itineraryIndex}.transportDetails`) || [];
    form.setValue(`itinerary.${itineraryIndex}.transportDetails`, [
      ...current,
      { vehicleTypeId: "", numberOfVehicles: 1 },
    ]);
  };

  const removeTransportDetail = (itineraryIndex: number, transportIndex: number) => {
    const current = form.getValues(`itinerary.${itineraryIndex}.transportDetails`) || [];
    form.setValue(
      `itinerary.${itineraryIndex}.transportDetails`,
      current.filter((_: any, i: number) => i !== transportIndex)
    );
  };

  const getHotelName = (hotelId: string) => hotels.find((h) => h.id === hotelId)?.name || "Not selected";
  const getRoomTypeName = (roomTypeId: string) => roomTypes.find((rt) => rt.id === roomTypeId)?.name || "Unknown";
  const getOccupancyTypeName = (occupancyTypeId: string) => occupancyTypes.find((ot) => ot.id === occupancyTypeId)?.name || "Unknown";
  const getMealPlanName = (mealPlanId: string) => mealPlans.find((mp) => mp.id === mealPlanId)?.name || "Unknown";
  const getVehicleTypeName = (vehicleTypeId: string) => vehicleTypes.find((vt) => vt.id === vehicleTypeId)?.name || "Unknown";

  // Guess a location string from itinerary data and filter hotels accordingly
  const guessItineraryLocation = (it: any): string => {
    const raw = (it?.destination || it?.city || it?.location || "").toString();
    if (!raw) return "";
    // Take first segment before '-' or '(' and trim numbers
    const first = raw.split("-")[0].split("(")[0].trim();
    // Remove extra descriptors like 'via', 'local', 'sightseeing' suffixes
    const cleaned = first.replace(/\b(via|local|sightseeing|tour)\b/gi, "").trim();
    return cleaned;
  };

  const filterHotelsForItinerary = (it: any): { list: Hotel[]; label: string } => {
    // Prefer strict filtering by Location Id available in the query JSON
    const locId = it?.locationId || (initialData as any)?.locationId;
    if (locId) {
      const list = hotels.filter((h) => (h as any).locationId === locId);
      return { list, label: "Selected location" };
    }

    // Fallback: try to infer from destination text
    const loc = guessItineraryLocation(it);
    if (!loc) return { list: hotels, label: "All locations" };
    const needle = loc.toLowerCase();
    const list = hotels.filter((h) => {
      const hay = [h.name, (h as any).city, (h as any).location, (h as any).address, (h as any).destination]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
    return { list, label: loc };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg shadow">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/tourPackageQuery')}
                className="text-white hover:bg-white/20"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Tour Packages
              </Button>
            </div>
            <div className="mt-4">
              <Heading title={title} description={description} />
            </div>
          </CardHeader>

          <CardContent className="p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <Alert className="border-blue-200 bg-blue-50">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    Update hotel allocations, room configurations, and transport details for each day of the tour.
                    Click on the respective buttons to modify details for each section.
                  </AlertDescription>
                </Alert>

                <div className="space-y-6">
                  <Accordion type="multiple" className="space-y-4">
                    {(initialData?.itineraries || []).map((itinerary: any, itineraryIndex: number) => {
                      const rooms: RoomAllocation[] = form.watch(`itinerary.${itineraryIndex}.roomAllocations`) || [];
                      const transports: TransportDetail[] = form.watch(`itinerary.${itineraryIndex}.transportDetails`) || [];
                      // Aesthetic summaries for the header
                      const hotelName = hotels.find(h => h.id === form.watch(`itinerary.${itineraryIndex}.hotelAllocation.hotelId`))?.name || "Not selected";
                      const totalRooms = rooms.reduce((sum, _r, idx) => sum + (form.watch(`itinerary.${itineraryIndex}.roomAllocations.${idx}.numberOfRooms`) || 0), 0);
                      const totalVehicles = transports.reduce((sum, _t, idx) => sum + (form.watch(`itinerary.${itineraryIndex}.transportDetails.${idx}.numberOfVehicles`) || 0), 0);
                      const selectedHotelObj = hotels.find(h => h.id === form.watch(`itinerary.${itineraryIndex}.hotelAllocation.hotelId`));
                      const { list: filteredHotels, label: filterLabel } = filterHotelsForItinerary(itinerary);

                      // Build readable summaries to show in header
                      const roomSummary = rooms
                        .map((_, roomIdx) => {
                          const rt = getRoomTypeName(form.watch(`itinerary.${itineraryIndex}.roomAllocations.${roomIdx}.roomTypeId`));
                          const oc = getOccupancyTypeName(form.watch(`itinerary.${itineraryIndex}.roomAllocations.${roomIdx}.occupancyTypeId`));
                          const mp = getMealPlanName(form.watch(`itinerary.${itineraryIndex}.roomAllocations.${roomIdx}.mealPlanId`));
                          const qty = form.watch(`itinerary.${itineraryIndex}.roomAllocations.${roomIdx}.numberOfRooms`) || 0;
                          if (!rt || rt === 'Unknown') return '';
                          return `${qty} x ${rt} ${oc}${mp ? ` (${mp})` : ''}`.trim();
                        })
                        .filter(Boolean)
                        .join(' • ');

                      const transportSummary = transports
                        .map((_, tIdx) => {
                          const vt = getVehicleTypeName(form.watch(`itinerary.${itineraryIndex}.transportDetails.${tIdx}.vehicleTypeId`));
                          const qty = form.watch(`itinerary.${itineraryIndex}.transportDetails.${tIdx}.numberOfVehicles`) || 0;
                          const desc = (form.watch(`itinerary.${itineraryIndex}.transportDetails.${tIdx}.description` as any) as string) || '';
                          if (!vt || vt === 'Unknown') return '';
                          return `${qty} x ${vt}${desc ? ` - ${desc}` : ''}`.trim();
                        })
                        .filter(Boolean)
                        .join(' • ');

                      return (
                        <AccordionItem 
                          key={itinerary.id} 
                          value={`day-${itineraryIndex}`}
                          className="border-2 border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:border-gray-300 transition-all data-[state=open]:ring-1 data-[state=open]:ring-indigo-200"
                        >
                          <AccordionTrigger className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 data-[state=open]:from-white data-[state=open]:to-white rounded-t-lg">
                            <div className="flex items-center justify-between w-full mr-4">
                              <div className="flex items-center space-x-4">
                                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                                  Day {itineraryIndex + 1}
                                </Badge>
                                <div className="text-left">
                                  <h3 className="font-semibold text-lg text-gray-900">Day {itinerary?.dayNumber ?? (itineraryIndex + 1)}</h3>
                                  {itinerary?.itineraryTitle && (
                                    <div
                                      className="text-sm text-gray-700"
                                      dangerouslySetInnerHTML={{ __html: itinerary.itineraryTitle }}
                                    />
                                  )}
                                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                                    {itinerary?.destination && (
                                      <>
                                        <MapPin className="h-4 w-4" />
                                        <span>{itinerary.destination}</span>
                                      </>
                                    )}
                                    {itinerary?.date && (
                                      <span>{itinerary.date}</span>
                                    )}
                                    {itinerary?.days && !itinerary?.date && (
                                      <span>{itinerary.days}</span>
                                    )}
                                  </div>
                                  {/* Summary inline in header */}
                                  <div className="mt-1 space-y-1 text-xs text-gray-700 max-w-[60vw] md:max-w-[48rem]">
                                    {roomSummary && (
                                      <div className="flex items-start gap-2">
                                        <Users className="h-3.5 w-3.5 mt-0.5" />
                                        <span className="truncate" title={roomSummary}>Rooms: {roomSummary}</span>
                                      </div>
                                    )}
                                    {transportSummary && (
                                      <div className="flex items-start gap-2">
                                        <Car className="h-3.5 w-3.5 mt-0.5" />
                                        <span className="truncate" title={transportSummary}>Transport: {transportSummary}</span>
                                      </div>
                                    )}
                                  </div>
                                  {/* Compact summary chips */}
                                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 border border-blue-200 max-w-[18rem] truncate">
                                      <Hotel className="h-3 w-3 mr-1" />
                                      <span className="truncate">{hotelName}</span>
                                    </Badge>
                                    <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">
                                      <Users className="h-3 w-3 mr-1" />{totalRooms} rooms
                                    </Badge>
                                    <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-200">
                                      <Car className="h-3 w-3 mr-1" />{totalVehicles} vehicles
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              <div className="hidden md:flex items-center gap-2" />
                            </div>
                          </AccordionTrigger>
                          
                          <AccordionContent className="px-6 py-6 bg-white rounded-b-lg">
                            <div className="space-y-6">
                              {/* Hotel Details Section */}
                              <div className="border border-blue-200 rounded-lg p-4 bg-blue-50 shadow-sm">
                                 <div className="flex items-center justify-between mb-3">
                                   <h4 className="font-semibold text-blue-900 flex items-center">
                                     <Hotel className="mr-2 h-5 w-5" />
                                     Hotel Details
                                   </h4>
                                 </div>
                                 <div className="text-sm text-blue-800 flex items-center gap-3">
                                   {selectedHotelObj?.images?.[0]?.url && (
                                     <Image src={selectedHotelObj.images[0].url} alt={hotelName} width={56} height={40} className="rounded object-cover ring-1 ring-blue-200" />
                                   )}
                                   <p><strong>Selected Hotel:</strong> {hotelName}</p>
                                 </div>
                                <div className="mt-3">
                                  <FormField
                                    control={form.control}
                                    name={`itinerary.${itineraryIndex}.hotelAllocation.hotelId`}
                                    render={({ field }) => {
                                      const selectedHotel = hotels.find((h) => h.id === field.value);
                                      const hotelComboOpen = hotelComboOpenIndex === itineraryIndex;
                                      return (
                                        <FormItem>
                                          <FormLabel>Change Hotel</FormLabel>
                                          <Popover
                                            open={hotelComboOpen}
                                            onOpenChange={(open) => setHotelComboOpenIndex(open ? itineraryIndex : null)}
                                          >
                                            <PopoverTrigger asChild>
                                              <Button
                                                type="button"
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={hotelComboOpen}
                                                className="w-full justify-between"
                                              >
                                                <span className="truncate">
                                                  {selectedHotel ? selectedHotel.name : "Select a hotel"}
                                                </span>
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                              </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="z-[60] w-[32rem] max-w-[90vw] max-h-[420px] p-0 overflow-hidden" align="start">
                                              <div className="px-3 pt-3 pb-2 text-xs text-gray-500">Showing hotels for: <span className="font-medium text-gray-700">{filterLabel}</span></div>
                                              <Command onKeyDownCapture={(e) => e.stopPropagation()}>
                                                <CommandInput placeholder="Search hotel..." onKeyDownCapture={(e) => e.stopPropagation()} />
                                                <CommandList className="max-h-[360px] overflow-y-auto">
                                                  <CommandEmpty>No hotels found.</CommandEmpty>
                                                  <CommandGroup>
                                                    {filteredHotels.map((hotel) => (
                                                      <CommandItem
                                                        key={hotel.id}
                                                        value={hotel.name}
                                                        onKeyDownCapture={(e) => e.stopPropagation()}
                                                        onSelect={() => {
                                                          field.onChange(hotel.id);
                                                          setHotelComboOpenIndex(null);
                                                        }}
                                                      >
                                                        {hotel.images?.[0]?.url && (
                                                          <Image
                                                            src={hotel.images[0].url}
                                                            alt={hotel.name}
                                                            width={32}
                                                            height={24}
                                                            className="mr-2 rounded object-cover"
                                                          />
                                                        )}
                                                        <span className="flex-1 truncate">{hotel.name}</span>
                                                        {field.value === hotel.id && (
                                                          <Check className="ml-2 h-4 w-4 text-blue-600" />
                                                        )}
                                                      </CommandItem>
                                                    ))}
                                                  </CommandGroup>
                                                </CommandList>
                                              </Command>
                                            </PopoverContent>
                                          </Popover>
                                          <FormMessage />
                                        </FormItem>
                                      );
                                    }}
                                  />
                                </div>
                               </div>

                               {/* Room Allocation Section */}
                               <div className="border border-green-200 rounded-lg p-4 bg-green-50 shadow-sm">
                                 <div className="flex items-center justify-between mb-3">
                                   <h4 className="font-semibold text-green-900 flex items-center">
                                     <Users className="mr-2 h-5 w-5" />
                                     Room Allocation
                                   </h4>
                                 </div>
                                 <div className="space-y-2 text-sm text-green-800">
                                   {rooms.length > 0 ? (
                                     rooms.map((room: any, roomIndex: number) => (
                                       <div key={roomIndex} className="flex items-center space-x-2">
                                         <Badge variant="outline" className="bg-white">{roomIndex + 1}</Badge>
                                         <span>
                                           {getRoomTypeName(form.watch(`itinerary.${itineraryIndex}.roomAllocations.${roomIndex}.roomTypeId`))} - 
                                           {getOccupancyTypeName(form.watch(`itinerary.${itineraryIndex}.roomAllocations.${roomIndex}.occupancyTypeId`))} - 
                                           {getMealPlanName(form.watch(`itinerary.${itineraryIndex}.roomAllocations.${roomIndex}.mealPlanId`))} 
                                           ({form.watch(`itinerary.${itineraryIndex}.roomAllocations.${roomIndex}.numberOfRooms`)} rooms)
                                         </span>
                                       </div>
                                     ))
                                   ) : (
                                     <p className="text-gray-600 italic">No room allocations configured</p>
                                   )}
                                 </div>
                                <div className="mt-4 space-y-4">
                                  {rooms.map((room: RoomAllocation, roomIndex: number) => (
                                    <Card key={roomIndex} className="border-green-200">
                                      <CardHeader className="bg-green-50 pb-3">
                                        <div className="flex items-center justify-between">
                                          <CardTitle className="text-lg text-green-800">Room {roomIndex + 1}</CardTitle>
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => removeRoomAllocation(itineraryIndex, roomIndex)}
                                            disabled={loading}
                                            className="border-red-300 text-red-700 hover:bg-red-100"
                                          >
                                            <Trash className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </CardHeader>
                                      <CardContent className="pt-4 space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                          <FormField
                                            control={form.control}
                                            name={`itinerary.${itineraryIndex}.roomAllocations.${roomIndex}.roomTypeId`}
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>Room Type</FormLabel>
                                                <Select disabled={loading} onValueChange={field.onChange} value={field.value}>
                                                  <FormControl>
                                                    <SelectTrigger>
                                                      <SelectValue placeholder="Select room type" />
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

                                          <FormField
                                            control={form.control}
                                            name={`itinerary.${itineraryIndex}.roomAllocations.${roomIndex}.occupancyTypeId`}
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>Occupancy Type</FormLabel>
                                                <Select disabled={loading} onValueChange={field.onChange} value={field.value}>
                                                  <FormControl>
                                                    <SelectTrigger>
                                                      <SelectValue placeholder="Select occupancy" />
                                                    </SelectTrigger>
                                                  </FormControl>
                                                  <SelectContent>
                                                    {occupancyTypes.map((occupancyType) => (
                                                      <SelectItem key={occupancyType.id} value={occupancyType.id}>
                                                        {occupancyType.name}
                                                      </SelectItem>
                                                    ))}
                                                  </SelectContent>
                                                </Select>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />

                                          <FormField
                                            control={form.control}
                                            name={`itinerary.${itineraryIndex}.roomAllocations.${roomIndex}.mealPlanId`}
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>Meal Plan</FormLabel>
                                                <Select disabled={loading} onValueChange={field.onChange} value={field.value}>
                                                  <FormControl>
                                                    <SelectTrigger>
                                                      <SelectValue placeholder="Select meal plan" />
                                                    </SelectTrigger>
                                                  </FormControl>
                                                  <SelectContent>
                                                    {mealPlans.map((mealPlan) => (
                                                      <SelectItem key={mealPlan.id} value={mealPlan.id}>
                                                        {mealPlan.name}
                                                      </SelectItem>
                                                    ))}
                                                  </SelectContent>
                                                </Select>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />

                                          <FormField
                                            control={form.control}
                                            name={`itinerary.${itineraryIndex}.roomAllocations.${roomIndex}.numberOfRooms`}
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>Number of Rooms</FormLabel>
                                                <FormControl>
                                                  <Input
                                                    type="number"
                                                    disabled={loading}
                                                    placeholder="Number of rooms"
                                                    {...field}
                                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                                  />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}

                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => addRoomAllocation(itineraryIndex)}
                                    disabled={loading}
                                    className="w-full border-green-300 text-green-700 hover:bg-green-100"
                                  >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Room Allocation
                                  </Button>
                                </div>
                               </div>

                               {/* Transport Details Section */}
                               <div className="border border-purple-200 rounded-lg p-4 bg-purple-50 shadow-sm">
                                 <div className="flex items-center justify-between mb-3">
                                   <h4 className="font-semibold text-purple-900 flex items-center">
                                     <Car className="mr-2 h-5 w-5" />
                                     Transport Details
                                   </h4>
                                 </div>
                                 <div className="space-y-2 text-sm text-purple-800">
                                   {transports.length > 0 ? (
                                     transports.map((transport: any, transportIndex: number) => (
                                       <div key={transportIndex} className="flex items-center space-x-2">
                                         <Badge variant="outline" className="bg-white">{transportIndex + 1}</Badge>
                                         <span>
                                           {getVehicleTypeName(form.watch(`itinerary.${itineraryIndex}.transportDetails.${transportIndex}.vehicleTypeId`))} 
                                           ({form.watch(`itinerary.${itineraryIndex}.transportDetails.${transportIndex}.numberOfVehicles`)} vehicles)
                                         </span>
                                       </div>
                                     ))
                                   ) : (
                                     <p className="text-gray-600 italic">No transport details configured</p>
                                   )}
                                 </div>
                                <div className="mt-4 space-y-4">
                                  {transports.map((transport: TransportDetail, transportIndex: number) => (
                                    <Card key={transportIndex} className="border-purple-200">
                                      <CardHeader className="bg-purple-50 pb-3">
                                        <div className="flex items-center justify-between">
                                          <CardTitle className="text-lg text-purple-800">Vehicle {transportIndex + 1}</CardTitle>
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => removeTransportDetail(itineraryIndex, transportIndex)}
                                            disabled={loading}
                                            className="border-red-300 text-red-700 hover:bg-red-100"
                                          >
                                            <Trash className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </CardHeader>
                                      <CardContent className="pt-4 space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <FormField
                                            control={form.control}
                                            name={`itinerary.${itineraryIndex}.transportDetails.${transportIndex}.vehicleTypeId`}
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>Vehicle Type</FormLabel>
                                                <Select disabled={loading} onValueChange={field.onChange} value={field.value}>
                                                  <FormControl>
                                                    <SelectTrigger>
                                                      <SelectValue placeholder="Select vehicle type" />
                                                    </SelectTrigger>
                                                  </FormControl>
                                                  <SelectContent>
                                                    {vehicleTypes.map((vehicleType) => (
                                                      <SelectItem key={vehicleType.id} value={vehicleType.id}>
                                                        {vehicleType.name}
                                                      </SelectItem>
                                                    ))}
                                                  </SelectContent>
                                                </Select>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />

                                          <FormField
                                            control={form.control}
                                            name={`itinerary.${itineraryIndex}.transportDetails.${transportIndex}.numberOfVehicles`}
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel>Number of Vehicles</FormLabel>
                                                <FormControl>
                                                  <Input
                                                    type="number"
                                                    disabled={loading}
                                                    placeholder="Number of vehicles"
                                                    {...field}
                                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                                  />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}

                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => addTransportDetail(itineraryIndex)}
                                    disabled={loading}
                                    className="w-full border-purple-300 text-purple-700 hover:bg-purple-100"
                                  >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Transport Detail
                                  </Button>
                                </div>
                               </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </div>

                <Separator className="my-8" />

                <div className="flex items-center space-x-4">
                  <Button 
                    disabled={loading} 
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-2"
                    type="submit"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {action}
                  </Button>
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/tourPackageQuery')}
                    disabled={loading}
                    className="px-8 py-2"
                  >
                    Cancel
                  </Button>
                  <span className="text-sm text-gray-500">Changes are saved for the whole package.</span>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HotelDetailsUpdateForm;
