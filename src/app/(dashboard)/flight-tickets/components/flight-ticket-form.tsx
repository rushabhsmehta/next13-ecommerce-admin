"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Plane, CalendarIcon, Loader2, Plus, Trash2, Users } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { FlightTicket, Passenger, TourPackageQuery } from "@prisma/client";

interface FlightTicketFormProps {
  initialData: FlightTicket & {
    passengers: Passenger[];
    tourPackageQuery?: {
      tourPackageQueryName: string | null;
      customerName: string | null;
    } | null;
  } | undefined;
  tourPackageQueries?: {
    id: string;
    tourPackageQueryName: string | null;
    customerName: string | null;
  }[] | null;
}


// Define a passenger schema
const passengerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Passenger name is required"),
  type: z.string().default("Adult"),
  seatNumber: z.string().optional(),
  age: z.string().optional(),
  gender: z.string().optional(),
});

const formSchema = z.object({
  pnr: z.string().min(1, "PNR is required"),
  airline: z.string().min(1, "Airline is required"),
  flightNumber: z.string().min(1, "Flight number is required"),
  departureAirport: z.string().min(1, "Departure airport is required"),
  arrivalAirport: z.string().min(1, "Arrival airport is required"),
  departureTime: z.date({ required_error: "Departure time is required" }),
  arrivalTime: z.date({ required_error: "Arrival time is required" }),
  ticketClass: z.string().min(1, "Ticket class is required"),
  status: z.string().default("confirmed"),
  baggageAllowance: z.string().optional(),
  bookingReference: z.string().optional(),
  fareAmount: z.string().optional(),
  taxAmount: z.string().optional(),
  totalAmount: z.string().optional(),
  tourPackageQueryId: z.string().optional(),
  // Array of passengers
  passengers: z.array(passengerSchema).min(1, "At least one passenger is required"),
});

