// filepath: d:\next13-ecommerce-admin\src\components\tour-package-query\PricingTab.tsx
import { Control, useFieldArray, useWatch } from "react-hook-form";
import { Calculator, Plus, Trash, DollarSign, Loader2 } from "lucide-react"; // Added icons
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";

// Import form value types
import { TourPackageQueryFormValues } from "@/app/(dashboard)/tourPackageQuery/[tourPackageQueryId]/components/tourPackageQuery-form"; // Adjust path if needed
import { TourPackageQueryCreateCopyFormValues } from "@/app/(dashboard)/tourPackageQueryCreateCopy/[tourPackageQueryCreateCopyId]/components/tourPackageQueryCreateCopy-form"; // Adjust path if needed

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
import { Checkbox } from "@/components/ui/checkbox";
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

// Define interface for number of rooms selection
interface RoomConfiguration {
  numberOfRooms: number;
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
  );  // State for Tour Package Pricing selection criteria
  const [selectedMealPlanId, setSelectedMealPlanId] = useState<string | null>(null);  // State for number of rooms
  const [numberOfRooms, setNumberOfRooms] = useState<number>(1);
  // State for tour package details
  const [tourPackageName, setTourPackageName] = useState<string>("");
  const [isFetchingPackage, setIsFetchingPackage] = useState<boolean>(false);
  // State for available pricing components from matched tour package pricing
  const [availablePricingComponents, setAvailablePricingComponents] = useState<any[]>([]);  // State for selected pricing components
  const [selectedPricingComponentIds, setSelectedPricingComponentIds] = useState<string[]>([]);
  // State for room quantities per component (componentId -> quantity)
  const [componentRoomQuantities, setComponentRoomQuantities] = useState<Record<string, number>>({});
  // State to track if pricing components have been fetched
  const [pricingComponentsFetched, setPricingComponentsFetched] = useState<boolean>(false);
  // State to track initial load to prevent loops
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);// Fetch tour package details when selectedTemplateId changes
  useEffect(() => {
    if (selectedTemplateId && selectedTemplateType === 'TourPackage') {
      // Try to get tour package name from form first
      const nameFromForm = form.getValues('tourPackageTemplateName');
      
      if (nameFromForm) {
        setTourPackageName(nameFromForm);
        return; // Don't fetch if we already have the name
      }
            
      // Otherwise, get the name from the API
      setIsFetchingPackage(true);
      
      axios.get(`/api/tourPackages/${selectedTemplateId}`)
        .then(response => {
          const packageData = response.data;
          if (packageData) {
            const packageName = packageData.name || packageData.tourPackageName || `Package ${selectedTemplateId.substring(0, 8)}...`;
            setTourPackageName(packageName);
            // Save to form for future use
            form.setValue('tourPackageTemplateName', packageName);
          }
        })
        .catch(error => {
          console.error("Error fetching tour package details:", error);
          setTourPackageName(`Package ${selectedTemplateId.substring(0, 8)}...`);
        })
        .finally(() => {
          setIsFetchingPackage(false);
        });
    } else {
      setTourPackageName("");
    }
  }, [selectedTemplateId, selectedTemplateType, form]);  // Load and handle saved meal plan and room configuration
  useEffect(() => {
    // Try to restore any saved meal plan and room configuration
    const savedMealPlanId = form.getValues('selectedMealPlanId');
    const savedNumberOfRooms = form.getValues('numberOfRooms');
    
    if (savedMealPlanId && !selectedMealPlanId) {
      console.log('Restoring saved meal plan ID:', savedMealPlanId);
      setSelectedMealPlanId(savedMealPlanId);    }
    
    // Only restore numberOfRooms if it's different AND we haven't manually changed it
    if (savedNumberOfRooms && savedNumberOfRooms > 0 && savedNumberOfRooms !== numberOfRooms) {
      console.log('Restoring saved number of rooms:', savedNumberOfRooms);
      setNumberOfRooms(savedNumberOfRooms);
    }
  }, [selectedTemplateId, selectedTemplateType, form, selectedMealPlanId, numberOfRooms]);
  // Update our local state when the form value changes
  useEffect(() => {
    const subscription = form.watch((value: any, { name }: { name: string }) => {
      if (name === 'tourPackageTemplateName' && value.tourPackageTemplateName) {
        setTourPackageName(value.tourPackageTemplateName);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form]);  // Initialize data from form when component loads
  useEffect(() => {
    if (!isInitialLoad) return; // Only run on initial load
    
    // Initialize from form data when component mounts
    const initializeFromForm = () => {
      // Get stored data from form
      const storedMealPlanId = form.getValues('selectedMealPlanId');
      const storedNumberOfRooms = form.getValues('numberOfRooms');
      const storedTourPackageName = form.getValues('tourPackageTemplateName');
      
      // Set tour package name if available
      if (storedTourPackageName) {
        setTourPackageName(storedTourPackageName);
      }
      
      // Set meal plan if available
      if (storedMealPlanId) {
        setSelectedMealPlanId(storedMealPlanId);
      }
      
      // Set number of rooms if available
      if (storedNumberOfRooms && storedNumberOfRooms > 0) {
        setNumberOfRooms(storedNumberOfRooms);
      }
      
      // Mark initial load as complete
      setIsInitialLoad(false);
    };
    
    // Run initialization
    initializeFromForm();
  }, [form, isInitialLoad]);

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
  };  // Function to handle updating number of rooms
  const handleRoomCountChange = (newCount: number) => {
    if (newCount >= 1) {
      setNumberOfRooms(newCount);
      // Reset pricing components when room count changes
      setAvailablePricingComponents([]);
      setSelectedPricingComponentIds([]);
      setComponentRoomQuantities({});
      setPricingComponentsFetched(false);
    }
  };

  // Function to handle fetching available pricing components without applying them
  const handleFetchAvailablePricingComponents = async () => {
    const tourPackageTemplateId = selectedTemplateId || form.getValues('tourPackageTemplate');
    if (!tourPackageTemplateId) {
      toast.error("Please select a Tour Package Template first in the Basic Info tab.");
      return;
    }

    if (selectedTemplateType !== 'TourPackage') {
      toast.error("Auto calculation of pricing is only available for Tour Package templates.");
      return;
    }

    if (!selectedMealPlanId) {
      toast.error("Please select a Meal Plan for Tour Package Pricing.");
      return;
    }

    if (numberOfRooms <= 0) {
      toast.error("Number of rooms must be greater than 0.");
      return;
    }

    const queryStartDate = form.getValues('tourStartsFrom');
    const queryEndDate = form.getValues('tourEndsOn');
    if (!queryStartDate || !queryEndDate) {
      toast.error("Please select Tour Start and End Dates first.");
      return;
    }

    toast.loading("Fetching available pricing components...");
    try {
      const response = await axios.get(`/api/tourPackages/${tourPackageTemplateId}/pricing`);
      const tourPackagePricings = response.data;
      toast.dismiss();

      if (!tourPackagePricings || tourPackagePricings.length === 0) {
        toast.error("No pricing periods found for the selected tour package.");
        return;
      }

      // Filter matching pricing periods
      const matchedPricings = tourPackagePricings.filter((p: any) => {
        const periodStart = new Date(p.startDate);
        const periodEnd = new Date(p.endDate);
        const isDateMatch = queryStartDate >= periodStart && queryEndDate <= periodEnd;
        const isMealPlanMatch = p.mealPlanId === selectedMealPlanId;
        const isRoomMatch = p.numberOfRooms === numberOfRooms;

        return isDateMatch && isMealPlanMatch && isRoomMatch;
      });

      if (matchedPricings.length === 0) {
        toast.error(`No matching pricing period found for the selected criteria (Date, Meal Plan, ${numberOfRooms} Room${numberOfRooms > 1 ? 's' : ''}).`);
        setAvailablePricingComponents([]);
        setPricingComponentsFetched(false);
        return;
      }

      if (matchedPricings.length > 1) {
        console.warn("Multiple matching pricing periods found:", matchedPricings);
        toast.error("Multiple pricing periods match the criteria. Cannot automatically fetch components. Please refine Tour Package pricing definitions.");        setAvailablePricingComponents([]);
        setPricingComponentsFetched(false);
        return;
      }

      // Get components from the matched pricing
      const selectedPricing = matchedPricings[0];
      const components = selectedPricing.pricingComponents || [];
      
      setAvailablePricingComponents(components);
      setPricingComponentsFetched(true);
      
      // Initially select all components and set default room quantities
      const allComponentIds = components.map((comp: any) => comp.id);
      setSelectedPricingComponentIds(allComponentIds);
      
      // Initialize room quantities for all components (default to 1)
      const initialQuantities: Record<string, number> = {};
      components.forEach((comp: any) => {
        initialQuantities[comp.id] = 1;
      });
      setComponentRoomQuantities(initialQuantities);

      toast.success(`Found ${components.length} pricing component${components.length !== 1 ? 's' : ''} available for selection.`);

    } catch (error) {
      toast.dismiss();
      console.error("Error fetching pricing components:", error);
      toast.error("Failed to fetch pricing components.");
      setAvailablePricingComponents([]);
      setPricingComponentsFetched(false);
    }
  };
  // Function to handle toggling pricing component selection
  const handleTogglePricingComponent = (componentId: string) => {
    setSelectedPricingComponentIds(prev => {
      if (prev.includes(componentId)) {
        return prev.filter(id => id !== componentId);
      } else {
        return [...prev, componentId];
      }
    });
  };
  // Function to handle changing room quantity for a specific component
  const handleComponentRoomQuantityChange = (componentId: string, newQuantity: number) => {
    if (newQuantity >= 1) {
      setComponentRoomQuantities(prev => ({
        ...prev,
        [componentId]: newQuantity
      }));
    }
  };

  // Function to get occupancy multiplier from component name
  const getOccupancyMultiplier = (componentName: string): number => {
    const name = componentName.toLowerCase();
    
    if (name.includes('single')) {
      return 1;
    } else if (name.includes('double')) {
      return 2;
    } else if (name.includes('triple')) {
      return 3;
    } else if (name.includes('quad')) {
      return 4;
    }
    
    // Default to 1 if no occupancy type is detected (for components like "per person", etc.)
    return 1;
  };

  // Function to calculate total price for a component including occupancy and room quantity
  const calculateComponentTotalPrice = (component: any, roomQuantity: number = 1): number => {
    const basePrice = parseFloat(component.price || '0');
    const componentName = component.pricingAttribute?.name || '';
    const occupancyMultiplier = getOccupancyMultiplier(componentName);
    
    return basePrice * occupancyMultiplier * roomQuantity;
  };
  // Function to apply selected pricing components
  const handleApplySelectedPricingComponents = () => {
    if (selectedPricingComponentIds.length === 0) {
      toast.error("Please select at least one pricing component to apply.");
      return;
    }

    // Filter available components by selected IDs
    const componentsToApply = availablePricingComponents.filter((comp: any) => 
      selectedPricingComponentIds.includes(comp.id)
    );    // Create pricing components for the form
    const finalPricingComponents: { name: string; price: string; description: string }[] = [];
    let totalPrice = 0;    componentsToApply.forEach((comp: any) => {
      const componentName = comp.pricingAttribute?.name || 'Pricing Component';
      const basePrice = parseFloat(comp.price || '0');
      const roomQuantity = componentRoomQuantities[comp.id] || 1;
      const occupancyMultiplier = getOccupancyMultiplier(componentName);
      const totalComponentPrice = calculateComponentTotalPrice(comp, roomQuantity);
      
      finalPricingComponents.push({
        name: componentName,
        price: totalComponentPrice.toString(),
        description: roomQuantity === 1 
          ? `Component for ${roomQuantity} room (${basePrice.toFixed(2)} × ${occupancyMultiplier} occupancy)` 
          : `Component for ${roomQuantity} rooms (${basePrice.toFixed(2)} × ${occupancyMultiplier} occupancy × ${roomQuantity} rooms)`
      });
      
      totalPrice += totalComponentPrice;
    });

    // Set the calculated values to the form
    form.setValue('totalPrice', totalPrice.toString());
    form.setValue('pricingSection', finalPricingComponents);

    toast.success(`Applied ${componentsToApply.length} selected pricing component${componentsToApply.length !== 1 ? 's' : ''} successfully!`);
  };  // Note: Old occupancy-based calculation functions removed - now using room + meal plan model
  // Function to handle fetching and applying Tour Package Pricing (Legacy - kept for backward compatibility)
  const handleFetchTourPackagePricing = async () => {
    // First check if we have a selected template id from props
    const tourPackageTemplateId = selectedTemplateId || form.getValues('tourPackageTemplate');
    if (!tourPackageTemplateId) {
      toast.error("Please select a Tour Package Template first in the Basic Info tab.");
      return;
    }

    // Check if the selectedTemplateType is 'TourPackage'
    if (selectedTemplateType !== 'TourPackage') {
      toast.error("Auto calculation of pricing is only available for Tour Package templates.");
      return;
    }

    // Check required fields for new model
    if (!selectedMealPlanId) {
      toast.error("Please select a Meal Plan for Tour Package Pricing.");
      return;
    }

    if (numberOfRooms <= 0) {
      toast.error("Number of rooms must be greater than 0.");
      return;
    }

    const queryStartDate = form.getValues('tourStartsFrom');
    const queryEndDate = form.getValues('tourEndsOn');
    if (!queryStartDate || !queryEndDate) {
      toast.error("Please select Tour Start and End Dates first.");
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
      }

      // Enhanced Filtering Logic for new schema (Number of Rooms + Meal Plan)
      const matchedPricings = tourPackagePricings.filter((p: any) => {
        const periodStart = new Date(p.startDate);
        const periodEnd = new Date(p.endDate);
        const isDateMatch = queryStartDate >= periodStart && queryEndDate <= periodEnd;
        const isMealPlanMatch = p.mealPlanId === selectedMealPlanId;
        const isRoomMatch = p.numberOfRooms === numberOfRooms;

        return isDateMatch && isMealPlanMatch && isRoomMatch;
      });

      if (matchedPricings.length === 0) {
        toast.error(`No matching pricing period found for the selected criteria (Date, Meal Plan, ${numberOfRooms} Room${numberOfRooms > 1 ? 's' : ''}).`);
        return;
      }

      if (matchedPricings.length > 1) {
        console.warn("Multiple matching pricing periods found:", matchedPricings);
        toast.error("Multiple pricing periods match the criteria. Cannot automatically apply price. Please refine Tour Package pricing definitions.");
        return;
      }

      // Apply the uniquely matched pricing
      const selectedPricing = matchedPricings[0];      // Create pricing components from the matched pricing
      const finalPricingComponents: { name: string; price: string; description: string }[] = [];
      let totalPrice = 0;

      // Process all pricing components from the matched tour package pricing
      if (selectedPricing.pricingComponents && selectedPricing.pricingComponents.length > 0) {
        selectedPricing.pricingComponents.forEach((comp: any) => {
          const componentName = comp.pricingAttribute?.name || 'Pricing Component';
          const componentPrice = parseFloat(comp.price || '0');
          
          finalPricingComponents.push({
            name: componentName,
            price: comp.price || '0',
            description: `Component for ${numberOfRooms} room${numberOfRooms > 1 ? 's' : ''}`
          });
          
          totalPrice += componentPrice;
        });
      }

      // If no pricing components found, create a basic one
      if (finalPricingComponents.length === 0) {
        finalPricingComponents.push({
          name: 'Tour Package Price',
          price: '0',
          description: `Package price for ${numberOfRooms} room${numberOfRooms > 1 ? 's' : ''}`
        });
      }

      // Set the calculated values to the form
      form.setValue('totalPrice', totalPrice.toString());
      form.setValue('pricingSection', finalPricingComponents);

      toast.success("Tour package pricing applied successfully!");

    } catch (error) {
      toast.dismiss();
      console.error("Error fetching/applying tour package pricing:", error);
      toast.error("Failed to fetch or apply tour package pricing.");
    }
  };// Function to fetch and set the tour package name based on ID
  const fetchTourPackageName = useCallback(async (packageId: string) => {
    if (!packageId) {
      setTourPackageName("");
      return;
    }

    // First check if we already have the name from the form
    const nameFromForm = form.getValues('tourPackageTemplateName');
    if (nameFromForm) {
      // If we already have a name in the form, use it
      setTourPackageName(nameFromForm);
      return;
    }    try {
      const response = await axios.get(`/api/tourPackages/${packageId}`);
      const tourPackage = response.data;
      const packageName = tourPackage.name || `Package ${packageId.substring(0, 8)}...`;
      setTourPackageName(packageName);
      // Save to form for future use
      form.setValue('tourPackageTemplateName', packageName);
    } catch (error) {
      console.error("Error fetching tour package name:", error);
      setTourPackageName(`Package ${packageId.substring(0, 8)}...`);
    }
  }, [form]);

  // Reset calculation method when selectedTemplateType changes
  useEffect(() => {
    if (selectedTemplateType !== 'TourPackage') {
      setCalculationMethod('manual');
    }
  }, [selectedTemplateType]);

  // Handle template type change - reset to manual calculation if not a Tour Package
  useEffect(() => {
    if (selectedTemplateType !== 'TourPackage' && calculationMethod === 'autoTourPackage') {
      setCalculationMethod('manual');
      toast.error("Auto calculation is only available for Tour Packages. Switched to manual pricing.");
    }
  }, [selectedTemplateType, calculationMethod]);

  // Fetch tour package name when selectedTemplateId changes
  useEffect(() => {
    fetchTourPackageName(selectedTemplateId || "");
  }, [selectedTemplateId, fetchTourPackageName]);  // When meal plan and room configuration change, save them to the form
  useEffect(() => {
    if (selectedMealPlanId) {
      const currentFormValue = form.getValues('selectedMealPlanId');
      // Only update form if the value is actually different
      if (currentFormValue !== selectedMealPlanId) {
        form.setValue('selectedMealPlanId', selectedMealPlanId);
      }      // Reset pricing components when meal plan changes
      setAvailablePricingComponents([]);
      setSelectedPricingComponentIds([]);
      setComponentRoomQuantities({});
      setPricingComponentsFetched(false);
    }
  }, [selectedMealPlanId, form]);
  // When number of rooms changes, save it to the form (but avoid circular updates)
  useEffect(() => {
    if (numberOfRooms > 0) {
      const currentFormValue = form.getValues('numberOfRooms');
      // Only update form if the value is actually different
      if (currentFormValue !== numberOfRooms) {
        form.setValue('numberOfRooms', numberOfRooms);
      }      // Reset pricing components when room count changes
      setAvailablePricingComponents([]);
      setSelectedPricingComponentIds([]);
      setComponentRoomQuantities({});
      setPricingComponentsFetched(false);
    }
  }, [numberOfRooms, form]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" /> {/* Added icon */}
          Pricing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Pricing Calculation Method Selection */}
        <FormItem className="space-y-3">
          <FormLabel className="text-base font-semibold">Pricing Calculation Method</FormLabel>
          <FormControl>
            <RadioGroup
              onValueChange={(value: CalculationMethod) => setCalculationMethod(value)}
              defaultValue={calculationMethod}
              className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 pt-2"
            >
              <FormItem className="flex items-center space-x-3 space-y-0">
                <FormControl>
                  <RadioGroupItem value="manual" id="manual-pricing" />
                </FormControl>
                <FormLabel htmlFor="manual-pricing" className="font-normal cursor-pointer">Manual Pricing</FormLabel>
              </FormItem>
              <FormItem className="flex items-center space-x-3 space-y-0">
                <FormControl>
                  <RadioGroupItem value="autoHotelTransport" id="auto-hotel-transport" />
                </FormControl>
                <FormLabel htmlFor="auto-hotel-transport" className="font-normal cursor-pointer">Auto Calculate (Hotel & Transport)</FormLabel>
              </FormItem>
              <FormItem className="flex items-center space-x-3 space-y-0">
                <FormControl>
                  <RadioGroupItem 
                    value="autoTourPackage" 
                    id="auto-tour-package"
                    disabled={!selectedTemplateId || selectedTemplateType !== 'TourPackage'} 
                  />
                </FormControl>
                <FormLabel 
                  htmlFor="auto-tour-package" 
                  className={`font-normal ${(!selectedTemplateId || selectedTemplateType !== 'TourPackage') ? 'text-gray-400 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  Use Tour Package Pricing
                  {(!selectedTemplateId || selectedTemplateType !== 'TourPackage') && (
                    <span className="text-xs text-amber-500 block">
                      {!selectedTemplateId ? "Select a tour package first" : "Only for Tour Package templates"}
                    </span>
                  )}
                </FormLabel>
              </FormItem>
            </RadioGroup>
          </FormControl>
        </FormItem>

        {/* Conditional Sections based on calculationMethod */}

        {/* Auto-calculate pricing section (Hotel & Transport) */}
        {calculationMethod === 'autoHotelTransport' && (
          <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-blue-800">Auto Price (Hotel & Transport)</h3>
                <div id="price-calculating-spinner" className="hidden animate-spin rounded-full h-5 w-5 border-b-2 border-blue-800"></div>
                <div id="calculation-status" className="hidden text-sm px-2 py-1 rounded"></div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center w-full sm:w-auto">
                <div className="flex items-center">
                  <label htmlFor="markup" className="text-sm mr-2 text-blue-700 whitespace-nowrap">Markup %:</label>
                  <Input
                    id="markup"
                    type="number"
                    className="w-20 h-8 bg-white"
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
                    <SelectTrigger className="w-36 h-8 bg-white">
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
                        calculationStatus.classList.remove('hidden', 'bg-green-100', 'text-green-700', 'bg-red-100', 'text-red-700');
                        calculationStatus.classList.add('bg-blue-100', 'text-blue-700');
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
                        if (calculationStatus) {
                          calculationStatus.textContent = 'Error';
                          calculationStatus.classList.remove('bg-blue-100', 'text-blue-700');
                          calculationStatus.classList.add('bg-red-100', 'text-red-700');
                        }
                        if (calculatingElement) calculatingElement.classList.add('hidden');
                        return;
                      }
                      const validItineraries = itineraries.filter((itinerary: any) => {
                        return itinerary.hotelId &&
                          hotels.some(hotel => hotel.id === itinerary.hotelId);
                      });
                      if (validItineraries.length === 0) {
                        toast.error('Please select hotels for at least one day to calculate pricing');
                        if (calculationStatus) {
                          calculationStatus.textContent = 'Error';
                          calculationStatus.classList.remove('bg-blue-100', 'text-blue-700');
                          calculationStatus.classList.add('bg-red-100', 'text-red-700');
                        }
                        if (calculatingElement) calculatingElement.classList.add('hidden');
                        return;
                      }
                      toast('Calculating room prices...'); // Changed to info -> Changed to base toast
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
                        if (calculationStatus) {
                          calculationStatus.textContent = 'Complete';
                          calculationStatus.classList.remove('bg-blue-100', 'text-blue-700');
                          calculationStatus.classList.add('bg-green-100', 'text-green-700');
                          setTimeout(() => {
                            calculationStatus.classList.add('hidden');
                          }, 3000);
                        }
                      } else {
                        console.error('Invalid price calculation result structure:', result);
                        toast.error('Invalid price calculation result: The server returned an unexpected response');
                        if (calculationStatus) {
                          calculationStatus.textContent = 'Error';
                          calculationStatus.classList.remove('bg-blue-100', 'text-blue-700');
                          calculationStatus.classList.add('bg-red-100', 'text-red-700');
                        }
                      }
                      if (calculatingElement) calculatingElement.classList.add('hidden');
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
                      const spinnerElement = document.getElementById('price-calculating-spinner');
                      const statusElement = document.getElementById('calculation-status');
                      if (spinnerElement) spinnerElement.classList.add('hidden');
                      if (statusElement) {
                        statusElement.textContent = 'Error';
                        statusElement.classList.remove('bg-blue-100', 'text-blue-700', 'bg-green-100', 'text-green-700');
                        statusElement.classList.add('bg-red-100', 'text-red-700');
                      }
                    }
                  }}
                  variant="outline"
                  className="bg-blue-500 hover:bg-blue-600 text-white border-blue-600"
                  disabled={loading}
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
                    // Optionally reset total price and pricing section in the form
                    // form.setValue('totalPrice', '0');
                    // form.setValue('pricingSection', []);
                    toast.success('Price calculation reset');
                    const statusElement = document.getElementById('calculation-status');
                    if (statusElement) statusElement.classList.add('hidden');
                  }}
                  variant="outline"
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 border-gray-300"
                  disabled={loading}
                >
                  Reset
                </Button>
              </div>
            </div>

            {/* Price Calculation Result Table */}
            {priceCalculationResult && priceCalculationResult.itineraryBreakdown?.length > 0 && (
              <div className="mt-6 border border-blue-200 rounded-lg overflow-hidden bg-white shadow-sm">
                <Table>
                  <TableCaption className="py-3 bg-blue-50">Detailed Pricing Breakdown</TableCaption>
                  <TableHeader>
                    <TableRow className="bg-blue-100">
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
                      priceCalculationResult.itineraryBreakdown?.forEach((item: any) => {
                        days.add(item.day);
                      });
                      priceCalculationResult.transportDetails?.forEach((transport: any) => {
                        days.add(transport.day);
                      });
                      const sortedDays = Array.from(days).sort((a, b) => a - b);
                      return sortedDays.map(day => {
                        const accommodation = priceCalculationResult.itineraryBreakdown?.find((item: any) => item.day === day);
                        const transports = priceCalculationResult.transportDetails?.filter((transport: any) => transport.day === day);
                        const transportCost = transports?.reduce((sum: number, transport: any) => sum + transport.totalCost, 0) || 0;
                        const formItineraries = form.getValues('itineraries');
                        const originalItinerary = formItineraries.find((it: any) => it.dayNumber === day);
                        const hotelName = originalItinerary && hotels.find((h: any) => h.id === originalItinerary.hotelId)?.name;
                        const roomAllocations = originalItinerary?.roomAllocations || [];
                        const accommodationCost = accommodation?.accommodationCost || 0;
                        const dayTotal = accommodationCost + transportCost;
                        return (
                          <TableRow key={`day-${day}`}>
                            <TableCell className="font-medium">Day {day}</TableCell>
                            <TableCell>
                              {hotelName ? (
                                <div>
                                  <span className="font-medium text-sm text-gray-800 block mb-1">{hotelName}</span>
                                  {roomAllocations.map((allocation: any, allocIdx: number) => {
                                    const roomTypeName = roomTypes.find(rt => rt.id === allocation.roomTypeId)?.name || "N/A";
                                    const occupancyTypeName = occupancyTypes.find(ot => ot.id === allocation.occupancyTypeId)?.name || "N/A";
                                    const quantity = allocation.quantity || 1;
                                    const roomBreakdown = priceCalculationResult?.itineraryBreakdown?.find((ib: any) => ib.day === day)?.roomBreakdown;
                                    const roomCost = roomBreakdown?.find((rb: any) =>
                                      rb.roomTypeId === allocation.roomTypeId &&
                                      rb.occupancyTypeId === allocation.occupancyTypeId &&
                                      rb.mealPlanId === allocation.mealPlanId
                                    );
                                    const allocationTotalCost = roomCost ? roomCost.totalCost : 0;
                                    const pricePerNight = roomCost ? roomCost.pricePerNight : 0;
                                    return (
                                      <div key={allocIdx} className="text-xs text-gray-600 mb-1 pl-2 border-l-2 border-blue-100">
                                        <span>{roomTypeName} ({occupancyTypeName}) {quantity > 1 ? `x ${quantity}` : ''}</span>
                                        <span className="font-medium text-blue-700 ml-2">
                                          {allocationTotalCost > 0 && pricePerNight > 0 && quantity > 1
                                            ? `₹${pricePerNight.toFixed(2)} x ${quantity} = ₹${allocationTotalCost.toFixed(2)}`
                                            : allocationTotalCost > 0
                                              ? `₹${allocationTotalCost.toFixed(2)}`
                                              : '₹0.00'}
                                        </span>
                                      </div>
                                    );
                                  })}
                                  {transports && transports.length > 0 && transports.map((transport: any, transportIdx: number) => {
                                    const vehicleTypeName = vehicleTypes.find(vt => vt.id === transport.vehicleTypeId)?.name || transport.vehicleType || "Unknown";
                                    const transportCost = transport.totalCost || 0;
                                    const pricePerUnit = transport.pricePerUnit || 0;
                                    const quantity = transport.quantity || 1;
                                    return (
                                      <div key={`transport-${transportIdx}`} className="text-xs text-gray-600 mt-1 pl-2 border-l-2 border-green-100">
                                        <span>Transport: {vehicleTypeName} {quantity > 1 ? `x ${quantity}` : ''}</span>
                                        <span className="font-medium text-green-700 ml-2">
                                          {transportCost > 0 && pricePerUnit > 0 && quantity > 1
                                            ? `₹${pricePerUnit.toFixed(2)} x ${quantity} = ₹${transportCost.toFixed(2)}`
                                            : transportCost > 0
                                              ? `₹${transportCost.toFixed(2)}`
                                              : '₹0.00'}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : transports && transports.length > 0 ? (
                                <div>
                                  {transports.map((transport: any, transportIdx: number) => {
                                    const vehicleTypeName = vehicleTypes.find(vt => vt.id === transport.vehicleTypeId)?.name || transport.vehicleType || "Unknown";
                                    const transportCost = transport.totalCost || 0;
                                    const pricePerUnit = transport.pricePerUnit || 0;
                                    const quantity = transport.quantity || 1;
                                    return (
                                      <div key={`transport-only-${transportIdx}`} className="text-xs text-gray-600 pl-2 border-l-2 border-green-100">
                                        <span>Transport: {vehicleTypeName} {quantity > 1 ? `x ${quantity}` : ''}</span>
                                        <span className="font-medium text-green-700 ml-2">
                                          {transportCost > 0 && pricePerUnit > 0 && quantity > 1
                                            ? `₹${pricePerUnit.toFixed(2)} x ${quantity} = ₹${transportCost.toFixed(2)}`
                                            : transportCost > 0
                                              ? `₹${transportCost.toFixed(2)}`
                                              : '₹0.00'}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>) : (
                                <span className="text-xs text-gray-400">No hotel/transport</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {accommodationCost ? `₹${accommodationCost.toFixed(2)}` : '-'}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {transportCost ? `₹${transportCost.toFixed(2)}` : '-'}
                            </TableCell>
                            <TableCell className="text-right font-medium text-sm">
                              {`₹${dayTotal.toFixed(2)}`}
                            </TableCell>
                          </TableRow>
                        );
                      });
                    })()}
                    <TableRow className="bg-blue-50">
                      <TableCell colSpan={4} className="font-medium text-right text-sm">Base Accommodation Cost</TableCell>
                      <TableCell className="text-right font-bold text-sm">₹{priceCalculationResult.breakdown.accommodation.toFixed(2)}</TableCell>
                    </TableRow>
                    <TableRow className="bg-blue-50">
                      <TableCell colSpan={4} className="font-medium text-right text-sm">Base Transport Cost</TableCell>
                      <TableCell className="text-right font-bold text-sm">₹{priceCalculationResult.breakdown.transport.toFixed(2)}</TableCell>
                    </TableRow>
                    <TableRow className="bg-blue-100">
                      <TableCell colSpan={4} className="font-medium text-right text-sm">Total Base Cost</TableCell>
                      <TableCell className="text-right font-bold text-sm">
                        ₹{(priceCalculationResult.breakdown.accommodation + priceCalculationResult.breakdown.transport).toFixed(2)}
                      </TableCell>
                    </TableRow>
                    {priceCalculationResult.appliedMarkup && (
                      <TableRow className="bg-blue-100">
                        <TableCell colSpan={4} className="font-medium text-right text-sm">Markup ({priceCalculationResult.appliedMarkup.percentage}%)</TableCell>
                        <TableCell className="text-right font-bold text-sm">₹{priceCalculationResult.appliedMarkup.amount.toFixed(2)}</TableCell>
                      </TableRow>
                    )}
                    <TableRow className="bg-blue-200">
                      <TableCell colSpan={4} className="font-medium text-right text-base">Final Total Cost</TableCell>
                      <TableCell className="text-right font-bold text-base">₹{priceCalculationResult.totalCost.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {/* Use Tour Package Pricing Section */}
        {calculationMethod === 'autoTourPackage' && (
          <div className="border border-green-200 bg-green-50 rounded-lg p-4 space-y-4">
            <h3 className="text-lg font-semibold text-green-800 mb-3">Use Tour Package Pricing</h3>
            
            {(!selectedTemplateId || selectedTemplateType !== 'TourPackage') ? (
              <div className="bg-amber-50 text-amber-800 border border-amber-200 rounded-md p-3">
                <p className="text-sm font-medium">
                  {!selectedTemplateId ? (
                    "Please select a Tour Package template first in the Basic Info tab."
                  ) : (
                    "Auto calculation of pricing is only available for Tour Package templates."
                  )}
                </p>
              </div>
            ) : (
              <>                <div className="bg-white border border-green-200 rounded-md p-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">Selected Tour Package:</p>
                    {isFetchingPackage ? (
                      <div className="flex items-center">
                        <div className="animate-spin h-4 w-4 border-2 border-green-500 border-t-transparent rounded-full mr-2"></div>
                        <p className="font-medium text-sm">Loading package details...</p>
                      </div>
                    ) : (
                      <p className="font-medium">
                        {tourPackageName || form.getValues('tourPackageTemplateName') || `Package ID: ${selectedTemplateId}`}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Navigate to the basicInfo tab
                      try {
                        // First try to find the tab container
                        const tabsElement = document.querySelector('[role="tablist"]');
                        if (tabsElement) {
                          // Try various selectors for the basic info tab
                          let basicInfoTab = tabsElement.querySelector('button[data-value="basic"], button[value="basic"], button[data-value="basicInfo"], button[value="basicInfo"]') as HTMLButtonElement;
                          
                          if (!basicInfoTab) {
                            // Try finding by text content
                            const allTabs = tabsElement.querySelectorAll('button');
                            basicInfoTab = Array.from(allTabs).find(tab => 
                              tab.textContent?.toLowerCase().includes('basic') || 
                              tab.getAttribute('value')?.toLowerCase().includes('basic') ||
                              tab.getAttribute('data-value')?.toLowerCase().includes('basic')
                            ) as HTMLButtonElement;
                          }
                          
                          if (basicInfoTab) {
                            toast.success("Navigating to Basic Info tab");
                            console.log("Clicking on tab:", basicInfoTab);
                            basicInfoTab.click();
                          } else {
                            // Last resort - just try to click the first tab
                            const firstTab = tabsElement.querySelector('button') as HTMLButtonElement;
                            if (firstTab) {
                              toast.success("Navigating to first tab");
                              firstTab.click();
                            } else {
                              console.error("Could not find any tab");
                              toast.error("Could not navigate to Basic Info tab. Please select it manually.");
                            }
                          }
                        } else {
                          toast.error("Tab navigation not found. Please select Basic Info tab manually.");
                        }
                      } catch (error) {
                        console.error("Error navigating tabs:", error);
                        toast.error("Navigation error. Please select Basic Info tab manually.");
                      }
                    }}
                    className="bg-green-100 hover:bg-green-200 text-green-800 border-green-300"
                  >
                    Change
                  </Button>
                </div>                <p className="text-sm text-green-700">
                  Fetch pre-defined pricing based on the selected Tour Package Template, Number of Rooms, and Meal Plan.
                  This will overwrite the current Total Price and Pricing Options below.
                </p>

                {/* Meal Plan Selection */}
                <FormItem className="space-y-2">
                  <FormLabel className="font-medium">Meal Plan <span className="text-red-500">*</span></FormLabel>
                  <Select
                    disabled={loading}
                    onValueChange={setSelectedMealPlanId}
                    value={selectedMealPlanId || undefined}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-white">
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
                  {!selectedMealPlanId && <p className="text-xs text-red-500 pt-1">Required</p>}
                </FormItem>

                {/* Number of Rooms Selection */}
                <FormItem className="space-y-2">
                  <FormLabel className="font-medium">Number of Rooms <span className="text-red-500">*</span></FormLabel>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="rounded-full w-8 h-8 flex-shrink-0 bg-white"
                      onClick={() => handleRoomCountChange(numberOfRooms - 1)}
                      disabled={loading || numberOfRooms <= 1}
                    >
                      <span className="sr-only">Decrease</span>
                      <span className="text-lg font-bold">-</span>
                    </Button>
                    <Input
                      type="number"
                      value={numberOfRooms}
                      onChange={(e) => handleRoomCountChange(parseInt(e.target.value) || 1)}
                      min="1"
                      pattern="[0-9]*"
                      inputMode="numeric"
                      disabled={loading}
                      className="w-24 text-center bg-white"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="rounded-full w-8 h-8 flex-shrink-0 bg-white"
                      onClick={() => handleRoomCountChange(numberOfRooms + 1)}
                      disabled={loading}
                    >
                      <span className="sr-only">Increase</span>
                      <span className="text-lg font-bold">+</span>
                    </Button>
                    <span className="text-sm text-gray-600 ml-2">
                      {numberOfRooms} room{numberOfRooms > 1 ? 's' : ''}
                    </span>
                  </div>                  {numberOfRooms <= 0 && <p className="text-xs text-red-500 pt-1">Must be at least 1 room</p>}
                </FormItem>

                {/* Fetch Pricing Components Button */}
                <Button
                  type="button"
                  onClick={handleFetchAvailablePricingComponents}
                  variant="outline"
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white border-blue-600 mt-4"
                  disabled={loading || !selectedTemplateId || selectedTemplateType !== 'TourPackage' || !selectedMealPlanId || numberOfRooms <= 0}
                >
                  <Calculator className="mr-2 h-4 w-4" />
                  Fetch Available Pricing Components
                </Button>                {/* Pricing Components Selection */}
                {pricingComponentsFetched && availablePricingComponents.length > 0 && (
                  <div className="mt-4 p-4 border border-blue-200 rounded-lg bg-blue-50">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-semibold text-blue-800">Select Pricing Components</h4>                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAvailablePricingComponents([]);
                          setSelectedPricingComponentIds([]);
                          setComponentRoomQuantities({});
                          setPricingComponentsFetched(false);
                          toast.success("Pricing components selection cleared.");
                        }}
                        className="text-blue-600 hover:text-blue-800 border-blue-300"
                      >
                        Clear Selection
                      </Button>
                    </div>
                    <p className="text-sm text-blue-700 mb-3">
                      Choose which pricing components to include in your tour package pricing breakdown:
                    </p>
                    
                    {/* Select All / Deselect All */}
                    <div className="flex gap-2 mb-3">                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const allComponentIds = availablePricingComponents.map((comp: any) => comp.id);
                          setSelectedPricingComponentIds(allComponentIds);
                          
                          // Initialize room quantities for all components if not already set
                          const newQuantities = { ...componentRoomQuantities };
                          availablePricingComponents.forEach((comp: any) => {
                            if (!newQuantities[comp.id]) {
                              newQuantities[comp.id] = 1;
                            }
                          });
                          setComponentRoomQuantities(newQuantities);
                        }}
                        className="text-xs"
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedPricingComponentIds([])}
                        className="text-xs"
                      >
                        Deselect All
                      </Button>
                    </div>                    <div className="space-y-3">
                      {availablePricingComponents.map((component: any) => (
                        <div key={component.id} className="flex items-center space-x-3 p-3 bg-white rounded-md border">
                          <Checkbox
                            id={`component-${component.id}`}
                            checked={selectedPricingComponentIds.includes(component.id)}
                            onCheckedChange={() => handleTogglePricingComponent(component.id)}
                          />
                          <label 
                            htmlFor={`component-${component.id}`}
                            className="flex-1 cursor-pointer"
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">
                                  {component.pricingAttribute?.name || 'Pricing Component'}
                                </p>
                                {component.description && (
                                  <p className="text-sm text-gray-600">{component.description}</p>
                                )}                                <p className="text-xs text-gray-500 mt-1">
                                  Base Price: ₹{parseFloat(component.price || '0').toFixed(2)} per person
                                  {getOccupancyMultiplier(component.pricingAttribute?.name || '') > 1 && (
                                    <span className="text-blue-600 ml-1">
                                      (×{getOccupancyMultiplier(component.pricingAttribute?.name || '')} for {component.pricingAttribute?.name?.toLowerCase().includes('double') ? 'Double' : component.pricingAttribute?.name?.toLowerCase().includes('triple') ? 'Triple' : component.pricingAttribute?.name?.toLowerCase().includes('quad') ? 'Quad' : 'Multi'} occupancy)
                                    </span>
                                  )}
                                </p>
                              </div>
                              <div className="flex items-center gap-4">
                                {/* Room Quantity Selector */}
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-600 whitespace-nowrap">Rooms:</span>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    className="rounded-full w-6 h-6 flex-shrink-0"
                                    onClick={() => handleComponentRoomQuantityChange(
                                      component.id, 
                                      (componentRoomQuantities[component.id] || 1) - 1
                                    )}
                                    disabled={loading || (componentRoomQuantities[component.id] || 1) <= 1}
                                  >
                                    <span className="sr-only">Decrease</span>
                                    <span className="text-sm font-bold">-</span>
                                  </Button>
                                  <Input
                                    type="number"
                                    value={componentRoomQuantities[component.id] || 1}
                                    onChange={(e) => handleComponentRoomQuantityChange(
                                      component.id, 
                                      parseInt(e.target.value) || 1
                                    )}
                                    min="1"
                                    className="w-16 text-center text-sm h-6"
                                    disabled={loading}
                                  />
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    className="rounded-full w-6 h-6 flex-shrink-0"
                                    onClick={() => handleComponentRoomQuantityChange(
                                      component.id, 
                                      (componentRoomQuantities[component.id] || 1) + 1
                                    )}
                                    disabled={loading}
                                  >
                                    <span className="sr-only">Increase</span>
                                    <span className="text-sm font-bold">+</span>
                                  </Button>
                                </div>                                {/* Total Price for this component */}
                                <div className="text-right">
                                  <p className="font-semibold text-gray-900">
                                    ₹{calculateComponentTotalPrice(component, componentRoomQuantities[component.id] || 1).toFixed(2)}
                                  </p>
                                  {(componentRoomQuantities[component.id] || 1) > 1 || getOccupancyMultiplier(component.pricingAttribute?.name || '') > 1 ? (
                                    <p className="text-xs text-gray-500">
                                      {componentRoomQuantities[component.id] || 1} rooms × ₹{parseFloat(component.price || '0').toFixed(2)} × {getOccupancyMultiplier(component.pricingAttribute?.name || '')} occupancy
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                      {/* Summary of selected components */}
                    {selectedPricingComponentIds.length > 0 && (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                        <p className="text-sm font-medium text-green-800">
                          Selected: {selectedPricingComponentIds.length} component{selectedPricingComponentIds.length !== 1 ? 's' : ''}
                        </p>                        <div className="text-sm text-green-700 mt-1 space-y-1">
                          {availablePricingComponents
                            .filter(comp => selectedPricingComponentIds.includes(comp.id))
                            .map(comp => {
                              const quantity = componentRoomQuantities[comp.id] || 1;
                              const basePrice = parseFloat(comp.price || '0');
                              const componentName = comp.pricingAttribute?.name || 'Component';
                              const occupancyMultiplier = getOccupancyMultiplier(componentName);
                              const totalPrice = calculateComponentTotalPrice(comp, quantity);
                              return (
                                <div key={comp.id} className="flex justify-between text-xs">
                                  <span>{componentName} {quantity > 1 ? `(${quantity} rooms)` : ''} 
                                    {occupancyMultiplier > 1 ? ` × ${occupancyMultiplier}` : ''}
                                  </span>
                                  <span>₹{totalPrice.toFixed(2)}</span>
                                </div>
                              );
                            })}
                        </div>
                        <div className="border-t border-green-300 mt-2 pt-2">
                          <p className="text-sm font-semibold text-green-800 flex justify-between">
                            <span>Total:</span>
                            <span>₹{availablePricingComponents
                              .filter(comp => selectedPricingComponentIds.includes(comp.id))
                              .reduce((sum, comp) => {
                                const quantity = componentRoomQuantities[comp.id] || 1;
                                return sum + calculateComponentTotalPrice(comp, quantity);
                              }, 0)
                              .toFixed(2)}</span>
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Apply Selected Components Button */}
                    <Button
                      type="button"
                      onClick={handleApplySelectedPricingComponents}
                      variant="outline"
                      className="w-full bg-green-500 hover:bg-green-600 text-white border-green-600 mt-4"
                      disabled={loading || selectedPricingComponentIds.length === 0}
                    >
                      <Calculator className="mr-2 h-4 w-4" />
                      Apply Selected Components ({selectedPricingComponentIds.length})
                    </Button>
                  </div>
                )}

                {/* Legacy Direct Apply Button (for backward compatibility) */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">
                    Or apply all pricing components directly:
                  </p>
                  <Button
                    type="button"
                    onClick={handleFetchTourPackagePricing}
                    variant="outline"
                    className="w-full bg-gray-500 hover:bg-gray-600 text-white border-gray-600"
                    disabled={loading || !selectedTemplateId || selectedTemplateType !== 'TourPackage' || !selectedMealPlanId || numberOfRooms <= 0}
                  >
                    <Calculator className="mr-2 h-4 w-4" />
                    Fetch & Apply All Components (Legacy)
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Total Price Field (Always visible and editable, only disabled by loading) */}
        <FormField
          control={control}
          name="totalPrice"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-semibold">Total Price</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  disabled={loading} // Only disable when loading
                  placeholder="Total price for the package"
                  className="text-lg font-bold"
                  type="number" // Ensure type is number if appropriate
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Pricing Section Details (Always visible and editable, only disabled by loading) */}
        <div className="space-y-4 border-t pt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-semibold">Pricing Breakdown</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading} // Only disable when loading
              onClick={() => handleAddPricingItem()}
              className="ml-auto"
            >
              <Plus className="mr-2 h-4 w-4" /> Add Item
            </Button>
          </div>
          <div className="space-y-3">
            {pricingFields.map((item, index) => (
              <div key={item.id} className="flex items-start gap-3 p-3 border rounded-md bg-slate-50/50">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-grow">
                  {/* Item Name */}
                  <FormField
                    control={control}
                    name={`pricingSection.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Item Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={loading} // Only disable when loading
                            placeholder="e.g., Per Person Cost"
                            className="bg-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* Price */}
                  <FormField
                    control={control}
                    name={`pricingSection.${index}.price`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Price</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={loading} // Only disable when loading
                            placeholder="e.g., 15000"
                            type="number"
                            className="bg-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* Description */}
                  <FormField
                    control={control}
                    name={`pricingSection.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Description (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={loading} // Only disable when loading
                            placeholder="Brief description"
                            className="bg-white"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                {/* Remove Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={loading} // Only disable when loading
                  onClick={() => handleRemovePricingItem(index)}
                  className="mt-6 text-red-500 hover:text-red-700"
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            ))}
             {/* Button to add first item if list is empty */}
             {pricingFields.length === 0 && (
                 <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4 border-dashed border-primary text-primary hover:bg-primary/10"
                  disabled={loading}
                  onClick={() => handleAddPricingItem()} // Add first item
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Pricing Option
                </Button>
              )}
          </div>
        </div>        <div className="mt-4">
          {/* Display selected meal plan */}
          {selectedMealPlanId && (
            <div className="bg-white border border-green-200 rounded-md p-3 mb-2">
              <p className="text-sm text-gray-600">Selected Meal Plan:</p>
              <p className="font-medium">
                {mealPlans.find(mp => mp.id === selectedMealPlanId)?.name || 'Unknown Meal Plan'}
              </p>
            </div>
          )}

          {/* Display selected room configuration */}
          {numberOfRooms > 0 && (
            <div className="bg-white border border-green-200 rounded-md p-3">
              <p className="text-sm text-gray-600 mb-2">Room Configuration:</p>
              <div className="flex items-center justify-between bg-green-50 p-2 rounded-md">
                <span className="font-medium">
                  Number of Rooms
                </span>
                <span className="text-sm">
                  {numberOfRooms} room{numberOfRooms > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PricingTab;