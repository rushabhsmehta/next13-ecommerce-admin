"use client";

import * as z from "zod";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import axios from "axios";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { createDatePickerValue, formatLocalDate } from "@/lib/timezone-utils";

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
import { PaymentFormProps } from "@/types";
import { FormErrorSummary } from "@/components/ui/form-error-summary";
import ImageUpload from "@/components/ui/image-upload";

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
  paymentType: z.string().min(1, {
    message: "Payment type is required",
  }),
  supplierId: z.string().optional(),
  customerId: z.string().optional(),
  saleReturnId: z.string().optional(),
  tourPackageQueryId: z.string().optional(),
  accountId: z.string().min(1, {
    message: "Account is required",
  }),
  accountType: z.string().min(1, {
    message: "Account type is required",
  }),
  images: z.array(z.string()).default([]),
}).refine((data) => {
  if (data.paymentType === "supplier_payment" && !data.supplierId) {
    return false;
  }
  if (data.paymentType === "customer_refund" && !data.customerId) {
    return false;
  }
  return true;
}, {
  message: "Please select the appropriate recipient for this payment type",
  path: ["supplierId", "customerId"]
});

type PaymentFormValues = z.infer<typeof formSchema>;

export const PaymentFormDialog: React.FC<PaymentFormProps> = ({
  initialData,
  suppliers,
  customers,
  bankAccounts,
  cashAccounts,
  onSuccess,
  submitButtonText = "Create"
}) => {
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [tourPackageQueryDropdownOpen, setTourPackageQueryDropdownOpen] = useState(false);
  const [tourPackageQuerySearch, setTourPackageQuerySearch] = useState("");

  // Add these computed values
  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(supplierSearch.toLowerCase())
  );
  
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (customer.contact && customer.contact.toLowerCase().includes(customerSearch.toLowerCase()))
  );

  // Extract tour package queries from initialData
  const { confirmedTourPackageQueries = [], ...paymentData } = initialData;

  let defaultValues: Partial<PaymentFormValues> = {
    paymentDate: new Date(),
    amount: 0,
    method: "",
    transactionId: "",
    note: "",
    paymentType: "supplier_payment",
    supplierId: "",
    customerId: "",
    saleReturnId: "",
    tourPackageQueryId: paymentData?.tourPackageQueryId || undefined,
    accountId: "",
    accountType: "",
    images: [],
  };

  if (paymentData && Object.keys(paymentData).length > 1) {
    defaultValues = {
      paymentDate: paymentData.paymentDate ? new Date(paymentData.paymentDate) : new Date(),
      amount: paymentData.amount,
      method: paymentData.method || "",
      transactionId: paymentData.transactionId || "",
      note: paymentData.note || "",
      paymentType: paymentData.paymentType || "supplier_payment",
      supplierId: paymentData.supplierId || "",
      customerId: paymentData.customerId || "",
      saleReturnId: paymentData.saleReturnId || "",
      tourPackageQueryId: paymentData.tourPackageQueryId || undefined,
      accountId: paymentData.bankAccountId || paymentData.cashAccountId || "",
      accountType: paymentData.bankAccountId ? "bank" : "cash",
      images: paymentData.images?.map((image: any) => image.url) || [],
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
        cashAccountId: string | null,
        images: string[]
      }> = {
        ...data,
        bankAccountId: data.accountType === 'bank' ? data.accountId : null,
        cashAccountId: data.accountType === 'cash' ? data.accountId : null,
        images: data.images || []
      };
      delete apiData.accountId;
      delete apiData.accountType;

      if (paymentData && paymentData.id) {
        await axios.patch(`/api/payments/${paymentData.id}`, apiData);
      } else {
        await axios.post('/api/payments', apiData);
      }

      toast.success(paymentData.id ? "Payment updated." : "Payment created.");
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
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <FormErrorSummary errors={formErrors} />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-6">
          {/* Enhanced Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  {paymentData?.id ? "Edit Payment" : "Create New Payment"}
                </h1>
                <p className="text-blue-100 mt-2">
                  {paymentData?.id ? "Update payment information" : "Add a new payment record"}
                </p>
              </div>
              <div className="bg-white/20 rounded-full p-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>

          {/* Payment Details Card */}
          <Card className="shadow-md border-0 bg-white">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200 px-8 py-6">
              <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
                <span className="bg-blue-100 rounded-full p-2 mr-3">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </span>
                Payment Information
              </CardTitle>
            </CardHeader>
            <CardContent className="px-8 py-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">                {/* Tour Package Query Select */}
                <div className="lg:col-span-2">
                  <FormField
                    control={form.control}
                    name="tourPackageQueryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Tour Package Query</FormLabel>
                        <div className="relative">
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between h-11 px-4 py-2 border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20",
                              !field.value && "text-muted-foreground"
                            )}
                            onClick={() => setTourPackageQueryDropdownOpen(!tourPackageQueryDropdownOpen)}
                          >
                            {field.value
                              ? confirmedTourPackageQueries.find((query) => query.id === field.value)?.tourPackageQueryName || "Select tour package query"
                              : "Select tour package query"}
                            <ChevronsUpDown className="ml-auto h-4 w-4 opacity-50" />
                          </Button>

                          {tourPackageQueryDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white rounded-lg border border-gray-200 shadow-lg">
                              <div className="p-3">
                                <Input
                                  placeholder="Search tour package queries..."
                                  className="mb-3 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                  value={tourPackageQuerySearch}
                                  onChange={(e) => setTourPackageQuerySearch(e.target.value)}
                                />
                                <div className="max-h-[200px] overflow-y-auto">
                                  {confirmedTourPackageQueries.length === 0 ? (
                                    <div className="p-3 text-center text-sm text-muted-foreground">
                                      No confirmed tour package queries found
                                    </div>
                                  ) : (
                                    confirmedTourPackageQueries
                                      .filter(query =>
                                        query.tourPackageQueryName.toLowerCase().includes(tourPackageQuerySearch.toLowerCase())
                                      )
                                      .map((query) => (
                                        <div
                                          key={query.id}
                                          className={cn(
                                            "flex items-center px-3 py-2 cursor-pointer rounded-md hover:bg-blue-50 transition-colors",
                                            query.id === field.value && "bg-blue-50 text-blue-700"
                                          )}
                                          onClick={() => {
                                            field.onChange(query.id);
                                            setTourPackageQueryDropdownOpen(false);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              query.id === field.value ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                          <span className="text-sm">{query.tourPackageQueryName}</span>
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
                </div>

                {/* Amount */}
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Payment Amount</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">₹</span>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="pl-8 h-11 border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Payment Date */}
                <FormField
                  control={form.control}
                  name="paymentDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-sm font-medium text-gray-700">Payment Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal h-11 border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20",
                                !field.value && "text-muted-foreground"
                              )}
                            >                              {field.value ? (
                                formatLocalDate(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={createDatePickerValue(field.value)}
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

                {/* Payment Type Selection */}
                <FormField
                  control={form.control}
                  name="paymentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Payment Type</FormLabel>
                      <Select
                        disabled={loading}
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue("supplierId", "");
                          form.setValue("customerId", "");
                        }}
                        value={field.value}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                            <SelectValue placeholder="Select payment type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="supplier_payment">Payment to Supplier</SelectItem>
                          <SelectItem value="customer_refund">Refund to Customer</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Supplier Selection - Only for supplier payments */}
                {form.watch("paymentType") === "supplier_payment" && (
                  <FormField
                    control={form.control}
                    name="supplierId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Supplier</FormLabel>
                        <div className="relative">
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between h-11 px-4 py-2 border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20",
                              !field.value && "text-muted-foreground"
                            )}
                            onClick={() => setSupplierDropdownOpen(!supplierDropdownOpen)}
                          >
                            {field.value
                              ? suppliers.find((supplier) => supplier.id === field.value)?.name || "Select supplier"
                              : "Select supplier"}
                            <ChevronsUpDown className="ml-auto h-4 w-4 opacity-50" />
                          </Button>

                          {supplierDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white rounded-lg border border-gray-200 shadow-lg">
                              <div className="p-3">
                                <Input
                                  placeholder="Search suppliers..."
                                  className="mb-3 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                  value={supplierSearch}
                                  onChange={(e) => setSupplierSearch(e.target.value)}
                                  autoFocus
                                />
                                <div className="max-h-[200px] overflow-y-auto">
                                  {filteredSuppliers.length === 0 ? (
                                    <div className="text-center py-3 text-sm text-gray-500">
                                      No suppliers found
                                    </div>
                                  ) : (
                                    filteredSuppliers.map((supplier) => (
                                      <div
                                        key={supplier.id}
                                        className={cn(
                                          "flex items-center justify-between px-3 py-2 cursor-pointer rounded-md hover:bg-blue-50 transition-colors",
                                          supplier.id === field.value && "bg-blue-50 text-blue-700"
                                        )}
                                        onClick={() => {
                                          field.onChange(supplier.id);
                                          setSupplierSearch("");
                                          setSupplierDropdownOpen(false);
                                        }}
                                      >
                                        <span className="text-sm">{supplier.name}</span>
                                        {supplier.id === field.value && (
                                          <Check className="h-4 w-4 text-blue-600" />
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
                )}

                {/* Customer Selection - Only for customer refunds */}
                {form.watch("paymentType") === "customer_refund" && (
                  <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Customer</FormLabel>
                        <div className="relative">
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between h-11 px-4 py-2 border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20",
                              !field.value && "text-muted-foreground"
                            )}
                            onClick={() => setCustomerDropdownOpen(!customerDropdownOpen)}
                          >
                            {field.value
                              ? (() => {
                                  const customer = customers.find((customer) => customer.id === field.value);
                                  if (customer) {
                                    return customer.contact ? `${customer.name} - ${customer.contact}` : customer.name;
                                  }
                                  return "Select customer";
                                })()
                              : "Select customer"}
                            <ChevronsUpDown className="ml-auto h-4 w-4 opacity-50" />
                          </Button>

                          {customerDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white rounded-lg border border-gray-200 shadow-lg">
                              <div className="p-3">
                                <Input
                                  placeholder="Search customers..."
                                  className="mb-3 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                  value={customerSearch}
                                  onChange={(e) => setCustomerSearch(e.target.value)}
                                  autoFocus
                                />
                                <div className="max-h-[200px] overflow-y-auto">
                                  {filteredCustomers.length === 0 ? (
                                    <div className="text-center py-3 text-sm text-gray-500">
                                      No customers found
                                    </div>
                                  ) : (
                                    filteredCustomers.map((customer) => (
                                      <div
                                        key={customer.id}
                                        className={cn(
                                          "flex items-center justify-between px-3 py-2 cursor-pointer rounded-md hover:bg-blue-50 transition-colors",
                                          customer.id === field.value && "bg-blue-50 text-blue-700"
                                        )}
                                        onClick={() => {
                                          field.onChange(customer.id);
                                          setCustomerSearch("");
                                          setCustomerDropdownOpen(false);
                                        }}
                                      >
                                        <div className="flex flex-col">
                                          <span className="text-sm font-medium">{customer.name}</span>
                                          {customer.contact && (
                                            <span className="text-xs text-gray-500">{customer.contact}</span>
                                          )}
                                        </div>
                                        {customer.id === field.value && (
                                          <Check className="h-4 w-4 text-blue-600" />
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
                )}

                {/* Account Type */}
                <FormField
                  control={form.control}
                  name="accountType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Account Type</FormLabel>
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
                          <SelectTrigger className="h-11 border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
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

                {/* Account Selection */}
                <FormField
                  control={form.control}
                  name="accountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Account</FormLabel>
                      <Select
                        disabled={loading || !form.watch("accountType")}
                        onValueChange={field.onChange}
                        value={field.value}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
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

                {/* Payment Method */}
                <FormField
                  control={form.control}
                  name="method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Payment Method <span className="text-gray-400">(Optional)</span></FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. Bank Transfer, Cash, UPI" 
                          className="h-11 border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Transaction ID */}
                <FormField
                  control={form.control}
                  name="transactionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Transaction ID <span className="text-gray-400">(Optional)</span></FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Transaction reference number" 
                          className="h-11 border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Note */}
                <div className="lg:col-span-2">
                  <FormField
                    control={form.control}
                    name="note"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Note <span className="text-gray-400">(Optional)</span></FormLabel>
                        <FormControl>
                          <Textarea
                            disabled={loading}
                            placeholder="Enter additional notes about this payment..."
                            className="resize-none min-h-[100px] border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Screenshots Section */}
          <Card className="shadow-md border-0 bg-white">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200 px-8 py-6">
              <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
                <span className="bg-green-100 rounded-full p-2 mr-3">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </span>
                Payment Screenshots
              </CardTitle>
            </CardHeader>
            <CardContent className="px-8 py-8">
              <FormField
                control={form.control}
                name="images"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <ImageUpload
                        value={field.value}
                        disabled={loading}
                        onChange={(url) => field.onChange([...field.value, url])}
                        onRemove={(url) => field.onChange(field.value.filter((current) => current !== url))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.history.back()}
              className="px-6 py-2 h-11 border-gray-300 hover:border-gray-400"
            >
              Cancel
            </Button>
            <Button
              disabled={loading}
              type="submit"
              className="px-8 py-2 h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium"
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