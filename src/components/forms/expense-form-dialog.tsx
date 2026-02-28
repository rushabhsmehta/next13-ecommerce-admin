"use client";

import * as z from "zod";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import axios from "axios";
import { toast } from "react-hot-toast";
import { dateToUtc } from "@/lib/timezone-utils";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpenseFormProps } from "@/types";
import { FormErrorSummary } from "@/components/ui/form-error-summary";
import ImageUpload from "@/components/ui/image-upload";
import { DatePickerField } from "@/components/forms/shared/DatePickerField";
import { SearchableFormSelect } from "@/components/forms/shared/SearchableFormSelect";
import { extractFormErrors } from "@/lib/transaction-schemas";

const formSchema = z.object({
  expenseDate: z.date({
    required_error: "Expense date is required",
  }),
  amount: z.coerce.number().positive({
    message: "Amount must be positive",
  }),
  expenseCategoryId: z.string().min(1, {
    message: "Expense category is required",
  }),
  description: z.string().optional(),
  tourPackageQueryId: z.string().optional(),
  accountId: z.string().optional(),
  accountType: z.string().optional(),
  images: z.array(z.string()).default([]),
  isAccrued: z.boolean().default(false),
}).refine((data) => {
  // If not accrued, account information is required
  if (!data.isAccrued) {
    return data.accountType && data.accountId;
  }
  return true;
}, {
  message: "Account information is required for paid expenses",
  path: ["accountType"],
});

type ExpenseFormValues = z.infer<typeof formSchema>;

