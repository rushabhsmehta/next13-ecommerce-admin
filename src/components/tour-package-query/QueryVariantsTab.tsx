"use client";
import { useState } from "react";
import { Control, useWatch } from "react-hook-form";
import { Hotel, Images, PackageVariant, VariantHotelMapping, Itinerary, TourPackagePricing, PricingComponent, PricingAttribute, MealPlan, VehicleType, LocationSeasonalPeriod, RoomType, OccupancyType } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Sparkles, Hotel as HotelIcon, IndianRupee, Calendar, Info, AlertCircle, Edit2, Check, X, Utensils as UtensilsIcon, Car, Receipt, BedDouble, Users, Calculator, Plus, Trash, Settings, Package, CreditCard, ShoppingCart, Wallet, CheckCircle, Loader2, RefreshCw, Target, Copy } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { FormControl, FormItem, FormLabel } from "@/components/ui/form";
import Image from "next/image";
import { formatSafeDate } from "@/lib/utils";
import { toast } from "react-hot-toast";
import axios from "axios";
import { utcToLocal } from "@/lib/timezone-utils";
import { PricingBreakdownTable } from "./PricingBreakdownTable";

// Calculation method type for pricing
type CalculationMethod = 'manual' | 'autoHotelTransport' | 'useTourPackagePricing';

// Generate a stable unique ID for pricing items to use as React keys
let _pricingItemCounter = 0;
const generateItemId = (): string => `pi-${Date.now()}-${++_pricingItemCounter}`;

type VariantWithDetails = PackageVariant & {
  variantHotelMappings: (VariantHotelMapping & {
    hotel: Hotel & { images: Images[] };
    itinerary: Itinerary | null;
  })[];
  tourPackagePricings: (TourPackagePricing & {
    mealPlan: MealPlan | null;
    vehicleType: VehicleType | null;
    locationSeasonalPeriod: LocationSeasonalPeriod | null;
    pricingComponents: (PricingComponent & {
      pricingAttribute: PricingAttribute | null;
    })[];
  })[];
};

interface TourPackageWithVariants {
  id: string;
  tourPackageName: string | null;
  locationId: string | null;
  packageVariants?: VariantWithDetails[] | null;
  itineraries?: Itinerary[] | null;
}

interface QueryVariantsTabProps {
  control: Control<any>;
  form: any;
  loading?: boolean;
  tourPackages: TourPackageWithVariants[] | null;
  hotels: (Hotel & { images: Images[] })[];
  roomTypes?: any[];
  occupancyTypes?: any[];
  mealPlans?: any[];
  vehicleTypes?: any[];
}

