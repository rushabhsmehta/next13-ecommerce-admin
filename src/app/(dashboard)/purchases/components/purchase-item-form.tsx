"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Trash, Plus, Calculator } from "lucide-react";
import { format } from "date-fns";
import axios from "axios";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaxSlab, UnitOfMeasure } from "@prisma/client";

// Define the schema for a single item
const purchaseItemSchema = z.object({
  productName: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  unitOfMeasureId: z.string().optional(),
  pricePerUnit: z.coerce.number().min(0, "Price per unit can't be negative"),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  discountAmount: z.coerce.number().min(0).optional(),
  taxSlabId: z.string().optional(),
  taxAmount: z.coerce.number().min(0).optional(),
  totalAmount: z.coerce.number(),
});

// Define the schema for the whole form
const formSchema = z.object({
  billNumber: z.string().optional(),
  billDate: z.date(),
  dueDate: z.date().optional(),
  stateOfSupply: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, "At least one item is required"),
  description: z.string().optional(),
});

type PurchaseItemFormValues = z.infer<typeof formSchema>;

interface PurchaseItemsFormProps {
  initialData: any;
  taxSlabs: TaxSlab[];
  units: UnitOfMeasure[];
}

export const PurchaseItemsForm: React.FC<PurchaseItemsFormProps> = ({
  initialData,
  taxSlabs,
  units,
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Helper function to calculate tax amount
  const calculateTaxAmount = (price: number, taxPercentage: number): number => {
    if (price <= 0 || taxPercentage <= 0) return 0;
    return parseFloat(((price * taxPercentage) / 100).toFixed(2));
  };

  // Calculate discount amount from percentage
  const calculateDiscountAmount = (price: number, discountPercent: number): number => {
    if (price <= 0 || discountPercent <= 0) return 0;
    return parseFloat(((price * discountPercent) / 100).toFixed(2));
  };
  
  // Calculate discount percentage from amount
  const calculateDiscountPercent = (price: number, discountAmount: number): number => {
    if (price <= 0 || discountAmount <= 0) return 0;
    return parseFloat(((discountAmount / price) * 100).toFixed(2));
  };

  // Calculate final price after discount
  const calculatePriceAfterDiscount = (price: number, discountAmount: number): number => {
    return Math.max(0, price - discountAmount);
  };

  // Default values for the form
  const defaultValues = {
    billNumber: initialData?.billNumber || "",
    billDate: initialData?.billDate ? new Date(initialData.billDate) : new Date(),
    dueDate: initialData?.dueDate ? new Date(initialData.dueDate) : undefined,
    stateOfSupply: initialData?.stateOfSupply || "",
    description: initialData?.description || "",
    items: initialData?.items?.length > 0
      ? initialData.items.map((item: any) => ({
          productName: item.productName,
          description: item.description || "",
          quantity: item.quantity,
          unitOfMeasureId: item.unitOfMeasureId || "",
          pricePerUnit: item.pricePerUnit,
          discountPercent: item.discountPercent || 0,
          discountAmount: item.discountAmount || 0,
          taxSlabId: item.taxSlabId || "",
          taxAmount: item.taxAmount || 0,
          totalAmount: item.totalAmount,
        }))
      : [
          {
            productName: "",
            description: "",
            quantity: 1,
            unitOfMeasureId: "",
            pricePerUnit: 0,
            discountPercent: 0,
            discountAmount: 0,
            taxSlabId: "",
            taxAmount: 0,
            totalAmount: 0,
          },
        ],
  };

  const form = useForm<PurchaseItemFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  // Use fieldArray to manage the items array in the form
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Recalculate line item values when inputs change
  const recalculateLineItem = (index: number) => {
    const items = form.getValues("items");
    const item = items[index];
    
    if (!item) return;
    
    const quantity = item.quantity || 0;
    const pricePerUnit = item.pricePerUnit || 0;
    const subTotal = quantity * pricePerUnit;
    
    // Handle discount calculation
    let discountAmount = item.discountAmount || 0;
    let discountPercent = item.discountPercent || 0;
    
    if (form.getValues(`items.${index}.discountPercent`) !== discountPercent) {
      // Discount percentage was changed, recalculate amount
      discountAmount = calculateDiscountAmount(subTotal, discountPercent);
      form.setValue(`items.${index}.discountAmount`, discountAmount);
    } else if (form.getValues(`items.${index}.discountAmount`) !== discountAmount) {
      // Discount amount was changed, recalculate percentage
      discountPercent = calculateDiscountPercent(subTotal, discountAmount);
      form.setValue(`items.${index}.discountPercent`, discountPercent);
    }
    
    const priceAfterDiscount = calculatePriceAfterDiscount(subTotal, discountAmount);
    
    // Calculate tax if tax slab is selected
    let taxAmount = 0;
    const taxSlabId = item.taxSlabId || "";
    const selectedTaxSlab = taxSlabs.find(ts => ts.id === taxSlabId);
    
    if (selectedTaxSlab) {
      taxAmount = calculateTaxAmount(priceAfterDiscount, selectedTaxSlab.percentage);
      form.setValue(`items.${index}.taxAmount`, taxAmount);
    }
    
    // Calculate final total amount
    const totalAmount = priceAfterDiscount + taxAmount;
    form.setValue(`items.${index}.totalAmount`, totalAmount);
  };

  // Watch for changes to fields that require recalculation
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name?.startsWith('items.') && name?.match(/\.(quantity|pricePerUnit|discountPercent|discountAmount|taxSlabId)$/)) {
        const match = name.match(/^items\.(\d+)\./);
        if (match) {
          const index = parseInt(match[1], 10);
          recalculateLineItem(index);
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form.watch]);

  // Calculate the form totals
  const calculateTotals = () => {
    const items = form.getValues("items");
    
    const subTotal = items.reduce((sum, item) => 
      sum + ((item.quantity || 0) * (item.pricePerUnit || 0)), 0);
    
    const totalDiscount = items.reduce((sum, item) => 
      sum + (item.discountAmount || 0), 0);
    
    const totalTax = items.reduce((sum, item) => 
      sum + (item.taxAmount || 0), 0);
    
    const grandTotal = items.reduce((sum, item) => 
      sum + (item.totalAmount || 0), 0);
    
    return {
      subTotal,
      totalDiscount,
      totalTax,
      grandTotal
    };
  };

  const { subTotal, totalDiscount, totalTax, grandTotal } = calculateTotals();

  const onSubmit = async (data: PurchaseItemFormValues) => {
    try {
      setLoading(true);
      
      // Update purchase with items
      if (initialData?.id) {
        await axios.patch(`/api/purchases/${initialData.id}/items`, data);
        toast.success("Purchase updated with items");
      } else {
        await axios.post('/api/purchases/items', {
          ...data,
          supplierId: initialData.supplierId,
          tourPackageQueryId: initialData.tourPackageQueryId
        });
        toast.success("Purchase created with items");
      }
      
      router.push("/purchases");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Add a new empty item
  const addItem = () => {
    append({
      productName: "",
      description: "",
      quantity: 1,
      unitOfMeasureId: "",
      pricePerUnit: 0,
      discountPercent: 0,
      discountAmount: 0,
      taxSlabId: "",
      taxAmount: 0,
      totalAmount: 0,
    });
  };

  // Helper to find unit abbreviation
  const getUnitAbbreviation = (unitId: string | undefined) => {
    if (!unitId) return '';
    const unit = units.find(u => u.id === unitId);
    return unit?.abbreviation || '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {initialData?.id ? "Edit Purchase Items" : "Create Purchase with Items"}
        </h2>
        
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
      
      <Separator />
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Details</CardTitle>
              <CardDescription>
                Enter general information about this purchase
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="billNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bill Number</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="BILL-00001" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="stateOfSupply"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State of Supply</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. Maharashtra" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="billDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Bill Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "MMMM d, yyyy")
                              ) : (
                                <span>Select date</span>
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
                
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Due Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "MMMM d, yyyy")
                              ) : (
                                <span>Select due date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any additional details about this purchase" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Items</CardTitle>
                <CardDescription>
                  Add the items included in this purchase
                </CardDescription>
              </div>
              <Button type="button" onClick={addItem} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <Card key={field.id} className="border border-gray-200">
                  <CardHeader className="bg-slate-50 py-3">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-base font-medium">
                        Item {index + 1}
                      </CardTitle>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => remove(index)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Product Name */}
                      <FormField
                        control={form.control}
                        name={`items.${index}.productName`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Product/Service Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter product or service name"
                                {...field} 
                              />
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
                            <FormLabel>Unit of Measure</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                              disabled={loading}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select unit" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {units.map((unit) => (
                                  <SelectItem key={unit.id} value={unit.id}>
                                    {unit.name} ({unit.abbreviation})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                                {form.watch(`items.${index}.unitOfMeasureId`) && (
                                  <span className="ml-2 text-sm text-muted-foreground">
                                    {getUnitAbbreviation(form.watch(`items.${index}.unitOfMeasureId`))}
                                  </span>
                                )}
                              </div>
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
                              <Input 
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Subtotal (Quantity × Price) - Read only */}
                      <div className="space-y-2">
                        <div className="font-medium text-sm">Subtotal</div>
                        <div className="h-10 px-3 py-2 rounded-md border border-input bg-background flex items-center">
                          {formatPrice((form.watch(`items.${index}.quantity`) || 0) * 
                                       (form.watch(`items.${index}.pricePerUnit`) || 0))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Discount Percentage */}
                      <FormField
                        control={form.control}
                        name={`items.${index}.discountPercent`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Discount %</FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                placeholder="0.00"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Discount Amount */}
                      <FormField
                        control={form.control}
                        name={`items.${index}.discountAmount`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Discount Amount</FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Tax Slab Selection */}
                      <FormField
                        control={form.control}
                        name={`items.${index}.taxSlabId`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tax Rate</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                              disabled={loading}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select tax rate" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="">No Tax</SelectItem>
                                {taxSlabs.map((slab) => (
                                  <SelectItem key={slab.id} value={slab.id}>
                                    {slab.name} ({slab.percentage}%)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Tax Amount - Read only */}
                      <div className="space-y-2">
                        <div className="font-medium text-sm">Tax Amount</div>
                        <div className="h-10 px-3 py-2 rounded-md border border-input bg-background flex items-center">
                          {formatPrice(form.watch(`items.${index}.taxAmount`) || 0)}
                        </div>
                      </div>
                      
                      {/* Total Amount - Read only */}
                      <div className="space-y-2 md:col-span-2">
                        <div className="font-medium text-sm">Line Total</div>
                        <div className="h-10 px-3 py-2 rounded-md border border-input bg-background flex items-center font-medium">
                          {formatPrice(form.watch(`items.${index}.totalAmount`) || 0)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Description */}
                    <FormField
                      control={form.control}
                      name={`items.${index}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Item Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Additional details about this item"
                              className="resize-none"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              ))}
              
              {/* Summary Card */}
              <Card className="border-t-4 border-primary">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span>{formatPrice(subTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Discount:</span>
                      <span>{formatPrice(totalDiscount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax:</span>
                      <span>{formatPrice(totalTax)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-medium">
                      <span>Total:</span>
                      <span className="text-lg">{formatPrice(grandTotal)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="ml-auto"
              >
                {initialData.id ? "Update Purchase" : "Create Purchase"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
};