"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatPrice } from "@/lib/utils";
import { SuppliersTable } from "./suppliers-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";

type SupplierSummary = {
  id: string;
  name: string;
  contact: string;
  totalPurchases: number;
  totalPayments: number;
  balance: number;
};

interface SuppliersLedgerClientProps {
  suppliers: SupplierSummary[];
  totalPurchases: number;
  totalPayments: number;
  totalBalance: number;
}

export const SuppliersLedgerClient: React.FC<SuppliersLedgerClientProps> = ({
  suppliers,
  totalPurchases,
  totalPayments,
  totalBalance,
}) => {
  const router = useRouter();
  const [balanceFilter, setBalanceFilter] = useState<string>("all");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [open, setOpen] = useState(false);

  const filteredSuppliers = suppliers.filter((supplier) => {
    if (balanceFilter === "due") return supplier.balance > 0;
    if (balanceFilter === "overpaid") return supplier.balance < 0;
    if (balanceFilter === "settled") return supplier.balance === 0;
    return true; // "all" filter
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(totalPurchases)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(totalPayments)}</div>
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
            <CardTitle className="text-sm font-medium">Suppliers Count</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suppliers.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white p-4 rounded-md shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-full md:w-1/4">
            <Select
              value={balanceFilter}
              onValueChange={setBalanceFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by balance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
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
                  {selectedSupplierId
                    ? suppliers.find((supplier) => supplier.id === selectedSupplierId)?.name
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
                        setSelectedSupplierId("");
                        setOpen(false);
                      }}
                      className="text-sm"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          !selectedSupplierId ? "opacity-100" : "opacity-0"
                        )}
                      />
                      All Suppliers
                    </CommandItem>
                    {suppliers.map((supplier) => (
                      <CommandItem
                        key={supplier.id}
                        onSelect={() => {
                          setSelectedSupplierId(
                            selectedSupplierId === supplier.id ? "" : supplier.id
                          );
                          setOpen(false);
                        }}
                        className="text-sm"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedSupplierId === supplier.id
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {supplier.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <Button
            onClick={() => router.push('/suppliers/new')}
            className="ml-auto"
          >
            Add New Supplier
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Supplier Statements</CardTitle>
        </CardHeader>
        <CardContent>
          <SuppliersTable data={filteredSuppliers} />
        </CardContent>
      </Card>
    </div>
  );
};
