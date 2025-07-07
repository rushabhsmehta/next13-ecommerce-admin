// filepath: d:\next13-ecommerce-admin\src\components\tour-package-query\GuestsTab.tsx
import { Control } from "react-hook-form";
import { TourPackageQueryFormValues } from "./tourPackageQuery-form";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Use a union type for the control prop to accept both form value types
interface GuestsProps {
  control: Control<TourPackageQueryFormValues>;
  loading: boolean;
}

const GuestsTab: React.FC<GuestsProps> = ({
  control,
  loading
}) => {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
          <Users className="h-5 w-5" />
          Guest Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mobile-friendly responsive grid for customer details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <FormField
            control={control}
            name="customerName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer Name</FormLabel>
                <FormControl>
                  <Input 
                    disabled={loading} 
                    placeholder="Customer Name" 
                    className={cn("min-h-[44px]", loading && "opacity-50")}
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="customerNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer Number</FormLabel>
                <FormControl>
                  <Input 
                    disabled={loading} 
                    placeholder="Customer Number" 
                    className={cn("min-h-[44px]", loading && "opacity-50")}
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Mobile-friendly responsive grid for guest counts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <FormField
            control={control}
            name="numAdults"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Number of Adults</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    disabled={loading} 
                    placeholder="Number of Adults" 
                    className={cn("min-h-[44px]", loading && "opacity-50")}
                    {...field} 
                    onChange={event => field.onChange(event.target.value)} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="numChild5to12"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Children (5-12 years)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    disabled={loading} 
                    placeholder="Children 5-12" 
                    className={cn("min-h-[44px]", loading && "opacity-50")}
                    {...field} 
                    onChange={event => field.onChange(event.target.value)} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="numChild0to5"
            render={({ field }) => (
              <FormItem className="sm:col-span-2 lg:col-span-1">
                <FormLabel>Children (0-5 years)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    disabled={loading} 
                    placeholder="Children 0-5" 
                    className={cn("min-h-[44px]", loading && "opacity-50")}
                    {...field} 
                    onChange={event => field.onChange(event.target.value)} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Mobile-friendly info section */}
        <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-sm">
          <p className="text-muted-foreground leading-relaxed">
            <strong>Note:</strong> Guest information helps in determining room allocations, 
            meal requirements, and overall tour logistics. Adult count includes all guests 
            above 12 years of age.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default GuestsTab;
