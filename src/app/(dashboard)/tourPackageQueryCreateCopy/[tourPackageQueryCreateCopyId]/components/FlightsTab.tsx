// filepath: d:\next13-ecommerce-admin\src\app\(dashboard)\tourPackageQuery\[tourPackageQueryId]\components\FlightsTab.tsx
import { Control } from "react-hook-form";
import { Trash } from "lucide-react";

// Import necessary UI components
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TourPackageQueryCreateCopyFormValues } from "./tourPackageQueryCreateCopy-form";

// Define the props interface
interface FlightsTabProps {
  control: Control<TourPackageQueryCreateCopyFormValues>;
  loading: boolean;
  form: any;
}

const FlightsTab: React.FC<FlightsTabProps> = ({
  control,
  loading,
  form
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Flights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={control}
          name="flightDetails"
          render={({ field: { value = [], onChange } }) => (
            <FormItem>
              <FormLabel>Create Flight Plan</FormLabel>
              {value.map((flight, index) => (
                <div key={index} className="grid grid-cols-3 gap-8 mb-6 border-b pb-6 border-gray-100">
                  <FormControl>
                    <Input
                      placeholder="Date"
                      disabled={loading}
                      value={flight.date}
                      onChange={(e) => {
                        const newFlightDetails = [...value];
                        newFlightDetails[index] = { ...flight, date: e.target.value };
                        onChange(newFlightDetails);
                      }}
                    />
                  </FormControl>

                  <FormControl>
                    <Input
                      placeholder="Flight Name"
                      disabled={loading}
                      value={flight.flightName}
                      onChange={(e) => {
                        const newFlightDetails = [...value];
                        newFlightDetails[index] = { ...flight, flightName: e.target.value };
                        onChange(newFlightDetails);
                      }}
                    />
                  </FormControl>

                  <FormControl>
                    <Input
                      placeholder="Flight Number"
                      disabled={loading}
                      value={flight.flightNumber}
                      onChange={(e) => {
                        const newFlightDetails = [...value];
                        newFlightDetails[index] = { ...flight, flightNumber: e.target.value };
                        onChange(newFlightDetails);
                      }}
                    />
                  </FormControl>

                  <FormControl>
                    <Input
                      placeholder="From"
                      disabled={loading}
                      value={flight.from}
                      onChange={(e) => {
                        const newFlightDetails = [...value];
                        newFlightDetails[index] = { ...flight, from: e.target.value };
                        onChange(newFlightDetails);
                      }}
                    />
                  </FormControl>

                  <FormControl>
                    <Input
                      placeholder="To"
                      disabled={loading}
                      value={flight.to}
                      onChange={(e) => {
                        const newFlightDetails = [...value];
                        newFlightDetails[index] = { ...flight, to: e.target.value };
                        onChange(newFlightDetails);
                      }}
                    />
                  </FormControl>

                  <FormControl>
                    <Input
                      placeholder="Departure Time"
                      disabled={loading}
                      value={flight.departureTime}
                      onChange={(e) => {
                        const newFlightDetails = [...value]; 
                        newFlightDetails[index] = { ...flight, departureTime: e.target.value };
                        onChange(newFlightDetails);
                      }}
                    />
                  </FormControl>
                  
                  <FormControl>
                    <Input
                      placeholder="Arrival Time"
                      disabled={loading}
                      value={flight.arrivalTime}
                      onChange={(e) => {
                        const newFlightDetails = [...value];
                        newFlightDetails[index] = { ...flight, arrivalTime: e.target.value };
                        onChange(newFlightDetails);
                      }}
                    />
                  </FormControl>

                  <FormControl>
                    <Input
                      placeholder="Flight Duration"
                      disabled={loading}
                      value={flight.flightDuration}
                      onChange={(e) => {
                        const newFlightDetails = [...value];
                        newFlightDetails[index] = { ...flight, flightDuration: e.target.value };
                        onChange(newFlightDetails);
                      }}
                    />
                  </FormControl>

                  <FormControl>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={loading}
                      onClick={() => {
                        const newFlightDetails = value.filter((_, i: number) => i != index);
                        onChange(newFlightDetails);
                      }}
                    >
                      <Trash className="h-4 w-4 mr-2" />
                      Remove Flight
                    </Button>
                  </FormControl>
                </div>
              ))}

              <div className="mt-4">
                <Button 
                  type="button" 
                  size="sm"
                  disabled={loading}
                  onClick={() => onChange([...value, { 
                    date: '', 
                    flightName: '', 
                    flightNumber: '', 
                    from: '', 
                    to: '', 
                    departureTime: '', 
                    arrivalTime: '', 
                    flightDuration: '' 
                  }])}
                >
                  Add Flight
                </Button>
              </div>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};

export default FlightsTab;
