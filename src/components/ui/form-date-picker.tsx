import { useState } from "react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { FormControl } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormDatePickerProps {
  date: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function FormDatePicker({
  date,
  onSelect,
  disabled,
  placeholder = "Select a date"
}: FormDatePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <FormControl>
          <Button
            variant="outline"
            type="button"
            className={cn(
              "w-full pl-3 text-left font-normal",
              !date && "text-muted-foreground"
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(true);
            }}
            disabled={disabled}
          >
            {date ? (
              format(date, "MMMM d, yyyy")
            ) : (
              <span>{placeholder}</span>
            )}
            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
          </Button>
        </FormControl>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0" 
        align="start" 
        side="bottom" 
        sideOffset={4} 
        onClick={(e) => e.stopPropagation()}
        style={{ zIndex: 9999 }}
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={(date) => {
            onSelect(date);
            setOpen(false);
          }}
          disabled={(date) => disabled || date > new Date() || date < new Date("1900-01-01")}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
