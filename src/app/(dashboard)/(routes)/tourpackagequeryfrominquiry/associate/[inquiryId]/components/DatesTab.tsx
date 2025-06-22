// filepath: d:\next13-ecommerce-admin\src\components\tour-package-query\DatesTab.tsx
import { Control } from "react-hook-form";
import { TourPackageQueryFormValues } from "@/app/(dashboard)/tourPackageQuery/[tourPackageQueryId]/components/tourPackageQuery-form"; // Adjust path if needed
import { TourPackageQueryCreateCopyFormValues } from "@/app/(dashboard)/tourPackageQueryCreateCopy/[tourPackageQueryCreateCopyId]/components/tourPackageQueryCreateCopy-form"; // Adjust path if needed
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
  control: Control<TourPackageQueryFormValues | TourPackageQueryCreateCopyFormValues>;
  loading: boolean;
  form: any; // Use a more specific type if available, consider a union type here too if form methods differ
}

const DatesTab: React.FC<DatesTabProps> = ({
  control,
  loading,
  form
}) => {
  return (    <Card>
      <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b">
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          Tour Dates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <FormField
          control={control}          name="tourStartsFrom"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Tour Starts From</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                      disabled={loading}
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
        />        <FormField
          control={control}
          name="tourEndsOn"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Tour Ends On</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal text-sm md:text-base",
                        !field.value && "text-muted-foreground"
                      )}
                      disabled={loading}
                    >                      {field.value ? (
                        formatLocalDate(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">                  <Calendar
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
                <FormLabel>Number of Days/Nights</FormLabel>
                <FormControl>
                  <input
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Number of Days/Nights"
                    disabled={loading}
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
                <FormLabel>Period</FormLabel>
                <FormControl>
                  <input
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Period (e.g. May 2023)"
                    disabled={loading}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Add a helpful message about date selection */}
        <div className="text-sm text-muted-foreground p-3 bg-slate-50 rounded-md border border-slate-100">
          <p>
            <strong>Note:</strong> Setting accurate tour dates is important for availability checking and pricing calculations.
            The number of days/nights should match the number of itinerary days created.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DatesTab;
