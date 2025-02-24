"use client";

import * as z from "zod";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { Trash } from "lucide-react";
import { Inquiry } from "@prisma/client";
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

const formSchema = z.object({
  tourPackageQueryNumber: z.string().optional(),
  tourPackageQueryName: z.string().min(1, "Package name is required"),
  tourPackageQueryType: z.string().optional(),
  customerName: z.string().min(1, "Customer name is required"),
  customerNumber: z.string().min(1, "Customer number is required"),
  numDaysNight: z.string().min(1, "Number of days is required"),
  locationId: z.string().min(1, "Location is required"),
  period: z.string().optional(),
  tour_highlights: z.string().optional(),
  tourStartsFrom: z.string().optional(),
  tourEndsOn: z.string().optional(),
  transport: z.string().optional(),
  pickup_location: z.string().optional(),
  drop_location: z.string().optional(),
  numAdults: z.string().optional(),
  numChild5to12: z.string().optional(),
  numChild0to5: z.string().optional(),
  price: z.string().optional(),
  remarks: z.string().optional(),
});

type TourPackageQueryFormValues = z.infer<typeof formSchema>;

interface TourPackageQueryFormProps {
  initialData: any | null;
  inquiry: Inquiry | null;
}

export const TourPackageQueryForm: React.FC<TourPackageQueryFormProps> = ({
  initialData,
  inquiry
}) => {
  const params = useParams();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const title = "Create Tour Package Query";
  const description = "Add a new tour package query";
  const toastMessage = "Tour Package Query created.";
  const action = "Create";

  const form = useForm<TourPackageQueryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tourPackageQueryNumber: '',
      tourPackageQueryName: '',
      tourPackageQueryType: '',
      customerName: inquiry?.customerName || '',
      customerNumber: inquiry?.customerMobileNumber || '',
      numDaysNight: '',
      locationId: inquiry?.locationId || '',
      numAdults: inquiry?.numAdults?.toString() || '',
      numChild5to12: inquiry?.numChildren5to11?.toString() || '',
      numChild0to5: inquiry?.numChildrenBelow5?.toString() || '',
      remarks: inquiry?.remarks || '',
    }
  });

  const onSubmit = async (data: TourPackageQueryFormValues) => {
    try {
      setLoading(true);
      
      // Add your API call here to create the tour package query
      // await axios.post(`/api/tourpackagequery`, data);
      
      router.push(`/tourpackagequeries`);
      toast.success(toastMessage);
    } catch (error: any) {
      toast.error('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AlertModal 
        isOpen={open} 
        onClose={() => setOpen(false)}
        onConfirm={() => {}}
        loading={loading}
      />
      <div className="flex items-center justify-between">
        <Heading title={title} description={description} />
      </div>
      <Separator />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
          <div className="grid grid-cols-3 gap-8">
            <FormField
              control={form.control}
              name="tourPackageQueryName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Package Name</FormLabel>
                  <FormControl>
                    <Input disabled={loading} placeholder="Package Name" {...field} />
                  </FormControl>
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
                    <Input disabled placeholder="Customer Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customerNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Number</FormLabel>
                  <FormControl>
                    <Input disabled placeholder="Customer Number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="numDaysNight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Days/Nights</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="e.g. 3D/2N" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tourStartsFrom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tour Start Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks</FormLabel>
                  <FormControl>
                    <Input disabled placeholder="Remarks" {...field} />
                  </FormControl>
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
    </>
  );
};
