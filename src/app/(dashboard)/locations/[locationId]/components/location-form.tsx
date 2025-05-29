"use client";

import * as z from "zod";
import axios from "axios";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { Trash, Car } from "lucide-react";
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
import { 
  LabelField, 
  TagsField, 
  SlugField, 
  InclusionsField, 
  ExclusionsField, 
  ImportantNotesField, 
  PaymentPolicyField, 
  UsefulTipField, 
  CancellationPolicyField, 
  AirlineCancellationPolicyField, 
  TermsConditionsField 
} from "./form-fields";
import { 
  INCLUSIONS_DEFAULT, 
  EXCLUSIONS_DEFAULT, 
  IMPORTANT_NOTES_DEFAULT, 
  KITCHEN_GROUP_POLICY_DEFAULT,
  CANCELLATION_POLICY_DEFAULT, 
  AIRLINE_CANCELLATION_POLICY_DEFAULT, 
  PAYMENT_TERMS_DEFAULT, 
  TERMS_AND_CONDITIONS_DEFAULT, 
  USEFUL_TIPS_DEFAULT 
} from "./defaultValues";

// Add imports for tabs
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileCheck, ListChecks, FileText, AlertCircle, ScrollText, TruckIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { PolicyListField } from "./policy-list-field";

const formSchema = z.object({
  label: z.string().min(1),
  imageUrl: z.string().min(1),
  tags: z.string().optional(),
  slug: z.string().optional(),
  inclusions: z.array(z.string()).optional(),
  exclusions: z.array(z.string()).optional(),
  kitchenGroupPolicy: z.array(z.string()).optional(),
  importantNotes: z.array(z.string()).optional(),
  paymentPolicy: z.array(z.string()).optional(),
  usefulTip: z.array(z.string()).optional(),
  cancellationPolicy: z.array(z.string()).optional(),
  airlineCancellationPolicy: z.array(z.string()).optional(),
  termsconditions: z.array(z.string()).optional(),
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

  // Convert JSON data to arrays if needed
  const parseJsonField = (field: any): string[] => {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    try {
      const parsed = JSON.parse(field as string);
      return Array.isArray(parsed) ? parsed : [field as string];
    } catch (e) {
      return [field as string];
    }
  };

  const defaultValues = initialData
    ? {
        label: initialData.label,
        imageUrl: initialData.imageUrl,
        tags: initialData.tags ?? '',
        slug: initialData.slug ?? '',
        inclusions: parseJsonField(initialData.inclusions) || INCLUSIONS_DEFAULT,
        exclusions: parseJsonField(initialData.exclusions) || EXCLUSIONS_DEFAULT,
        importantNotes: parseJsonField(initialData.importantNotes) || IMPORTANT_NOTES_DEFAULT,
        paymentPolicy: parseJsonField(initialData.paymentPolicy) || PAYMENT_TERMS_DEFAULT,
        usefulTip: parseJsonField(initialData.usefulTip) || USEFUL_TIPS_DEFAULT,
        cancellationPolicy: parseJsonField(initialData.cancellationPolicy) || CANCELLATION_POLICY_DEFAULT,
        airlineCancellationPolicy: parseJsonField(initialData.airlineCancellationPolicy) || AIRLINE_CANCELLATION_POLICY_DEFAULT,
        termsconditions: parseJsonField(initialData.termsconditions) || TERMS_AND_CONDITIONS_DEFAULT,
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
          </div>

          <Separator />
          <Heading title="Policies and Information" description="Manage lists of information for this location" />
          
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Policies & Terms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="inclusions" className="w-full">
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="inclusions">
                    <ListChecks className="h-4 w-4 mr-2" />
                    Inclusions
                  </TabsTrigger>
                  <TabsTrigger value="notes">
                    <FileText className="h-4 w-4 mr-2" />
                    Notes & Tips
                  </TabsTrigger>
                  <TabsTrigger value="cancellation">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Cancellation
                  </TabsTrigger>
                  <TabsTrigger value="terms">
                    <ScrollText className="h-4 w-4 mr-2" />
                    Terms
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="inclusions" className="space-y-4 mt-4">
                  <div className="grid gap-4">
                    <FormField control={form.control} name="inclusions" render={({ field }) => (
                      <PolicyListField
                        label="Inclusions"
                        value={field.value || []}
                        onChange={field.onChange}
                        loading={loading}
                        placeholder="Add inclusion item..."
                      />
                    )} />
            
                    <FormField control={form.control} name="exclusions" render={({ field }) => (
                      <PolicyListField
                        label="Exclusions"
                        value={field.value || []}
                        onChange={field.onChange}
                        loading={loading}
                        placeholder="Add exclusion item..."
                      />
                    )} />
                  </div>
                </TabsContent>
            
                <TabsContent value="notes" className="space-y-4 mt-4">
                  <div className="grid gap-4">
                    <FormField control={form.control} name="importantNotes" render={({ field }) => (
                      <PolicyListField
                        label="Important Notes"
                        value={field.value || []}
                        onChange={field.onChange}
                        loading={loading}
                        placeholder="Add important note..."
                      />
                    )} />
            
                    <FormField control={form.control} name="usefulTip" render={({ field }) => (
                      <PolicyListField
                        label="Useful Tips"
                        value={field.value || []}
                        onChange={field.onChange}
                        loading={loading}
                        placeholder="Add useful tip..."
                      />
                    )} />
                  </div>
                </TabsContent>
            
                <TabsContent value="cancellation" className="space-y-4 mt-4">
                  <div className="grid gap-4">
                    <FormField control={form.control} name="cancellationPolicy" render={({ field }) => (
                      <PolicyListField
                        label="General Cancellation Policy"
                        value={field.value || []}
                        onChange={field.onChange}
                        loading={loading}
                        placeholder="Add cancellation policy item..."
                      />
                    )} />
            
                    <FormField control={form.control} name="airlineCancellationPolicy" render={({ field }) => (
                      <PolicyListField
                        label="Airline Cancellation Policy"
                        value={field.value || []}
                        onChange={field.onChange}
                        loading={loading}
                        placeholder="Add airline cancellation policy item..."
                      />
                    )} />
                  </div>
                </TabsContent>
            
                <TabsContent value="terms" className="space-y-4 mt-4">
                  <div className="grid gap-4">
                    <FormField control={form.control} name="paymentPolicy" render={({ field }) => (
                      <PolicyListField
                        label="Payment Policy"
                        value={field.value || []}
                        onChange={field.onChange}
                        loading={loading}
                        placeholder="Add payment policy item..."
                      />
                    )} />
            
                    <FormField control={form.control} name="termsconditions" render={({ field }) => (
                      <PolicyListField
                        label="Terms and Conditions"
                        value={field.value || []}
                        onChange={field.onChange}
                        loading={loading}
                        placeholder="Add terms and conditions item..."
                      />
                    )} />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Button disabled={loading} className="ml-auto" type="submit">
            {action}
          </Button>
        </form>
      </Form>
    </>
  );
};
