// filepath: c:\Users\HP\Documents\GitHub\next13-ecommerce-admin\src\components\tour-package-query\PricingTab.tsx
import { Control, useFieldArray, useWatch } from "react-hook-form";
import { Calculator, Plus, Trash, DollarSign, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";

// Import form value types
import { TourPackageQueryFormValues } from "@/app/(dashboard)/tourPackageQuery/[tourPackageQueryId]/components/tourPackageQuery-form";
import { TourPackageQueryCreateCopyFormValues } from "@/app/(dashboard)/tourPackageQueryCreateCopy/[tourPackageQueryCreateCopyId]/components/tourPackageQueryCreateCopy-form";

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format } from "date-fns";

// Define the props interface with a union type for control
interface PricingTabProps {
  control: Control<TourPackageQueryFormValues | TourPackageQueryCreateCopyFormValues>;
  loading: boolean;
  form: any; // Consider using a more specific type or a union type if form methods differ
  hotels: (Hotel & {
    images: any[];
  })[];
  roomTypes: RoomType[];
  occupancyTypes: OccupancyType[];
  mealPlans: MealPlan[];
  vehicleTypes: VehicleType[];
  priceCalculationResult: any;
  setPriceCalculationResult: (result: any) => void;
  selectedTemplateId?: string; // New prop for the selected template ID
  selectedTemplateType?: string; // New prop for the selected template type
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
  setPriceCalculationResult,
  selectedTemplateId,
  selectedTemplateType
}) => {
  // State for selected calculation method
  const [calculationMethod, setCalculationMethod] = useState<CalculationMethod>(
    selectedTemplateId && selectedTemplateType === 'TourPackage' ? 'autoTourPackage' : 'manual'
  );
  // State for Tour Package Pricing selection criteria
  const [selectedMealPlanId, setSelectedMealPlanId] = useState<string | null>(null);
  // State for multiple occupancy selections with counts
  const [occupancySelections, setOccupancySelections] = useState<OccupancySelection[]>([]);
  // State for new occupancy being added
  const [newOccupancyTypeId, setNewOccupancyTypeId] = useState<string>("");
  const [newOccupancyCount, setNewOccupancyCount] = useState<number>(1);
  // State for tour package details
  const [tourPackageName, setTourPackageName] = useState<string>("");
  const [isFetchingPackage, setIsFetchingPackage] = useState<boolean>(false);

  // Function to calculate total PAX
  const calculateTotalPax = useCallback(() => {
    return occupancySelections.reduce((total: number, selection: OccupancySelection) => {
      return total + (selection.count * selection.paxPerUnit);
    }, 0);
  }, [occupancySelections]);

  // Function to fetch tour package name
  const fetchTourPackageName = useCallback(async (packageId: string) => {
    if (!packageId) {
      setTourPackageName("");
      return;
    }

    const nameFromForm = form.getValues('tourPackageTemplateName');
    if (nameFromForm) {
      setTourPackageName(nameFromForm);
      return;
    }
            
    setIsFetchingPackage(true);
    
    try {
      const response = await axios.get(`/api/tourPackages/${packageId}`);
      const packageData = response.data;
      if (packageData) {
        const packageName = packageData.name || packageData.tourPackageName || `Package ${packageId.substring(0, 8)}...`;
        setTourPackageName(packageName);
        form.setValue('tourPackageTemplateName', packageName);
      }
    } catch (error) {
      console.error("Error fetching tour package details:", error);
      setTourPackageName(`Package ${packageId.substring(0, 8)}...`);
    } finally {
      setIsFetchingPackage(false);
    }
  }, [form]);

  // Fetch tour package details when selectedTemplateId changes
  useEffect(() => {
    if (selectedTemplateId && selectedTemplateType === 'TourPackage') {
      fetchTourPackageName(selectedTemplateId);
    } else {
      setTourPackageName("");
    }
  }, [selectedTemplateId, selectedTemplateType, fetchTourPackageName]);

  // Set calculation method based on template type
  useEffect(() => {
    if (selectedTemplateType !== 'TourPackage') {
      setCalculationMethod('manual');
    }
  }, [selectedTemplateType]);

  // Prevent auto calculation when template type is not TourPackage
  useEffect(() => {
    if (selectedTemplateType !== 'TourPackage' && calculationMethod === 'autoTourPackage') {
      setCalculationMethod('manual');
    }
  }, [selectedTemplateType, calculationMethod]);

  // Set meal plan ID when changed
  useEffect(() => {
    if (selectedMealPlanId) {
      form.setValue('selectedMealPlanId', selectedMealPlanId);
    }
  }, [selectedMealPlanId, form]);

  // Update form when occupancy selections change
  useEffect(() => {
    form.setValue('occupancySelections', occupancySelections);
    
    if (calculationMethod === 'autoTourPackage' && selectedMealPlanId && occupancySelections.length > 0) {
      calculateTotalPax();
    }
  }, [occupancySelections, form, calculationMethod, selectedMealPlanId, calculateTotalPax]);

  const {
    fields: pricingFields,
    append: appendPricing,
    remove: removePricing,
  } = useFieldArray({
    control,
    name: "pricingSection"
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Pricing Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Calculation Method Selection */}
        <div className="space-y-4">
          <FormLabel className="text-base font-medium">Pricing Calculation Method</FormLabel>
          <RadioGroup
            value={calculationMethod}
            onValueChange={(value: CalculationMethod) => setCalculationMethod(value)}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="manual" id="manual" />
              <label htmlFor="manual" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Manual Pricing Entry
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="autoHotelTransport" id="autoHotelTransport" />
              <label htmlFor="autoHotelTransport" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Auto Calculate from Hotel & Transport
              </label>
            </div>
            {selectedTemplateType === 'TourPackage' && (
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="autoTourPackage" id="autoTourPackage" />
                <label htmlFor="autoTourPackage" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Auto Calculate from Tour Package Pricing
                </label>
              </div>
            )}
          </RadioGroup>
        </div>

        {/* Manual Pricing Section */}
        {calculationMethod === 'manual' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <FormLabel className="text-base font-medium">Pricing Items</FormLabel>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendPricing({ name: "", price: "", description: "" })}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            {pricingFields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4">
                  <FormField
                    control={control}
                    name={`pricingSection.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Item Name</FormLabel>
                        <FormControl>
                          <Input
                            disabled={loading}
                            placeholder="Pricing item name..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-2">
                  <FormField
                    control={control}
                    name={`pricingSection.${index}.price`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price</FormLabel>
                        <FormControl>
                          <Input
                            disabled={loading}
                            placeholder="0.00"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-5">
                  <FormField
                    control={control}
                    name={`pricingSection.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input
                            disabled={loading}
                            placeholder="Optional description..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="col-span-1">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removePricing(index)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tour Package Auto Pricing Section */}
        {calculationMethod === 'autoTourPackage' && selectedTemplateType === 'TourPackage' && (
          <div className="space-y-6">
            {/* Tour Package Info */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">Selected Tour Package</h4>
                  {isFetchingPackage ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <p className="font-medium text-sm">Loading package details...</p>
                    </div>
                  ) : (
                    <p className="font-medium">
                      {tourPackageName || form.getValues('tourPackageTemplateName') || `Package ID: ${selectedTemplateId}`}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Meal Plan Selection */}
            <div className="space-y-2">
              <FormLabel className="text-base font-medium">Select Meal Plan</FormLabel>
              <Select
                value={selectedMealPlanId || ""}
                onValueChange={setSelectedMealPlanId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a meal plan..." />
                </SelectTrigger>
                <SelectContent>
                  {mealPlans.map((mealPlan) => (
                    <SelectItem key={mealPlan.id} value={mealPlan.id}>
                      {mealPlan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Occupancy Selection */}
            <div className="space-y-4">
              <FormLabel className="text-base font-medium">Guest Occupancy Details</FormLabel>
              
              {/* Add New Occupancy */}
              <div className="grid grid-cols-12 gap-2 items-end p-3 bg-gray-50 rounded-lg">
                <div className="col-span-6">
                  <FormLabel className="text-sm">Occupancy Type</FormLabel>
                  <Select
                    value={newOccupancyTypeId}
                    onValueChange={setNewOccupancyTypeId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select occupancy type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {occupancyTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-4">
                  <FormLabel className="text-sm">Count</FormLabel>
                  <Input
                    type="number"
                    min="1"
                    value={newOccupancyCount}
                    onChange={(e) => setNewOccupancyCount(parseInt(e.target.value) || 1)}
                    placeholder="1"
                  />
                </div>
                <div className="col-span-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (newOccupancyTypeId) {
                        const occupancyType = occupancyTypes.find(ot => ot.id === newOccupancyTypeId);
                        let paxPerUnit = 1;
                        
                        if (occupancyType?.name?.toLowerCase().includes('double')) {
                          paxPerUnit = 2;
                        } else if (occupancyType?.name?.toLowerCase().includes('triple')) {
                          paxPerUnit = 3;
                        }

                        setOccupancySelections([...occupancySelections, {
                          occupancyTypeId: newOccupancyTypeId,
                          count: newOccupancyCount,
                          paxPerUnit
                        }]);
                        setNewOccupancyTypeId("");
                        setNewOccupancyCount(1);
                      }
                    }}
                    disabled={!newOccupancyTypeId}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Current Occupancy Selections */}
              {occupancySelections.length > 0 && (
                <div className="space-y-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Occupancy Type</TableHead>
                        <TableHead>Count</TableHead>
                        <TableHead>Pax per Unit</TableHead>
                        <TableHead>Total Pax</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {occupancySelections.map((selection, index) => {
                        const occupancyType = occupancyTypes.find(ot => ot.id === selection.occupancyTypeId);
                        return (
                          <TableRow key={index}>
                            <TableCell>{occupancyType?.name || 'Unknown'}</TableCell>
                            <TableCell>{selection.count}</TableCell>
                            <TableCell>{selection.paxPerUnit}</TableCell>
                            <TableCell>{selection.count * selection.paxPerUnit}</TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  setOccupancySelections(occupancySelections.filter((_, i) => i !== index));
                                }}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow>
                        <TableCell colSpan={3} className="font-medium">Total Guests:</TableCell>
                        <TableCell className="font-bold">{calculateTotalPax()}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Calculation Results */}
        {priceCalculationResult && (
          <div className="space-y-4">
            <FormLabel className="text-base font-medium">Price Calculation Result</FormLabel>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-green-700">Total Price</p>
                  <p className="text-lg font-bold text-green-900">
                    ₹{priceCalculationResult.totalPrice?.toLocaleString() || '0'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-green-700">Total Guests</p>
                  <p className="text-lg font-bold text-green-900">
                    {priceCalculationResult.totalGuests || calculateTotalPax()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PricingTab;
