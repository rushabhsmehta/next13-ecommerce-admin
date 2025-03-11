"use client";

import { Plus, ChevronsUpDown, Check } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
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

import { columns, SupplierColumn } from "./columns";

interface SupplierClientProps {
  data: SupplierColumn[];
}

export const SupplierClient: React.FC<SupplierClientProps> = ({ data }) => {
  const params = useParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  
  // Filter data based on selected supplier
  const filteredData = selectedSupplierId ? 
    data.filter((supplier) => supplier.id === selectedSupplierId) : data;

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading title={`Suppliers (${data.length})`} description="Manage Suppliers for your Website" />
        <Button onClick={() => router.push(`/suppliers/new`)}>
          <Plus className="mr-2 h-4 w-4" /> Add New
        </Button>
      </div>
      <Separator />
      
      <div className="py-4">
        <div className="flex flex-col md:flex-row gap-4 md:items-center">
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
                    ? data.find((supplier) => supplier.id === selectedSupplierId)?.name
                    : "Search supplier..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search supplier..." />
                  <CommandEmpty>No supplier found.</CommandEmpty>
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
                    {data.map((supplier) => (
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
        </div>
      </div>
      
      <DataTable searchKey="name" columns={columns} data={filteredData} />
    </>
  );
};
