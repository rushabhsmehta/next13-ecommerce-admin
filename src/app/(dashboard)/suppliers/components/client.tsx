"use client";

import { useState } from "react";
import { Plus, Check, ChevronsUpDown } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { columns, SupplierColumn, LocationInfo } from "./columns";
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
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface SupplierClientProps {
  data: SupplierColumn[];
  locations: { id: string; label: string }[];
}

export const SupplierClient: React.FC<SupplierClientProps> = ({ data, locations }) => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [open, setOpen] = useState(false);

  // Filter data based on search term and location filter
  const filteredData = data.filter((supplier) => {
    // First apply search filter
    const matchesSearch = searchTerm === "" || 
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Then apply location filter
    const matchesLocation = locationFilter === "" || 
      supplier.locations.some(loc => loc.id === locationFilter);

    // Return true if matches both filters
    return matchesSearch && matchesLocation;
  });

  // Get the selected location label for display
  const selectedLocationLabel = locationFilter 
    ? locations.find(loc => loc.id === locationFilter)?.label || "Filter by location"
    : "Filter by location";

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading
          title={`Suppliers (${filteredData.length})`}
          description="Manage suppliers"
        />
        <Button onClick={() => router.push(`/suppliers/new`)}>
          <Plus className="mr-2 h-4 w-4" /> Add New
        </Button>
      </div>
      <Separator />
      
      <div className="flex flex-wrap items-center gap-4 py-4">
      {/*   <Input
          placeholder="Search suppliers..."
          className="w-[250px]"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
         */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-[250px] justify-between"
            >
              {selectedLocationLabel}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[250px] p-0">
            <Command>
              <CommandInput placeholder="Search locations..." />
              <CommandList>
                <CommandEmpty>No location found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="all-locations"
                    onSelect={() => {
                      setLocationFilter("");
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        locationFilter === "" ? "opacity-100" : "opacity-0"
                      )}
                    />
                    All locations
                  </CommandItem>
                  {locations.map((location) => (
                    <CommandItem
                      key={location.id}
                      value={location.label}
                      onSelect={() => {
                        setLocationFilter(location.id);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          locationFilter === location.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {location.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      
      <DataTable searchKey="name" columns={columns} data={filteredData} />
    </>
  );
};

