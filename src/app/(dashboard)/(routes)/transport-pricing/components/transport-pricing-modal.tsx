"use client";

import { useEffect, useState, useMemo } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import * as z from "zod";
import { format } from "date-fns";
import { createDatePickerValue, formatLocalDate, utcToLocal } from "@/lib/timezone-utils";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";

const formSchema = z.object({
  locationId: z.string().min(1, "Location is required"),
  vehicleType: z.string().min(1, "Vehicle type is required"),
  price: z.coerce.number().min(0, "Price must be a positive number"),
  transportType: z.enum(["PerDay", "PerTrip"], {
    required_error: "Transport type is required",
  }),
  description: z.string().optional(),
  startDate: z.date({
    required_error: "Start date is required",
  }),
  endDate: z.date({
    required_error: "End date is required",
  }),
  isActive: z.boolean().default(true),
});

type TransportPricingModalFormValues = z.infer<typeof formSchema>;

interface TransportPricingModalProps {
  initialData?: any;
  isOpen: boolean;
  onClose: () => void;
  locations: any[];
}

export const TransportPricingModal: React.FC<TransportPricingModalProps> = ({
  initialData,
  isOpen,
  onClose,
  locations = [],
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const title = initialData ? "Edit Transport Pricing" : "Add Transport Pricing";
  const description = initialData
    ? "Edit existing transport pricing"
    : "Add a new transport pricing";
  const action = initialData ? "Save changes" : "Create";

  // Memoize defaultValues to avoid recreating object on every render
  const defaultValues = useMemo(() => {
    return initialData
      ? {
          ...initialData,
          price: parseFloat(initialData.price),
          startDate: utcToLocal(initialData.startDate) || new Date(),
          endDate: utcToLocal(initialData.endDate) || new Date(),
        }
      : {          locationId: "",
          vehicleType: "",
          price: 0,
          transportType: "PerDay" as const,
          description: "",
          startDate: new Date(),
          endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
          isActive: true,
        };
  }, [initialData]);

  const form = useForm<TransportPricingModalFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });
  useEffect(() => {    if (initialData) {
      form.reset({
        locationId: initialData.locationId,
        vehicleType: initialData.vehicleType,
        price: parseFloat(initialData.price),
        transportType: initialData.transportType,
        description: initialData.description || "",
        startDate: utcToLocal(initialData.startDate) || new Date(),
        endDate: utcToLocal(initialData.endDate) || new Date(),
        isActive: initialData.isActive,
      });
    } else {
      form.reset(defaultValues);
    }
  }, [initialData, form, defaultValues]);

  const onSubmit = async (values: TransportPricingModalFormValues) => {
    try {
      setLoading(true);

      if (initialData) {
        // Update existing transport pricing
        await axios.patch(`/api/transport-pricing/${initialData.id}`, values);
        toast.success("Transport pricing updated successfully.");
      } else {
        // Create new transport pricing
        await axios.post("/api/transport-pricing", values);
        toast.success("Transport pricing created successfully.");
      }
      
      router.refresh();
      onClose();
    } catch (error) {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={title}
      description={description}
      isOpen={isOpen}
      onClose={onClose}
    >
      <div>
        <div className="space-y-4 py-2 pb-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="space-y-4">
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
                              disabled={loading}
                            >
                              {field.value
                                ? locations.find((location) => location.id === field.value)?.label
                                : "Search location..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0">
                          <Command>
                            <CommandInput placeholder="Search location..." />
                            <CommandEmpty>No location found.</CommandEmpty>
                            <CommandGroup>
                              {locations.map((location) => (
                                <CommandItem
                                  key={location.id}
                                  value={location.label}
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
                                    )}
                                  />
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
                  name="vehicleType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle Type</FormLabel>
                      <Select
                        disabled={loading}
                        onValueChange={(value) => field.onChange(value as "PerDay" | "PerTrip")}
                        value={field.value}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              defaultValue={field.value}
                              placeholder="Select a vehicle type"
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Sedan">Sedan</SelectItem>
                          <SelectItem value="SUV">SUV</SelectItem>
                          <SelectItem value="Tempo Traveller">Tempo Traveller</SelectItem>
                          <SelectItem value="Mini Bus">Mini Bus</SelectItem>
                          <SelectItem value="Bus">Bus</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}                />

                <FormField
                  control={form.control}
                  name="transportType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price Type</FormLabel>
                      <Select
                        disabled={loading}
                        onValueChange={(value) => field.onChange(value as "PerDay" | "PerTrip")}
                        value={field.value}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              defaultValue={field.value}
                              placeholder="Select price type"
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="PerDay">Per Day</SelectItem>
                          <SelectItem value="PerTrip">Per Trip</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {field.value === "PerDay" 
                          ? "Per day pricing is charged daily" 
                          : "Per trip pricing is charged once for the entire duration"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (₹)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          disabled={loading}
                          placeholder="Enter price"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (                      <FormItem className="flex flex-col">
                        <FormLabel>Start Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? formatLocalDate(field.value, "PPP") : <span>Pick a date</span>}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={createDatePickerValue(field.value)}
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
                    name="endDate"
                    render={({ field }) => (                      <FormItem className="flex flex-col">
                        <FormLabel>End Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? formatLocalDate(field.value, "PPP") : <span>Pick a date</span>}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                              mode="single"
                              selected={createDatePickerValue(field.value)}
                              onSelect={(date) => date && field.onChange(date)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          disabled={loading}
                          placeholder="Add any additional details"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            if (typeof checked === 'boolean') {
                              field.onChange(checked);
                            }
                          }}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>
                          This transport pricing will only be used in calculations when active
                        </FormDescription>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="pt-6 space-x-2 flex items-center justify-end w-full">
                <Button
                  disabled={loading}
                  variant="outline"
                  onClick={onClose}
                  type="button"
                >
                  Cancel
                </Button>
                <Button disabled={loading} type="submit">
                  {action}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </Modal>
  );
};