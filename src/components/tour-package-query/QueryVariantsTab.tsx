"use client";
import { useState, useEffect } from "react";
import { Control, useWatch } from "react-hook-form";
import { Hotel, Images, PackageVariant, VariantHotelMapping, Itinerary, TourPackagePricing, PricingComponent, PricingAttribute, MealPlan, VehicleType, LocationSeasonalPeriod } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sparkles, Hotel as HotelIcon, IndianRupee, Calendar, Info, AlertCircle, Edit2, Check, X, Utensils as UtensilsIcon, Car, Receipt, BedDouble, Users, Calculator, Plus, Trash, Settings, Package, CreditCard, ShoppingCart, Wallet, CheckCircle, RefreshCw, Target, Star, Trophy, DollarSign, Copy } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { FormControl, FormItem, FormLabel } from "@/components/ui/form";
import Image from "next/image";
import { toast } from "react-hot-toast";
import axios from "axios";
import { utcToLocal } from "@/lib/timezone-utils";

// Calculation method type for pricing
type CalculationMethod = 'manual' | 'autoHotelTransport' | 'useTourPackagePricing';

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
  const queryStartDate = useWatch({ control, name: "tourStartsFrom" });
  const queryEndDate = useWatch({ control, name: "tourEndsOn" });
  const savedVariantPricingData = useWatch({ control, name: "variantPricingData" }) as Record<string, any> | undefined;

  const [editingMapping, setEditingMapping] = useState<string | null>(null);
  const [tempHotelId, setTempHotelId] = useState<string>("");
  const [variantCalcMethods, setVariantCalcMethods] = useState<Record<string, CalculationMethod>>({});
  const [copyFromVariantId, setCopyFromVariantId] = useState<Record<string, string>>({});

  // Pricing state for each variant
  const [variantMealPlanIds, setVariantMealPlanIds] = useState<Record<string, string>>({});
  const [variantRoomCounts, setVariantRoomCounts] = useState<Record<string, number>>({});
  const [variantAvailableComponents, setVariantAvailableComponents] = useState<Record<string, any[]>>({});
  const [variantSelectedComponentIds, setVariantSelectedComponentIds] = useState<Record<string, string[]>>({});
  const [variantComponentQuantities, setVariantComponentQuantities] = useState<Record<string, Record<string, number>>>({});
  const [variantComponentsFetched, setVariantComponentsFetched] = useState<Record<string, boolean>>({});
  const [variantManualPricingItems, setVariantManualPricingItems] = useState<Record<string, { name: string; price: string; description: string }[]>>({});
  const [variantPriceCalculationResults, setVariantPriceCalculationResults] = useState<Record<string, any>>({});
  const [variantMarkupValues, setVariantMarkupValues] = useState<Record<string, string>>({});
  const [variantPricingTiers, setVariantPricingTiers] = useState<Record<string, 'standard' | 'premium' | 'luxury' | 'custom'>>({});
  // Pricing breakdown items (always-visible, editable), total price, and remarks per variant
  const [variantPricingItems, setVariantPricingItems] = useState<Record<string, { name: string; price: string; description: string }[]>>({});
  const [variantTotalPrices, setVariantTotalPrices] = useState<Record<string, string>>({});
  const [variantRemarks, setVariantRemarks] = useState<Record<string, string>>({});

  // Hydrate state from saved form data when component mounts or when variants change
  useEffect(() => {
    if (savedVariantPricingData && selectedVariantIds && selectedVariantIds.length > 0) {
      const newPricingItems: Record<string, { name: string; price: string; description: string }[]> = {};
      const newTotalPrices: Record<string, string> = {};
      const newRemarks: Record<string, string> = {};

      selectedVariantIds.forEach(variantId => {
        const savedData = savedVariantPricingData[variantId];
        if (savedData) {
          // Hydrate pricing items (components) - include empty arrays to maintain consistency with sync logic
          if (Array.isArray(savedData.components)) {
            newPricingItems[variantId] = savedData.components;
          }
          // Hydrate total price - include zero values
          if (typeof savedData.totalCost === 'number' && Number.isFinite(savedData.totalCost)) {
            newTotalPrices[variantId] = savedData.totalCost.toString();
          }
          // Hydrate remarks - include empty strings to allow cleared remarks
          if (typeof savedData.remarks === 'string') {
            newRemarks[variantId] = savedData.remarks;
          }
        }
      });

      // Replace state entirely for selected variants (don't spread to avoid stale data)
      setVariantPricingItems(newPricingItems);
      setVariantTotalPrices(newTotalPrices);
      setVariantRemarks(newRemarks);
    }
  }, [savedVariantPricingData, selectedVariantIds]);

  const selectedTourPackage = tourPackages?.find(tp => tp.id === selectedTourPackageId);
  const allVariants = selectedTourPackage?.packageVariants || [];
  const selectedVariants = allVariants.filter(v => selectedVariantIds?.includes(v.id));

  // Use form's itineraries if available so it reflects user additions/deletions, otherwise fallback to template
  const itineraries = (queryItineraries && queryItineraries.length > 0)
    ? queryItineraries
    : (selectedTourPackage?.itineraries || []);
  const locationId = selectedTourPackage?.locationId;
  const availableHotels = hotels.filter(h => h.locationId === locationId);

  // Helper function to get occupancy multiplier from component name
  const getOccupancyMultiplier = (componentName: string): number => {
    const name = componentName.toLowerCase();
    if (name.includes('single')) return 1;
    if (name.includes('double')) return 2;
    if (name.includes('triple')) return 3;
    if (name.includes('quad')) return 4;
    return 1;
  };

  // Helper function to calculate total price for a component
  const calculateComponentTotalPrice = (component: any, roomQuantity: number = 1): number => {
    const basePrice = parseFloat(component.price || '0');
    const componentName = component.pricingAttribute?.name || '';
    const occupancyMultiplier = getOccupancyMultiplier(componentName);
    return basePrice * occupancyMultiplier * roomQuantity;
  };

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
      console.log('🚫 [Variants] Missing dates:', { queryStartDate, queryEndDate });
      toast.error("Please select tour start and end dates in the Dates tab.");
      return;
    }

    console.log('✅ [Variants] Dates available:', { queryStartDate, queryEndDate });

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

      const allComponentIds = components.map((comp: any) => comp.id);
      setVariantSelectedComponentIds(prev => ({ ...prev, [variantId]: allComponentIds }));

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

  const handleRoomCountChange = (variantId: string, newCount: number) => {
    if (newCount >= 1) {
      setVariantRoomCounts(prev => ({ ...prev, [variantId]: newCount }));
      setVariantAvailableComponents(prev => ({ ...prev, [variantId]: [] }));
      setVariantSelectedComponentIds(prev => ({ ...prev, [variantId]: [] }));
      setVariantComponentQuantities(prev => ({ ...prev, [variantId]: {} }));
      setVariantComponentsFetched(prev => ({ ...prev, [variantId]: false }));
    }
  };

  const handleTogglePricingComponent = (variantId: string, componentId: string) => {
    setVariantSelectedComponentIds(prev => {
      const current = prev[variantId] || [];
      return current.includes(componentId)
        ? { ...prev, [variantId]: current.filter(id => id !== componentId) }
        : { ...prev, [variantId]: [...current, componentId] };
    });
  };

  const handleComponentRoomQuantityChange = (variantId: string, componentId: string, newQuantity: number) => {
    if (newQuantity >= 1) {
      setVariantComponentQuantities(prev => ({
        ...prev,
        [variantId]: {
          ...(prev[variantId] || {}),
          [componentId]: newQuantity
        }
      }));
    }
  };

  const handleApplySelectedPricingComponents = (variantId: string) => {
    const selectedIds = variantSelectedComponentIds[variantId] || [];
    if (selectedIds.length === 0) {
      toast.error("Please select at least one pricing component to apply.");
      return;
    }

    const components = (variantAvailableComponents[variantId] || []).filter(comp => selectedIds.includes(comp.id));
    const finalComponents: { name: string; price: string; description: string }[] = [];
    let totalPrice = 0;

    components.forEach((comp: any) => {
      const componentName = comp.pricingAttribute?.name || 'Pricing Component';
      const basePrice = parseFloat(comp.price || '0');
      const roomQuantity = (variantComponentQuantities[variantId] || {})[comp.id] || 1;
      const occupancyMultiplier = getOccupancyMultiplier(componentName);
      const totalComponentPrice = calculateComponentTotalPrice(comp, roomQuantity);

      finalComponents.push({
        name: componentName,
        price: basePrice.toString(),
        description: `${basePrice.toFixed(2)} × ${occupancyMultiplier} occupancy${roomQuantity > 1 ? ` × ${roomQuantity} rooms` : ''} = ₹${totalComponentPrice.toFixed(2)}`
      });

      totalPrice += totalComponentPrice;
    });

    const currentPricingData = form.getValues('variantPricingData') || {};
    form.setValue('variantPricingData', {
      ...currentPricingData,
      [variantId]: {
        calculationMethod: 'useTourPackagePricing',
        components: finalComponents,
        totalCost: totalPrice,
        calculatedAt: new Date().toISOString()
      }
    });

    // Also update the always-visible pricing breakdown and total
    setVariantPricingItems(prev => ({ ...prev, [variantId]: finalComponents }));
    setVariantTotalPrices(prev => ({ ...prev, [variantId]: totalPrice.toString() }));

    toast.success(`Applied ${components.length} component${components.length !== 1 ? 's' : ''} successfully!`);
  };

  const handleAddManualPricingItem = (variantId: string) => {
    setVariantManualPricingItems(prev => ({
      ...prev,
      [variantId]: [...(prev[variantId] || []), { name: '', price: '', description: '' }]
    }));
  };

  const handleRemoveManualPricingItem = (variantId: string, index: number) => {
    setVariantManualPricingItems(prev => ({
      ...prev,
      [variantId]: (prev[variantId] || []).filter((_, i) => i !== index)
    }));
  };

  const handleUpdateManualPricingItem = (variantId: string, index: number, field: 'name' | 'price' | 'description', value: string) => {
    setVariantManualPricingItems(prev => ({
      ...prev,
      [variantId]: (prev[variantId] || []).map((item, i) => i === index ? { ...item, [field]: value } : item)
    }));
  };

  const handleApplyManualPricing = (variantId: string) => {
    const items = (variantManualPricingItems[variantId] || []).filter(item => item.name || item.price || item.description);
    if (items.length === 0) {
      toast.error("Please add at least one pricing item.");
      return;
    }

    const totalPrice = items.reduce((sum, item) => sum + Number(item.price || 0), 0);
    const currentPricingData = form.getValues('variantPricingData') || {};
    form.setValue('variantPricingData', {
      ...currentPricingData,
      [variantId]: {
        calculationMethod: 'manual',
        components: items,
        totalCost: totalPrice,
        calculatedAt: new Date().toISOString()
      }
    });

    // Also update the always-visible pricing breakdown and total
    setVariantPricingItems(prev => ({ ...prev, [variantId]: items }));
    setVariantTotalPrices(prev => ({ ...prev, [variantId]: totalPrice.toString() }));

    toast.success("Manual pricing applied successfully!");
  };

  const handleCalculateVariantPricing = async (variant: VariantWithDetails) => {
    const variantId = variant.id;
    const tourStartsFrom = queryStartDate;
    const tourEndsOn = queryEndDate;

    if (!tourStartsFrom || !tourEndsOn) {
      console.log('🚫 [Variants] Missing dates for calculation:', { tourStartsFrom, tourEndsOn });
      toast.error("Please select tour start and end dates first.");
      return;
    }

    console.log('✅ [Variants] Starting price calculation with dates:', { tourStartsFrom, tourEndsOn });

    const pricingItineraries = itineraries.map((itinerary, idx) => {
      const mapping = variant.variantHotelMappings.find(m => m.itineraryId === itinerary.id);
      const baseHotelId = mapping?.hotelId || itinerary.hotelId;
      const hotelId = baseHotelId
        ? getEffectiveHotelId(variantId, itinerary.id, baseHotelId)
        : undefined;

      return {
        locationId: itinerary.locationId || selectedTourPackage?.locationId || '',
        dayNumber: itinerary.dayNumber || idx + 1,
        hotelId,
        roomAllocations: variantRoomAllocations?.[variantId]?.[itinerary.id] || [],
        transportDetails: variantTransportDetails?.[variantId]?.[itinerary.id] || [],
      };
    });

    if (!pricingItineraries.some(it => (it.roomAllocations?.length || 0) > 0 || (it.transportDetails?.length || 0) > 0)) {
      toast.error("Please add room allocations or transport details before calculating.");
      return;
    }

    const markupValue = variantMarkupValues[variantId] || '0';
    const markupPercentage = parseFloat(markupValue) || 0;

    try {
      toast.loading("Calculating variant pricing...");
      const response = await axios.post('/api/pricing/calculate-variant', {
        variantId,
        variantRoomAllocations,
        variantTransportDetails,
        itineraries: pricingItineraries,
        tourStartsFrom,
        tourEndsOn,
        markup: markupPercentage
      });

      const result = response.data;
      toast.dismiss();

      setVariantPriceCalculationResults(prev => ({ ...prev, [variantId]: result }));

      const currentPricingData = form.getValues('variantPricingData') || {};
      form.setValue('variantPricingData', {
        ...currentPricingData,
        [variantId]: {
          calculationMethod: 'autoHotelTransport',
          ...result,
          calculatedAt: result.calculatedAt || new Date().toISOString()
        }
      });

      // Also update the always-visible pricing breakdown and total
      if (result && typeof result === 'object') {
        const totalCost = result.totalCost || 0;
        const pricingItems: { name: string; price: string; description: string }[] = [];
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
        setVariantPricingItems(prev => ({ ...prev, [variantId]: pricingItems }));
        setVariantTotalPrices(prev => ({ ...prev, [variantId]: totalCost.toString() }));
      }

      toast.success("Variant price calculation complete!");
    } catch (error: any) {
      toast.dismiss();
      console.error('Variant pricing error:', error);
      toast.error("Price calculation failed. Please try again.");
    }
  };

  const handleResetVariantCalculation = (variantId: string) => {
    setVariantPriceCalculationResults(prev => ({ ...prev, [variantId]: null }));
    setVariantMarkupValues(prev => ({ ...prev, [variantId]: '0' }));
    setVariantPricingTiers(prev => ({ ...prev, [variantId]: 'standard' }));
    toast.success("Pricing calculation reset");
  };

  // Legacy: Fetch & Apply All Components directly for a variant
  const handleFetchAndApplyAllComponents = async (variantId: string) => {
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

    toast.loading("Fetching and matching tour package pricing...");
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
        return;
      }

      if (matchedPricings.length > 1) {
        toast.error("Multiple pricing periods match. Please refine criteria.");
        return;
      }

      const selectedPricing = matchedPricings[0];
      const finalComponents: { name: string; price: string; description: string }[] = [];
      let totalPrice = 0;

      if (selectedPricing.pricingComponents && selectedPricing.pricingComponents.length > 0) {
        selectedPricing.pricingComponents.forEach((comp: any) => {
          const componentName = comp.pricingAttribute?.name || 'Pricing Component';
          const basePrice = parseFloat(comp.price || '0');
          const occupancyMultiplier = getOccupancyMultiplier(componentName);
          const totalComponentPrice = basePrice * occupancyMultiplier * roomCount;

          finalComponents.push({
            name: componentName,
            price: basePrice.toString(),
            description: `${basePrice.toFixed(2)} × ${occupancyMultiplier} occupancy × ${roomCount} room${roomCount > 1 ? 's' : ''} = ₹${totalComponentPrice.toFixed(2)}`
          });

          totalPrice += totalComponentPrice;
        });
      }

      if (finalComponents.length === 0) {
        finalComponents.push({
          name: 'Tour Package Price',
          price: '0',
          description: `Package price for ${roomCount} room${roomCount > 1 ? 's' : ''}`
        });
      }

      const currentPricingData = form.getValues('variantPricingData') || {};
      form.setValue('variantPricingData', {
        ...currentPricingData,
        [variantId]: {
          calculationMethod: 'useTourPackagePricing',
          components: finalComponents,
          totalCost: totalPrice,
          calculatedAt: new Date().toISOString()
        }
      });

      // Also update the always-visible pricing breakdown and total
      setVariantPricingItems(prev => ({ ...prev, [variantId]: finalComponents }));
      setVariantTotalPrices(prev => ({ ...prev, [variantId]: totalPrice.toString() }));

      toast.success("Tour package pricing applied successfully!");
    } catch (error) {
      toast.dismiss();
      console.error("Error fetching/applying tour package pricing:", error);
      toast.error("Failed to fetch or apply tour package pricing.");
    }
  };

  // Helper functions for variant pricing breakdown items
  const handleAddVariantPricingItem = (variantId: string, insertAtIndex?: number) => {
    const newItem = { name: '', price: '', description: '' };
    setVariantPricingItems(prev => {
      const items = prev[variantId] || [];
      if (insertAtIndex !== undefined) {
        const newItems = [...items];
        newItems.splice(insertAtIndex + 1, 0, newItem);
        return { ...prev, [variantId]: newItems };
      }
      return { ...prev, [variantId]: [...items, newItem] };
    });
  };

  const handleRemoveVariantPricingItem = (variantId: string, index: number) => {
    setVariantPricingItems(prev => ({
      ...prev,
      [variantId]: (prev[variantId] || []).filter((_, i) => i !== index)
    }));
  };

  const handleUpdateVariantPricingItem = (variantId: string, index: number, field: 'name' | 'price' | 'description', value: string) => {
    setVariantPricingItems(prev => ({
      ...prev,
      [variantId]: (prev[variantId] || []).map((item, i) => i === index ? { ...item, [field]: value } : item)
    }));
  };

  // Sync variant pricing items and total back to form data
  const syncVariantPricingToForm = (variantId: string) => {
    const currentPricingData = form.getValues('variantPricingData') || {};
    const existingData = currentPricingData[variantId] || {};

    // For items: Check if state is defined (not undefined). If defined, use it (even if empty array).
    // If undefined, fall back to existing saved data.
    const stateItems = variantPricingItems[variantId];
    const items = stateItems !== undefined
      ? stateItems
      : (Array.isArray(existingData.components) ? existingData.components : []);

    // For totalPrice: Similar logic - if state is defined, use it; otherwise fall back
    const stateTotalPrice = variantTotalPrices[variantId];
    const parsedStateTotal = stateTotalPrice && stateTotalPrice.trim() !== '' ? parseFloat(stateTotalPrice) : NaN;
    const totalCost = stateTotalPrice !== undefined && Number.isFinite(parsedStateTotal)
      ? parsedStateTotal
      : (typeof existingData.totalCost === 'number' && Number.isFinite(existingData.totalCost)
        ? existingData.totalCost
        : 0);

    // For remarks: Check if state is defined (not undefined). If defined, use it (even if empty string).
    // If undefined, fall back to existing saved remarks.
    const stateRemarks = variantRemarks[variantId];
    const remarks = stateRemarks !== undefined
      ? stateRemarks
      : (typeof existingData.remarks === 'string' ? existingData.remarks : '');

    form.setValue('variantPricingData', {
      ...currentPricingData,
      [variantId]: {
        ...existingData,
        components: items,
        totalCost,
        remarks,
        updatedAt: new Date().toISOString()
      }
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

  // Room Allocation Helper Functions
  const addRoomAllocation = (variantId: string, itineraryId: string) => {
    try {
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
      }, { shouldValidate: false, shouldDirty: true });

      toast.success('Room added successfully');
    } catch (error) {
      console.error('Error adding room allocation:', error);
      toast.error('Failed to add room. Please try again.');
    }
  };

  const removeRoomAllocation = (variantId: string, itineraryId: string, allocationIndex: number) => {
    try {
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
      }, { shouldValidate: false, shouldDirty: true });

      toast.success('Room removed successfully');
    } catch (error) {
      console.error('Error removing room allocation:', error);
      toast.error('Failed to remove room. Please try again.');
    }
  };

  const updateRoomAllocation = (variantId: string, itineraryId: string, allocationIndex: number, field: string, value: any) => {
    try {
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
      }, { shouldValidate: false, shouldDirty: true });
    } catch (error) {
      console.error('Error updating room allocation:', error);
      toast.error('Failed to update room. Please try again.');
    }
  };

  // Copy first day's room allocations to all days for a variant
  const copyFirstDayToAllDays = (variantId: string) => {
    try {
      const current = variantRoomAllocations || {};
      const variantData = current[variantId] || {};

      if (!itineraries || itineraries.length === 0) {
        toast.error('No itineraries available');
        return;
      }

      // Get first day's room allocations
      const firstItinerary = itineraries[0];
      const firstDayAllocations = variantData[firstItinerary.id] || [];

      if (firstDayAllocations.length === 0) {
        toast.error('No room allocations on first day to copy');
        return;
      }

      // Copy to all other days
      const newVariantData = { ...variantData };
      itineraries.forEach((itinerary) => {
        // Deep copy the allocations to avoid reference issues
        newVariantData[itinerary.id] = JSON.parse(JSON.stringify(firstDayAllocations));
      });

      form.setValue('variantRoomAllocations', {
        ...current,
        [variantId]: newVariantData
      }, { shouldValidate: false, shouldDirty: true });

      toast.success(`Copied room allocations to all ${itineraries.length} days`);
    } catch (error) {
      console.error('Error copying room allocations to all days:', error);
      toast.error('Failed to copy room allocations. Please try again.');
    }
  };

  // Copy room allocations from one variant to another
  const copyRoomAllocationsFromVariant = (fromVariantId: string, toVariantId: string) => {
    try {
      const current = variantRoomAllocations || {};
      const fromVariantData = current[fromVariantId] || {};

      if (Object.keys(fromVariantData).length === 0) {
        toast.error('No room allocations to copy from selected variant');
        return;
      }

      // Deep copy the allocations to avoid reference issues
      const copiedData = JSON.parse(JSON.stringify(fromVariantData));

      form.setValue('variantRoomAllocations', {
        ...current,
        [toVariantId]: copiedData
      }, { shouldValidate: false, shouldDirty: true });

      toast.success('Room allocations copied successfully');
    } catch (error) {
      console.error('Error copying room allocations from variant:', error);
      toast.error('Failed to copy room allocations. Please try again.');
    }
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

              {/* Hotels Tab */}
              <TabsContent value="hotels" className="mt-4">
                <Card className="shadow-sm border border-slate-200/70">
                  <CardHeader className="pb-3 border-b bg-gradient-to-r from-blue-50 via-blue-100 to-transparent">
                    <CardTitle className="text-sm flex items-center gap-2 font-semibold">
                      <HotelIcon className="h-4 w-4 text-blue-600" />
                      Hotel Mappings ({variant.variantHotelMappings.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {variant.variantHotelMappings.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        <HotelIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                        No hotel mappings configured.
                      </div>
                    ) : (
                      <Accordion type="multiple" className="space-y-3">
                        {variant.variantHotelMappings
                          .slice()
                          .sort((a, b) => {
                            const itinA = a.itinerary || itineraries.find(it => it.id === a.itineraryId);
                            const itinB = b.itinerary || itineraries.find(it => it.id === b.itineraryId);
                            return (itinA?.dayNumber || 0) - (itinB?.dayNumber || 0);
                          })
                          .map((mapping, idx) => {
                            const itinerary = mapping.itinerary || itineraries.find(it => it.id === mapping.itineraryId);
                            const effectiveHotelId = getEffectiveHotelId(variant.id, mapping.itineraryId, mapping.hotelId);
                            const effectiveHotel = availableHotels.find(h => h.id === effectiveHotelId) || mapping.hotel;
                            const isEditing = editingMapping === mapping.id;
                            const isOverridden = variantHotelOverrides?.[variant.id]?.[mapping.itineraryId] !== undefined;

                            const accentColors = [
                              'before:bg-primary/80',
                              'before:bg-emerald-500/80',
                              'before:bg-sky-500/80',
                              'before:bg-violet-500/80',
                              'before:bg-amber-500/80',
                              'before:bg-rose-500/80',
                            ];
                            const accent = accentColors[idx % accentColors.length];

                            return (
                              <AccordionItem
                                key={mapping.id}
                                value={mapping.id}
                                className={`relative border rounded-md overflow-hidden shadow-sm bg-white hover:shadow-md transition pl-0 before:absolute before:inset-y-0 before:left-0 before:w-1 ${accent}`}
                              >
                                <AccordionTrigger className="px-4 py-3 hover:no-underline data-[state=open]:bg-gradient-to-r data-[state=open]:from-primary/5 data-[state=open]:to-primary/10">
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold bg-gradient-to-br from-primary to-primary/80 text-white border border-primary/20 shadow-sm">
                                      {itinerary?.dayNumber || idx + 1}
                                    </div>
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <HotelIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                      <span className="font-medium text-sm truncate">{effectiveHotel.name}</span>
                                    </div>
                                    {isOverridden && (
                                      <Badge variant="secondary" className="text-[10px] px-2 py-0.5 h-5 animate-pulse bg-amber-100 text-amber-700 border border-amber-200">
                                        Modified
                                      </Badge>
                                    )}
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-4 pb-5 pt-4 space-y-4 bg-gradient-to-b from-white to-slate-50/40 border-t">
                                  {effectiveHotel.images && effectiveHotel.images.length > 0 && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                      {effectiveHotel.images.slice(0, 4).map((img, imgIdx) => (
                                        <div key={imgIdx} className="relative h-56 w-full rounded-md overflow-hidden border bg-slate-100 shadow-sm group">
                                          <Image
                                            src={img.url}
                                            alt={effectiveHotel.name}
                                            fill
                                            className="object-cover group-hover:scale-105 transition duration-500"
                                            sizes="(max-width: 768px) 50vw, 25vw"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  <Card className="border-muted/40 bg-slate-50/60">
                                    <CardContent className="pt-3 pb-3">
                                      <div className="grid grid-cols-2 gap-3 text-xs">
                                        <div className="flex flex-col space-y-1">
                                          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">City</span>
                                          <span className="font-medium text-slate-700">{'N/A'}</span>
                                        </div>
                                        <div className="flex flex-col space-y-1">
                                          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Rating</span>
                                          <span className="font-medium text-slate-700">
                                            {'N/A'}
                                          </span>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>

                                  {itinerary && (
                                    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                                      <CardContent className="pt-3 pb-3">
                                        <div className="flex items-start gap-2">
                                          <Calendar className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                          <div className="flex-1 min-w-0">
                                            <div
                                              className="font-semibold text-sm text-slate-800 [&>p]:m-0"
                                              dangerouslySetInnerHTML={{ __html: itinerary.itineraryTitle || '' }}
                                            />
                                            {itinerary.itineraryDescription && (
                                              <div
                                                className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed prose prose-xs max-w-none text-slate-600 [&>p]:m-0"
                                                dangerouslySetInnerHTML={{ __html: itinerary.itineraryDescription }}
                                              />
                                            )}
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  )}

                                  {(() => {
                                    let targetDayNumber: number | undefined;
                                    if (itinerary && typeof itinerary.dayNumber === "number") {
                                      targetDayNumber = itinerary.dayNumber;
                                    } else {
                                      targetDayNumber = idx + 1;
                                    }

                                    const queryItinerary = queryItineraries?.find(
                                      (qi: any) => qi.dayNumber === targetDayNumber
                                    );
                                    const roomAllocations = queryItinerary?.roomAllocations || [];

                                    if (roomAllocations.length > 0) {
                                      return (
                                        <Card className="border-blue-200/60 bg-gradient-to-br from-blue-50/40 to-transparent">
                                          <CardContent className="pt-4 pb-4">
                                            <div className="space-y-3">
                                              <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                                                <BedDouble className="h-3.5 w-3.5 text-blue-600" />
                                                Room Allocations ({roomAllocations.length})
                                              </div>
                                              {roomAllocations.map((room: any, roomIdx: number) => {
                                                const roomType = roomTypes?.find((rt: any) => rt.id === room.roomTypeId);
                                                const occupancyType = occupancyTypes?.find((ot: any) => ot.id === room.occupancyTypeId);
                                                const mealPlan = mealPlans?.find((mp: any) => mp.id === room.mealPlanId);

                                                return (
                                                  <div
                                                    key={roomIdx}
                                                    className="flex items-start gap-3 py-2 px-3 bg-white/80 rounded-md border border-blue-100 text-xs"
                                                  >
                                                    <Users className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                                    <div className="flex-1 space-y-1">
                                                      <div className="flex items-center gap-2 flex-wrap">
                                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-blue-50">
                                                          {room.customRoomType || roomType?.name || 'Room'}
                                                        </Badge>
                                                        {occupancyType && (
                                                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                                            {occupancyType.name}
                                                          </Badge>
                                                        )}
                                                        {mealPlan && (
                                                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-0.5">
                                                            <UtensilsIcon className="h-2.5 w-2.5" />
                                                            {mealPlan.name}
                                                          </Badge>
                                                        )}
                                                        <span className="text-slate-600">×{room.quantity || 1}</span>
                                                      </div>
                                                      {room.guestNames && (
                                                        <div className="text-slate-600 text-[10px]">
                                                          Guests: {room.guestNames}
                                                        </div>
                                                      )}
                                                      {room.voucherNumber && (
                                                        <div className="text-slate-500 text-[10px]">
                                                          Voucher: {room.voucherNumber}
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </CardContent>
                                        </Card>
                                      );
                                    }
                                    return null;
                                  })()}

                                  <div className="flex items-center gap-2 pt-2 border-t">
                                    {isEditing ? (
                                      <Card className="flex-1 border-primary/30">
                                        <CardContent className="p-3 flex items-center gap-2">
                                          <Select value={tempHotelId} onValueChange={setTempHotelId}>
                                            <SelectTrigger className="flex-1 h-9 text-xs bg-white">
                                              <SelectValue placeholder="Select hotel" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {availableHotels.map((hotel) => (
                                                <SelectItem key={hotel.id} value={hotel.id} className="text-xs">
                                                  <div className="flex items-center gap-2">
                                                    {hotel.images?.[0]?.url && (
                                                      <Image src={hotel.images[0].url} alt={hotel.name} width={24} height={18} className="rounded object-cover" />
                                                    )}
                                                    <div className="flex flex-col">
                                                      <span className="font-medium">{hotel.name}</span>
                                                      <span className="text-[10px] text-muted-foreground"> </span>
                                                    </div>
                                                  </div>
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="default"
                                            onClick={() => handleSaveHotelChange(variant.id, mapping.itineraryId, tempHotelId)}
                                            disabled={!tempHotelId}
                                            className="h-9 px-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600"
                                          >
                                            <Check className="h-3.5 w-3.5" />
                                          </Button>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={handleCancelEdit}
                                            className="h-9 px-3"
                                          >
                                            <X className="h-3.5 w-3.5" />
                                          </Button>
                                        </CardContent>
                                      </Card>
                                    ) : (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleStartEdit(mapping.id, effectiveHotelId)}
                                        className="w-full h-9 text-xs hover:bg-primary/5 transition"
                                      >
                                        <Edit2 className="h-3 w-3 mr-2" />
                                        Change Hotel
                                      </Button>
                                    )}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            );
                          })}
                      </Accordion>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Room Allocation Tab */}
              <TabsContent value="rooms" className="mt-4">
                {itineraries.length === 0 ? (
                  <Card className="shadow-sm border border-slate-200/70">
                    <CardContent className="pt-4">
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        <BedDouble className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                        <p>No itineraries configured for this package.</p>
                        <p className="text-xs mt-2">Add itineraries in the Hotels tab first.</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {/* Action Buttons for Room Allocations */}
                    <Card className="shadow-sm border border-blue-200/60 bg-gradient-to-r from-blue-50/30 to-transparent">
                      <CardContent className="pt-4 pb-3">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => copyFirstDayToAllDays(variant.id)}
                            className="h-9 text-xs border-blue-300 hover:bg-blue-50"
                            disabled={itineraries.length === 0}
                          >
                            <Copy className="h-3.5 w-3.5 mr-1.5" />
                            Copy Day 1 to All Days
                          </Button>

                          <div className="flex gap-2 flex-1">
                            <Select
                              value={copyFromVariantId[variant.id] || ""}
                              onValueChange={(value) => setCopyFromVariantId({ ...copyFromVariantId, [variant.id]: value })}
                            >
                              <SelectTrigger className="h-9 text-xs flex-1 border-blue-300">
                                <SelectValue placeholder="Select variant to copy from..." />
                              </SelectTrigger>
                              <SelectContent>
                                {selectedVariants
                                  .filter(v => v.id !== variant.id)
                                  .map((v) => (
                                    <SelectItem key={v.id} value={v.id} className="text-xs">
                                      {v.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const fromId = copyFromVariantId[variant.id];
                                if (fromId) {
                                  copyRoomAllocationsFromVariant(fromId, variant.id);
                                } else {
                                  toast.error('Please select a variant to copy from');
                                }
                              }}
                              className="h-9 text-xs border-blue-300 hover:bg-blue-50"
                              disabled={!copyFromVariantId[variant.id]}
                            >
                              <Copy className="h-3.5 w-3.5 mr-1.5" />
                              Copy Rooms
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Accordion type="multiple" className="space-y-3">
                      {itineraries.map((itinerary, idx) => {
                        const variantRooms = variantRoomAllocations?.[variant.id]?.[itinerary.id] || [];
                        const variantTransports = variantTransportDetails?.[variant.id]?.[itinerary.id] || [];

                        return (
                          <AccordionItem
                            key={itinerary.id}
                            value={itinerary.id}
                            className="border rounded-md shadow-sm bg-white"
                          >
                            <AccordionTrigger className="px-4 py-3 hover:no-underline">
                              <div className="flex items-center gap-3 flex-1">
                                <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                                  {itinerary.dayNumber || idx + 1}
                                </div>
                                <div className="text-left">
                                  <div className="font-medium text-sm" dangerouslySetInnerHTML={{ __html: itinerary.itineraryTitle || `Day ${itinerary.dayNumber || idx + 1}` }} />
                                  <div className="text-xs text-muted-foreground">
                                    {variantRooms.length} room(s), {variantTransports.length} transport(s)
                                  </div>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4 space-y-4">
                              <Card className="border-blue-200/60">
                                <CardHeader className="pb-3">
                                  <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                      <BedDouble className="h-4 w-4 text-blue-600" />
                                      Room Allocations
                                    </CardTitle>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => addRoomAllocation(variant.id, itinerary.id)}
                                      className="h-8 text-xs"
                                    >
                                      <Plus className="h-3 w-3 mr-1" />
                                      Add Room
                                    </Button>
                                  </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  {variantRooms.length === 0 ? (
                                    <div className="text-center py-4 text-sm text-muted-foreground">
                                      No room allocations yet. Click &quot;Add Room&quot; to get started.
                                    </div>
                                  ) : (
                                    variantRooms.map((room: any, roomIdx: number) => (
                                      <div key={roomIdx} className="p-3 border rounded-md space-y-2 bg-gradient-to-r from-blue-50/50 to-transparent">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs font-medium text-slate-600">Room {roomIdx + 1}</span>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => removeRoomAllocation(variant.id, itinerary.id, roomIdx)}
                                            className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                                          >
                                            <Trash className="h-3 w-3" />
                                          </Button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="space-y-1">
                                            <label className="text-[10px] font-medium text-slate-600">Room Type</label>
                                            <Select
                                              value={room.roomTypeId}
                                              onValueChange={(value) => updateRoomAllocation(variant.id, itinerary.id, roomIdx, 'roomTypeId', value)}
                                            >
                                              <SelectTrigger className="h-8 text-xs">
                                                <SelectValue placeholder="Select room type" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {roomTypes.map((rt: any) => (
                                                  <SelectItem key={rt.id} value={rt.id} className="text-xs">
                                                    {rt.name}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[10px] font-medium text-slate-600">Occupancy</label>
                                            <Select
                                              value={room.occupancyTypeId}
                                              onValueChange={(value) => updateRoomAllocation(variant.id, itinerary.id, roomIdx, 'occupancyTypeId', value)}
                                            >
                                              <SelectTrigger className="h-8 text-xs">
                                                <SelectValue placeholder="Select occupancy" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {occupancyTypes.map((ot: any) => (
                                                  <SelectItem key={ot.id} value={ot.id} className="text-xs">
                                                    {ot.name}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[10px] font-medium text-slate-600">Meal Plan</label>
                                            <Select
                                              value={room.mealPlanId}
                                              onValueChange={(value) => updateRoomAllocation(variant.id, itinerary.id, roomIdx, 'mealPlanId', value)}
                                            >
                                              <SelectTrigger className="h-8 text-xs">
                                                <SelectValue placeholder="Select meal plan" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {mealPlans.map((mp: any) => (
                                                  <SelectItem key={mp.id} value={mp.id} className="text-xs">
                                                    {mp.name}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[10px] font-medium text-slate-600">Quantity</label>
                                            <Input
                                              type="number"
                                              min={1}
                                              value={room.quantity || 1}
                                              onChange={(e) => updateRoomAllocation(variant.id, itinerary.id, roomIdx, 'quantity', parseInt(e.target.value) || 1)}
                                              className="h-8 text-xs"
                                            />
                                          </div>
                                          <div className="space-y-1 col-span-2">
                                            <label className="text-[10px] font-medium text-slate-600">Guest Names</label>
                                            <Input
                                              value={room.guestNames || ''}
                                              onChange={(e) => updateRoomAllocation(variant.id, itinerary.id, roomIdx, 'guestNames', e.target.value)}
                                              placeholder="Guest names (optional)"
                                              className="h-8 text-xs"
                                            />
                                          </div>
                                          <div className="space-y-1 col-span-2">
                                            <label className="text-[10px] font-medium text-slate-600">Voucher Number</label>
                                            <Input
                                              value={room.voucherNumber || ''}
                                              onChange={(e) => updateRoomAllocation(variant.id, itinerary.id, roomIdx, 'voucherNumber', e.target.value)}
                                              placeholder="Voucher number (optional)"
                                              className="h-8 text-xs"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </CardContent>
                              </Card>

                              <Card className="border-emerald-200/60">
                                <CardHeader className="pb-3">
                                  <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                      <Car className="h-4 w-4 text-emerald-600" />
                                      Transport Details
                                    </CardTitle>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => addTransportDetail(variant.id, itinerary.id)}
                                      className="h-8 text-xs"
                                    >
                                      <Plus className="h-3 w-3 mr-1" />
                                      Add Transport
                                    </Button>
                                  </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  {variantTransports.length === 0 ? (
                                    <div className="text-center py-4 text-sm text-muted-foreground">
                                      No transport details yet. Click &quot;Add Transport&quot; to get started.
                                    </div>
                                  ) : (
                                    variantTransports.map((transport: any, transportIdx: number) => (
                                      <div key={transportIdx} className="p-3 border rounded-md space-y-2 bg-gradient-to-r from-emerald-50/50 to-transparent">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs font-medium text-slate-600">Transport {transportIdx + 1}</span>
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => removeTransportDetail(variant.id, itinerary.id, transportIdx)}
                                            className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                                          >
                                            <Trash className="h-3 w-3" />
                                          </Button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="space-y-1">
                                            <label className="text-[10px] font-medium text-slate-600">Vehicle Type</label>
                                            <Select
                                              value={transport.vehicleTypeId}
                                              onValueChange={(value) => updateTransportDetail(variant.id, itinerary.id, transportIdx, 'vehicleTypeId', value)}
                                            >
                                              <SelectTrigger className="h-8 text-xs">
                                                <SelectValue placeholder="Select vehicle" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {vehicleTypes.map((vt: any) => (
                                                  <SelectItem key={vt.id} value={vt.id} className="text-xs">
                                                    {vt.name}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[10px] font-medium text-slate-600">Quantity</label>
                                            <Input
                                              type="number"
                                              min={1}
                                              value={transport.quantity || 1}
                                              onChange={(e) => updateTransportDetail(variant.id, itinerary.id, transportIdx, 'quantity', parseInt(e.target.value) || 1)}
                                              className="h-8 text-xs"
                                            />
                                          </div>
                                          <div className="space-y-1 col-span-2">
                                            <label className="text-[10px] font-medium text-slate-600">Description</label>
                                            <Input
                                              value={transport.description || ''}
                                              onChange={(e) => updateTransportDetail(variant.id, itinerary.id, transportIdx, 'description', e.target.value)}
                                              placeholder="Transport description (optional)"
                                              className="h-8 text-xs"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </CardContent>
                              </Card>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </div>
                )}
              </TabsContent>

              {/* Pricing Tab */}
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
                        onValueChange={(v: CalculationMethod) => setVariantCalcMethods(prev => ({ ...prev, [variant.id]: v }))}
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
                    const manualItems = variantManualPricingItems[variant.id] || [];
                    const manualTotal = manualItems.reduce((sum, item) => sum + Number(item.price || 0), 0);
                    return (
                      <Card className="shadow-sm border border-slate-200/70">
                        <CardHeader className="pb-3 border-b bg-gradient-to-r from-indigo-50 via-indigo-25 to-transparent">
                          <CardTitle className="text-sm flex items-center gap-2 font-semibold">
                            <Receipt className="h-4 w-4 text-indigo-600" />
                            ✍️ Manual Pricing Entry
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <Alert className="mb-4">
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                              Add pricing components manually for this variant. These will be saved in the query as variant pricing data.
                            </AlertDescription>
                          </Alert>
                          <div className="space-y-3">
                            {manualItems.length === 0 ? (
                              <div className="text-center py-6 text-muted-foreground">
                                <Receipt className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
                                <p className="text-sm font-medium">No manual pricing items yet.</p>
                                <p className="text-xs mt-1">Click “Add Item” to get started.</p>
                              </div>
                            ) : (
                              manualItems.map((item, idx) => (
                                <div key={idx} className="p-3 border rounded-md bg-white space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-slate-600">Item {idx + 1}</span>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleRemoveManualPricingItem(variant.id, idx)}
                                      className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                                    >
                                      <Trash className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                    <Input
                                      value={item.name}
                                      onChange={(e) => handleUpdateManualPricingItem(variant.id, idx, 'name', e.target.value)}
                                      placeholder="Component name"
                                      className="h-8 text-xs"
                                    />
                                    <Input
                                      value={item.price}
                                      onChange={(e) => handleUpdateManualPricingItem(variant.id, idx, 'price', e.target.value)}
                                      placeholder="Price"
                                      type="number"
                                      className="h-8 text-xs"
                                    />
                                    <Input
                                      value={item.description}
                                      onChange={(e) => handleUpdateManualPricingItem(variant.id, idx, 'description', e.target.value)}
                                      placeholder="Description (optional)"
                                      className="h-8 text-xs"
                                    />
                                  </div>
                                </div>
                              ))
                            )}

                            <div className="flex flex-wrap gap-2">
                              <Button type="button" variant="outline" onClick={() => handleAddManualPricingItem(variant.id)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Item
                              </Button>
                              <Button
                                type="button"
                                onClick={() => handleApplyManualPricing(variant.id)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                disabled={manualItems.length === 0}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Apply Manual Pricing
                              </Button>
                              {manualItems.length > 0 && (
                                <div className="ml-auto text-sm font-semibold text-indigo-700">
                                  Total: {formatCurrency(manualTotal)}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }

                  // Auto Calculate (Hotel + Transport)
                  if (calcMethod === 'autoHotelTransport') {
                    const calcResult = variantPriceCalculationResults[variant.id];
                    const markupValue = variantMarkupValues[variant.id] || '0';
                    const pricingTier = variantPricingTiers[variant.id] || 'custom';

                    return (
                      <div className="space-y-4">
                        <Card className="shadow-sm border border-slate-200/70">
                          <CardHeader className="pb-3 border-b bg-gradient-to-r from-green-50 via-green-25 to-transparent">
                            <CardTitle className="text-sm flex items-center gap-2 font-semibold">
                              <Calculator className="h-4 w-4 text-green-600" />
                              🤖 Auto Calculate Pricing
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-4">
                            <Alert className="mb-4">
                              <Info className="h-4 w-4" />
                              <AlertDescription>
                                Automatically calculate pricing based on selected hotels and transport details from Room Allocation tab.
                              </AlertDescription>
                            </Alert>

                            <div className="bg-white rounded-lg p-4 border border-emerald-200 mb-4">
                              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
                                <div className="flex items-center gap-2">
                                  <Target className="h-4 w-4 text-emerald-600" />
                                  <label className="text-sm font-medium text-emerald-700 whitespace-nowrap">Markup %:</label>
                                  <Input
                                    type="number"
                                    className="w-20 h-8 bg-white border-emerald-300 focus:border-emerald-500"
                                    value={markupValue}
                                    min="0"
                                    max="100"
                                    onChange={(e) => setVariantMarkupValues(prev => ({ ...prev, [variant.id]: e.target.value }))}
                                  />
                                </div>

                                <div className="flex-1 max-w-xs">
                                  <Select
                                    value={pricingTier}
                                    onValueChange={(value: 'standard' | 'premium' | 'luxury' | 'custom') => {
                                      setVariantPricingTiers(prev => ({ ...prev, [variant.id]: value }));
                                      if (value === 'standard') setVariantMarkupValues(prev => ({ ...prev, [variant.id]: '10' }));
                                      if (value === 'premium') setVariantMarkupValues(prev => ({ ...prev, [variant.id]: '20' }));
                                      if (value === 'luxury') setVariantMarkupValues(prev => ({ ...prev, [variant.id]: '30' }));
                                    }}
                                  >
                                    <SelectTrigger className="h-8 bg-white border-emerald-300 focus:border-emerald-500">
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

                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    onClick={() => handleCalculateVariantPricing(variant)}
                                    className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white border-emerald-600 shadow-md"
                                    disabled={loading}
                                  >
                                    <Calculator className="mr-2 h-4 w-4" />
                                    🧮 Calculate Price
                                  </Button>
                                  <Button
                                    type="button"
                                    onClick={() => handleResetVariantCalculation(variant.id)}
                                    variant="outline"
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                                    disabled={loading}
                                  >
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Reset
                                  </Button>
                                </div>
                              </div>
                            </div>

                            {calcResult && calcResult.itineraryBreakdown?.length > 0 && (
                              <div className="mt-4 border border-blue-200 rounded-lg overflow-hidden bg-white shadow-sm">
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
                                      calcResult.itineraryBreakdown?.forEach((item: any) => days.add(item.day));
                                      calcResult.transportDetails?.forEach((transport: any) => days.add(transport.day));
                                      const sortedDays = Array.from(days).sort((a, b) => a - b);
                                      return sortedDays.map(day => {
                                        const accommodation = calcResult.itineraryBreakdown?.find((item: any) => item.day === day);
                                        const transports = calcResult.transportDetails?.filter((transport: any) => transport.day === day);
                                        const transportCost = transports?.reduce((sum: number, transport: any) => sum + transport.totalCost, 0) || 0;
                                        const dayTotal = (accommodation?.accommodationCost || 0) + transportCost;

                                        return (
                                          <TableRow key={`day-${day}`}>
                                            <TableCell className="font-medium">Day {day}</TableCell>
                                            <TableCell>
                                              <div className="text-xs text-gray-600">
                                                {accommodation?.roomBreakdown?.map((rb: any, idx: number) => (
                                                  <div key={idx} className="mb-1">
                                                    {rb.roomTypeName || 'Room'} ({rb.occupancyTypeName || 'Occupancy'}) - ₹{rb.totalCost.toFixed(2)}
                                                  </div>
                                                ))}
                                              </div>
                                            </TableCell>
                                            <TableCell className="text-right text-sm">
                                              {accommodation?.accommodationCost ? `₹${accommodation.accommodationCost.toFixed(2)}` : '-'}
                                            </TableCell>
                                            <TableCell className="text-right text-sm">
                                              {transportCost ? `₹${transportCost.toFixed(2)}` : '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-sm">₹{dayTotal.toFixed(2)}</TableCell>
                                          </TableRow>
                                        );
                                      });
                                    })()}
                                    <TableRow className="bg-blue-50">
                                      <TableCell colSpan={4} className="font-medium text-right text-sm">Base Accommodation Cost</TableCell>
                                      <TableCell className="text-right font-bold text-sm">₹{calcResult.breakdown.accommodation.toFixed(2)}</TableCell>
                                    </TableRow>
                                    <TableRow className="bg-blue-50">
                                      <TableCell colSpan={4} className="font-medium text-right text-sm">Base Transport Cost</TableCell>
                                      <TableCell className="text-right font-bold text-sm">₹{calcResult.breakdown.transport.toFixed(2)}</TableCell>
                                    </TableRow>
                                    <TableRow className="bg-blue-100">
                                      <TableCell colSpan={4} className="font-medium text-right text-sm">Total Base Cost</TableCell>
                                      <TableCell className="text-right font-bold text-sm">₹{(calcResult.breakdown.accommodation + calcResult.breakdown.transport).toFixed(2)}</TableCell>
                                    </TableRow>
                                    {calcResult.appliedMarkup && (
                                      <TableRow className="bg-blue-100">
                                        <TableCell colSpan={4} className="font-medium text-right text-sm">Markup ({calcResult.appliedMarkup.percentage}%)</TableCell>
                                        <TableCell className="text-right font-bold text-sm">₹{calcResult.appliedMarkup.amount.toFixed(2)}</TableCell>
                                      </TableRow>
                                    )}
                                    <TableRow className="bg-blue-200">
                                      <TableCell colSpan={4} className="font-medium text-right text-base">Final Total Cost</TableCell>
                                      <TableCell className="text-right font-bold text-base">₹{calcResult.totalCost.toFixed(2)}</TableCell>
                                    </TableRow>
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    );
                  }

                  // Use Tour Package Pricing (DEFAULT)
                  return (
                    <div className="space-y-4">
                      <Card className="shadow-sm border-2 border-purple-200/60 bg-gradient-to-br from-purple-50/30 to-white">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Package className="h-4 w-4 text-purple-600" />
                            📦 Tour Package Pricing Configuration
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Selected Tour Package Name Display */}
                          <div className="bg-white border border-purple-200 rounded-lg p-3 shadow-sm">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center">
                                <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                <div>
                                  <p className="text-xs text-slate-600">Selected Tour Package:</p>
                                  <p className="font-semibold text-sm text-purple-700">
                                    📋 {selectedTourPackage?.tourPackageName || `Package ID: ${selectedTourPackageId}`}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Info Message */}
                          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2.5">
                            <p className="text-xs text-indigo-700 flex items-center">
                              <Star className="mr-2 h-3.5 w-3.5 flex-shrink-0" />
                              Fetch pre-defined pricing based on the selected Tour Package Template, Number of Rooms, and Meal Plan.
                              This will overwrite the current Total Price and Pricing Options below.
                            </p>
                          </div>

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
                              {!variantMealPlanIds[variant.id] && <p className="text-xs text-red-500 pt-1">Required</p>}
                            </FormItem>
                          </div>

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
                                  toast.success("Selection cleared.");
                                }}
                                className="text-blue-600 hover:text-blue-800 border-blue-300"
                              >
                                Clear
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <p className="text-sm text-blue-700">Choose which pricing components to include:</p>

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

                            <div className="space-y-3">
                              {variantAvailableComponents[variant.id].map((component: any) => {
                                const selected = (variantSelectedComponentIds[variant.id] || []).includes(component.id);
                                const quantity = (variantComponentQuantities[variant.id] || {})[component.id] || 1;
                                const totalPrice = calculateComponentTotalPrice(component, quantity);

                                return (
                                  <div key={component.id} className="flex items-center space-x-3 p-3 bg-white rounded-md border">
                                    <Checkbox
                                      id={`component-${variant.id}-${component.id}`}
                                      checked={selected}
                                      onCheckedChange={() => handleTogglePricingComponent(variant.id, component.id)}
                                    />
                                    <label htmlFor={`component-${variant.id}-${component.id}`} className="flex-1 cursor-pointer">
                                      <div className="flex justify-between items-center">
                                        <div className="flex-1">
                                          <p className="font-medium text-gray-900 text-sm">
                                            {component.pricingAttribute?.name || 'Pricing Component'}
                                          </p>
                                          {component.description && (
                                            <p className="text-xs text-gray-600">{component.description}</p>
                                          )}
                                          <p className="text-xs text-gray-500 mt-1">
                                            <span className="font-medium">Sales Price:</span> ₹{parseFloat(component.price || '0').toFixed(2)} per person
                                            {component.purchasePrice && (
                                              <span className="ml-3">
                                                <span className="font-medium text-orange-600">Purchase Price:</span> ₹{parseFloat(component.purchasePrice || '0').toFixed(2)} per person
                                              </span>
                                            )}
                                            {getOccupancyMultiplier(component.pricingAttribute?.name || '') > 1 && (
                                              <span className="text-blue-600 ml-1 block">
                                                (×{getOccupancyMultiplier(component.pricingAttribute?.name || '')} for {component.pricingAttribute?.name?.toLowerCase().includes('double') ? 'Double' : component.pricingAttribute?.name?.toLowerCase().includes('triple') ? 'Triple' : component.pricingAttribute?.name?.toLowerCase().includes('quad') ? 'Quad' : 'Multi'} occupancy)
                                              </span>
                                            )}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-600">Rooms:</span>
                                            <Button
                                              type="button"
                                              size="icon"
                                              variant="outline"
                                              className="rounded-full w-6 h-6"
                                              onClick={() => handleComponentRoomQuantityChange(variant.id, component.id, quantity - 1)}
                                              disabled={quantity <= 1}
                                            >
                                              <span className="text-sm font-bold">-</span>
                                            </Button>
                                            <Input
                                              type="number"
                                              value={quantity}
                                              onChange={(e) => handleComponentRoomQuantityChange(variant.id, component.id, parseInt(e.target.value) || 1)}
                                              min="1"
                                              className="w-16 text-center text-sm h-6"
                                            />
                                            <Button
                                              type="button"
                                              size="icon"
                                              variant="outline"
                                              className="rounded-full w-6 h-6"
                                              onClick={() => handleComponentRoomQuantityChange(variant.id, component.id, quantity + 1)}
                                            >
                                              <span className="text-sm font-bold">+</span>
                                            </Button>
                                          </div>
                                          <div className="text-right">
                                            <p className="font-semibold text-gray-900">{formatCurrency(totalPrice)}</p>
                                            {(quantity > 1 || getOccupancyMultiplier(component.pricingAttribute?.name || '') > 1) && (
                                              <p className="text-[10px] text-gray-500">
                                                {quantity} rooms × ₹{parseFloat(component.price || '0').toFixed(2)} × {getOccupancyMultiplier(component.pricingAttribute?.name || '')} occupancy
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

                            {(variantSelectedComponentIds[variant.id] || []).length > 0 && (
                              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                                <p className="text-sm font-medium text-green-800">
                                  Selected: {(variantSelectedComponentIds[variant.id] || []).length} component{(variantSelectedComponentIds[variant.id] || []).length !== 1 ? 's' : ''}
                                </p>
                                <div className="text-sm text-green-700 mt-1 space-y-1">
                                  {variantAvailableComponents[variant.id]
                                    .filter((comp: any) => (variantSelectedComponentIds[variant.id] || []).includes(comp.id))
                                    .map((comp: any) => {
                                      const qty = (variantComponentQuantities[variant.id] || {})[comp.id] || 1;
                                      const componentName = comp.pricingAttribute?.name || 'Component';
                                      const occupancyMultiplier = getOccupancyMultiplier(componentName);
                                      const compTotal = calculateComponentTotalPrice(comp, qty);
                                      return (
                                        <div key={comp.id} className="flex justify-between text-xs">
                                          <span>{componentName} {qty > 1 ? `(${qty} rooms)` : ''}
                                            {occupancyMultiplier > 1 ? ` × ${occupancyMultiplier}` : ''}
                                          </span>
                                          <span>₹{compTotal.toFixed(2)}</span>
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

                            <Button
                              type="button"
                              onClick={() => handleApplySelectedPricingComponents(variant.id)}
                              className="w-full bg-green-500 hover:bg-green-600 text-white"
                              disabled={loading || (variantSelectedComponentIds[variant.id] || []).length === 0}
                            >
                              <Calculator className="mr-2 h-4 w-4" />
                              Apply Selected Components ({(variantSelectedComponentIds[variant.id] || []).length})
                            </Button>
                          </CardContent>
                        </Card>
                      )}

                      {/* Legacy Direct Apply Button */}
                      <div className="pt-4 border-t border-gray-200">
                        <p className="text-xs text-gray-600 mb-2">
                          Or apply all pricing components directly:
                        </p>
                        <Button
                          type="button"
                          onClick={() => handleFetchAndApplyAllComponents(variant.id)}
                          variant="outline"
                          className="w-full bg-gray-500 hover:bg-gray-600 text-white border-gray-600"
                          disabled={loading || !variantMealPlanIds[variant.id] || (variantRoomCounts[variant.id] || 1) <= 0}
                        >
                          <Calculator className="mr-2 h-4 w-4" />
                          Fetch & Apply All Components (Legacy)
                        </Button>
                      </div>
                    </div>
                  );
                })()}

                {/* ===== ALWAYS-VISIBLE SECTIONS (matching main PricingTab) ===== */}

                {/* Pricing Breakdown Section - Always visible and editable */}
                <Card className="shadow-sm border border-slate-200/70 mt-4">
                  <CardHeader className="pb-3 border-b bg-gradient-to-r from-blue-50 via-blue-100 to-transparent">
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
                        onClick={() => handleAddVariantPricingItem(variant.id)}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
                      >
                        <Plus className="mr-2 h-3.5 w-3.5" />
                        Add Item
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      {(variantPricingItems[variant.id] || []).length === 0 ? (
                        <div className="text-center py-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-dashed border-blue-300">
                          <Receipt className="mx-auto h-10 w-10 text-blue-400 mb-2" />
                          <p className="text-slate-600 text-sm mb-3">No pricing items added yet</p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-dashed border-blue-400 text-blue-600 hover:bg-blue-50"
                            disabled={loading}
                            onClick={() => handleAddVariantPricingItem(variant.id)}
                          >
                            <Plus className="mr-2 h-3.5 w-3.5" />
                            Add Your First Pricing Option
                          </Button>
                        </div>
                      ) : (
                        (variantPricingItems[variant.id] || []).map((item, idx) => (
                          <div key={idx} className="bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-lg p-3 hover:shadow-md transition-all duration-200">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-slate-700 flex items-center">
                                  <Star className="mr-1 h-2.5 w-2.5 text-yellow-500" />
                                  Item Name
                                </label>
                                <Input
                                  value={item.name}
                                  disabled={loading}
                                  placeholder="e.g., Per Person Cost"
                                  onChange={(e) => {
                                    handleUpdateVariantPricingItem(variant.id, idx, 'name', e.target.value);
                                  }}
                                  onBlur={() => syncVariantPricingToForm(variant.id)}
                                  className="h-8 text-xs bg-white border-slate-300 focus:border-blue-500"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-slate-700 flex items-center">
                                  <DollarSign className="mr-1 h-2.5 w-2.5 text-green-500" />
                                  Price (Base)
                                </label>
                                <Input
                                  value={item.price}
                                  disabled={loading}
                                  placeholder="e.g., 15000"
                                  type="number"
                                  onChange={(e) => {
                                    handleUpdateVariantPricingItem(variant.id, idx, 'price', e.target.value);
                                  }}
                                  onBlur={() => syncVariantPricingToForm(variant.id)}
                                  className="h-8 text-xs bg-white border-slate-300 focus:border-blue-500"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-slate-700 flex items-center">
                                  <Calculator className="mr-1 h-2.5 w-2.5 text-blue-500" />
                                  Calculation & Total
                                </label>
                                <Input
                                  value={item.description}
                                  disabled={loading}
                                  placeholder="e.g., 15000.00 × 3 occupancy × 3 rooms = ₹135000"
                                  onChange={(e) => {
                                    handleUpdateVariantPricingItem(variant.id, idx, 'description', e.target.value);
                                  }}
                                  onBlur={() => syncVariantPricingToForm(variant.id)}
                                  className="h-8 text-xs bg-white border-slate-300 focus:border-blue-500"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end mt-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={loading}
                                onClick={() => {
                                  handleRemoveVariantPricingItem(variant.id, idx);
                                  // Sync after removal (need slight delay for state to update)
                                  setTimeout(() => syncVariantPricingToForm(variant.id), 0);
                                }}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 w-7"
                              >
                                <Trash className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Total Package Price - Always visible and editable */}
                <Card className="shadow-sm border-2 border-orange-200/60 bg-gradient-to-r from-orange-50 to-red-50 mt-4">
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-center mb-3">
                      <Target className="mr-2 h-5 w-5 text-orange-600" />
                      <h3 className="text-base font-bold text-orange-800">🎯 Total Package Price</h3>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-orange-700 flex items-center">
                        <Trophy className="mr-2 h-4 w-4" />
                        💰 Final Amount
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-lg font-bold text-orange-600">₹</span>
                        <Input
                          value={variantTotalPrices[variant.id] || ''}
                          disabled={loading}
                          placeholder="Total price for the package"
                          className="text-xl font-bold pl-8 bg-white border-orange-300 focus:border-orange-500 h-12"
                          type="number"
                          onChange={(e) => {
                            setVariantTotalPrices(prev => ({ ...prev, [variant.id]: e.target.value }));
                          }}
                          onBlur={() => syncVariantPricingToForm(variant.id)}
                        />
                      </div>
                      <p className="text-xs text-orange-600 mt-1 flex items-center">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        This represents the final total price for this variant
                      </p>
                      <p className="text-[10px] text-orange-500 bg-orange-50 px-2 py-1 rounded border border-orange-200 inline-block">
                        including GST
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Configuration Summary */}
                {(variantMealPlanIds[variant.id] || (variantRoomCounts[variant.id] || 0) > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                    {variantMealPlanIds[variant.id] && (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3 shadow-sm">
                        <div className="flex items-center mb-1.5">
                          <ShoppingCart className="mr-2 h-3.5 w-3.5 text-green-600" />
                          <p className="text-xs font-semibold text-green-700">Selected Meal Plan:</p>
                        </div>
                        <div className="flex items-center bg-white p-2 rounded-md border border-green-200">
                          <span className="text-sm mr-2">🍽️</span>
                          <p className="font-semibold text-sm text-green-800">
                            {mealPlans.find((mp: any) => mp.id === variantMealPlanIds[variant.id])?.name || 'Unknown Meal Plan'}
                          </p>
                        </div>
                      </div>
                    )}
                    {(variantRoomCounts[variant.id] || 0) > 0 && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 shadow-sm">
                        <div className="flex items-center mb-1.5">
                          <Wallet className="mr-2 h-3.5 w-3.5 text-blue-600" />
                          <p className="text-xs font-semibold text-blue-700">Room Configuration:</p>
                        </div>
                        <div className="flex items-center justify-between bg-white p-2 rounded-md border border-blue-200">
                          <div className="flex items-center">
                            <span className="text-sm mr-2">🏨</span>
                            <span className="font-semibold text-sm text-blue-800">Number of Rooms</span>
                          </div>
                          <div className="bg-blue-100 px-2 py-0.5 rounded-full">
                            <span className="text-xs font-bold text-blue-700">
                              {variantRoomCounts[variant.id] || 1} room{(variantRoomCounts[variant.id] || 1) > 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Remarks Section */}
                <Card className="shadow-sm border border-slate-200/70 mt-4">
                  <CardContent className="pt-4 pb-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-indigo-600" />
                        Remarks
                      </label>
                      <Input
                        disabled={loading}
                        placeholder="Additional remarks for this variant's pricing"
                        value={variantRemarks[variant.id] || ''}
                        onChange={(e) => {
                          setVariantRemarks(prev => ({ ...prev, [variant.id]: e.target.value }));
                        }}
                        onBlur={() => syncVariantPricingToForm(variant.id)}
                      />
                      <p className="text-[10px] text-slate-500">
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
