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
import { FormErrorSummary } from "@/components/ui/form-error-summary";

// Modify the interface directly in the component file
interface IncomeFormProps {
  initialData: any;
  incomeCategories: {
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }[];
  bankAccounts: {
    id: string;
    accountName: string;
    // ...other properties
  }[];
  cashAccounts: {
    id: string;
    accountName: string;
    // ...other properties
  }[];
  onSuccess?: () => void;
  submitButtonText?: string; // Add this line
}

const formSchema = z.object({
  incomeDate: z.date({
    required_error: "Income date is required",
  }),
  amount: z.coerce.number().positive({
    message: "Amount must be positive",
  }),
  incomeCategoryId: z.string().min(1, {
    message: "Income category is required",
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

type IncomeFormValues = z.infer<typeof formSchema>;

export const IncomeFormDialog: React.FC<IncomeFormProps> = ({
  initialData,
  incomeCategories,
  bankAccounts,
  cashAccounts,
  onSuccess,
  submitButtonText = "Create"
}) => {
  const [loading, setLoading] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // Add this computed value
  const filteredCategories = incomeCategories.filter(category =>
    category.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  let defaultValues: Partial<IncomeFormValues> = {
    incomeDate: new Date(),
    amount: 0,
    incomeCategoryId: "",
    description: "",
    tourPackageQueryId: initialData?.tourPackageQueryId || undefined,
    accountId: "",
    accountType: "",
  };

  if (initialData && Object.keys(initialData).length > 1) {
    defaultValues = {
      incomeDate: initialData.incomeDate ? new Date(initialData.incomeDate) : new Date(),
      amount: parseFloat(initialData.amount),
      incomeCategoryId: initialData.incomeCategoryId || "",
      description: initialData.description || "",
      tourPackageQueryId: initialData.tourPackageQueryId || undefined,
      accountId: initialData.bankAccountId || initialData.cashAccountId || "",
      accountType: initialData.bankAccountId ? "bank" : "cash",
    };
  }

  const form = useForm<IncomeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const getCategoryNameById = (id: string) => {
    const category = incomeCategories.find(cat => cat.id === id);
    return category ? category.name : "";
  };

  const onSubmit = async (data: IncomeFormValues) => {
    try {
      setLoading(true);
      setFormErrors([]);

      // Prepare the API data with correct account type field
      const apiData = {
        incomeDate: data.incomeDate,
        amount: data.amount,
        incomeCategoryId: data.incomeCategoryId,
        description: data.description,
        tourPackageQueryId: data.tourPackageQueryId,
        bankAccountId: data.accountType === 'bank' ? data.accountId : null,
        cashAccountId: data.accountType === 'cash' ? data.accountId : null,
      };

      if (initialData && initialData.id) {
        await axios.patch(`/api/incomes/${initialData.id}`, apiData);
        toast.success("Income updated.");
      } else {
        await axios.post('/api/incomes', apiData);
        toast.success("Income created.");
      }

      if (onSuccess) {
        onSuccess();
      }
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
    <div className="space-y-8 max-w-4xl mx-auto">
      <FormErrorSummary errors={formErrors} />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-8">
          {/* Modern Header with Gradient */}
          <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 rounded-xl border border-green-100 p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-r from-green-500 to-teal-500 rounded-full p-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {initialData?.id ? "Edit Income" : "Create New Income"}
            </h2>
            <p className="text-gray-600">
              {initialData?.id ? "Update the income details below" : "Enter the details for the new income"}
            </p>
          </div>

          {/* Income Details Card */}
          <Card className="shadow-md border-0 bg-white">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200 px-8 py-6">
              <CardTitle className="text-lg font-semibold text-gray-800 flex items-center">
                <span className="bg-green-100 rounded-full p-2 mr-3">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </span>
                Income Information
              </CardTitle>
            </CardHeader>
            <CardContent className="px-8 py-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Income Category Select - Enhanced implementation */}
                <FormField
                  control={form.control}
                  name="incomeCategoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Income Category</FormLabel>
                      <div className="relative">
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between h-11 border-gray-300 hover:border-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20",
                            !field.value && "text-muted-foreground"
                          )}
                          onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                        >
                          {field.value
                            ? incomeCategories.find((category) => category.id === field.value)?.name || "Select category"
                            : "Select income category"}
                          <Check className="ml-auto h-4 w-4" />
                        </Button>

                        {categoryDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white rounded-md border shadow-lg">
                            <div className="p-3">
                              <Input
                                placeholder="Search categories..."
                                className="mb-2 h-10 border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                                value={categorySearch}
                                onChange={(e) => setCategorySearch(e.target.value)}
                                autoFocus
                              />

                              <div className="max-h-[200px] overflow-y-auto">
                                {filteredCategories.length === 0 ? (
                                  <div className="text-sm text-gray-500 text-center py-2">
                                    No categories found
                                  </div>
                                ) : (
                                  filteredCategories.map((category) => (
                                    <div
                                      key={category.id}
                                      className="flex items-center justify-between p-2 hover:bg-gray-100 cursor-pointer rounded"
                                      onClick={() => {
                                        field.onChange(category.id);
                                        setCategoryDropdownOpen(false);
                                        setCategorySearch("");
                                      }}
                                    >
                                      <span className="text-sm">{category.name}</span>
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

                {/* Income Date */}
                <FormField
                  control={form.control}
                  name="incomeDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-sm font-medium text-gray-700">Income Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal h-11 border-gray-300 hover:border-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value
                              ? format(field.value, "PPP")
                              : "Select date"}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => date && field.onChange(date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Amount */}
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
                            className="pl-8 h-11 border-gray-300 hover:border-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
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
                )}

                {/* Account Type */}
                <FormField
                  control={form.control}
                  name="accountType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Account Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 border-gray-300 hover:border-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20">
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

                {/* Account Select */}
                <FormField
                  control={form.control}
                  name="accountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Account</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 border-gray-300 hover:border-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20">
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
                            placeholder="Enter additional details about this income..."
                            className="resize-none min-h-[100px] border-gray-300 hover:border-gray-400 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
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
              className="px-8 py-2 h-11 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white shadow-lg"
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