export const FlightTicketForm: React.FC<FlightTicketFormProps> = ({
  initialData,
  tourPackageQueries = null,
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const title = initialData ? "Edit Flight Ticket" : "Generate Flight Ticket";
  const action = initialData ? "Save changes" : "Generate";
  const toastMessage = initialData ? "Flight ticket updated." : "Flight ticket created.";

  // Format initial data if needed
  const formattedInitialData = initialData
    ? {
      pnr: initialData.pnr,
      airline: initialData.airline,
      flightNumber: initialData.flightNumber,
      departureAirport: initialData.departureAirport,
      arrivalAirport: initialData.arrivalAirport,
      departureTime: new Date(initialData.departureTime),
      arrivalTime: new Date(initialData.arrivalTime),
      ticketClass: initialData.ticketClass,
      status: initialData.status,
      baggageAllowance: initialData.baggageAllowance || "",
      bookingReference: initialData.bookingReference || "",
      fareAmount: typeof initialData.fareAmount === 'number'
        ? initialData.fareAmount.toString()
        : initialData.fareAmount || "",
      taxAmount: typeof initialData.taxAmount === 'number'
        ? initialData.taxAmount.toString()
        : initialData.taxAmount || "",
      totalAmount: typeof initialData.totalAmount === 'number'
        ? initialData.totalAmount.toString()
        : initialData.totalAmount || "",
      tourPackageQueryId: initialData.tourPackageQueryId || "",
      // Format passengers data if needed
      passengers: initialData.passengers?.map((p: any) => ({
        id: p.id,
        name: p.name,
        type: p.type || "Adult",
        seatNumber: p.seatNumber || "",
        age: p.age?.toString() || "",
        gender: p.gender || "",
      })) || []
    }
    : undefined;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: formattedInitialData || {
      pnr: "",
      airline: "",
      flightNumber: "",
      departureAirport: "",
      arrivalAirport: "",
      ticketClass: "Economy",
      status: "confirmed",
      baggageAllowance: "",
      bookingReference: "",
      fareAmount: "",
      taxAmount: "",
      totalAmount: "",
      tourPackageQueryId: "",
      // Start with one empty passenger
      passengers: [
        {
          name: "",
          type: "Adult",
          seatNumber: "",
          age: "",
          gender: "",
        }
      ],
    },
  });

  // Use field array for managing multiple passengers
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "passengers"
  });

  // Function to handle form submission
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      if (initialData) {
        await axios.patch(`/api/flight-tickets/${initialData.pnr}`, data);
      } else {
        await axios.post("/api/flight-tickets", data);
      }
      router.refresh();
      router.push("/flight-tickets");
      toast.success(toastMessage);
    } catch (error: any) {
      if (error.response?.status === 400 && error.response?.data) {
        toast.error(error.response.data);
      } else {
        toast.error("Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Function to add a new passenger
  const addPassenger = () => {
    append({
      name: "",
      type: "Adult",
      seatNumber: "",
      age: "",
      gender: "",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Plane className="mr-2 h-6 w-6" />
          {title}
        </CardTitle>
        <CardDescription>
          {initialData
            ? "Update flight ticket details"
            : "Generate a new flight ticket using PNR"}
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            {/* Flight Ticket Details Section */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* PNR */}
                <FormField
                  control={form.control}
                  name="pnr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PNR</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter PNR"
                          {...field}
                          disabled={!!initialData || loading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tour Package Query */}
                <FormField
                  control={form.control}
                  name="tourPackageQueryId"
                  render={({ field }) => {
                    // Safely handle tourPackageQueries being null
                    const packageOptions = tourPackageQueries || [];
                    
                    return (
                    <FormItem>
                      <FormLabel>Tour Package</FormLabel>
                      <Select
                        disabled={loading}
                        onValueChange={field.onChange}
                        value={field.value || ""}
                        defaultValue={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder="Select a tour package"
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {packageOptions.map((pkg) => (
                            <SelectItem key={pkg.id} value={pkg.id}>
                              {pkg.tourPackageQueryName || pkg.customerName || pkg.id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* Airline */}
                <FormField
                  control={form.control}
                  name="airline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Airline</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Airline name"
                          {...field}
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Flight Number */}
                <FormField
                  control={form.control}
                  name="flightNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Flight Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. AI123"
                          {...field}
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Ticket Class */}
                <FormField
                  control={form.control}
                  name="ticketClass"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class</FormLabel>
                      <Select
                        disabled={loading}
                        onValueChange={field.onChange}
                        value={field.value}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select ticket class" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Economy">Economy</SelectItem>
                          <SelectItem value="Premium Economy">Premium Economy</SelectItem>
                          <SelectItem value="Business">Business</SelectItem>
                          <SelectItem value="First">First</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Departure Airport */}
                <FormField
                  control={form.control}
                  name="departureAirport"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departure Airport</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. DEL"
                          {...field}
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Arrival Airport */}
                <FormField
                  control={form.control}
                  name="arrivalAirport"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Arrival Airport</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. BOM"
                          {...field}
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Departure Time */}
                <FormField
                  control={form.control}
                  name="departureTime"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Departure Date & Time</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              disabled={loading}
                            >
                              {field.value ? (
                                format(field.value, "PPP p")
                              ) : (
                                <span>Select date and time</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              if (date) {
                                // Set time to current time if not already set
                                const currentValue = field.value || new Date();
                                date.setHours(currentValue.getHours());
                                date.setMinutes(currentValue.getMinutes());
                                field.onChange(date);
                              }
                            }}
                            disabled={loading}
                            initialFocus
                          />
                          <div className="p-3 border-t border-border">
                            <div className="flex items-center gap-2">
                              <Input
                                type="time"
                                onChange={(e) => {
                                  const [hours, minutes] = e.target.value.split(':');
                                  const newDate = new Date(field.value || new Date());
                                  newDate.setHours(parseInt(hours));
                                  newDate.setMinutes(parseInt(minutes));
                                  field.onChange(newDate);
                                }}
                                value={field.value ?
                                  `${field.value.getHours().toString().padStart(2, '0')}:${field.value.getMinutes().toString().padStart(2, '0')}`
                                  : ''}
                                disabled={loading}
                              />
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Arrival Time */}
                <FormField
                  control={form.control}
                  name="arrivalTime"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Arrival Date & Time</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              disabled={loading}
                            >
                              {field.value ? (
                                format(field.value, "PPP p")
                              ) : (
                                <span>Select date and time</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              if (date) {
                                // Set time to current time if not already set
                                const currentValue = field.value || new Date();
                                date.setHours(currentValue.getHours());
                                date.setMinutes(currentValue.getMinutes());
                                field.onChange(date);
                              }
                            }}
                            disabled={loading}
                            initialFocus
                          />
                          <div className="p-3 border-t border-border">
                            <div className="flex items-center gap-2">
                              <Input
                                type="time"
                                onChange={(e) => {
                                  const [hours, minutes] = e.target.value.split(':');
                                  const newDate = new Date(field.value || new Date());
                                  newDate.setHours(parseInt(hours));
                                  newDate.setMinutes(parseInt(minutes));
                                  field.onChange(newDate);
                                }}
                                value={field.value ?
                                  `${field.value.getHours().toString().padStart(2, '0')}:${field.value.getMinutes().toString().padStart(2, '0')}`
                                  : ''}
                                disabled={loading}
                              />
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* Status */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        disabled={loading}
                        onValueChange={field.onChange}
                        value={field.value}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="rescheduled">Rescheduled</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Baggage Allowance */}
                <FormField
                  control={form.control}
                  name="baggageAllowance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Baggage Allowance</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. 20kg"
                          {...field}
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Booking Reference */}
                <FormField
                  control={form.control}
                  name="bookingReference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Booking Reference</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Booking ID"
                          {...field}
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* Fare Amount */}
                <FormField
                  control={form.control}
                  name="fareAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fare Amount</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Base fare"
                          type="number"
                          {...field}
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tax Amount */}
                <FormField
                  control={form.control}
                  name="taxAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Amount</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Tax amount"
                          type="number"
                          {...field}
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Total Amount */}
                <FormField
                  control={form.control}
                  name="totalAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Amount</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Total fare"
                          type="number"
                          {...field}
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Passengers Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Passengers</h3>
                  <p className="text-sm text-muted-foreground">Add all passengers for this ticket</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPassenger}
                  disabled={loading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Passenger
                </Button>
              </div>

              <Separator />

              {fields.length === 0 && (
                <div className="text-center p-4 border border-dashed rounded-md">
                  <Users className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="mt-2 text-muted-foreground">No passengers added yet</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={addPassenger}
                    disabled={loading}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Passenger
                  </Button>
                </div>
              )}

              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="p-4 border rounded-md bg-muted/30 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">
                      Passenger {index + 1}
                    </h4>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        disabled={loading}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* Passenger Name */}
                    <FormField
                      control={form.control}
                      name={`passengers.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Full name"
                              {...field}
                              disabled={loading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Passenger Type */}
                    <FormField
                      control={form.control}
                      name={`passengers.${index}.type`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select
                            disabled={loading}
                            onValueChange={field.onChange}
                            value={field.value || "Adult"}
                            defaultValue={field.value || "Adult"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Adult">Adult</SelectItem>
                              <SelectItem value="Child">Child</SelectItem>
                              <SelectItem value="Infant">Infant</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {/* Seat Number */}
                    <FormField
                      control={form.control}
                      name={`passengers.${index}.seatNumber`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Seat Number</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. 14A"
                              {...field}
                              disabled={loading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Age */}
                    <FormField
                      control={form.control}
                      name={`passengers.${index}.age`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Age</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Age"
                              type="number"
                              {...field}
                              disabled={loading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Gender */}
                    <FormField
                      control={form.control}
                      name={`passengers.${index}.gender`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <Select
                            disabled={loading}
                            onValueChange={field.onChange}
                            value={field.value || ""}
                            defaultValue={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/flight-tickets")}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {action}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
};