"use client";

import * as z from "zod";
import { Check, ChevronsUpDown, PlusCircle, X, Trash2, Plus } from "lucide-react";
import { Inquiry, Location, AssociatePartner, InquiryAction, RoomType, OccupancyType, MealPlan, VehicleType, RoomAllocation, TransportDetail } from "@prisma/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import axios from "axios";
import { format } from "date-fns";
import { createDatePickerValue, formatLocalDate, normalizeApiDate } from "@/lib/timezone-utils";
import { useAssociatePartner } from "@/hooks/use-associate-partner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ActionHistory } from "./action-history";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { WhatsAppSupplierButton } from "@/components/whatsapp-supplier-button";

const roomAllocationSchema = z.object({
  id: z.string().optional(),
  roomTypeId: z.string().min(1, "Room type is required"),
  occupancyTypeId: z.string().min(1, "Occupancy type is required"),
  mealPlanId: z.string().optional().nullable(),
  quantity: z.number().min(1, "At least one room is required"),
  guestNames: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const transportDetailSchema = z.object({
  id: z.string().optional(),
  vehicleTypeId: z.string().min(1, "Vehicle type is required"),
  quantity: z.number().min(1, "At least one vehicle is required"),
  isAirportPickupRequired: z.boolean().default(false),
  isAirportDropRequired: z.boolean().default(false),
  pickupLocation: z.string().optional().nullable(),
  dropLocation: z.string().optional().nullable(),
  requirementDate: z.date().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const formSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "HOT_QUERY", "QUERY_SENT"]),
  customerName: z.string().min(1),
  customerMobileNumber: z.string().min(1),
  locationId: z.string().min(1, "Please select a location"),
  associatePartnerId: z.string().nullable(),
  numAdults: z.number().min(0),
  numChildren5to11: z.number().min(0),
  numChildrenBelow5: z.number().min(0),
  remarks: z.string().nullable(),
  nextFollowUpDate: z.date().nullable(),
  actions: z.array(z.object({
    actionType: z.string().min(1),
    remarks: z.string().min(1),
    actionDate: z.date(),
  })),
  journeyDate: z.date().nullable(),
  roomAllocations: z.array(roomAllocationSchema).optional().default([]),
  transportDetails: z.array(transportDetailSchema).optional().default([]),
});

type InquiryFormValues = z.infer<typeof formSchema>;

interface InquiryFormProps {
  initialData: (Inquiry & {
    location: Location;
    associatePartner: AssociatePartner | null;
    actions: InquiryAction[];
    roomAllocations?: RoomAllocation[];
    transportDetails?: TransportDetail[];
  }) | null;
  locations: Location[];
  associates: AssociatePartner[];
  actions: InquiryAction[];
  roomTypes: RoomType[];
  occupancyTypes: OccupancyType[];
  mealPlans: MealPlan[];
  vehicleTypes: VehicleType[];
}

