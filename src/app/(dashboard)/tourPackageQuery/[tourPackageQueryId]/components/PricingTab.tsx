// filepath: d:\next13-ecommerce-admin\src\app\(dashboard)\tourPackageQuery\[tourPackageQueryId]\components\PricingTab.tsx
import { Control, useFieldArray } from "react-hook-form";
import { TourPackageQueryFormValues } from "./tourPackageQuery-form";
import { Calculator, Plus, Trash } from "lucide-react";
import { useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";

// Import necessary UI components
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Hotel, RoomType, OccupancyType, MealPlan, VehicleType } from "@prisma/client";

// Define the props interface
interface PricingTabProps {
  control: Control<TourPackageQueryFormValues>;
  loading: boolean;
  form: any;
  hotels: (Hotel & {
    images: any[];
  })[];
  roomTypes: RoomType[];
  occupancyTypes: OccupancyType[];
  mealPlans: MealPlan[];
  vehicleTypes: VehicleType[];
  priceCalculationResult: any;
  setPriceCalculationResult: (result: any) => void;
}

const PricingTab: React.FC<PricingTabProps> = ({
  control,
  loading,
  form,
  hotels,
  roomTypes,
  occupancyTypes,
  mealPlans,
  vehicleTypes,
  priceCalculationResult,
  setPriceCalculationResult
}) => {
  // Set up field array for pricing section
  const {
    fields: pricingFields,
    append: appendPricing,
    remove: removePricing,
    insert: insertPricing 
  } = useFieldArray({
    control,
    name: "pricingSection"
  });

  // Function to handle adding a pricing item
  const handleAddPricingItem = (insertAtIndex?: number) => {
    const newItem = { name: '', price: '', description: '' };

    if (insertAtIndex !== undefined) {
      // Insert after the specified index
      insertPricing(insertAtIndex + 1, newItem);
      console.log("Inserted pricing item after index", insertAtIndex);
    } else {
      // Add to the end
      appendPricing(newItem);
      console.log("Added pricing item at the end");
    }
  };

  // Function to handle removing a pricing item
  const handleRemovePricingItem = (indexToRemove: number) => {
    removePricing(indexToRemove);
    console.log("Removed pricing item at index", indexToRemove);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pricing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Auto-calculate pricing section */}
        <div className="border border-blue-100 bg-blue-50 rounded-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-blue-800">Auto Price Calculation</h3>
              {/* Add spinner that shows during calculation */}
              <div id="price-calculating-spinner" className="hidden animate-spin rounded-full h-5 w-5 border-b-2 border-blue-800"></div>
              {/* Calculation status indicator */}
              <div id="calculation-status" className="hidden text-sm text-blue-700 bg-blue-100 px-2 py-1 rounded">Calculating...</div>
            </div>

            {/* Markup Input and Pricing Tier Selection */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center w-full sm:w-auto">
              <div className="flex items-center">
                <label htmlFor="markup" className="text-sm mr-2 text-blue-700">Markup %:</label>
                <Input
                  id="markup"
                  type="number"
                  className="w-20 h-8"
                  defaultValue="0"
                  min="0"
                  max="100"
                  onChange={(e) => {
                    // Store the custom markup value for calculations
                    (window as any).customMarkupValue = e.target.value;
                  }}
                  ref={(el) => {
                    if (el) (window as any).markupInput = el;
                  }}
                />
              </div>
              <div className="w-full sm:w-auto">
                <Select onValueChange={(value) => {
                  // When a tier is selected, set the corresponding markup percentage
                  if (value === 'standard') {
                    if ((window as any).markupInput) (window as any).markupInput.value = '10';
                    (window as any).customMarkupValue = '10';
                  } else if (value === 'premium') {
                    if ((window as any).markupInput) (window as any).markupInput.value = '20';
                    (window as any).customMarkupValue = '20';
                  } else if (value === 'luxury') {
                    if ((window as any).markupInput) (window as any).markupInput.value = '30';
                    (window as any).customMarkupValue = '30';
                  } else if (value === 'custom') {
                    // For custom option, keep the current value
                    (window as any).customMarkupValue = (window as any).markupInput.value;
                  }
                }}>
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue placeholder="Pricing Tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard (10%)</SelectItem>
                    <SelectItem value="premium">Premium (20%)</SelectItem>
                    <SelectItem value="luxury">Luxury (30%)</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-3 sm:mt-0">
              <Button
                type="button"
                onClick={async () => {
                  try {
                    // Hide previous results and show loading state
                    setPriceCalculationResult(null);

                    // Show calculation in progress UI elements
                    const calculatingElement = document.getElementById('price-calculating-spinner');
                    const calculationStatus = document.getElementById('calculation-status');
                    if (calculatingElement) calculatingElement.classList.remove('hidden');
                    if (calculationStatus) {
                      calculationStatus.classList.remove('hidden');
                      calculationStatus.textContent = 'Calculating...';
                    }

                    console.log("Starting simple price calculation...");

                    // Get required data from form
                    const tourStartsFrom = form.getValues('tourStartsFrom');
                    const tourEndsOn = form.getValues('tourEndsOn');
                    const itineraries = form.getValues('itineraries');

                    // Validate required data
                    if (!tourStartsFrom || !tourEndsOn) {
                      const errorMsg = 'Please select tour start and end dates first';
                      console.error(errorMsg);
                      toast.error(errorMsg);
                      return;
                    }                    // Check if we have any itineraries with hotels
                    const validItineraries = itineraries.filter((itinerary: {
                      hotelId?: string;
                      locationId?: string;
                      dayNumber?: number;
                      roomAllocations?: any[];
                      transportDetails?: any[];
                    }) => {
                      return itinerary.hotelId &&
                        hotels.some(hotel => hotel.id === itinerary.hotelId);
                    });

                    if (validItineraries.length === 0) {
                      toast.error('Please select hotels for at least one day to calculate pricing');
                      return;
                    }

                    toast.success('Calculating room prices...');

                    // Convert to PricingItinerary type by ensuring all required fields are present
                    const pricingItineraries = validItineraries.map((itinerary: {
                      locationId?: string;
                      dayNumber?: number;
                      hotelId?: string;
                      roomAllocations?: any[];
                      transportDetails?: any[];
                    }) => ({
                      locationId: itinerary.locationId,
                      dayNumber: itinerary.dayNumber || 0, // Default to day 0 if not specified
                      hotelId: itinerary.hotelId,
                      // Add room allocations if available
                      roomAllocations: itinerary.roomAllocations || [],
                      transportDetails: itinerary.transportDetails || [],
                    }));
                    
                    // Get the markup value from the window object that's storing the user's selection
                    const markupValue = (window as any).customMarkupValue || '0';
                    const markupPercentage = parseFloat(markupValue);

                    console.log('Sending data to price calculation API:', {
                      tourStartsFrom,
                      tourEndsOn,
                      itineraries: pricingItineraries,
                      markup: markupPercentage
                    });

                    // Call the API to calculate price with our simplified approach
                    const response = await axios.post('/api/pricing/calculate', {
                      tourStartsFrom,
                      tourEndsOn,
                      itineraries: pricingItineraries,
                      markup: markupPercentage
                    });

                    const result = response.data;
                    console.log('Price calculation result:', result);

                    // More robust validation of the result
                    if (result && typeof result === 'object') {
                      // Even if some properties are missing, try to use what we have
                      const totalCost = result.totalCost || 0;
                      form.setValue('totalPrice', totalCost.toString());

                      // Create pricing section with available data
                      const pricingItems = [];

                      // Add total cost
                      pricingItems.push({
                        name: 'Total Cost',
                        price: totalCost.toString(),
                        description: 'Total package cost with markup'
                      });

                      // Add accommodation breakdown if available
                      if (result.breakdown && typeof result.breakdown === 'object') {
                        const accommodationCost = result.breakdown.accommodation || 0;
                        pricingItems.push({
                          name: 'Accommodation',
                          price: accommodationCost.toString(),
                          description: 'Hotel room costs'
                        });

                        const transportCost = result.breakdown.transport || 0;
                        if (transportCost > 0) {
                          pricingItems.push({
                            name: 'Transport',
                            price: transportCost.toString(),
                            description: 'Vehicle costs'
                          });
                        }
                      }

                      // Update pricing section with what we have
                      form.setValue('pricingSection', pricingItems);
                      
                      // Store the calculation result for display in the table
                      // First set the result in the window object for consistency
                      (window as any).priceCalculationResult = result;
                      
                      // Then update the React state to trigger a re-render 
                      setPriceCalculationResult(result);
                      toast.success('Price calculation complete!');
                    } else {
                      console.error('Invalid price calculation result structure:', result);
                      toast.error('Invalid price calculation result: The server returned an unexpected response');
                    }
                    
                    // Hide spinner and update status when calculation is complete
                    const spinnerElement = document.getElementById('price-calculating-spinner');
                    const statusElement = document.getElementById('calculation-status');
                    if (spinnerElement) spinnerElement.classList.add('hidden');
                    if (statusElement) {
                      statusElement.textContent = 'Calculation Complete';
                      statusElement.classList.remove('hidden', 'bg-blue-100', 'text-blue-700');
                      statusElement.classList.add('bg-green-100', 'text-green-700');
                      // Hide the status after 3 seconds
                      setTimeout(() => {
                        statusElement.classList.add('hidden');
                      }, 3000);
                    }

                  } catch (error: any) {
                    console.error('Price calculation error:', error);

                    let errorMessage = 'Error calculating price';

                    if (error instanceof Error) {
                      errorMessage = error.message;
                      console.error('Error details:', error.stack);
                    }

                    if (error.response) {
                      console.error('API response error data:', error.response.data);
                      console.error('API response error status:', error.response.status);

                      if (error.response.data) {
                        errorMessage = typeof error.response.data === 'string'
                          ? `API Error: ${error.response.data}`
                          : `API Error: Status ${error.response.status}`;
                      }
                    }

                    toast.error(`Price calculation failed: ${errorMessage}`);
                  }
                }}
                variant="outline"
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Calculator className="mr-2 h-4 w-4" />
                Calculate Price
              </Button>
              <Button
                type="button"
                onClick={() => {
                  // Reset the price calculation result
                  setPriceCalculationResult(null);
                  (window as any).priceCalculationResult = null;
                  // Reset the markup to default
                  if ((window as any).markupInput) {
                    (window as any).markupInput.value = '0';
                    (window as any).customMarkupValue = '0';
                  }
                  toast.success('Price calculation reset');
                }}
                variant="outline"
                className="bg-gray-200 hover:bg-gray-300 text-gray-800"
              >
                Reset
              </Button>
            </div>
          </div>
          
          {/* Integrated Price Calculation Result Table */}
          {/* Only show when pricing calculation is complete and data exists */}
          {priceCalculationResult && priceCalculationResult.itineraryBreakdown?.length > 0 && (
            <div className="mt-6 border border-blue-200 rounded-lg overflow-hidden">
              <Table>
                <TableCaption>Complete Pricing Details</TableCaption>
                <TableHeader>
                  <TableRow className="bg-blue-50">
                    <TableHead className="w-[80px]">Day</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Room Cost</TableHead>
                    <TableHead className="text-right">Transport Cost</TableHead>
                    <TableHead className="text-right">Day Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Create a day-by-day breakdown combining accommodation and transport */}
                  {(() => {
                    // Get all unique days from both itineraries and transport
                    const days = new Set<number>();

                    // Add days from accommodation
                    (window as any).priceCalculationResult.itineraryBreakdown?.forEach((item: any) => {
                      days.add(item.day);
                    });

                    // Add days from transport
                    (window as any).priceCalculationResult.transportDetails?.forEach((transport: any) => {
                      days.add(transport.day);
                    });

                    // Convert to sorted array
                    const sortedDays = Array.from(days).sort((a, b) => a - b);

                    // Create a row for each day
                    return sortedDays.map(day => {
                      // Find accommodation for this day
                      const accommodation = (window as any).priceCalculationResult.itineraryBreakdown?.find((item: any) => item.day === day);

                      // Find transport for this day
                      const transports = (window as any).priceCalculationResult.transportDetails?.filter((transport: any) => transport.day === day);

                      // Calculate transport cost for this day
                      const transportCost = transports?.reduce((sum: number, transport: any) => sum + transport.totalCost, 0) || 0;

                      // Get accommodation info
                      const formItineraries = form.getValues('itineraries');
                      const originalItinerary = formItineraries.find((it: any) => it.dayNumber === day);
                      const hotelName = originalItinerary && hotels.find((h: any) => h.id === originalItinerary.hotelId)?.name;

                      // Get ALL room allocations for this day, not just the first one
                      const roomAllocations = originalItinerary?.roomAllocations || [];

                      // Transport details summary
                      const transportSummary: string | undefined = transports?.map((t: any) => {
                        // Try vehicleTypeId first, then fall back to direct vehicleType property if needed
                        let vehicleTypeName = "Unknown";

                        if (t.vehicleTypeId) {
                          // If there's a vehicleTypeId, look it up in the vehicleTypes array
                          const vehicleType = vehicleTypes.find(vt => vt.id === t.vehicleTypeId);
                          if (vehicleType) {
                            vehicleTypeName = vehicleType.name || "Unknown";
                          }
                        }
                        // If we don't have a vehicleTypeId or couldn't find it in the lookup, try to use the direct vehicleType property
                        else if (t.vehicleType) {
                          vehicleTypeName = t.vehicleType;
                        }

                        return `${vehicleTypeName}${t.quantity > 1 ? ` (x${t.quantity})` : ''}`;
                      }).join(", ");

                      const accommodationCost = accommodation?.accommodationCost || 0;
                      const dayTotal = accommodationCost + transportCost;

                      return (
                        <TableRow key={`day-${day}`}>
                          <TableCell className="font-medium">Day {day}</TableCell>
                          <TableCell>
                            {hotelName ? (
                              <div>
                                <span className="font-medium">{hotelName}</span>
                                {/* Display ALL room allocations, not just the first one */}
                                {roomAllocations.map((allocation: any, allocIdx: number) => {
                                  const roomTypeName = roomTypes.find(rt => rt.id === allocation.roomTypeId)?.name || "N/A";
                                  const occupancyTypeName = occupancyTypes.find(ot => ot.id === allocation.occupancyTypeId)?.name || "N/A";
                                  const quantity = allocation.quantity || 1;

                                  // Find room cost for this allocation in the price calculation results
                                  const roomBreakdown = (window as any).priceCalculationResult?.itineraryBreakdown?.find((ib: any) => ib.day === day)?.roomBreakdown;
                                  const roomCost = roomBreakdown?.find((rb: any) =>
                                    rb.roomTypeId === allocation.roomTypeId &&
                                    rb.occupancyTypeId === allocation.occupancyTypeId &&
                                    rb.mealPlanId === allocation.mealPlanId // Added mealPlanId for stricter matching
                                  );
                                  const allocationTotalCost = roomCost ? roomCost.totalCost : 0; // Use totalCost from backend
                                  const pricePerNight = roomCost ? roomCost.pricePerNight : 0; // Get price per night from backend
                                  return (
                                    <span key={allocIdx} className="text-xs text-gray-500 block">
                                      <strong>Room Type :</strong> {roomTypeName} | <strong>Occupancy:</strong> {occupancyTypeName} {quantity > 1 ? `(x${quantity})` : ''}
                                      {/* Display calculation if cost > 0 and quantity > 1, otherwise display total or 0.00 */}
                                      <span className="font-medium text-blue-600 ml-2">
                                        {allocationTotalCost > 0 && pricePerNight > 0 && quantity > 1
                                          ? `₹${pricePerNight.toFixed(2)} x ${quantity} = ₹${allocationTotalCost.toFixed(2)}`
                                          : allocationTotalCost > 0
                                            ? `₹${allocationTotalCost.toFixed(2)}` // Show total if quantity is 1 or pricePerNight is missing
                                            : '₹0.00'}
                                      </span>
                                    </span>
                                  );
                                })}
                                {/* Display individual transport costs instead of summary */}
                                {transports && transports.length > 0 && transports.map((transport: any, transportIdx: number) => {
                                  // Look up vehicle type name
                                  const vehicleTypeName = vehicleTypes.find(vt => vt.id === transport.vehicleTypeId)?.name || transport.vehicleType || "Unknown";
                                  const transportCost = transport.totalCost || 0;
                                  const pricePerUnit = transport.pricePerUnit || 0; // Get price per unit
                                  const quantity = transport.quantity || 1; // Get quantity
                                  return (
                                    <span key={`transport-${transportIdx}`} className="text-xs text-gray-500 block">
                                      Transport: {vehicleTypeName} {quantity > 1 ? `(x${quantity})` : ''}
                                      <span className="font-medium text-blue-600 ml-2">
                                        {/* Display calculation if cost > 0, pricePerUnit > 0 and quantity > 1 */}
                                        {transportCost > 0 && pricePerUnit > 0 && quantity > 1
                                          ? `₹${pricePerUnit.toFixed(2)} x ${quantity} = ₹${transportCost.toFixed(2)}`
                                          : transportCost > 0
                                            ? `₹${transportCost.toFixed(2)}` // Show total if quantity is 1 or pricePerUnit is missing
                                            : '₹0.00'}
                                      </span>
                                    </span>
                                  );
                                })}
                              </div>
                            ) : transportSummary ? (
                              // Handle case where there's only transport, no hotel
                              <div>
                                {transports && transports.length > 0 && transports.map((transport: any, transportIdx: number) => {
                                  const vehicleTypeName = vehicleTypes.find(vt => vt.id === transport.vehicleTypeId)?.name || transport.vehicleType || "Unknown";
                                  const transportCost = transport.totalCost || 0;
                                  const pricePerUnit = transport.pricePerUnit || 0; // Get price per unit
                                  const quantity = transport.quantity || 1; // Get quantity
                                  return (
                                    <span key={`transport-only-${transportIdx}`} className="text-xs text-gray-500 block">
                                      Transport: {vehicleTypeName} {quantity > 1 ? `(x${quantity})` : ''}
                                      <span className="font-medium text-blue-600 ml-2">
                                        {/* Display calculation if cost > 0, pricePerUnit > 0 and quantity > 1 */}
                                        {transportCost > 0 && pricePerUnit > 0 && quantity > 1
                                          ? `₹${pricePerUnit.toFixed(2)} x ${quantity} = ₹${transportCost.toFixed(2)}`
                                          : transportCost > 0
                                            ? `₹${transportCost.toFixed(2)}` // Show total if quantity is 1 or pricePerUnit is missing
                                            : '₹0.00'}
                                      </span>
                                    </span>
                                  );
                                })}
                              </div>) : (
                              'N/A'
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {accommodationCost ? accommodationCost.toFixed(2) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {transportCost ? transportCost.toFixed(2) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {dayTotal.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      );
                    });
                  })()}

                  {/* Summary Section */}
                  <TableRow className="bg-blue-50">
                    <TableCell colSpan={4} className="font-medium text-right">
                      Base Accommodation Cost
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {(window as any).priceCalculationResult.breakdown.accommodation.toFixed(2)}
                    </TableCell>
                  </TableRow>

                  <TableRow className="bg-blue-50">
                    <TableCell colSpan={4} className="font-medium text-right">
                      Base Transport Cost
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {(window as any).priceCalculationResult.breakdown.transport.toFixed(2)}
                    </TableCell>
                  </TableRow>

                  <TableRow className="bg-blue-50">
                    <TableCell colSpan={4} className="font-medium text-right">
                      Total Base Cost
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {((window as any).priceCalculationResult.breakdown.accommodation +
                        (window as any).priceCalculationResult.breakdown.transport).toFixed(2)}
                    </TableCell>
                  </TableRow>

                  {(window as any).priceCalculationResult.appliedMarkup && (
                    <TableRow className="bg-blue-100">
                      <TableCell colSpan={4} className="font-medium text-right">
                        Markup ({(window as any).priceCalculationResult.appliedMarkup.percentage}%)
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {(window as any).priceCalculationResult.appliedMarkup.amount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  )}

                  <TableRow className="bg-blue-200">
                    <TableCell colSpan={4} className="font-medium text-right">
                      Final Total Cost
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {(window as any).priceCalculationResult.totalCost.toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-8">
          <FormField
            control={control}
            name="totalPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Price</FormLabel>
                <FormControl>
                  <Input 
                    disabled={loading} 
                    placeholder="Total Price" 
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="border rounded-lg p-4 overflow-x-auto">
          <h3 className="text-lg font-semibold mb-4">Dynamic Pricing Options</h3>
          <FormField
            control={control}
            name="pricingSection"
            render={() => (
              <FormItem>
                {/* Add column headers */}
                <div className="grid grid-cols-3 gap-4 mb-2 px-1 min-w-[600px]">
                  <div className="font-medium text-sm">Price Type</div>
                  <div className="font-medium text-sm">Price</div>
                  <div className="font-medium text-sm">Description (Optional)</div>
                </div>
                <div className="space-y-4">
                  {/* Use pricingFields from useFieldArray */}
                  {pricingFields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-3 gap-4 items-end relative pr-20 pt-2 border-t border-gray-100 first:border-t-0">
                      <FormField
                        control={control}
                        name={`pricingSection.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                placeholder="e.g. Adult, Child, Infant"
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={control}
                        name={`pricingSection.${index}.price`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                placeholder="e.g. 1000 (optional)"
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={control}
                        name={`pricingSection.${index}.description`}
                        render={({ field }) => (
                          <FormItem className="relative">
                            <FormControl>
                              <Input
                                placeholder="e.g. Age 3-12, with bed"
                                {...field}
                              />
                            </FormControl>
                            <div className="absolute right-0 top-0 -mr-20 flex space-x-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleAddPricingItem(index)}
                                className="h-10 w-10"
                                title="Insert row after this"
                              >
                                <Plus className="h-4 w-4 text-blue-500" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemovePricingItem(index)}
                                className="h-10 w-10"
                                title="Remove this row"
                              >
                                <Trash className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddPricingItem()}
                    className="mt-2"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Pricing Option
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default PricingTab;
