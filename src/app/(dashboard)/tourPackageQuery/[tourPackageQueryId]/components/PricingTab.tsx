import { Control, useFieldArray } from "react-hook-form";
import { Calculator, Plus, Trash } from "lucide-react";
import { useState } from "react"; // Import useState
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"; // Import RadioGroup
import { format } from "date-fns"; // Import format
import { TourPackageQueryFormValues } from "./tourPackageQuery-form";

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

// Define calculation methods
type CalculationMethod = 'manual' | 'autoHotelTransport' | 'autoTourPackage';

// Define interface for occupancy selection with occurrences
interface OccupancySelection {
  occupancyTypeId: string;
  count: number;
  paxPerUnit: number;
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
  // State for selected calculation method
  const [calculationMethod, setCalculationMethod] = useState<CalculationMethod>('manual');
  // State for Tour Package Pricing selection criteria
  const [selectedMealPlanId, setSelectedMealPlanId] = useState<string | null>(null);
  // State for multiple occupancy selections with counts
  const [occupancySelections, setOccupancySelections] = useState<OccupancySelection[]>([]);
  // State for new occupancy being added
  const [newOccupancyTypeId, setNewOccupancyTypeId] = useState<string>("");
  const [newOccupancyCount, setNewOccupancyCount] = useState<number>(1);

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

  // Function to add a new occupancy selection
  const handleAddOccupancySelection = () => {
    if (!newOccupancyTypeId) {
      toast.error("Please select an occupancy type");
      return;
    }
    
    // Find the occupancy type to get paxPerUnit
    const occupancyType = occupancyTypes.find(ot => ot.id === newOccupancyTypeId);
    if (!occupancyType) {
      toast.error("Invalid occupancy type selected");
      return;
    }
    
    // Determine pax per unit based on occupancy type name
    // This logic can be adjusted based on your specific occupancy types
    let paxPerUnit = 1; // Default
    if (occupancyType.name?.toLowerCase().includes('double')) {
      paxPerUnit = 2;
    } else if (occupancyType.name?.toLowerCase().includes('triple')) {
      paxPerUnit = 3;
    } else if (occupancyType.name?.toLowerCase().includes('quad')) {
      paxPerUnit = 4;
    }
    
    // Add to selections
    setOccupancySelections([
      ...occupancySelections,
      {
        occupancyTypeId: newOccupancyTypeId,
        count: newOccupancyCount,
        paxPerUnit
      }
    ]);
    
    // Reset form fields
    setNewOccupancyTypeId("");
    setNewOccupancyCount(1);
  };

  // Function to remove an occupancy selection
  const handleRemoveOccupancySelection = (index: number) => {
    setOccupancySelections(occupancySelections.filter((_, i) => i !== index));
  };
  // Function to calculate total PAX based on occupancy selections
  const calculateTotalPax = (): number => {
    return occupancySelections.reduce((total, selection) => {
      return total + (selection.count * selection.paxPerUnit);
    }, 0);
  };
  
  // Function to calculate PAX for pricing matches (only counting Double occupancy)
  const calculatePricingPax = (): number => {
    return occupancySelections.reduce((total, selection) => {
      // Find the occupancy type to check if it's Double
      const occupancyType = occupancyTypes.find(ot => ot.id === selection.occupancyTypeId);
      // Only count Double occupancy for pricing match
      if (occupancyType && occupancyType.name?.toLowerCase().includes('double')) {
        return total + (selection.count * selection.paxPerUnit);
      }
      return total;
    }, 0);
  };