export const ExpenseFormDialog: React.FC<ExpenseFormProps> = ({
  initialData,
  expenseCategories,
  bankAccounts,
  cashAccounts,
  onSuccess = () => { },
  submitButtonText = "Create"
}) => {
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);  let defaultValues: Partial<ExpenseFormValues> = {
    expenseDate: new Date(),
    amount: 0,
    expenseCategoryId: "",
    description: "",
    tourPackageQueryId: initialData && initialData.tourPackageQueryId ? initialData.tourPackageQueryId : undefined,
    accountId: "",
    accountType: "",
    images: [],
    isAccrued: false,
  };if (initialData && initialData.id) {    // Only set these values when we have an existing expense (has an id)
    defaultValues = {
      expenseDate: initialData.expenseDate ? new Date(initialData.expenseDate) : new Date(),
      amount: initialData.amount,
      expenseCategoryId: initialData.expenseCategoryId || "",
      description: initialData.description || "",
      tourPackageQueryId: initialData.tourPackageQueryId || undefined,
      accountId: initialData.bankAccountId || initialData.cashAccountId || "",
      accountType: initialData.bankAccountId ? "bank" : "cash",
      images: initialData.images?.map((image: any) => image.url) || [],
      isAccrued: initialData.isAccrued || false,
    };
  }else if (initialData && initialData.tourPackageQueryId) {
    // If we're creating a new expense for a tour package, just pass the tour package ID
    defaultValues = {
      ...defaultValues,
      tourPackageQueryId: initialData.tourPackageQueryId
    };
  }

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const onSubmit = async (data: ExpenseFormValues) => {
    try {
      console.log("Expense form submission initiated with data:", {
        ...data,
        initialDataProps: initialData ? Object.keys(initialData) : "No initialData"
      });
      setLoading(true);
      setFormErrors([]);      // Validate required fields before API call
      if (!data.expenseCategoryId) {
        setFormErrors(["Expense category is required"]);
        toast.error("Expense category is required");
        setLoading(false);
        return;
      }

      if (!data.isAccrued && (!data.accountType || !data.accountId)) {
        setFormErrors(["Account information is required for paid expenses"]);
        toast.error("Account information is required for paid expenses");
        setLoading(false);
        return;
      }      // Prepare the API data with correct account type field and timezone-safe date conversion
      const apiData = {
        ...data,
        // Convert the local date to UTC for database storage
        expenseDate: dateToUtc(data.expenseDate) || data.expenseDate,
        bankAccountId: (!data.isAccrued && data.accountType === 'bank') ? data.accountId : null,
        cashAccountId: (!data.isAccrued && data.accountType === 'cash') ? data.accountId : null,
        images: data.images || [],
      } as Partial<typeof data & { bankAccountId: string | null; cashAccountId: string | null; images: string[] }>;
      delete apiData.accountId;
      delete apiData.accountType;

      console.log("Submitting expense data:", apiData);

      if (initialData && initialData.id) {
        const response = await axios.patch(`/api/expenses/${initialData.id}`, apiData);
        console.log("Update response:", response.data);
      } else {
        const response = await axios.post('/api/expenses', apiData);
        console.log("Create response:", response.data);
      }

      toast.success(initialData && initialData.id ? "Expense updated." : "Expense created.");
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Error submitting expense form:", error);
      const errorMessage = error.response?.data?.message || error.message || "Something went wrong";
      toast.error(errorMessage);
      setFormErrors([errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const onError = (errors: any) => {
    console.error("Form Validation Errors:", errors);
    setFormErrors(extractFormErrors(errors));
    toast.error("Please check the form for errors");
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <FormErrorSummary errors={formErrors} />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-8">
          {/* Modern Header with Gradient */}
          <div className="bg-gradient-to-r from-red-50 via-orange-50 to-yellow-50 rounded-xl border border-red-100 p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-full p-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {initialData?.id ? "Edit Expense" : "Create New Expense"}
            </h2>
            <p className="text-gray-600">
              {initialData?.id ? "Update the expense details below" : "Enter the details for the new expense"}
            </p>
          </div>

          {/* Expense Details Card */}
          <Card className="shadow-md border-0 bg-white">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200 px-8 py-6">
              <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
                <span className="bg-orange-100 rounded-full p-2 mr-3">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </span>
                Expense Information
              </CardTitle>
            </CardHeader>
            <CardContent className="px-8 py-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Category Select */}
                <SearchableFormSelect
                  control={form.control}
                  name="expenseCategoryId"
                  label="Expense Category"
                  items={expenseCategories}
                  valueKey={(c) => c.id}
                  labelKey={(c) => c.name}
                  placeholder="Select expense category"
                  searchPlaceholder="Search categories..."
                  emptyMessage="No categories found"
                  colorClass="orange"
                />

                {/* Expense Date */}
                <DatePickerField
                  control={form.control}
                  name="expenseDate"
                  label="Expense Date"
                  dateFormat="PPP"
                  colorClass="orange"
                />                {/* Amount */}
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Amount</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">₹</span>
                          <Input
                            disabled={loading}
                            placeholder="Enter amount"
                            type="number"
                            step="0.01"
                            className="pl-8 h-11 border-gray-300 hover:border-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Accrual Status */}
                <FormField
                  control={form.control}
                  name="isAccrued"
                  render={({ field }) => (                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-gray-200 p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(checked === true)}
                          className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-medium text-gray-700">
                          Accrued Expense
                        </FormLabel>
                        <p className="text-xs text-gray-500">
                          Check this if the expense is incurred but not yet paid
                        </p>
                      </div>
                    </FormItem>
                  )}
                />

                {/* Tour Package Query Select */}
                {initialData && initialData.tourPackageQueryId && (
                  <FormField
                    control={form.control}
                    name="tourPackageQueryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Tour Package Query <span className="text-gray-400">(Optional)</span></FormLabel>
                        <FormControl>
                          <Input
                            disabled={true}
                            value={initialData.tourPackageQueryId || ''}
                            className="h-11 border-gray-300 bg-gray-50"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}                {/* Account Type - Only show if not accrued */}
                {!form.watch("isAccrued") && (
                  <FormField
                    control={form.control}
                    name="accountType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Account Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11 border-gray-300 hover:border-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20">
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
                )}

                {/* Account Select - Only show if not accrued */}
                {!form.watch("isAccrued") && (
                  <FormField
                    control={form.control}
                    name="accountId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Account</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11 border-gray-300 hover:border-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20">
                              <SelectValue placeholder="Select account" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {form.watch("accountType") === "bank" &&
                              bankAccounts.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  {account.accountName}
                                </SelectItem>
                              ))}
                            {form.watch("accountType") === "cash" &&
                              cashAccounts.map((account) => (
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
                )}

                {/* Description */}
                <div className="lg:col-span-2">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Description <span className="text-gray-400">(Optional)</span></FormLabel>
                        <FormControl>
                          <Textarea
                            disabled={loading}
                            placeholder="Enter additional details about this expense..."
                            className="resize-none min-h-[100px] border-gray-300 hover:border-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>          </CardContent>
          </Card>

          {/* Expense Screenshots Section */}
          <Card className="shadow-md border-0 bg-white">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200 px-8 py-6">
              <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
                <span className="bg-orange-100 rounded-full p-2 mr-3">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </span>
                Expense Screenshots
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
              onClick={() => {
                if (typeof onSuccess === 'function') {
                  onSuccess();
                } else {
                  window.history.back();
                }
              }}
              className="px-6 py-2 h-11 border-gray-300 hover:border-gray-400"
            >
              Cancel
            </Button>
            <Button
              disabled={loading}
              type="submit"
              className="px-8 py-2 h-11 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg"
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