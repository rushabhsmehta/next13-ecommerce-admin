"use client";

import * as z from "zod";
import { Check, ChevronsUpDown, PlusCircle, X, Trash2, Plus } from "lucide-react";
import { Inquiry, Location, AssociatePartner, InquiryAction, RoomType, OccupancyType, MealPlan, VehicleType } from "@prisma/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import axios from "axios";
import { format } from "date-fns";
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
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "HOT_QUERY"]),
  customerName: z.string().min(1),
  customerMobileNumber: z.string().min(1),
  locationId: z.string().min(1, "Please select a location"),
  associatePartnerId: z.string().nullable(),
  numAdults: z.number().min(0),
  numChildren5to11: z.number().min(0),
  numChildrenBelow5: z.number().min(0),
  remarks: z.string().nullable(),
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
    roomAllocations?: (any & {
      roomType: RoomType;
      occupancyType: OccupancyType;
      mealPlan: MealPlan | null;
    })[];
    transportDetails?: (any & {
      vehicleType: VehicleType;
    })[];
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
  
  // States for managing room allocations and transport details
  const [showAddRoomAllocation, setShowAddRoomAllocation] = useState(false);
  const [editingRoomAllocationIndex, setEditingRoomAllocationIndex] = useState<number | null>(null);
  const [showAddTransportDetail, setShowAddTransportDetail] = useState(false);
  const [editingTransportDetailIndex, setEditingTransportDetailIndex] = useState<number | null>(null);

  const title = initialData ? "Edit inquiry" : "Create inquiry";
  const description = initialData ? "Edit an inquiry" : "Add a new inquiry";
  const toastMessage = initialData ? "Inquiry updated." : "Inquiry created.";
  const action = initialData ? "Save changes" : "Create";
  const form = useForm<InquiryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      status: initialData.status as "PENDING" | "CONFIRMED" | "CANCELLED" | "HOT_QUERY",
      customerName: initialData.customerName,
      customerMobileNumber: initialData.customerMobileNumber,
      locationId: initialData.locationId,
      associatePartnerId: initialData.associatePartnerId,
      roomAllocations: initialData.roomAllocations || [],
      transportDetails: initialData.transportDetails || [],
      numAdults: initialData.numAdults,
      numChildren5to11: initialData.numChildren5to11,
      numChildrenBelow5: initialData.numChildrenBelow5,
      remarks: initialData.remarks,
      actions: actions.map(action => ({
        actionType: action.actionType,
        remarks: action.remarks,
        actionDate: new Date(action.actionDate),
      })),
      journeyDate: initialData.journeyDate ? new Date(initialData.journeyDate) : null,
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
      actions: [],
      journeyDate: null,
    }
  });

  // Check if we're on the associate domain and auto-select associate partner  // Handle adding a new room allocation
  const handleAddRoomAllocation = (allocation: any) => {
    const currentAllocations = form.getValues("roomAllocations") || [];
    form.setValue("roomAllocations", [...currentAllocations, allocation]);
    setShowAddRoomAllocation(false);
  };

  // Handle updating an existing room allocation
  const handleUpdateRoomAllocation = (allocation: any, index: number) => {
    const currentAllocations = form.getValues("roomAllocations") || [];
    const updatedAllocations = [...currentAllocations];
    updatedAllocations[index] = allocation;
    form.setValue("roomAllocations", updatedAllocations);
    setEditingRoomAllocationIndex(null);
  };

  // Handle removing a room allocation
  const handleRemoveRoomAllocation = (index: number) => {
    const currentAllocations = form.getValues("roomAllocations") || [];
    const updatedAllocations = currentAllocations.filter((_, i) => i !== index);
    form.setValue("roomAllocations", updatedAllocations);
  };

  // Handle adding a new transport detail
  const handleAddTransportDetail = (detail: any) => {
    const currentDetails = form.getValues("transportDetails") || [];
    form.setValue("transportDetails", [...currentDetails, detail]);
    setShowAddTransportDetail(false);
  };

  // Handle updating an existing transport detail
  const handleUpdateTransportDetail = (detail: any, index: number) => {
    const currentDetails = form.getValues("transportDetails") || [];
    const updatedDetails = [...currentDetails];
    updatedDetails[index] = detail;
    form.setValue("transportDetails", updatedDetails);
    setEditingTransportDetailIndex(null);
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

      if (isAssociateHostname) {
        // Get associate info from API
        fetch('/api/associate-partners/me')
          .then(res => {
            if (res.ok) return res.json();
            return null;
          })
          .then(associate => {
            if (associate && associate.id) {
              // Set the associate partner in the form
              form.setValue('associatePartnerId', associate.id);
            }
          })
          .catch(err => {
            console.error('Error fetching associate information:', err);
          });
      }
    }
  }, [form, initialData]);
  const onSubmit = async (data: InquiryFormValues) => {
    try {
      setLoading(true);
      // Prepare the data - ensure all required fields are properly formatted
      const formattedData = {
        ...data,
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
      
      if (initialData) {
        await fetch(`/api/inquiries/${initialData.id}`, {
          method: 'PATCH',
          body: JSON.stringify(formattedData),
        });
      } else {
        await fetch(`/api/inquiries`, {
          method: 'POST',
          body: JSON.stringify(data),
        });
      }
      router.refresh();
      router.push(`/inquiries`);
      toast.success(toastMessage);
    } catch (error) {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const onAddAction = () => {
    const currentActions = form.getValues("actions") || [];
    form.setValue("actions", [
      ...currentActions,
      { actionType: "", remarks: "", actionDate: new Date() }
    ]);
  };

  const onRemoveAction = (index: number) => {
    const currentActions = form.getValues("actions");
    form.setValue("actions", currentActions.filter((_, i) => i !== index));
  };

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">            <FormField
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
                          {field.value ? format(field.value, "PPP") : "Pick a date"}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={(date: Date | undefined) => date && field.onChange(date)}
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
                  <FormLabel>Status</FormLabel>                  <Select disabled={loading} onValueChange={(value: "PENDING" | "CONFIRMED" | "CANCELLED" | "HOT_QUERY") => field.onChange(value)} value={field.value} defaultValue={field.value}>
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
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Remarks field spans full width on all screen sizes */}
            <FormField              control={form.control}
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

            {/* Add Actions Section - spans full width */}
            <div className="col-span-1 md:col-span-2 lg:col-span-3 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Actions</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onAddAction}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Action
                </Button>
              </div>

              {form.watch("actions")?.map((_, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 border rounded-md p-4">
                  <FormField
                    control={form.control}
                    name={`actions.${index}.actionType`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="md:sr-only">Action Type</FormLabel>
                        <Select
                          disabled={loading}
                          onValueChange={field.onChange}
                          value={field.value}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select action type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="CALL">Call</SelectItem>
                            <SelectItem value="MESSAGE">Message</SelectItem>
                            <SelectItem value="EMAIL">Email</SelectItem>
                            <SelectItem value="MEETING">Meeting</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`actions.${index}.actionDate`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="md:sr-only">Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant="outline" className="w-full justify-start">
                                {field.value ? format(field.value, "PPP") : "Pick a date"}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => date && field.onChange(date)}
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
                    name={`actions.${index}.remarks`}
                    render={({ field }) => (
                      <FormItem className="md:col-span-1">
                        <FormLabel className="md:sr-only">Remarks</FormLabel>
                        <FormControl>
                          <Textarea
                            disabled={loading}
                            placeholder="Enter remarks"
                            {...field}
                            className="min-h-[60px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => onRemoveAction(index)}
                      className="ml-auto"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>          </div>

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
                    <label className="text-sm font-medium">Room Type</label>
                    <Select
                      onValueChange={(value) => {
                        const allocation = editingRoomAllocationIndex !== null
                          ? {...form.getValues("roomAllocations")[editingRoomAllocationIndex], roomTypeId: value}
                          : {roomTypeId: value}
                        if (editingRoomAllocationIndex !== null) {
                          handleUpdateRoomAllocation(allocation, editingRoomAllocationIndex);
                        } else {
                          handleAddRoomAllocation(allocation);
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
                    <label className="text-sm font-medium">Occupancy Type</label>
                    <Select
                      onValueChange={(value) => {
                        const allocation = editingRoomAllocationIndex !== null
                          ? {...form.getValues("roomAllocations")[editingRoomAllocationIndex], occupancyTypeId: value}
                          : {occupancyTypeId: value}
                        if (editingRoomAllocationIndex !== null) {
                          handleUpdateRoomAllocation(allocation, editingRoomAllocationIndex);
                        } else {
                          handleAddRoomAllocation(allocation);
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
                    <label className="text-sm font-medium">Meal Plan (Optional)</label>
                    <Select
                      onValueChange={(value) => {
                        const allocation = editingRoomAllocationIndex !== null
                          ? {...form.getValues("roomAllocations")[editingRoomAllocationIndex], mealPlanId: value}
                          : {mealPlanId: value}
                        if (editingRoomAllocationIndex !== null) {
                          handleUpdateRoomAllocation(allocation, editingRoomAllocationIndex);
                        } else {
                          handleAddRoomAllocation(allocation);
                        }
                      }}                      defaultValue={editingRoomAllocationIndex !== null 
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
                        : "1"}
                      onChange={(e) => {
                        const allocation = editingRoomAllocationIndex !== null
                          ? {...form.getValues("roomAllocations")[editingRoomAllocationIndex], quantity: parseInt(e.target.value)}
                          : {quantity: parseInt(e.target.value)}
                        if (editingRoomAllocationIndex !== null) {
                          handleUpdateRoomAllocation(allocation, editingRoomAllocationIndex);
                        } else {
                          handleAddRoomAllocation(allocation);
                        }
                      }}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-medium">Notes (Optional)</label>                    <Textarea
                      placeholder="Enter any special requirements or notes"
                      defaultValue={editingRoomAllocationIndex !== null 
                        ? form.getValues("roomAllocations")[editingRoomAllocationIndex].notes || ""
                        : ""}
                      onChange={(e) => {
                        const allocation = editingRoomAllocationIndex !== null
                          ? {...form.getValues("roomAllocations")[editingRoomAllocationIndex], notes: e.target.value}
                          : {notes: e.target.value}
                        if (editingRoomAllocationIndex !== null) {
                          handleUpdateRoomAllocation(allocation, editingRoomAllocationIndex);
                        } else {
                          handleAddRoomAllocation(allocation);
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2 mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddRoomAllocation(false);
                      setEditingRoomAllocationIndex(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (editingRoomAllocationIndex !== null) {
                        setEditingRoomAllocationIndex(null);
                      } else {
                        setShowAddRoomAllocation(false);
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
                    <label className="text-sm font-medium">Vehicle Type</label>
                    <Select
                      onValueChange={(value) => {
                        const detail = editingTransportDetailIndex !== null
                          ? {...form.getValues("transportDetails")[editingTransportDetailIndex], vehicleTypeId: value}
                          : {vehicleTypeId: value}
                        if (editingTransportDetailIndex !== null) {
                          handleUpdateTransportDetail(detail, editingTransportDetailIndex);
                        } else {
                          handleAddTransportDetail(detail);
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
                        : "1"}
                      onChange={(e) => {
                        const detail = editingTransportDetailIndex !== null
                          ? {...form.getValues("transportDetails")[editingTransportDetailIndex], quantity: parseInt(e.target.value)}
                          : {quantity: parseInt(e.target.value)}
                        if (editingTransportDetailIndex !== null) {
                          handleUpdateTransportDetail(detail, editingTransportDetailIndex);
                        } else {
                          handleAddTransportDetail(detail);
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Pickup Location (Optional)</label>                    <Input
                      placeholder="Enter pickup location"
                      defaultValue={editingTransportDetailIndex !== null 
                        ? form.getValues("transportDetails")[editingTransportDetailIndex].pickupLocation ?? ""
                        : ""}
                      onChange={(e) => {
                        const detail = editingTransportDetailIndex !== null
                          ? {...form.getValues("transportDetails")[editingTransportDetailIndex], pickupLocation: e.target.value}
                          : {pickupLocation: e.target.value}
                        if (editingTransportDetailIndex !== null) {
                          handleUpdateTransportDetail(detail, editingTransportDetailIndex);
                        } else {
                          handleAddTransportDetail(detail);
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
                      }
                      onChange={(e) => {
                        const detail =
                          editingTransportDetailIndex !== null
                            ? { ...form.getValues("transportDetails")[editingTransportDetailIndex], dropLocation: e.target.value }
                            : { dropLocation: e.target.value };
                        if (editingTransportDetailIndex !== null) {
                          handleUpdateTransportDetail(detail, editingTransportDetailIndex);
                        } else {
                          handleAddTransportDetail(detail);
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date Required (Optional)</label>
                    <Popover>
                      <PopoverTrigger asChild>                        <Button variant="outline" className="w-full justify-start">
                          {editingTransportDetailIndex !== null && form.getValues("transportDetails")[editingTransportDetailIndex]?.requirementDate
                            ? format(new Date(form.getValues("transportDetails")[editingTransportDetailIndex].requirementDate as Date), "PPP")
                            : "Pick a date"}
                        </Button>
                      </PopoverTrigger>                      <PopoverContent className="w-auto p-0">                        <Calendar
                          mode="single"
                          selected={editingTransportDetailIndex !== null && form.getValues("transportDetails")[editingTransportDetailIndex]?.requirementDate
                            ? new Date(form.getValues("transportDetails")[editingTransportDetailIndex].requirementDate as Date)
                            : undefined}
                          onSelect={(date) => {
                            const detail = editingTransportDetailIndex !== null
                              ? {...form.getValues("transportDetails")[editingTransportDetailIndex], requirementDate: date}
                              : {requirementDate: date}
                            if (editingTransportDetailIndex !== null) {
                              handleUpdateTransportDetail(detail, editingTransportDetailIndex);
                            } else {
                              handleAddTransportDetail(detail);
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
                          : false}
                        onChange={(e) => {
                          const detail = editingTransportDetailIndex !== null
                            ? {...form.getValues("transportDetails")[editingTransportDetailIndex], isAirportPickupRequired: e.target.checked}
                            : {isAirportPickupRequired: e.target.checked}
                          if (editingTransportDetailIndex !== null) {
                            handleUpdateTransportDetail(detail, editingTransportDetailIndex);
                          } else {
                            handleAddTransportDetail(detail);
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
                          : false}
                        onChange={(e) => {
                          const detail = editingTransportDetailIndex !== null
                            ? {...form.getValues("transportDetails")[editingTransportDetailIndex], isAirportDropRequired: e.target.checked}
                            : {isAirportDropRequired: e.target.checked}
                          if (editingTransportDetailIndex !== null) {
                            handleUpdateTransportDetail(detail, editingTransportDetailIndex);
                          } else {
                            handleAddTransportDetail(detail);
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
                        : ""}
                      onChange={(e) => {
                        const detail = editingTransportDetailIndex !== null
                          ? {...form.getValues("transportDetails")[editingTransportDetailIndex], notes: e.target.value}
                          : {notes: e.target.value}
                        if (editingTransportDetailIndex !== null) {
                          handleUpdateTransportDetail(detail, editingTransportDetailIndex);
                        } else {
                          handleAddTransportDetail(detail);
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2 mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddTransportDetail(false);
                      setEditingTransportDetailIndex(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (editingTransportDetailIndex !== null) {
                        setEditingTransportDetailIndex(null);
                      } else {
                        setShowAddTransportDetail(false);
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
