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
import { CalendarIcon, Check, Command, Plus, Trash } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PurchaseFormProps } from "@/types";
import { CommandEmpty, CommandGroup, CommandItem } from "../ui/command";
import { FormErrorSummary } from "@/components/ui/form-error-summary";

const purchaseItemSchema = z.object({
  id: z.string().optional(),
  productName: z.string().min(1, "Product name is required"),
  description: z.string().optional().nullable(),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
  unitOfMeasureId: z.string().optional().nullable(),
  pricePerUnit: z.coerce.number().min(0.01, "Price per unit must be greater than 0"),
  taxSlabId: z.string().optional().nullable(),
  taxAmount: z.coerce.number().min(0).optional(),
  totalAmount: z.coerce.number().min(0)
});

const formSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  tourPackageQueryId: z.string().optional().nullable(),
  purchaseDate: z.date(),
  billNumber: z.string().optional().nullable(),
  billDate: z.date().optional().nullable(),
  dueDate: z.date().optional().nullable(),
  stateOfSupply: z.string().optional().nullable(),
  referenceNumber: z.string().optional().nullable(),
  price: z.coerce.number().min(0),
  gstAmount: z.coerce.number().min(0).optional(),
  gstPercentage: z.coerce.number().min(0).optional(),
  description: z.string().optional().nullable(),
  status: z.string().default("pending"),
  totalWithTax: z.coerce.number().min(0).optional(),
  items: z.array(purchaseItemSchema)
});
type FormValues = z.infer<typeof formSchema>;

