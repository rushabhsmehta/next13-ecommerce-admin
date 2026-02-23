"use client";

import * as z from "zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import axios from "axios";
import { format } from "date-fns";
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react";

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
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";

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
    locations: any[];
    vehicleTypes: any[];
}

export const TransportPricingForm: React.FC<TransportPricingFormProps> = ({
    locations,
    vehicleTypes
}) => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const defaultValues = {
        locationId: "",
        vehicleTypeId: "",
        price: 0,
        transportType: "PerDay" as const,
        description: "",
        startDate: new Date(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        isActive: true,
    };

    const form = useForm<TransportPricingFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues
    });

    const onSubmit = async (values: TransportPricingFormValues) => {
        try {
            setLoading(true);
            await axios.post("/api/transport-pricing", values);
            toast.success("Transport pricing created successfully.");
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
                    title="Add Transport Pricing"
                    description="Create a new transport pricing entry"
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
                                                <CommandList>
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
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                            />
                        <FormField
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
                                        </FormControl>                                        <SelectContent>
                                            {vehicleTypes.map((vehicleType) => (
                                                <SelectItem key={vehicleType.id} value={vehicleType.id}>
                                                    {vehicleType.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}                        />

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
                                                    >
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
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
                                                    >
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
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
                                                onCheckedChange={(checked) => field.onChange(checked === true)}
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
                            {loading ? "Creating..." : "Create"}
                        </Button>
                    </div>
                </form>
            </Form>
        </>
    );
};