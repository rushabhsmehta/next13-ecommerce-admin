"use client"

import * as z from "zod"
import axios from "axios"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "react-hot-toast"
import { Trash } from "lucide-react"
import { CashAccount } from "@prisma/client"
import { useParams, useRouter } from "next/navigation"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { Heading } from "@/components/ui/heading"
import { AlertModal } from "@/components/modals/alert-modal"
import { Checkbox } from "@/components/ui/checkbox"

// Update the form schema
const formSchema = z.object({
  accountName: z.string().min(1),
  openingBalance: z.coerce.number().min(0),
  isActive: z.boolean().default(true)
});

type CashAccountFormValues = z.infer<typeof formSchema>

interface CashAccountFormProps {
  initialData: CashAccount | null;
};

export const CashAccountForm: React.FC<CashAccountFormProps> = ({
  initialData
}) => {
  const params = useParams();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const title = initialData ? 'Edit Cash Account' : 'Create Cash Account';
  const description = initialData ? 'Edit a cash account' : 'Add a new cash account';
  const toastMessage = initialData ? 'Cash account updated.' : 'Cash account created.';
  const action = initialData ? 'Save changes' : 'Create';

  const form = useForm<CashAccountFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      accountName: '',
      openingBalance: 0,
      isActive: true,
    }
  });

  const onSubmit = async (data: CashAccountFormValues) => {
    try {
      setLoading(true);
      if (initialData) {
        await axios.patch(`/api/cash-accounts/${params.cashAccountId}`, data);
      } else {
        await axios.post(`/api/cash-accounts`, data);
      }
      router.refresh();
      router.push(`/cashaccounts`);
      toast.success(toastMessage);
    } catch (error) {
      toast.error('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/cash-accounts/${params.cashAccountId}`);
      router.refresh();
      router.push(`/cashaccounts`);
      toast.success('Cash account deleted.');
    } catch (error) {
      toast.error('Something went wrong.');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  return (
    <>
      <AlertModal 
        isOpen={open} 
        onClose={() => setOpen(false)}
        onConfirm={onDelete}
        loading={loading}
      />
      <div className="flex items-center justify-between">
        <Heading title={title} description={description} />
        {initialData && (
          <Button
            disabled={loading}
            variant="destructive"
            size="sm"
            onClick={() => setOpen(true)}
          >
            <Trash className="h-4 w-4" />
          </Button>
        )}
      </div>
      <Separator />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
          <div className="grid grid-cols-3 gap-8">
            <FormField
              control={form.control}
              name="accountName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name</FormLabel>
                  <FormControl>
                    <Input disabled={loading} placeholder="Cash Account Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="openingBalance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opening Balance</FormLabel>
                  <FormControl>
                    <Input type="number" disabled={loading} placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Is Active</FormLabel>
                  <FormControl>
                    <Checkbox 
                     checked={field.value}
                     onCheckedChange={(checked) => field.onChange(!!checked)}
                     />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button disabled={loading} className="ml-auto" type="submit">
            {action}
          </Button>
        </form>
      </Form>
    </>
  );
};
