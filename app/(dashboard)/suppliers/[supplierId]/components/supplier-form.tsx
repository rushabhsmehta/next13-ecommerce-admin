"use client";

import * as z from "zod";
import axios from "axios";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { Trash } from "lucide-react";
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

const formSchema = z.object({
  name: z.string().min(1),
  contact: z.string().optional(),
  email: z.string().optional().or(z.literal('')), // Modified to make email optional
});

type SupplierFormValues = z.infer<typeof formSchema>;

interface SupplierFormProps {
  initialData: { id: string; name: string; contact?: string | null; email?: string | null } | null;
}
export const SupplierForm: React.FC<SupplierFormProps> = ({ initialData }) => {
  const params = useParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const title = initialData ? "Edit Supplier" : "Create Supplier";
  const description = initialData ? "Edit supplier details." : "Add a new supplier";
  const toastMessage = initialData ? "Supplier updated." : "Supplier created.";
  const action = initialData ? "Save changes" : "Create";

  const defaultValues = initialData
    ? {
        name: initialData.name,
        contact: initialData.contact || "",
        email: initialData.email || "",
      }
    : { name: "", contact: "", email: "" };

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const onSubmit = async (data: SupplierFormValues) => {
    try {
      setLoading(true);
      if (initialData) {
        await axios.patch(`/api/suppliers/${params.supplierId}`, data);
      } else {
        await axios.post(`/api/suppliers`, data);
      }
      router.refresh();
      router.push(`/suppliers`);
      toast.success(toastMessage);
    } catch (error) {
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
          await axios.delete(`/api/suppliers/${params.supplierId}`);
          router.refresh();
          router.push(`/suppliers`);
          toast.success("Supplier deleted.");
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
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input disabled={loading} placeholder="Supplier name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contact"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact</FormLabel>
                <FormControl>
                  <Input disabled={loading} placeholder="Contact info" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input disabled={loading} placeholder="Email address" {...field} />
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
