"use client";

import * as z from "zod";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { toast } from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormDatePicker } from "@/components/ui/form-date-picker";
import { Heading } from "@/components/ui/heading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormErrorSummary } from "@/components/ui/form-error-summary";

const formSchema = z.object({
  transferDate: z.date({
    required_error: "Transfer date is required",
  }),
  amount: z.coerce.number().positive({
    message: "Amount must be positive",
  }),
  reference: z.string().optional(),
  description: z.string().optional(),
  fromAccountType: z.string().min(1, {
    message: "Source account type is required",
  }),
  fromAccountId: z.string().min(1, {
    message: "Source account is required",
  }),
  toAccountType: z.string().min(1, {
    message: "Destination account type is required",
  }),
  toAccountId: z.string().min(1, {
    message: "Destination account is required",
  }),
}).refine(data => {
  // Prevent transfer between the same account
  if (data.fromAccountType === data.toAccountType && data.fromAccountId === data.toAccountId) {
    return false;
  }
  return true;
}, {
  message: "Cannot transfer funds to the same account",
  path: ["toAccountId"],
});

type TransferFormValues = z.infer<typeof formSchema>;

interface TransferFormProps {
  initialData: any;
}

export const TransferForm: React.FC<TransferFormProps> = ({ initialData }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [cashAccounts, setCashAccounts] = useState<any[]>([]);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  const title = initialData ? "Edit Fund Transfer" : "Create Fund Transfer";
  const description = initialData ? "Edit fund transfer details" : "Add a new fund transfer";
  const toastMessage = initialData ? "Fund transfer updated." : "Fund transfer created.";
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
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load necessary data");
      }
    };

    fetchData();
  }, []);

  // Determine default values
  let defaultValues: Partial<TransferFormValues> = {
    transferDate: new Date(),
    amount: 0,
    reference: "",
    description: "",
    fromAccountType: "",
    fromAccountId: "",
    toAccountType: "",
    toAccountId: "",
  };

  if (initialData) {
    defaultValues = {
      transferDate: initialData.transferDate ? new Date(initialData.transferDate) : new Date(),
      amount: initialData.amount,
      reference: initialData.reference || "",
      description: initialData.description || "",
      fromAccountType: initialData.fromBankAccountId ? "bank" : "cash",
      fromAccountId: initialData.fromBankAccountId || initialData.fromCashAccountId || "",
      toAccountType: initialData.toBankAccountId ? "bank" : "cash",
      toAccountId: initialData.toBankAccountId || initialData.toCashAccountId || "",
    };
  }

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const onSubmit = async (data: TransferFormValues) => {
    try {
      setLoading(true);
      setFormErrors([]);
      setDebugInfo(null);
      
      // Validate that source and destination are not the same
      if (data.fromAccountType === data.toAccountType && data.fromAccountId === data.toAccountId) {
        toast.error("Source and destination accounts cannot be the same");
        setFormErrors(["Source and destination accounts cannot be the same"]);
        setLoading(false);
        return;
      }
      
      // Extract the properties we want to remove and keep the rest using destructuring
      const { fromAccountType, fromAccountId, toAccountType, toAccountId, ...baseApiData } = data;
      
      // Create a new object with the required API structure
      const apiData = {
        ...baseApiData,
        fromBankAccountId: fromAccountType === 'bank' ? fromAccountId : null,
        fromCashAccountId: fromAccountType === 'cash' ? fromAccountId : null,
        toBankAccountId: toAccountType === 'bank' ? toAccountId : null,
        toCashAccountId: toAccountType === 'cash' ? toAccountId : null,
      };
      
      console.log("Submitting transfer data:", apiData);
      
      if (initialData) {
        // Update existing transfer
        const response = await axios.patch(`/api/transfers/${initialData.id}`, apiData);
        console.log("Update response:", response.data);
      } else {
        // Create new transfer
        const response = await axios.post('/api/transfers', apiData);
        console.log("Create response:", response.data);
      }
      
      router.push('/transfers');
      router.refresh();
      toast.success(toastMessage);
    } catch (error: any) {
      console.error("Transfer form error:", error);
      
      // Extract detailed error information
      const errorMessage = error.response?.data?.message || error.message || "Something went wrong";
      toast.error(errorMessage);
      
      // Add specific error to formErrors
      setFormErrors([errorMessage]);
      
      // Set debug info for development purposes
      if (error.response?.data) {
        setDebugInfo(`API Error: ${JSON.stringify(error.response.data, null, 2)}`);
      } else {
        setDebugInfo(`Error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Add error handling for form validation errors
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
    <div className="space-y-4">
      {/* Add error summary at the top */}
      <FormErrorSummary errors={formErrors} />
      
      {/* Add debug info panel (visible only when there's debug info) */}
      {debugInfo && (
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-md text-sm">
          <h3 className="font-medium mb-2">Debug Information:</h3>
          <pre className="whitespace-pre-wrap text-xs max-h-64 overflow-auto">{debugInfo}</pre>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-8">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50 border-b px-6">
              <CardTitle className="text-base font-medium">Transfer Details</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pt-6">
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="transferDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Transfer Date</FormLabel>
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

                {/* Source Account Section */}
                <FormField
                  control={form.control}
                  name="fromAccountType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source Account Type</FormLabel>
                      <Select
                        disabled={loading}
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Reset the accountId when account type changes
                          form.setValue("fromAccountId", "");
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
                  name="fromAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source Account</FormLabel>
                      <Select
                        disabled={loading || !form.watch("fromAccountType")}
                        onValueChange={field.onChange}
                        value={field.value}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select source account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {form.watch("fromAccountType") === "bank"
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

                {/* Destination Account Section */}
                <FormField
                  control={form.control}
                  name="toAccountType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destination Account Type</FormLabel>
                      <Select
                        disabled={loading}
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Reset the accountId when account type changes
                          form.setValue("toAccountId", "");
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
                  name="toAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destination Account</FormLabel>
                      <Select
                        disabled={loading || !form.watch("toAccountType")}
                        onValueChange={field.onChange}
                        value={field.value}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select destination account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {form.watch("toAccountType") === "bank"
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
                  name="reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Transaction reference" {...field} />
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
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-4">
            <Button 
              variant="outline" 
              onClick={() => router.push('/transfers')}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={loading}
              className="px-8"
            >
              {loading ? (
                <>
                  <span className="animate-spin mr-2">○</span>
                  Processing...
                </>
              ) : action}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

