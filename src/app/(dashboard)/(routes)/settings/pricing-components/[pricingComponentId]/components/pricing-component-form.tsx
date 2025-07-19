"use client";

import * as z from "zod";
import { useState, useEffect } from "react";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Heading } from "@/components/ui/heading";
import { AlertModal } from "@/components/modals/alert-modal";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

const formSchema = z.object({
  pricingAttributeId: z.string().min(1, { message: "Pricing attribute is required." }),
  price: z.coerce.number().min(0, { message: "Sales price must be a non-negative number." }),
  purchasePrice: z.coerce.number().min(0, { message: "Purchase price must be a non-negative number." }).optional()
});

type PricingComponentFormValues = z.infer<typeof formSchema>;

interface PricingComponentFormProps {
  initialData: any | null;
}

export const PricingComponentForm: React.FC<PricingComponentFormProps> = ({
  initialData
}) => {
  const router = useRouter();
  
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pricingAttributes, setPricingAttributes] = useState<any[]>([]);

  useEffect(() => {
    const fetchPricingAttributes = async () => {
      try {
        const response = await axios.get('/api/pricing-attributes?isActive=true');
        setPricingAttributes(response.data);
      } catch (error) {
        console.error('Error fetching pricing attributes:', error);
        toast.error("Failed to load pricing attributes.");
      }
    };

    fetchPricingAttributes();
  }, []);

  const title = initialData ? "Edit pricing component" : "Create pricing component";
  const description = initialData ? "Edit a pricing component." : "Create a new pricing component";
  const toastMessage = initialData ? "Pricing component updated." : "Pricing component created.";
  const action = initialData ? "Save changes" : "Create";

  const defaultValues = initialData ? {
    ...initialData,
    price: parseFloat(initialData.price),
    purchasePrice: initialData.purchasePrice ? parseFloat(initialData.purchasePrice) : 0
  } : {
    pricingAttributeId: '',
    price: 0,
    purchasePrice: 0
  };

  const form = useForm<PricingComponentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  const onSubmit = async (data: PricingComponentFormValues) => {
    try {
      setLoading(true);
      
      if (initialData) {
        await axios.patch(`/api/pricing-components/${initialData.id}`, data);
      } else {
        await axios.post(`/api/pricing-components`, data);
      }
      
      router.refresh();
      router.push(`/settings/pricing-components`);
      toast.success(toastMessage);
    } catch (error: any) {
      toast.error(error.response?.data || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    try {
      setLoading(true);
      
      await axios.delete(`/api/pricing-components/${initialData.id}`);
      
      router.refresh();
      router.push(`/settings/pricing-components`);
      toast.success("Pricing component deleted.");
    } catch (error: any) {
      toast.error(error.response?.data || "Something went wrong.");
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
            size="icon"
            onClick={() => setOpen(true)}
          >
            <Trash className="h-4 w-4" />
          </Button>
        )}
      </div>
      <Separator />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <FormField
              control={form.control}
              name="pricingAttributeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pricing Attribute</FormLabel>
                  <Select 
                    disabled={loading} 
                    onValueChange={field.onChange} 
                    value={field.value} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select pricing attribute" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {pricingAttributes.map((attribute) => (
                        <SelectItem key={attribute.id} value={attribute.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{attribute.name}</span>
                            {attribute.description && (
                              <span className="text-sm text-gray-500">{attribute.description}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sales Price</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" disabled={loading} {...field} placeholder="0.00" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="purchasePrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purchase Price</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" disabled={loading} {...field} placeholder="0.00" />
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
