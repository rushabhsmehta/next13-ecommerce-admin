import { format } from "date-fns";
import { CalendarIcon } from "@radix-ui/react-icons";
import { CheckIcon, ChevronDown } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { createDatePickerValue, formatLocalDate } from "@/lib/timezone-utils";
import type { AccountingAccountOption, AccountingSelectOption } from "./accounting-form-options";

type DetailField = {
  id: string;
};

type SharedProps = {
  form: any;
  allAccounts: AccountingAccountOption[];
};

type PurchaseDetailsTabProps = {
  form: any;
  fields: DetailField[];
  suppliers: AccountingSelectOption[];
  appendPurchase: (value: any) => void;
  removePurchase: (index: number) => void;
  calculateGSTAmount: (price: number, percentage: number) => number;
};

type SaleDetailsTabProps = {
  form: any;
  fields: DetailField[];
  customers: AccountingSelectOption[];
  appendSale: (value: any) => void;
  removeSale: (index: number) => void;
  calculateGSTAmount: (price: number, percentage: number) => number;
};

type PaymentDetailsTabProps = SharedProps & {
  fields: DetailField[];
  suppliers: AccountingSelectOption[];
  appendPayment: (value: any) => void;
  removePayment: (index: number) => void;
};

type ReceiptDetailsTabProps = SharedProps & {
  fields: DetailField[];
  customers: AccountingSelectOption[];
  appendReceipt: (value: any) => void;
  removeReceipt: (index: number) => void;
};

type ExpenseDetailsTabProps = SharedProps & {
  fields: DetailField[];
  expenseCategories: AccountingSelectOption[];
  appendExpense: (value: any) => void;
  removeExpense: (index: number) => void;
};

type IncomeDetailsTabProps = SharedProps & {
  fields: DetailField[];
  incomeCategories: AccountingSelectOption[];
  appendIncome: (value: any) => void;
  removeIncome: (index: number) => void;
};

