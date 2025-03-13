"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { PurchasesTable } from "./purchases-table";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

type Purchase = {
  id: string;
  date: string;
  amount: number;
  description: string;
  packageName: string;
  supplierName: string;
  supplierContact: string;
};

interface PurchaseLedgerClientProps {
  purchases: Purchase[];
  suppliers: { id: string; name: string }[];
  totalPurchases: number;
}

export const PurchaseLedgerClient: React.FC<PurchaseLedgerClientProps> = ({
  purchases,
  suppliers,
  totalPurchases,
}) => {
  const router = useRouter();
  const [filteredSupplier, setFilteredSupplier] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  const filteredPurchases = purchases.filter((purchase) => {
    if (filteredSupplier && purchase.supplierName !== filteredSupplier) {
      return false;
    }

    if (dateFrom) {
      const purchaseDate = new Date(purchase.date);
      if (purchaseDate < dateFrom) return false;
    }

    if (dateTo) {
      const purchaseDate = new Date(purchase.date);
      // Add one day to include the end date
      const endDate = new Date(dateTo);
      endDate.setDate(endDate.getDate() + 1);
      if (purchaseDate > endDate) return false;
    }

    return true;
  });

  const filteredTotal = filteredPurchases.reduce((sum, purchase) => sum + purchase.amount, 0);

  const resetFilters = () => {
    setFilteredSupplier("");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(totalPurchases)}</div>
            </CardContent>
          </Card>
          {filteredSupplier || dateFrom || dateTo ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Filtered Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPrice(filteredTotal)}</div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <div className="bg-white p-4 rounded-md shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
          <div className="w-full md:w-1/3">
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between"
                >
                  {filteredSupplier
                    ? suppliers.find((supplier) => supplier.name === filteredSupplier)?.name
                    : "Filter by supplier"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search supplier..." />
                  <CommandEmpty>No supplier found.</CommandEmpty>
                  <CommandList>
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          setFilteredSupplier("");
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            filteredSupplier === "" ? "opacity-100" : "opacity-0"
                          )}
                        />
                        All Suppliers
                      </CommandItem>
                      {suppliers.map((supplier) => (
                        <CommandItem
                          key={supplier.id}
                          onSelect={() => {
                            setFilteredSupplier(supplier.name);
                            setOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              filteredSupplier === supplier.name
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {supplier.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="w-full md:w-1/3 flex flex-col md:flex-row gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className="w-full md:w-auto justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "PPP") : "From Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className="w-full md:w-auto justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "PPP") : "To Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button
            variant="secondary"
            className="w-full md:w-auto"
            onClick={resetFilters}
          >
            Reset Filters
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <PurchasesTable data={filteredPurchases} />
        </CardContent>
      </Card>
    </div>
  );
};
