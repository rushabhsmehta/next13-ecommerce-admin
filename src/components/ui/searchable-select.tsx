"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface Option {
  value: string
  label: string
  icon?: React.ReactNode
}

interface SearchableSelectProps {
  options: Option[]
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select...",
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)

  const selected = options.find((o) => o.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-sm"
          disabled={disabled}
        >
          {selected ? (
            <div className="flex items-center">
              {selected.icon && <span className="mr-2">{selected.icon}</span>}
              <span className="truncate">{selected.label}</span>
            </div>
          ) : (
            <span className="truncate">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder={`Search ${placeholder.toLowerCase()}`} />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => {
                    onValueChange(opt.value === value ? "" : opt.value)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === opt.value ? "opacity-100" : "opacity-0")} />
                  {opt.icon && <span className="mr-2">{opt.icon}</span>}
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default SearchableSelect