export const PurchaseFormDialog: React.FC<PurchaseFormProps> = ({
  initialData,
  taxSlabs,
  units,
  suppliers,
  onSuccess,
  submitButtonText = "Create"
}) => {
  const [loading, setLoading] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false);
  const [lastUpdatedField, setLastUpdatedField] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Add this computed value
  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(supplierSearch.toLowerCase())
  );
  const defaultItems = initialData?.items?.length > 0
    ? initialData.items
    : initialData?.id && initialData?.price > 0
      // For existing purchases with no items, create a default item using the purchase details
      ? [{
        productName: initialData.description || initialData.tourPackageQuery?.tourPackageQueryName || "Purchase",
        description: initialData.description || "",
        quantity: 1,
        unitOfMeasureId: "",
        pricePerUnit: initialData.price,
        taxSlabId: "",
        taxAmount: initialData.gstAmount || 0,
        totalAmount: initialData.price + (initialData.gstAmount || 0)
      }]
      // For new purchases, create an empty item
      : [{
        productName: initialData?.tourPackageQueryName || "",
        description: "",
        quantity: 1,
        unitOfMeasureId: "",
        pricePerUnit: 0,
        taxSlabId: "",
        taxAmount: 0,
        totalAmount: 0
      }];

  const defaultValues: FormValues = {
    supplierId: initialData?.supplierId || "",
    tourPackageQueryId: initialData?.tourPackageQueryId || "",
    purchaseDate: initialData?.purchaseDate
      ? new Date(initialData.purchaseDate)
      : new Date(),
    billNumber: initialData?.billNumber || "",
    billDate: initialData?.billDate
      ? new Date(initialData.billDate)
      : undefined,
    dueDate: initialData?.dueDate
      ? new Date(initialData.dueDate)
      : undefined,
    stateOfSupply: initialData?.stateOfSupply || "",
    referenceNumber: initialData?.referenceNumber || "",
    price: initialData?.price || 0,
    gstAmount: initialData?.gstAmount || 0,
    gstPercentage: initialData?.gstPercentage || 0,
    description: initialData?.description || "",
    status: initialData?.status || "pending",
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

  // Enhanced recalculate totals function
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
      updates["price"] = Number(totalPriceExclTax.toFixed(2));
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

  // Recalculate totals when the form initially loads with purchase data
  useEffect(() => {
    if (initialData?.id) {
      // Small delay to ensure the form is fully initialized
      const timer = setTimeout(() => {
        recalculateTotals();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [initialData?.id]);

  const onSubmit = async (data: FormValues) => {
    try {
      setLoading(true);
      setFormErrors([]);
      setDebugInfo(null);

      console.log("Form submission started:", initialData?.id ? "UPDATE" : "CREATE");
      console.log("Data to submit:", data);

      // Convert to proper format for API
      const apiData = {
        ...data,
        // Make sure optional string fields are either strings or null, not undefined
        description: data.description || null,
        referenceNumber: data.referenceNumber || null,
        billNumber: data.billNumber || null,
        stateOfSupply: data.stateOfSupply || null,

        // Convert date objects to ISO strings
        purchaseDate: data.purchaseDate.toISOString(),
        billDate: data.billDate ? data.billDate.toISOString() : null,
        dueDate: data.dueDate ? data.dueDate.toISOString() : null,

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
        console.log(`Updating purchase ${initialData.id}`);
        const response = await axios.patch(`/api/purchases/${initialData.id}`, apiData);
        console.log("Update response:", response.data);
        toast.success("Purchase details updated");
        onSuccess();
      } else {
        console.log("Creating new Purchase");
        const response = await axios.post('/api/purchases', apiData);
        console.log("Create response:", response.data);
        toast.success("Purchase created successfully");
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

  const onError = (errors: any) => {
    console.error("Form Validation Errors:", errors);

    const errorMessages: string[] = [];

    // Handle field-specific errors
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
      unitOfMeasureId: "",
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
      )}      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-8">
          {/* Modern Header with Gradient */}
          <div className="bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50 rounded-xl border border-emerald-100 p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full p-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {initialData?.id ? "Edit Purchase" : "Create New Purchase"}
            </h2>
            <p className="text-gray-600">
              {initialData?.id ? "Update the purchase details below" : "Enter the details for the new purchase"}
            </p>
          </div>          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Basic Purchase Information */}
            <Card className="shadow-md border-0 bg-white">
              <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-4">
                <CardTitle className="text-lg font-semibold">Purchase Information</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pt-6">
                <div className="space-y-6">
                  {/* Supplier Select - Improved implementation */}
                  <FormField
                    control={form.control}
                    name="supplierId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Supplier <span className="text-red-500">*</span></FormLabel>
                        <div className="relative">
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full h-11 justify-between border-gray-300 hover:border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200",
                              !field.value && "text-muted-foreground"
                            )}
                            onClick={() => setSupplierDropdownOpen(!supplierDropdownOpen)}
                          >
                            {field.value
                              ? suppliers.find((supplier) => supplier.id === field.value)?.name || "Select supplier"
                              : "Select supplier"}
                            <Check className="ml-auto h-4 w-4" />
                          </Button>

                          {supplierDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white rounded-md border shadow-md">
                              <div className="p-2">
                                <Input
                                  placeholder="Search suppliers..."
                                  className="mb-2 h-10 border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                                  value={supplierSearch}
                                  onChange={(e) => setSupplierSearch(e.target.value)}
                                  autoFocus
                                />

                                <div className="max-h-[200px] overflow-y-auto">
                                  {filteredSuppliers.length === 0 ? (
                                    <div className="text-center py-2 text-sm text-gray-500">
                                      No suppliers found
                                    </div>
                                  ) : (
                                    filteredSuppliers.map((supplier) => (
                                      <div
                                        key={supplier.id}
                                        className={cn(
                                          "flex items-center justify-between px-2 py-1.5 cursor-pointer rounded hover:bg-gray-100",
                                          supplier.id === field.value && "bg-gray-100"
                                        )}
                                        onClick={() => {
                                          field.onChange(supplier.id);
                                          setSupplierSearch("");
                                          setSupplierDropdownOpen(false);
                                        }}
                                      >
                                        <span>{supplier.name}</span>
                                        {supplier.id === field.value && (
                                          <Check className="h-4 w-4 text-primary" />
                                        )}
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Purchase Date */}
                  <FormField
                    control={form.control}
                    name="purchaseDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-sm font-medium text-gray-700">Purchase Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full h-11 justify-start text-left border-gray-300 hover:border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200",
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
                  />                  {/* Description */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Description</FormLabel>
                        <FormControl>
                          <Textarea
                            disabled={loading}
                            placeholder="Purchase details"
                            className="resize-none border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Bill Details */}
            <Card className="shadow-md border-0 bg-white">
              <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-4">
                <CardTitle className="text-lg font-semibold">Bill Details</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pt-6">
                <div className="space-y-6">
                  {/* Bill Number */}
                  <FormField
                    control={form.control}
                    name="billNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Bill Number</FormLabel>
                        <FormControl>
                          <Input
                            disabled={loading}
                            placeholder="Enter bill number"
                            className="h-11 border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Reference Number */}
                  <FormField
                    control={form.control}
                    name="referenceNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Reference Number</FormLabel>
                        <FormControl>
                          <Input
                            disabled={loading}
                            placeholder="Reference number"
                            className="h-11 border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                            {...field}
                            value={field.value || ""}
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
                        <FormLabel className="text-sm font-medium text-gray-700">Status</FormLabel>
                        <Select
                          disabled={loading}
                          onValueChange={field.onChange}
                          value={field.value}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11 border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200">
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
          </div>          {/* Purchase Items */}
          <Card className="shadow-md border-0 bg-white">
            <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-4">
              <CardTitle className="text-lg font-semibold">Purchase Items</CardTitle>
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
                                    className="h-10 border-gray-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
                                    {...field}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </td>
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
                                    className="h-10 border-gray-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </td>
                        <td className="p-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.unitOfMeasureId`}
                            render={({ field }) => (
                              <FormItem className="mb-0">
                                <Select
                                  disabled={loading}
                                  onValueChange={field.onChange}
                                  value={field.value || ""}                                  defaultValue={field.value || ""}
                                >
                                  <FormControl>
                                    <SelectTrigger className="h-10 border-gray-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200">
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
                        <td className="p-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.pricePerUnit`}
                            render={({ field }) => (
                              <FormItem className="mb-0">
                                <FormControl>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">₹</span>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      disabled={loading}
                                      placeholder="0.00"
                                      className="h-10 pl-8 border-gray-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
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
                                  </div>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </td>
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
                                    <SelectTrigger className="h-10 border-gray-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200">
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
                        <td className="p-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.totalAmount`}
                            render={({ field }) => (
                              <FormItem className="mb-0">
                                <FormControl>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">₹</span>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      disabled={loading}
                                      placeholder="0.00"
                                      className="h-10 pl-8 border-gray-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
                                      {...field}
                                      onChange={(e) => {
                                        // Just update the value without recalculation
                                        field.onChange(parseFloat(e.target.value) || 0)
                                      }}
                                      onBlur={(e) => {
                                        // Recalculate when user has finished typing and moved away
                                        field.onBlur();
                                        recalculateTotals(`items.${index}.totalAmount`);                                      }}
                                    />
                                  </div>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </td>
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
              </div>              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="mt-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 hover:from-emerald-600 hover:to-teal-600"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>

              <div className="mt-6 flex justify-end">
                <div className="w-72 space-y-2 bg-slate-50 p-4 rounded-md border border-slate-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Subtotal:</span>
                    <span className="font-medium">{formatPrice(form.watch("price"))}</span>
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
          </Card>          <div className="flex justify-end gap-4 mt-8">
            <Button 
              type="button" 
              variant="outline"
              className="px-8 h-11 border-gray-300 hover:bg-gray-50"
              onClick={() => window.history.back()}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="px-8 h-11 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0 shadow-md"
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