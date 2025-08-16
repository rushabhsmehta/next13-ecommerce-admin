"use client";

import * as React from "react";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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

export type DestinationOption = {
  value: string;
  label: string;
  location?: string;
};

interface DestinationComboboxProps {
  destinations: DestinationOption[];
  value?: string;
  onSelect: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DestinationCombobox({
  destinations,
  value,
  onSelect,
  placeholder = "Select destination...",
  className,
  disabled = false,
}: DestinationComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const selectedDestination = destinations.find((destination) => destination.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          {selectedDestination ? (
            <div className="flex items-center">
              <MapPin className="mr-2 h-4 w-4" />
              <span className="truncate">{selectedDestination.label}</span>
              {selectedDestination.location && (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({selectedDestination.location})
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Search destinations..." />
          <CommandEmpty>No destination found.</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {destinations.map((destination) => (
                <CommandItem
                  key={destination.value}
                  value={destination.value}
                  onSelect={(currentValue) => {
                    onSelect(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === destination.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <MapPin className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{destination.label}</span>
                    {destination.location && (
                      <span className="text-xs text-muted-foreground">
                        {destination.location}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