export function PurchaseDetailsTab({
  form,
  fields,
  suppliers,
  appendPurchase,
  removePurchase,
  calculateGSTAmount,
}: PurchaseDetailsTabProps) {
  return (
    <TabsContent value="purchaseDetails">
      {fields.map((field, index) => (
        <div key={field.id} className="space-y-2 border p-2 mb-2 rounded">
          <FormField
            control={form.control}
            name={`purchaseDetails.${index}.supplierId`}
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Supplier</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                        {field.value ? suppliers.find((supplier) => supplier.id === field.value)?.name : "Select supplier..."}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput placeholder="Search supplier..." />
                      <CommandList>
                        <CommandEmpty>No supplier found.</CommandEmpty>
                        <CommandGroup>
                          {suppliers.map((supplier) => (
                            <CommandItem key={supplier.id} value={supplier.name} onSelect={() => form.setValue(`purchaseDetails.${index}.supplierId`, supplier.id)}>
                              <CheckIcon className={cn("mr-2 h-4 w-4", supplier.id === field.value ? "opacity-100" : "opacity-0")} />
                              {supplier.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
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
                      <Button variant={"outline"} className={cn("w-[240px] pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                        {field.value ? formatLocalDate(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={createDatePickerValue(field.value)} onSelect={(day) => day && field.onChange(day)} initialFocus />
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
                  <Input type="number" placeholder="Price" {...field} onChange={(e) => {
                    const value = Number(e.target.value);
                    field.onChange(value);
                    const percentage = form.getValues(`purchaseDetails.${index}.gstPercentage`) || 0;
                    if (percentage > 0) {
                      form.setValue(`purchaseDetails.${index}.gstAmount`, calculateGSTAmount(value, percentage));
                    }
                  }} value={field.value} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`purchaseDetails.${index}.gstPercentage`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>GST Percentage (%)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="GST %" {...field} onChange={(e) => {
                    const percentage = Number(e.target.value);
                    field.onChange(percentage);
                    const price = form.getValues(`purchaseDetails.${index}.price`) || 0;
                    if (price > 0 && percentage > 0) {
                      form.setValue(`purchaseDetails.${index}.gstAmount`, calculateGSTAmount(price, percentage));
                    }
                  }} value={field.value || 0} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField control={form.control} name={`purchaseDetails.${index}.gstAmount`} render={({ field }) => (
            <FormItem>
              <FormLabel>GST Amount</FormLabel>
              <FormControl>
                <Input type="number" placeholder="GST Amount" {...field} onChange={(e) => field.onChange(Number(e.target.value))} value={field.value || 0} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name={`purchaseDetails.${index}.description`} render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl><Input placeholder="Description" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <Button type="button" variant="destructive" onClick={() => removePurchase(index)}>Remove</Button>
        </div>
      ))}
      <Button type="button" onClick={() => appendPurchase({ supplierId: "", purchaseDate: new Date(), price: 0, gstAmount: 0, gstPercentage: 0, description: "" })}>Add Purchase Detail</Button>
    </TabsContent>
  );
}

export function SaleDetailsTab({
  form,
  fields,
  customers,
  appendSale,
  removeSale,
  calculateGSTAmount,
}: SaleDetailsTabProps) {
  return (
    <TabsContent value="saleDetails">
      {fields.map((field, index) => (
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
                      <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                        {field.value ? (() => {
                          const customer = customers.find((customer) => customer.id === field.value);
                          return customer ? (customer.contact ? `${customer.name} - ${customer.contact}` : customer.name) : "Select customer...";
                        })() : "Select customer..."}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput placeholder="Search customer..." />
                      <CommandList>
                        <CommandEmpty>No customer found.</CommandEmpty>
                        <CommandGroup>
                          {customers.map((customer) => (
                            <CommandItem key={customer.id} value={customer.name} onSelect={() => form.setValue(`saleDetails.${index}.customerId`, customer.id)}>
                              <CheckIcon className={cn("mr-2 h-4 w-4", customer.id === field.value ? "opacity-100" : "opacity-0")} />
                              <div className="flex flex-col"><span className="font-medium">{customer.name}</span>{customer.contact && <span className="text-xs text-gray-500">{customer.contact}</span>}</div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField control={form.control} name={`saleDetails.${index}.saleDate`} render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date of Sale</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant={"outline"} className={cn("w-[240px] pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={field.value} onSelect={(day) => day && field.onChange(day)} initialFocus />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name={`saleDetails.${index}.salePrice`} render={({ field }) => (
            <FormItem>
              <FormLabel>Sale Price</FormLabel>
              <FormControl>
                <Input type="number" placeholder="Price" {...field} onChange={(e) => {
                  const value = Number(e.target.value);
                  field.onChange(value);
                  const percentage = form.getValues(`saleDetails.${index}.gstPercentage`) || 0;
                  if (percentage > 0) {
                    form.setValue(`saleDetails.${index}.gstAmount`, calculateGSTAmount(value, percentage));
                  }
                }} value={field.value} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name={`saleDetails.${index}.gstPercentage`} render={({ field }) => (
            <FormItem>
              <FormLabel>GST Percentage (%)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="GST %" {...field} onChange={(e) => {
                  const percentage = Number(e.target.value);
                  field.onChange(percentage);
                  const price = form.getValues(`saleDetails.${index}.salePrice`) || 0;
                  if (price > 0 && percentage > 0) {
                    form.setValue(`saleDetails.${index}.gstAmount`, calculateGSTAmount(price, percentage));
                  }
                }} value={field.value || 0} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name={`saleDetails.${index}.gstAmount`} render={({ field }) => (
            <FormItem>
              <FormLabel>GST Amount</FormLabel>
              <FormControl>
                <Input type="number" placeholder="GST Amount" {...field} onChange={(e) => field.onChange(Number(e.target.value))} value={field.value || 0} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name={`saleDetails.${index}.description`} render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl><Input placeholder="Description" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <Button type="button" variant="destructive" onClick={() => removeSale(index)}>Remove</Button>
        </div>
      ))}
      <Button type="button" onClick={() => appendSale({ customerId: "", saleDate: new Date(), salePrice: 0, gstAmount: 0, gstPercentage: 0, description: "" })}>Add Sale Detail</Button>
    </TabsContent>
  );
}

export function PaymentDetailsTab({ form, fields, suppliers, allAccounts, appendPayment, removePayment }: PaymentDetailsTabProps) {
  return (
    <TabsContent value="paymentDetails">
      {fields.map((field, index) => (
        <div key={field.id} className="space-y-2 border p-2 mb-2 rounded">
          <FormField control={form.control} name={`paymentDetails.${index}.supplierId`} render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Supplier</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                      {field.value ? suppliers.find((supplier) => supplier.id === field.value)?.name : "Select supplier..."}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command><CommandInput placeholder="Search supplier..." /><CommandList><CommandEmpty>No supplier found.</CommandEmpty><CommandGroup>{suppliers.map((supplier) => (
                    <CommandItem key={supplier.id} value={supplier.name} onSelect={() => form.setValue(`paymentDetails.${index}.supplierId`, supplier.id)}>
                      <CheckIcon className={cn("mr-2 h-4 w-4", supplier.id === field.value ? "opacity-100" : "opacity-0")} />
                      {supplier.name}
                    </CommandItem>
                  ))}</CommandGroup></CommandList></Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name={`paymentDetails.${index}.paymentDate`} render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date of Payment</FormLabel>
              <Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-[240px] pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={(day) => day && field.onChange(day)} initialFocus /></PopoverContent></Popover>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name={`paymentDetails.${index}.amount`} render={({ field }) => (
            <FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" placeholder="Amount" {...field} onChange={(e) => field.onChange(Number(e.target.value))} value={field.value} /></FormControl><FormMessage /></FormItem>
          )} />

          <FormField control={form.control} name={`paymentDetails.${index}.accountId`} render={({ field }) => (
            <FormItem>
              <FormLabel>Account</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={allAccounts.length === 0}>
                <FormControl><SelectTrigger><SelectValue placeholder={allAccounts.length === 0 ? "No accounts available" : "Select an account"} /></SelectTrigger></FormControl>
                <SelectContent><SelectItem value="">Select an account</SelectItem>{allAccounts.map((account) => <SelectItem key={account.id} value={account.id}>{account.displayName}</SelectItem>)}</SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name={`paymentDetails.${index}.transactionId`} render={({ field }) => (
            <FormItem><FormLabel>Transaction ID</FormLabel><FormControl><Input placeholder="Transaction ID" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name={`paymentDetails.${index}.note`} render={({ field }) => (
            <FormItem><FormLabel>Note</FormLabel><FormControl><Input placeholder="Note" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <Button type="button" variant="destructive" onClick={() => removePayment(index)}>Remove</Button>
        </div>
      ))}
      <Button type="button" onClick={() => appendPayment({ paymentDate: new Date(), amount: 0, accountId: "", transactionId: "", note: "", supplierId: "" })}>Add Payment Detail</Button>
    </TabsContent>
  );
}

export function ReceiptDetailsTab({ form, fields, customers, allAccounts, appendReceipt, removeReceipt }: ReceiptDetailsTabProps) {
  return (
    <TabsContent value="receiptDetails">
      {fields.map((field, index) => (
        <div key={field.id} className="space-y-2 border p-2 mb-2 rounded">
          <FormField control={form.control} name={`receiptDetails.${index}.customerId`} render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Customer</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                      {field.value ? (() => {
                        const customer = customers.find((customer) => customer.id === field.value);
                        return customer ? (customer.contact ? `${customer.name} - ${customer.contact}` : customer.name) : "Select customer...";
                      })() : "Select customer..."}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command><CommandInput placeholder="Search customer..." /><CommandList><CommandEmpty>No customer found.</CommandEmpty><CommandGroup>{customers.map((customer) => (
                    <CommandItem key={customer.id} value={customer.name} onSelect={() => form.setValue(`receiptDetails.${index}.customerId`, customer.id)}>
                      <CheckIcon className={cn("mr-2 h-4 w-4", customer.id === field.value ? "opacity-100" : "opacity-0")} />
                      <div className="flex flex-col"><span className="font-medium">{customer.name}</span>{customer.contact && <span className="text-xs text-gray-500">{customer.contact}</span>}</div>
                    </CommandItem>
                  ))}</CommandGroup></CommandList></Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name={`receiptDetails.${index}.receiptDate`} render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date of Receipt</FormLabel>
              <Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-[240px] pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={(day) => day && field.onChange(day)} initialFocus /></PopoverContent></Popover>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name={`receiptDetails.${index}.amount`} render={({ field }) => (
            <FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" placeholder="Amount" {...field} onChange={(e) => field.onChange(Number(e.target.value))} value={field.value} /></FormControl><FormMessage /></FormItem>
          )} />

          <FormField control={form.control} name={`receiptDetails.${index}.accountId`} render={({ field }) => (
            <FormItem>
              <FormLabel>Account</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={allAccounts.length === 0}>
                <FormControl><SelectTrigger><SelectValue placeholder={allAccounts.length === 0 ? "No accounts available" : "Select an account"} /></SelectTrigger></FormControl>
                <SelectContent><SelectItem value="">Select an account</SelectItem>{allAccounts.map((account) => <SelectItem key={account.id} value={account.id}>{account.displayName}</SelectItem>)}</SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name={`receiptDetails.${index}.note`} render={({ field }) => (
            <FormItem><FormLabel>Note</FormLabel><FormControl><Input placeholder="Note" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <Button type="button" variant="destructive" onClick={() => removeReceipt(index)}>Remove</Button>
        </div>
      ))}
      <Button type="button" onClick={() => appendReceipt({ receiptDate: new Date(), amount: 0, accountId: "", note: "", customerId: "" })}>Add Receipt Detail</Button>
    </TabsContent>
  );
}

export function ExpenseDetailsTab({ form, fields, expenseCategories, allAccounts, appendExpense, removeExpense }: ExpenseDetailsTabProps) {
  return (
    <TabsContent value="expenseDetails">
      {fields.map((field, index) => (
        <div key={field.id} className="space-y-2 border p-2 mb-2 rounded">
          <FormField control={form.control} name={`expenseDetails.${index}.expenseDate`} render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date of Expense</FormLabel>
              <Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-[240px] pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={(day) => day && field.onChange(day)} initialFocus /></PopoverContent></Popover>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name={`expenseDetails.${index}.amount`} render={({ field }) => (
            <FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" placeholder="Amount" {...field} onChange={(e) => field.onChange(Number(e.target.value))} value={field.value} /></FormControl><FormMessage /></FormItem>
          )} />

          <FormField control={form.control} name={`expenseDetails.${index}.expenseCategory`} render={({ field }) => (
            <FormItem>
              <FormLabel>Expense Category</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                <SelectContent>
                  {expenseCategories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
                  {field.value && !expenseCategories.find((category) => category.id === field.value) && <SelectItem value={field.value}>{field.value}</SelectItem>}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name={`expenseDetails.${index}.accountId`} render={({ field }) => (
            <FormItem>
              <FormLabel>Account</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={allAccounts.length === 0}>
                <FormControl><SelectTrigger><SelectValue placeholder={allAccounts.length === 0 ? "No accounts available" : "Select an account"} /></SelectTrigger></FormControl>
                <SelectContent><SelectItem value="">Select an account</SelectItem>{allAccounts.map((account) => <SelectItem key={account.id} value={account.id}>{account.displayName}</SelectItem>)}</SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name={`expenseDetails.${index}.description`} render={({ field }) => (
            <FormItem><FormLabel>Description</FormLabel><FormControl><Input placeholder="Description" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <Button type="button" variant="destructive" onClick={() => removeExpense(index)}>Remove</Button>
        </div>
      ))}
      <Button type="button" onClick={() => appendExpense({ expenseDate: new Date(), amount: 0, expenseCategory: "", accountId: "", description: "" })}>Add Expense Detail</Button>
    </TabsContent>
  );
}

export function IncomeDetailsTab({ form, fields, incomeCategories, allAccounts, appendIncome, removeIncome }: IncomeDetailsTabProps) {
  return (
    <TabsContent value="incomeDetails">
      {fields.map((field, index) => (
        <div key={field.id} className="space-y-2 border p-2 mb-2 rounded">
          <FormField control={form.control} name={`incomeDetails.${index}.incomeDate`} render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date of Income</FormLabel>
              <Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-[240px] pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={(day) => day && field.onChange(day)} initialFocus /></PopoverContent></Popover>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name={`incomeDetails.${index}.amount`} render={({ field }) => (
            <FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" placeholder="Amount" {...field} onChange={(e) => field.onChange(Number(e.target.value))} value={field.value} /></FormControl><FormMessage /></FormItem>
          )} />

          <FormField control={form.control} name={`incomeDetails.${index}.incomeCategory`} render={({ field }) => (
            <FormItem>
              <FormLabel>Income Category</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                <SelectContent>
                  {incomeCategories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
                  {field.value && !incomeCategories.find((category) => category.id === field.value) && <SelectItem value={field.value}>{field.value}</SelectItem>}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name={`incomeDetails.${index}.accountId`} render={({ field }) => (
            <FormItem>
              <FormLabel>Account</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={allAccounts.length === 0}>
                <FormControl><SelectTrigger><SelectValue placeholder={allAccounts.length === 0 ? "No accounts available" : "Select an account"} /></SelectTrigger></FormControl>
                <SelectContent><SelectItem value="">Select an account</SelectItem>{allAccounts.map((account) => <SelectItem key={account.id} value={account.id}>{account.displayName}</SelectItem>)}</SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name={`incomeDetails.${index}.description`} render={({ field }) => (
            <FormItem><FormLabel>Description</FormLabel><FormControl><Input placeholder="Description" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <Button type="button" variant="destructive" onClick={() => removeIncome(index)}>Remove</Button>
        </div>
      ))}
      <Button type="button" onClick={() => appendIncome({ incomeDate: new Date(), amount: 0, incomeCategory: "", accountId: "", description: "" })}>Add Income Detail</Button>
    </TabsContent>
  );
}
