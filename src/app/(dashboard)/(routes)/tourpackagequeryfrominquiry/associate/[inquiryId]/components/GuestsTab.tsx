// filepath: d:\next13-ecommerce-admin\src\components\tour-package-query\GuestsTab.tsx
import { Control } from "react-hook-form";
import { TourPackageQueryFormValues } from "@/app/(dashboard)/tourPackageQuery/[tourPackageQueryId]/components/tourPackageQuery-form"; // Adjust path if needed
import { TourPackageQueryCreateCopyFormValues } from "@/app/(dashboard)/tourPackageQueryCreateCopy/[tourPackageQueryCreateCopyId]/components/tourPackageQueryCreateCopy-form"; // Adjust path if needed
import { Users } from "lucide-react";

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
  control: Control<TourPackageQueryFormValues | TourPackageQueryCreateCopyFormValues>;
  loading: boolean;
}

const GuestsTab: React.FC<GuestsProps> = ({
  control,
  loading
}) => {  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Guests
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <FormField
          control={control}
          name="customerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Customer Name</FormLabel>
              <FormControl>
                <Input disabled={loading} placeholder="Customer Name" {...field} />
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
                <Input disabled={loading} placeholder="Customer Number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="numAdults"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Number of Adults</FormLabel>
              <FormControl>
                <Input type="number" disabled={loading} placeholder="Number of Adults" {...field} onChange={event => field.onChange(event.target.value)} />
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
              <FormLabel>Number of Children 5 to 12</FormLabel>
              <FormControl>
                <Input type="number" disabled={loading} placeholder="Number of Children 5 to 12" {...field} onChange={event => field.onChange(event.target.value)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="numChild0to5"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Number of Children 0 to 5</FormLabel>
              <FormControl>
                <Input type="number" disabled={loading} placeholder="Number of Children 0 to 5" {...field} onChange={event => field.onChange(event.target.value)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};

export default GuestsTab;
