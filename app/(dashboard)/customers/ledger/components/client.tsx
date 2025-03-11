"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomersTable } from "./customers-table";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type CustomerSummary = {
  id: string;
  name: string;
  contact: string;
  totalSales: number;
  totalReceipts: number;
  balance: number;
};

interface CustomersLedgerClientProps {
  customers: CustomerSummary[];
  totalSales: number;
  totalReceipts: number;
  totalBalance: number;
}

export const CustomersLedgerClient: React.FC<CustomersLedgerClientProps> = ({
  customers,
  totalSales,
  totalReceipts,
  totalBalance,
}) => {
  const router = useRouter();
  const [balanceFilter, setBalanceFilter] = useState<string>("all");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [open, setOpen] = useState(false);

  const filteredCustomers = customers.filter((customer) => {
    // First apply balance filter
    const balanceCondition = 
      balanceFilter === "due" ? customer.balance > 0 :
      balanceFilter === "overpaid" ? customer.balance < 0 :
      balanceFilter === "settled" ? customer.balance === 0 :
      true; // "all" filter
    
    // Then apply customer filter if one is selected
    const customerCondition = selectedCustomerId ? customer.id === selectedCustomerId : true;
    
    return balanceCondition && customerCondition;
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(totalSales)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Receipts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(totalReceipts)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Balance Due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalBalance > 0 ? "text-red-600" : totalBalance < 0 ? "text-green-600" : ""}`}>
              {formatPrice(totalBalance)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Customers Count</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white p-4 rounded-md shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-4">
          <div className="w-full md:w-1/4">
            <Select
              value={balanceFilter}
              onValueChange={setBalanceFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by balance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                <SelectItem value="due">With Balance Due</SelectItem>
                <SelectItem value="overpaid">Overpaid</SelectItem>
                <SelectItem value="settled">Fully Settled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-full md:w-1/4">
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between"
                >
                  {selectedCustomerId
                    ? customers.find((customer) => customer.id === selectedCustomerId)?.name
                    : "Search customer..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search customer..." />
                  <CommandEmpty>No customer found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        setSelectedCustomerId("");
                        setOpen(false);
                      }}
                      className="text-sm"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          !selectedCustomerId ? "opacity-100" : "opacity-0"
                        )}
                      />
                      All Customers
                    </CommandItem>
                    {customers.map((customer) => (
                      <CommandItem
                        key={customer.id}
                        onSelect={() => {
                          setSelectedCustomerId(
                            selectedCustomerId === customer.id ? "" : customer.id
                          );
                          setOpen(false);
                        }}
                        className="text-sm"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedCustomerId === customer.id
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {customer.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          
          <Button 
            onClick={() => router.push('/customers/new')} 
            className="ml-auto"
          >
            Add New Customer
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer Statements</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomersTable data={filteredCustomers} />
        </CardContent>
      </Card>
    </div>
  );
};
