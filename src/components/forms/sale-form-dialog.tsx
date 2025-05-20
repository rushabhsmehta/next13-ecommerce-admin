"use client";

import * as z from "zod";
import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { toast } from "react-hot-toast";
import { format } from "date-fns";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CalendarIcon, Plus, Trash } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { SaleFormProps } from "@/types";
import { Check } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FormErrorSummary } from "@/components/ui/form-error-summary";

// Define the item schema with consistent nullable patterns
const saleItemSchema = z.object({
  id: z.string().optional(),
  productName: z.string().min(1, "Product name is required"),
  description: z.string().optional().nullable(),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
  unitOfMeasureId: z.string().optional().nullable(),
  pricePerUnit: z.coerce.number().min(0.01, "Price per unit must be greater than 0"),
  taxSlabId: z.string().optional().nullable(),
  taxAmount: z.coerce.number().min(0).optional().nullable(),
  totalAmount: z.coerce.number().min(0)
});

const formSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  tourPackageQueryId: z.string().optional().nullable(),
  saleDate: z.date(),
  invoiceNumber: z.string().optional().nullable(),
  referenceNumber: z.string().optional().nullable(),
  salePrice: z.coerce.number().min(0),
  gstAmount: z.coerce.number().min(0).optional().nullable(),
  gstPercentage: z.coerce.number().min(0).optional().nullable(),
  description: z.string().optional().nullable(),
  status: z.string().default("completed"),
  totalWithTax: z.coerce.number().min(0).optional().nullable(),
  items: z.array(saleItemSchema)
});

type FormValues = z.infer<typeof formSchema>;