export const InquiryForm: React.FC<InquiryFormProps> = ({
  initialData,
  locations,
  associates,
  actions,
  roomTypes,
  occupancyTypes,
  mealPlans,
  vehicleTypes
}) => {  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isAssociateDomain, setIsAssociateDomain] = useState(false);
  // Get associate partner data at the component level
  const { associatePartner } = useAssociatePartner();
    // States for managing room allocations and transport details
  const [showAddRoomAllocation, setShowAddRoomAllocation] = useState(false);
  const [editingRoomAllocationIndex, setEditingRoomAllocationIndex] = useState<number | null>(null);
  const [showAddTransportDetail, setShowAddTransportDetail] = useState(false);
  const [editingTransportDetailIndex, setEditingTransportDetailIndex] = useState<number | null>(null);
    // State to track the current room allocation and transport detail being added
  // Use proper TypeScript interfaces instead of schema types
  const [newRoomAllocation, setNewRoomAllocation] = useState<Partial<{
    roomTypeId: string;
    occupancyTypeId: string;
    mealPlanId?: string | null;
    quantity: number;
    guestNames?: string | null;
    notes?: string | null;
  }>>({});
  const [newTransportDetail, setNewTransportDetail] = useState<Partial<{
    vehicleTypeId: string;
    quantity: number;
    isAirportPickupRequired: boolean;
    isAirportDropRequired: boolean;
    pickupLocation?: string | null;
    dropLocation?: string | null;
    requirementDate?: Date | null;
    notes?: string | null;
  }>>({});

  const title = initialData ? "Edit inquiry" : "Create inquiry";
  const description = initialData ? "Edit an inquiry" : "Add a new inquiry";
  const toastMessage = initialData ? "Inquiry updated." : "Inquiry created.";
  const action = initialData ? "Save changes" : "Create";  const form = useForm<InquiryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      status: initialData.status as "PENDING" | "CONFIRMED" | "CANCELLED" | "HOT_QUERY" | "QUERY_SENT",
      customerName: initialData.customerName,
      customerMobileNumber: initialData.customerMobileNumber,
      locationId: initialData.locationId,
      associatePartnerId: initialData.associatePartnerId,
      // Cast the arrays to the expected types to satisfy TypeScript
      roomAllocations: (initialData.roomAllocations || []) as unknown as z.infer<typeof roomAllocationSchema>[],
      transportDetails: (initialData.transportDetails || []) as unknown as z.infer<typeof transportDetailSchema>[],
      numAdults: initialData.numAdults,
      numChildren5to11: initialData.numChildren5to11,
      numChildrenBelow5: initialData.numChildrenBelow5,
      remarks: initialData.remarks,
  // @ts-ignore - field added recently
  nextFollowUpDate: initialData?.nextFollowUpDate ? new Date(initialData.nextFollowUpDate as any) : null,
      actions: actions.map(action => ({
        actionType: action.actionType,
        remarks: action.remarks,
        actionDate: new Date(action.actionDate),
      })),
      journeyDate: createDatePickerValue(initialData.journeyDate),
    } : {
      status: "PENDING",
      customerName: '',
      customerMobileNumber: '',
      locationId: '',
      associatePartnerId: null,
      numAdults: 0,
      numChildren5to11: 0,
      numChildrenBelow5: 0,
      remarks: '',
  nextFollowUpDate: null,
      actions: [],
      journeyDate: null,
    }
  });

  // Check if we're on the associate domain and auto-select associate partner  // Check if we're on the associate domain and auto-select associate partner
  
  // Handle adding a new room allocation
  const handleAddRoomAllocation = () => {
    // Only add if we have the required fields
    if (!newRoomAllocation.roomTypeId || !newRoomAllocation.occupancyTypeId) {
      toast.error("Room type and occupancy type are required");
      return;
    }
    
    // Ensure quantity is set and is a number
    const completeAllocation = {
      ...newRoomAllocation,
      quantity: typeof newRoomAllocation.quantity === 'number' ? newRoomAllocation.quantity : 1
    };
      // Add to form
    const currentAllocations = form.getValues("roomAllocations") || [];
    // Cast the completeAllocation to the expected type to satisfy TypeScript
    const typedAllocation = completeAllocation as typeof roomAllocationSchema._type;
    form.setValue("roomAllocations", [...currentAllocations, typedAllocation]);
    
    // Reset state
    setShowAddRoomAllocation(false);
    setNewRoomAllocation({});
  };
  // Handle updating an existing room allocation
  const handleUpdateRoomAllocation = (allocation: any, index: number, closeDialog: boolean = false) => {
    const currentAllocations = form.getValues("roomAllocations") || [];
    const updatedAllocations = [...currentAllocations];
    updatedAllocations[index] = {
      ...allocation,
      quantity: allocation.quantity || 1
    };
    form.setValue("roomAllocations", updatedAllocations);
    
    // Only close the dialog if explicitly requested (via the Save button)
    if (closeDialog) {
      setEditingRoomAllocationIndex(null);
    }
  };
  // Handle removing a room allocation
  const handleRemoveRoomAllocation = (index: number) => {
    const currentAllocations = form.getValues("roomAllocations") || [];
    const updatedAllocations = currentAllocations.filter((_, i) => i !== index);
    form.setValue("roomAllocations", updatedAllocations);
  };
  
  // Handle adding a new transport detail
  const handleAddTransportDetail = () => {
    // Only add if we have the required fields
    if (!newTransportDetail.vehicleTypeId) {
      toast.error("Vehicle type is required");
      return;
    }
    
    // Ensure quantity and boolean fields are set with proper types
    const completeDetail = {
      ...newTransportDetail,
      quantity: typeof newTransportDetail.quantity === 'number' ? newTransportDetail.quantity : 1,
      isAirportPickupRequired: Boolean(newTransportDetail.isAirportPickupRequired),
      isAirportDropRequired: Boolean(newTransportDetail.isAirportDropRequired)
    };
      // Add to form
    const currentDetails = form.getValues("transportDetails") || [];
    // Cast the completeDetail to the expected type to satisfy TypeScript
    const typedDetail = completeDetail as typeof transportDetailSchema._type;
    form.setValue("transportDetails", [...currentDetails, typedDetail]);
    
    // Reset state
    setShowAddTransportDetail(false);
    setNewTransportDetail({});
  };
  // Handle updating an existing transport detail
  const handleUpdateTransportDetail = (detail: any, index: number, closeDialog: boolean = false) => {
    const currentDetails = form.getValues("transportDetails") || [];
    const updatedDetails = [...currentDetails];
    updatedDetails[index] = {
      ...detail,
      quantity: detail.quantity || 1,
      isAirportPickupRequired: detail.isAirportPickupRequired || false, 
      isAirportDropRequired: detail.isAirportDropRequired || false
    };
    form.setValue("transportDetails", updatedDetails);
    
    // Only close the dialog if explicitly requested (via the Save button)
    if (closeDialog) {
      setEditingTransportDetailIndex(null);
    }
  };

  // Handle removing a transport detail
  const handleRemoveTransportDetail = (index: number) => {
    const currentDetails = form.getValues("transportDetails") || [];
    const updatedDetails = currentDetails.filter((_, i) => i !== index);
    form.setValue("transportDetails", updatedDetails);
  };
  useEffect(() => {
    if (!initialData) { // Only do this for new inquiries, not when editing
      const hostname = window.location.hostname;
      const isAssociateHostname = hostname === 'associate.aagamholidays.com';      
      setIsAssociateDomain(isAssociateHostname);

      if (isAssociateHostname && associatePartner?.id) {
        // Set the associate partner in the form
        form.setValue('associatePartnerId', associatePartner.id);
      }
    }
  }, [form, initialData, associatePartner]);  const onSubmit = async (data: InquiryFormValues) => {
    try {
      setLoading(true);
      
      console.log("🚀 COMPREHENSIVE FORM SUBMISSION LOGS:");
      console.log("===============================================");
      console.log("1. Raw form data received in onSubmit:");
      console.log("   - Full data object:", data);
      console.log("   - Raw journeyDate:", data.journeyDate);
      console.log("   - journeyDate type:", typeof data.journeyDate);
      
      if (data.journeyDate) {
        console.log("2. Original journeyDate detailed analysis:");
        console.log("   - toString():", data.journeyDate.toString());
        console.log("   - toISOString():", data.journeyDate.toISOString());
        console.log("   - toDateString():", data.journeyDate.toDateString());
        console.log("   - getFullYear():", data.journeyDate.getFullYear());
        console.log("   - getMonth():", data.journeyDate.getMonth(), "(0-based, so add 1 for display)");
        console.log("   - getDate():", data.journeyDate.getDate());
        console.log("   - getHours():", data.journeyDate.getHours());
        console.log("   - getMinutes():", data.journeyDate.getMinutes());
        console.log("   - getTimezoneOffset():", data.journeyDate.getTimezoneOffset(), "minutes");
        console.log("   - User timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);
        
        console.log("3. Expected display date: " + 
          `${data.journeyDate.getDate()}/${data.journeyDate.getMonth() + 1}/${data.journeyDate.getFullYear()}`);
      } else {
        console.log("2. journeyDate is null/undefined");
      }
      
      // Apply timezone normalization to journey date
      const normalizedJourneyDate = normalizeApiDate(data.journeyDate);
      console.log("4. After normalizeApiDate function:");
      console.log("   - normalizedJourneyDate:", normalizedJourneyDate);
      
      if (normalizedJourneyDate) {
        console.log("5. Normalized journeyDate detailed analysis:");
        console.log("   - ISO string result:", normalizedJourneyDate);
        
        // Parse the ISO string to a Date object for analysis
        const normalizedDateObj = new Date(normalizedJourneyDate);
        console.log("   - Parsed Date object:", normalizedDateObj);
        console.log("   - toString():", normalizedDateObj.toString());
        console.log("   - toISOString():", normalizedDateObj.toISOString());
        console.log("   - toDateString():", normalizedDateObj.toDateString());
        console.log("   - getFullYear():", normalizedDateObj.getFullYear());
        console.log("   - getMonth():", normalizedDateObj.getMonth(), "(0-based)");
        console.log("   - getDate():", normalizedDateObj.getDate());
        console.log("   - getHours():", normalizedDateObj.getHours());
        console.log("   - getMinutes():", normalizedDateObj.getMinutes());
        console.log("   - getTimezoneOffset():", normalizedDateObj.getTimezoneOffset(), "minutes");
        
        console.log("6. Expected display date after normalization: " + 
          `${normalizedDateObj.getDate()}/${normalizedDateObj.getMonth() + 1}/${normalizedDateObj.getFullYear()}`);
      } else {
        console.log("5. normalizedJourneyDate is null/undefined");
      }
      
      // Prepare the data - ensure all required fields are properly formatted
      const formattedData = {
        ...data,
  journeyDate: normalizedJourneyDate,
  nextFollowUpDate: data.nextFollowUpDate ? normalizeApiDate(data.nextFollowUpDate) : null,
        roomAllocations: data.roomAllocations?.map(allocation => ({
          ...allocation,
          quantity: Number(allocation.quantity),
          // If mealPlanId is an empty string, convert to null
          mealPlanId: allocation.mealPlanId === "" ? null : allocation.mealPlanId
        })),
        transportDetails: data.transportDetails?.map(detail => ({
          ...detail,
          quantity: Number(detail.quantity),
          // Format requirementDate correctly if it exists
          requirementDate: detail.requirementDate ? detail.requirementDate : null
        }))
      };
      
      console.log("7. Final formattedData being sent to API:");
      console.log("   - formattedData.journeyDate:", formattedData.journeyDate);
      console.log("   - journeyDate ISO string:", formattedData.journeyDate);
      console.log("   - Full JSON payload preview:", JSON.stringify({
        journeyDate: formattedData.journeyDate
      }, null, 2));
      
      if (initialData) {
        console.log("8. Sending PATCH request to:", `/api/inquiries/${initialData.id}`);
        const response = await fetch(`/api/inquiries/${initialData.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formattedData),
        });
        console.log("9. PATCH Response status:", response.status);
        
        if (response.ok) {
          const responseData = await response.json();
          console.log("10. PATCH Response data:", responseData);
          if (responseData.journeyDate) {
            console.log("11. Server returned journeyDate:", responseData.journeyDate);
            console.log("12. Server journeyDate parsed:", new Date(responseData.journeyDate));
          }
        } else {
          console.error("PATCH request failed:", await response.text());
        }
      } else {
        console.log("8. Sending POST request to: /api/inquiries");
        const response = await fetch(`/api/inquiries`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formattedData),
        });
        console.log("9. POST Response status:", response.status);
        
        if (response.ok) {
          const responseData = await response.json();
          console.log("10. POST Response data:", responseData);
          if (responseData.journeyDate) {
            console.log("11. Server returned journeyDate:", responseData.journeyDate);
            console.log("12. Server journeyDate parsed:", new Date(responseData.journeyDate));
          }
        } else {
          console.error("POST request failed:", await response.text());
        }
      }
      console.log("===============================================");
      
      router.refresh();
      router.push(`/inquiries`);
      toast.success(toastMessage);
    } catch (error) {
      console.error("❌ Form submission error:", error);
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // Actions are now managed exclusively via the Action History section below.

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        {/* Add a Back button for mobile users */}
        <div className="md:hidden">
          <Button
            variant="outline"
            type="button"
            onClick={() => router.push('/inquiries')}
            className="text-sm"
          >
            Back
          </Button>
        </div>
      </div>
      <Separator />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
          {/* Changed from grid-cols-3 to a responsive grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FormField
              control={form.control}
              name="associatePartnerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Associate Partner</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          disabled={loading || isAssociateDomain}
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? associates.find(
                                (associate) => associate.id === field.value
                              )?.name
                            : "Search associate..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search associate..." />
                        <CommandEmpty>No associate found.</CommandEmpty>
                        <CommandGroup>
                          {associates.map((associate) => (
                            <CommandItem
                              key={associate.id}
                              value={associate.name}
                              onSelect={() => {
                                field.onChange(associate.id);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  associate.id === field.value
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {associate.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {isAssociateDomain && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Associate partner auto-selected from your domain
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Name</FormLabel>
                  <FormControl>
                    <Input disabled={loading} placeholder="Customer name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customerMobileNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile Number</FormLabel>
                  <FormControl>
                    <Input disabled={loading} placeholder="Mobile number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="locationId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Location</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? locations.find((location) => location.id === field.value)?.label
                            : "Select location"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[280px] md:w-[350px] p-0">
                      <Command>
                        <CommandInput placeholder="Search location..." />
                        <CommandEmpty>
                          No location found.
                        </CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-auto">
                          {locations.map((location) => (
                            <CommandItem
                              value={location.label}
                              key={location.id}
                              onSelect={() => {
                                form.setValue("locationId", location.id);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  location.id === field.value
                                    ? "opacity-100"
                                    : "opacity-0"
                                )} />
                              {location.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="journeyDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Journey Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? formatLocalDate(field.value, "PPP") : "Pick a date"}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={createDatePickerValue(field.value)}
                        onSelect={(date: Date | undefined) => {
                          console.log("🗓️ COMPREHENSIVE JOURNEY DATE SELECTION LOGS:");
                          console.log("=================================================");
                          console.log("1. Raw date from calendar component:", date);
                          
                          if (date) {
                            console.log("2. Original date details:");
                            console.log("   - toString():", date.toString());
                            console.log("   - toISOString():", date.toISOString());
                            console.log("   - toDateString():", date.toDateString());
                            console.log("   - getFullYear():", date.getFullYear());
                            console.log("   - getMonth():", date.getMonth(), "(0-based)");
                            console.log("   - getDate():", date.getDate());
                            console.log("   - getDay():", date.getDay(), "(0=Sunday)");
                            console.log("   - getHours():", date.getHours());
                            console.log("   - getMinutes():", date.getMinutes());
                            console.log("   - getSeconds():", date.getSeconds());
                            console.log("   - getTimezoneOffset():", date.getTimezoneOffset(), "minutes");
                            console.log("   - User timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);
                            
                            console.log("3. Current field value before change:");
                            console.log("   - field.value:", field.value);
                            console.log("   - field.value type:", typeof field.value);
                            console.log("   - field.value toString():", field.value?.toString());
                            
                            // Normalize the date to prevent timezone shifts
                            const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                            console.log("4. After normalization (new Date(year, month, day)):");
                            console.log("   - normalizedDate:", normalizedDate);
                            console.log("   - toString():", normalizedDate.toString());
                            console.log("   - toISOString():", normalizedDate.toISOString());
                            console.log("   - toDateString():", normalizedDate.toDateString());
                            console.log("   - getFullYear():", normalizedDate.getFullYear());
                            console.log("   - getMonth():", normalizedDate.getMonth(), "(0-based)");
                            console.log("   - getDate():", normalizedDate.getDate());
                            console.log("   - getHours():", normalizedDate.getHours());
                            console.log("   - getTimezoneOffset():", normalizedDate.getTimezoneOffset(), "minutes");
                            
                            // Try alternative normalization approach
                            const alternativeDate = new Date(date.toDateString());
                            console.log("5. Alternative normalization (new Date(dateString)):");
                            console.log("   - alternativeDate:", alternativeDate);
                            console.log("   - toString():", alternativeDate.toString());
                            console.log("   - toISOString():", alternativeDate.toISOString());
                            console.log("   - getDate():", alternativeDate.getDate());
                            
                            field.onChange(normalizedDate);
                            console.log("6. Date set in form field with field.onChange()");
                            
                            // Check field value immediately after setting
                            setTimeout(() => {
                              const fieldValueAfter = form.getValues("journeyDate");
                              console.log("7. Field value after onChange (async check):");
                              console.log("   - journeyDate field value:", fieldValueAfter);
                              console.log("   - toString():", fieldValueAfter?.toString());
                              console.log("   - toISOString():", fieldValueAfter?.toISOString());
                              console.log("   - getDate():", fieldValueAfter?.getDate());
                            }, 10);
                          } else {
                            console.log("2. Date is undefined/null");
                          }
                          console.log("=================================================");
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="numAdults"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Adults</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      disabled={loading}
                      placeholder="Number of adults"
                      {...field}
                      onChange={e => field.onChange(+e.target.value)}
                      value={field.value}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="numChildren5to11"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Children 5-11</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      disabled={loading}
                      placeholder="Number of children 5-11"
                      {...field}
                      onChange={e => field.onChange(+e.target.value)}
                      value={field.value}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="numChildrenBelow5"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Children Below 5</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      disabled={loading}
                      placeholder="Number of children below 5"
                      {...field}
                      onChange={e => field.onChange(+e.target.value)}
                      value={field.value}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select disabled={loading} onValueChange={(value: "PENDING" | "CONFIRMED" | "CANCELLED" | "HOT_QUERY" | "QUERY_SENT") => field.onChange(value)} value={field.value} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue defaultValue={field.value} placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="HOT_QUERY">Hot Query</SelectItem>
                      <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      <SelectItem value="QUERY_SENT">Query Sent</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Remarks field spans full width on all screen sizes */}
            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem className="col-span-1 md:col-span-2 lg:col-span-3">
                  <FormLabel>Remarks</FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-[150px] w-full"
                      disabled={loading}
                      placeholder="Add any additional remarks"
                      rows={6}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Follow Up - manage actions via Action History below */}
            <div className="col-span-1 md:col-span-2 lg:col-span-3 space-y-3">
              <h3 className="text-lg font-medium">Follow Up</h3>
              <p className="text-xs text-muted-foreground -mt-2">
                To add or remove action entries, use the Action History section below. Saving the inquiry only updates core fields and follow-up date.
              </p>
              <FormField
                control={form.control}
                name="nextFollowUpDate"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex flex-col md:flex-row md:items-center md:gap-4">
                      <div className="flex-1">
                        <FormLabel>Next Follow Up Date (Optional)</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full md:w-[220px] justify-start pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                type="button"
                              >
                                {field.value ? formatLocalDate(field.value, "PPP") : "Pick a date"}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value || undefined}
                              onSelect={(date) => field.onChange(date || null)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </div>
                      <div className="flex gap-2 mt-2 md:mt-7 flex-wrap">
                        <Button type="button" variant="secondary" size="sm" onClick={() => field.onChange(new Date())}>Today</Button>
                        <Button type="button" variant="secondary" size="sm" onClick={() => { const d=new Date(); d.setDate(d.getDate()+2); field.onChange(d); }}>+2d</Button>
                        <Button type="button" variant="secondary" size="sm" onClick={() => { const d=new Date(); d.setDate(d.getDate()+7); field.onChange(d); }}>+1w</Button>
                        {field.value && (
                          <Button type="button" variant="ghost" size="sm" onClick={() => field.onChange(null)}>Clear</Button>
                        )}
                      </div>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Room Allocation Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Room Allocations</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddRoomAllocation(true)}
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Room Allocation
              </Button>
            </div>

            {/* Display existing room allocations */}
            {form.watch("roomAllocations")?.length > 0 ? (
              <div className="space-y-4">
                {form.watch("roomAllocations").map((allocation, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-2 border rounded-md p-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Room Type</p>
                      <p className="text-sm">{roomTypes.find(rt => rt.id === allocation.roomTypeId)?.name || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Occupancy</p>
                      <p className="text-sm">{occupancyTypes.find(ot => ot.id === allocation.occupancyTypeId)?.name || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Meal Plan</p>
                      <p className="text-sm">{allocation.mealPlanId ? (mealPlans.find(mp => mp.id === allocation.mealPlanId)?.name || '-') : 'None'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Quantity</p>
                      <p className="text-sm">{allocation.quantity}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setEditingRoomAllocationIndex(index)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path><path d="m15 5 4 4"></path></svg>
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => handleRemoveRoomAllocation(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {allocation.notes && (
                      <div className="md:col-span-5 mt-2">
                        <p className="text-sm font-medium">Notes</p>
                        <p className="text-sm text-muted-foreground">{allocation.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md bg-muted p-4 text-center text-sm text-muted-foreground">
                No room allocations added yet. Click the button above to add room details.
              </div>
            )}

            {/* Form for adding/editing a room allocation */}
            {(showAddRoomAllocation || editingRoomAllocationIndex !== null) && (
              <div className="border rounded-md p-4 space-y-4">
                <h4 className="text-sm font-medium">
                  {editingRoomAllocationIndex !== null ? "Edit Room Allocation" : "Add Room Allocation"}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Room Type</label>                    <Select
                      onValueChange={(value) => {
                        if (editingRoomAllocationIndex !== null) {
                          const allocation = {...form.getValues("roomAllocations")[editingRoomAllocationIndex], roomTypeId: value};
                          handleUpdateRoomAllocation(allocation, editingRoomAllocationIndex);
                        } else {
                          setNewRoomAllocation({...newRoomAllocation, roomTypeId: value});
                        }
                      }}
                      defaultValue={editingRoomAllocationIndex !== null 
                        ? form.getValues("roomAllocations")[editingRoomAllocationIndex].roomTypeId 
                        : undefined}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select room type" />
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
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Occupancy Type</label>                    <Select
                      onValueChange={(value) => {
                        if (editingRoomAllocationIndex !== null) {
                          const allocation = {...form.getValues("roomAllocations")[editingRoomAllocationIndex], occupancyTypeId: value};
                          handleUpdateRoomAllocation(allocation, editingRoomAllocationIndex);
                        } else {
                          setNewRoomAllocation({...newRoomAllocation, occupancyTypeId: value});
                        }
                      }}
                      defaultValue={editingRoomAllocationIndex !== null 
                        ? form.getValues("roomAllocations")[editingRoomAllocationIndex].occupancyTypeId 
                        : undefined}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select occupancy type" />
                      </SelectTrigger>
                      <SelectContent>
                        {occupancyTypes.map((occupancyType) => (
                          <SelectItem key={occupancyType.id} value={occupancyType.id}>
                            {occupancyType.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Meal Plan (Optional)</label>                    <Select
                      onValueChange={(value) => {
                        if (editingRoomAllocationIndex !== null) {
                          const allocation = {...form.getValues("roomAllocations")[editingRoomAllocationIndex], mealPlanId: value};
                          handleUpdateRoomAllocation(allocation, editingRoomAllocationIndex);
                        } else {
                          setNewRoomAllocation({...newRoomAllocation, mealPlanId: value});
                        }
                      }}defaultValue={editingRoomAllocationIndex !== null 
                        ? form.getValues("roomAllocations")[editingRoomAllocationIndex].mealPlanId || undefined 
                        : undefined}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select meal plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {mealPlans.map((mealPlan) => (
                          <SelectItem key={mealPlan.id} value={mealPlan.id}>
                            {mealPlan.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Quantity</label>
                    <Input
                      type="number"
                      min="1"
                      defaultValue={editingRoomAllocationIndex !== null 
                        ? form.getValues("roomAllocations")[editingRoomAllocationIndex].quantity 
                        : "1"}                      onChange={(e) => {
                        if (editingRoomAllocationIndex !== null) {
                          const allocation = {...form.getValues("roomAllocations")[editingRoomAllocationIndex], quantity: parseInt(e.target.value)};
                          handleUpdateRoomAllocation(allocation, editingRoomAllocationIndex);
                        } else {
                          setNewRoomAllocation({...newRoomAllocation, quantity: parseInt(e.target.value)});
                        }
                      }}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-medium">Notes (Optional)</label>                    <Textarea
                      placeholder="Enter any special requirements or notes"
                      defaultValue={editingRoomAllocationIndex !== null 
                        ? form.getValues("roomAllocations")[editingRoomAllocationIndex].notes || ""
                        : ""}                      onChange={(e) => {
                        if (editingRoomAllocationIndex !== null) {
                          const allocation = {...form.getValues("roomAllocations")[editingRoomAllocationIndex], notes: e.target.value};
                          handleUpdateRoomAllocation(allocation, editingRoomAllocationIndex);
                        } else {
                          setNewRoomAllocation({...newRoomAllocation, notes: e.target.value});
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2 mt-4">                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddRoomAllocation(false);
                      setEditingRoomAllocationIndex(null);
                      setNewRoomAllocation({}); // Reset state to prevent stale data
                    }}
                  >
                    Cancel
                  </Button>                  <Button
                    type="button"
                    onClick={() => {
                      if (editingRoomAllocationIndex !== null) {
                        // Get the current allocation and explicitly call update with closeDialog=true
                        const currentAllocation = form.getValues("roomAllocations")[editingRoomAllocationIndex];
                        handleUpdateRoomAllocation(currentAllocation, editingRoomAllocationIndex, true);
                      } else {
                        // Call the handler that validates and adds the room allocation
                        handleAddRoomAllocation();
                      }
                    }}
                  >
                    {editingRoomAllocationIndex !== null ? "Save Changes" : "Add"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Transport Details Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Transport Details</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddTransportDetail(true)}
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Transport Detail
              </Button>
            </div>

            {/* Display existing transport details */}
            {form.watch("transportDetails")?.length > 0 ? (
              <div className="space-y-4">
                {form.watch("transportDetails").map((detail, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 border rounded-md p-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Vehicle Type</p>
                      <p className="text-sm">{vehicleTypes.find(vt => vt.id === detail.vehicleTypeId)?.name || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Quantity</p>
                      <p className="text-sm">{detail.quantity}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Services</p>
                      <p className="text-sm">
                        {[
                          detail.isAirportPickupRequired ? "Airport Pickup" : null,
                          detail.isAirportDropRequired ? "Airport Drop" : null
                        ].filter(Boolean).join(", ") || "None"}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setEditingTransportDetailIndex(index)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path><path d="m15 5 4 4"></path></svg>
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => handleRemoveTransportDetail(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {(detail.pickupLocation || detail.dropLocation || detail.notes) && (
                      <div className="md:col-span-4 mt-2">
                        {detail.pickupLocation && (
                          <div className="mb-1">
                            <span className="text-sm font-medium">Pickup: </span>
                            <span className="text-sm">{detail.pickupLocation}</span>
                          </div>
                        )}
                        {detail.dropLocation && (
                          <div className="mb-1">
                            <span className="text-sm font-medium">Drop: </span>
                            <span className="text-sm">{detail.dropLocation}</span>
                          </div>
                        )}
                        {detail.requirementDate && (
                          <div className="mb-1">
                            <span className="text-sm font-medium">Date: </span>
                            <span className="text-sm">{format(new Date(detail.requirementDate), 'PPP')}</span>
                          </div>
                        )}
                        {detail.notes && (
                          <div>
                            <span className="text-sm font-medium">Notes: </span>
                            <span className="text-sm text-muted-foreground">{detail.notes}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md bg-muted p-4 text-center text-sm text-muted-foreground">
                No transport details added yet. Click the button above to add transport requirements.
              </div>
            )}

            {/* Form for adding/editing a transport detail */}
            {(showAddTransportDetail || editingTransportDetailIndex !== null) && (
              <div className="border rounded-md p-4 space-y-4">
                <h4 className="text-sm font-medium">
                  {editingTransportDetailIndex !== null ? "Edit Transport Detail" : "Add Transport Detail"}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Vehicle Type</label>                    <Select
                      onValueChange={(value) => {
                        if (editingTransportDetailIndex !== null) {
                          const detail = {...form.getValues("transportDetails")[editingTransportDetailIndex], vehicleTypeId: value};
                          handleUpdateTransportDetail(detail, editingTransportDetailIndex);
                        } else {
                          setNewTransportDetail({...newTransportDetail, vehicleTypeId: value});
                        }
                      }}
                      defaultValue={editingTransportDetailIndex !== null 
                        ? form.getValues("transportDetails")[editingTransportDetailIndex].vehicleTypeId 
                        : undefined}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select vehicle type" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicleTypes.map((vehicleType) => (
                          <SelectItem key={vehicleType.id} value={vehicleType.id}>
                            {vehicleType.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Quantity</label>
                    <Input
                      type="number"
                      min="1"
                      defaultValue={editingTransportDetailIndex !== null 
                        ? form.getValues("transportDetails")[editingTransportDetailIndex].quantity 
                        : "1"}                      onChange={(e) => {
                        if (editingTransportDetailIndex !== null) {
                          const detail = {...form.getValues("transportDetails")[editingTransportDetailIndex], quantity: parseInt(e.target.value)};
                          handleUpdateTransportDetail(detail, editingTransportDetailIndex);
                        } else {
                          setNewTransportDetail({...newTransportDetail, quantity: parseInt(e.target.value)});
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Pickup Location (Optional)</label>                    <Input
                      placeholder="Enter pickup location"
                      defaultValue={editingTransportDetailIndex !== null 
                        ? form.getValues("transportDetails")[editingTransportDetailIndex].pickupLocation ?? ""
                        : ""}                      onChange={(e) => {
                        if (editingTransportDetailIndex !== null) {
                          const detail = {...form.getValues("transportDetails")[editingTransportDetailIndex], pickupLocation: e.target.value};
                          handleUpdateTransportDetail(detail, editingTransportDetailIndex);
                        } else {
                          setNewTransportDetail({...newTransportDetail, pickupLocation: e.target.value});
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                  <label className="text-sm font-medium">Drop Location (Optional)</label>
                    <Input
                      placeholder="Enter drop location"
                      defaultValue={
                        editingTransportDetailIndex !== null
                          ? form.getValues("transportDetails")[editingTransportDetailIndex].dropLocation ?? ""
                          : ""
                      }                      onChange={(e) => {
                        if (editingTransportDetailIndex !== null) {
                          const detail = { ...form.getValues("transportDetails")[editingTransportDetailIndex], dropLocation: e.target.value };
                          handleUpdateTransportDetail(detail, editingTransportDetailIndex);
                        } else {
                          setNewTransportDetail({...newTransportDetail, dropLocation: e.target.value});
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date Required (Optional)</label>                    <Popover>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" className="w-full justify-start">
                          {editingTransportDetailIndex !== null && form.getValues("transportDetails")[editingTransportDetailIndex]?.requirementDate
                            ? format(new Date(form.getValues("transportDetails")[editingTransportDetailIndex].requirementDate as Date), "PPP")
                            : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={editingTransportDetailIndex !== null && form.getValues("transportDetails")[editingTransportDetailIndex]?.requirementDate
                            ? new Date(form.getValues("transportDetails")[editingTransportDetailIndex].requirementDate as Date)
                            : undefined}                          onSelect={(date) => {
                            if (editingTransportDetailIndex !== null) {
                              const detail = {...form.getValues("transportDetails")[editingTransportDetailIndex], requirementDate: date};
                              handleUpdateTransportDetail(detail, editingTransportDetailIndex);
                            } else {
                              setNewTransportDetail({...newTransportDetail, requirementDate: date});
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="md:col-span-2 flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="airportPickup"
                        defaultChecked={editingTransportDetailIndex !== null
                          ? form.getValues("transportDetails")[editingTransportDetailIndex].isAirportPickupRequired
                          : false}                        onChange={(e) => {
                          if (editingTransportDetailIndex !== null) {
                            const detail = {...form.getValues("transportDetails")[editingTransportDetailIndex], isAirportPickupRequired: e.target.checked};
                            handleUpdateTransportDetail(detail, editingTransportDetailIndex);
                          } else {
                            setNewTransportDetail({...newTransportDetail, isAirportPickupRequired: e.target.checked});
                          }
                        }}
                      />
                      <label htmlFor="airportPickup" className="text-sm font-medium">Airport Pickup</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="airportDrop"
                        defaultChecked={editingTransportDetailIndex !== null
                          ? form.getValues("transportDetails")[editingTransportDetailIndex].isAirportDropRequired
                          : false}                        onChange={(e) => {
                          if (editingTransportDetailIndex !== null) {
                            const detail = {...form.getValues("transportDetails")[editingTransportDetailIndex], isAirportDropRequired: e.target.checked};
                            handleUpdateTransportDetail(detail, editingTransportDetailIndex);
                          } else {
                            setNewTransportDetail({...newTransportDetail, isAirportDropRequired: e.target.checked});
                          }
                        }}
                      />
                      <label htmlFor="airportDrop" className="text-sm font-medium">Airport Drop</label>
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-medium">Notes (Optional)</label>                    <Textarea
                      placeholder="Enter any special requirements or notes"
                      defaultValue={editingTransportDetailIndex !== null 
                        ? form.getValues("transportDetails")[editingTransportDetailIndex].notes ?? "" 
                        : ""}                      onChange={(e) => {
                        if (editingTransportDetailIndex !== null) {
                          const detail = {...form.getValues("transportDetails")[editingTransportDetailIndex], notes: e.target.value};
                          handleUpdateTransportDetail(detail, editingTransportDetailIndex);
                        } else {
                          setNewTransportDetail({...newTransportDetail, notes: e.target.value});
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2 mt-4">                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddTransportDetail(false);
                      setEditingTransportDetailIndex(null);
                      setNewTransportDetail({}); // Reset state to prevent stale data
                    }}
                  >
                    Cancel
                  </Button>                  <Button
                    type="button"
                    onClick={() => {
                      if (editingTransportDetailIndex !== null) {
                        // Get the current detail and explicitly call update with closeDialog=true
                        const currentDetail = form.getValues("transportDetails")[editingTransportDetailIndex];
                        handleUpdateTransportDetail(currentDetail, editingTransportDetailIndex, true);
                      } else {
                        // Call the handler that validates and adds the transport detail
                        handleAddTransportDetail();
                      }
                    }}
                  >
                    {editingTransportDetailIndex !== null ? "Save Changes" : "Add"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Separator className="my-8" />
          {initialData && (
            <ActionHistory
              inquiryId={initialData.id}
              actions={actions}
            />
          )}

          <div className="flex items-center justify-end gap-4 md:gap-6">
            {/* WhatsApp Supplier Button - only show for existing inquiries */}
            {initialData && (
              <WhatsAppSupplierButton
                inquiryData={{
                  id: initialData.id,
                  customerName: form.watch("customerName"),
                  customerMobileNumber: form.watch("customerMobileNumber"),
                  location: locations.find(loc => loc.id === form.watch("locationId"))?.label || "",
                  journeyDate: form.watch("journeyDate")?.toISOString() || null,
                  numAdults: form.watch("numAdults"),
                  numChildren5to11: form.watch("numChildren5to11"),
                  numChildrenBelow5: form.watch("numChildrenBelow5"),
                  remarks: form.watch("remarks"),
                  associatePartner: associates.find(assoc => assoc.id === form.watch("associatePartnerId"))?.name || null,
                }}
                variant="outline"
                size="default"
              />
            )}
            
            {/* Cancel button - more prominent on mobile */}
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/inquiries')}
              className="md:hidden"
            >
              Cancel
            </Button>
            <Button disabled={loading} type="submit">
              {action}
            </Button>
          </div>
        </form>
      </Form >
    </>
  );
};
