"use client";

import * as z from "zod";
import axios from "axios";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { Trash, CalendarIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Heading } from "@/components/ui/heading";
import { AlertModal } from "@/components/modals/alert-modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { createDatePickerValue, normalizeApiDate, formatLocalDate } from "@/lib/timezone-utils";

const formSchema = z.object({
  name: z.string().min(1),
  contact: z.string().optional(),
  email: z.string().optional().or(z.literal('')), // Modified to make email optional
  associatePartnerId: z.string().optional(),
  birthdate: z.date().optional(),
  marriageAnniversary: z.date().optional(),
});

type CustomerFormValues = z.infer<typeof formSchema>;

interface CustomerFormProps {
  initialData: any | null;
  associatePartners: { id: string; name: string }[];
}

export const CustomerForm: React.FC<CustomerFormProps> = ({ initialData, associatePartners }) => {
  const params = useParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const title = initialData ? "Edit Customer" : "Create Customer";
  const description = initialData ? "Edit customer details." : "Add a new customer";
  const toastMessage = initialData ? "Customer updated." : "Customer created.";
  const action = initialData ? "Save changes" : "Create";

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      ...initialData,
      birthdate: createDatePickerValue(initialData.birthdate),
      marriageAnniversary: createDatePickerValue(initialData.marriageAnniversary),
    } : {
      name: '',
      email: '',
      contact: '',
      associatePartnerId: '',
      birthdate: undefined,
      marriageAnniversary: undefined,
    }
  });

  const onSubmit = async (data: CustomerFormValues) => {
    try {
      setLoading(true);
      
      // Normalize dates to prevent timezone shifting
      const submitData = {
        ...data,
        birthdate: normalizeApiDate(data.birthdate),
        marriageAnniversary: normalizeApiDate(data.marriageAnniversary),
      };
      
      if (initialData) {
        await axios.patch(`/api/customers/${params.customerId}`, submitData);
      } else {
        await axios.post(`/api/customers`, submitData);
      }
      router.refresh();
      router.push(`/customers`);
      toast.success(toastMessage);
    } catch (error) {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={async () => {
          setLoading(true);
          await axios.delete(`/api/customers/${params.customerId}`);
          router.refresh();
          router.push(`/customers`);
          toast.success("Customer deleted.");
          setLoading(false);
          setOpen(false);
        }}
        loading={loading}
      />
      <div className="flex flex-col md:flex-row items-center justify-between w-full mb-8">
        <div className="space-y-2">
          <Heading title={title} description={description} />
        </div>
        {initialData && (
          <Button 
            disabled={loading} 
            variant="destructive" 
            size="sm" 
            onClick={() => setOpen(true)}
            className="mt-4 md:mt-0"
          >
            <Trash className="h-4 w-4 mr-2" />
            Delete Customer
          </Button>
        )}
      </div>
      <Separator className="mb-8" />
      
      <div className="max-w-4xl mx-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Basic Information Card */}
            <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-gray-50/50">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
                <CardTitle className="text-lg font-semibold flex items-center">
                  <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                  Basic Information
                </CardTitle>
                <CardDescription className="text-blue-100">
                  Enter the customer&apos;s essential details
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">
                          Name <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            disabled={loading} 
                            placeholder="Enter customer name" 
                            {...field}
                            className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Contact Number</FormLabel>
                        <FormControl>
                          <Input 
                            disabled={loading} 
                            placeholder="Enter phone number" 
                            {...field}
                            className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Email Address</FormLabel>
                        <FormControl>
                          <Input 
                            disabled={loading} 
                            placeholder="Enter email address" 
                            type="email"
                            {...field}
                            className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Personal Information Card */}
            <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-pink-50/30">
              <CardHeader className="bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-t-lg">
                <CardTitle className="text-lg font-semibold flex items-center">
                  <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                  Personal Information
                </CardTitle>
                <CardDescription className="text-pink-100">
                  Important dates and milestones
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="birthdate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-sm font-medium text-gray-700 mb-2">Birthdate</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                disabled={loading}
                                className={cn(
                                  "w-full pl-4 pr-4 py-6 text-left font-normal transition-all duration-200 hover:bg-pink-50 focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span className="text-sm">
                                    {field.value ? (
                                      formatLocalDate(field.value, "PPP")
                                    ) : (
                                      "Select birthdate"
                                    )}
                                  </span>
                                  <CalendarIcon className="h-4 w-4 opacity-50" />
                                </div>
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-white shadow-lg border border-gray-200 rounded-lg" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                              }
                              defaultMonth={field.value || new Date(1990, 0)}
                              captionLayout="dropdown-buttons"
                              fromYear={1900}
                              toYear={new Date().getFullYear()}
                              initialFocus
                              classNames={{
                                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                                month: "space-y-4",
                                caption: "flex justify-center pt-3 pb-2 relative items-center",
                                caption_label: "hidden",
                                caption_dropdowns: "flex gap-2",
                                dropdown_month: "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                                dropdown_year: "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                                vhidden: "hidden",
                                nav: "hidden",
                                nav_button: "hidden",
                                nav_button_previous: "hidden",
                                nav_button_next: "hidden",
                                table: "w-full border-collapse space-y-1 p-4",
                                head_row: "flex",
                                head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] text-center",
                                row: "flex w-full mt-2",
                                cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                                day: "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 w-9 p-0 font-normal aria-selected:opacity-100",
                                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                                day_today: "bg-accent text-accent-foreground",
                                day_outside: "text-muted-foreground opacity-50",
                                day_disabled: "text-muted-foreground opacity-50",
                                day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                                day_hidden: "invisible",
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="marriageAnniversary"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-sm font-medium text-gray-700 mb-2">Marriage Anniversary</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                disabled={loading}
                                className={cn(
                                  "w-full pl-4 pr-4 py-6 text-left font-normal transition-all duration-200 hover:bg-pink-50 focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span className="text-sm">
                                    {field.value ? (
                                      formatLocalDate(field.value, "PPP")
                                    ) : (
                                      "Select anniversary date"
                                    )}
                                  </span>
                                  <CalendarIcon className="h-4 w-4 opacity-50" />
                                </div>
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-white shadow-lg border border-gray-200 rounded-lg" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                              }
                              defaultMonth={field.value || new Date(2000, 0)}
                              captionLayout="dropdown-buttons"
                              fromYear={1950}
                              toYear={new Date().getFullYear()}
                              initialFocus
                              classNames={{
                                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                                month: "space-y-4",
                                caption: "flex justify-center pt-3 pb-2 relative items-center",
                                caption_label: "hidden",
                                caption_dropdowns: "flex gap-2",
                                dropdown_month: "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                                dropdown_year: "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                                vhidden: "hidden",
                                nav: "hidden",
                                nav_button: "hidden",
                                nav_button_previous: "hidden",
                                nav_button_next: "hidden",
                                table: "w-full border-collapse space-y-1 p-4",
                                head_row: "flex",
                                head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] text-center",
                                row: "flex w-full mt-2",
                                cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                                day: "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 w-9 p-0 font-normal aria-selected:opacity-100",
                                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                                day_today: "bg-accent text-accent-foreground",
                                day_outside: "text-muted-foreground opacity-50",
                                day_disabled: "text-muted-foreground opacity-50",
                                day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                                day_hidden: "invisible",
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Business Information Card */}
            <Card className="shadow-sm border-0 bg-gradient-to-br from-white to-green-50/30">
              <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-t-lg">
                <CardTitle className="text-lg font-semibold flex items-center">
                  <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                  Business Information
                </CardTitle>
                <CardDescription className="text-green-100">
                  Partner and business relationship details
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <FormField
                  control={form.control}
                  name="associatePartnerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Associate Partner</FormLabel>
                      <Select
                        disabled={loading}
                        onValueChange={field.onChange}
                        value={field.value}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-12 transition-all duration-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500">
                            <SelectValue
                              defaultValue={field.value}
                              placeholder="Select an associate partner"
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white shadow-lg border-0">
                          {associatePartners.map((partner) => (
                            <SelectItem 
                              key={partner.id} 
                              value={partner.id}
                              className="hover:bg-green-50 focus:bg-green-50"
                            >
                              {partner.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end pt-6">
              <Button 
                disabled={loading} 
                type="submit"
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  action
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </>
  );
};
