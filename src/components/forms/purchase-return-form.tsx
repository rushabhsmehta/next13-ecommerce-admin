"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CalendarIcon, Trash, PackageX } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";

// Helper to parse a date string (YYYY-MM-DD or ISO) into a local-only Date
const parseLocalDate = (dateString: string | Date | null | undefined) => {
  // If it's already a Date object, return it
  if (dateString instanceof Date) return dateString;
  
  // If it's null/undefined, return current date
  if (!dateString) return new Date();
  
  try {
    // If it's a string, parse it
    const [datePart] = dateString.split("T");
    const [year, month, day] = datePart.split("-").map(Number);
    return new Date(year, month - 1, day);
  } catch (error) {
    console.error("Error parsing date:", error);
    // Return current date as fallback
    return new Date();
  }
};

// Form schema
const formSchema = z.object({
    purchaseDetailId: z.string({
        required_error: "Purchase is required",
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
            purchaseItemId: z.string().optional(),
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

interface PurchaseReturnFormProps {
    initialData?: any;
    taxSlabs?: any[];
    units?: any[];
    suppliers?: any[];
    purchases?: any[];  // Purchase details from the database
    selectedPurchaseId?: string;
    onClose?: () => void;
}

export const PurchaseReturnForm: React.FC<PurchaseReturnFormProps> = ({
    initialData,
    taxSlabs = [],
    units = [],
    suppliers = [],
    purchases = [],
    selectedPurchaseId,
    onClose
}) => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [selectedPurchaseItems, setSelectedPurchaseItems] = useState<any[]>([]);
    const [isCalculating, setIsCalculating] = useState(false);
    const [noPurchasesAvailable, setNoPurchasesAvailable] = useState(purchases.length === 0 && !initialData);

    // Debug output for purchases
    useEffect(() => {
        console.log("Purchases passed to form:", purchases);
        console.log("Purchases length:", purchases?.length);
        setNoPurchasesAvailable(purchases.length === 0 && !initialData);
    }, [purchases, initialData]);

    const title = initialData ? "Edit Purchase Return" : "Create Purchase Return";
    const description = initialData ? "Edit purchase return details" : "Create a new purchase return";
    const toastMessage = initialData ? "Purchase return updated." : "Purchase return created.";
    const action = initialData ? "Save changes" : "Create";

    // Initialize form with default values or existing data
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: initialData ? {
            purchaseDetailId: initialData.purchaseDetailId,
            returnDate: initialData.returnDate ? parseLocalDate(initialData.returnDate) : new Date(),
            returnReason: initialData.returnReason || "",
            amount: initialData.amount,
            gstAmount: initialData.gstAmount || 0,
            reference: initialData.reference || "",
            status: initialData.status || "pending",
            items: initialData.items?.map((item: any) => ({
                purchaseItemId: item.purchaseItemId || undefined,
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
            purchaseDetailId: selectedPurchaseId || "",
            returnDate: new Date(),
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

    // Load purchase details if selectedPurchaseId is set
    useEffect(() => {
        if (selectedPurchaseId && !initialData) {
            handlePurchaseChange(selectedPurchaseId);
        }
    }, [selectedPurchaseId]);  // Fetch purchase items when purchase is selected  // Helper to process purchase items and add them to the form
    const processItems = (purchaseData: any) => {
        if (purchaseData.items && purchaseData.items.length > 0) {
            console.log("Processing purchase items:", purchaseData.items.length);
            setSelectedPurchaseItems(purchaseData.items);

            // Clear existing items if it's not an editing scenario
            if (!initialData) {
                while (fields.length) {
                    remove(0);
                }

                // Add purchase items as options to return
                purchaseData.items.forEach((item: any) => {
                    console.log("Adding item to form:", item.productName);
                    append({
                        purchaseItemId: item.id,
                        productName: item.productName,
                        description: item.description || "",
                        // Default to the full purchased quantity for return
                        quantity: item.quantity,
                        unitOfMeasureId: item.unitOfMeasureId || undefined,
                        pricePerUnit: item.pricePerUnit,
                        taxSlabId: item.taxSlabId || undefined,
                        taxAmount: 0,
                        totalAmount: 0,
                    });
                });

                // Update form with purchase details
                form.setValue("amount", 0);
                form.setValue("gstAmount", 0);
            }
            return true;
        }
        return false;
    };

    const handlePurchaseChange = async (purchaseId: string) => {
        try {
            if (!purchaseId) {
                console.log("No purchase ID provided");
                return;
            }

            console.log("Fetching items for purchase ID:", purchaseId);
            setLoading(true);

            // Find the selected purchase in our props first
            const selectedPurchase = purchases.find(p => p.id === purchaseId);
            console.log("Selected purchase from props:", selectedPurchase);

            // Check if the purchase has items already loaded in the props
            if (selectedPurchase && selectedPurchase.items && selectedPurchase.items.length > 0) {
                console.log("Using items from props:", selectedPurchase.items.length);
                if (processItems(selectedPurchase)) {
                    return; // We've successfully processed items from props
                }
            }

            try {
                // Make API call to get purchase details with items if not in props
                console.log("Making API call to fetch purchase items...");
                const response = await axios.get(`/api/purchases/${purchaseId}`);
                console.log("API Response for purchase items:", response.data);
                const purchaseData = response.data;
                if (!processItems(purchaseData)) {
                    console.log("No items found in purchase data from API");
                    toast.error("This purchase has no items that can be returned.");
                }
            } catch (apiError) {
                console.error("API error fetching purchase items", apiError);
                toast.error("Failed to fetch purchase details from API");
            }
        } catch (error) {
            console.error("Error in purchase change handling:", error);
            toast.error("An error occurred while processing the purchase selection");
        } finally {
            setLoading(false);
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
                // Update existing purchase return
                await axios.patch(`/api/purchase-returns/${initialData.id}`, apiData);
            } else {
                // Create new purchase return
                await axios.post('/api/purchase-returns', apiData);
            }      // If we're in the modal context, use onClose instead of redirect
            if (onClose) {
                onClose();
                toast.success(toastMessage);
            } else {
                router.push("/purchase-returns");
                router.refresh();
                toast.success(toastMessage);
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
            purchaseItemId: "",
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

    // Helper to find purchase name
    const getPurchaseName = (purchaseId: string) => {
        const purchase = purchases.find(p => p.id === purchaseId);
        if (purchase) {
            try {
                const supplier = purchase.supplier?.name || "Unknown Supplier";
                const date = purchase.purchaseDate ? format(new Date(purchase.purchaseDate), "dd MMM yyyy") : "Unknown Date";
                const description = purchase.description || purchase.billNumber || purchase.id.substring(0, 8);
                return `${supplier} - ${description} (${date})`;
            } catch (error) {
                console.error("Error formatting purchase name:", error);
                return `Purchase ID: ${purchaseId}`;
            }
        }
        return `Purchase ID: ${purchaseId}`;
    };
    return (
        <>
            {/* Modern Header with Purple-to-Indigo Gradient */}
            <div className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white p-6 rounded-t-lg shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                        <PackageX className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">{title}</h2>
                        <p className="text-purple-100 opacity-90">{description}</p>
                    </div>
                </div>
            </div>

            {noPurchasesAvailable ? (
                <Card className="shadow-md border-0 bg-white">
                    <CardContent className="p-8">
                        <div className="bg-amber-50 border border-amber-200 rounded-md p-6 text-center">
                            <h3 className="text-amber-700 text-lg font-medium mb-2">No Purchases Available</h3>
                            <p className="text-amber-600 mb-3">
                                There are no purchases available to create a return from.
                            </p>
                            <p className="text-gray-600">
                                Please create a purchase first before attempting to record a return.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <Card className="shadow-md border-0 bg-white">
                            <CardHeader className="bg-gradient-to-r from-purple-100 to-indigo-100 border-b border-purple-200">
                                <CardTitle className="text-purple-800 font-semibold">Purchase Return Details</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                {/* Purchase Selection */}
                                <FormField
                                    control={form.control}
                                    name="purchaseDetailId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-sm font-medium text-gray-700">Purchase</FormLabel>
                                            <FormControl>
                                                <Select
                                                    disabled={loading || !!initialData}
                                                    value={field.value}
                                                    onValueChange={(value) => {
                                                        field.onChange(value);
                                                        handlePurchaseChange(value);
                                                    }}
                                                >
                                                    <SelectTrigger className="h-11 border-gray-300 hover:border-purple-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-colors">
                                                        <SelectValue placeholder={loading ? "Loading purchase items..." : "Select a purchase"} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {purchases && purchases.length > 0 ? (
                                                            purchases.map((purchase) => (
                                                                <SelectItem key={purchase.id} value={purchase.id}>
                                                                    {getPurchaseName(purchase.id)}
                                                                </SelectItem>
                                                            ))
                                                        ) : (
                                                            <SelectItem value="no-purchases" disabled>
                                                                No purchases available
                                                            </SelectItem>
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            {loading && field.value && (
                                                <p className="text-sm text-purple-600 mt-1 animate-pulse">
                                                    Loading items for selected purchase...
                                                </p>
                                            )}
                                            {purchases && purchases.length === 0 && !initialData && (
                                                <p className="text-sm text-amber-600 mt-1">
                                                    No purchases found. Please create a purchase first.
                                                </p>
                                            )}
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Return Date */}
                                    <FormField
                                        control={form.control}
                                        name="returnDate"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel className="text-sm font-medium text-gray-700">Return Date</FormLabel>
                                                <FormControl>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                className={cn(
                                                                    "h-11 pl-3 text-left font-normal border-gray-300 hover:border-purple-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-colors",
                                                                    !field.value && "text-muted-foreground"
                                                                )}
                                                            >
                                                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="start">
                                                            <Calendar
                                                                mode="single"
                                                                selected={field.value}
                                                                onSelect={(date) => date && field.onChange(date)}
                                                                disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                                                initialFocus
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
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
                                                        <SelectTrigger className="h-11 border-gray-300 hover:border-purple-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-colors">
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

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                                        className="border-gray-300 hover:border-purple-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-colors resize-none"
                                                        rows={3}
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
                                                        className="h-11 border-gray-300 hover:border-purple-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-colors"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Items Section */}
                        <Card className="shadow-md border-0 bg-white">
                            <CardHeader className="bg-gradient-to-r from-purple-100 to-indigo-100 border-b border-purple-200">
                                <CardTitle className="text-purple-800 font-semibold">Return Items</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="space-y-4">
                                    {fields.map((field, index) => (
                                        <div key={field.id} className="flex flex-col gap-4 p-4 border border-gray-200 rounded-lg relative bg-gray-50/50 hover:bg-gray-50 transition-colors">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="absolute right-2 top-2 text-red-500 hover:text-red-700 hover:bg-red-50"
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
                                                            <FormLabel className="text-sm font-medium text-gray-700">Product Name</FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    {...field}
                                                                    disabled={loading}
                                                                    placeholder="Enter product name"
                                                                    className="h-11 border-gray-300 hover:border-purple-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-colors"
                                                                />
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
                                                                <Input
                                                                    {...field}
                                                                    disabled={loading}
                                                                    placeholder="Enter description (optional)"
                                                                    className="h-11 border-gray-300 hover:border-purple-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-colors"
                                                                />
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
                                                            <FormLabel className="text-sm font-medium text-gray-700">Quantity</FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    {...field}
                                                                    type="number"
                                                                    step="any"
                                                                    min="0"
                                                                    disabled={loading}
                                                                    placeholder="0"
                                                                    className="h-11 border-gray-300 hover:border-purple-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-colors"
                                                                    onChange={(e) => {
                                                                        field.onChange(parseFloat(e.target.value) || 0);
                                                                    }}
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
                                                            <FormLabel className="text-sm font-medium text-gray-700">Unit</FormLabel>
                                                            <FormControl>
                                                                <Select
                                                                    disabled={loading}
                                                                    value={field.value || ""}
                                                                    onValueChange={field.onChange}
                                                                >
                                                                    <SelectTrigger className="h-11 border-gray-300 hover:border-purple-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-colors">
                                                                        <SelectValue placeholder="Select unit" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {units.map((unit) => (
                                                                            <SelectItem key={unit.id} value={unit.id}>
                                                                                {unit.name}
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
                                                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">₹</span>
                                                                    <Input
                                                                        {...field}
                                                                        type="number"
                                                                        step="any"
                                                                        min="0"
                                                                        disabled={loading}
                                                                        placeholder="0.00"
                                                                        className="h-11 pl-8 border-gray-300 hover:border-purple-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-colors"
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
                                                            <FormLabel className="text-sm font-medium text-gray-700">Tax Rate</FormLabel>
                                                            <FormControl>
                                                                <Select
                                                                    disabled={loading}
                                                                    value={field.value || ""}
                                                                    onValueChange={field.onChange}
                                                                >
                                                                    <SelectTrigger className="h-11 border-gray-300 hover:border-purple-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-colors">
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
                                                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">₹</span>
                                                                    <Input
                                                                        {...field}
                                                                        type="number"
                                                                        step="any"
                                                                        min="0"
                                                                        disabled={true} // Auto-calculated
                                                                        className="h-11 pl-8 bg-gray-50 border-gray-300"
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
                                                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">₹</span>
                                                                    <Input
                                                                        {...field}
                                                                        type="number"
                                                                        step="any"
                                                                        min="0"
                                                                        disabled={true} // Auto-calculated
                                                                        className="h-11 pl-8 bg-gray-50 border-gray-300 font-medium"
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
                                        className="w-full mt-4 h-11 border-2 border-dashed border-purple-300 text-purple-600 hover:border-purple-400 hover:bg-purple-50 transition-colors"
                                    >
                                        + Add Item
                                    </Button>
                                </div>

                                {/* Totals Display */}
                                <div className="mt-8 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                                    <div className="space-y-2 text-right">
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium text-gray-600">Subtotal:</span>
                                            <span className="text-lg font-semibold">₹{(form.getValues("amount") || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium text-gray-600">GST:</span>
                                            <span className="text-lg font-semibold">₹{(form.getValues("gstAmount") || 0).toFixed(2)}</span>
                                        </div>
                                        <Separator className="my-2" />
                                        <div className="flex justify-between items-center">
                                            <span className="text-xl font-bold text-purple-800">Total:</span>
                                            <span className="text-2xl font-bold text-purple-800">₹{((form.getValues("amount") || 0) + (form.getValues("gstAmount") || 0)).toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-gray-50 border-t p-6 flex justify-between">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => onClose ? onClose() : router.push("/purchase-returns")}
                                    disabled={loading}
                                    className="h-11 px-6 border-gray-300 hover:border-gray-400 transition-colors"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="h-11 px-8 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-medium transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
                                >
                                    {loading ? "Processing..." : action}
                                </Button>
                            </CardFooter>
                        </Card>
                    </form>
                </Form>
            )}
        </>
    );
};
