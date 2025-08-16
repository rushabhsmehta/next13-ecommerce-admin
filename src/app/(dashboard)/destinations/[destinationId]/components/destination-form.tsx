"use client";

import * as z from "zod";
import axios from "axios";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { Trash, MapPin } from "lucide-react";
import { TourDestination, Location } from "@prisma/client";
import { useParams, useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Heading } from "@/components/ui/heading";
import { AlertModal } from "@/components/modals/alert-modal";
import ImageUpload from "@/components/ui/image-upload";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { LocationCombobox } from "@/components/ui/location-combobox";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  locationId: z.string().min(1, "Location is required"),
  isActive: z.boolean().default(true),
});

type DestinationFormValues = z.infer<typeof formSchema>;

interface DestinationFormProps {
  initialData: (TourDestination & { location: Location }) | null;
  locations: Location[];
  defaultLocationId?: string;
}

export const DestinationForm: React.FC<DestinationFormProps> = ({
  initialData,
  locations,
  defaultLocationId,
}) => {
  const params = useParams();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const title = initialData ? "Edit destination" : "Create destination";
  const description = initialData ? "Edit a destination." : "Add a new destination";
  const toastMessage = initialData ? "Destination updated." : "Destination created.";
  const action = initialData ? "Save changes" : "Create";

  const defaultValues = initialData
    ? {
        name: initialData.name,
        description: initialData.description || "",
        imageUrl: initialData.imageUrl || "",
        locationId: initialData.locationId,
        isActive: initialData.isActive,
      }
    : {
        name: "",
        description: "",
        imageUrl: "",
        locationId: defaultLocationId || "",
        isActive: true,
      };

  const form = useForm<DestinationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const onSubmit = async (data: DestinationFormValues) => {
    try {
      setLoading(true);
      if (initialData) {
        await axios.patch(`/api/destinations/${params.destinationId}`, data);
      } else {
        await axios.post(`/api/destinations`, data);
      }
      router.refresh();
      
      // Navigate back to the appropriate destinations page
      const backUrl = defaultLocationId 
        ? `/destinations?locationId=${defaultLocationId}`
        : `/destinations`;
      router.push(backUrl);
      
      toast.success(toastMessage);
    } catch (error: any) {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/destinations/${params.destinationId}`);
      router.refresh();
      
      // Navigate back to the appropriate destinations page
      const backUrl = defaultLocationId 
        ? `/destinations?locationId=${defaultLocationId}`
        : `/destinations`;
      router.push(backUrl);
      
      toast.success("Destination deleted.");
    } catch (error: any) {
      toast.error("Something went wrong.");
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
            <Trash className="h-4 w-4" />
          </Button>
        )}
      </div>
      <Separator />
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-8 w-full"
        >
          <FormField
            control={form.control}
            name="imageUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Destination Image</FormLabel>
                <FormControl>
                  <ImageUpload
                    value={field.value ? [field.value] : []}
                    disabled={loading}
                    onChange={(url) => field.onChange(url)}
                    onRemove={() => field.onChange("")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="md:grid md:grid-cols-3 gap-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      disabled={loading}
                      placeholder="Destination name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="locationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <LocationCombobox
                      locations={locations}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Select a location"
                      disabled={loading}
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
                      This destination will appear on your website.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    disabled={loading}
                    placeholder="Destination description"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button disabled={loading} className="ml-auto" type="submit">
            {action}
          </Button>
        </form>
      </Form>
    </>
  );
};
