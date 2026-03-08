"use client"

import axios from "axios"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import { toast } from "react-hot-toast"
import { CheckIcon, ChevronDown } from "lucide-react"
import { Activity, Images, ItineraryMaster, PurchaseDetail } from "@prisma/client"
import { Location, Hotel, TourPackageQuery, Itinerary, FlightDetails, ActivityMaster, Supplier, PaymentDetail, SaleDetail, ReceiptDetail, Customer, ExpenseDetail, IncomeDetail } from "@prisma/client"
import { useParams, useRouter } from "next/navigation"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandList,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { Heading } from "@/components/ui/heading"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "@radix-ui/react-icons"
import { format } from "date-fns"
import { createDatePickerValue, formatLocalDate } from "@/lib/timezone-utils"
import type { AccountingFormBootstrapData } from "./accounting-form-options"
import { ExpenseDetailsTab, IncomeDetailsTab, PaymentDetailsTab, PurchaseDetailsTab, ReceiptDetailsTab, SaleDetailsTab } from "./transaction-detail-tabs"
import { buildAccountingSubmitPayload, calculateGSTAmount, formSchema, getAccountingDefaultValues, type TourPackageQueryAccountingFormValues, validateAccountingForm } from "./accounting-form-logic"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"

interface TourPackageQueryAccountingFormProps {
  initialData: TourPackageQuery & {
    purchaseDetails: Array<PurchaseDetail & {
      supplier: Supplier | null;
    }> | null;
    saleDetails: Array<SaleDetail & {
      customer: Customer | null;
      items?: any[];
    }> | null;
    paymentDetails: Array<PaymentDetail & {
      supplier: Supplier | null;
    }> | null;
    receiptDetails: Array<ReceiptDetail & {
      customer: Customer | null;
    }> | null;
    expenseDetails: ExpenseDetail[] | null;
    incomeDetails: IncomeDetail[] | null;
  } | null;
  bootstrapData: AccountingFormBootstrapData;
}

export const TourPackageQueryAccountingForm: React.FC<TourPackageQueryAccountingFormProps> = ({
  initialData,
  bootstrapData,
}) => {
  const params = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [showErrorDialog, setShowErrorDialog] = useState(false);

  const title = initialData ? 'Edit Tour Query' : 'Create Tour Package Query';
  const description = initialData ? 'Edit a Tour Package Query.' : 'Add a new Tour Package Query';

  const {
    suppliers,
    customers,
    allAccounts,
    expenseCategories,
    incomeCategories,
  } = bootstrapData;

  const toastMessage = initialData ? 'Tour Package Query updated.' : 'Tour Package Query created.';
  const action = initialData ? 'Save changes' : 'Create';

  const defaultValues = getAccountingDefaultValues(initialData);

  const form = useForm<TourPackageQueryAccountingFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  const { fields: purchaseFields, append: appendPurchase, remove: removePurchase } = useFieldArray({
    control: form.control,
    name: "purchaseDetails"
  });

  const { fields: saleFields, append: appendSale, remove: removeSale } = useFieldArray({
    control: form.control,
    name: "saleDetails"
  });

  const { fields: paymentFields, append: appendPayment, remove: removePayment } = useFieldArray({
    control: form.control,
    name: "paymentDetails"
  });

  const { fields: receiptFields, append: appendReceipt, remove: removeReceipt } = useFieldArray({
    control: form.control,
    name: "receiptDetails"
  });

  const { fields: expenseFields, append: appendExpense, remove: removeExpense } = useFieldArray({
    control: form.control,
    name: "expenseDetails"
  });

  const { fields: incomeFields, append: appendIncome, remove: removeIncome } = useFieldArray({
    control: form.control,
    name: "incomeDetails"
  });

  const onSubmit = async (data: TourPackageQueryAccountingFormValues) => {
    const errors = validateAccountingForm(data);

    if (errors.length > 0) {
      setFormErrors(errors);
      setShowErrorDialog(true);
      return;
    }

    const processedData = buildAccountingSubmitPayload(data, allAccounts);

    try {
      setLoading(true);
      if (initialData) {
        await axios.patch(`/api/tourPackageQuery/${params?.tourPackageQueryId}/accounting`, processedData);
      } else {
        await axios.post(`/api/tourPackageQuery`, processedData);
      }
      router.refresh();
      router.push(`/tourPackageQuery`);
      toast.success(toastMessage);
    } catch (error: any) {
      console.error('Error:', error.response ? error.response.data : error.message);
      toast.error('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Add the error dialog */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Form Validation Errors</DialogTitle>
            <DialogDescription>
              Please fix the following errors before submitting:
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto">
            <ul className="list-disc pl-5 space-y-2">
              {formErrors.map((error, index) => (
                <li key={index} className="text-destructive">{error}</li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setShowErrorDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Rest of component */}
      <div className="flex items-center justify-between">
        <Heading title={title} description={description} />
      </div>
      <Separator />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
          <Tabs defaultValue="purchaseDetails">
            <TabsList>
              <TabsTrigger value="purchaseDetails">Purchase</TabsTrigger>
              <TabsTrigger value="saleDetails">Sale</TabsTrigger>
              <TabsTrigger value="paymentDetails">Payment</TabsTrigger>
              <TabsTrigger value="receiptDetails">Receipt</TabsTrigger>
              <TabsTrigger value="expenseDetails">Expense</TabsTrigger>
              <TabsTrigger value="incomeDetails">Income</TabsTrigger>
            </TabsList>

            <PurchaseDetailsTab
              form={form}
              fields={purchaseFields}
              suppliers={suppliers}
              appendPurchase={appendPurchase}
              removePurchase={removePurchase}
              calculateGSTAmount={calculateGSTAmount}
            />

            <SaleDetailsTab
              form={form}
              fields={saleFields}
              customers={customers}
              appendSale={appendSale}
              removeSale={removeSale}
              calculateGSTAmount={calculateGSTAmount}
            />
            <PaymentDetailsTab
              form={form}
              fields={paymentFields}
              suppliers={suppliers}
              allAccounts={allAccounts}
              appendPayment={appendPayment}
              removePayment={removePayment}
            />

            <ReceiptDetailsTab
              form={form}
              fields={receiptFields}
              customers={customers}
              allAccounts={allAccounts}
              appendReceipt={appendReceipt}
              removeReceipt={removeReceipt}
            />

            <ExpenseDetailsTab
              form={form}
              fields={expenseFields}
              expenseCategories={expenseCategories}
              allAccounts={allAccounts}
              appendExpense={appendExpense}
              removeExpense={removeExpense}
            />

            <IncomeDetailsTab
              form={form}
              fields={incomeFields}
              incomeCategories={incomeCategories}
              allAccounts={allAccounts}
              appendIncome={appendIncome}
              removeIncome={removeIncome}
            />
          </Tabs>

          <Button disabled={loading} className="ml-auto" type="submit">
            {action}
          </Button>

        </form>
      </Form >
    </>
  );
}
