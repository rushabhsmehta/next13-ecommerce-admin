"use client"

import * as z from "zod"
import axios from "axios"
import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "react-hot-toast"
import { Trash } from "lucide-react"
import { Location } from "@prisma/client"
import { useParams, useRouter } from "next/navigation"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { Heading } from "@/components/ui/heading"
import { AlertModal } from "@/components/modals/alert-modal"
import ImageUpload from "@/components/ui/image-upload"
import { Textarea } from "@/components/ui/textarea"

const formSchema = z.object({
  label: z.string().min(1),
  imageUrl: z.string().min(1),
  tags: z.string().optional(),
  slug: z.string().optional(),
});

type LocationFormValues = z.infer<typeof formSchema>

interface LocationFormProps {
  initialData: Location | null;
};

export const LocationForm: React.FC<LocationFormProps> = ({
  initialData
}) => {
  const params = useParams();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const title = initialData ? 'Edit location' : 'Create location';
  const description = initialData ? 'Edit a location.' : 'Add a new location';
  const toastMessage = initialData ? 'Location updated.' : 'Location created.';
  const action = initialData ? 'Save changes' : 'Create';

  const transformInitialData = (data: any): LocationFormValues => {
    return {
      ...data,
      tags: data.tags ??  '',
      slug : data.slug ??  '',
    }
  }

  const defaultValues = initialData ? transformInitialData(initialData) : {
    label: '',
    imageUrl: '',
    tags: '',
    slug: ''
  }

   const form = useForm<LocationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues
  });
  

  // Function to convert label to slug
  const convertToSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/ /g, '-')
      .replace(/[^\w-]+/g, '');
  }

  // Update slug when label changes
  useEffect(() => {
    const label = form.getValues('label');
    const slug = convertToSlug(label);
    form.setValue('slug', slug);
  }, [form.watch('label')]);

  const onSubmit = async (data: LocationFormValues) => {
    try {
      setLoading(true);
    
      if (initialData) {
        await axios.patch(`/api/locations/${params.locationId}`, data);
      } else {
        await axios.post(`/api/locations`, data);
      }
      router.refresh();
      router.push(`/locations`);
      toast.success(toastMessage);
    } catch (error: any) {
      toast.error('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/locations/${params.locationId}`);
      router.refresh();
      router.push(`/locations`);
      toast.success('Location deleted.');
    } catch (error: any) {
      toast.error('Make sure you removed all categories using this location first.');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }


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
            <Trash className="h-4 w-4" />
          </Button>
        )}
      </div>
      <Separator />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
          <FormField
            control={form.control}
            name="imageUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Background image</FormLabel>
                <FormControl>
                  <ImageUpload
                    value={field.value ? [field.value] : []}
                    disabled={loading}
                    onChange={(url) => field.onChange(url)}
                    onRemove={() => field.onChange('')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />


          <div className="md:grid md:grid-cols-3 gap-8">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label</FormLabel>
                  <FormControl>
                    <Input disabled={loading} placeholder="Location label" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <Textarea rows={10} disabled={loading} placeholder="Location Tags" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input disabled={loading} placeholder="Location Slug" {...field} />
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
