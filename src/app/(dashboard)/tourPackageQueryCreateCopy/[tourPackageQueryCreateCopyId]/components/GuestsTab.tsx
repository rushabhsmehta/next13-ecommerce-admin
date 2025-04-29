import { Control } from "react-hook-form";
import { Users } from "lucide-react";
import { TourPackageQueryCreateCopyFormValues } from "./tourPackageQueryCreateCopy-form";
import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GuestsProps {
  control: Control<TourPackageQueryCreateCopyFormValues>;
  loading: boolean;
}

const Guests: React.FC<GuestsProps> = ({
  control,
  loading
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Guests</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
                <Input disabled={loading} placeholder="Number of Adults" {...field} />
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
                <Input disabled={loading} placeholder="Number of Children 5 to 12" {...field} />
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
                <Input disabled={loading} placeholder="Number of Children 0 to 5" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};

export default Guests;
