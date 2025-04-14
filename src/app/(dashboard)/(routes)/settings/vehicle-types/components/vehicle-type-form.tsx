"use client";

import { useState } from 'react';
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
  capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1').default(4),
  isActive: z.boolean().default(true),
});

type VehicleTypeFormValues = z.infer<typeof formSchema>;

interface VehicleTypeFormProps {
  initialData: any | null;
}

export const VehicleTypeForm: React.FC<VehicleTypeFormProps> = ({ initialData }) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const title = initialData ? 'Edit vehicle type' : 'Create vehicle type';
  const description = initialData ? 'Edit a vehicle type' : 'Add a new vehicle type';
  const toastMessage = initialData ? 'Vehicle type updated.' : 'Vehicle type created.';
  const action = initialData ? 'Save changes' : 'Create';

  const form = useForm<VehicleTypeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      name: '',
      description: '',
      capacity: 4,
      isActive: true,
    },
  });

  const onSubmit = async (data: VehicleTypeFormValues) => {
    try {
      setLoading(true);
      
      if (initialData) {
        await axios.patch(`/api/vehicle-types/${initialData.id}`, data);
      } else {
        await axios.post(`/api/vehicle-types`, data);
      }
      
      router.refresh();
      router.push(`/settings/vehicle-types`);
      toast.success(toastMessage);
    } catch (error) {
      toast.error('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/vehicle-types/${initialData.id}`);
      router.refresh();
      router.push(`/settings/vehicle-types`);
      toast.success('Vehicle type deleted.');
    } catch (error) {
      toast.error('Make sure you removed all itineraries using this vehicle type first.');
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
                      placeholder="Sedan"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capacity</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      disabled={loading}
                      placeholder="4"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Number of passengers this vehicle can accommodate
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      disabled={loading}
                      placeholder="Small family car"
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
                      This vehicle type will appear in selection dropdowns
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