export const SaleFormDialog: React.FC<SaleFormProps> = ({
  initialData,
  taxSlabs,
  units,
  customers,
  onSuccess,
  submitButtonText = "Create"
}) => {
  const [loading, setLoading] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [lastUpdatedField, setLastUpdatedField] = useState<string | null>(null);

  // Add this computed value
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const defaultItems = initialData?.items?.length > 0
    ? initialData.items
    : [{
      // Fix: Add proper property access for tourPackageQuery name
      productName: initialData?.tourPackageQuery?.tourPackageQueryName || "",
      description: "",
      quantity: 1,
      unitOfMeasureId: "",
      pricePerUnit: 0,
      taxSlabId: "",
      taxAmount: 0,
      totalAmount: 0
    }];

  const defaultValues: FormValues = {
    customerId: initialData?.customerId || "",
    tourPackageQueryId: initialData?.tourPackageQueryId || "",
    saleDate: initialData?.saleDate
      ? new Date(initialData.saleDate)
      : new Date(),
    invoiceNumber: initialData?.invoiceNumber || "",
    referenceNumber: initialData?.referenceNumber || "",
    salePrice: initialData?.salePrice || 0,
    gstAmount: initialData?.gstAmount || 0,
    gstPercentage: initialData?.gstPercentage || 0,
    description: initialData?.description || "",
    status: initialData?.status || "completed",
    totalWithTax: initialData?.totalWithTax || 0,
    items: defaultItems
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  // Enhanced recalculate totals function with bidirectional calculation
  const recalculateTotals = (changedField?: string) => {
    if (isCalculating) return;

    setIsCalculating(true);
    try {
      const items = form.getValues("items");
      
      let totalPriceExclTax = 0;
      let totalTax = 0;

      // Prepare batch of updates
      const updates: Record<string, any> = {};

      items.forEach((item, index) => {
        // Check which field was changed to determine calculation direction
        if (changedField?.includes(`items.${index}.totalAmount`)) {
          // Direction: Total → Price per unit
          const totalAmount = Number(parseFloat(item.totalAmount?.toString() || "0").toFixed(2));
          
          // Preserve the exact total amount the user entered
          updates[`items.${index}.totalAmount`] = totalAmount;
          
          const qty = Number(parseFloat(item.quantity?.toString() || "1").toFixed(2));
          const taxSlab = item.taxSlabId ? taxSlabs.find(tax => tax.id === item.taxSlabId) : null;
          const taxRate = taxSlab ? taxSlab.percentage / 100 : 0;
          
          // Calculate price per unit backwards from total with precise rounding
          let pricePerUnit: number;
          let taxAmount: number;
          
          if (taxRate > 0) {
            // Calculate price before tax: price = total / (1 + taxRate)
            const priceBeforeTax = totalAmount / (1 + taxRate);
            pricePerUnit = Number((priceBeforeTax / qty).toFixed(4));
            
            // Calculate subtotal precisely
            const itemSubtotal = Number((pricePerUnit * qty).toFixed(2));
            
            // Calculate tax amount precisely
            taxAmount = Number((totalAmount - itemSubtotal).toFixed(2));
          } else {
            pricePerUnit = Number((totalAmount / qty).toFixed(4));
            taxAmount = 0;
          }
          
          updates[`items.${index}.pricePerUnit`] = pricePerUnit;
          updates[`items.${index}.taxAmount`] = taxAmount;
          
          const itemSubtotal = Number((pricePerUnit * qty).toFixed(2));
          totalPriceExclTax += itemSubtotal;
          totalTax += taxAmount;
        } 
        else {
          // Direction: Price per unit → Total (default calculation)
          const price = Number(parseFloat(item.pricePerUnit?.toString() || "0").toFixed(4));
          const qty = Number(parseFloat(item.quantity?.toString() || "0").toFixed(2));

          // Calculate item subtotal with precise rounding
          const itemSubtotal = Number((price * qty).toFixed(2));
          totalPriceExclTax += itemSubtotal;

          // Update tax amount based on tax slab with precise rounding
          let taxAmount = 0;
          if (item.taxSlabId && price > 0 && qty > 0) {
            const taxSlab = taxSlabs.find(tax => tax.id === item.taxSlabId);
            if (taxSlab) {
              taxAmount = Number(((itemSubtotal * taxSlab.percentage) / 100).toFixed(2));
              updates[`items.${index}.taxAmount`] = taxAmount;
              totalTax += taxAmount;
            }
          } else {
            updates[`items.${index}.taxAmount`] = 0;
          }

          // Calculate total amount for this item with precise rounding
          const total = Number((itemSubtotal + taxAmount).toFixed(2));
          updates[`items.${index}.totalAmount`] = total;
        }
      });

      // Update global totals with precise rounding
      updates["salePrice"] = Number(totalPriceExclTax.toFixed(2));
      updates["gstAmount"] = Number(totalTax.toFixed(2));

      // Calculate grand total with precise rounding
      const grandTotal = Number((totalPriceExclTax + totalTax).toFixed(2));
      form.setValue("totalWithTax", grandTotal, { shouldValidate: false });

      // Apply all updates at once
      Object.entries(updates).forEach(([field, value]) => {
        form.setValue(field as any, value, {
          shouldValidate: false,
          shouldDirty: true,
          shouldTouch: false
        });
      });
    } finally {
      setIsCalculating(false);
    }
  };

  // Delay calculation until field loses focus instead of on every keystroke
  useEffect(() => {
    // This is the key change - we're not using the "watch" method for real-time changes
    // Instead we'll use onBlur events on inputs to trigger calculations
    recalculateTotals();
    
    // Still watch for tax slab and quantity changes which should recalculate immediately
    const subscription = form.watch((value, { name, type }) => {
      if (isCalculating || !name) return;
      
      // Only recalculate immediately for these specific changes
      if (name.includes('taxSlabId') || name.includes('quantity')) {
        setTimeout(() => recalculateTotals(name), 10);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form, isCalculating, fields.length]);

  // For item length changes
  useEffect(() => {
    if (fields.length > 0) {
      recalculateTotals();
    }
  }, [fields.length]);

  const onSubmit = async (data: FormValues) => {
    try {
      setLoading(true);
      setFormErrors([]);
      setDebugInfo(null);

      console.log("Form submission started:", initialData?.id ? "UPDATE" : "CREATE");

      // Convert to proper format for API
      const apiData = {
        ...data,
        // Make sure optional string fields are either strings or null, not undefined
        description: data.description || null,
        referenceNumber: data.referenceNumber || null,
        invoiceNumber: data.invoiceNumber || null,

        // Convert date objects to ISO strings
        saleDate: data.saleDate.toISOString(),

        // Process items to ensure proper format
        items: data.items.map(item => ({
          ...item,
          description: item.description || null,
          unitOfMeasureId: item.unitOfMeasureId || null,
          taxSlabId: item.taxSlabId || null,
          quantity: parseFloat(item.quantity.toString()),
          pricePerUnit: parseFloat(item.pricePerUnit.toString()),
          taxAmount: item.taxAmount ? parseFloat(item.taxAmount.toString()) : null,
          totalAmount: parseFloat(item.totalAmount.toString())
        }))
      };

      if (initialData?.id) {
        console.log(`Updating sale ${initialData.id}`);
        const response = await axios.patch(`/api/sales/${initialData.id}`, apiData);
        console.log("Update response:", response.data);
        toast.success("Sale details updated");
        onSuccess();
      } else {
        console.log("Creating new sale");
        const response = await axios.post('/api/sales', apiData);
        console.log("Create response:", response.data);
        toast.success("Sale created successfully");
        onSuccess();
      }
    } catch (error: any) {
      console.error("Error submitting form:", error);
      const errorMessage = error.response?.data?.message || error.message || "Something went wrong";
      toast.error(errorMessage);
      setFormErrors([errorMessage]);

      // Set detailed debug info
      if (error.response?.data) {
        setDebugInfo(`API Error: ${JSON.stringify(error.response.data, null, 2)}`);
      } else {
        setDebugInfo(`Error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Function to handle form errors
  const onError = (errors: any) => {
    console.error("Form Validation Errors:", errors);

    const errorMessages: string[] = [];
    Object.entries(errors).forEach(([key, value]: [string, any]) => {
      if (key === 'items') {
        value.forEach((itemError: any, index: number) => {
          if (itemError) {
            Object.values(itemError).forEach((error: any) => {
              if (error?.message) {
                errorMessages.push(`Item ${index + 1}: ${error.message}`);
              }
            });
          }
        });
      } else if (value?.message) {
        errorMessages.push(`${key}: ${value.message}`);
      }
    });

    setFormErrors(errorMessages);
    toast.error("Please check the form for errors");
  };

  const handleAddItem = () => {
    append({
      productName: "",
      description: "",
      quantity: 1,
      pricePerUnit: 0,
      taxSlabId: "",
      taxAmount: 0,
      totalAmount: 0
    });
  };

  const handleRemoveItem = (index: number) => {
    remove(index);
    setTimeout(() => recalculateTotals(), 0);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <FormErrorSummary errors={formErrors} />

      {debugInfo && (
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-md text-sm">
          <h3 className="font-medium mb-2">Debug Information:</h3>
          <pre className="whitespace-pre-wrap text-xs max-h-64 overflow-auto">{debugInfo}</pre>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              {initialData?.id ? "Edit Sale" : "Create New Sale"}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Sale Information */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="bg-slate-50 border-b px-6">
                <CardTitle className="text-base font-medium">Sale Information</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Customer Select */}

                   <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer <span className="text-red-500">*</span></FormLabel>
                      <div className="relative">
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                          onClick={() => setCustomerDropdownOpen(!customerDropdownOpen)}
                        >
                          {field.value
                            ? customers.find((customer) => customer.id === field.value)?.name || "Select customer"
                            : "Select customer"}
                          <Check className="ml-auto h-4 w-4" />
                        </Button>
                        
                        {customerDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white rounded-md border shadow-md">
                            <div className="p-2">
                              <Input
                                placeholder="Search customers..."
                                className="mb-2"
                                value={customerSearch}
                                onChange={(e) => setCustomerSearch(e.target.value)}
                                autoFocus
                              />
                              
                              <div className="max-h-[200px] overflow-y-auto">
                                {filteredCustomers.length === 0 ? (
                                  <div className="text-center py-2 text-sm text-gray-500">
                                    No customers found
                                  </div>
                                ) : (
                                  filteredCustomers.map((customer) => (
                                    <div
                                      key={customer.id}
                                      className={cn(
                                        "flex items-center justify-between px-2 py-1.5 cursor-pointer rounded hover:bg-gray-100",
                                        customer.id === field.value && "bg-gray-100"
                                      )}
                                      onClick={() => {
                                        field.onChange(customer.id);
                                        setCustomerSearch("");
                                        setCustomerDropdownOpen(false);
                                      }}
                                    >
                                      <span>{customer.name}</span>
                                      {customer.id === field.value && (
                                        <Check className="h-4 w-4 text-primary" />
                                      )}
                                    </div>
                                  )))                                
                                }                                
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} 
                />
                
                  {/* Sale Date */}
                  <FormField
                    control={form.control}
                    name="saleDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Sale Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left",
                                !field.value && "text-muted-foreground"
                              )}
                              disabled={loading}
                            >
                              {field.value
                                ? format(field.value, "dd/MM/yyyy")
                                : "Select date"}
                              <CalendarIcon className="ml-auto h-4 w-4" />
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

                  {/* Description */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            disabled={loading}
                            placeholder="Sale details"
                            className="resize-none"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Invoice Details */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="bg-slate-50 border-b px-6">
                <CardTitle className="text-base font-medium">Invoice Details</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Invoice Number */}
                  <FormField
                    control={form.control}
                    name="invoiceNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice Number</FormLabel>
                        <FormControl>
                          <Input
                            disabled={loading}
                            placeholder="Enter invoice number"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="referenceNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reference Number</FormLabel>
                        <FormControl>
                          <Input
                            disabled={loading}
                            placeholder="Reference number"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Status Selection */}
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select
                          disabled={loading}
                          onValueChange={field.onChange}
                          value={field.value}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sale Items */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50 border-b px-6">
              <CardTitle className="text-base font-medium">Sale Items</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="rounded-md border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr className="border-b">
                      <th className="h-10 px-4 text-left font-medium">Product/Service</th>
                      <th className="h-10 px-2 text-center font-medium">Quantity</th>
                      <th className="h-10 px-2 text-center font-medium">Unit</th>
                      <th className="h-10 px-2 text-center font-medium">Price</th>
                      <th className="h-10 px-2 text-center font-medium">Tax</th>
                      <th className="h-10 px-4 text-right font-medium">Total</th>
                      <th className="h-10 px-2 text-center font-medium w-[60px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, index) => (
                      <tr key={field.id} className="border-b hover:bg-muted/30">
                        {/* Product Name field */}
                        <td className="p-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.productName`}
                            render={({ field }) => (
                              <FormItem className="mb-0">
                                <FormControl>
                                  <Input
                                    disabled={loading}
                                    placeholder="Product name"
                                    {...field}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </td>

                        {/* Quantity field */}
                        <td className="p-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem className="mb-0">
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    disabled={loading}
                                    placeholder="0"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </td>

                        {/* Unit of Measure field */}
                        <td className="p-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.unitOfMeasureId`}
                            render={({ field }) => (
                              <FormItem className="mb-0">
                                <Select
                                  disabled={loading}
                                  onValueChange={field.onChange}
                                  value={field.value || ""}
                                  defaultValue={field.value || ""}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Unit" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="">None</SelectItem>
                                    {units.map((unit) => (
                                      <SelectItem key={unit.id} value={unit.id}>
                                        {unit.name} ({unit.abbreviation})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                        </td>

                        {/* Price field */}
                        <td className="p-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.pricePerUnit`}
                            render={({ field }) => (
                              <FormItem className="mb-0">
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    disabled={loading}
                                    placeholder="0.00"
                                    {...field}
                                    onChange={(e) => {
                                      // Just update the value without recalculation
                                      field.onChange(parseFloat(e.target.value) || 0)
                                    }}
                                    onBlur={(e) => {
                                      // Recalculate when user has finished typing and moved away
                                      field.onBlur();
                                      recalculateTotals(`items.${index}.pricePerUnit`);
                                    }}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </td>

                        {/* Tax field - FIX: Move FormField inside td */}
                        <td className="p-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.taxSlabId`}
                            render={({ field }) => (
                              <FormItem className="mb-0">
                                <Select
                                  disabled={loading}
                                  onValueChange={field.onChange}
                                  value={field.value || ""}
                                  defaultValue={field.value || ""}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Tax" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="">None</SelectItem>
                                    {taxSlabs.map((tax) => (
                                      <SelectItem key={tax.id} value={tax.id}>
                                        {tax.name} ({tax.percentage}%)
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                        </td>

                        {/* Enhanced Total field - now editable */}
                        <td className="p-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.totalAmount`}
                            render={({ field }) => (
                              <FormItem className="mb-0">
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    disabled={loading}
                                    placeholder="0.00"
                                    {...field}
                                    onChange={(e) => {
                                      // Just update the value without recalculation
                                      field.onChange(parseFloat(e.target.value) || 0)
                                    }}
                                    onBlur={(e) => {
                                      // Recalculate when user has finished typing and moved away
                                      field.onBlur();
                                      recalculateTotals(`items.${index}.totalAmount`);
                                    }}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </td>

                        {/* Remove button */}
                        <td className="p-2">
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(index)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash className="h-4 w-4" />
                              <span className="sr-only">Remove item</span>
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="mt-4"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>

              <div className="mt-6 flex justify-end">
                <div className="w-72 space-y-2 bg-slate-50 p-4 rounded-md border border-slate-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Subtotal:</span>
                    <span className="font-medium">{formatPrice(form.watch("salePrice"))}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Tax:</span>
                    <span className="font-medium">{formatPrice(form.watch("gstAmount") || 0)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>{formatPrice(form.watch("totalWithTax") || 0)}</span>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>

          <div className="flex justify-end gap-4 mt-8">
            <Button 
              type="button" 
              variant="outline"
              onClick={() => window.history.back()}
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
              ) : submitButtonText}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};