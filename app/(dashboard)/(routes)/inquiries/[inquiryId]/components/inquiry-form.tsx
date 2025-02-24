"use client";

import * as z from "zod";
import { Check, ChevronsUpDown } from "lucide-react";
import { Inquiry, Location, AssociatePartner, InquiryAction } from "@prisma/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

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

const formSchema = z.object({
  status: z.string().min(1), // Changed from enum to match schema's default "pending"
  customerName: z.string().min(1),
  customerMobileNumber: z.string().min(1),
  locationId: z.string().min(1, "Please select a location"),
  associatePartnerId: z.string().nullable(),
  numAdults: z.number().min(0),
  numChildrenAbove11: z.number().min(0),
  numChildren5to11: z.number().min(0),
  numChildrenBelow5: z.number().min(0),
  remarks: z.string().nullable(),
});

type InquiryFormValues = z.infer<typeof formSchema>;

interface InquiryFormProps {
  initialData: (Inquiry & {
    location: Location;
    associatePartner: AssociatePartner | null;
    actions: InquiryAction[];
  }) | null;
  locations: Location[];
  associates: AssociatePartner[];
  actions: InquiryAction[];
}

export const InquiryForm: React.FC<InquiryFormProps> = ({
  initialData,
  locations,
  associates,
  actions
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const title = initialData ? "Edit inquiry" : "Create inquiry";
  const description = initialData ? "Edit an inquiry" : "Add a new inquiry";
  const toastMessage = initialData ? "Inquiry updated." : "Inquiry created.";
  const action = initialData ? "Save changes" : "Create";

  const form = useForm<InquiryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      status: initialData.status,
      customerName: initialData.customerName,
      customerMobileNumber: initialData.customerMobileNumber,
      locationId: initialData.locationId,
      associatePartnerId: initialData.associatePartnerId,
      numAdults: initialData.numAdults,
      numChildrenAbove11: initialData.numChildrenAbove11,
      numChildren5to11: initialData.numChildren5to11,
      numChildrenBelow5: initialData.numChildrenBelow5,
      remarks: initialData.remarks,
    } : {
      status: "pending",
      customerName: '',
      customerMobileNumber: '',
      locationId: '',
      associatePartnerId: null,
      numAdults: 0,
      numChildrenAbove11: 0,
      numChildren5to11: 0,
      numChildrenBelow5: 0,
      remarks: '',
    }
  });

  const onSubmit = async (data: InquiryFormValues) => {
    try {
      setLoading(true);
      if (initialData) {
        await fetch(`/api/inquiries/${initialData.id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
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

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <Separator />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
          <div className="grid grid-cols-3 gap-8">
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
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput placeholder="Search location..." />
                        <CommandEmpty>
                          No location found.
                        </CommandEmpty>
                        <CommandGroup>
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
              name="associatePartnerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Associate Partner</FormLabel>
                  <Select disabled={loading} onValueChange={(value) => field.onChange(value)} value={field.value ?? undefined} defaultValue={field.value ?? undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue defaultValue={field.value ?? ''} placeholder="Select an associate" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {associates.map((associate) => (
                        <SelectItem key={associate.id} value={associate.id}>
                          {associate.name}
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
              name="numChildrenAbove11"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Children Above 11</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      disabled={loading} 
                      placeholder="Number of children above 11" 
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
              name="remarks"
              render={({ field }) => (
                <FormItem className="col-span-3">
                  <FormLabel>Remarks</FormLabel>
                  <FormControl>
                    <Textarea 
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={loading}
                      placeholder="Add any additional remarks"
                      {...field}
                      value={field.value ?? ''}
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
                  <Select disabled={loading} onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue defaultValue={field.value} placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="converted">Converted</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
          </div>
          <Button disabled={loading} className="ml-auto" type="submit">
            {action}
          </Button>
        </form>
      </Form>
      <Separator className="my-8" />
      {initialData && (
        <ActionHistory
          inquiryId={initialData.id}
          actions={actions}
        />
      )}
    </>
  );
};
