"use client";

import * as z from "zod";
import { Check, ChevronsUpDown, PlusCircle, X } from "lucide-react";
import { Inquiry, Location, AssociatePartner, InquiryAction } from "@prisma/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
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

const formSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED"]),
  customerName: z.string().min(1),
  customerMobileNumber: z.string().min(1),
  locationId: z.string().min(1, "Please select a location"),
  associatePartnerId: z.string().nullable(),
  numAdults: z.number().min(0),
  numChildrenAbove11: z.number().min(0),
  numChildren5to11: z.number().min(0),
  numChildrenBelow5: z.number().min(0),
  remarks: z.string().nullable(),
  actions: z.array(z.object({
    actionType: z.string().min(1),
    remarks: z.string().min(1),
    actionDate: z.date(),
  })),
  journeyDate: z.date().nullable(),
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
      status: initialData.status as "PENDING" | "CONFIRMED" | "CANCELLED",
      customerName: initialData.customerName,
      customerMobileNumber: initialData.customerMobileNumber,
      locationId: initialData.locationId,
      associatePartnerId: initialData.associatePartnerId,
      numAdults: initialData.numAdults,
      numChildrenAbove11: initialData.numChildrenAbove11,
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
      numChildrenAbove11: 0,
      numChildren5to11: 0,
      numChildrenBelow5: 0,
      remarks: '',
      actions: [],
      journeyDate: null,
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
      </div>
      <Separator />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
          <div className="grid grid-cols-3 gap-8">

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
                  <Select disabled={loading} onValueChange={(value: "PENDING" | "CONFIRMED" | "CANCELLED") => field.onChange(value)} value={field.value} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue defaultValue={field.value} placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Add Actions Section */}
            <div className="col-span-3">
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
                <div key={index} className="flex gap-4 items-start mt-4">
                  <FormField
                    control={form.control}
                    name={`actions.${index}.actionType`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
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
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`actions.${index}.remarks`}
                    render={({ field }) => (
                      <FormItem className="flex-[2]">
                        <FormControl>
                          <Textarea
                            disabled={loading}
                            placeholder="Enter remarks"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`actions.${index}.actionDate`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant="outline">
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
                      </FormItem>
                    )}
                  />

                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => onRemoveAction(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <Separator className="my-8" />
          {initialData && (
            <ActionHistory
              inquiryId={initialData.id}
              actions={actions}
            />
          )}

          <Button disabled={loading} className="ml-auto" type="submit">
            {action}
          </Button>
        </form>
      </Form >
    </>
  );
};
