"use client"

import * as z from "zod"
import axios from "axios"
import { JSXElementConstructor, Key, PromiseLikeOfReactNode, ReactElement, ReactNode, ReactPortal, useEffect, useRef, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "react-hot-toast"
import { CheckIcon, ChevronDown, ChevronUp, Trash } from "lucide-react"
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
  CommandList,
  CommandSeparator,
  CommandShortcut,
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { Heading } from "@/components/ui/heading"
import { AlertModal } from "@/components/modals/alert-modal"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import ImageUpload from "@/components/ui/image-upload"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { ARILINE_CANCELLATION_POLICY_DEFAULT, CANCELLATION_POLICY_DEFAULT, EXCLUSIONS_DEFAULT, IMPORTANT_NOTES_DEFAULT, TERMS_AND_CONDITIONS_DEFAULT, DISCLAIMER_DEFAULT, INCLUSIONS_DEFAULT, PAYMENT_TERMS_DEFAULT, PRICE_DEFAULT, TOTAL_PRICE_DEFAULT, TOUR_HIGHLIGHTS_DEFAULT, TOUR_PACKAGE_QUERY_TYPE_DEFAULT, USEFUL_TIPS_DEFAULT } from "./defaultValues"
import { cn } from "@/lib/utils"
import { DatePickerWithRange } from "@/components/DatePickerWithRange"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "@radix-ui/react-icons"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { format } from "date-fns"
import JoditEditor from "jodit-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { useFieldArray } from "react-hook-form" // (optional, if you want to simplify dynamic fields)

const paymentMethodOptions = ["Credit Card", "Debit Card", "Net Banking", "Cash", "UPI"];
const receiptReferenceOptions = ["Invoice", "Online Payment", "Cash", "Cheque"];

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
    method: z.string().optional(),
    transactionId: z.string().optional(),
    note: z.string().optional(),
    supplierId: z.string().optional(), // Add supplierId to paymentDetails schema
  })).default([]),
  receiptDetails: z.array(z.object({
    receiptDate: z.date(),
    amount: z.number(),
    reference: z.string().optional(),
    note: z.string().optional(),
    customerId: z.string().optional(), // Add customerId to receiptDetails schema
  })).default([]),
  expenseDetails: z.array(z.object({
    expenseDate: z.date(),
    amount: z.number(),
    expenseCategory: z.string(),
    description: z.string().optional(),
  })).default([]),
});

type TourPackageQueryAccountingFormValues = z.infer<typeof formSchema>

interface TourPackageQueryAccountingFormProps {
  initialData: TourPackageQuery & {
    purchaseDetails: Array<PurchaseDetail & {
      supplier: Supplier | null;  // Make supplier nullable
    }> | null;
    saleDetails: Array<SaleDetail & {
      customer: Customer | null;  // Make customer nullable
    }> | null;
    paymentDetails: Array<PaymentDetail & {
      supplier: Supplier | null;  // Make supplier nullable
    }> | null;
    receiptDetails: Array<ReceiptDetail & {
      customer: Customer | null;  // Make customer nullable
    }> | null;
    expenseDetails: ExpenseDetail[] | null;  // Make array nullable
  } | null;
}