const QueryVariantsTab: React.FC<QueryVariantsTabProps> = ({
  control,
  form,
  loading,
  tourPackages,
  hotels,
  roomTypes = [],
  occupancyTypes = [],
  mealPlans = [],
  vehicleTypes = [],
}) => {
  const selectedTourPackageId = useWatch({ control, name: "tourPackageTemplate" }) as string | undefined;
  const selectedVariantIds = useWatch({ control, name: "selectedVariantIds" }) as string[] | undefined;
  const variantHotelOverrides = useWatch({ control, name: "variantHotelOverrides" }) as Record<string, Record<string, string>> | undefined;
  const variantRoomAllocations = useWatch({ control, name: "variantRoomAllocations" }) as Record<string, Record<string, any[]>> | undefined;
  const variantTransportDetails = useWatch({ control, name: "variantTransportDetails" }) as Record<string, Record<string, any[]>> | undefined;
  const queryItineraries = useWatch({ control, name: "itineraries" }) as any[] | undefined;
  const queryStartDate = useWatch({ control, name: "startDate" });
  const queryEndDate = useWatch({ control, name: "endDate" });
  
  const [editingMapping, setEditingMapping] = useState<string | null>(null);
  const [tempHotelId, setTempHotelId] = useState<string>("");
  const [variantCalcMethods, setVariantCalcMethods] = useState<Record<string, CalculationMethod>>({});
  
  // Pricing state for each variant
  const [variantMealPlanIds, setVariantMealPlanIds] = useState<Record<string, string>>({});
  const [variantRoomCounts, setVariantRoomCounts] = useState<Record<string, number>>({});
  const [variantAvailableComponents, setVariantAvailableComponents] = useState<Record<string, any[]>>({});
  const [variantSelectedComponentIds, setVariantSelectedComponentIds] = useState<Record<string, string[]>>({});
  const [variantComponentQuantities, setVariantComponentQuantities] = useState<Record<string, Record<string, number>>>({});
  const [variantComponentsFetched, setVariantComponentsFetched] = useState<Record<string, boolean>>({});
  
  // Auto-calculate state per variant
  const [variantAutoCalcResults, setVariantAutoCalcResults] = useState<Record<string, any>>({});
  const [variantAutoCalcLoading, setVariantAutoCalcLoading] = useState<Record<string, boolean>>({});
  const [variantMarkupValues, setVariantMarkupValues] = useState<Record<string, string>>({});
  
  // Editable pricing breakdown state per variant (mirrors PricingTab's pricingSection field array)
  const variantPricingData = useWatch({ control, name: "variantPricingData" }) as Record<string, any> | undefined;

  const selectedTourPackage = tourPackages?.find(tp => tp.id === selectedTourPackageId);
  const allVariants = selectedTourPackage?.packageVariants || [];
  const selectedVariants = allVariants.filter(v => selectedVariantIds?.includes(v.id));
  
  const itineraries = selectedTourPackage?.itineraries || [];
  const locationId = selectedTourPackage?.locationId;
  const availableHotels = hotels.filter(h => h.locationId === locationId);

  // Helper function to get occupancy multiplier from component name
  const getOccupancyMultiplier = (componentName: string): number => {
    const name = componentName.toLowerCase();
    if (name.includes('single')) return 1;
    else if (name.includes('double')) return 2;
    else if (name.includes('triple')) return 3;
    else if (name.includes('quad')) return 4;
    return 1;
  };

  // Helper function to calculate total price for a component
  const calculateComponentTotalPrice = (component: any, roomQuantity: number = 1): number => {
    const basePrice = parseFloat(component.price || '0');
    const componentName = component.pricingAttribute?.name || '';
    const occupancyMultiplier = getOccupancyMultiplier(componentName);
    return basePrice * occupancyMultiplier * roomQuantity;
  };

  // Helper function to format currency
  const formatCurrency = (amount: number): string => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Handler to fetch available pricing components for a variant
  const handleFetchVariantPricingComponents = async (variantId: string) => {
    const baseTourPackageId = selectedTourPackageId;
    if (!baseTourPackageId) {
      toast.error("Tour package not found.");
      return;
    }

    const mealPlanId = variantMealPlanIds[variantId];
    if (!mealPlanId) {
      toast.error("Please select a Meal Plan first.");
      return;
    }

    const roomCount = variantRoomCounts[variantId] || 1;
    if (roomCount <= 0) {
      toast.error("Number of rooms must be greater than 0.");
      return;
    }

    if (!queryStartDate || !queryEndDate) {
      toast.error("Please select tour start and end dates in the Dates tab.");
      return;
    }

    toast.loading("Fetching available pricing components...");
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('packageVariantId', variantId);
      queryParams.append('includeGlobal', '1');
      
      const requestUrl = `/api/tourPackages/${baseTourPackageId}/pricing?${queryParams.toString()}`;
      const response = await axios.get(requestUrl);
      const tourPackagePricings = response.data;
      toast.dismiss();

      if (!tourPackagePricings || tourPackagePricings.length === 0) {
        toast.error("No pricing periods found for this variant.");
        return;
      }

      // Filter matching pricing periods
      const matchedPricings = tourPackagePricings.filter((p: any) => {
        const periodStart = utcToLocal(p.startDate) || new Date(p.startDate);
        const periodEnd = utcToLocal(p.endDate) || new Date(p.endDate);
        const isDateMatch = queryStartDate >= periodStart && queryEndDate <= periodEnd;
        const isMealPlanMatch = p.mealPlanId === mealPlanId;
        const isRoomMatch = p.numberOfRooms === roomCount;
        return isDateMatch && isMealPlanMatch && isRoomMatch;
      });

      if (matchedPricings.length === 0) {
        toast.error(`No matching pricing period found for ${roomCount} room${roomCount > 1 ? 's' : ''} with selected meal plan.`);
        setVariantAvailableComponents(prev => ({ ...prev, [variantId]: [] }));
        setVariantComponentsFetched(prev => ({ ...prev, [variantId]: false }));
        return;
      }

      if (matchedPricings.length > 1) {
        toast.error("Multiple pricing periods match. Please refine criteria.");
        setVariantAvailableComponents(prev => ({ ...prev, [variantId]: [] }));
        setVariantComponentsFetched(prev => ({ ...prev, [variantId]: false }));
        return;
      }

      const components = matchedPricings[0].pricingComponents || [];
      setVariantAvailableComponents(prev => ({ ...prev, [variantId]: components }));
      setVariantComponentsFetched(prev => ({ ...prev, [variantId]: true }));

      // Initially select all components
      const allComponentIds = components.map((comp: any) => comp.id);
      setVariantSelectedComponentIds(prev => ({ ...prev, [variantId]: allComponentIds }));

      // Initialize room quantities
      const initialQuantities: Record<string, number> = {};
      components.forEach((comp: any) => {
        initialQuantities[comp.id] = 1;
      });
      setVariantComponentQuantities(prev => ({ ...prev, [variantId]: initialQuantities }));

      toast.success(`Found ${components.length} pricing component${components.length !== 1 ? 's' : ''}.`);
    } catch (error) {
      toast.dismiss();
      console.error("Error fetching pricing components:", error);
      toast.error("Failed to fetch pricing components.");
      setVariantAvailableComponents(prev => ({ ...prev, [variantId]: [] }));
      setVariantComponentsFetched(prev => ({ ...prev, [variantId]: false }));
    }
  };

  // Handler to toggle component selection
  const handleToggleComponent = (variantId: string, componentId: string) => {
    setVariantSelectedComponentIds(prev => {
      const current = prev[variantId] || [];
      if (current.includes(componentId)) {
        return { ...prev, [variantId]: current.filter(id => id !== componentId) };
      } else {
        return { ...prev, [variantId]: [...current, componentId] };
      }
    });
  };

  // Handler to change component room quantity
  const handleComponentQuantityChange = (variantId: string, componentId: string, quantity: number) => {
    if (quantity >= 1) {
      setVariantComponentQuantities(prev => ({
        ...prev,
        [variantId]: {
          ...(prev[variantId] || {}),
          [componentId]: quantity
        }
      }));
    }
  };

  // Handler to apply selected components
  const handleApplySelectedComponents = (variantId: string) => {
    const selectedIds = variantSelectedComponentIds[variantId] || [];
    if (selectedIds.length === 0) {
      toast.error("Please select at least one pricing component.");
      return;
    }

    const available = variantAvailableComponents[variantId] || [];
    const toApply = available.filter(comp => selectedIds.includes(comp.id));

    // Build pricing items and calculate total
    const pricingItems: { id: string; name: string; price: string; description: string }[] = [];
    let totalPrice = 0;

    toApply.forEach((comp: any) => {
      const componentName = comp.pricingAttribute?.name || 'Pricing Component';
      const basePrice = parseFloat(comp.price || '0');
      const roomQuantity = (variantComponentQuantities[variantId] || {})[comp.id] || 1;
      const occupancyMultiplier = getOccupancyMultiplier(componentName);
      const totalComponentPrice = calculateComponentTotalPrice(comp, roomQuantity);

      pricingItems.push({
        id: generateItemId(),
        name: componentName,
        price: basePrice.toString(),
        description: `${basePrice.toFixed(2)} × ${occupancyMultiplier} occupancy${roomQuantity > 1 ? ` × ${roomQuantity} rooms` : ''} = Rs. ${totalComponentPrice.toFixed(2)}`
      });

      totalPrice += totalComponentPrice;
    });

    // Persist to variantPricingData in form
    const currentPricingData = form.getValues('variantPricingData') || {};
    form.setValue('variantPricingData', {
      ...currentPricingData,
      [variantId]: {
        method: 'useTourPackagePricing',
        pricingItems,
        totalPrice: totalPrice.toString(),
        calculatedAt: new Date().toISOString()
      }
    });

    toast.success(`Applied ${toApply.length} component${toApply.length !== 1 ? 's' : ''} — Total: ₹${totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  };

  // Manual Pricing Helpers - driven directly from variantPricingData to avoid dual state
  const addManualPricingItem = (variantId: string) => {
    const currentData = form.getValues('variantPricingData') || {};
    const variantData = currentData[variantId] || {};
    const items = [...(variantData.pricingItems || [])];
    items.push({ id: generateItemId(), name: '', price: '', description: '' });
    form.setValue('variantPricingData', {
      ...currentData,
      [variantId]: { ...variantData, pricingItems: items }
    });
  };

  const removeManualPricingItem = (variantId: string, index: number) => {
    const currentData = form.getValues('variantPricingData') || {};
    const variantData = currentData[variantId] || {};
    const items = (variantData.pricingItems || []).filter((_: any, i: number) => i !== index);
    form.setValue('variantPricingData', {
      ...currentData,
      [variantId]: { ...variantData, pricingItems: items }
    });
  };

  const updateManualPricingItem = (variantId: string, index: number, field: string, value: string) => {
    const currentData = form.getValues('variantPricingData') || {};
    const variantData = currentData[variantId] || {};
    const items = [...(variantData.pricingItems || [])];
    const existing = items[index] ?? { id: generateItemId(), name: '', price: '', description: '' };
    items[index] = { ...existing, [field]: value };
    form.setValue('variantPricingData', {
      ...currentData,
      [variantId]: { ...variantData, pricingItems: items }
    });
  };

  const applyManualPricing = (variantId: string) => {
    const currentData = form.getValues('variantPricingData') || {};
    const variantData = currentData[variantId] || {};
    const items = variantData.pricingItems || [];
    if (items.length === 0) {
      toast.error("Add at least one pricing item.");
      return;
    }
    const totalPrice = items.reduce((sum: number, item: any) => sum + (parseFloat(item.price) || 0), 0);

    form.setValue('variantPricingData', {
      ...currentData,
      [variantId]: {
        ...variantData,
        method: 'manual',
        totalPrice: totalPrice.toString(),
        calculatedAt: new Date().toISOString()
      }
    });

    toast.success(`Manual pricing applied — Total: ₹${totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  };

  // Auto Calculate (Hotel + Transport) Handler
  const handleAutoCalculate = async (variantId: string) => {
    if (!queryStartDate || !queryEndDate) {
      toast.error('Please select tour start and end dates in the Dates tab.');
      return;
    }

    // Build itinerary data from variant hotel mappings and room/transport allocations
    const variantMappings = selectedVariants.find(v => v.id === variantId)?.variantHotelMappings || [];
    if (variantMappings.length === 0) {
      toast.error('No hotel mappings found for this variant.');
      return;
    }

    const pricingItineraries = variantMappings.map(mapping => {
      const itineraryId = mapping.itinerary?.id || '';
      const effectiveHotelId = getEffectiveHotelId(variantId, itineraryId, mapping.hotel?.id || '');
      const dayRooms = variantRoomAllocations?.[variantId]?.[itineraryId] || [];
      const dayTransport = variantTransportDetails?.[variantId]?.[itineraryId] || [];

      return {
        locationId: locationId || '',
        dayNumber: mapping.itinerary?.dayNumber || 0,
        hotelId: effectiveHotelId,
        roomAllocations: dayRooms,
        transportDetails: dayTransport,
      };
    }).filter(it => it.hotelId);

    if (pricingItineraries.length === 0) {
      toast.error('Please select hotels for at least one day to calculate pricing.');
      return;
    }

    const markupPercentage = parseFloat(variantMarkupValues[variantId] || '0');

    setVariantAutoCalcLoading(prev => ({ ...prev, [variantId]: true }));
    toast.loading('Calculating pricing...');

    try {
      const response = await axios.post('/api/pricing/calculate', {
        tourStartsFrom: queryStartDate,
        tourEndsOn: queryEndDate,
        itineraries: pricingItineraries,
        markup: markupPercentage
      });
      toast.dismiss();

      const result = response.data;
      if (result && typeof result === 'object') {
        setVariantAutoCalcResults(prev => ({ ...prev, [variantId]: result }));

        const totalCost = result.totalCost || 0;
        const pricingItems: { id: string; name: string; price: string; description: string }[] = [];

        pricingItems.push({
          id: generateItemId(),
          name: 'Total Cost',
          price: totalCost.toString(),
          description: 'Total package cost with markup'
        });

        if (result.breakdown) {
          if (result.breakdown.accommodation) {
            pricingItems.push({
              id: generateItemId(),
              name: 'Accommodation',
              price: result.breakdown.accommodation.toString(),
              description: 'Hotel room costs'
            });
          }
          if (result.breakdown.transport > 0) {
            pricingItems.push({
              id: generateItemId(),
              name: 'Transport',
              price: result.breakdown.transport.toString(),
              description: 'Vehicle costs'
            });
          }
        }

        // Persist to variantPricingData
        const currentPricingData = form.getValues('variantPricingData') || {};
        form.setValue('variantPricingData', {
          ...currentPricingData,
          [variantId]: {
            method: 'autoHotelTransport',
            totalCost,
            basePrice: result.basePrice || 0,
            appliedMarkup: result.appliedMarkup || { percentage: 0, amount: 0 },
            breakdown: result.breakdown || {},
            itineraryBreakdown: result.itineraryBreakdown || [],
            pricingItems,
            totalPrice: totalCost.toString(),
            calculatedAt: new Date().toISOString()
          }
        });

        toast.success(`Price calculation complete! Total: ₹${totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      } else {
        toast.error('Invalid price calculation result.');
      }
    } catch (error: any) {
      toast.dismiss();
      console.error('Price calculation error:', error);
      const errorMsg = error?.response?.data?.message || error?.message || 'Failed to calculate pricing';
      toast.error(`Price calculation failed: ${errorMsg}`);
    } finally {
      setVariantAutoCalcLoading(prev => ({ ...prev, [variantId]: false }));
    }
  };

  // Handler to update room count
  const handleRoomCountChange = (variantId: string, newCount: number) => {
    if (newCount >= 1) {
      setVariantRoomCounts(prev => ({ ...prev, [variantId]: newCount }));
      // Reset when count changes
      setVariantAvailableComponents(prev => ({ ...prev, [variantId]: [] }));
      setVariantSelectedComponentIds(prev => ({ ...prev, [variantId]: [] }));
      setVariantComponentQuantities(prev => ({ ...prev, [variantId]: {} }));
      setVariantComponentsFetched(prev => ({ ...prev, [variantId]: false }));
    }
  };

  // Room Allocation Helper Functions
  const addRoomAllocation = (variantId: string, itineraryId: string) => {
    const current = variantRoomAllocations || {};
    const variantData = current[variantId] || {};
    const itineraryAllocations = variantData[itineraryId] || [];
    
    const newAllocation = {
      roomTypeId: '',
      occupancyTypeId: '',
      mealPlanId: '',
      quantity: 1,
      guestNames: '',
      voucherNumber: '',
      useCustomRoomType: false,
      customRoomType: ''
    };
    
    form.setValue('variantRoomAllocations', {
      ...current,
      [variantId]: {
        ...variantData,
        [itineraryId]: [...itineraryAllocations, newAllocation]
      }
    });
  };

  const removeRoomAllocation = (variantId: string, itineraryId: string, allocationIndex: number) => {
    const current = variantRoomAllocations || {};
    const variantData = current[variantId] || {};
    const itineraryAllocations = variantData[itineraryId] || [];
    
    const newAllocations = itineraryAllocations.filter((_: any, i: number) => i !== allocationIndex);
    
    form.setValue('variantRoomAllocations', {
      ...current,
      [variantId]: {
        ...variantData,
        [itineraryId]: newAllocations
      }
    });
  };

  const updateRoomAllocation = (variantId: string, itineraryId: string, allocationIndex: number, field: string, value: any) => {
    const current = variantRoomAllocations || {};
    const variantData = current[variantId] || {};
    const itineraryAllocations = variantData[itineraryId] || [];
    
    const updatedAllocations = itineraryAllocations.map((allocation: any, i: number) => 
      i === allocationIndex ? { ...allocation, [field]: value } : allocation
    );
    
    form.setValue('variantRoomAllocations', {
      ...current,
      [variantId]: {
        ...variantData,
        [itineraryId]: updatedAllocations
      }
    });
  };

  // Transport Details Helper Functions
  const addTransportDetail = (variantId: string, itineraryId: string) => {
    const current = variantTransportDetails || {};
    const variantData = current[variantId] || {};
    const itineraryTransports = variantData[itineraryId] || [];
    
    const newTransport = {
      vehicleTypeId: '',
      quantity: 1,
      description: ''
    };
    
    form.setValue('variantTransportDetails', {
      ...current,
      [variantId]: {
        ...variantData,
        [itineraryId]: [...itineraryTransports, newTransport]
      }
    });
  };

  const removeTransportDetail = (variantId: string, itineraryId: string, transportIndex: number) => {
    const current = variantTransportDetails || {};
    const variantData = current[variantId] || {};
    const itineraryTransports = variantData[itineraryId] || [];
    
    const newTransports = itineraryTransports.filter((_: any, i: number) => i !== transportIndex);
    
    form.setValue('variantTransportDetails', {
      ...current,
      [variantId]: {
        ...variantData,
        [itineraryId]: newTransports
      }
    });
  };

  const updateTransportDetail = (variantId: string, itineraryId: string, transportIndex: number, field: string, value: any) => {
    const current = variantTransportDetails || {};
    const variantData = current[variantId] || {};
    const itineraryTransports = variantData[itineraryId] || [];
    
    const updatedTransports = itineraryTransports.map((transport: any, i: number) => 
      i === transportIndex ? { ...transport, [field]: value } : transport
    );
    
    form.setValue('variantTransportDetails', {
      ...current,
      [variantId]: {
        ...variantData,
        [itineraryId]: updatedTransports
      }
    });
  };

  const getEffectiveHotelId = (variantId: string, itineraryId: string, originalHotelId: string) => {
    return variantHotelOverrides?.[variantId]?.[itineraryId] || originalHotelId;
  };

  const handleStartEdit = (mappingId: string, currentHotelId: string) => {
    setEditingMapping(mappingId);
    setTempHotelId(currentHotelId);
  };

  const handleSaveHotelChange = (variantId: string, itineraryId: string, newHotelId: string) => {
    const currentOverrides = variantHotelOverrides || {};
    const variantOverrides = currentOverrides[variantId] || {};
    
    const updatedOverrides = {
      ...currentOverrides,
      [variantId]: {
        ...variantOverrides,
        [itineraryId]: newHotelId
      }
    };
    
    form.setValue('variantHotelOverrides', updatedOverrides);
    setEditingMapping(null);
    setTempHotelId("");
    toast.success("Hotel updated for this variant");
  };

  const handleCancelEdit = () => {
    setEditingMapping(null);
    setTempHotelId("");
  };

  // Editable Pricing Breakdown helpers (per variant) - mirrors PricingTab functionality
  const getVariantPricingItems = (variantId: string): { name: string; price: string; description: string }[] => {
    const data = variantPricingData?.[variantId];
    return data?.pricingItems || [];
  };

  const updateVariantPricingItem = (variantId: string, index: number, field: string, value: string) => {
    const currentData = form.getValues('variantPricingData') || {};
    const variantData = currentData[variantId] || {};
    const items = [...(variantData.pricingItems || [])];
    const existing = items[index] ?? { id: generateItemId(), name: '', price: '', description: '' };
    items[index] = { ...existing, [field]: value };
    form.setValue('variantPricingData', {
      ...currentData,
      [variantId]: { ...variantData, pricingItems: items }
    });
  };

  const addVariantPricingBreakdownItem = (variantId: string, insertAfterIndex?: number) => {
    const currentData = form.getValues('variantPricingData') || {};
    const variantData = currentData[variantId] || {};
    const items = [...(variantData.pricingItems || [])];
    const newItem = { id: generateItemId(), name: '', price: '', description: '' };
    if (insertAfterIndex !== undefined) {
      items.splice(insertAfterIndex + 1, 0, newItem);
    } else {
      items.push(newItem);
    }
    form.setValue('variantPricingData', {
      ...currentData,
      [variantId]: { ...variantData, pricingItems: items }
    });
  };

  const removeVariantPricingBreakdownItem = (variantId: string, index: number) => {
    const currentData = form.getValues('variantPricingData') || {};
    const variantData = currentData[variantId] || {};
    const items = (variantData.pricingItems || []).filter((_: any, i: number) => i !== index);
    form.setValue('variantPricingData', {
      ...currentData,
      [variantId]: { ...variantData, pricingItems: items }
    });
  };

  const getVariantTotalPrice = (variantId: string): string => {
    const data = variantPricingData?.[variantId];
    return data?.totalPrice || '';
  };

  const setVariantTotalPrice = (variantId: string, value: string) => {
    const currentData = form.getValues('variantPricingData') || {};
    const variantData = currentData[variantId] || {};
    form.setValue('variantPricingData', {
      ...currentData,
      [variantId]: { ...variantData, totalPrice: value }
    });
  };

  const getVariantRemarks = (variantId: string): string => {
    const data = variantPricingData?.[variantId];
    return data?.remarks || '';
  };

  const setVariantRemarks = (variantId: string, value: string) => {
    const currentData = form.getValues('variantPricingData') || {};
    const variantData = currentData[variantId] || {};
    form.setValue('variantPricingData', {
      ...currentData,
      [variantId]: { ...variantData, remarks: value }
    });
  };

  if (!selectedTourPackageId) {
    return (
      <Card>
        <CardContent className="py-8">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Please select a tour package from the <strong>Basic Info</strong> tab first to view variants.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!selectedVariants || selectedVariants.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No variants selected. Please select package variants from the <strong>Basic Info</strong> tab to view their details here.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="shadow-sm border border-slate-200/70 bg-gradient-to-r from-white to-slate-50">
        <CardHeader className="pb-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" /> Selected Package Variants
            </CardTitle>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="h-3.5 w-3.5 text-primary" /> 
              Variants from <strong className="font-semibold">{selectedTourPackage?.tourPackageName}</strong>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-white/60 backdrop-blur text-xs font-medium">
              Total: {selectedVariants.length}
            </Badge>
            {selectedVariants.some(v => v.isDefault) && (
              <Badge variant="default" className="text-xs bg-gradient-to-r from-primary to-primary/80">
                Has Default
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue={selectedVariants[0]?.id} className="w-full">
        <TabsList className="grid w-full mb-6 bg-gradient-to-r from-slate-100 to-slate-50 p-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(selectedVariants.length, 4)}, minmax(0, 1fr))` }}>
          {selectedVariants.map((variant) => (
            <TabsTrigger 
              key={variant.id} 
              value={variant.id} 
              className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-md transition"
            >
              <Sparkles className="h-3 w-3" />
              {variant.name}
              {variant.isDefault && (
                <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 h-4">Default</Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {selectedVariants.map((variant) => (
          <TabsContent key={variant.id} value={variant.id} className="space-y-6">
            {/* Variant Info */}
            <Card className="shadow-sm border border-primary/20 bg-gradient-to-br from-white to-primary/5">
              <CardHeader className="pb-3 border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
                <CardTitle className="text-sm flex items-center gap-2 font-semibold">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Variant Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-slate-600">Variant Name</span>
                    <span className="font-semibold text-base">{variant.name}</span>
                  </div>
                  {variant.priceModifier !== null && variant.priceModifier !== 0 && (
                    <div className="flex flex-col space-y-1.5">
                      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-600">Price Modifier</span>
                      <Badge 
                        variant={variant.priceModifier > 0 ? "default" : "secondary"} 
                        className="w-fit text-sm py-1 px-3 bg-gradient-to-r from-primary to-primary/80"
                      >
                        {variant.priceModifier > 0 ? '+' : ''}{variant.priceModifier}%
                      </Badge>
                    </div>
                  )}
                  {variant.description && (
                    <div className="flex flex-col space-y-1.5 md:col-span-2">
                      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-600">Description</span>
                      <p className="text-sm leading-relaxed text-muted-foreground">{variant.description}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Sub-tabs for Hotels, Room Allocation, and Pricing */}
            <Tabs defaultValue="hotels" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-slate-50 to-slate-100 p-1">
                <TabsTrigger value="hotels" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <HotelIcon className="h-3.5 w-3.5 mr-2" />
                  Hotels
                </TabsTrigger>
                <TabsTrigger value="rooms" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <BedDouble className="h-3.5 w-3.5 mr-2" />
                  Room Allocation
                </TabsTrigger>
                <TabsTrigger value="pricing" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Calculator className="h-3.5 w-3.5 mr-2" />
                  Pricing
                </TabsTrigger>
              </TabsList>

              {/* Hotels Tab - Full Implementation */}
              <TabsContent value="hotels" className="mt-4">
                <Card className="shadow-sm border border-slate-200/70">
                  <CardHeader className="pb-3 border-b bg-gradient-to-r from-blue-50 via-blue-25 to-transparent">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <CardTitle className="text-sm flex items-center gap-2 font-semibold">
                        <HotelIcon className="h-4 w-4 text-blue-600" />
                        Hotel Mappings ({variant.variantHotelMappings.length})
                      </CardTitle>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs">
                          Days: {itineraries.length}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Hotels: {variant.variantHotelMappings.filter(m => {
                            const effectiveId = getEffectiveHotelId(variant.id, m.itinerary?.id || '', m.hotel?.id || '');
                            return !!effectiveId;
                          }).length}/{variant.variantHotelMappings.length}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {variant.variantHotelMappings.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        <HotelIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                        No hotel mappings configured for this variant.
                      </div>
                    ) : (
                      <Accordion type="multiple" className="space-y-3">
                        {variant.variantHotelMappings.map((mapping, mIndex) => {
                          const itineraryId = mapping.itinerary?.id || '';
                          const originalHotelId = mapping.hotel?.id || '';
                          const effectiveHotelId = getEffectiveHotelId(variant.id, itineraryId, originalHotelId);
                          const effectiveHotel = hotels.find(h => h.id === effectiveHotelId) || mapping.hotel;
                          const isOverridden = variantHotelOverrides?.[variant.id]?.[itineraryId] && variantHotelOverrides[variant.id][itineraryId] !== originalHotelId;
                          const mappingKey = `${variant.id}-${itineraryId}`;
                          const isEditing = editingMapping === mappingKey;
                          const hotelImages = effectiveHotel?.images?.slice(0, 4) || [];

                          return (
                            <AccordionItem key={mIndex} value={`mapping-${mIndex}`} className={`border rounded-md overflow-hidden shadow-sm ${!effectiveHotelId ? 'border-rose-200 bg-rose-50/40' : 'bg-white hover:shadow-md'}`}>
                              <AccordionTrigger className="px-4 py-3 data-[state=open]:bg-gradient-to-r data-[state=open]:from-blue-50 data-[state=open]:to-blue-100/30">
                                <div className="flex items-center gap-3 w-full text-left">
                                  <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border ${effectiveHotelId ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300'}`}>
                                    {mapping.itinerary?.dayNumber || mIndex + 1}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate" dangerouslySetInnerHTML={{ __html: mapping.itinerary?.itineraryTitle || `Day ${mIndex + 1}` }} />
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {effectiveHotel ? (
                                        <Badge className="h-5 px-1.5 flex items-center gap-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs">
                                          <HotelIcon className="h-3 w-3" /> {effectiveHotel.name}
                                        </Badge>
                                      ) : (
                                        <Badge variant="destructive" className="h-5 px-1.5 animate-pulse text-xs">No Hotel</Badge>
                                      )}
                                      {isOverridden && (
                                        <Badge variant="outline" className="h-5 px-1.5 text-xs text-amber-600 border-amber-300">
                                          <Edit2 className="h-2.5 w-2.5 mr-1" /> Overridden
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-4 pt-3 border-t space-y-3">
                                {/* Hotel Images */}
                                {hotelImages.length > 0 && (
                                  <div className="grid grid-cols-4 gap-2">
                                    {hotelImages.map((img: any, idx: number) => (
                                      <div key={idx} className="relative h-16 w-full rounded-md overflow-hidden border bg-slate-100">
                                        <Image src={img.url} alt={effectiveHotel?.name || 'Hotel'} fill className="object-cover" />
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Hotel Info */}
                                <div className="bg-slate-50 rounded-md p-3 space-y-1">
                                  <p className="text-xs text-slate-500">Current Hotel</p>
                                  <p className="text-sm font-medium">{effectiveHotel?.name || 'No hotel assigned'}</p>
                                  {isOverridden && (
                                    <p className="text-xs text-amber-600">
                                      Original: {mapping.hotel?.name || 'Unknown'}
                                    </p>
                                  )}
                                </div>

                                {/* Edit Hotel */}
                                {!isEditing ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    disabled={loading}
                                    onClick={() => handleStartEdit(mappingKey, effectiveHotelId)}
                                  >
                                    <Edit2 className="h-3.5 w-3.5 mr-2" /> Change Hotel
                                  </Button>
                                ) : (
                                  <div className="space-y-2">
                                    <Select
                                      value={tempHotelId}
                                      onValueChange={setTempHotelId}
                                      disabled={loading}
                                    >
                                      <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="Select hotel..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {availableHotels.map(h => (
                                          <SelectItem key={h.id} value={h.id} className="text-xs">
                                            {h.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <div className="flex gap-2">
                                      <Button
                                        type="button"
                                        size="sm"
                                        className="flex-1"
                                        disabled={loading || !tempHotelId}
                                        onClick={() => handleSaveHotelChange(variant.id, itineraryId, tempHotelId)}
                                      >
                                        <Check className="h-3.5 w-3.5 mr-1" /> Save
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={handleCancelEdit}
                                      >
                                        <X className="h-3.5 w-3.5 mr-1" /> Cancel
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Room Allocation Tab - Full Implementation */}
              <TabsContent value="rooms" className="mt-4">
                <Card className="shadow-sm border border-slate-200/70">
                  <CardHeader className="pb-3 border-b bg-gradient-to-r from-emerald-50 via-emerald-25 to-transparent">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <CardTitle className="text-sm flex items-center gap-2 font-semibold">
                        <BedDouble className="h-4 w-4 text-emerald-600" />
                        Room Allocations & Transport
                      </CardTitle>
                      <div className="flex flex-wrap gap-2">
                        {variant.variantHotelMappings.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs flex items-center gap-1 border-emerald-400/40 hover:bg-emerald-50"
                            disabled={loading}
                            onClick={() => {
                              const mappings = variant.variantHotelMappings;
                              if (mappings.length <= 1) return;
                              const firstItineraryId = mappings[0].itinerary?.id || '';
                              const currentAllocations = variantRoomAllocations || {};
                              const variantData = currentAllocations[variant.id] || {};
                              const firstRooms = variantData[firstItineraryId] || [];
                              const currentTransport = variantTransportDetails || {};
                              const variantTransport = currentTransport[variant.id] || {};
                              const firstTransport = variantTransport[firstItineraryId] || [];
                              
                              if (firstRooms.length === 0 && firstTransport.length === 0) {
                                toast.error('No room allocations or transport details on first day to copy');
                                return;
                              }

                              const newAllocations = { ...variantData };
                              const newTransports = { ...variantTransport };
                              mappings.slice(1).forEach(m => {
                                const itId = m.itinerary?.id || '';
                                if (firstRooms.length > 0) {
                                  newAllocations[itId] = firstRooms.map((r: any) => ({ ...r }));
                                }
                                if (firstTransport.length > 0) {
                                  newTransports[itId] = firstTransport.map((t: any) => ({ ...t }));
                                }
                              });
                              
                              if (firstRooms.length > 0) {
                                form.setValue('variantRoomAllocations', { ...currentAllocations, [variant.id]: newAllocations });
                              }
                              if (firstTransport.length > 0) {
                                form.setValue('variantTransportDetails', { ...currentTransport, [variant.id]: newTransports });
                              }
                              toast.success('Copied first day rooms & transport to all days');
                            }}
                          >
                            <Copy className="h-3 w-3" /> Copy First Day
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {variant.variantHotelMappings.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        <BedDouble className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                        No itinerary days available. Hotel mappings needed first.
                      </div>
                    ) : (
                      <Accordion type="multiple" className="space-y-3">
                        {variant.variantHotelMappings.map((mapping, mIndex) => {
                          const itineraryId = mapping.itinerary?.id || '';
                          const effectiveHotelId = getEffectiveHotelId(variant.id, itineraryId, mapping.hotel?.id || '');
                          const effectiveHotel = hotels.find(h => h.id === effectiveHotelId) || mapping.hotel;
                          const dayRoomAllocations = variantRoomAllocations?.[variant.id]?.[itineraryId] || [];
                          const dayTransportDetails = variantTransportDetails?.[variant.id]?.[itineraryId] || [];

                          return (
                            <AccordionItem key={mIndex} value={`room-${mIndex}`} className="border rounded-md overflow-hidden shadow-sm bg-white hover:shadow-md">
                              <AccordionTrigger className="px-4 py-3 data-[state=open]:bg-gradient-to-r data-[state=open]:from-emerald-50 data-[state=open]:to-emerald-100/30">
                                <div className="flex items-center gap-3 w-full text-left">
                                  <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border bg-emerald-600 text-white border-emerald-600">
                                    {mapping.itinerary?.dayNumber || mIndex + 1}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate" dangerouslySetInnerHTML={{ __html: mapping.itinerary?.itineraryTitle || `Day ${mIndex + 1}` }} />
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {effectiveHotel && (
                                        <Badge variant="outline" className="h-5 px-1.5 text-xs">
                                          <HotelIcon className="h-2.5 w-2.5 mr-1" /> {effectiveHotel.name}
                                        </Badge>
                                      )}
                                      <Badge variant="outline" className="h-5 px-1.5 text-xs">
                                        <BedDouble className="h-2.5 w-2.5 mr-1" /> {dayRoomAllocations.length} room{dayRoomAllocations.length !== 1 ? 's' : ''}
                                      </Badge>
                                      {dayTransportDetails.length > 0 && (
                                        <Badge variant="outline" className="h-5 px-1.5 text-xs">
                                          <Car className="h-2.5 w-2.5 mr-1" /> {dayTransportDetails.length} transport
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-4 pt-3 border-t space-y-4">
                                {/* Room Allocations Section */}
                                {roomTypes.length > 0 && occupancyTypes.length > 0 && mealPlans.length > 0 && (
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-xs font-semibold uppercase tracking-wide text-emerald-700 flex items-center gap-1">
                                        <Users className="h-3.5 w-3.5" /> Room Allocations
                                      </h4>
                                    </div>
                                    {dayRoomAllocations.map((room: any, rIndex: number) => (
                                      <Card key={rIndex} className="border-muted/40 shadow-sm">
                                        <CardHeader className="py-2 px-3 flex flex-row items-center justify-between bg-slate-50/60">
                                          <CardTitle className="text-xs font-medium flex items-center gap-1">
                                            <BedDouble className="h-3.5 w-3.5 text-emerald-600" /> Room {rIndex + 1}
                                          </CardTitle>
                                          <Button type="button" variant="ghost" size="icon" className="hover:text-red-600 h-7 w-7" disabled={loading}
                                            onClick={() => removeRoomAllocation(variant.id, itineraryId, rIndex)}>
                                            <Trash className="h-3.5 w-3.5" />
                                          </Button>
                                        </CardHeader>
                                        <CardContent className="pt-3 space-y-3">
                                          {/* Custom Room Type Toggle */}
                                          <div className="flex items-center space-x-2">
                                            <Checkbox
                                              id={`custom-room-${variant.id}-${itineraryId}-${rIndex}`}
                                              checked={room.useCustomRoomType || false}
                                              onCheckedChange={(checked) => {
                                                updateRoomAllocation(variant.id, itineraryId, rIndex, 'useCustomRoomType', checked);
                                                if (checked) {
                                                  updateRoomAllocation(variant.id, itineraryId, rIndex, 'roomTypeId', '');
                                                } else {
                                                  updateRoomAllocation(variant.id, itineraryId, rIndex, 'customRoomType', '');
                                                }
                                              }}
                                              disabled={loading}
                                            />
                                            <label htmlFor={`custom-room-${variant.id}-${itineraryId}-${rIndex}`} className="text-xs font-medium text-gray-700 cursor-pointer">
                                              Custom Room Type
                                            </label>
                                          </div>

                                          {/* Main Fields Grid */}
                                          <div className="grid gap-3 md:grid-cols-4">
                                            {/* Room Type - Conditional */}
                                            {room.useCustomRoomType ? (
                                              <div>
                                                <label className="text-[10px] uppercase tracking-wide font-medium text-slate-600 block mb-1">Custom Room Type</label>
                                                <Input
                                                  placeholder="Enter room type"
                                                  className="h-8 text-xs"
                                                  value={room.customRoomType || ''}
                                                  onChange={(e) => updateRoomAllocation(variant.id, itineraryId, rIndex, 'customRoomType', e.target.value)}
                                                  disabled={loading}
                                                />
                                              </div>
                                            ) : (
                                              <div>
                                                <label className="text-[10px] uppercase tracking-wide font-medium text-slate-600 block mb-1">Room Type</label>
                                                <Select disabled={loading}
                                                  value={room.roomTypeId || undefined}
                                                  onValueChange={(val) => updateRoomAllocation(variant.id, itineraryId, rIndex, 'roomTypeId', val)}>
                                                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Room" /></SelectTrigger>
                                                  <SelectContent>
                                                    {roomTypes.map(rt => <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>)}
                                                  </SelectContent>
                                                </Select>
                                              </div>
                                            )}

                                            {/* Occupancy Type */}
                                            <div>
                                              <label className="text-[10px] uppercase tracking-wide font-medium text-slate-600 block mb-1">Occupancy</label>
                                              <Select disabled={loading}
                                                value={room.occupancyTypeId || undefined}
                                                onValueChange={(val) => updateRoomAllocation(variant.id, itineraryId, rIndex, 'occupancyTypeId', val)}>
                                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Occupancy" /></SelectTrigger>
                                                <SelectContent>
                                                  {occupancyTypes.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                                                </SelectContent>
                                              </Select>
                                            </div>

                                            {/* Meal Plan */}
                                            <div>
                                              <label className="text-[10px] uppercase tracking-wide font-medium text-slate-600 block mb-1">Meal Plan</label>
                                              <Select disabled={loading}
                                                value={room.mealPlanId || undefined}
                                                onValueChange={(val) => updateRoomAllocation(variant.id, itineraryId, rIndex, 'mealPlanId', val)}>
                                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Meal" /></SelectTrigger>
                                                <SelectContent>
                                                  {mealPlans.map(mp => <SelectItem key={mp.id} value={mp.id}>{mp.name}</SelectItem>)}
                                                </SelectContent>
                                              </Select>
                                            </div>

                                            {/* Quantity */}
                                            <div>
                                              <label className="text-[10px] uppercase tracking-wide font-medium text-slate-600 block mb-1">Qty</label>
                                              <Input type="number" min={0} className="h-8 text-xs"
                                                value={room.quantity || ''}
                                                onChange={(e) => updateRoomAllocation(variant.id, itineraryId, rIndex, 'quantity', parseInt(e.target.value) || 0)}
                                                disabled={loading} />
                                            </div>
                                          </div>

                                          {/* Voucher Number */}
                                          <div>
                                            <label className="text-[10px] uppercase tracking-wide font-medium text-slate-600 flex items-center gap-1 mb-1">
                                              <Receipt className="h-3 w-3" /> Hotel Voucher Number
                                            </label>
                                            <Input
                                              placeholder="Enter hotel booking voucher number"
                                              className="h-8 text-xs"
                                              value={room.voucherNumber || ''}
                                              onChange={(e) => updateRoomAllocation(variant.id, itineraryId, rIndex, 'voucherNumber', e.target.value)}
                                              disabled={loading}
                                            />
                                          </div>
                                        </CardContent>
                                      </Card>
                                    ))}
                                    <Button type="button" variant="outline" size="sm" disabled={loading}
                                      onClick={() => addRoomAllocation(variant.id, itineraryId)}
                                      className="w-full border-dashed hover:border-solid">
                                      <Plus className="h-4 w-4 mr-1" /> Add Room
                                    </Button>
                                  </div>
                                )}

                                {/* Transport Details Section */}
                                {vehicleTypes.length > 0 && (
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-xs font-semibold uppercase tracking-wide text-sky-700 flex items-center gap-1">
                                        <Car className="h-3.5 w-3.5" /> Transport Details
                                      </h4>
                                    </div>
                                    {dayTransportDetails.map((transport: any, tIndex: number) => (
                                      <Card key={tIndex} className="border-muted/40 shadow-sm">
                                        <CardHeader className="py-2 px-3 flex flex-row items-center justify-between bg-slate-50/60">
                                          <CardTitle className="text-xs font-medium flex items-center gap-1">
                                            <Car className="h-3.5 w-3.5 text-sky-600" /> Transport {tIndex + 1}
                                          </CardTitle>
                                          <Button type="button" variant="ghost" size="icon" className="hover:text-red-600 h-7 w-7" disabled={loading}
                                            onClick={() => removeTransportDetail(variant.id, itineraryId, tIndex)}>
                                            <Trash className="h-3.5 w-3.5" />
                                          </Button>
                                        </CardHeader>
                                        <CardContent className="pt-3">
                                          <div className="grid gap-3 md:grid-cols-3">
                                            {/* Vehicle Type */}
                                            <div>
                                              <label className="text-[10px] uppercase tracking-wide font-medium text-slate-600 block mb-1">Vehicle Type</label>
                                              <Select disabled={loading}
                                                value={transport.vehicleTypeId || undefined}
                                                onValueChange={(val) => updateTransportDetail(variant.id, itineraryId, tIndex, 'vehicleTypeId', val)}>
                                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Vehicle" /></SelectTrigger>
                                                <SelectContent>
                                                  {vehicleTypes.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                                                </SelectContent>
                                              </Select>
                                            </div>

                                            {/* Quantity */}
                                            <div>
                                              <label className="text-[10px] uppercase tracking-wide font-medium text-slate-600 block mb-1">Qty</label>
                                              <Input type="number" min={0} className="h-8 text-xs"
                                                value={transport.quantity || ''}
                                                onChange={(e) => updateTransportDetail(variant.id, itineraryId, tIndex, 'quantity', parseInt(e.target.value) || 0)}
                                                disabled={loading} />
                                            </div>

                                            {/* Description */}
                                            <div>
                                              <label className="text-[10px] uppercase tracking-wide font-medium text-slate-600 block mb-1">Description</label>
                                              <Input placeholder="Notes" className="h-8 text-xs"
                                                value={transport.description || ''}
                                                onChange={(e) => updateTransportDetail(variant.id, itineraryId, tIndex, 'description', e.target.value)}
                                                disabled={loading} />
                                            </div>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    ))}
                                    <Button type="button" variant="outline" size="sm" disabled={loading}
                                      onClick={() => addTransportDetail(variant.id, itineraryId)}
                                      className="w-full border-dashed hover:border-solid">
                                      <Plus className="h-4 w-4 mr-1" /> Add Transport
                                    </Button>
                                  </div>
                                )}
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* PRICING TAB - FULL IMPLEMENTATION */}
              <TabsContent value="pricing" className="mt-4">
                {/* Calculation Method Card */}
                <Card className="shadow-sm border-2 border-blue-200/60 bg-gradient-to-br from-blue-50/30 to-white mb-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-blue-600" />
                      💰 Pricing Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-white rounded-lg border border-slate-200 p-4">
                      <div className="flex items-center mb-3">
                        <Settings className="mr-2 h-4 w-4 text-indigo-600" />
                        <h3 className="text-sm font-semibold">💼 Calculation Method</h3>
                      </div>
                      <RadioGroup 
                        value={variantCalcMethods[variant.id] || 'useTourPackagePricing'} 
                        onValueChange={(v: CalculationMethod) => setVariantCalcMethods(prev => ({...prev, [variant.id]: v}))} 
                        className="space-y-2"
                      >
                        <div className="flex items-center space-x-3 p-3 rounded-lg border hover:border-indigo-300 hover:bg-indigo-50 transition">
                          <RadioGroupItem value="manual" id={`m-${variant.id}`} />
                          <div className="flex-1">
                            <label htmlFor={`m-${variant.id}`} className="text-xs font-medium cursor-pointer flex items-center">
                              <Receipt className="mr-2 h-3.5 w-3.5" />✍️ Manual Pricing Entry
                            </label>
                            <p className="text-[10px] text-slate-500 mt-0.5">Enter pricing components manually with full control</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 p-3 rounded-lg border hover:border-green-300 hover:bg-green-50 transition">
                          <RadioGroupItem value="autoHotelTransport" id={`a-${variant.id}`} />
                          <div className="flex-1">
                            <label htmlFor={`a-${variant.id}`} className="text-xs font-medium cursor-pointer flex items-center">
                              <Calculator className="mr-2 h-3.5 w-3.5" />🤖 Auto Calculate (Hotel + Transport)
                            </label>
                            <p className="text-[10px] text-slate-500 mt-0.5">Automatically calculate based on itinerary hotels and transport</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 p-3 rounded-lg border hover:border-purple-300 hover:bg-purple-50 transition">
                          <RadioGroupItem value="useTourPackagePricing" id={`u-${variant.id}`} />
                          <div className="flex-1">
                            <label htmlFor={`u-${variant.id}`} className="text-xs font-medium cursor-pointer flex items-center">
                              <Package className="mr-2 h-3.5 w-3.5" />📦 Use Tour Package Pricing
                            </label>
                            <p className="text-[10px] text-slate-500 mt-0.5">Use pre-defined pricing from selected tour package template</p>
                          </div>
                        </div>
                      </RadioGroup>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Conditional Pricing Content */}
                {(() => {
                  const calcMethod = variantCalcMethods[variant.id] || 'useTourPackagePricing';
                  
                  // Manual Pricing Entry
                  if (calcMethod === 'manual') {
                    const items = getVariantPricingItems(variant.id);
                    const manualTotal = items.reduce((sum: number, item: any) => sum + (parseFloat(item.price) || 0), 0);
                    const savedPricingData = (form.getValues('variantPricingData') || {})[variant.id];
                    
                    return (
                      <Card className="shadow-sm border border-slate-200/70">
                        <CardHeader className="pb-3 border-b bg-gradient-to-r from-indigo-50 via-indigo-25 to-transparent">
                          <CardTitle className="text-sm flex items-center gap-2 font-semibold">
                            <Receipt className="h-4 w-4 text-indigo-600" />
                            ✍️ Manual Pricing Entry
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                          <Alert className="mb-2">
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                              Add custom pricing components for this variant. Each item has a name, price, and optional description.
                            </AlertDescription>
                          </Alert>

                          {/* Pricing Items */}
                          {items.map((item: any, idx: number) => (
                            <Card key={item.id ?? `manual-${variant.id}-${idx}`} className="border-muted/40 shadow-sm">
                              <CardHeader className="py-2 px-3 flex flex-row items-center justify-between bg-slate-50/60">
                                <CardTitle className="text-xs font-medium flex items-center gap-1">
                                  <IndianRupee className="h-3.5 w-3.5 text-indigo-600" /> Item {idx + 1}
                                </CardTitle>
                                <Button type="button" variant="ghost" size="icon" className="hover:text-red-600 h-7 w-7"
                                  onClick={() => removeManualPricingItem(variant.id, idx)}>
                                  <Trash className="h-3.5 w-3.5" />
                                </Button>
                              </CardHeader>
                              <CardContent className="pt-3">
                                <div className="grid gap-3 md:grid-cols-3">
                                  <div>
                                    <label className="text-[10px] uppercase tracking-wide font-medium text-slate-600 block mb-1">Name</label>
                                    <Input placeholder="e.g. Accommodation" className="h-8 text-xs"
                                      value={item.name || ''}
                                      onChange={(e) => updateManualPricingItem(variant.id, idx, 'name', e.target.value)} />
                                  </div>
                                  <div>
                                    <label className="text-[10px] uppercase tracking-wide font-medium text-slate-600 block mb-1">Price (₹)</label>
                                    <Input type="number" placeholder="0" className="h-8 text-xs"
                                      value={item.price || ''}
                                      onChange={(e) => updateManualPricingItem(variant.id, idx, 'price', e.target.value)} />
                                  </div>
                                  <div>
                                    <label className="text-[10px] uppercase tracking-wide font-medium text-slate-600 block mb-1">Description</label>
                                    <Input placeholder="Details..." className="h-8 text-xs"
                                      value={item.description || ''}
                                      onChange={(e) => updateManualPricingItem(variant.id, idx, 'description', e.target.value)} />
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}

                          <Button type="button" variant="outline" size="sm"
                            onClick={() => addManualPricingItem(variant.id)}
                            className="w-full border-dashed hover:border-solid">
                            <Plus className="h-4 w-4 mr-1" /> Add Pricing Item
                          </Button>

                          {/* Summary */}
                          {items.length > 0 && (
                            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-md">
                              <p className="text-sm font-semibold text-indigo-800 flex justify-between">
                                <span>Total ({items.length} item{items.length !== 1 ? 's' : ''}):</span>
                                <span>{formatCurrency(manualTotal)}</span>
                              </p>
                            </div>
                          )}

                          <Button type="button"
                            onClick={() => applyManualPricing(variant.id)}
                            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white"
                            disabled={loading || items.length === 0}>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Apply Manual Pricing
                          </Button>

                          {/* Show saved pricing data if exists */}
                          {savedPricingData?.method === 'manual' && savedPricingData?.totalPrice && (
                            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                              <p className="text-xs text-green-700 flex items-center gap-1">
                                <CheckCircle className="h-3.5 w-3.5" />
                                Saved: {formatCurrency(parseFloat(savedPricingData.totalPrice))}
                                <span className="text-green-500 ml-1">({new Date(savedPricingData.calculatedAt).toLocaleString()})</span>
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  }
                  
                  // Auto Calculate (Hotel + Transport)
                  if (calcMethod === 'autoHotelTransport') {
                    const calcResult = variantAutoCalcResults[variant.id];
                    const isCalcLoading = variantAutoCalcLoading[variant.id] || false;
                    const savedPricingData = (form.getValues('variantPricingData') || {})[variant.id];
                    
                    return (
                      <Card className="shadow-sm border border-slate-200/70">
                        <CardHeader className="pb-3 border-b bg-gradient-to-r from-green-50 via-green-25 to-transparent">
                          <CardTitle className="text-sm flex items-center gap-2 font-semibold">
                            <Calculator className="h-4 w-4 text-green-600" />
                            🤖 Auto Calculate Pricing
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                          <Alert className="mb-2">
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                              Calculate pricing automatically based on hotel room rates and transport costs from the Room Allocation tab.
                            </AlertDescription>
                          </Alert>

                          {/* Markup Configuration */}
                          <div className="bg-white rounded-lg p-4 border border-green-200">
                            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
                              <div className="flex items-center gap-2">
                                <Target className="h-4 w-4 text-green-600" />
                                <label className="text-sm font-medium text-green-700 whitespace-nowrap">Markup %:</label>
                                <Input
                                  type="number"
                                  className="w-20 h-8 bg-white border-green-300 focus:border-green-500"
                                  value={variantMarkupValues[variant.id] || '0'}
                                  onChange={(e) => setVariantMarkupValues(prev => ({ ...prev, [variant.id]: e.target.value }))}
                                  min="0"
                                  max="100"
                                />
                              </div>
                              <div className="flex-1 max-w-xs">
                                <Select onValueChange={(value) => {
                                  const tiers: Record<string, string> = { standard: '10', premium: '20', luxury: '30' };
                                  if (tiers[value]) {
                                    setVariantMarkupValues(prev => ({ ...prev, [variant.id]: tiers[value] }));
                                  }
                                }}>
                                  <SelectTrigger className="h-8 bg-white border-green-300">
                                    <SelectValue placeholder="🎯 Pricing Tier" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="standard">⭐ Standard (10%)</SelectItem>
                                    <SelectItem value="premium">🌟 Premium (20%)</SelectItem>
                                    <SelectItem value="luxury">✨ Luxury (30%)</SelectItem>
                                    <SelectItem value="custom">🎛️ Custom</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>

                          {/* Calculate and Reset Buttons */}
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              onClick={() => handleAutoCalculate(variant.id)}
                              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md"
                              disabled={loading || isCalcLoading}
                            >
                              {isCalcLoading ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Calculating...</>
                              ) : (
                                <><Calculator className="mr-2 h-4 w-4" /> Calculate Price</>
                              )}
                            </Button>
                            <Button
                              type="button"
                              onClick={() => {
                                // Clear auto-calculation preview result for this variant
                                setVariantAutoCalcResults(prev => {
                                  const newResults = { ...prev };
                                  delete newResults[variant.id];
                                  return newResults;
                                });
                                // Reset markup value for this variant
                                setVariantMarkupValues(prev => ({ ...prev, [variant.id]: '0' }));
                                // Also clear persisted pricing data in the form for this variant, if available
                                try {
                                  // form is expected to be the react-hook-form instance used in this component
                                  // and to contain a "variantPricingData" field shaped as a record keyed by variant id.
                                  const currentPricingData: Record<string, unknown> =
                                    (form as any)?.getValues?.("variantPricingData") || {};
                                  if (currentPricingData && typeof currentPricingData === "object") {
                                    const updatedPricingData = { ...currentPricingData };
                                    delete (updatedPricingData as any)[variant.id];
                                    (form as any)?.setValue?.("variantPricingData", updatedPricingData, {
                                      shouldDirty: true,
                                    });
                                  }
                                } catch {
                                  // Silently ignore if form is not available; preview state is still reset.
                                }
                                toast.success('Price calculation reset');
                              }}
                              variant="outline"
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                              disabled={loading || !calcResult}
                            >
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Reset
                            </Button>
                          </div>

                          {/* Results Display - Using Shared Detailed Breakdown Table */}
                          {calcResult && (
                            <div className="space-y-3">
                              {/* Summary Card */}
                              <div className="p-4 bg-green-50 border border-green-200 rounded-md space-y-2">
                                <p className="text-sm font-semibold text-green-800 flex justify-between">
                                  <span>Total Cost:</span>
                                  <span>{formatCurrency(calcResult.totalCost || 0)}</span>
                                </p>
                                {calcResult.basePrice !== undefined && calcResult.basePrice !== calcResult.totalCost && (
                                  <p className="text-xs text-green-700 flex justify-between">
                                    <span>Base Price:</span>
                                    <span>{formatCurrency(calcResult.basePrice)}</span>
                                  </p>
                                )}
                                {calcResult.appliedMarkup?.percentage > 0 && (
                                  <p className="text-xs text-green-700 flex justify-between">
                                    <span>Markup ({calcResult.appliedMarkup.percentage}%):</span>
                                    <span>+{formatCurrency(calcResult.appliedMarkup.amount)}</span>
                                  </p>
                                )}
                                {calcResult.breakdown && (
                                  <div className="border-t border-green-300 pt-2 mt-2 space-y-1">
                                    <p className="text-xs text-green-700 flex justify-between">
                                      <span>Accommodation:</span>
                                      <span>{formatCurrency(calcResult.breakdown.accommodation || 0)}</span>
                                    </p>
                                    {calcResult.breakdown.transport > 0 && (
                                      <p className="text-xs text-green-700 flex justify-between">
                                        <span>Transport:</span>
                                        <span>{formatCurrency(calcResult.breakdown.transport)}</span>
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Detailed Breakdown Table */}
                              {(() => {
                                // Build itineraries array for the table
                                const variantMappings = variant.variantHotelMappings || [];
                                const variantItineraries = variantMappings.map(mapping => {
                                  const itineraryId = mapping.itinerary?.id || '';
                                  const effectiveHotelId = getEffectiveHotelId(variant.id, itineraryId, mapping.hotel?.id || '');
                                  const dayRooms = variantRoomAllocations?.[variant.id]?.[itineraryId] || [];
                                  const dayTransport = variantTransportDetails?.[variant.id]?.[itineraryId] || [];

                                  return {
                                    dayNumber: mapping.itinerary?.dayNumber || 0,
                                    hotelId: effectiveHotelId,
                                    roomAllocations: dayRooms,
                                    transportDetails: dayTransport,
                                  };
                                });

                                return (
                                  <PricingBreakdownTable
                                    priceCalculationResult={calcResult}
                                    hotels={hotels}
                                    roomTypes={roomTypes}
                                    occupancyTypes={occupancyTypes}
                                    mealPlans={mealPlans}
                                    vehicleTypes={vehicleTypes}
                                    itineraries={variantItineraries}
                                    variant={true}
                                  />
                                );
                              })()}
                            </div>
                          )}

                          {/* Show saved pricing data */}
                          {savedPricingData?.method === 'autoHotelTransport' && savedPricingData?.totalPrice && !calcResult && (
                            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                              <p className="text-xs text-green-700 flex items-center gap-1">
                                <CheckCircle className="h-3.5 w-3.5" />
                                Saved: {formatCurrency(parseFloat(savedPricingData.totalPrice))}
                                <span className="text-green-500 ml-1">({new Date(savedPricingData.calculatedAt).toLocaleString()})</span>
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  }
                  
                  // Use Tour Package Pricing (DEFAULT) - FULL IMPLEMENTATION
                  return (
                    <div className="space-y-4">
                      {/* Configuration Section */}
                      <Card className="shadow-sm border-2 border-purple-200/60 bg-gradient-to-br from-purple-50/30 to-white">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Package className="h-4 w-4 text-purple-600" />
                            📦 Tour Package Pricing Configuration
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Meal Plan Selection */}
                          <div className="bg-white rounded-lg p-4 border border-purple-200">
                            <FormItem className="space-y-3">
                              <FormLabel className="font-semibold text-purple-700 flex items-center">
                                <ShoppingCart className="mr-2 h-4 w-4" />
                                🍽️ Meal Plan <span className="text-red-500">*</span>
                              </FormLabel>
                              <Select
                                disabled={loading}
                                onValueChange={(value) => {
                                  setVariantMealPlanIds(prev => ({ ...prev, [variant.id]: value }));
                                  // Reset when meal plan changes
                                  setVariantAvailableComponents(prev => ({ ...prev, [variant.id]: [] }));
                                  setVariantComponentsFetched(prev => ({ ...prev, [variant.id]: false }));
                                }}
                                value={variantMealPlanIds[variant.id] || undefined}
                              >
                                <FormControl>
                                  <SelectTrigger className="bg-white border-purple-300 focus:border-purple-500">
                                    <SelectValue placeholder="Select Meal Plan" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {mealPlans.map((plan) => (
                                    <SelectItem key={plan.id} value={plan.id}>
                                      🍽️ {plan.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {!variantMealPlanIds[variant.id] && (
                                <p className="text-xs text-red-500 pt-1">Required</p>
                              )}
                            </FormItem>
                          </div>

                          {/* Number of Rooms Selection */}
                          <div className="bg-white rounded-lg p-4 border border-purple-200">
                            <FormItem className="space-y-3">
                              <FormLabel className="font-semibold text-purple-700 flex items-center">
                                <Wallet className="mr-2 h-4 w-4" />
                                🏨 Number of Rooms <span className="text-red-500">*</span>
                              </FormLabel>
                              <div className="flex items-center gap-4">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="outline"
                                  className="rounded-full w-10 h-10 flex-shrink-0 bg-white border-purple-300 hover:bg-purple-50"
                                  onClick={() => handleRoomCountChange(variant.id, (variantRoomCounts[variant.id] || 1) - 1)}
                                  disabled={loading || (variantRoomCounts[variant.id] || 1) <= 1}
                                >
                                  <span className="text-lg font-bold text-purple-600">-</span>
                                </Button>
                                <Input
                                  type="number"
                                  value={variantRoomCounts[variant.id] || 1}
                                  onChange={(e) => handleRoomCountChange(variant.id, parseInt(e.target.value) || 1)}
                                  min="1"
                                  disabled={loading}
                                  className="w-24 text-center bg-white border-purple-300 focus:border-purple-500 font-semibold text-lg"
                                />
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="outline"
                                  className="rounded-full w-10 h-10 flex-shrink-0 bg-white border-purple-300 hover:bg-purple-50"
                                  onClick={() => handleRoomCountChange(variant.id, (variantRoomCounts[variant.id] || 1) + 1)}
                                  disabled={loading}
                                >
                                  <span className="text-lg font-bold text-purple-600">+</span>
                                </Button>
                                <div className="flex items-center bg-purple-100 px-3 py-2 rounded-lg">
                                  <span className="text-sm font-medium text-purple-700">
                                    🏨 {variantRoomCounts[variant.id] || 1} room{(variantRoomCounts[variant.id] || 1) > 1 ? 's' : ''}
                                  </span>
                                </div>
                              </div>
                            </FormItem>
                          </div>

                          {/* Fetch Button */}
                          <Button
                            type="button"
                            onClick={() => handleFetchVariantPricingComponents(variant.id)}
                            className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-md"
                            disabled={loading || !variantMealPlanIds[variant.id] || (variantRoomCounts[variant.id] || 1) <= 0}
                          >
                            <Calculator className="mr-2 h-4 w-4" />
                            🔍 Fetch Available Pricing Components
                          </Button>
                        </CardContent>
                      </Card>

                      {/* Pricing Components Selection */}
                      {variantComponentsFetched[variant.id] && variantAvailableComponents[variant.id]?.length > 0 && (
                        <Card className="shadow-sm border border-blue-200/70 bg-blue-50/30">
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-center">
                              <CardTitle className="text-sm flex items-center gap-2 font-semibold">
                                <CheckCircle className="h-4 w-4 text-blue-600" />
                                Select Pricing Components
                              </CardTitle>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setVariantAvailableComponents(prev => ({ ...prev, [variant.id]: [] }));
                                  setVariantSelectedComponentIds(prev => ({ ...prev, [variant.id]: [] }));
                                  setVariantComponentQuantities(prev => ({ ...prev, [variant.id]: {} }));
                                  setVariantComponentsFetched(prev => ({ ...prev, [variant.id]: false }));
                                  toast.success("Selection cleared");
                                }}
                                className="text-blue-600 hover:text-blue-800 border-blue-300"
                              >
                                Clear
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <p className="text-sm text-blue-700">
                              Choose which pricing components to include:
                            </p>

                            {/* Select/Deselect All */}
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const allIds = variantAvailableComponents[variant.id].map((c: any) => c.id);
                                  setVariantSelectedComponentIds(prev => ({ ...prev, [variant.id]: allIds }));
                                }}
                                className="text-xs"
                              >
                                Select All
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setVariantSelectedComponentIds(prev => ({ ...prev, [variant.id]: [] }))}
                                className="text-xs"
                              >
                                Deselect All
                              </Button>
                            </div>

                            {/* Components List */}
                            <div className="space-y-3">
                              {variantAvailableComponents[variant.id].map((component: any) => {
                                const selected = (variantSelectedComponentIds[variant.id] || []).includes(component.id);
                                const quantity = (variantComponentQuantities[variant.id] || {})[component.id] || 1;
                                const totalPrice = calculateComponentTotalPrice(component, quantity);

                                return (
                                  <div key={component.id} className="flex items-center space-x-3 p-3 bg-white rounded-md border">
                                    <Checkbox
                                      id={`comp-${variant.id}-${component.id}`}
                                      checked={selected}
                                      onCheckedChange={() => handleToggleComponent(variant.id, component.id)}
                                    />
                                    <label
                                      htmlFor={`comp-${variant.id}-${component.id}`}
                                      className="flex-1 cursor-pointer"
                                    >
                                      <div className="flex justify-between items-center">
                                        <div className="flex-1">
                                          <p className="font-medium text-gray-900 text-sm">
                                            {component.pricingAttribute?.name || 'Component'}
                                          </p>
                                          <p className="text-xs text-gray-500 mt-1">
                                            <span className="font-medium">Sales Price:</span> ₹{parseFloat(component.price || '0').toFixed(2)} per person
                                            {component.purchasePrice && (
                                              <span className="ml-3">
                                                <span className="font-medium text-orange-600">Purchase Price:</span> ₹{parseFloat(component.purchasePrice || '0').toFixed(2)} per person
                                              </span>
                                            )}
                                            {getOccupancyMultiplier(component.pricingAttribute?.name || '') > 1 && (
                                              <span className="text-blue-600 mt-1 block">
                                                (×{getOccupancyMultiplier(component.pricingAttribute?.name || '')} for {component.pricingAttribute?.name?.toLowerCase().includes('double') ? 'Double' : component.pricingAttribute?.name?.toLowerCase().includes('triple') ? 'Triple' : component.pricingAttribute?.name?.toLowerCase().includes('quad') ? 'Quad' : 'Multi'} occupancy)
                                              </span>
                                            )}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                          {/* Quantity Selector */}
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-600">Rooms:</span>
                                            <Button
                                              type="button"
                                              size="icon"
                                              variant="outline"
                                              className="rounded-full w-6 h-6"
                                              onClick={() => handleComponentQuantityChange(variant.id, component.id, quantity - 1)}
                                              disabled={quantity <= 1}
                                            >
                                              <span className="text-sm font-bold">-</span>
                                            </Button>
                                            <Input
                                              type="number"
                                              value={quantity}
                                              onChange={(e) => handleComponentQuantityChange(variant.id, component.id, parseInt(e.target.value) || 1)}
                                              min="1"
                                              className="w-16 text-center text-sm h-6"
                                            />
                                            <Button
                                              type="button"
                                              size="icon"
                                              variant="outline"
                                              className="rounded-full w-6 h-6"
                                              onClick={() => handleComponentQuantityChange(variant.id, component.id, quantity + 1)}
                                            >
                                              <span className="text-sm font-bold">+</span>
                                            </Button>
                                          </div>
                                          {/* Total Price */}
                                          <div className="text-right">
                                            <p className="font-semibold text-gray-900">{formatCurrency(totalPrice)}</p>
                                            {quantity > 1 && (
                                              <p className="text-xs text-gray-500">
                                                {quantity} rooms
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </label>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Summary */}
                            {(variantSelectedComponentIds[variant.id] || []).length > 0 && (
                              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                                <p className="text-sm font-medium text-green-800">
                                  Selected: {(variantSelectedComponentIds[variant.id] || []).length} component{(variantSelectedComponentIds[variant.id] || []).length !== 1 ? 's' : ''}
                                </p>
                                <div className="text-sm text-green-700 mt-1 space-y-1">
                                  {variantAvailableComponents[variant.id]
                                    .filter((comp: any) => (variantSelectedComponentIds[variant.id] || []).includes(comp.id))
                                    .map((comp: any) => {
                                      const quantity = (variantComponentQuantities[variant.id] || {})[comp.id] || 1;
                                      const componentName = comp.pricingAttribute?.name || 'Component';
                                      const occupancyMultiplier = getOccupancyMultiplier(componentName);
                                      const compTotalPrice = calculateComponentTotalPrice(comp, quantity);
                                      return (
                                        <div key={comp.id} className="flex justify-between text-xs">
                                          <span>{componentName} {quantity > 1 ? `(${quantity} rooms)` : ''}
                                            {occupancyMultiplier > 1 ? ` × ${occupancyMultiplier}` : ''}
                                          </span>
                                          <span>₹{compTotalPrice.toFixed(2)}</span>
                                        </div>
                                      );
                                    })}
                                </div>
                                <div className="border-t border-green-300 mt-2 pt-2">
                                  <p className="text-sm font-semibold text-green-800 flex justify-between">
                                    <span>Total:</span>
                                    <span>
                                      {formatCurrency(
                                        variantAvailableComponents[variant.id]
                                          .filter((c: any) => (variantSelectedComponentIds[variant.id] || []).includes(c.id))
                                          .reduce((sum: number, c: any) => {
                                            const qty = (variantComponentQuantities[variant.id] || {})[c.id] || 1;
                                            return sum + calculateComponentTotalPrice(c, qty);
                                          }, 0)
                                      )}
                                    </span>
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Apply Button */}
                            <Button
                              type="button"
                              onClick={() => handleApplySelectedComponents(variant.id)}
                              className="w-full bg-green-500 hover:bg-green-600 text-white"
                              disabled={loading || (variantSelectedComponentIds[variant.id] || []).length === 0}
                            >
                              <Calculator className="mr-2 h-4 w-4" />
                              Apply Selected Components ({(variantSelectedComponentIds[variant.id] || []).length})
                            </Button>
                          </CardContent>
                        </Card>
                      )}

                      {/* Display Existing Pricing (if available) */}
                      {variant.tourPackagePricings.length > 0 && !variantComponentsFetched[variant.id] && (
                        <Card className="shadow-sm border border-slate-200/70">
                          <CardHeader className="pb-3 border-b bg-gradient-to-r from-emerald-50 via-emerald-25 to-transparent">
                            <CardTitle className="text-sm flex items-center gap-2 font-semibold">
                              <IndianRupee className="h-4 w-4 text-emerald-600" />
                              Pre-defined Pricing ({variant.tourPackagePricings.length})
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-4">
                            <Alert className="mb-4">
                              <Info className="h-4 w-4" />
                              <AlertDescription>
                                This variant has {variant.tourPackagePricings.length} pre-defined pricing period{variant.tourPackagePricings.length > 1 ? 's' : ''}. 
                                Use the configuration above to fetch and customize pricing components.
                              </AlertDescription>
                            </Alert>
                          </CardContent>
                        </Card>
                      )}

                      {/* Saved Pricing Data Indicator */}
                      {(() => {
                        const savedData = (form.getValues('variantPricingData') || {})[variant.id];
                        if (savedData?.method === 'useTourPackagePricing' && savedData?.totalPrice) {
                          return (
                            <Card className="shadow-sm border border-green-200 bg-green-50/50">
                              <CardContent className="py-3">
                                <p className="text-xs text-green-700 flex items-center gap-1">
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  <span className="font-medium">Pricing Applied:</span> {formatCurrency(parseFloat(savedData.totalPrice))}
                                  {savedData.pricingItems?.length > 0 && (
                                    <span className="text-green-500 ml-1">({savedData.pricingItems.length} component{savedData.pricingItems.length !== 1 ? 's' : ''})</span>
                                  )}
                                  <span className="text-green-500 ml-auto text-[10px]">{new Date(savedData.calculatedAt).toLocaleString()}</span>
                                </p>
                              </CardContent>
                            </Card>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  );
                })()}

                {/* Pricing Breakdown Section (Always visible and editable) - mirrors PricingTab */}
                <Card className="shadow-sm border border-slate-200/70 mt-4">
                  <CardHeader className="pb-3 border-b">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-sm flex items-center gap-2 font-semibold">
                        <Receipt className="h-4 w-4 text-blue-600" />
                        💰 Pricing Breakdown
                      </CardTitle>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={loading}
                        onClick={() => addVariantPricingBreakdownItem(variant.id)}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        ➕ Add Item
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    {(() => {
                      const items = getVariantPricingItems(variant.id);
                      if (items.length === 0) {
                        return (
                          <div className="text-center py-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-dashed border-blue-300">
                            <Receipt className="mx-auto h-12 w-12 text-blue-400 mb-3" />
                            <p className="text-slate-600 mb-4">No pricing items added yet</p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="border-dashed border-blue-400 text-blue-600 hover:bg-blue-50"
                              disabled={loading}
                              onClick={() => addVariantPricingBreakdownItem(variant.id)}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              ➕ Add Your First Pricing Option
                            </Button>
                          </div>
                        );
                      }
                      return items.map((item: any, index: number) => (
                        <div key={item.id ?? `${variant.id}-${index}`} className="bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-lg p-4 hover:shadow-md transition-all duration-200">
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-grow">
                            <div>
                              <label className="text-xs font-semibold text-slate-700 flex items-center mb-1">
                                <Sparkles className="mr-1 h-3 w-3 text-yellow-500" />
                                Item Name
                              </label>
                              <Input
                                value={item.name || ''}
                                disabled={loading}
                                placeholder="e.g., Per Person Cost"
                                className="bg-white border-slate-300 focus:border-blue-500 h-8 text-xs"
                                onChange={(e) => updateVariantPricingItem(variant.id, index, 'name', e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-slate-700 flex items-center mb-1">
                                <IndianRupee className="mr-1 h-3 w-3 text-green-500" />
                                Price (Base)
                              </label>
                              <Input
                                value={item.price || ''}
                                disabled={loading}
                                placeholder="e.g., 15000"
                                type="number"
                                className="bg-white border-slate-300 focus:border-blue-500 h-8 text-xs"
                                onChange={(e) => updateVariantPricingItem(variant.id, index, 'price', e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-slate-700 flex items-center mb-1">
                                <Calculator className="mr-1 h-3 w-3 text-blue-500" />
                                Calculation & Total
                              </label>
                              <Input
                                value={item.description || ''}
                                disabled={loading}
                                placeholder="e.g., 15000.00 × 3 occupancy × 3 rooms = Rs. 135000"
                                className="bg-white border-slate-300 focus:border-blue-500 h-8 text-xs"
                                onChange={(e) => updateVariantPricingItem(variant.id, index, 'description', e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="flex justify-end mt-3">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={loading}
                              onClick={() => removeVariantPricingBreakdownItem(variant.id, index)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors h-7 w-7"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ));
                    })()}
                  </CardContent>
                </Card>

                {/* Total Package Price (Always visible and editable) - mirrors PricingTab */}
                <Card className="shadow-sm border border-orange-200 bg-gradient-to-r from-orange-50 to-red-50 mt-4">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-3">
                      <Target className="mr-2 h-6 w-6 text-orange-600" />
                      <h3 className="text-xl font-bold text-orange-800">🎯 Total Package Price</h3>
                    </div>
                    <div>
                      <label className="text-base font-semibold text-orange-700 flex items-center mb-2">
                        💰 Final Amount
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-lg font-bold text-orange-600">₹</span>
                        <Input
                          value={getVariantTotalPrice(variant.id)}
                          disabled={loading}
                          placeholder="Total price for the package"
                          className="text-2xl font-bold pl-8 bg-white border-orange-300 focus:border-orange-500 h-14"
                          type="number"
                          onChange={(e) => setVariantTotalPrice(variant.id, e.target.value)}
                        />
                      </div>
                      <p className="text-sm text-orange-600 mt-2 flex items-center">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        This represents the final total price for this variant
                      </p>
                      <p className="text-xs text-orange-500 mt-1 bg-orange-50 px-2 py-1 rounded border border-orange-200">
                        including GST
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Configuration Summary - mirrors PricingTab */}
                {(() => {
                  const mealPlanId = variantMealPlanIds[variant.id];
                  const roomCount = variantRoomCounts[variant.id] || 1;
                  if (!mealPlanId && roomCount <= 1) return null;
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {mealPlanId && (
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 shadow-sm">
                          <div className="flex items-center mb-2">
                            <ShoppingCart className="mr-2 h-4 w-4 text-green-600" />
                            <p className="text-sm font-semibold text-green-700">Selected Meal Plan:</p>
                          </div>
                          <div className="flex items-center bg-white p-2 rounded-md border border-green-200">
                            <span className="text-lg mr-2">🍽️</span>
                            <p className="font-semibold text-green-800">
                              {mealPlans.find(mp => mp.id === mealPlanId)?.name || 'Unknown Meal Plan'}
                            </p>
                          </div>
                        </div>
                      )}
                      {roomCount > 0 && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 shadow-sm">
                          <div className="flex items-center mb-2">
                            <Wallet className="mr-2 h-4 w-4 text-blue-600" />
                            <p className="text-sm font-semibold text-blue-700">Room Configuration:</p>
                          </div>
                          <div className="flex items-center justify-between bg-white p-2 rounded-md border border-blue-200">
                            <div className="flex items-center">
                              <span className="text-lg mr-2">🏨</span>
                              <span className="font-semibold text-blue-800">Number of Rooms</span>
                            </div>
                            <div className="bg-blue-100 px-3 py-1 rounded-full">
                              <span className="text-sm font-bold text-blue-700">
                                {roomCount} room{roomCount > 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Remarks Section - mirrors PricingTab */}
                <Card className="shadow-sm border border-slate-200/70 mt-4">
                  <CardContent className="p-5">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium mb-2">
                        <Receipt className="h-4 w-4 text-indigo-600" />
                        Remarks
                      </label>
                      <Input
                        disabled={loading}
                        placeholder="Additional remarks for this variant's pricing"
                        value={getVariantRemarks(variant.id)}
                        onChange={(e) => setVariantRemarks(variant.id, e.target.value)}
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Add any special notes or requirements for this variant (will appear below Total Price)
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default QueryVariantsTab;
