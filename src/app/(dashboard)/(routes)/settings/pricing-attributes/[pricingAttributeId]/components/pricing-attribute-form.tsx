"use client";

import * as z from "zod";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import axios from "axios";

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
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Heading } from "@/components/ui/heading";
import { AlertModal } from "@/components/modals/alert-modal";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

const formSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

type PricingAttributeFormValues = z.infer<typeof formSchema>;

interface PricingAttributeFormProps {
  initialData: any | null;
}

export const PricingAttributeForm: React.FC<PricingAttributeFormProps> = ({
  initialData
}) => {
  const router = useRouter();
  
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const title = initialData ? "Edit pricing attribute" : "Create pricing attribute";
  const description = initialData ? "Edit your pricing attribute." : "Create a new pricing attribute";
  const toastMessage = initialData ? "Pricing attribute updated." : "Pricing attribute created.";
  const action = initialData ? "Save changes" : "Create";
  const defaultValues = initialData ? {
    ...initialData,
    sortOrder: initialData.sortOrder || 0,
  } : {
    name: '',
    sortOrder: 0,
    isActive: true,
    isDefault: false,
  };

  const form = useForm<PricingAttributeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  const onSubmit = async (data: PricingAttributeFormValues) => {
    try {
      setLoading(true);
      
      if (initialData) {
        await axios.patch(`/api/pricing-attributes/${initialData.id}`, data);
      } else {
        await axios.post(`/api/pricing-attributes`, data);
      }
      
      router.refresh();
      router.push(`/settings/pricing-attributes`);
      toast.success(toastMessage);
    } catch (error: any) {
      toast.error(error.response.data || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    try {
      setLoading(true);
      
      await axios.delete(`/api/pricing-attributes/${initialData.id}`);
      
      router.refresh();
      router.push(`/settings/pricing-attributes`);
      toast.success("Pricing attribute deleted.");
    } catch (error: any) {
      toast.error(error.response.data || "Something went wrong.");
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
            disabled={loading || initialData.isDefault}
            variant="destructive"
            size="icon"
            onClick={() => setOpen(true)}
          >
            <Trash className="h-4 w-4" />
          </Button>
        )}
      </div>
      <Separator />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input disabled={loading} placeholder="e.g., Per Person Cost" {...field} />
                  </FormControl>
                  <FormDescription>
                    Name for the pricing attribute (unique identifier)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sortOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sort Order</FormLabel>
                  <FormControl>
                    <Input type="number" disabled={loading} {...field} />
                  </FormControl>
                  <FormDescription>
                    Controls display order (lower numbers appear first)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                      disabled={loading}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Active</FormLabel>
                    <FormDescription>
                      This pricing attribute will be available for selection
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isDefault"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                      disabled={loading}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Default</FormLabel>
                    <FormDescription>
                      This pricing attribute will be selected by default
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
