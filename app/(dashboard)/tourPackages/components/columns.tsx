'use client'
import axios from 'axios';
import { ColumnDef } from "@tanstack/react-table";
import { useState } from 'react';
import { TOUR_PACKAGE_TYPE_DEFAULT } from '../[tourPackageId]/components/defaultValues';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CellAction } from './cell-action';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { z } from 'zod';

const formSchema = z.object({
  tourPackageName: z.string().optional(),
  tourPackageType: z.string().optional(),
  customerName: z.string().optional(),
  customerNumber: z.string().optional(),
  numDaysNight: z.string().optional(),
  period: z.string().optional(),
  tour_highlights: z.string().optional(),
  transport: z.string().optional(),
  pickup_location: z.string().optional(),
  drop_location: z.string().optional(),
  numAdults: z.string().optional(),
  numChild5to12: z.string().optional(),
  numChild0to5: z.string().optional(),
  //price: z.string().optional(),
  pricePerAdult: z.string().optional(),
  pricePerChildOrExtraBed: z.string().optional(),
  pricePerChild5to12YearsNoBed: z.string().optional(),
  pricePerChildwithSeatBelow5Years: z.string().optional(),
  totalPrice: z.string().optional(),
  locationId: z.string().min(1),
  //location : z.string(),
  // hotelId: z.string().min(1),
  flightDetails: flightDetailsSchema.array(),
  //  hotelDetails: z.string(),
  inclusions: z.string(),
  exclusions: z.string(),
  importantNotes: z.string().optional(),
  paymentPolicy: z.string(),
  usefulTip: z.string(),
  cancellationPolicy: z.string(),
  airlineCancellationPolicy: z.string(),
  termsconditions: z.string(),
  images: z.object({ url: z.string() }).array(),
  itineraries: z.array(itinerarySchema),
  isFeatured: z.boolean().default(false).optional(),
  isArchived: z.boolean().default(false).optional(),
  assignedTo: z.string().optional(),
  assignedToMobileNumber: z.string().optional(),
  assignedToEmail: z.string().optional(),
  slug: z.string().optional(),
});

type TourPackageFormValues = z.infer<typeof formSchema>

export type TourPackageColumn = {
  id: string;
  tourPackageName: string;
  tourPackageType: string;
  price: string;
  location: string;
  createdAt: string;
  isFeatured: boolean;
  isArchived: boolean;
};

export const columns: ColumnDef<TourPackageColumn>[] = [
  {
    accessorKey: "tourPackageName",
    header: "Tour Package Name",
  },
  {
    accessorKey: "tourPackageType",
    header: "Type",
    cell: ({ row, column }) => {
      const [isEditing, setIsEditing] = useState(false);
      const [loading, setLoading] = useState(false);
      const [error, setError] = useState<string | null>(null);
      const action = 'Save changes';

      const onSubmit = async (data: TourPackageColumn) => {
        setLoading(true);
        setError(null);
        const formattedData = {
          ...row.original,
          tourPackageType: data.tourPackageType,
        };
        try {
          await axios.patch(`/api/tourPackages/${row.original.id}`, formattedData);
        } catch (err) {
          setError('Failed to update tour package type');
        } finally {
          setLoading(false);
          setIsEditing(false);
        }
      };

      const form = useForm({
        defaultValues: {
          tourPackageType: row.original.tourPackageType,
        },
      });

      return (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">

            <FormField
              control={form.control}
              name="tourPackageType"
              render={({ field }) => (
                <FormItem>
                  <Select disabled={loading} onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue defaultValue={field.value} placeholder="Select a Tour Package Type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TOUR_PACKAGE_TYPE_DEFAULT.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button disabled={loading} className="ml-auto" type="submit">
              {action}
            </Button>

          </form>
        </Form>
      );
    },
  },
  {
    accessorKey: "isArchived",
    header: "Archived",
  },
  {
    accessorKey: "isFeatured",
    header: "Featured",
  },
  {
    accessorKey: "location",
    header: "Location",
  },
  {
    accessorKey: "createdAt",
    header: "Date",
  },
  {
    id: "actions",
    cell: ({ row }) => <CellAction data={row.original} />,
  },
];