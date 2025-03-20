"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import axios from "axios";

const formSchema = z.object({
  invoicePrefix: z.string().min(1, "Invoice prefix is required"),
  billPrefix: z.string().min(1, "Bill prefix is required"),
  nextInvoiceNumber: z.coerce.number().int().min(1),
  nextBillNumber: z.coerce.number().int().min(1),
  defaultCurrency: z.string().min(1, "Currency symbol is required"),
});

type InvoiceSettingsFormValues = z.infer<typeof formSchema>;

interface InvoiceSettingsFormProps {
  initialData: any;
}

export const InvoiceSettingsForm: React.FC<InvoiceSettingsFormProps> = ({
  initialData,
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const defaultValues = {
    invoicePrefix: initialData?.invoicePrefix || "INV-",
    billPrefix: initialData?.billPrefix || "BILL-",
    nextInvoiceNumber: initialData?.nextInvoiceNumber || 1,
    nextBillNumber: initialData?.nextBillNumber || 1,
    defaultCurrency: initialData?.defaultCurrency || "₹",
  };

  const form = useForm<InvoiceSettingsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const onSubmit = async (data: InvoiceSettingsFormValues) => {
    try {
      setLoading(true);
      
      if (initialData?.id) {
        await axios.patch(`/api/settings/organization/${initialData.id}`, data);
      } else {
        await axios.post('/api/settings/organization', {
          name: "My Organization", // Default name if no organization exists
          ...data
        });
      }
      
      router.refresh();
      toast.success("Invoice settings saved successfully");
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="invoicePrefix"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Number Prefix</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="INV-" />
                    </FormControl>
                    <FormDescription>
                      Prefix to use before invoice numbers (e.g. INV-)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="nextInvoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Invoice Number</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} min={1} />
                    </FormControl>
                    <FormDescription>
                      The next invoice number to use for new invoices
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="p-4 bg-muted/50 rounded-lg border">
                <p className="font-medium">Next Invoice Number Preview:</p>
                <p className="text-lg mt-2">
                  {form.watch("invoicePrefix")}{form.watch("nextInvoiceNumber")}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Bill Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="billPrefix"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bill Number Prefix</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="BILL-" />
                    </FormControl>
                    <FormDescription>
                      Prefix to use before bill numbers (e.g. BILL-)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="nextBillNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Bill Number</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} min={1} />
                    </FormControl>
                    <FormDescription>
                      The next bill number to use for new bills
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="p-4 bg-muted/50 rounded-lg border">
                <p className="font-medium">Next Bill Number Preview:</p>
                <p className="text-lg mt-2">
                  {form.watch("billPrefix")}{form.watch("nextBillNumber")}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <FormField
              control={form.control}
              name="defaultCurrency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Currency Symbol</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="₹" className="w-32" />
                  </FormControl>
                  <FormDescription>
                    The currency symbol to use in financial documents
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="p-4 bg-muted/50 rounded-lg border mt-4">
              <p className="font-medium">Currency Preview:</p>
              <p className="text-lg mt-2">
                {form.watch("defaultCurrency")}1,000.00
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Button
          type="submit"
          disabled={loading}
          className="ml-auto"
        >
          <Save className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
      </form>
    </Form>
  );
};

