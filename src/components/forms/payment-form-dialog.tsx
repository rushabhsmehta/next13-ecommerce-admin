"use client";

import * as z from "zod";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import axios from "axios";
import { toast } from "react-hot-toast";
import { format } from "date-fns";

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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentFormProps } from "@/types/index";
import { FormErrorSummary } from "@/components/ui/form-error-summary";
import { FormDatePicker } from "@/components/ui/form-date-picker";

const formSchema = z.object({
  paymentDate: z.date({
    required_error: "Payment date is required",
  }),
  amount: z.coerce.number().positive({
    message: "Amount must be positive",
  }),
  method: z.string().optional(),
  transactionId: z.string().optional(),
  note: z.string().optional(),
  supplierId: z.string().optional(),
  tourPackageQueryId: z.string().optional(),
  accountId: z.string().min(1, {
    message: "Account is required",
  }),
  accountType: z.string().min(1, {
    message: "Account type is required",
  }),
});

type PaymentFormValues = z.infer<typeof formSchema>;

export const PaymentFormDialog: React.FC<PaymentFormProps> = ({
  initialData,
  suppliers,
  bankAccounts,
  cashAccounts,
  onSuccess,
  submitButtonText = "Create"
}) => {
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false);

  // Add this computed value
  const filteredSuppliers = suppliers.filter(supplier => 
    supplier.name.toLowerCase().includes(supplierSearch.toLowerCase())
  );
  
  let defaultValues: Partial<PaymentFormValues> = {
    paymentDate: new Date(),
    amount: 0,
    method: "",
    transactionId: "",
    note: "",
    supplierId: "",
    tourPackageQueryId: initialData?.tourPackageQueryId || undefined,
    accountId: "",
    accountType: "",
  };

  if (initialData && Object.keys(initialData).length > 1) {
    defaultValues = {
      paymentDate: initialData.paymentDate ? new Date(initialData.paymentDate) : new Date(),
      amount: initialData.amount,
      method: initialData.method || "",
      transactionId: initialData.transactionId || "",
      note: initialData.note || "",
      supplierId: initialData.supplierId || "",
      tourPackageQueryId: initialData.tourPackageQueryId || undefined,
      accountId: initialData.bankAccountId || initialData.cashAccountId || "",
      accountType: initialData.bankAccountId ? "bank" : "cash",
    };
  }

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const onSubmit = async (data: PaymentFormValues) => {
    try {
      setLoading(true);
      setFormErrors([]);

      // Prepare the API data with correct account type field
      const apiData: Partial<PaymentFormValues & {
        bankAccountId: string | null,
        cashAccountId: string | null
      }> = {
        ...data,
        bankAccountId: data.accountType === 'bank' ? data.accountId : null,
        cashAccountId: data.accountType === 'cash' ? data.accountId : null,
      };
      delete apiData.accountId;
      delete apiData.accountType;

      if (initialData && initialData.id) {
        await axios.patch(`/api/payments/${initialData.id}`, apiData);
      } else {
        await axios.post('/api/payments', apiData);
      }

      toast.success(initialData.id ? "Payment updated." : "Payment created.");
      onSuccess();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "Something went wrong";
      toast.error(errorMessage);
      setFormErrors([errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const onError = (errors: any) => {
    console.error("Form Validation Errors:", errors);
    
    const errorMessages: string[] = [];
    Object.entries(errors).forEach(([key, value]: [string, any]) => {
      if (value?.message) {
        errorMessages.push(`${key}: ${value.message}`);
      }
    });
    
    setFormErrors(errorMessages);
    toast.error("Please check the form for errors");
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <FormErrorSummary errors={formErrors} />
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              {initialData?.id ? "Edit Payment" : "Create New Payment"}
            </h2>
          </div>

          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50 border-b px-6">
              <CardTitle className="text-base font-medium">Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Supplier Select */}
                <FormField
                  control={form.control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier</FormLabel>
                      <div className="relative">
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                          onClick={() => setSupplierDropdownOpen(!supplierDropdownOpen)}
                        >
                          {field.value
                            ? suppliers.find((supplier) => supplier.id === field.value)?.name || "Select supplier"
                            : "Select supplier"}
                          <Check className="ml-auto h-4 w-4" />
                        </Button>
                        
                        {supplierDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white rounded-md border shadow-md">
                            <div className="p-2">
                              <Input
                                placeholder="Search suppliers..."
                                className="mb-2"
                                value={supplierSearch}
                                onChange={(e) => setSupplierSearch(e.target.value)}
                                autoFocus
                              />
                              
                              <div className="max-h-[200px] overflow-y-auto">
                                {filteredSuppliers.length === 0 ? (
                                  <div className="text-center py-2 text-sm text-gray-500">
                                    No suppliers found
                                  </div>
                                ) : (
                                  filteredSuppliers.map((supplier) => (
                                    <div
                                      key={supplier.id}
                                      className={cn(
                                        "flex items-center justify-between px-2 py-1.5 cursor-pointer rounded hover:bg-gray-100",
                                        supplier.id === field.value && "bg-gray-100"
                                      )}
                                      onClick={() => {
                                        field.onChange(supplier.id);
                                        setSupplierSearch("");
                                        setSupplierDropdownOpen(false);
                                      }}
                                    >
                                      <span>{supplier.name}</span>
                                      {supplier.id === field.value && (
                                        <Check className="h-4 w-4 text-primary" />
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Payment Date</FormLabel>
                      <FormDatePicker
                        date={field.value}
                        onSelect={(date) => date && field.onChange(date)}
                        disabled={loading}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accountType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Type</FormLabel>
                      <Select
                        disabled={loading}
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue("accountId", "");
                        }}
                        value={field.value}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select account type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="bank">Bank Account</SelectItem>
                          <SelectItem value="cash">Cash Account</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account</FormLabel>
                      <Select
                        disabled={loading || !form.watch("accountType")}
                        onValueChange={field.onChange}
                        value={field.value}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {form.watch("accountType") === "bank"
                            ? bankAccounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.accountName}
                              </SelectItem>
                            ))
                            : cashAccounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.accountName}
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
                  name="method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Bank Transfer, Cash, UPI" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="transactionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transaction ID (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Transaction reference number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Note (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          disabled={loading}
                          placeholder="Enter additional notes"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4 mt-8">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => window.history.back()}
            >
              Cancel
            </Button>
            <Button 
              disabled={loading} 
              type="submit"
              className="px-8"
            >
              {loading ? (
                <>
                  <span className="animate-spin mr-2">○</span>
                  Processing...
                </>
              ) : submitButtonText}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

