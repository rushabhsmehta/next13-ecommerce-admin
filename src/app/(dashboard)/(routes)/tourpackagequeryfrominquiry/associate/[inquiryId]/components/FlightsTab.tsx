// filepath: d:\next13-ecommerce-admin\src\components\tour-package-query\FlightsTab.tsx
import React from "react";
import { Control } from "react-hook-form";
import { TourPackageQueryFormValues } from "./tourPackageQuery-form";
import { Trash, PlaneTakeoff, ImageIcon } from "lucide-react"; // Added ImageIcon

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
import ImageUpload from "@/components/ui/image-upload"; // Added ImageUpload import

// Define the props interface with a union type for control
interface FlightsTabProps {
  control: Control<TourPackageQueryFormValues>;
  loading: boolean;
  form: any; // Consider using a more specific type or a union type if form methods differ
}

const FlightsTab: React.FC<FlightsTabProps> = ({
  control,
  loading,
  form
}) => {
  return (
    <Card className="w-full">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <PlaneTakeoff className="h-4 w-4 sm:h-5 sm:w-5" />
          Flights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
        <FormField
          control={control}
          name="flightDetails"
          render={({ field: { value = [], onChange } }) => (
            <FormItem>
              <FormLabel className="text-base sm:text-lg font-semibold mb-4 block">Flight Plan</FormLabel>
              {value.map((flight, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 border rounded-lg p-4 shadow-sm bg-white">
                  {/* Date Input */}
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Date</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="YYYY-MM-DD"
                        type="date"
                        disabled={loading}
                        value={flight.date || ''}
                        onChange={(e) => {
                          const newFlightDetails = [...value];
                          newFlightDetails[index] = { ...flight, date: e.target.value };
                          onChange(newFlightDetails);
                        }}
                        className="bg-slate-50 min-h-[44px]"
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
                        value={flight.flightName || ''}
                        onChange={(e) => {
                          const newFlightDetails = [...value];
                          newFlightDetails[index] = { ...flight, flightName: e.target.value };
                          onChange(newFlightDetails);
                        }}
                        className="bg-slate-50 min-h-[44px]"
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
                        value={flight.flightNumber || ''}
                        onChange={(e) => {
                          const newFlightDetails = [...value];
                          newFlightDetails[index] = { ...flight, flightNumber: e.target.value };
                          onChange(newFlightDetails);
                        }}
                        className="bg-slate-50 min-h-[44px]"
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
                  </FormItem>                  {/* Remove Button */}
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
                      className="w-full sm:w-auto min-h-[44px]"
                    >
                      <Trash className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>

                  {/* Flight Images Section */}
                  <div className="col-span-full mt-4">
                    <div className="bg-slate-50 p-3 rounded-md">
                      <h3 className="text-sm font-medium mb-2 flex items-center gap-2 text-slate-700">
                        <ImageIcon className="h-4 w-4 text-primary" />
                        Flight Images
                      </h3>
                      <ImageUpload
                        value={(flight.images || []).map((img: any) => typeof img === 'string' ? img : img.url)}
                        disabled={loading}
                        onChange={(url) => {
                          const newFlightDetails = [...value];
                          const currentImages = flight.images || [];
                          newFlightDetails[index] = {
                            ...flight,
                            images: [...currentImages, { url }]
                          };
                          onChange(newFlightDetails);
                        }}
                        onRemove={(url) => {
                          const newFlightDetails = [...value];
                          const currentImages = flight.images || [];
                          newFlightDetails[index] = {
                            ...flight,
                            images: currentImages.filter((img: any) => {
                              const imgUrl = typeof img === 'string' ? img : img.url;
                              return imgUrl !== url;
                            })
                          };
                          onChange(newFlightDetails);
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Add Flight Button */}
              <div className="mt-4">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={loading}
                  onClick={() => onChange([...value, {
                    date: '',
                    flightName: '',
                    flightNumber: '',
                    from: '',
                    to: '',
                    departureTime: '',
                    arrivalTime: '',
                    flightDuration: '',
                    images: []
                  }])}
                  className="border-dashed border-primary text-primary hover:bg-primary/10 w-full sm:w-auto min-h-[44px]"
                >
                  Add Flight
                </Button>
              </div>

              {/* Mobile-friendly info section */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200 sm:hidden">
                <p className="text-sm text-blue-700">
                  ✈️ Add flight details and images for each segment of your journey
                </p>
              </div>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};
