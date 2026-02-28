"use client";

import { CalendarIcon } from "lucide-react";
import { createDatePickerValue, formatLocalDate } from "@/lib/timezone-utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Control, FieldValues, Path } from "react-hook-form";

interface DatePickerFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder?: string;
  dateFormat?: string;
  disabled?: boolean;
  /** Optional function to disable specific dates in the calendar */
  disabledDates?: (date: Date) => boolean;
  /** Color theme class for focus ring/border (e.g. "blue", "green", "orange") */
  colorClass?: string;
}

export function DatePickerField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder = "Select date",
  dateFormat = "dd/MM/yyyy",
  disabled = false,
  disabledDates,
  colorClass = "blue",
}: DatePickerFieldProps<T>) {
  const colorMap: Record<string, string> = {
    blue: "hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200",
    green: "hover:border-green-400 focus:border-green-500 focus:ring-2 focus:ring-green-200",
    orange: "hover:border-orange-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200",
    emerald: "hover:border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200",
  };

  const colorClasses = colorMap[colorClass] || colorMap.blue;

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel className="text-sm font-medium text-gray-700">{label}</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-11 justify-start text-left font-normal border-gray-300",
                    colorClasses,
                    !field.value && "text-muted-foreground"
                  )}
                  disabled={disabled}
                >
                  {field.value
                    ? formatLocalDate(field.value, dateFormat)
                    : placeholder}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={createDatePickerValue(field.value)}
                onSelect={(date) => date && field.onChange(date)}
                disabled={disabledDates}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
