"use client";

import * as z from "zod";
import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-hot-toast";
import { format } from "date-fns";

import { Input } from "@/components/ui/input";
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
import { CalendarIcon } from "lucide-react";

const formSchema = z.object({
  expenseDate: z.date({
    required_error: "Expense date is required",
  }),
  amount: z.coerce.number().positive({
    message: "Amount must be positive",
  }),
  expenseCategory: z.string().min(1, {
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

interface ExpenseFormProps {
  initialData: any;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ initialData }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [cashAccounts, setCashAccounts] = useState<any[]>([]);
  const [tourPackages, setTourPackages] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const title = initialData ? "Edit Expense" : "Create Expense";
  const description = initialData ? "Edit expense details" : "Add a new expense";
  const toastMessage = initialData ? "Expense updated." : "Expense created.";
  const action = initialData ? "Save changes" : "Create";

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch bank accounts
        const bankResponse = await axios.get('/api/bank-accounts');
        setBankAccounts(bankResponse.data.filter((account: any) => account.isActive));

        // Fetch cash accounts
        const cashResponse = await axios.get('/api/cash-accounts');
        setCashAccounts(cashResponse.data.filter((account: any) => account.isActive));

        // Fetch tour packages
        const packagesResponse = await axios.get('/api/tourPackageQuery');
        setTourPackages(packagesResponse.data);
        
        // Fetch expense categories
        const categoriesResponse = await axios.get('/api/expense-categories');
        setCategories(categoriesResponse.data.filter((category: any) => category.isActive));
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load necessary data");
      }
    };

    fetchData();
  }, []);

  let defaultValues: Partial<ExpenseFormValues> = {
    expenseDate: new Date(),
    amount: 0,
    expenseCategory: "",
    description: "",
    tourPackageQueryId: undefined,
    accountId: "",
    accountType: "",
  };

  if (initialData) {
    defaultValues = {
      expenseDate: initialData.expenseDate ? new Date(initialData.expenseDate) : new Date(),
      amount: initialData.amount,
      expenseCategory: initialData.expenseCategory,
      description: initialData.description || "",
      tourPackageQueryId: initialData.tourPackageQueryId || undefined,
      accountId: initialData.bankAccountId || initialData.cashAccountId || "",
      accountType: initialData.bankAccountId ? "bank" : "cash",
    };
  }

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const onSubmit = async (data: ExpenseFormValues) => {
    try {
      setLoading(true);
      if (initialData) {
        // Update existing expense
        await axios.patch(`/api/expenses/${initialData.id}`, data);
      } else {
        // Create new expense
        await axios.post('/api/expenses', data);
      }
      router.push('/expenses');
      router.refresh();
      toast.success(toastMessage);
    } catch (error: any) {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <FormField
              control={form.control}
              name="expenseDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Expense Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
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
              name="expenseCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expense Category</FormLabel>
                  <Select
                    disabled={loading}
                    onValueChange={field.onChange}
                    value={field.value}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
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
                        <SelectValue placeholder="Select a tour package" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {tourPackages.map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.id}>
                          {pkg.tourPackageQueryName || `Package #${pkg.id.substring(0, 8)}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Associate this expense with a specific tour package
                  </FormDescription>
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
                      // Reset the accountId when account type changes
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
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      disabled={loading}
                      placeholder="Enter description"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator />

          <Button disabled={loading} type="submit">
            {action}
          </Button>
        </form>
      </Form>
    </div>
  );
};
