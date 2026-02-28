"use client";

import { useState, useMemo } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Control, FieldValues, Path } from "react-hook-form";

interface SearchableFormSelectProps<T extends FieldValues, TItem> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  required?: boolean;
  /** The list of items to select from */
  items: TItem[];
  /** Function to get the unique id/value from an item */
  valueKey: (item: TItem) => string;
  /** Function to get the primary display label from an item */
  labelKey: (item: TItem) => string;
  /** Optional function to get a secondary line of text (e.g. contact, email) */
  secondaryKey?: (item: TItem) => string | undefined | null;
  /** Filter function for search. Defaults to matching on labelKey + secondaryKey. */
  filterFn?: (item: TItem, search: string) => boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  /** Color theme class for focus ring/border */
  colorClass?: string;
}

export function SearchableFormSelect<T extends FieldValues, TItem>({
  control,
  name,
  label,
  required = false,
  items,
  valueKey,
  labelKey,
  secondaryKey,
  filterFn,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found",
  disabled = false,
  colorClass = "blue",
}: SearchableFormSelectProps<T, TItem>) {
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const colorMap: Record<string, string> = {
    blue: "hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200",
    green: "hover:border-green-400 focus:border-green-500 focus:ring-2 focus:ring-green-200",
    orange: "hover:border-orange-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200",
    emerald: "hover:border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200",
  };
  const colorClasses = colorMap[colorClass] || colorMap.blue;

  const defaultFilter = (item: TItem, q: string): boolean => {
    const lower = q.toLowerCase();
    if (labelKey(item).toLowerCase().includes(lower)) return true;
    if (secondaryKey) {
      const sec = secondaryKey(item);
      if (sec && sec.toLowerCase().includes(lower)) return true;
    }
    return false;
  };

  const filteredItems = useMemo(() => {
    if (!search) return items;
    const fn = filterFn || defaultFilter;
    return items.filter((item) => fn(item, search));
  }, [items, search, filterFn]);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const selectedItem = items.find((item) => valueKey(item) === field.value);

        const displayLabel = selectedItem
          ? secondaryKey && secondaryKey(selectedItem)
            ? `${labelKey(selectedItem)} - ${secondaryKey(selectedItem)}`
            : labelKey(selectedItem)
          : placeholder;

        return (
          <FormItem>
            <FormLabel className="text-sm font-medium text-gray-700">
              {label}
              {required && <span className="text-red-500"> *</span>}
            </FormLabel>
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                role="combobox"
                className={cn(
                  "w-full h-11 justify-between border-gray-300",
                  colorClasses,
                  !field.value && "text-muted-foreground"
                )}
                onClick={() => setDropdownOpen(!dropdownOpen)}
                disabled={disabled}
              >
                <span className="truncate">{displayLabel}</span>
                <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
              </Button>

              {dropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white rounded-md border shadow-md">
                  <div className="p-2">
                    <Input
                      placeholder={searchPlaceholder}
                      className="mb-2 h-10 border-gray-300"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      autoFocus
                    />
                    <div className="max-h-[200px] overflow-y-auto">
                      {filteredItems.length === 0 ? (
                        <div className="text-center py-2 text-sm text-gray-500">
                          {emptyMessage}
                        </div>
                      ) : (
                        filteredItems.map((item) => {
                          const itemValue = valueKey(item);
                          const isSelected = itemValue === field.value;
                          return (
                            <div
                              key={itemValue}
                              className={cn(
                                "flex items-center justify-between px-2 py-1.5 cursor-pointer rounded hover:bg-gray-100",
                                isSelected && "bg-gray-100"
                              )}
                              onClick={() => {
                                field.onChange(itemValue);
                                setSearch("");
                                setDropdownOpen(false);
                              }}
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">{labelKey(item)}</span>
                                {secondaryKey && secondaryKey(item) && (
                                  <span className="text-xs text-gray-500">
                                    {secondaryKey(item)}
                                  </span>
                                )}
                              </div>
                              {isSelected && (
                                <Check className="h-4 w-4 text-primary" />
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
