"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CalendarIcon, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
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
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Separator } from "../ui/separator";

// Helper to parse a date string (YYYY-MM-DD or ISO) into a local-only Date (midnight local)
const parseLocalDate = (dateString: string | Date | null | undefined) => {
  // If it's already a Date object, return it
  if (dateString instanceof Date) return dateString;
  
  // If it's null/undefined, return current date
  if (!dateString) return new Date();
  
  try {
    // If it's a string, parse it
    const [datePart] = dateString.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    return new Date(year, month - 1, day);
  } catch (error) {
    console.error("Error parsing date:", error);
    // Return current date as fallback
    return new Date();
  }
};

// Form schema
const formSchema = z.object({
  saleDetailId: z.string({
    required_error: "Sale is required",
  }),
  returnDate: z.date({
    required_error: "Return date is required",
  }),
  returnReason: z.string().optional(),
  amount: z.coerce.number().min(0, "Amount must be zero or positive"),
  gstAmount: z.coerce.number().min(0, "GST amount must be zero or positive").optional(),
  reference: z.string().optional(),
  status: z.string().default("pending"),
  items: z.array(
    z.object({
      saleItemId: z.string().optional(),
      productName: z.string().min(1, "Product name is required"),
      description: z.string().optional(),
      quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
      unitOfMeasureId: z.string().optional(),
      pricePerUnit: z.coerce.number().min(0, "Price must be zero or positive"),
      taxSlabId: z.string().optional(),
      taxAmount: z.coerce.number().min(0, "Tax amount must be zero or positive").optional(),
      totalAmount: z.coerce.number().min(0, "Total amount must be zero or positive"),
    })
  ).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface SaleReturnFormProps {
  initialData?: any;
  taxSlabs?: any[];
  units?: any[];
  customers?: any[];
  sales?: any[];
  selectedSaleId?: string;
  onClose?: () => void;
}

export const SaleReturnForm: React.FC<SaleReturnFormProps> = ({
  initialData,
  taxSlabs = [],
  units = [],
  customers = [],
  sales = [],
  selectedSaleId,
  onClose
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedSaleItems, setSelectedSaleItems] = useState<any[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  const title = initialData ? "Edit Sale Return" : "Create Sale Return";
  const description = initialData ? "Edit sale return details" : "Create a new sale return";
  const toastMessage = initialData ? "Sale return updated." : "Sale return created.";
  const action = initialData ? "Save changes" : "Create";

  // Initialize form with default values or existing data
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      saleDetailId: initialData.saleDetailId,
      returnDate: initialData.returnDate ? parseLocalDate(initialData.returnDate) : new Date(),
      returnReason: initialData.returnReason || "",
      amount: initialData.amount,
      gstAmount: initialData.gstAmount || 0,
      reference: initialData.reference || "",
      status: initialData.status || "pending",
      items: initialData.items?.map((item: any) => ({
        saleItemId: item.saleItemId || undefined,
        productName: item.productName,
        description: item.description || "",
        quantity: item.quantity,
        unitOfMeasureId: item.unitOfMeasureId || undefined,
        pricePerUnit: item.pricePerUnit,
        taxSlabId: item.taxSlabId || undefined,
        taxAmount: item.taxAmount || 0,
        totalAmount: item.totalAmount,
      })) || []
    } : {
      returnDate: new Date(),
      saleDetailId: selectedSaleId || "",
      returnReason: "",
      amount: 0,
      gstAmount: 0,
      reference: "",
      status: "pending",
      items: []
    }  });

  // Setup field array for items
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  // Fetch sale items when sale is selected
  const handleSaleChange = useCallback(async (saleId: string) => {
    try {
      const response = await axios.get(`/api/sales/${saleId}`);
      const saleData = response.data;
      
      if (saleData.items && saleData.items.length > 0) {
        setSelectedSaleItems(saleData.items);
        
        // Clear existing items if it's not an editing scenario
        if (!initialData) {
          while (fields.length) {
            remove(0);
          }
          
          // Add sale items as options to return
          saleData.items.forEach((item: any) => {
            append({
              saleItemId: item.id,
              productName: item.productName,
              description: item.description || "",
              // Default to full sold quantity for returns
              quantity: item.quantity,
               unitOfMeasureId: item.unitOfMeasureId || undefined,
               pricePerUnit: item.pricePerUnit,
               taxSlabId: item.taxSlabId || undefined,
               taxAmount: 0,
               totalAmount: 0,
             });
           });
          
          // Update form with sale details
          form.setValue("amount", 0);
          form.setValue("gstAmount", 0);
        }
      }
    } catch (error) {
      console.error("Error fetching sale items", error);
      toast.error("Failed to fetch sale details");
    }
  }, [fields.length, remove, append, form, initialData]);

  // Load sale details if selectedSaleId is set
  useEffect(() => {
    if (selectedSaleId && !initialData) {
      handleSaleChange(selectedSaleId);
    }
  }, [selectedSaleId, handleSaleChange, initialData]);
  // Handle amount change
  const handleAmountChange = (newAmount: number) => {
    // Update the amount field
    form.setValue("amount", newAmount);
    
    // Optionally trigger recalculation if needed
    setTimeout(() => recalculateTotals(), 10);
  };
  // Recalculate totals when items change
  const recalculateTotals = useCallback((changedFieldName?: string) => {
    if (isCalculating) return;
    setIsCalculating(true);
    
    try {
      // Update line item totals
      const items = form.getValues("items") || [];
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Skip if this wasn't the changed field
        if (changedFieldName && !changedFieldName.includes(`items.${i}.`)) {
          continue;
        }
        
        const quantity = parseFloat(String(item.quantity)) || 0;
        const pricePerUnit = parseFloat(String(item.pricePerUnit)) || 0;
        const taxSlab = taxSlabs?.find(t => t.id === item.taxSlabId);
        const taxRate = taxSlab ? taxSlab.percentage : 0;
        
        // Calculate base amount
        let baseAmount = quantity * pricePerUnit;
        
        // Calculate tax amount
        let taxAmount = 0;
        if (taxRate > 0) {
          taxAmount = baseAmount * (taxRate / 100);
        }
        
        // Calculate total amount
        const totalAmount = baseAmount + taxAmount;
        
        // Update the form values
        form.setValue(`items.${i}.taxAmount`, parseFloat(taxAmount.toFixed(2)));
        form.setValue(`items.${i}.totalAmount`, parseFloat(totalAmount.toFixed(2)));
      }
      
      // Calculate grand totals
      const grandTotal = items.reduce((sum, item) => sum + (parseFloat(String(item.totalAmount)) || 0), 0);
      const totalTax = items.reduce((sum, item) => sum + (parseFloat(String(item.taxAmount)) || 0), 0);
      
      // Update form values for totals
      form.setValue("amount", parseFloat((grandTotal - totalTax).toFixed(2)));
      form.setValue("gstAmount", parseFloat(totalTax.toFixed(2)));
      
    } finally {
      setIsCalculating(false);
    }
  }, [isCalculating, form, taxSlabs]);

  // Watch for changes to fields that affect calculations
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name && (name.includes('quantity') || name.includes('pricePerUnit') || name.includes('taxSlabId'))) {
        setTimeout(() => recalculateTotals(name), 10);
      }
    });
      return () => subscription.unsubscribe();
  }, [form, isCalculating, fields.length, recalculateTotals]);
  // For item length changes
  useEffect(() => {
    if (fields.length > 0) {
      recalculateTotals();
    }
  }, [fields.length, recalculateTotals]);
  // Form submission handler
  const onSubmit = async (data: FormValues) => {
    try {
      setLoading(true);

      // API data formatting
      const apiData = {
        ...data,
        // send only date portion (YYYY-MM-DD) to treat as plain date
        returnDate: format(data.returnDate, 'yyyy-MM-dd'),
        items: data.items?.map(item => ({
          ...item,
          description: item.description || null,
          unitOfMeasureId: item.unitOfMeasureId || null,
          taxSlabId: item.taxSlabId || null,
          quantity: parseFloat(String(item.quantity)),
          pricePerUnit: parseFloat(String(item.pricePerUnit)),
          taxAmount: item.taxAmount ? parseFloat(String(item.taxAmount)) : null,
          totalAmount: parseFloat(String(item.totalAmount))
        }))
      };

      if (initialData) {
        // Update existing sale return
        await axios.patch(`/api/sale-returns/${initialData.id}`, apiData);
      } else {
        // Create new sale return
        await axios.post('/api/sale-returns', apiData);
      }
      
      toast.success(toastMessage);
      
      // If onClose is provided (in dialog mode), call it, otherwise navigate
      if (onClose) {
        onClose();
      } else {
        router.push("/sale-returns");
        router.refresh();
      }
      
    } catch (error: any) {
      toast.error("Something went wrong.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Add a new empty item
  const addItem = () => {
    append({
      saleItemId: "",
      productName: "",
      description: "",
      quantity: 1,
      unitOfMeasureId: "",
      pricePerUnit: 0,
      taxSlabId: "",
      taxAmount: 0,
      totalAmount: 0,
    });
  };

  // Helper to find unit abbreviation
  const getUnitAbbreviation = (unitId?: string) => {
    if (!unitId) return "";
    const unit = units?.find(u => u.id === unitId);
    return unit ? unit.abbreviation : "";
  };

  // Helper to find sale name
  const getSaleName = (saleId: string) => {
    const sale = sales.find(s => s.id === saleId);
    if (sale) {
      const customer = sale.customer?.name || "Unknown Customer";
      const date = format(new Date(sale.saleDate), "dd MMM yyyy");
      return `${customer} - ${sale.description || sale.id.substring(0, 8)} (${date})`;
    }
    return saleId;
  };  return (
    <>
      {/* Modern Gradient Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-6 rounded-t-lg shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-lg">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m5 14l3-3m-3 3l3-3" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold">{title}</h1>
              <p className="text-orange-100">{description}</p>
            </div>
          </div>
        </div>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-4xl mx-auto space-y-8 p-6">
          <Card className="shadow-md border-0 bg-white">
            <CardHeader className="bg-gradient-to-r from-orange-100 to-amber-100 border-b border-orange-200 p-6">
              <CardTitle className="text-lg font-semibold text-orange-800 flex items-center gap-2">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m5 14l3-3m-3 3l3-3" />
                </svg>
                Sale Return Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Sale Selection */}
                <FormField
                  control={form.control}
                  name="saleDetailId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Sale</FormLabel>
                      <FormControl>
                        <Select 
                          disabled={loading || !!initialData} 
                          value={field.value} 
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleSaleChange(value);
                          }}
                        >
                          <SelectTrigger className="h-11 border-gray-300 hover:border-orange-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200">
                            <SelectValue placeholder="Select a sale" />
                          </SelectTrigger>
                          <SelectContent>
                            {sales.map((sale) => (
                              <SelectItem key={sale.id} value={sale.id}>
                                {getSaleName(sale.id)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Return Date */}
                <FormField
                  control={form.control}
                  name="returnDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-sm font-medium text-gray-700">Return Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "h-11 border-gray-300 hover:border-orange-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 pl-3 text-left font-normal",
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

                {/* Return Reason */}
                <FormField
                  control={form.control}
                  name="returnReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Return Reason</FormLabel>
                      <FormControl>
                        <Textarea
                          disabled={loading}
                          placeholder="Enter reason for return"
                          className="h-11 border-gray-300 hover:border-orange-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Reference */}
                <FormField
                  control={form.control}
                  name="reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Reference Number</FormLabel>
                      <FormControl>
                        <Input
                          disabled={loading}
                          placeholder="Enter reference number"
                          className="h-11 border-gray-300 hover:border-orange-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                          {...field}
                        />
                      </FormControl>
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
                      <FormLabel className="text-sm font-medium text-gray-700">Return Amount</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">₹</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            disabled={loading}
                            placeholder="0.00"
                            className="h-11 pl-8 border-gray-300 hover:border-orange-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                            {...field}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 0;
                              field.onChange(value);
                              handleAmountChange(value);
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* GST Amount */}
                <FormField
                  control={form.control}
                  name="gstAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">GST Amount</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">₹</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            disabled={loading}
                            placeholder="0.00"
                            className="h-11 pl-8 border-gray-300 hover:border-orange-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Status */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Status</FormLabel>
                      <FormControl>
                        <Select disabled={loading} value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="h-11 border-gray-300 hover:border-orange-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>          {/* Items Section */}
          <Card className="shadow-md border-0 bg-white">
            <CardHeader className="bg-gradient-to-r from-orange-100 to-amber-100 border-b border-orange-200 p-6">
              <CardTitle className="text-lg font-semibold text-orange-800 flex items-center gap-2">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Return Items
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="space-y-6">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex flex-col gap-4 p-6 border rounded-lg relative bg-gray-50">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2 text-red-500 hover:text-red-700"
                      onClick={() => remove(index)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Product Name */}
                      <FormField
                        control={form.control}
                        name={`items.${index}.productName`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Product/Service</FormLabel>
                            <FormControl>
                              <Input {...field} disabled={loading} placeholder="Product name" 
                                className="h-11 border-gray-300 hover:border-orange-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Description */}
                      <FormField
                        control={form.control}
                        name={`items.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Description</FormLabel>
                            <FormControl>
                              <Input {...field} disabled={loading} placeholder="Description" 
                                className="h-11 border-gray-300 hover:border-orange-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {/* Quantity */}
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Quantity</FormLabel>
                            <FormControl>
                              <div className="flex items-center">
                                <Input
                                  {...field}
                                  type="number"
                                  step="any"
                                  min="0.01"
                                  disabled={loading}
                                  className="h-11 border-gray-300 hover:border-orange-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                                  onChange={(e) => {
                                    field.onChange(parseFloat(e.target.value) || 0);
                                  }}
                                />
                                <span className="ml-2 text-sm text-gray-500 w-10">
                                  {getUnitAbbreviation(form.getValues(`items.${index}.unitOfMeasureId`))}
                                </span>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Unit of Measure */}
                      <FormField
                        control={form.control}
                        name={`items.${index}.unitOfMeasureId`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Unit</FormLabel>
                            <FormControl>
                              <Select
                                disabled={loading}
                                value={field.value || ""}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger className="h-11 border-gray-300 hover:border-orange-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200">
                                  <SelectValue placeholder="Select unit" />
                                </SelectTrigger>
                                <SelectContent>
                                  {units.map((unit) => (
                                    <SelectItem key={unit.id} value={unit.id}>
                                      {unit.name} ({unit.abbreviation})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Price Per Unit */}
                      <FormField
                        control={form.control}
                        name={`items.${index}.pricePerUnit`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Price Per Unit</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">₹</span>
                                <Input
                                  {...field}
                                  type="number"
                                  step="any"
                                  min="0"
                                  disabled={loading}
                                  className="h-11 pl-8 border-gray-300 hover:border-orange-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                                  onChange={(e) => {
                                    field.onChange(parseFloat(e.target.value) || 0);
                                  }}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {/* Tax Slab */}
                      <FormField
                        control={form.control}
                        name={`items.${index}.taxSlabId`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Tax Rate</FormLabel>
                            <FormControl>
                              <Select
                                disabled={loading}
                                value={field.value || ""}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger className="h-11 border-gray-300 hover:border-orange-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200">
                                  <SelectValue placeholder="Select tax rate" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">No Tax</SelectItem>
                                  {taxSlabs.map((tax) => (
                                    <SelectItem key={tax.id} value={tax.id}>
                                      {tax.name} ({tax.percentage}%)
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Tax Amount */}
                      <FormField
                        control={form.control}
                        name={`items.${index}.taxAmount`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Tax Amount</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">₹</span>
                                <Input
                                  {...field}
                                  type="number"
                                  step="any"
                                  min="0"
                                  disabled={true} // Auto-calculated
                                  className="h-11 pl-8 border-gray-300 bg-gray-100"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Total Amount */}
                      <FormField
                        control={form.control}
                        name={`items.${index}.totalAmount`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-gray-700">Total Amount</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">₹</span>
                                <Input
                                  {...field}
                                  type="number"
                                  step="any"
                                  min="0"
                                  disabled={true} // Auto-calculated
                                  className="h-11 pl-8 border-gray-300 bg-gray-100"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addItem}
                  className="w-full mt-4 h-12 border-2 border-dashed border-orange-300 text-orange-600 hover:border-orange-400 hover:bg-orange-50"
                >
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Item
                </Button>
              </div>

              {/* Totals Display */}
              <div className="mt-8 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="space-y-2 text-right">
                  <div className="flex justify-end items-center">
                    <span className="font-medium text-gray-600 mr-4">Subtotal:</span>
                    <span className="text-lg">₹{(form.getValues("amount") || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-end items-center">
                    <span className="font-medium text-gray-600 mr-4">GST:</span>
                    <span className="text-lg">₹{(form.getValues("gstAmount") || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-end items-center font-bold text-xl text-orange-600 border-t pt-2">
                    <span className="mr-4">Total:</span>
                    <span>₹{((form.getValues("amount") || 0) + (form.getValues("gstAmount") || 0)).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between bg-gray-50 rounded-b-lg">
              <Button
                type="button"
                variant="outline"
                onClick={() => onClose ? onClose() : router.push("/sale-returns")}
                disabled={loading}
                className="h-11 px-8"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="h-11 px-8 bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600"
              >
                {loading && (
                  <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {action}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </>
  );
};
