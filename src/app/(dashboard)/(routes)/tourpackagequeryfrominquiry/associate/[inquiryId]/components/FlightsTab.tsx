// filepath: d:\next13-ecommerce-admin\src\components\tour-package-query\FlightsTab.tsx
import { Control } from "react-hook-form";
import { TourPackageQueryFromInquiryAssociateFormValues } from "./tourpackagequery-associate-form";
import { TourPackageQueryCreateCopyFormValues } from "@/app/(dashboard)/tourPackageQueryCreateCopy/[tourPackageQueryCreateCopyId]/components/tourPackageQueryCreateCopy-form"; // Adjust path if needed
import { Trash, PlaneTakeoff } from "lucide-react"; // Added PlaneTakeoff icon

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

// Define the props interface with a union type for control
interface FlightsTabProps {
  control: Control<TourPackageQueryFromInquiryAssociateFormValues>;
  loading: boolean;
  form: any; // Consider using a more specific type or a union type if form methods differ
}

const FlightsTab: React.FC<FlightsTabProps> = ({
  control,
  loading,
  form
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlaneTakeoff className="h-5 w-5" /> {/* Added icon */}
          Flights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6"> {/* Increased spacing */}
        <FormField
          control={control}
          name="flightDetails"
          render={({ field: { value = [], onChange } }) => (
            <FormItem>
              <FormLabel className="text-lg font-semibold mb-4 block">Flight Plan</FormLabel> {/* Styled label */}
              {value.map((flight, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6 border rounded-lg p-4 shadow-sm bg-white"> {/* Improved layout and styling */}
                  {/* Date Input */}
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Date</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="YYYY-MM-DD"
                        type="date" // Use date type for better UX
                        disabled={loading}
                        value={flight.date || ''} // Ensure controlled component
                        onChange={(e) => {
                          const newFlightDetails = [...value];
                          newFlightDetails[index] = { ...flight, date: e.target.value };
                          onChange(newFlightDetails);
                        }}
                        className="bg-slate-50"
                      />
                    </FormControl>
                  </FormItem>

                  {/* Flight Name Input */}
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Flight Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Indigo"
                        disabled={loading}
                        value={flight.flightName || ''} // Ensure controlled component
                        onChange={(e) => {
                          const newFlightDetails = [...value];
                          newFlightDetails[index] = { ...flight, flightName: e.target.value };
                          onChange(newFlightDetails);
                        }}
                         className="bg-slate-50"
                      />
                    </FormControl>
                  </FormItem>

                  {/* Flight Number Input */}
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Flight Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., 6E 123"
                        disabled={loading}
                        value={flight.flightNumber || ''} // Ensure controlled component
                        onChange={(e) => {
                          const newFlightDetails = [...value];
                          newFlightDetails[index] = { ...flight, flightNumber: e.target.value };
                          onChange(newFlightDetails);
                        }}
                         className="bg-slate-50"
                      />
                    </FormControl>
                  </FormItem>

                  {/* From Input */}
                  <FormItem>
                    <FormLabel className="text-sm font-medium">From</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Departure City/Airport"
                        disabled={loading}
                        value={flight.from || ''} // Ensure controlled component
                        onChange={(e) => {
                          const newFlightDetails = [...value];
                          newFlightDetails[index] = { ...flight, from: e.target.value };
                          onChange(newFlightDetails);
                        }}
                         className="bg-slate-50"
                      />
                    </FormControl>
                  </FormItem>

                  {/* To Input */}
                  <FormItem>
                    <FormLabel className="text-sm font-medium">To</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Arrival City/Airport"
                        disabled={loading}
                        value={flight.to || ''} // Ensure controlled component
                        onChange={(e) => {
                          const newFlightDetails = [...value];
                          newFlightDetails[index] = { ...flight, to: e.target.value };
                          onChange(newFlightDetails);
                        }}
                         className="bg-slate-50"
                      />
                    </FormControl>
                  </FormItem>

                  {/* Departure Time Input */}
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Departure Time</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="HH:MM"
                        type="time" // Use time type
                        disabled={loading}
                        value={flight.departureTime || ''} // Ensure controlled component
                        onChange={(e) => {
                          const newFlightDetails = [...value];
                          newFlightDetails[index] = { ...flight, departureTime: e.target.value };
                          onChange(newFlightDetails);
                        }}
                         className="bg-slate-50"
                      />
                    </FormControl>
                  </FormItem>

                  {/* Arrival Time Input */}
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Arrival Time</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="HH:MM"
                        type="time" // Use time type
                        disabled={loading}
                        value={flight.arrivalTime || ''} // Ensure controlled component
                        onChange={(e) => {
                          const newFlightDetails = [...value];
                          newFlightDetails[index] = { ...flight, arrivalTime: e.target.value };
                          onChange(newFlightDetails);
                        }}
                         className="bg-slate-50"
                      />
                    </FormControl>
                  </FormItem>

                  {/* Flight Duration Input */}
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Duration</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., 2h 30m"
                        disabled={loading}
                        value={flight.flightDuration || ''} // Ensure controlled component
                        onChange={(e) => {
                          const newFlightDetails = [...value];
                          newFlightDetails[index] = { ...flight, flightDuration: e.target.value };
                          onChange(newFlightDetails);
                        }}
                         className="bg-slate-50"
                      />
                    </FormControl>
                  </FormItem>

                  {/* Remove Button */}
                  <div className="flex items-end"> {/* Align button to bottom */}
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={loading}
                      onClick={() => {
                        const newFlightDetails = value.filter((_, i: number) => i !== index);
                        onChange(newFlightDetails);
                      }}
                      className="w-full md:w-auto" // Adjust width for responsiveness
                    >
                      <Trash className="h-4 w-4 mr-1" /> {/* Reduced margin */}
                      Remove
                    </Button>
                  </div>
                </div>
              ))}

              {/* Add Flight Button */}
              <div className="mt-4">
                <Button
                  type="button"
                  size="sm"
                  variant="outline" // Changed variant for distinction
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
                  className="border-dashed border-primary text-primary hover:bg-primary/10" // Added styling
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
