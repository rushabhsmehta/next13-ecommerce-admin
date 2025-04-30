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
import { ExpenseFormProps } from "@/types";
import { FormErrorSummary } from "@/components/ui/form-error-summary";
import { FormDatePicker } from "@/components/ui/form-date-picker";

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
  accountId: z.string().min(1, {
    message: "Account is required",
  }),
  accountType: z.string().min(1, {
    message: "Account type is required",
  }),
});

type ExpenseFormValues = z.infer<typeof formSchema>;

export const ExpenseFormDialog: React.FC<ExpenseFormProps> = ({
  initialData,
  expenseCategories,
  bankAccounts,
  cashAccounts,
  onSuccess = () => {},
  submitButtonText = "Create"
}) => {
  const [loading, setLoading] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // Add this computed value
  const filteredCategories = expenseCategories.filter(category => 
    category.name.toLowerCase().includes(categorySearch.toLowerCase())
  );
  let defaultValues: Partial<ExpenseFormValues> = {
    expenseDate: new Date(),
    amount: 0,
    expenseCategoryId: "",
    description: "",
    tourPackageQueryId: initialData && initialData.tourPackageQueryId ? initialData.tourPackageQueryId : undefined,
    accountId: "",
    accountType: "",
  };
  if (initialData && initialData.id) {
    // Only set these values when we have an existing expense (has an id)
    defaultValues = {
      expenseDate: initialData.expenseDate ? new Date(initialData.expenseDate) : new Date(),
      amount: initialData.amount,
      expenseCategoryId: initialData.expenseCategoryId || "",
      description: initialData.description || "",
      tourPackageQueryId: initialData.tourPackageQueryId || undefined,
      accountId: initialData.bankAccountId || initialData.cashAccountId || "",
      accountType: initialData.bankAccountId ? "bank" : "cash",
    };
  } else if (initialData && initialData.tourPackageQueryId) {
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

  const getCategoryNameById = (id: string) => {
    const category = expenseCategories.find(cat => cat.id === id);
    return category ? category.name : "";
  };
  const onSubmit = async (data: ExpenseFormValues) => {
    try {
      console.log("Expense form submission initiated with data:", { 
        ...data, 
        initialDataProps: initialData ? Object.keys(initialData) : "No initialData" 
      });
      setLoading(true);
      setFormErrors([]);
      
      // Validate required fields before API call
      if (!data.expenseCategoryId) {
        setFormErrors(["Expense category is required"]);
        toast.error("Expense category is required");
        setLoading(false);
        return;
      }
      
      if (!data.accountType || !data.accountId) {
        setFormErrors(["Account information is required"]);
        toast.error("Account information is required");
        setLoading(false);
        return;
      }
      
      // Prepare the API data with correct account type field
      const apiData = {
        ...data,
        bankAccountId: data.accountType === 'bank' ? data.accountId : null,
        cashAccountId: data.accountType === 'cash' ? data.accountId : null,
      } as Partial<typeof data & { bankAccountId: string | null; cashAccountId: string | null }>;
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
              {initialData?.id ? "Edit Expense" : "Create New Expense"}
            </h2>
          </div>

          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50 border-b px-6">
              <CardTitle className="text-base font-medium">Expense Details</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Category Select - Improved implementation */}
                <FormField
                  control={form.control}
                  name="expenseCategoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expense Category</FormLabel>
                      <div className="relative">
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                          onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                        >
                          {field.value
                            ? expenseCategories.find((category) => category.id === field.value)?.name || "Select category"
                            : "Select expense category"}
                          <Check className="ml-auto h-4 w-4" />
                        </Button>
                        
                        {categoryDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white rounded-md border shadow-md">
                            <div className="p-2">
                              <Input
                                placeholder="Search categories..."
                                className="mb-2"
                                value={categorySearch}
                                onChange={(e) => setCategorySearch(e.target.value)}
                                autoFocus
                              />
                              
                              <div className="max-h-[200px] overflow-y-auto">
                                {filteredCategories.length === 0 ? (
                                  <div className="text-center py-2 text-sm text-gray-500">
                                    No categories found
                                  </div>
                                ) : (
                                  filteredCategories.map((category) => (
                                    <div
                                      key={category.id}
                                      className={cn(
                                        "flex items-center justify-between px-2 py-1.5 cursor-pointer rounded hover:bg-gray-100",
                                        category.id === field.value && "bg-gray-100"
                                      )}
                                      onClick={() => {
                                        field.onChange(category.id);
                                        setCategorySearch("");
                                        setCategoryDropdownOpen(false);
                                      }}
                                    >
                                      <span>{category.name}</span>
                                      {category.id === field.value && (
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
                  name="expenseDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Expense Date</FormLabel>
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
                  name="description"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          disabled={loading}
                          placeholder="Enter description"
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
          </Card>          {/* Submit Button */}
          <div className="flex justify-end gap-4 mt-8">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => {
                // If onSuccess is provided, use it as a cancel callback too
                if (typeof onSuccess === 'function') {
                  onSuccess();
                } else {
                  window.history.back();
                }
              }}
            >
              Cancel
            </Button>
            <Button 
              disabled={loading} 
              type="submit"
              className="px-8 bg-primary hover:bg-primary/90"
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