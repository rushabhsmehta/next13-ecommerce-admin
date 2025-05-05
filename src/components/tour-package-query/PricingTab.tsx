// filepath: d:\next13-ecommerce-admin\src\components\tour-package-query\PricingTab.tsx
import { Control, useFieldArray, useWatch } from "react-hook-form";
import { Calculator, Plus, Trash, DollarSign, Loader2 } from "lucide-react"; // Added icons
import { useState, useEffect } from "react";
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
  const [isFetchingPackage, setIsFetchingPackage] = useState<boolean>(false);  // Fetch tour package details when selectedTemplateId changes
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
  }, [selectedTemplateId, selectedTemplateType, form]);
  
  // Load and handle saved meal plan and occupancy selections
  useEffect(() => {
    // Try to restore any saved meal plan and occupancy selections
    const savedMealPlanId = form.getValues('selectedMealPlanId');
    const savedOccupancySelections = form.getValues('occupancySelections');
    
    if (savedMealPlanId && !selectedMealPlanId) {
      console.log('Restoring saved meal plan ID:', savedMealPlanId);
      setSelectedMealPlanId(savedMealPlanId);
    }
    
    // Handle various formats that might be returned from the database for occupancySelections
    if (savedOccupancySelections && (!occupancySelections || occupancySelections.length === 0)) {
      console.log('Trying to restore occupancy selections from form:', savedOccupancySelections);
      
      try {
        // Case 1: It's already an array
        if (Array.isArray(savedOccupancySelections) && savedOccupancySelections.length > 0) {
          setOccupancySelections(savedOccupancySelections);
        } 
        // Case 2: It's in the {set: [...]} format that Prisma might return
        else if (typeof savedOccupancySelections === 'object' && savedOccupancySelections.set && 
                Array.isArray(savedOccupancySelections.set) && savedOccupancySelections.set.length > 0) {
          setOccupancySelections(savedOccupancySelections.set);
        }
        // Case 3: It might be a JSON string that needs parsing
        else if (typeof savedOccupancySelections === 'string') {
          const parsed = JSON.parse(savedOccupancySelections);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setOccupancySelections(parsed);
          } else if (typeof parsed === 'object' && parsed.set && Array.isArray(parsed.set)) {
            setOccupancySelections(parsed.set);
          }
        }
      } catch (e) {
        console.error("Error parsing occupancy selections:", e);
      }
    }
  }, [selectedTemplateId, selectedTemplateType, form, occupancySelections, selectedMealPlanId]);
  // Update our local state when the form value changes
  useEffect(() => {
    const subscription = form.watch((value: any, { name }: { name: string }) => {
      if (name === 'tourPackageTemplateName' && value.tourPackageTemplateName) {
        setTourPackageName(value.tourPackageTemplateName);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form]);

  // Initialize data from form when component loads
  useEffect(() => {
    // Initialize from form data when component mounts
    const initializeFromForm = () => {
      // Get stored data from form
      const storedMealPlanId = form.getValues('selectedMealPlanId');
      const storedOccupancySelections = form.getValues('occupancySelections');
      const storedTourPackageName = form.getValues('tourPackageTemplateName');
      
      // Set tour package name if available
      if (storedTourPackageName) {
        setTourPackageName(storedTourPackageName);
      }
      
      // Set meal plan if available
      if (storedMealPlanId) {
        setSelectedMealPlanId(storedMealPlanId);
      }
      
      // Handle different formats of occupancy selections
      if (storedOccupancySelections) {
        try {
          if (Array.isArray(storedOccupancySelections) && storedOccupancySelections.length > 0) {
            // Direct array format
            setOccupancySelections(storedOccupancySelections);
          } else if (typeof storedOccupancySelections === 'object' && storedOccupancySelections.set) {
            // Prisma format with { set: [...] }
            setOccupancySelections(storedOccupancySelections.set);
          } else if (typeof storedOccupancySelections === 'string') {
            // JSON string format
            const parsed = JSON.parse(storedOccupancySelections);
            if (Array.isArray(parsed)) {
              setOccupancySelections(parsed);
            } else if (parsed && parsed.set && Array.isArray(parsed.set)) {
              setOccupancySelections(parsed.set);
            }
          }
        } catch (err) {
          console.error("Error parsing occupancy selections from form:", err);
        }
      }
    };
    
    // Run initialization
    initializeFromForm();
  }, [form]);

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
  };  // Function to calculate total PAX based on occupancy selections
  const calculateTotalPax = (): number => {
    return occupancySelections.reduce((total, selection) => {
      // Ensure we have valid numbers by providing fallbacks
      const count = typeof selection.count === 'number' ? selection.count : 1;
      const paxPerUnit = typeof selection.paxPerUnit === 'number' ? selection.paxPerUnit : 1;
      
      return total + (count * paxPerUnit);
    }, 0);
  };
  // Function to calculate PAX for pricing matches (only counting Double occupancy)
  const calculatePricingPax = (): number => {
    return occupancySelections.reduce((total, selection) => {
      // Find the occupancy type to check if it's Double
      const occupancyType = occupancyTypes.find(ot => ot.id === selection.occupancyTypeId);
      
      // Ensure we have valid numbers by providing fallbacks
      const count = typeof selection.count === 'number' ? selection.count : 1;
      const paxPerUnit = typeof selection.paxPerUnit === 'number' ? selection.paxPerUnit : 1;
      
      // Only count Double occupancy for pricing match
      if (occupancyType && occupancyType.name?.toLowerCase().includes('double')) {
        return total + (count * paxPerUnit);
      }
      return total;
    }, 0);
  };

  // Function to handle fetching and applying Tour Package Pricing
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
  // Function to fetch and set the tour package name based on ID
  const fetchTourPackageName = async (packageId: string) => {
    if (!packageId) {
      setTourPackageName("");
      return;
    }

    try {
      const response = await axios.get(`/api/tourPackages/${packageId}`);
      const tourPackage = response.data;
      setTourPackageName(tourPackage.name || `Package ${packageId.substring(0, 8)}...`);
    } catch (error) {
      console.error("Error fetching tour package name:", error);
      setTourPackageName(`Package ${packageId.substring(0, 8)}...`);
    }
  };

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
  }, [selectedTemplateId]);

  // When meal plan changes, save it to the form
  useEffect(() => {
    if (selectedMealPlanId) {
      form.setValue('selectedMealPlanId', selectedMealPlanId);
    }
  }, [selectedMealPlanId, form]);
    // When occupancy selections change, save them to the form
  useEffect(() => {
    // Always save the occupancy selections to the form, even if empty
    // This ensures the form state is always in sync with the component state
    form.setValue('occupancySelections', occupancySelections);
    
    // Update total price display when occupancy selections change
    if (calculationMethod === 'autoTourPackage' && selectedMealPlanId && occupancySelections.length > 0) {
      // Recalculate total guest count in the UI
      const totalPax = calculateTotalPax();
      console.log(`Occupancy selections updated, total guests: ${totalPax}`);
    }
  }, [occupancySelections, form, calculationMethod, selectedMealPlanId]);

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
                </div>

                <p className="text-sm text-green-700">
                  Fetch pre-defined pricing based on the selected Tour Package Template, Meal Plan, and Occupancy combinations.
                  This will overwrite the current Total Price and Pricing Options below.
                </p>

                {/* Meal Plan Selection First */}
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

                {/* Occupancy Selections */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-green-800">Occupancy Selections <span className="text-red-500">*</span></h4>

                  {/* Show current selections */}
                  {occupancySelections.length > 0 ? (
                    <div className="space-y-2">
                      {occupancySelections.map((selection, index) => {
                        const occupancyType = occupancyTypes.find(ot => ot.id === selection.occupancyTypeId);
                        return (
                          <div key={index} className="flex items-center justify-between p-2 bg-white rounded border border-green-200 shadow-sm">
                            <div>
                              <span className="font-medium text-sm">{occupancyType?.name}</span>
                              <span className="text-xs text-gray-600 ml-2">
                                × {selection.count} = {selection.count * selection.paxPerUnit} PAX
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveOccupancySelection(index)}
                              className="h-7 w-7 p-0"
                              disabled={loading}
                            >
                              <Trash className="h-4 w-4 text-red-500 hover:text-red-700" />
                            </Button>
                          </div>
                        );
                      })}

                      <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200 text-center">
                        <span className="font-semibold text-sm">Total: {calculateTotalPax()} PAX</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 p-2 rounded">No occupancy selections added yet. Add at least one.</p>
                  )}

                  {/* Add new occupancy selection */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end border-t border-green-100 pt-4">
                    <div>
                      <FormLabel className="text-xs font-medium">Occupancy Type</FormLabel>
                      <Select
                        disabled={loading}
                        onValueChange={setNewOccupancyTypeId}
                        value={newOccupancyTypeId || undefined}
                      >
                        <SelectTrigger className="bg-white h-9">
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
                    </div>
                    <div>
                      <FormLabel className="text-xs font-medium">Count</FormLabel>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="rounded-full w-7 h-7 flex-shrink-0 bg-white"
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
                          className="w-full text-center h-9 bg-white"
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="rounded-full w-7 h-7 flex-shrink-0 bg-white"
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
                      className="bg-green-100 hover:bg-green-200 text-green-800 border-green-300 h-9"
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
                  className="w-full bg-green-500 hover:bg-green-600 text-white border-green-600 mt-4"
                  disabled={loading || !selectedTemplateId || selectedTemplateType !== 'TourPackage' || !selectedMealPlanId || occupancySelections.length === 0}
                >
                  <Calculator className="mr-2 h-4 w-4" />
                  Fetch & Apply Tour Package Price
                </Button>
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
        </div>

        <div className="mt-4">
                  {/* Display selected meal plan */}
                  {selectedMealPlanId && (
                    <div className="bg-white border border-green-200 rounded-md p-3 mb-2">
                      <p className="text-sm text-gray-600">Selected Meal Plan:</p>
                      <p className="font-medium">
                        {mealPlans.find(mp => mp.id === selectedMealPlanId)?.name || 'Unknown Meal Plan'}
                      </p>
                    </div>
                  )}

                  {/* Display selected occupancy configurations */}                {occupancySelections.length > 0 && (
                    <div className="bg-white border border-green-200 rounded-md p-3">
                      <p className="text-sm text-gray-600 mb-2">Selected Room Configurations:</p>
                      <div className="grid grid-cols-1 gap-2">
                        {occupancySelections.map((selection, index) => {
                          const occupancyType = occupancyTypes.find(ot => ot.id === selection.occupancyTypeId);
                          
                          return (
                            <div key={index} className="flex items-center justify-between bg-green-50 p-2 rounded-md">
                              <span className="font-medium">
                                {occupancyType?.name || `Room Type (ID: ${selection.occupancyTypeId?.substring(0, 8)}...)`}
                              </span>
                              <span className="text-sm">
                                {selection.count} room(s), {selection.count * (selection.paxPerUnit || 1)} guest(s)
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-red-500"
                                onClick={() => handleRemoveOccupancySelection(index)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                        <p className="text-sm text-gray-600 mt-1">
                          Total Guests: {calculateTotalPax()}
                        </p>
                      </div>
                      {/* Debug info - Remove in production */}
                      {process.env.NODE_ENV !== 'production' && (
                        <details className="mt-3 text-xs text-gray-500 border-t pt-2">
                          <summary className="cursor-pointer">Debug Info</summary>
                          <pre className="mt-1 bg-gray-100 p-2 rounded text-xs overflow-auto max-h-32">
                            {JSON.stringify(occupancySelections, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  )}
                </div>
      </CardContent>
    </Card>
  );
};

export default PricingTab;
