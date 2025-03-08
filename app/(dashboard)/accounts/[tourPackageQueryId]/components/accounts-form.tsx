"use client"

import * as z from "zod"
import axios from "axios"
import { useEffect, useRef, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import { toast } from "react-hot-toast"
import { CheckIcon, ChevronDown } from "lucide-react"
import { Activity, Images, ItineraryMaster, PurchaseDetail } from "@prisma/client"
import { Location, Hotel, TourPackageQuery, Itinerary, FlightDetails, ActivityMaster, Supplier, PaymentDetail, SaleDetail, ReceiptDetail, Customer, ExpenseDetail } from "@prisma/client"
import { useParams, useRouter } from "next/navigation"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
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
} from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { Heading } from "@/components/ui/heading"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "@radix-ui/react-icons"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Import any other needed components from the original file

const formSchema = z.object({
  purchaseDetails: z.array(z.object({
    supplierId: z.string(),
    purchaseDate: z.date(),
    price: z.number(),
    description: z.string().optional(),
  })).default([]),
  saleDetails: z.array(z.object({
    customerId: z.string(),
    saleDate: z.date(),
    salePrice: z.number(),
    description: z.string().optional(),
  })).default([]),
  paymentDetails: z.array(z.object({
    paymentDate: z.date(),
    amount: z.number(),
    accountId: z.string(),
    transactionId: z.string().optional(),
    note: z.string().optional(),
    supplierId: z.string().optional(),
  })).default([]),
  receiptDetails: z.array(z.object({
    receiptDate: z.date(),
    amount: z.number(),
    accountId: z.string(),
    note: z.string().optional(),
    customerId: z.string().optional(),
  })).default([]),
  expenseDetails: z.array(z.object({
    expenseDate: z.date(),
    amount: z.number(),
    expenseCategory: z.string(),
    accountId: z.string(),
    description: z.string().optional(),
  })).default([]),
  incomeDetails: z.array(z.object({
    incomeDate: z.date(),
    amount: z.number(),
    incomeCategory: z.string(),
    accountId: z.string(),
    description: z.string().optional(),
  })).default([]),
});

type TourPackageQueryAccountingFormValues = z.infer<typeof formSchema>

interface TourPackageQueryAccountingFormProps {
  initialData: TourPackageQuery & {
    purchaseDetails: Array<PurchaseDetail & {
      supplier: Supplier | null;
    }> | null;
    saleDetails: Array<SaleDetail & {
      customer: Customer | null;
    }> | null;
    paymentDetails: Array<PaymentDetail & {
      supplier: Supplier | null;
    }> | null;
    receiptDetails: Array<ReceiptDetail & {
      customer: Customer | null;
    }> | null;
    expenseDetails: ExpenseDetail[] | null;
  } | null;
}

