"use client";

import * as z from "zod";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { UnitOfMeasure } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Heading } from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { AlertModal } from "@/components/modals/alert-modal";
import { Textarea } from "@/components/ui/textarea";
import axios from "axios";

const formSchema = z.object({
  name: z.string().min(1),
  abbreviation: z.string().min(1),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

type UnitFormValues = z.infer<typeof formSchema>;

interface UnitFormProps {
  initialData: UnitOfMeasure | null;
}

export const UnitForm: React.FC<UnitFormProps> = ({ initialData }) => {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const title = initialData ? "Edit Unit of Measure" : "Create Unit of Measure";
  const description = initialData ? "Edit an existing unit of measure" : "Add a new unit of measure";
  const toastMessage = initialData ? "Unit updated." : "Unit created.";
  const action = initialData ? "Save changes" : "Create";

  const form = useForm<UnitFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      abbreviation: initialData.abbreviation,
      description: initialData.description || undefined,
      isActive: initialData.isActive,
    } : {
      name: "",
      abbreviation: "",
      description: "",
      isActive: true,
    },
  });

  const onSubmit = async (data: UnitFormValues) => {
    try {
      setLoading(true);
      if (initialData) {
        await axios.patch(`/api/settings/units/${initialData.id}`, data);
      } else {
        await axios.post('/api/settings/units', data);
      }
      router.refresh();
      router.push(`/settings/units`);
      toast.success(toastMessage);
    } catch (error) {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/settings/units/${initialData?.id}`);
      router.refresh();
      router.push(`/settings/units`);
      toast.success('Unit deleted.');
    } catch (error) {
      toast.error('Make sure you removed all products using this unit first.');
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
                      placeholder="e.g. Kilograms, Pieces, Hours"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="abbreviation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Abbreviation</FormLabel>
                  <FormControl>
                    <Input
                      disabled={loading}
                      placeholder="e.g. kg, pcs, hrs"
                      {...field}
                    />
                  </FormControl>
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
                      placeholder="Description (optional)"
                      {...field}
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
                      onCheckedChange={(checked) => field.onChange(checked === "indeterminate" ? false : checked)}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Active
                    </FormLabel>
                    <FormDescription>
                      This unit will be available for selection in products and services.
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

