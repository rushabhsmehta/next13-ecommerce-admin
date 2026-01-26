"use client";

import { useFieldArray, Control, UseFormReturn, useWatch } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { CheckIcon, ChevronDown, Trash, Plus, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "@radix-ui/react-icons";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface SaleDetailRowProps {
    index: number;
    form: UseFormReturn<any>;
    customers: any[];
    taxSlabs: any[];
    organization: any;
    remove: (index: number) => void;
}

export const SaleDetailRow = ({
    index,
    form,
    customers,
    taxSlabs,
    organization,
    remove
}: SaleDetailRowProps) => {
    const { control, setValue, getValues } = form;

    // Nested field array for items
    const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({
        control,
        name: `saleDetails.${index}.items`
    });

    // Watch values for calculation
    const items = useWatch({
        control,
        name: `saleDetails.${index}.items`
    });

    const salePrice = useWatch({
        control,
        name: `saleDetails.${index}.salePrice`
    });

    const placeOfSupply = useWatch({
        control,
        name: `saleDetails.${index}.stateOfSupply`
    });

    const orgState = organization?.state || "";

    // Determine tax type
    const isInterState = placeOfSupply && orgState &&
        placeOfSupply.toLowerCase() !== orgState.toLowerCase();

    // Calculate totals when items change
    useEffect(() => {
        if (items && items.length > 0) {
            const totalAmount = items.reduce((sum: number, item: any) => sum + (Number(item.totalAmount) || 0), 0);
            const totalTax = items.reduce((sum: number, item: any) => sum + (Number(item.taxAmount) || 0), 0);

            // Update parent values
            // We set shouldValidate: true to ensure validation passes
            setValue(`saleDetails.${index}.salePrice`, totalAmount, { shouldValidate: true });
            setValue(`saleDetails.${index}.gstAmount`, totalTax, { shouldValidate: true });
            setValue(`saleDetails.${index}.gstPercentage`, 0); // Reset percentage as it's mixed
        }
    }, [items, setValue, index]);

    const calculateItemTax = (itemIndex: number, price: number, taxSlabId: string) => {
        const taxSlab = taxSlabs.find(slab => slab.id === taxSlabId);
        const taxRate = taxSlab ? taxSlab.percentage : 0;
        const taxAmount = (price * taxRate) / 100;
        const totalAmount = price + taxAmount;

        setValue(`saleDetails.${index}.items.${itemIndex}.taxAmount`, parseFloat(taxAmount.toFixed(2)));
        setValue(`saleDetails.${index}.items.${itemIndex}.totalAmount`, parseFloat(totalAmount.toFixed(2)));
    };

    return (
        <div className="space-y-4 border p-4 mb-4 rounded-lg bg-gray-50/50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Customer selection */}
                <FormField
                    control={control}
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
                                                ? (() => {
                                                    const customer = customers.find((customer: any) => customer.id === field.value);
                                                    return customer ? customer.name : "Select customer...";
                                                })()
                                                : "Select customer..."}
                                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0">
                                    <Command>
                                        <CommandInput placeholder="Search customer..." />
                                        <CommandEmpty>No customer found.</CommandEmpty>
                                        <CommandGroup>
                                            {customers.map((customer: any) => (
                                                <CommandItem
                                                    key={customer.id}
                                                    value={customer.name}
                                                    onSelect={() => {
                                                        setValue(`saleDetails.${index}.customerId`, customer.id);
                                                    }}
                                                >
                                                    <CheckIcon
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            customer.id === field.value ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    <div className="flex flex-col">
                                                        <span>{customer.name}</span>
                                                    </div>
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
                    control={control}
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
                                                "w-full pl-3 text-left font-normal",
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
                                        onSelect={(day) => day && field.onChange(day)}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Place of Supply */}
                <FormField
                    control={control}
                    name={`saleDetails.${index}.stateOfSupply`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Place of Supply (State)</FormLabel>
                            <FormControl>
                                <Input placeholder="State (e.g. Maharashtra)" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Sale Price - Disabled if has items */}
                <FormField
                    control={control}
                    name={`saleDetails.${index}.salePrice`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>
                                Total Sale Price
                                {itemFields.length > 0 && <span className="text-xs text-muted-foreground ml-2">(Auto-calculated)</span>}
                            </FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    placeholder="Price"
                                    {...field}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                    value={field.value}
                                    disabled={itemFields.length > 0}
                                    className={itemFields.length > 0 ? "bg-gray-100 font-bold" : ""}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* GST Amount - Disabled if has items */}
                <FormField
                    control={control}
                    name={`saleDetails.${index}.gstAmount`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Total GST Amount</FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    placeholder="GST Amount"
                                    {...field}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                    value={field.value || 0}
                                    disabled={itemFields.length > 0}
                                    className={itemFields.length > 0 ? "bg-gray-100 font-bold" : ""}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* GST Percentage - Only for legacy simple mode */}
                {itemFields.length === 0 && (
                    <FormField
                        control={control}
                        name={`saleDetails.${index}.gstPercentage`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>GST Percentage (%)</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        placeholder="GST %"
                                        {...field}
                                        onChange={(e) => {
                                            const percentage = Number(e.target.value);
                                            field.onChange(percentage);

                                            // Legacy auto-calc logic
                                            const price = getValues(`saleDetails.${index}.salePrice`) || 0;
                                            if (price > 0 && percentage > 0) {
                                                const gstAmount = parseFloat(((price * percentage) / 100).toFixed(2));
                                                setValue(`saleDetails.${index}.gstAmount`, gstAmount);
                                            }
                                        }}
                                        value={field.value || 0}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
            </div>

            <FormField
                control={control}
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

            {/* ITEMS SECTION */}
            <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm text-gray-700 uppercase tracking-wider">Line Items (Pure Agent / Itemized)</h4>
                        {isInterState ?
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">IGST (Inter-State)</Badge> :
                            <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">CGST + SGST (Intra-State)</Badge>
                        }
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => appendItem({
                            productName: '',
                            quantity: 1,
                            pricePerUnit: 0,
                            taxSlabId: '',
                            taxAmount: 0,
                            totalAmount: 0
                        })}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Item
                    </Button>
                </div>

                {itemFields.length > 0 && (
                    <div className="rounded-md border bg-white">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[300px]">Item / Service</TableHead>
                                    <TableHead className="w-[100px]">Qty</TableHead>
                                    <TableHead className="w-[150px]">Unit Price</TableHead>
                                    <TableHead className="w-[150px]">Tax Rate</TableHead>
                                    <TableHead className="w-[150px] text-right">Tax Amt</TableHead>
                                    <TableHead className="w-[150px] text-right">Total</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {itemFields.map((item, itemIndex) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <FormField
                                                control={control}
                                                name={`saleDetails.${index}.items.${itemIndex}.productName`}
                                                render={({ field }) => (
                                                    <FormItem className="mb-0">
                                                        <FormControl>
                                                            <Input {...field} placeholder="Item Name" className="h-8" />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <FormField
                                                control={control}
                                                name={`saleDetails.${index}.items.${itemIndex}.quantity`}
                                                render={({ field }) => (
                                                    <FormItem className="mb-0">
                                                        <FormControl>
                                                            <Input
                                                                {...field}
                                                                type="number"
                                                                className="h-8"
                                                                onChange={(e) => {
                                                                    const val = Number(e.target.value);
                                                                    field.onChange(val);
                                                                    // Recalculate
                                                                    const price = getValues(`saleDetails.${index}.items.${itemIndex}.pricePerUnit`) || 0;
                                                                    const slab = getValues(`saleDetails.${index}.items.${itemIndex}.taxSlabId`);
                                                                    calculateItemTax(itemIndex, price * val, slab);
                                                                }}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <FormField
                                                control={control}
                                                name={`saleDetails.${index}.items.${itemIndex}.pricePerUnit`}
                                                render={({ field }) => (
                                                    <FormItem className="mb-0">
                                                        <FormControl>
                                                            <Input
                                                                {...field}
                                                                type="number"
                                                                className="h-8"
                                                                onChange={(e) => {
                                                                    const val = Number(e.target.value);
                                                                    field.onChange(val);
                                                                    // Recalculate
                                                                    const qty = getValues(`saleDetails.${index}.items.${itemIndex}.quantity`) || 0;
                                                                    const slab = getValues(`saleDetails.${index}.items.${itemIndex}.taxSlabId`);
                                                                    calculateItemTax(itemIndex, val * qty, slab);
                                                                }}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <FormField
                                                control={control}
                                                name={`saleDetails.${index}.items.${itemIndex}.taxSlabId`}
                                                render={({ field }) => (
                                                    <FormItem className="mb-0">
                                                        <Select onValueChange={(val) => {
                                                            field.onChange(val);
                                                            // Recalculate
                                                            const qty = getValues(`saleDetails.${index}.items.${itemIndex}.quantity`) || 0;
                                                            const price = getValues(`saleDetails.${index}.items.${itemIndex}.pricePerUnit`) || 0;
                                                            calculateItemTax(itemIndex, price * qty, val);
                                                        }} value={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger className="h-8">
                                                                    <SelectValue placeholder="Tax" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {taxSlabs.map((slab) => (
                                                                    <SelectItem key={slab.id} value={slab.id}>
                                                                        {slab.name} ({slab.percentage}%)
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="text-sm font-medium">
                                                ₹{useWatch({ control, name: `saleDetails.${index}.items.${itemIndex}.taxAmount` }) || 0}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                {(() => {
                                                    const slabId = useWatch({ control, name: `saleDetails.${index}.items.${itemIndex}.taxSlabId` });
                                                    const slab = taxSlabs.find(s => s.id === slabId);
                                                    if (!slab) return '-';
                                                    if (slab.percentage === 0) return 'Exempt';
                                                    if (isInterState) return `IGST ${slab.percentage}%`;
                                                    return `CGST ${slab.percentage / 2}% + SGST ${slab.percentage / 2}%`;
                                                })()}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            ₹{useWatch({ control, name: `saleDetails.${index}.items.${itemIndex}.totalAmount` }) || 0}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeItem(itemIndex)}
                                            >
                                                <Trash className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            <div className="flex justify-end pt-2">
                <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => remove(index)}
                >
                    <Trash className="h-4 w-4 mr-2" />
                    Remove Sale
                </Button>
            </div>
        </div>
    );
};
