"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertModal } from '@/components/modals/alert-modal';
import { Heading } from '@/components/ui/heading';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  maxPersons: z.coerce.number().int().min(1, 'Maximum persons must be at least 1').default(1),
  rank: z.coerce.number().int().min(0, 'Rank must be 0 or greater').default(0),
  isActive: z.boolean().default(true),
}).refine(async (data) => {
  // We'll handle rank validation in the onSubmit function for better UX
  return true;
}, {
  message: "Validation error",
});

type OccupancyTypeFormValues = z.infer<typeof formSchema>;

interface OccupancyTypeFormProps {
  initialData: any | null;
}

export const OccupancyTypeForm: React.FC<OccupancyTypeFormProps> = ({ initialData }) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestedRank, setSuggestedRank] = useState<number>(0);

  // Fetch suggested rank for new occupancy types
  useEffect(() => {
    if (!initialData) {
      const fetchSuggestedRank = async () => {
        try {
          const response = await axios.get('/api/occupancy-types');
          const occupancyTypes = response.data;
          const maxRank = Math.max(...occupancyTypes.map((ot: any) => ot.rank || 0), -1);
          setSuggestedRank(maxRank + 1);
        } catch (error) {
          setSuggestedRank(0);
        }
      };
      fetchSuggestedRank();
    }
  }, [initialData]);

  const title = initialData ? 'Edit occupancy type' : 'Create occupancy type';
  const description = initialData ? 'Edit an occupancy type' : 'Add a new occupancy type';
  const toastMessage = initialData ? 'Occupancy type updated.' : 'Occupancy type created.';
  const action = initialData ? 'Save changes' : 'Create';

  const form = useForm<OccupancyTypeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      ...initialData,
      rank: initialData.rank ?? 0,
    } : {
      name: '',
      description: '',
      maxPersons: 1,
      rank: suggestedRank,
      isActive: true,
    },
  });

  // Update form when suggested rank changes
  useEffect(() => {
    if (!initialData && suggestedRank > 0) {
      form.setValue('rank', suggestedRank);
    }
  }, [suggestedRank, initialData, form]);

  const onSubmit = async (data: OccupancyTypeFormValues) => {
    try {
      setLoading(true);
      
      if (initialData) {
        await axios.patch(`/api/occupancy-types/${initialData.id}`, data);
      } else {
        await axios.post(`/api/occupancy-types`, data);
      }
      
      router.refresh();
      router.push(`/settings/occupancy-types`);
      toast.success(toastMessage);
    } catch (error: any) {
      if (error.response?.status === 400 && error.response?.data?.includes('rank')) {
        toast.error('Another occupancy type already has this display order. Please choose a different number.');
        form.setError('rank', { 
          type: 'manual', 
          message: 'This display order is already taken by another active occupancy type' 
        });
      } else {
        toast.error('Something went wrong.');
      }
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/occupancy-types/${initialData.id}`);
      router.refresh();
      router.push(`/settings/occupancy-types`);
      toast.success('Occupancy type deleted.');
    } catch (error) {
      toast.error('Make sure you removed all itineraries using this occupancy type first.');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={onDelete}
        loading={loading}
      />
      <div className="flex items-center justify-between">
        <Heading title={title} description={description} />
        {initialData && (
          <Button
            disabled={loading}
            variant="destructive"
            size="sm"
            onClick={() => setOpen(true)}
          >
            Delete
          </Button>
        )}
      </div>
      <Separator />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      disabled={loading}
                      placeholder="Single"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maxPersons"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maximum Persons</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      disabled={loading}
                      placeholder="1"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Maximum number of persons for this occupancy type
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="rank"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Order (Rank)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      disabled={loading}
                      placeholder={suggestedRank.toString()}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Lower numbers appear first in lists (0 = highest priority).
                    {!initialData && suggestedRank > 0 && ` Suggested: ${suggestedRank}`}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      disabled={loading}
                      placeholder="One person per room"
                      {...field}
                      value={field.value || ''}
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
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(!!checked)}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Active
                    </FormLabel>
                    <FormDescription>
                      This occupancy type will appear in selection dropdowns
                    </FormDescription>
                  </div>
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
