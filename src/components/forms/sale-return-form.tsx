"use client";

import { useState, useEffect } from "react";
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
    }
  });

  // Setup field array for items
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  // Load sale details if selectedSaleId is set
  useEffect(() => {
    if (selectedSaleId && !initialData) {
      handleSaleChange(selectedSaleId);
    }
  }, [selectedSaleId]);

  // Fetch sale items when sale is selected
  const handleSaleChange = async (saleId: string) => {
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
  };

  // Recalculate totals when items change
  const recalculateTotals = (changedFieldName?: string) => {
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
  };

  // Watch for changes to fields that affect calculations
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name && (name.includes('quantity') || name.includes('pricePerUnit') || name.includes('taxSlabId'))) {
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
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading title={title} description={description} />
      </div>
      <Separator />
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Sale Return Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sale Selection */}
              <FormField
                control={form.control}
                name="saleDetailId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sale</FormLabel>
                    <FormControl>
                      <Select 
                        disabled={loading || !!initialData} 
                        value={field.value} 
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleSaleChange(value);
                        }}
                      >
                        <SelectTrigger>
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
                    <FormLabel>Return Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal",
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
                      <PopoverContent className="w-auto p-0" align="start">                        <Calendar
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
                    <FormLabel>Return Reason</FormLabel>
                    <FormControl>
                      <Textarea
                        disabled={loading}
                        placeholder="Enter reason for return"
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
                    <FormLabel>Reference Number</FormLabel>
                    <FormControl>
                      <Input
                        disabled={loading}
                        placeholder="Enter reference number"
                        {...field}
                      />
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
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <Select disabled={loading} value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
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
            </CardContent>
          </Card>

          {/* Items Section */}
          <Card>
            <CardHeader>
              <CardTitle>Return Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex flex-col gap-4 p-4 border rounded-lg relative">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2"
                      onClick={() => remove(index)}
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Product Name */}
                      <FormField
                        control={form.control}
                        name={`items.${index}.productName`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Product/Service</FormLabel>
                            <FormControl>
                              <Input {...field} disabled={loading} placeholder="Product name" />
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
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Input {...field} disabled={loading} placeholder="Description" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Quantity */}
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantity</FormLabel>
                            <FormControl>
                              <div className="flex items-center">
                                <Input
                                  {...field}
                                  type="number"
                                  step="any"
                                  min="0.01"
                                  disabled={loading}
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
                            <FormLabel>Unit</FormLabel>
                            <FormControl>
                              <Select
                                disabled={loading}
                                value={field.value || ""}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger>
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
                            <FormLabel>Price Per Unit</FormLabel>
                            <FormControl>
                              <div className="flex items-center">
                                <span className="mr-2 text-sm text-gray-500">₹</span>
                                <Input
                                  {...field}
                                  type="number"
                                  step="any"
                                  min="0"
                                  disabled={loading}
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Tax Slab */}
                      <FormField
                        control={form.control}
                        name={`items.${index}.taxSlabId`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tax Rate</FormLabel>
                            <FormControl>
                              <Select
                                disabled={loading}
                                value={field.value || ""}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger>
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
                            <FormLabel>Tax Amount</FormLabel>
                            <FormControl>
                              <div className="flex items-center">
                                <span className="mr-2 text-sm text-gray-500">₹</span>
                                <Input
                                  {...field}
                                  type="number"
                                  step="any"
                                  min="0"
                                  disabled={true} // Auto-calculated
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
                            <FormLabel>Total Amount</FormLabel>
                            <FormControl>
                              <div className="flex items-center">
                                <span className="mr-2 text-sm text-gray-500">₹</span>
                                <Input
                                  {...field}
                                  type="number"
                                  step="any"
                                  min="0"
                                  disabled={true} // Auto-calculated
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
                  className="w-full mt-2"
                >
                  + Add Item
                </Button>
              </div>

              {/* Totals Display */}
              <div className="mt-6 space-y-2 text-right">                <div className="flex justify-end items-center">
                  <span className="font-medium text-gray-600 mr-4">Subtotal:</span>
                  <span>₹{(form.getValues("amount") || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-end items-center">
                  <span className="font-medium text-gray-600 mr-4">GST:</span>
                  <span>₹{(form.getValues("gstAmount") || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-end items-center font-bold text-lg">
                  <span className="mr-4">Total:</span>
                  <span>₹{((form.getValues("amount") || 0) + (form.getValues("gstAmount") || 0)).toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">              <Button
                type="button"
                variant="outline"
                onClick={() => onClose ? onClose() : router.push("/sale-returns")}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {action}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </>
  );
};
