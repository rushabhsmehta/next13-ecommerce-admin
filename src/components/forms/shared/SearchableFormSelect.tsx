"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const colorMap: Record<string, string> = {
    blue: "hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200",
    green: "hover:border-green-400 focus:border-green-500 focus:ring-2 focus:ring-green-200",
    orange: "hover:border-orange-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200",
    emerald: "hover:border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200",
  };
  const colorClasses = colorMap[colorClass] || colorMap.blue;

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (dropdownOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [dropdownOpen]);

  const defaultFilter = useCallback(
    (item: TItem, q: string): boolean => {
      const lower = q.toLowerCase();
      if (labelKey(item).toLowerCase().includes(lower)) return true;
      if (secondaryKey) {
        const sec = secondaryKey(item);
        if (sec && sec.toLowerCase().includes(lower)) return true;
      }
      return false;
    },
    [labelKey, secondaryKey]
  );

  const filteredItems = useMemo(() => {
    if (!search) return items;
    const fn = filterFn || defaultFilter;
    return items.filter((item) => fn(item, search));
  }, [items, search, filterFn, defaultFilter]);

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

        const moveSelection = (direction: "up" | "down") => {
          if (!filteredItems.length) return;
          const currentIndex = filteredItems.findIndex(
            (item) => valueKey(item) === field.value
          );
          let nextIndex = 0;
          if (currentIndex === -1) {
            nextIndex = direction === "down" ? 0 : filteredItems.length - 1;
          } else if (direction === "down") {
            nextIndex = (currentIndex + 1) % filteredItems.length;
          } else {
            nextIndex = (currentIndex - 1 + filteredItems.length) % filteredItems.length;
          }
          field.onChange(valueKey(filteredItems[nextIndex]));
        };

        const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
          if (disabled) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            if (!dropdownOpen) {
              setDropdownOpen(true);
            } else {
              moveSelection("down");
            }
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            if (dropdownOpen) moveSelection("up");
          } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setDropdownOpen((prev) => !prev);
          } else if (event.key === "Escape" && dropdownOpen) {
            event.preventDefault();
            setDropdownOpen(false);
          }
        };

        const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
          if (event.key === "Escape") {
            event.preventDefault();
            setDropdownOpen(false);
          } else if (event.key === "ArrowDown") {
            event.preventDefault();
            moveSelection("down");
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            moveSelection("up");
          } else if (event.key === "Enter" && filteredItems.length > 0) {
            event.preventDefault();
            const currentIndex = filteredItems.findIndex(
              (item) => valueKey(item) === field.value
            );
            const target = currentIndex >= 0 ? filteredItems[currentIndex] : filteredItems[0];
            field.onChange(valueKey(target));
            setSearch("");
            setDropdownOpen(false);
          }
        };

        return (
          <FormItem>
            <FormLabel className="text-sm font-medium text-gray-700">
              {label}
              {required && <span className="text-red-500"> *</span>}
            </FormLabel>
            <div className="relative" ref={containerRef}>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-haspopup="listbox"
                aria-expanded={dropdownOpen}
                aria-controls={dropdownOpen ? `${name}-listbox` : undefined}
                className={cn(
                  "w-full h-11 justify-between border-gray-300",
                  colorClasses,
                  !field.value && "text-muted-foreground"
                )}
                onClick={() => setDropdownOpen((prev) => !prev)}
                onKeyDown={handleTriggerKeyDown}
                disabled={disabled}
              >
                <span className="truncate">{displayLabel}</span>
                <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
              </Button>

              {dropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white rounded-md border shadow-md">
                  <div className="p-2">
                    <Input
                      ref={searchInputRef}
                      placeholder={searchPlaceholder}
                      className="mb-2 h-10 border-gray-300"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      aria-label={`Search ${label}`}
                    />
                    <div
                      id={`${name}-listbox`}
                      role="listbox"
                      aria-label={label}
                      className="max-h-[200px] overflow-y-auto"
                    >
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
                              id={`${name}-option-${itemValue}`}
                              role="option"
                              aria-selected={isSelected}
                              tabIndex={-1}
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
