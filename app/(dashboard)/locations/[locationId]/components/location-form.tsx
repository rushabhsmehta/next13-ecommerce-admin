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
import { AirlineCancellationPolicyField, CancellationPolicyField, ExclusionsField, ImportantNotesField, InclusionsField, LabelField, PaymentPolicyField, SlugField, TagsField, TermsConditionsField, UsefulTipField } from "./form-fields";
import { INCLUSIONS_DEFAULT, EXCLUSIONS_DEFAULT, IMPORTANT_NOTES_DEFAULT, CANCELLATION_POLICY_DEFAULT, AIRLINE_CANCELLATION_POLICY_DEFAULT, PAYMENT_TERMS_DEFAULT, TERMS_AND_CONDITIONS_DEFAULT, USEFUL_TIPS_DEFAULT } from "./defaultValues";

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
      tags: initialData.tags ?? '',
      slug: initialData.slug ?? '',
      inclusions: initialData.inclusions ?? INCLUSIONS_DEFAULT,
      exclusions: initialData.exclusions ?? EXCLUSIONS_DEFAULT,
      importantNotes: initialData.importantNotes ?? IMPORTANT_NOTES_DEFAULT,
      paymentPolicy: initialData.paymentPolicy ?? PAYMENT_TERMS_DEFAULT,
      usefulTip: initialData.usefulTip ?? USEFUL_TIPS_DEFAULT,
      cancellationPolicy: initialData.cancellationPolicy ?? CANCELLATION_POLICY_DEFAULT,
      airlineCancellationPolicy: initialData.airlineCancellationPolicy ?? AIRLINE_CANCELLATION_POLICY_DEFAULT,
      termsconditions: initialData.termsconditions ?? TERMS_AND_CONDITIONS_DEFAULT,
    }
  : {
      label: "",
      imageUrl: "",
      tags: "",
      slug: "",
      inclusions: INCLUSIONS_DEFAULT,
      exclusions: EXCLUSIONS_DEFAULT,
      importantNotes: IMPORTANT_NOTES_DEFAULT,
      paymentPolicy: PAYMENT_TERMS_DEFAULT,
      usefulTip: USEFUL_TIPS_DEFAULT,
      cancellationPolicy: CANCELLATION_POLICY_DEFAULT,
      airlineCancellationPolicy: AIRLINE_CANCELLATION_POLICY_DEFAULT,
      termsconditions: TERMS_AND_CONDITIONS_DEFAULT,
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
      <div className="flex flex-col md:flex-row items-center justify-between w-full">
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            <LabelField control={form.control} loading={loading} />
            <TagsField control={form.control} loading={loading} />
            <SlugField control={form.control} loading={loading} />
            <InclusionsField control={form.control} loading={loading} />
            <ExclusionsField control={form.control} loading={loading} />
            <ImportantNotesField control={form.control} loading={loading} />
            <PaymentPolicyField control={form.control} loading={loading} />
            <UsefulTipField control={form.control} loading={loading} />
            <CancellationPolicyField control={form.control} loading={loading} />
            <AirlineCancellationPolicyField control={form.control} loading={loading} />
            <TermsConditionsField control={form.control} loading={loading} />
          </div>

          <Button disabled={loading} className="ml-auto" type="submit">
            {action}
          </Button>
        </form>
      </Form>
    </>
  );
};
