"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import axios from "axios";
import { format } from "date-fns";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, ListPlus, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Form schema
const formSchema = z.object({
  customerId: z.string({
    required_error: "Please select a customer",
  }),
  tourPackageQueryId: z.string().optional(),
  saleDate: z.date({
    required_error: "Sale date is required",
  }),
  salePrice: z.coerce.number().min(0, "Price must be zero or positive"),
  description: z.string().optional(),
  transactionType: z.enum(["simple", "itemized"], {
    required_error: "Please select transaction type",
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface NewSaleFormProps {
  customers: any[];
  tourPackageQueries: any[];
}

export const NewSaleForm: React.FC<NewSaleFormProps> = ({
  customers,
  tourPackageQueries,
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: "",
      tourPackageQueryId: "",
      saleDate: new Date(),
      salePrice: 0,
      description: "",
      transactionType: "simple",
    },
  });

  const transactionType = form.watch("transactionType");

  const onSubmit = async (data: FormValues) => {
    try {
      setLoading(true);
      
      // Create sale record
      const response = await axios.post("/api/sales", data);
      
      // Redirect based on transaction type
      if (data.transactionType === "simple") {
        toast.success("Sale created successfully");
        router.push("/sales");
      } else {
        // For itemized, redirect to the items page
        // Check if response contains id before redirecting
        if (response.data && response.data.id) {
          toast.success("Sale created. Now add items.");
          router.push(`/sales/${response.data.id}/items`);
        } else {
          console.error("Invalid response format:", response.data);
          toast.error("Failed to get sale details. Please try again.");
          router.push("/sales");
        }
      }
      
      router.refresh();
    } catch (error) {
      console.error("Error creating sale:", error);
      toast.error("Failed to create sale. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Sale Information</CardTitle>
            <CardDescription>
              Enter the basic information for this sale
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Customer Selection */}
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer</FormLabel>
                  <Select
                    disabled={loading}
                    onValueChange={field.onChange}
                    value={field.value}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Customer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Tour Package Query (Optional) */}
            <FormField
              control={form.control}
              name="tourPackageQueryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tour Package (Optional)</FormLabel>
                  <Select
                    disabled={loading}
                    onValueChange={field.onChange}
                    value={field.value}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Tour Package" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {tourPackageQueries.map((tpq) => (
                        <SelectItem key={tpq.id} value={tpq.id}>
                          {tpq.tourPackageQueryName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Link this sale to a tour package query (optional).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Sale Date */}
            <FormField
              control={form.control}
              name="saleDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Sale Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "MMMM d, yyyy")
                          ) : (
                            <span>Select date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => date && field.onChange(date)}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Transaction Type */}
            <FormField
              control={form.control}
              name="transactionType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Transaction Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value: "simple" | "itemized") => field.onChange(value)}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="simple" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Simple (single amount)
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="itemized" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Itemized (multiple products/services)
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Sale Price (only for simple transactions) */}
            {transactionType === "simple" && (
              <FormField
                control={form.control}
                name="salePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sale Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={loading}
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      disabled={loading}
                      placeholder="Enter sale description"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/sales")}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {transactionType === "itemized" ? (
                <>
                  <ListPlus className="mr-2 h-4 w-4" />
                  Continue to Add Items
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Create Sale
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
};

