import * as React from "react";
import { CalendarIcon } from "@radix-ui/react-icons";
import { addDays, format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Controller } from "react-hook-form";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function DatePickerWithRange({ control, name }: { control: any, name: any }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        // Convert the field value from a string to a DateRange object
        let date;
        try {
          date = field.value && field.value !== "" ? JSON.parse(field.value) : undefined;
        } catch (error) {
          console.error("Error parsing date range:", error);
          date = undefined;
        }
        return (
          <div className="grid gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "w-[300px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date?.from ? (
                    date.to ? (
                      <>
                        {format(new Date(date.from), "LLL dd, y")} -{" "}
                        {format(new Date(date.to), "LLL dd, y")}
                      </>
                    ) : (
                      format(new Date(date.from), "LLL dd, y")
                    )
                  ) : (
                    <span>Pick Date Range</span>
                  )}
                </Button>
              </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
  <Calendar
    initialFocus
    mode="range"
    defaultMonth={date?.from ? new Date(date.from) : undefined}
    selected={date ? {from: new Date(date.from), to: date.to ? new Date(date.to) : undefined} : undefined}
    onSelect={(value) => {
      // Convert the DateRange object to a string when setting the field value
      field.onChange(JSON.stringify(value));
    }}
    numberOfMonths={2}
  />
</PopoverContent>
            </Popover>
          </div>
        );
      }}
    />
  );
}