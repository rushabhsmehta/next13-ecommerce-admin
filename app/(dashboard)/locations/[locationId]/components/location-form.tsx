"use client";

import * as z from "zod";
import axios from "axios";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { Trash } from "lucide-react";
import { Location } from "@prisma/client";
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
import ImageUpload from "@/components/ui/image-upload";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  label: z.string().min(1),
  imageUrl: z.string().min(1),
  tags: z.string().optional(),
  slug: z.string().optional(),
  inclusions: z.string().optional(),
  exclusions: z.string().optional(),
  importantNotes: z.string().optional(),
  paymentPolicy: z.string().optional(),
  usefulTip: z.string().optional(),
  cancellationPolicy: z.string().optional(),
  airlineCancellationPolicy: z.string().optional(),
  termsconditions: z.string().optional(),
});

type LocationFormValues = z.infer<typeof formSchema>;

interface LocationFormProps {
  initialData: Location | null;
}

export const LocationForm: React.FC<LocationFormProps> = ({ initialData }) => {
  const params = useParams();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const title = initialData ? "Edit location" : "Create location";
  const description = initialData ? "Edit a location." : "Add a new location";
  const toastMessage = initialData ? "Location updated." : "Location created.";
  const action = initialData ? "Save changes" : "Create";

  const defaultValues = initialData
    ? {
        label: initialData.label,
        imageUrl: initialData.imageUrl,
        tags: initialData.tags ?? undefined,
        slug: initialData.slug ?? undefined,
        inclusions: initialData.inclusions ?? undefined,
        exclusions: initialData.exclusions ?? undefined,
        importantNotes: initialData.importantNotes ?? undefined,
        paymentPolicy: initialData.paymentPolicy ?? undefined,
        usefulTip: initialData.usefulTip ?? undefined,
        cancellationPolicy: initialData.cancellationPolicy ?? undefined,
        airlineCancellationPolicy: initialData.airlineCancellationPolicy ?? undefined,
        termsconditions: initialData.termsconditions ?? undefined,
      }
    : {
        label: "",
        imageUrl: "",
        tags: undefined,
        slug: undefined,
        inclusions: undefined,
        exclusions: undefined,
        importantNotes: undefined,
        paymentPolicy: undefined,
        usefulTip: undefined,
        cancellationPolicy: undefined,
        airlineCancellationPolicy: undefined,
        termsconditions: undefined,
      };

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

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
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const renderFormField = (name: keyof LocationFormValues, label: string, placeholder: string) => (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <FormControl>
          <Textarea rows={3} disabled={loading} placeholder={placeholder} {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )} />
  );

  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={async () => {
          setLoading(true);
          await axios.delete(`/api/locations/${params.locationId}`);
          router.refresh();
          router.push(`/locations`);
          toast.success("Location deleted.");
          setLoading(false);
          setOpen(false);
        }}
        loading={loading}
      />
      <div className="flex items-center justify-between">
        <Heading title={title} description={description} />
        {initialData && (
          <Button disabled={loading} variant="destructive" size="sm" onClick={() => setOpen(true)}>
            <Trash className="h-4 w-4" />
          </Button>
        )}
      </div>
      <Separator />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
          <FormField control={form.control} name="imageUrl" render={({ field }) => (
            <FormItem>
              <FormLabel>Background image</FormLabel>
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
          )} />

          <div className="grid md:grid-cols-2 gap-6">
            {renderFormField("label", "Label", "Enter label")}
            {renderFormField("tags", "Tags", "Enter tags")}
            {renderFormField("slug", "Slug", "Enter slug")}
            {renderFormField("inclusions", "Inclusions", "Enter inclusions")}
            {renderFormField("exclusions", "Exclusions", "Enter exclusions")}
            {renderFormField("importantNotes", "Important Notes", "Enter important notes")}
            {renderFormField("paymentPolicy", "Payment Policy", "Enter payment policy")}
            {renderFormField("usefulTip", "Useful Tip", "Enter useful tip")}
            {renderFormField("cancellationPolicy", "Cancellation Policy", "Enter cancellation policy")}
            {renderFormField("airlineCancellationPolicy", "Airline Cancellation Policy", "Enter airline cancellation policy")}
            {renderFormField("termsconditions", "Terms & Conditions", "Enter terms & conditions")}
          </div>

          <Button disabled={loading} className="ml-auto" type="submit">
            {action}
          </Button>
        </form>
      </Form>
    </>
  );
};
