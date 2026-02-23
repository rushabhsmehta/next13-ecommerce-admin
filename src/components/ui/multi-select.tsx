"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

type Option = {
  label: string;
  value: string;
};

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select options...",
  disabled = false,
}: MultiSelectProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleSelect = React.useCallback(
    (option: Option) => {
      setInputValue("");
      if (selected.includes(option.value)) {
        onChange(selected.filter((item) => item !== option.value));
      } else {
        onChange([...selected, option.value]);
      }
    },
    [onChange, selected]
  );

  const handleRemove = React.useCallback(
    (option: string) => {
      onChange(selected.filter((item) => item !== option));
    },
    [onChange, selected]
  );

  // Add event listener to detect clicks outside the component
  React.useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        containerRef.current && 
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <div
        className={`flex min-h-10 max-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background ${
          disabled ? "cursor-not-allowed opacity-50" : "cursor-text"
        }`}
        onClick={() => {
          if (!disabled) {
            inputRef.current?.focus();
            setOpen(true);
          }
        }}
      >
        <div className="flex flex-wrap gap-1 overflow-y-auto w-full">
          {selected.map((value) => {
            const option = options.find((opt) => opt.value === value);
            if (!option) return null;
            
            return (
              <Badge key={value} variant="secondary" className="mr-1 mb-1">
                {option.label}
                {!disabled && (
                  <button
                    type="button"
                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRemove(value);
                    }}
                  >
                    <X className="h-3 w-3" />
                    <span className="sr-only">Remove {option.label}</span>
                  </button>
                )}
              </Badge>
            );
          })}
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder={selected.length === 0 ? placeholder : ""}
            className="flex-1 min-w-[80px] bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
            disabled={disabled}
          />
        </div>
      </div>
      
      {open && !disabled && (
        <div 
          className="absolute z-50 w-full mt-1 rounded-md border bg-popover text-popover-foreground shadow-md outline-none"
          onMouseDown={(e) => {
            e.preventDefault();
          }}
        >
          <Command className="w-full">
            <CommandInput 
              placeholder="Search..." 
              value={inputValue} 
              onValueChange={setInputValue} 
              className="h-9"
              onMouseDown={(e) => e.stopPropagation()}
            />
            <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup className="max-h-60 overflow-y-auto">
              {options.map((option) => {
                const isSelected = selected.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => {
                      handleSelect(option);
                      inputRef.current?.focus();
                    }}
                    className="flex items-center gap-2 cursor-pointer"
                    onMouseDown={(e) => {
                      e.preventDefault();
                    }}
                  >
                    <div 
                      className={`mr-2 flex h-4 w-4 items-center justify-center rounded-sm border ${
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-primary"
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelect(option);
                      }}
                    >
                      {isSelected ? (
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 15 15"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M11.4669 3.72684C11.7558 3.91574 11.8369 4.30308 11.648 4.59198L7.39799 11.092C7.29783 11.2452 7.13556 11.3467 6.95402 11.3699C6.77247 11.3931 6.58989 11.3355 6.45446 11.2124L3.70446 8.71241C3.44905 8.48022 3.43023 8.08494 3.66242 7.82953C3.89461 7.57412 4.28989 7.55529 4.5453 7.78749L6.75292 9.79441L10.6018 3.90792C10.7907 3.61902 11.178 3.53795 11.4669 3.72684Z"
                            fill="currentColor"
                          />
                        </svg>
                      ) : null}
                    </div>
                    <span>{option.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}
