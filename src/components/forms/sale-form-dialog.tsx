"use client";

import * as z from "zod";
import { useState, useEffect, useCallback, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { toast } from "react-hot-toast";
import { utcToLocal } from "@/lib/timezone-utils";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Trash } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SaleFormProps } from "@/types";
import { FormErrorSummary } from "@/components/ui/form-error-summary";
import { DatePickerField } from "@/components/forms/shared/DatePickerField";
import { SearchableFormSelect } from "@/components/forms/shared/SearchableFormSelect";
import { recalculateLineItems, extractFormErrors } from "@/lib/transaction-schemas";

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
  const isCalculatingRef = useRef(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

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
      ? (utcToLocal(initialData.saleDate) || new Date())
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
  const recalculateTotals = useCallback((changedField?: string) => {
    if (isCalculatingRef.current) return;

    isCalculatingRef.current = true;
    try {
      const items = form.getValues("items");
      const { updates, subtotal, totalTax, grandTotal } = recalculateLineItems(items, taxSlabs, changedField);

      updates["salePrice"] = subtotal;
      updates["gstAmount"] = totalTax;
      form.setValue("totalWithTax", grandTotal, { shouldValidate: false });

      Object.entries(updates).forEach(([field, value]) => {
        form.setValue(field as any, value, {
          shouldValidate: false,
          shouldDirty: true,
          shouldTouch: false
        });
      });
    } finally {
      isCalculatingRef.current = false;
    }
  }, [form, taxSlabs]);

  // Delay calculation until field loses focus instead of on every keystroke
  useEffect(() => {
    // This is the key change - we're not using the "watch" method for real-time changes
    // Instead we'll use onBlur events on inputs to trigger calculations
    recalculateTotals();

    // Still watch for tax slab and quantity changes which should recalculate immediately
    const subscription = form.watch((value, { name, type }) => {
      if (isCalculatingRef.current || !name) return;

      // Only recalculate immediately for these specific changes
      if (name.includes('taxSlabId') || name.includes('quantity')) {
        setTimeout(() => recalculateTotals(name), 10);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, fields.length, recalculateTotals]);
  // For item length changes
  useEffect(() => {
    if (fields.length > 0) {
      recalculateTotals();
    }
  }, [fields.length, recalculateTotals]);

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

  const onError = (errors: any) => {
    console.error("Form Validation Errors:", errors);
    setFormErrors(extractFormErrors(errors));
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
  }; return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <FormErrorSummary errors={formErrors} />

      {debugInfo && (
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-md text-sm">
          <h3 className="font-medium mb-2">Debug Information:</h3>
          <pre className="whitespace-pre-wrap text-xs max-h-64 overflow-auto">{debugInfo}</pre>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-8">
          <FormField
            control={form.control}
            name="tourPackageQueryId"
            render={({ field }) => (
              <input type="hidden" {...field} value={field.value || ""} />
            )}
          />
          {/* Modern Header with Gradient */}
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-xl border border-blue-100 p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-full p-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {initialData?.id ? "Edit Sale" : "Create New Sale"}
            </h2>
            <p className="text-gray-600">
              {initialData?.id ? "Update the sale details below" : "Enter the details for the new sale"}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Basic Sale Information */}
            <Card className="shadow-md border-0 bg-white">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-4">
                <CardTitle className="text-lg font-semibold">Sale Information</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pt-6">
                <div className="space-y-6">                  {/* Customer Select */}
                  <SearchableFormSelect
                    control={form.control}
                    name="customerId"
                    label="Customer"
                    required
                    items={customers}
                    valueKey={(c) => c.id}
                    labelKey={(c) => c.name}
                    secondaryKey={(c) => c.contact}
                    placeholder="Select customer"
                    searchPlaceholder="Search customers..."
                    emptyMessage="No customers found"
                    colorClass="blue"
                  />
                  {/* Sale Date */}
                  <DatePickerField
                    control={form.control}
                    name="saleDate"
                    label="Sale Date"
                    disabled={loading}
                    colorClass="blue"
                  />

                  {/* Description */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel className="text-sm font-medium text-gray-700">Description</FormLabel>
                        <FormControl>
                          <Textarea
                            disabled={loading}
                            placeholder="Sale details"
                            className="resize-none border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
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
            </Card>            {/* Invoice Details */}
            <Card className="shadow-md border-0 bg-white">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-4">
                <CardTitle className="text-lg font-semibold">Invoice Details</CardTitle>
              </CardHeader>
              <CardContent className="px-6 pt-6">
                <div className="space-y-6">
                  {/* Invoice Number */}
                  <FormField
                    control={form.control}
                    name="invoiceNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Invoice Number</FormLabel>
                        <FormControl>
                          <Input
                            disabled={loading}
                            placeholder="Enter invoice number"
                            className="h-11 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
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
                        <FormLabel className="text-sm font-medium text-gray-700">Reference Number</FormLabel>
                        <FormControl>
                          <Input
                            disabled={loading}
                            placeholder="Reference number"
                            className="h-11 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
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
                        <FormLabel className="text-sm font-medium text-gray-700">Status</FormLabel>
                        <Select
                          disabled={loading}
                          onValueChange={field.onChange}
                          value={field.value}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200">
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
          </div>          {/* Sale Items */}
          <Card className="shadow-md border-0 bg-white">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-4">
              <CardTitle className="text-lg font-semibold">Sale Items</CardTitle>
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
                      <tr key={`item-${index}`} className="border-b hover:bg-muted/30">
                        {/* Product Name field */}
                        <td className="p-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.productName`}
                            render={({ field }) => (
                              <FormItem className="mb-0">                                <FormControl>
                                <Input
                                  disabled={loading}
                                  placeholder="Product name"
                                  className="h-10 border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
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
                              <FormItem className="mb-0">                                <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  disabled={loading}
                                  placeholder="0"
                                  className="h-10 border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
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
                                >                                  <FormControl>
                                    <SelectTrigger className="h-10 border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200">
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
                              <FormItem className="mb-0">                                <FormControl>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">₹</span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    disabled={loading}
                                    placeholder="0.00"
                                    className="h-10 pl-8 border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
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
                                >                                  <FormControl>
                                    <SelectTrigger className="h-10 border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200">
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
                              <FormItem className="mb-0">                                <FormControl>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">₹</span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    disabled={loading}
                                    placeholder="0.00"
                                    className="h-10 pl-8 border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
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
                                </div>
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
              </div>              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="mt-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 hover:from-blue-600 hover:to-purple-600"
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
              className="px-8 h-11 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0 shadow-md"
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