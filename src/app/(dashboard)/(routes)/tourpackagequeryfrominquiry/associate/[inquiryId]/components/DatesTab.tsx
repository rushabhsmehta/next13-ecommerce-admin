// filepath: d:\next13-ecommerce-admin\src\components\tour-package-query\DatesTab.tsx
import { Control } from "react-hook-form";
import { TourPackageQueryFormValues } from "./tourPackageQuery-form";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { createDatePickerValue, formatLocalDate } from "@/lib/timezone-utils";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

// Use a union type for the control prop and form type
interface DatesTabProps {
  control: Control<TourPackageQueryFormValues>;
  loading: boolean;
  form: any; // Use a more specific type if available, consider a union type here too if form methods differ
  // Add props for selective field enabling for associate partners
  isAssociatePartner?: boolean;
  enableTourStartsFrom?: boolean;
  enableTourEndsOn?: boolean;
  enableNumDaysNight?: boolean;
  enablePeriod?: boolean;
}

const DatesTab: React.FC<DatesTabProps> = ({
  control,
  loading,
  form,
  isAssociatePartner = false,
  enableTourStartsFrom = true,
  enableTourEndsOn = true,
  enableNumDaysNight = true,
  enablePeriod = true
}) => {
  // For associate partners, override loading state for specific fields
  const getFieldDisabled = (fieldEnabled: boolean) => {
    if (isAssociatePartner) {
      return loading || !fieldEnabled;
    }
    return loading;
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Tour Dates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">        <FormField
          control={control}
          name="tourStartsFrom"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel className={!enableTourStartsFrom && isAssociatePartner ? "text-muted-foreground" : ""}>
                Tour Starts From
                {!enableTourStartsFrom && isAssociatePartner && <span className="text-xs ml-2">(Read-only)</span>}
              </FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground",
                        getFieldDisabled(enableTourStartsFrom) && "opacity-50"
                      )}
                      disabled={getFieldDisabled(enableTourStartsFrom)}
                    >
                      {field.value ? (
                        formatLocalDate(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={createDatePickerValue(field.value)}
                    onSelect={(date) => date && field.onChange(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="tourEndsOn"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel className={!enableTourEndsOn && isAssociatePartner ? "text-muted-foreground" : ""}>
                Tour Ends On
                {!enableTourEndsOn && isAssociatePartner && <span className="text-xs ml-2">(Read-only)</span>}
                {enableTourEndsOn && isAssociatePartner && <span className="text-xs ml-2 text-green-600">(Editable)</span>}
              </FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground",
                        getFieldDisabled(enableTourEndsOn) && "opacity-50",
                        enableTourEndsOn && isAssociatePartner && "border-green-200 bg-green-50"
                      )}
                      disabled={getFieldDisabled(enableTourEndsOn)}
                    >
                      {field.value ? (
                        formatLocalDate(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={createDatePickerValue(field.value)}
                    onSelect={(date) => date && field.onChange(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={control}
            name="numDaysNight"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={!enableNumDaysNight && isAssociatePartner ? "text-muted-foreground" : ""}>
                  Number of Days/Nights
                  {!enableNumDaysNight && isAssociatePartner && <span className="text-xs ml-2">(Read-only)</span>}
                </FormLabel>
                <FormControl>
                  <input
                    className={cn(
                      "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                      getFieldDisabled(enableNumDaysNight) && "opacity-50"
                    )}
                    placeholder="Number of Days/Nights"
                    disabled={getFieldDisabled(enableNumDaysNight)}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="period"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={!enablePeriod && isAssociatePartner ? "text-muted-foreground" : ""}>
                  Period
                  {!enablePeriod && isAssociatePartner && <span className="text-xs ml-2">(Read-only)</span>}
                </FormLabel>
                <FormControl>
                  <input
                    className={cn(
                      "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                      getFieldDisabled(enablePeriod) && "opacity-50"
                    )}
                    placeholder="Period (e.g. May 2023)"
                    disabled={getFieldDisabled(enablePeriod)}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Add a helpful message about date selection */}
        <div className={cn(
          "text-sm p-3 rounded-md border",
          isAssociatePartner 
            ? "text-blue-700 bg-blue-50 border-blue-200"
            : "text-muted-foreground bg-slate-50 border-slate-100"
        )}>
          {isAssociatePartner ? (
            <p>
              <strong>Associate Partner:</strong> You can edit the &ldquo;Tour Ends On&rdquo; date to adjust the package duration. 
              Other date fields are set by the tour package template and are read-only.
            </p>
          ) : (
            <p>
              <strong>Note:</strong> Setting accurate tour dates is important for availability checking and pricing calculations.
              The number of days/nights should match the number of itinerary days created.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DatesTab;