  // Function to handle fetching and applying Tour Package Pricing
  const handleFetchTourPackagePricing = async () => {
    const tourPackageTemplateId = form.getValues('tourPackageTemplate');
    if (!tourPackageTemplateId) {
      toast.error("Please select a Tour Package Template first in the Basic Info tab.");
      return;
    }
    
    // Check meal plan selection
    if (!selectedMealPlanId) {
      toast.error("Please select a Meal Plan for Tour Package Pricing.");
      return;
    }
    
    // Check occupancy selections
    if (occupancySelections.length === 0) {
      toast.error("Please add at least one occupancy selection.");
      return;
    }
    
    const queryStartDate = form.getValues('tourStartsFrom');
    const queryEndDate = form.getValues('tourEndsOn');
    if (!queryStartDate || !queryEndDate) {
      toast.error("Please select Tour Start and End Dates first.");
      return;
    }
      // Calculate pax from Double occupancy selections only for pricing match
    const pricingQueryPax = calculatePricingPax();
    // Calculate total pax for validation and display
    const totalQueryPax = calculateTotalPax();
    
    if (totalQueryPax <= 0) {
      toast.error("Total number of guests must be greater than 0.");
      return;
    }
    
    if (pricingQueryPax <= 0) {
      toast.error("You need at least one Double occupancy selection for tour package pricing.");
      return;
    }

    toast.loading("Fetching and matching tour package pricing...");
    try {
      const response = await axios.get(`/api/tourPackages/${tourPackageTemplateId}/pricing`);
      const tourPackagePricings = response.data;
      toast.dismiss();

      if (!tourPackagePricings || tourPackagePricings.length === 0) {
        toast.error("No pricing periods found for the selected tour package.");
        return;
      }      // --- Enhanced Filtering Logic --- 
      // First, find all possible matches for date range, meal plan and pax count
      const matchedPricings = tourPackagePricings.filter((p: any) => {
        const periodStart = new Date(p.startDate);
        const periodEnd = new Date(p.endDate);
        const isDateMatch = queryStartDate >= periodStart && queryEndDate <= periodEnd;
        const isMealPlanMatch = p.mealPlanId === selectedMealPlanId;
        // Use ONLY Double occupancy for PAX matching
        const isPaxMatch = p.numPax === pricingQueryPax;

        return isDateMatch && isMealPlanMatch && isPaxMatch;
      });

      if (matchedPricings.length === 0) {
        toast.error(`No matching pricing period found for the selected criteria (Date, Meal Plan, ${pricingQueryPax} Double PAX).`);
        return;
      }

      if (matchedPricings.length > 1) {
        console.warn("Multiple matching pricing periods found:", matchedPricings);
        toast.error("Multiple pricing periods match the criteria. Cannot automatically apply price. Please refine Tour Package pricing definitions.");
        return;
      }      // --- Apply the uniquely matched pricing --- 
      const selectedPricing = matchedPricings[0];      // First, extract Per Person and Per Couple costs (required for Double occupancy)
      const perPersonComponent = selectedPricing.pricingComponents.find((comp: any) => 
        comp.pricingAttribute?.name?.toLowerCase().includes('per person')
      );
      
      const perCoupleComponent = selectedPricing.pricingComponents.find((comp: any) => 
        comp.pricingAttribute?.name?.toLowerCase().includes('per couple')
      );
        // Extract costs ONLY for the specific selected occupancy types
      const otherOccupancyComponents = occupancySelections
        .filter(selection => {
          const occupancyType = occupancyTypes.find(ot => ot.id === selection.occupancyTypeId);
          return occupancyType && !occupancyType.name?.toLowerCase().includes('double');
        })
        .map(selection => {
          const occupancyType = occupancyTypes.find(ot => ot.id === selection.occupancyTypeId);
          const occupancyName = occupancyType?.name?.toLowerCase() || '';
          
          // Find components that specifically match this occupancy type based on well-defined mappings
          return selectedPricing.pricingComponents.find((comp: any) => {
            const compName = comp.pricingAttribute?.name?.toLowerCase() || '';
            
            // Double occupancy uses Per Person Cost or Per Couple Cost
            if (occupancyName.includes('double')) {
              return compName.includes('per person') || compName.includes('per couple');
            }
            // CNB (Child with No Bed) uses Child With No Bed pricing
            if (occupancyName.includes('cnb') || (occupancyName.includes('child') && occupancyName.includes('no bed'))) {
              return compName.includes('cnb') || (compName.includes('child') && compName.includes('no bed'));
            }
            // Extra Bed uses Extra Bed/Mattress pricing
            if (occupancyName.includes('extra bed') || occupancyName.includes('extra mattress')) {
              return compName.includes('extra bed') || compName.includes('extrabed') || compName.includes('mattress');
            }
            // Child With Bed uses Child With Bed pricing
            if (occupancyName.includes('child') && occupancyName.includes('with bed')) {
              return compName.includes('child') && compName.includes('with bed');
            }
            // Infant pricing
            if (occupancyName.includes('infant')) {
              return compName.includes('infant');
            }
            
            // More specific matching as fallback
            const occupancyWords = occupancyName.split(/\s+/);
            for (const word of occupancyWords) {
              if (word.length > 2 && compName.includes(word)) return true;
            }
            
            return false;
          });
        })
        .filter(Boolean); // Remove any undefined components
      
      // Create the final pricing components array
      const finalPricingComponents = [];
        // Always add Per Person and Per Couple if available (for Double occupancy)
      if (perPersonComponent) {
        finalPricingComponents.push({
          name: perPersonComponent.pricingAttribute?.name || 'Per Person Cost',
          price: perPersonComponent.price || '0',
          description: 'Cost per person'
        });
      }
      
      if (perCoupleComponent) {
        finalPricingComponents.push({
          name: perCoupleComponent.pricingAttribute?.name || 'Per Couple Cost',
          price: perCoupleComponent.price || '0',
          description: 'Cost per couple'
        });
      }
        // Add other occupancy type specific components
      otherOccupancyComponents.forEach((comp: any) => {
        if (comp) {
          finalPricingComponents.push({
            name: comp.pricingAttribute?.name || 'Other Cost',
            price: comp.price || '0',
            description: ''
          });
        }
      });
        // Calculate the total price based on all applied components
      const doubleOccupancySelections = occupancySelections.filter(selection => {
        const occupancyType = occupancyTypes.find(ot => ot.id === selection.occupancyTypeId);
        return occupancyType && occupancyType.name?.toLowerCase().includes('double');
      });
      
      let totalPrice = 0;
      
      // Apply Double occupancy pricing with correct multiplication
      if (doubleOccupancySelections.length > 0) {
        // Prefer Per Couple price if available, otherwise use Per Person price
        if (perCoupleComponent) {
          const perCouplePrice = parseFloat(perCoupleComponent.price || '0');
          // Each double room counts as 1 couple
          const doubleCoupleCount = doubleOccupancySelections.reduce((total, selection) => {
            return total + selection.count;
          }, 0);
          totalPrice += perCouplePrice * doubleCoupleCount;
        } else if (perPersonComponent) {
          const perPersonPrice = parseFloat(perPersonComponent.price || '0');
          // Each double room counts as 2 persons
          const doublePersonCount = doubleOccupancySelections.reduce((total, selection) => {
            // Multiply by 2 since each Double occupancy has 2 people
            return total + (selection.count * 2);
          }, 0);
          totalPrice += perPersonPrice * doublePersonCount;
        }
      }
      
      // Apply other occupancy pricing with correct multiplication for each type
      occupancySelections.forEach(selection => {
        const occupancyType = occupancyTypes.find(ot => ot.id === selection.occupancyTypeId);
        if (!occupancyType) return;
        
        // Skip double occupancy as it's already handled above
        if (occupancyType.name?.toLowerCase().includes('double')) return;
        
        const occupancyName = occupancyType.name?.toLowerCase() || '';
        let matchedComp;
        
        // Find the matching price component based on occupancy type
        if (occupancyName.includes('cnb') || (occupancyName.includes('child') && occupancyName.includes('no bed'))) {
          // Find Child With No Bed pricing
          matchedComp = selectedPricing.pricingComponents.find((comp: any) => {
            const compName = comp.pricingAttribute?.name?.toLowerCase() || '';
            return compName.includes('cnb') || (compName.includes('child') && compName.includes('no bed'));
          });
        } else if (occupancyName.includes('extra bed') || occupancyName.includes('extra mattress')) {
          // Find Extra Bed pricing
          matchedComp = selectedPricing.pricingComponents.find((comp: any) => {
            const compName = comp.pricingAttribute?.name?.toLowerCase() || '';
            return compName.includes('extra bed') || compName.includes('extrabed') || compName.includes('mattress');
          });
        } else if (occupancyName.includes('child') && occupancyName.includes('with bed')) {
          // Find Child With Bed pricing
          matchedComp = selectedPricing.pricingComponents.find((comp: any) => {
            const compName = comp.pricingAttribute?.name?.toLowerCase() || '';
            return compName.includes('child') && compName.includes('with bed');
          });
        } else if (occupancyName.includes('infant')) {
          // Find Infant pricing
          matchedComp = selectedPricing.pricingComponents.find((comp: any) => {
            const compName = comp.pricingAttribute?.name?.toLowerCase() || '';
            return compName.includes('infant');
          });
        } else {
          // Fallback for any other occupancy types
          matchedComp = selectedPricing.pricingComponents.find((comp: any) => {
            const compName = comp.pricingAttribute?.name?.toLowerCase() || '';
            return compName.includes(occupancyName);
          });
        }
        
        // Apply the price if a matching component is found
        if (matchedComp) {
          const unitPrice = parseFloat(matchedComp.price || '0');
          totalPrice += unitPrice * selection.count; // Multiply by the number of this occupancy type
        }
      });

      // Always attempt to set the price and components
      form.setValue('totalPrice', totalPrice.toString());
      form.setValue('pricingSection', finalPricingComponents);

      toast.success("Tour package pricing applied successfully!");

    } catch (error) {
      toast.dismiss();
      console.error("Error fetching/applying tour package pricing:", error);
      toast.error("Failed to fetch or apply tour package pricing.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pricing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6"> {/* Increased spacing */}

        {/* Pricing Calculation Method Selection */}
        {/* Removed FormField wrapper as pricingMethod is local state, not part of the main form schema */}
        <FormItem className="space-y-3">
          <FormLabel>Pricing Calculation Method</FormLabel>
          <FormControl>
            <RadioGroup
              onValueChange={(value: CalculationMethod) => setCalculationMethod(value)}
              defaultValue={calculationMethod}
              className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4"
            >
              <FormItem className="flex items-center space-x-3 space-y-0">
                <FormControl>
                  <RadioGroupItem value="manual" />
                </FormControl>
                <FormLabel className="font-normal">Manual Pricing</FormLabel>
              </FormItem>
              <FormItem className="flex items-center space-x-3 space-y-0">
                <FormControl>
                  <RadioGroupItem value="autoHotelTransport" />
                </FormControl>
                <FormLabel className="font-normal">Auto Calculate (Hotel & Transport)</FormLabel>
              </FormItem>
              <FormItem className="flex items-center space-x-3 space-y-0">
                <FormControl>
                  <RadioGroupItem value="autoTourPackage" />
                </FormControl>
                <FormLabel className="font-normal">Use Tour Package Pricing</FormLabel>
              </FormItem>
            </RadioGroup>
          </FormControl>
          {/* <FormMessage /> */ /* Removed as it's not a FormField anymore */}
        </FormItem>

        {/* Conditional Sections based on calculationMethod */}

        {/* Auto-calculate pricing section (Hotel & Transport) */}
        {calculationMethod === 'autoHotelTransport' && (
          <div className="border border-blue-100 bg-blue-50 rounded-lg p-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-blue-800">Auto Price (Hotel & Transport)</h3>
                {/* ... existing spinner and status ... */}
                <div id="price-calculating-spinner" className="hidden animate-spin rounded-full h-5 w-5 border-b-2 border-blue-800"></div>
                <div id="calculation-status" className="hidden text-sm text-blue-700 bg-blue-100 px-2 py-1 rounded">Calculating...</div>
              </div>

              {/* ... existing Markup Input and Pricing Tier Selection ... */}
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
                      (window as any).customMarkupValue = e.target.value;
                    }}
                    ref={(el) => {
                      if (el) (window as any).markupInput = el;
                    }}
                  />
                </div>
                <div className="w-full sm:w-auto">
                  <Select onValueChange={(value) => {
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
                      setPriceCalculationResult(null);
                      const calculatingElement = document.getElementById('price-calculating-spinner');
                      const calculationStatus = document.getElementById('calculation-status');
                      if (calculatingElement) calculatingElement.classList.remove('hidden');
                      if (calculationStatus) {
                        calculationStatus.classList.remove('hidden');
                        calculationStatus.textContent = 'Calculating...';
                      }
                      console.log("Starting simple price calculation...");
                      const tourStartsFrom = form.getValues('tourStartsFrom');
                      const tourEndsOn = form.getValues('tourEndsOn');
                      const itineraries = form.getValues('itineraries');
                      if (!tourStartsFrom || !tourEndsOn) {
                        const errorMsg = 'Please select tour start and end dates first';
                        console.error(errorMsg);
                        toast.error(errorMsg);
                        return;
                      }
                      const validItineraries = itineraries.filter((itinerary: any) => {
                        return itinerary.hotelId &&
                          hotels.some(hotel => hotel.id === itinerary.hotelId);
                      });
                      if (validItineraries.length === 0) {
                        toast.error('Please select hotels for at least one day to calculate pricing');
                        return;
                      }
                      toast.success('Calculating room prices...');
                      const pricingItineraries = validItineraries.map((itinerary: any) => ({
                        locationId: itinerary.locationId,
                        dayNumber: itinerary.dayNumber || 0,
                        hotelId: itinerary.hotelId,
                        roomAllocations: itinerary.roomAllocations || [],
                        transportDetails: itinerary.transportDetails || [],
                      }));
                      const markupValue = (window as any).customMarkupValue || '0';
                      const markupPercentage = parseFloat(markupValue);
                      console.log('Sending data to price calculation API:', {
                        tourStartsFrom,
                        tourEndsOn,
                        itineraries: pricingItineraries,
                        markup: markupPercentage
                      });
                      const response = await axios.post('/api/pricing/calculate', {
                        tourStartsFrom,
                        tourEndsOn,
                        itineraries: pricingItineraries,
                        markup: markupPercentage
                      });
                      const result = response.data;
                      console.log('Price calculation result:', result);
                      if (result && typeof result === 'object') {
                        const totalCost = result.totalCost || 0;
                        form.setValue('totalPrice', totalCost.toString());
                        const pricingItems = [];
                        pricingItems.push({
                          name: 'Total Cost',
                          price: totalCost.toString(),
                          description: 'Total package cost with markup'
                        });
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
                        form.setValue('pricingSection', pricingItems);
                        (window as any).priceCalculationResult = result;
                        setPriceCalculationResult(result);
                        toast.success('Price calculation complete!');
                      } else {
                        console.error('Invalid price calculation result structure:', result);
                        toast.error('Invalid price calculation result: The server returned an unexpected response');
                      }
                      const spinnerElement = document.getElementById('price-calculating-spinner');
                      const statusElement = document.getElementById('calculation-status');
                      if (spinnerElement) spinnerElement.classList.add('hidden');
                      if (statusElement) {
                        statusElement.textContent = 'Calculation Complete';
                        statusElement.classList.remove('hidden', 'bg-blue-100', 'text-blue-700');
                        statusElement.classList.add('bg-green-100', 'text-green-700');
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
                    setPriceCalculationResult(null);
                    (window as any).priceCalculationResult = null;
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

            {/* ... existing Price Calculation Result Table ... */}
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
                    {(() => {
                      const days = new Set<number>();
                      (window as any).priceCalculationResult.itineraryBreakdown?.forEach((item: any) => {
                        days.add(item.day);
                      });
                      (window as any).priceCalculationResult.transportDetails?.forEach((transport: any) => {
                        days.add(transport.day);
                      });
                      const sortedDays = Array.from(days).sort((a, b) => a - b);
                      return sortedDays.map(day => {
                        const accommodation = (window as any).priceCalculationResult.itineraryBreakdown?.find((item: any) => item.day === day);
                        const transports = (window as any).priceCalculationResult.transportDetails?.filter((transport: any) => transport.day === day);
                        const transportCost = transports?.reduce((sum: number, transport: any) => sum + transport.totalCost, 0) || 0;
                        const formItineraries = form.getValues('itineraries');
                        const originalItinerary = formItineraries.find((it: any) => it.dayNumber === day);
                        const hotelName = originalItinerary && hotels.find((h: any) => h.id === originalItinerary.hotelId)?.name;
                        const roomAllocations = originalItinerary?.roomAllocations || [];
                        const transportSummary: string | undefined = transports?.map((t: any) => {
                          let vehicleTypeName = "Unknown";
                          if (t.vehicleTypeId) {
                            const vehicleType = vehicleTypes.find(vt => vt.id === t.vehicleTypeId);
                            if (vehicleType) {
                              vehicleTypeName = vehicleType.name || "Unknown";
                            }
                          } else if (t.vehicleType) {
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
                                  {roomAllocations.map((allocation: any, allocIdx: number) => {
                                    const roomTypeName = roomTypes.find(rt => rt.id === allocation.roomTypeId)?.name || "N/A";
                                    const occupancyTypeName = occupancyTypes.find(ot => ot.id === allocation.occupancyTypeId)?.name || "N/A";
                                    const quantity = allocation.quantity || 1;
                                    const roomBreakdown = (window as any).priceCalculationResult?.itineraryBreakdown?.find((ib: any) => ib.day === day)?.roomBreakdown;
                                    const roomCost = roomBreakdown?.find((rb: any) =>
                                      rb.roomTypeId === allocation.roomTypeId &&
                                      rb.occupancyTypeId === allocation.occupancyTypeId &&
                                      rb.mealPlanId === allocation.mealPlanId
                                    );
                                    const allocationTotalCost = roomCost ? roomCost.totalCost : 0;
                                    const pricePerNight = roomCost ? roomCost.pricePerNight : 0;
                                    return (
                                      <span key={allocIdx} className="text-xs text-gray-500 block">
                                        <strong>Room Type :</strong> {roomTypeName} | <strong>Occupancy:</strong> {occupancyTypeName} {quantity > 1 ? `(x${quantity})` : ''}
                                        <span className="font-medium text-blue-600 ml-2">
                                          {allocationTotalCost > 0 && pricePerNight > 0 && quantity > 1
                                            ? `₹${pricePerNight.toFixed(2)} x ${quantity} = ₹${allocationTotalCost.toFixed(2)}`
                                            : allocationTotalCost > 0
                                              ? `₹${allocationTotalCost.toFixed(2)}`
                                              : '₹0.00'}
                                        </span>
                                      </span>
                                    );
                                  })}
                                  {transports && transports.length > 0 && transports.map((transport: any, transportIdx: number) => {
                                    const vehicleTypeName = vehicleTypes.find(vt => vt.id === transport.vehicleTypeId)?.name || transport.vehicleType || "Unknown";
                                    const transportCost = transport.totalCost || 0;
                                    const pricePerUnit = transport.pricePerUnit || 0;
                                    const quantity = transport.quantity || 1;
                                    return (
                                      <span key={`transport-${transportIdx}`} className="text-xs text-gray-500 block">
                                        Transport: {vehicleTypeName} {quantity > 1 ? `(x${quantity})` : ''}
                                        <span className="font-medium text-blue-600 ml-2">
                                          {transportCost > 0 && pricePerUnit > 0 && quantity > 1
                                            ? `₹${pricePerUnit.toFixed(2)} x ${quantity} = ₹${transportCost.toFixed(2)}`
                                            : transportCost > 0
                                              ? `₹${transportCost.toFixed(2)}`
                                              : '₹0.00'}
                                        </span>
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : transportSummary ? (
                                <div>
                                  {transports && transports.length > 0 && transports.map((transport: any, transportIdx: number) => {
                                    const vehicleTypeName = vehicleTypes.find(vt => vt.id === transport.vehicleTypeId)?.name || transport.vehicleType || "Unknown";
                                    const transportCost = transport.totalCost || 0;
                                    const pricePerUnit = transport.pricePerUnit || 0;
                                    const quantity = transport.quantity || 1;
                                    return (
                                      <span key={`transport-only-${transportIdx}`} className="text-xs text-gray-500 block">
                                        Transport: {vehicleTypeName} {quantity > 1 ? `(x${quantity})` : ''}
                                        <span className="font-medium text-blue-600 ml-2">
                                          {transportCost > 0 && pricePerUnit > 0 && quantity > 1
                                            ? `₹${pricePerUnit.toFixed(2)} x ${quantity} = ₹${transportCost.toFixed(2)}`
                                            : transportCost > 0
                                              ? `₹${transportCost.toFixed(2)}`
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
        )}

        {/* Use Tour Package Pricing Section */}
        {calculationMethod === 'autoTourPackage' && (
          <div className="border border-green-100 bg-green-50 rounded-lg p-4 space-y-4">
            <h3 className="text-lg font-semibold text-green-800 mb-3">Use Tour Package Pricing</h3>
            <p className="text-sm text-green-700">
              Fetch pre-defined pricing based on the selected Tour Package Template, Meal Plan, and Occupancy combinations.
              This will overwrite the current Total Price and Pricing Options below.
            </p>

            {/* Meal Plan Selection First */}
            <FormItem className="space-y-2">
              <FormLabel>Meal Plan</FormLabel>
              <Select
                disabled={loading}
                onValueChange={setSelectedMealPlanId}
                value={selectedMealPlanId || undefined}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Meal Plan" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {mealPlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!selectedMealPlanId && <p className="text-sm text-red-500 pt-1">Required</p>}
            </FormItem>

            {/* Occupancy Selections */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-green-800">Occupancy Selections</h4>
              
              {/* Show current selections */}
              {occupancySelections.length > 0 ? (
                <div className="space-y-2">
                  {occupancySelections.map((selection, index) => {
                    const occupancyType = occupancyTypes.find(ot => ot.id === selection.occupancyTypeId);
                    return (
                      <div key={index} className="flex items-center justify-between p-2 bg-white rounded border border-green-200">
                        <div>
                          <span className="font-medium">{occupancyType?.name}</span>
                          <span className="text-sm text-gray-600 ml-2">
                            × {selection.count} = {selection.count * selection.paxPerUnit} PAX
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveOccupancySelection(index)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    );
                  })}
                  
                  <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                    <span className="font-semibold">Total: {calculateTotalPax()} PAX</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-amber-600">No occupancy selections added yet</p>
              )}
              
              {/* Add new occupancy selection */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                <div>
                  <FormLabel className="text-xs">Occupancy Type</FormLabel>
                  <Select
                    disabled={loading}
                    onValueChange={setNewOccupancyTypeId}
                    value={newOccupancyTypeId || undefined}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {occupancyTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>                <div>
                  <FormLabel className="text-xs">Count</FormLabel>
                  <div className="flex items-center gap-2">
                    <Button 
                      type="button"
                      size="icon"
                      variant="outline"
                      className="rounded-full w-8 h-8 flex-shrink-0"
                      onClick={() => setNewOccupancyCount(Math.max(1, newOccupancyCount - 1))}
                      disabled={loading || newOccupancyCount <= 1}
                    >
                      <span className="sr-only">Decrease</span>
                      <span className="text-lg font-bold">-</span>
                    </Button>
                    <Input
                      type="number"           
                      value={newOccupancyCount}
                      onChange={(e) => setNewOccupancyCount(parseInt(e.target.value) || 1)}
                      min="1"
                      pattern="[0-9]*"
                      inputMode="numeric"
                      disabled={loading}
                      className="w-full text-center"
                    />
                    <Button 
                      type="button"
                      size="icon"
                      variant="outline"
                      className="rounded-full w-8 h-8 flex-shrink-0"
                      onClick={() => setNewOccupancyCount(newOccupancyCount + 1)}
                      disabled={loading}
                    >
                      <span className="sr-only">Increase</span>
                      <span className="text-lg font-bold">+</span>
                    </Button>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={handleAddOccupancySelection}
                  variant="outline"
                  size="sm"
                  className="bg-green-100 hover:bg-green-200 text-green-800"
                  disabled={loading || !newOccupancyTypeId}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add
                </Button>
              </div>
            </div>

            {/* Fetch Button */}
            <Button
              type="button"
              onClick={handleFetchTourPackagePricing}
              variant="outline"
              className="bg-green-500 hover:bg-green-600 text-white mt-4"
              disabled={loading || !form.getValues('tourPackageTemplate') || !selectedMealPlanId || occupancySelections.length === 0}
            >
              <Calculator className="mr-2 h-4 w-4" />
              Fetch & Apply Tour Package Price
            </Button>
            {!form.getValues('tourPackageTemplate') && (
              <p className="text-xs text-red-600 mt-2">Select a Tour Package Template in the &apos;Basic Info&apos; tab first.</p>
            )}
          </div>
        )}

        {/* Manual Pricing Section (Total Price and Dynamic Options) */}
        {/* Always show Total Price, but maybe disable if not manual? */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FormField
            control={control}
            name="totalPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Price</FormLabel>
                <FormControl>
                  <Input
                    disabled={loading || calculationMethod !== 'manual'} // Disable if not manual
                    placeholder="Total Price (auto-filled or manual)"
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Dynamic Pricing Options Table - Show for Manual or if autoTourPackage applied */}
        {(calculationMethod === 'manual' || calculationMethod === 'autoTourPackage') && (
          <div className="border rounded-lg p-4 overflow-x-auto">
            <h3 className="text-lg font-semibold mb-4">Pricing Options / Breakdown</h3>
            <FormField
              control={control}
              name="pricingSection"
              render={() => (
                <FormItem>
                  <div className="grid grid-cols-3 gap-4 mb-2 px-1 min-w-[600px]">
                    <div className="font-medium text-sm">Price Type</div>
                    <div className="font-medium text-sm">Price</div>
                    <div className="font-medium text-sm">Description (Optional)</div>
                  </div>
                  <div className="space-y-4">
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
                                  disabled={loading || calculationMethod === 'autoTourPackage'} // Disable if using Tour Package Pricing
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
                                  disabled={loading || calculationMethod === 'autoTourPackage'} // Disable if using Tour Package Pricing
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
                                  disabled={loading || calculationMethod === 'autoTourPackage'} // Disable if using Tour Package Pricing
                                />
                              </FormControl>
                              {/* Only show add/remove buttons in manual mode */}
                              {calculationMethod === 'manual' && (
                                <div className="absolute right-0 top-0 -mr-20 flex space-x-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleAddPricingItem(index)}
                                    className="h-10 w-10"
                                    title="Insert row after this"
                                    disabled={loading}
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
                                    disabled={loading}
                                  >
                                    <Trash className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              )}
                            </FormItem>
                          )}
                        />
                      </div>
                    ))}
                    {/* Only show Add button in manual mode */}
                    {calculationMethod === 'manual' && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddPricingItem()}
                        className="mt-2"
                        disabled={loading}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Pricing Option
                      </Button>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

      </CardContent>
    </Card>
  );
};

export default PricingTab;