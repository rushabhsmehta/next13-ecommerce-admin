"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-hot-toast";
import axios from "axios";
import { useRouter } from "next/navigation";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BankAccount, CashAccount } from "@prisma/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  transferDate: z.date({
    required_error: "Transfer date is required",
  }),
  fromAccountType: z.enum(["bank", "cash"]),
  fromAccountId: z.string().min(1, "Source account is required"),
  toAccountType: z.enum(["bank", "cash"]),
  toAccountId: z.string().min(1, "Destination account is required"),
  reference: z.string().optional(),
  description: z.string().optional(),
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

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankAccounts: BankAccount[];
  cashAccounts: CashAccount[];
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  bankAccounts,
  cashAccounts
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      transferDate: new Date(),
      fromAccountType: "bank",
      fromAccountId: "",
      toAccountType: "bank",
      toAccountId: "",
      reference: "",
      description: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      await axios.post('/api/transfers', values);
      router.refresh();
      toast.success('Transfer created successfully');
      form.reset();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // Handle the modal closing
  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Fund Transfer</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Transfer Date */}
              <FormField
                control={form.control}
                name="transferDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Transfer Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
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
                          onSelect={(day) => {
                            if (day) {
                              field.onChange(day);
                            }
                          }}
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
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Enter amount"
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* From Account Section */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fromAccountType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From Account Type</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value as "bank" | "cash")}
                      value={field.value}
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
                render={({ field }) => {
                  const accountType = form.watch("fromAccountType");
                  const accounts = accountType === "bank" ? bankAccounts : cashAccounts;
                  
                  return (
                    <FormItem>
                      <FormLabel>From Account</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.accountName}
                              {accountType === "bank" && (account as BankAccount).bankName && 
                                ` (${(account as BankAccount).bankName})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>

            {/* To Account Section */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="toAccountType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>To Account Type</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value as "bank" | "cash")}
                      value={field.value}
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
                render={({ field }) => {
                  const accountType = form.watch("toAccountType");
                  const accounts = accountType === "bank" ? bankAccounts : cashAccounts;
                  
                  return (
                    <FormItem>
                      <FormLabel>To Account</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.accountName}
                              {accountType === "bank" && (account as BankAccount).bankName && 
                                ` (${(account as BankAccount).bankName})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>

            {/* Reference */}
            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional reference or transaction ID" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional description of the transfer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Processing..." : "Create Transfer"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

