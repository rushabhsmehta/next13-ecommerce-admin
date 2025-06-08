"use client";

import * as z from "zod";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import axios from "axios";
import { toast } from "react-hot-toast";
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  Calendar, 
  DollarSign, 
  Tag, 
  FileText,
  Banknote,
  Building
} from "lucide-react";

const formSchema = z.object({
  accountType: z.string().min(1, {
    message: "Account type is required",
  }),
  accountId: z.string().min(1, {
    message: "Account is required",
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface PayAccruedExpenseModalProps {
  expense: any;
  bankAccounts: { id: string; accountName: string; currentBalance: number }[];
  cashAccounts: { id: string; accountName: string; currentBalance: number }[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PayAccruedExpenseModal: React.FC<PayAccruedExpenseModalProps> = ({
  expense,
  bankAccounts,
  cashAccounts,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accountType: "",
      accountId: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      setLoading(true);

      const paymentData = {
        bankAccountId: data.accountType === 'bank' ? data.accountId : null,
        cashAccountId: data.accountType === 'cash' ? data.accountId : null,
      };

      await axios.patch(`/api/expenses/${expense.id}/pay`, paymentData);

      toast.success("Expense marked as paid successfully!");
      form.reset();
      onSuccess();
    } catch (error: any) {
      console.error("Error paying expense:", error);
      const errorMessage = error.response?.data?.message || error.message || "Something went wrong";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  if (!expense) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5 text-green-600" />
            <span>Mark Expense as Paid</span>
          </DialogTitle>
          <DialogDescription>
            Convert this accrued expense to a paid expense by selecting a payment account.
          </DialogDescription>
        </DialogHeader>

        {/* Expense Details */}
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-orange-800">Expense Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-orange-800">Accrued Date</p>
                  <p className="text-sm text-orange-700">
                    {format(new Date(expense.accruedDate), "PPP")}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-orange-800">Amount</p>
                  <p className="text-lg font-bold text-orange-700">
                    {formatPrice(expense.amount)}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Tag className="h-4 w-4 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-orange-800">Category</p>
                  <p className="text-sm text-orange-700">
                    {expense.expenseCategory?.name || "Uncategorized"}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-orange-800">Status</p>
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                    Accrued
                  </Badge>
                </div>
              </div>
            </div>

            {expense.description && (
              <div className="pt-2 border-t border-orange-200">
                <p className="text-sm font-medium text-orange-800">Description</p>
                <p className="text-sm text-orange-700">{expense.description}</p>
              </div>
            )}

            {expense.tourPackageQuery?.tourPackage?.name && (
              <div className="pt-2 border-t border-orange-200">
                <p className="text-sm font-medium text-orange-800">Tour Package</p>
                <Badge variant="outline" className="border-orange-300 text-orange-700">
                  {expense.tourPackageQuery.tourPackage.name}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Account</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Account Type */}
                <FormField
                  control={form.control}
                  name="accountType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select account type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="bank">
                            <div className="flex items-center space-x-2">
                              <Building className="h-4 w-4" />
                              <span>Bank Account</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="cash">
                            <div className="flex items-center space-x-2">
                              <Banknote className="h-4 w-4" />
                              <span>Cash Account</span>
                            </div>
                          </SelectItem>
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
                      <FormLabel>Account</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {form.watch("accountType") === "bank" &&
                            bankAccounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                <div className="flex justify-between w-full">
                                  <span>{account.accountName}</span>
                                  <span className="text-muted-foreground ml-2">
                                    {formatPrice(account.currentBalance)}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          {form.watch("accountType") === "cash" &&
                            cashAccounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                <div className="flex justify-between w-full">
                                  <span>{account.accountName}</span>
                                  <span className="text-muted-foreground ml-2">
                                    {formatPrice(account.currentBalance)}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? "Processing..." : "Mark as Paid"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
