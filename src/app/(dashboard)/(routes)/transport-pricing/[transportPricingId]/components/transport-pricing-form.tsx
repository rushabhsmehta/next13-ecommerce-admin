"use client";

import * as z from "zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import axios from "axios";
import { format } from "date-fns";
import { createDatePickerValue, formatLocalDate, utcToLocal } from "@/lib/timezone-utils";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TransportPricing, Location, VehicleType } from "@prisma/client";
const formSchema = z.object({
  locationId: z.string().min(1, "Location is required"),
  vehicleTypeId: z.string().min(1, "Vehicle type is required"),
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

type TransportPricingFormValues = z.infer<typeof formSchema>;

interface TransportPricingFormProps {
  initialData: TransportPricing;
  locations: Location[];
  vehicleTypes: VehicleType[];
}

export const TransportPricingForm: React.FC<TransportPricingFormProps> = ({
  initialData,
  locations,
  vehicleTypes
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const title = "Edit Transport Pricing";
  const description = "Update transport pricing information";
  const toastMessage = "Transport pricing updated successfully.";
  const action = "Save changes";  
  const defaultValues = {
    locationId: initialData.locationId,
    vehicleTypeId: initialData.vehicleTypeId || "",
    price: parseFloat(String(initialData.price)),
    transportType: initialData.transportType as "PerDay" | "PerTrip",
    description: initialData.description || "",
    startDate: utcToLocal(initialData.startDate) || new Date(),
    endDate: utcToLocal(initialData.endDate) || new Date(),
    isActive: initialData.isActive,
  };

  const form = useForm<TransportPricingFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  const onSubmit = async (values: TransportPricingFormValues) => {
    try {
      setLoading(true);
      await axios.patch(`/api/transport-pricing/${initialData.id}`, values);
      toast.success(toastMessage);
      router.push("/transport-pricing");
      router.refresh();
    } catch (error) {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading
          title={title}
          description={description}
        />
      </div>
      <Separator />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3">
            <FormField
              control={form.control}
              name="locationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <Select
                    disabled={loading}
                    onValueChange={(value: string) => field.onChange(value)}
                    value={field.value}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          defaultValue={field.value}
                          placeholder="Select a location"
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />            <FormField
              control={form.control}
              name="vehicleTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle Type</FormLabel>
                  <Select
                    disabled={loading}
                    onValueChange={field.onChange}
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
                    </FormControl>                    <SelectContent>
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
              name="transportType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price Type</FormLabel>
                  <Select
                    disabled={loading}
                    onValueChange={(value: string) => field.onChange(value as "PerDay" | "PerTrip")}
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

            <div className="col-span-1 sm:col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
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
                          >                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? formatLocalDate(field.value, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={createDatePickerValue(field.value)}
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
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
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
                          >                            <CalendarIcon className="mr-2 h-4 w-4" />
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

            <div className="col-span-1 sm:col-span-2 md:col-span-3">
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
            </div>

            <div className="col-span-1 sm:col-span-2 md:col-span-3">
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === "indeterminate" ? false : checked)}
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
          </div>
          <div className="flex items-center justify-end space-x-4">
            <Button 
              disabled={loading} 
              variant="outline" 
              onClick={() => router.push("/transport-pricing")}
              type="button"
            >
              Cancel
            </Button>
            <Button disabled={loading} type="submit">
              {loading ? "Saving..." : action}
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
};