export const TourPackageQueryAccountingForm: React.FC<TourPackageQueryAccountingFormProps> = ({
  initialData,
}) => {
  const params = useParams();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [flightDetails, setFlightDetails] = useState([]);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const editor = useRef(null)

  const title = initialData ? 'Edit Tour Query' : 'Create Tour Package Query';
  const description = initialData ? 'Edit a Tour Package Query.' : 'Add a new Tour Package Query';

  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [allAccounts, setAllAccounts] = useState<{
    id: string;
    displayName: string;
    type: 'bank' | 'cash';
    accountName: string;
    bankName?: string;
  }[]>([]);

  // Fetch suppliers
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const res = await axios.get("/api/suppliers");
        setSuppliers(res.data);
      } catch (error) {
        console.error("Error fetching suppliers", error);
      }
    };
    fetchSuppliers();
  }, []);

  // Fetch customers
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        console.log("Fetching customers...");
        const res = await axios.get("/api/customers");
        console.log("Customers response:", res.data);
        setCustomers(res.data);
      } catch (error) {
        console.error("Error fetching customers", error);
      }
    };
    fetchCustomers();
  }, []);

  // Fetch accounts separately
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        console.log("Fetching all accounts...");

        const [bankRes, cashRes] = await Promise.all([
          axios.get("/api/bank-accounts"),
          axios.get("/api/cash-accounts")
        ]);

        console.log("Bank accounts response:", bankRes.data);
        console.log("Cash accounts response:", cashRes.data);

        // Format bank accounts
        const formattedBankAccounts = Array.isArray(bankRes.data)
          ? bankRes.data.map(account => ({
            id: account.id,
            displayName: `${account.accountName}`,
            type: 'bank' as const,
            accountName: account.accountName,
            bankName: account.bankName
          }))
          : [];

        // Format cash accounts
        const formattedCashAccounts = Array.isArray(cashRes.data)
          ? cashRes.data.map(account => ({
            id: account.id,
            displayName: `${account.accountName}`,
            type: 'cash' as const,
            accountName: account.accountName
          }))
          : [];

        // Combine both types of accounts
        const combined = [...formattedBankAccounts, ...formattedCashAccounts];
        setAllAccounts(combined);

        console.log("Combined accounts:", combined);
      } catch (error: any) {
        console.error("Error fetching accounts:", error);
      }
    };
    fetchAccounts();
  }, []);

  const toastMessage = initialData ? 'Tour Package Query updated.' : 'Tour Package Query created.';
  const action = initialData ? 'Save changes' : 'Create';

  const transformInitialData = (data: any) => {
    return {
      ...data,
      purchaseDetails: data.purchaseDetails?.map((purchaseDetail: any) => ({
        supplierId: purchaseDetail.supplierId || '',
        purchaseDate: new Date(purchaseDetail.purchaseDate),
        price: purchaseDetail.price || 0,
        description: purchaseDetail.description || '',
      })) || [],
      saleDetails: data.saleDetails?.map((saleDetail: any) => ({
        customerId: saleDetail.customerId || '',
        saleDate: new Date(saleDetail.saleDate),
        salePrice: saleDetail.salePrice || 0,
        description: saleDetail.description || '',
      })) || [],
      paymentDetails: data.paymentDetails?.map((detail: any) => {
        // Determine account ID based on which field is populated
        const accountId = detail.bankAccountId || detail.cashAccountId || '';

        return {
          paymentDate: new Date(detail.paymentDate),
          amount: detail.amount || 0,
          accountId,
          transactionId: detail.transactionId || '',
          note: detail.note || '',
          supplierId: detail.supplierId || '',
        };
      }) || [],
      receiptDetails: data.receiptDetails?.map((detail: any) => {
        // Determine account ID based on which field is populated
        const accountId = detail.bankAccountId || detail.cashAccountId || '';

        return {
          customerId: detail.customerId || '',
          receiptDate: new Date(detail.receiptDate),
          amount: detail.amount || 0,
          accountId,
          note: detail.note || '',
        };
      }) || [],
      expenseDetails: data.expenseDetails?.map((detail: any) => {
        // Determine account ID based on which field is populated
        const accountId = detail.bankAccountId || detail.cashAccountId || '';

        return {
          expenseDate: new Date(detail.expenseDate),
          amount: detail.amount || 0,
          expenseCategory: detail.expenseCategory || '',
          accountId,
          description: detail.description || '',
        };
      }) || [],
      incomeDetails: data.incomeDetails?.map((detail: any) => {
        // Determine account ID based on which field is populated
        const accountId = detail.bankAccountId || detail.cashAccountId || '';

        return {
          incomeDate: new Date(detail.incomeDate),
          amount: detail.amount || 0,
          incomeCategory: detail.incomeCategory || '',
          accountId,
          description: detail.description || '',
        };
      }) || [],
    };
  };
  const defaultValues = initialData ? transformInitialData(initialData) : {
    purchaseDetails: [{ supplierId: '', purchaseDate: new Date(), price: 0, description: '' }],
    saleDetails: [{ customerId: '', saleDate: new Date(), salePrice: 0, description: '' }],
    paymentDetails: [{
      paymentDate: new Date(),
      amount: 0,
      accountId: '',
      transactionId: '',
      note: '',
      supplierId: ''
    }],
    receiptDetails: [{
      customerId: '',
      receiptDate: new Date(),
      amount: 0,
      accountId: '',
      note: ''
    }],
    expenseDetails: [{
      expenseDate: new Date(),
      amount: 0,
      expenseCategory: '',
      accountId: '',
      description: ''
    }],
    incomeDetails: [{
      incomeDate: new Date(),
      amount: 0,
      incomeCategory: '',
      accountId: '',
      description: ''
    }],
  };

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
    // Validate form data before submission
    const errors: string[] = [];

    // Validate purchase details
    data.purchaseDetails.forEach((item, index) => {
      if (!item.supplierId) errors.push(`Supplier is required in purchase detail #${index + 1}`);
      if (item.price <= 0) errors.push(`Price must be greater than 0 in purchase detail #${index + 1}`);
    });

    // Validate sale details
    data.saleDetails.forEach((item, index) => {
      if (!item.customerId) errors.push(`Customer is required in sale detail #${index + 1}`);
      if (item.salePrice <= 0) errors.push(`Sale price must be greater than 0 in sale detail #${index + 1}`);
    });

    // Validate payment details
    data.paymentDetails.forEach((item, index) => {
      if (!item.accountId) {
        errors.push(`Account is required in payment detail #${index + 1}`);
      }
      if (item.amount <= 0) errors.push(`Amount must be greater than 0 in payment detail #${index + 1}`);
    });

    // Validate receipt details
    data.receiptDetails.forEach((item, index) => {
      if (!item.accountId) {
        errors.push(`Account is required in receipt detail #${index + 1}`);
      }
      if (item.amount <= 0) errors.push(`Amount must be greater than 0 in receipt detail #${index + 1}`);
    });

    // Validate expense details
    data.expenseDetails.forEach((item, index) => {
      if (!item.accountId) {
        errors.push(`Account is required in expense detail #${index + 1}`);
      }
      if (item.amount <= 0) errors.push(`Amount must be greater than 0 in expense detail #${index + 1}`);
    });

    // Validate income details
    data.incomeDetails.forEach((item, index) => {
      if (!item.accountId) {
        errors.push(`Account is required in income detail #${index + 1}`);
      }
      if (!item.incomeCategory) {
        errors.push(`Category is required in income detail #${index + 1}`);
      }
      if (item.amount <= 0) errors.push(`Amount must be greater than 0 in income detail #${index + 1}`);
    });

    // If there are validation errors, show them in the dialog
    if (errors.length > 0) {
      setFormErrors(errors);
      setShowErrorDialog(true);
      return;
    }

    // Prepare the data for backend submission
    const processedData = {
      ...data,
      // Add metadata about account types for backend processing
      paymentDetails: data.paymentDetails.map(detail => {
        const account = allAccounts.find(acc => acc.id === detail.accountId);
        return {
          ...detail,
          accountType: account?.type || 'unknown'
        };
      }),
      receiptDetails: data.receiptDetails.map(detail => {
        const account = allAccounts.find(acc => acc.id === detail.accountId);
        return {
          ...detail,
          accountType: account?.type || 'unknown'
        };
      }),
      expenseDetails: data.expenseDetails.map(detail => {
        const account = allAccounts.find(acc => acc.id === detail.accountId);
        return {
          ...detail,
          accountType: account?.type || 'unknown'
        };
      }),
      incomeDetails: data.incomeDetails.map(detail => {
        const account = allAccounts.find(acc => acc.id === detail.accountId);
        return {
          ...detail,
          accountType: account?.type || 'unknown'
        };
      }),
    };

    try {
      setLoading(true);
      if (initialData) {
        await axios.patch(`/api/tourPackageQuery/${params.tourPackageQueryId}/accounting`, processedData);
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

            {/* Purchase details tab */}
            <TabsContent value="purchaseDetails">
              {purchaseFields.map((field, index) => (
                <div key={field.id} className="space-y-2 border p-2 mb-2 rounded">
                  {/* Supplier selection */}
                  <FormField
                    control={form.control}
                    name={`purchaseDetails.${index}.supplierId`}
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Supplier</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  "w-full justify-between",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value
                                  ? suppliers.find((supplier) => supplier.id === field.value)?.name
                                  : "Select supplier..."}
                                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0">
                            <Command>
                              <CommandInput placeholder="Search supplier..." />
                              <CommandEmpty>No supplier found.</CommandEmpty>
                              <CommandGroup>
                                {suppliers.map((supplier) => (
                                  <CommandItem
                                    key={supplier.id}
                                    value={supplier.name}
                                    onSelect={() => {
                                      form.setValue(`purchaseDetails.${index}.supplierId`, supplier.id);
                                    }}
                                  >
                                    <CheckIcon
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        supplier.id === field.value ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {supplier.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Purchase date */}
                  <FormField
                    control={form.control}
                    name={`purchaseDetails.${index}.purchaseDate`}
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date of Purchase</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-[240px] pl-3 text-left font-normal",
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

                  {/* Price */}
                  <FormField
                    control={form.control}
                    name={`purchaseDetails.${index}.price`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Price"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            value={field.value}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Description */}
                  <FormField
                    control={form.control}
                    name={`purchaseDetails.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input placeholder="Description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="button" variant="destructive" onClick={() => removePurchase(index)}>
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                onClick={() => appendPurchase({ supplierId: '', purchaseDate: new Date(), price: 0, description: '' })}>
                Add Purchase Detail
              </Button>
            </TabsContent>

            {/* Sale details tab */}
            <TabsContent value="saleDetails">
              {saleFields.map((field, index) => (
                <div key={field.id} className="space-y-2 border p-2 mb-2 rounded">
                  {/* Customer selection */}
                  <FormField
                    control={form.control}
                    name={`saleDetails.${index}.customerId`}
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Customer</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  "w-full justify-between",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value
                                  ? customers.find((customer) => customer.id === field.value)?.name
                                  : "Select customer..."}
                                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0">
                            <Command>
                              <CommandInput placeholder="Search customer..." />
                              <CommandEmpty>No customer found.</CommandEmpty>
                              <CommandGroup>
                                {customers.map((customer) => (
                                  <CommandItem
                                    key={customer.id}
                                    value={customer.name}
                                    onSelect={() => {
                                      form.setValue(`saleDetails.${index}.customerId`, customer.id);
                                    }}
                                  >
                                    <CheckIcon
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        customer.id === field.value ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {customer.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Sale date */}
                  <FormField
                    control={form.control}
                    name={`saleDetails.${index}.saleDate`}
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date of Sale</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-[240px] pl-3 text-left font-normal",
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

                  {/* Price */}
                  <FormField
                    control={form.control}
                    name={`saleDetails.${index}.salePrice`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sale Price</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Price"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            value={field.value}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Description */}
                  <FormField
                    control={form.control}
                    name={`saleDetails.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input placeholder="Description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="button" variant="destructive" onClick={() => removeSale(index)}>
                    Remove
                  </Button>
                </div>
              ))}
              <Button type="button" onClick={() => appendSale({ customerId: '', saleDate: new Date(), salePrice: 0, description: '' })}>
                Add Sale Detail
              </Button>
            </TabsContent>

            {/* Payment details tab */}
            <TabsContent value="paymentDetails">
              {paymentFields.map((field, index) => (
                <div key={field.id} className="space-y-2 border p-2 mb-2 rounded">
                  {/* Supplier selection */}
                  <FormField
                    control={form.control}
                    name={`paymentDetails.${index}.supplierId`}
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Supplier</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  "w-full justify-between",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value
                                  ? suppliers.find((supplier) => supplier.id === field.value)?.name
                                  : "Select supplier..."}
                                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0">
                            <Command>
                              <CommandInput placeholder="Search supplier..." />
                              <CommandEmpty>No supplier found.</CommandEmpty>
                              <CommandGroup>
                                {suppliers.map((supplier) => (
                                  <CommandItem
                                    key={supplier.id}
                                    value={supplier.name}
                                    onSelect={() => {
                                      form.setValue(`paymentDetails.${index}.supplierId`, supplier.id);
                                    }}
                                  >
                                    <CheckIcon
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        supplier.id === field.value ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {supplier.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Payment date */}
                  <FormField
                    control={form.control}
                    name={`paymentDetails.${index}.paymentDate`}
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date of Payment</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-[240px] pl-3 text-left font-normal",
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
                    name={`paymentDetails.${index}.amount`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Amount"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            value={field.value}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Single combined account selection */}
                  <FormField
                    control={form.control}
                    name={`paymentDetails.${index}.accountId`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={allAccounts.length === 0}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={
                                allAccounts.length === 0
                                  ? "No accounts available"
                                  : "Select an account"
                              } />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">Select an account</SelectItem>
                            {allAccounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.displayName}
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
                    name={`paymentDetails.${index}.transactionId`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transaction ID</FormLabel>
                        <FormControl>
                          <Input placeholder="Transaction ID" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`paymentDetails.${index}.note`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Note</FormLabel>
                        <FormControl>
                          <Input placeholder="Note" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="button" variant="destructive" onClick={() => removePayment(index)}>
                    Remove
                  </Button>
                </div>
              ))}
              <Button type="button" onClick={() => appendPayment({
                paymentDate: new Date(),
                amount: 0,
                accountId: '',
                transactionId: '',
                note: '',
                supplierId: ''
              })}>
                Add Payment Detail
              </Button>
            </TabsContent>

            {/* Receipt details tab */}
            <TabsContent value="receiptDetails">
              {receiptFields.map((field, index) => (
                <div key={field.id} className="space-y-2 border p-2 mb-2 rounded">
                  {/* Customer selection */}
                  <FormField
                    control={form.control}
                    name={`receiptDetails.${index}.customerId`}
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Customer</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  "w-full justify-between",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value
                                  ? customers.find((customer) => customer.id === field.value)?.name
                                  : "Select customer..."}
                                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0">
                            <Command>
                              <CommandInput placeholder="Search customer..." />
                              <CommandEmpty>No customer found.</CommandEmpty>
                              <CommandGroup>
                                {customers.map((customer) => (
                                  <CommandItem
                                    key={customer.id}
                                    value={customer.name}
                                    onSelect={() => {
                                      form.setValue(`receiptDetails.${index}.customerId`, customer.id);
                                    }}
                                  >
                                    <CheckIcon
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        customer.id === field.value ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {customer.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Receipt date */}
                  <FormField
                    control={form.control}
                    name={`receiptDetails.${index}.receiptDate`}
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date of Receipt</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-[240px] pl-3 text-left font-normal",
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
                    name={`receiptDetails.${index}.amount`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Amount"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            value={field.value}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Single combined account selection */}
                  <FormField
                    control={form.control}
                    name={`receiptDetails.${index}.accountId`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={allAccounts.length === 0}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={
                                allAccounts.length === 0
                                  ? "No accounts available"
                                  : "Select an account"
                              } />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">Select an account</SelectItem>
                            {allAccounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.displayName}
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
                    name={`receiptDetails.${index}.note`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Note</FormLabel>
                        <FormControl>
                          <Input placeholder="Note" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="button" variant="destructive" onClick={() => removeReceipt(index)}>
                    Remove
                  </Button>
                </div>
              ))}
              <Button type="button" onClick={() => appendReceipt({
                receiptDate: new Date(),
                amount: 0,
                accountId: '',
                note: '',
                customerId: ''
              })}>
                Add Receipt Detail
              </Button>
            </TabsContent>

            {/* Expense details tab */}
            <TabsContent value="expenseDetails">
              {expenseFields.map((field, index) => (
                <div key={field.id} className="space-y-2 border p-2 mb-2 rounded">
                  {/* Expense date */}
                  <FormField
                    control={form.control}
                    name={`expenseDetails.${index}.expenseDate`}
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date of Expense</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-[240px] pl-3 text-left font-normal",
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
                    name={`expenseDetails.${index}.amount`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Amount"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            value={field.value}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Expense category */}
                  <FormField
                    control={form.control}
                    name={`expenseDetails.${index}.expenseCategory`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expense Category</FormLabel>
                        <FormControl>
                          <Input placeholder="Expense Category" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Single combined account selection */}
                  <FormField
                    control={form.control}
                    name={`expenseDetails.${index}.accountId`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={allAccounts.length === 0}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={
                                allAccounts.length === 0
                                  ? "No accounts available"
                                  : "Select an account"
                              } />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">Select an account</SelectItem>
                            {allAccounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.displayName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Description */}
                  <FormField
                    control={form.control}
                    name={`expenseDetails.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input placeholder="Description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="button" variant="destructive" onClick={() => removeExpense(index)}>
                    Remove
                  </Button>
                </div>
              ))}
              <Button type="button" onClick={() => appendExpense({
                expenseDate: new Date(),
                amount: 0,
                expenseCategory: '',
                accountId: '',
                description: ''
              })}>
                Add Expense Detail
              </Button>
            </TabsContent>

            {/* Income details tab */}
            <TabsContent value="incomeDetails">
              {incomeFields.map((field, index) => (
                <div key={field.id} className="space-y-2 border p-2 mb-2 rounded">
                  {/* Income date */}
                  <FormField
                    control={form.control}
                    name={`incomeDetails.${index}.incomeDate`}
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date of Income</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-[240px] pl-3 text-left font-normal",
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
                    name={`incomeDetails.${index}.amount`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Amount"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            value={field.value}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Income category */}
                  <FormField
                    control={form.control}
                    name={`incomeDetails.${index}.incomeCategory`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Income Category</FormLabel>
                        <FormControl>
                          <Input placeholder="Income Category" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Single combined account selection */}
                  <FormField
                    control={form.control}
                    name={`incomeDetails.${index}.accountId`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={allAccounts.length === 0}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={
                                allAccounts.length === 0
                                  ? "No accounts available"
                                  : "Select an account"
                              } />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">Select an account</SelectItem>
                            {allAccounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.displayName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Description */}
                  <FormField
                    control={form.control}
                    name={`incomeDetails.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input placeholder="Description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="button" variant="destructive" onClick={() => removeIncome(index)}>
                    Remove
                  </Button>
                </div>
              ))}
              <Button type="button" onClick={() => appendIncome({
                incomeDate: new Date(),
                amount: 0,
                incomeCategory: '',
                accountId: '',
                description: ''
              })}>
                Add Income Detail
              </Button>
            </TabsContent>
          </Tabs>

          <Button disabled={loading} className="ml-auto" type="submit">
            {action}
          </Button>

        </form>
      </Form >
    </>
  );
}