export const TourPackageQueryAccountingForm: React.FC<TourPackageQueryAccountingFormProps> = ({
  initialData,
}) => {
  const params = useParams();
  const router = useRouter();

  //const defaultItinerary = { days: '1', activities: '', places: '', mealsIncluded: false };

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [flightDetails, setFlightDetails] = useState([]);
  const editor = useRef(null)

  //console.log(initialData);
  const title = initialData ? 'Edit Tour  Query' : 'Create Tour Package Query';
  const description = initialData ? 'Edit a Tour Package Query.' : 'Add a new Tour Package Query';

  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);

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

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await axios.get("/api/customers");
        setCustomers(res.data);
      } catch (error) {
        console.error("Error fetching customers", error);
      }
    };
    fetchCustomers();
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
      paymentDetails: data.paymentDetails?.map((paymentDetail: any) => ({
        paymentDate: new Date(paymentDetail.paymentDate),
        amount: paymentDetail.amount || 0,
        method: paymentDetail.method || '',
        transactionId: paymentDetail.transactionId || '',
        note: paymentDetail.note || '',
        supplierId: paymentDetail.supplierId || '',
      })) || [],
      receiptDetails: data.receiptDetails?.map((receiptDetail: any) => ({
        customerId: receiptDetail.customerId || '',
        receiptDate: new Date(receiptDetail.receiptDate),
        amount: receiptDetail.amount || 0,
        reference: receiptDetail.reference || '',
        note: receiptDetail.note || '',
      })) || [],
      expenseDetails: data.expenseDetails?.map((expenseDetail: any) => ({
        expenseDate: new Date(expenseDetail.expenseDate),
        amount: expenseDetail.amount || 0,
        expenseCategory: expenseDetail.expenseCategory || '',
        description: expenseDetail.description || '',
      })) || [],
    };
  };
  const defaultValues = initialData ? transformInitialData(initialData) : {
    purchaseDetails: [{ supplierId: '', purchaseDate: new Date(), price: 0, description: '' }],
    saleDetails: [{ customerId: '', saleDate: new Date(), salePrice: 0, description: '' }],
    paymentDetails: [{ paymentDate: new Date(), amount: 0, method: '', transactionId: '', note: '', supplierId: '' }],
    receiptDetails: [{ customerId: '', receiptDate: new Date(), amount: 0, reference: '', note: '' }],
    expenseDetails: [{ expenseDate: new Date(), amount: 0, expenseCategory: '', description: '' }],
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

  const onSubmit = async (data: TourPackageQueryAccountingFormValues) => {
    try {
      setLoading(true);
      if (initialData) {
        await axios.patch(`/api/tourPackageQuery/${params.tourPackageQueryId}/accounting`, data);
      } else {
        await axios.post(`/api/tourPackageQuery`, data);
      }
      router.refresh();
      router.push(`/tourPackageQuery`);
      toast.success(toastMessage);
    } catch (error: any) {
      console.error('Error:', error.response ? error.response.data : error.message);  // Updated line
      toast.error('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/tourPackageQuery/${params.tourPackageQueryId}`);
      router.refresh();
      router.push(`/tourPackageQuery`);
      toast.success('Tour Package Query deleted.');
    } catch (error: any) {
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

          <Tabs defaultValue="purchaseDetails">
            <TabsList>
              <TabsTrigger value="purchaseDetails">Purchase</TabsTrigger>
              <TabsTrigger value="saleDetails">Sale</TabsTrigger>
              <TabsTrigger value="paymentDetails">Payment</TabsTrigger>
              <TabsTrigger value="receiptDetails">Receipt</TabsTrigger>
              <TabsTrigger value="expenseDetails">Expense</TabsTrigger>
            </TabsList>
            <TabsContent value="purchaseDetails">
              {/* Replace single textarea with dynamic purchase details */}
              {purchaseFields.map((field, index) => (
                <div key={field.id} className="space-y-2 border p-2 mb-2 rounded">
                  {/* Replace supplierId Input with a dropdown */}
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
                                    value={supplier.name}
                                    key={supplier.id}
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
            <TabsContent value="saleDetails">
              {saleFields.map((field, index) => (
                <div key={field.id} className="space-y-2 border p-2 mb-2 rounded">
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
                                    value={customer.name}
                                    key={customer.id}
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
            <TabsContent value="paymentDetails">
              {paymentFields.map((field, index) => (
                <div key={field.id} className="space-y-2 border p-2 mb-2 rounded">
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
                                    value={supplier.name}
                                    key={supplier.id}
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
                  <FormField
                    control={form.control}
                    name={`paymentDetails.${index}.method`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Method</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Payment Method" />
                            </SelectTrigger>
                            <SelectContent>
                              {paymentMethodOptions.map(option => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
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
              <Button type="button" onClick={() => appendPayment({ paymentDate: new Date(), amount: 0, method: '', transactionId: '', note: '' })}>
                Add Payment Detail
              </Button>
            </TabsContent>
            <TabsContent value="receiptDetails">
              {receiptFields.map((field, index) => (
                <div key={field.id} className="space-y-2 border p-2 mb-2 rounded">
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
                                    value={customer.name}
                                    key={customer.id}
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
                  <FormField
                    control={form.control}
                    name={`receiptDetails.${index}.reference`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reference</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Receipt Reference" />
                            </SelectTrigger>
                            <SelectContent>
                              {receiptReferenceOptions.map(option => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
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
              <Button type="button" onClick={() => appendReceipt({ receiptDate: new Date(), amount: 0, reference: '', note: '' })}>
                Add Receipt Detail
              </Button>
            </TabsContent>
            <TabsContent value="expenseDetails">
              {expenseFields.map((field, index) => (
                <div key={field.id} className="space-y-2 border p-2 mb-2 rounded">


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

                  <FormField
                    control={form.control}
                    name={`expenseDetails.${index}.amount`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            value={field.value}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
              <Button type="button" onClick={() => appendExpense({ expenseDate: new Date(), amount: 0, expenseCategory: '', description: '' })}>
                Add Expense Detail
              </Button>
            </TabsContent>
          </Tabs>

          <Button disabled={loading} className="ml-auto" type="submit">
            {action}
          </Button>

        </form >
      </Form >
    </>
  )
}