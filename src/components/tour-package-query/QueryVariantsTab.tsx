"use client";
import { useState, useEffect, useCallback } from "react";
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
import { Sparkles, Hotel as HotelIcon, IndianRupee, Calendar, Info, AlertCircle, Edit2, Check, X, Utensils as UtensilsIcon, Car, Receipt, BedDouble, Users, Calculator, Plus, Trash, Settings, Package, CreditCard, ShoppingCart, Wallet, CheckCircle, RefreshCw, Target, Star, Trophy, DollarSign, Copy, ChevronsUpDown } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { FormControl, FormItem, FormLabel } from "@/components/ui/form";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Image from "next/image";
import { toast } from "react-hot-toast";
import axios from "axios";
import { cn } from "@/lib/utils";
import { utcToLocal } from "@/lib/timezone-utils";
import { DEFAULT_PRICING_SECTION } from "@/components/tour-package-query/defaultValues";

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

// ─── Hotel Search Combobox ───────────────────────────────────────────────────
interface HotelSearchComboboxProps {
  hotels: (Hotel & { images?: Images[] })[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  allowNone?: boolean;
}

const HotelSearchCombobox: React.FC<HotelSearchComboboxProps> = ({
  hotels,
  value,
  onChange,
  placeholder = "Select hotel...",
  disabled = false,
  className,
  allowNone = true,
}) => {
  const [open, setOpen] = useState(false);
  const selected = hotels.find(h => h.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between h-8 text-xs font-normal", className)}
        >
          <span className="truncate flex-1 text-left">
            {selected ? selected.name : <span className="text-muted-foreground">{placeholder}</span>}
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search hotels..." className="h-8 text-xs" />
          <CommandEmpty className="py-3 text-xs text-center text-muted-foreground">No hotel found.</CommandEmpty>
          <CommandList className="max-h-[200px]">
            <CommandGroup>
              {allowNone && (
                <CommandItem
                  value="__none__"
                  onSelect={() => { onChange(''); setOpen(false); }}
                  className="text-xs text-muted-foreground"
                >
                  <Check className={cn("mr-2 h-3.5 w-3.5", !value ? "opacity-100" : "opacity-0")} />
                  — No hotel —
                </CommandItem>
              )}
              {hotels.map(hotel => (
                <CommandItem
                  key={hotel.id}
                  value={hotel.name}
                  onSelect={() => { onChange(hotel.id); setOpen(false); }}
                  className="text-xs"
                >
                  <Check className={cn("mr-2 h-3.5 w-3.5", value === hotel.id ? "opacity-100" : "opacity-0")} />
                  {hotel.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
// ─────────────────────────────────────────────────────────────────────────────

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
  const confirmedVariantId = useWatch({ control, name: "confirmedVariantId" }) as string | null | undefined;
  const customQueryVariants = useWatch({ control, name: "customQueryVariants" }) as any[] | undefined;

  const [editingMapping, setEditingMapping] = useState<string | null>(null);
  const [tempHotelId, setTempHotelId] = useState<string>("");
  const [variantCalcMethods, setVariantCalcMethods] = useState<Record<string, CalculationMethod>>({});
  const [copyFromVariantId, setCopyFromVariantId] = useState<Record<string, string>>({});
  // Unified tab tracking (package + custom variants in one tab bar)
  const [activeVariantTab, setActiveVariantTab] = useState<string>('');
  // Copy pricing source per variant
  const [copyPricingFromId, setCopyPricingFromId] = useState<Record<string, string>>({});

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
  // Accepts optional overrideItems to avoid stale closure issues (e.g. Load Default)
  const syncVariantPricingToForm = useCallback((
    variantId: string,
    overrideItems?: { name: string; price: string; description: string }[]
  ) => {
    const currentPricingData = form.getValues('variantPricingData') || {};
    const existingData = currentPricingData[variantId] || {};

    // Use overrideItems if provided (avoids stale closure), otherwise read from state
    const stateItems = overrideItems !== undefined ? overrideItems : variantPricingItems[variantId];
    const items = stateItems !== undefined
      ? stateItems
      : (Array.isArray(existingData.components) ? existingData.components : []);

    const stateTotalPrice = variantTotalPrices[variantId];
    const parsedStateTotal = stateTotalPrice && stateTotalPrice.trim() !== '' ? parseFloat(stateTotalPrice) : NaN;
    const totalCost = stateTotalPrice !== undefined && Number.isFinite(parsedStateTotal)
      ? parsedStateTotal
      : (typeof existingData.totalCost === 'number' && Number.isFinite(existingData.totalCost)
        ? existingData.totalCost
        : 0);

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
  }, [form, variantPricingItems, variantTotalPrices, variantRemarks]);

  // Copy pricing data from one variant to another
  const copyPricingFromVariant = (fromVariantId: string, toVariantId: string) => {
    try {
      const fromItems = variantPricingItems[fromVariantId];
      const fromTotal = variantTotalPrices[fromVariantId];
      const fromRemarks = variantRemarks[fromVariantId];

      if (!fromItems || fromItems.length === 0) {
        // Try from form saved data
        const savedData = (form.getValues('variantPricingData') || {})[fromVariantId];
        if (!savedData?.components?.length) {
          toast.error('No pricing data to copy from selected variant');
          return;
        }
        const copiedItems = JSON.parse(JSON.stringify(savedData.components));
        setVariantPricingItems(prev => ({ ...prev, [toVariantId]: copiedItems }));
        setVariantTotalPrices(prev => ({ ...prev, [toVariantId]: (savedData.totalCost || 0).toString() }));
        setVariantRemarks(prev => ({ ...prev, [toVariantId]: savedData.remarks || '' }));
        syncVariantPricingToForm(toVariantId, copiedItems);
        toast.success('Pricing copied successfully');
        return;
      }

      const copiedItems = JSON.parse(JSON.stringify(fromItems));
      setVariantPricingItems(prev => ({ ...prev, [toVariantId]: copiedItems }));
      if (fromTotal !== undefined) setVariantTotalPrices(prev => ({ ...prev, [toVariantId]: fromTotal }));
      if (fromRemarks !== undefined) setVariantRemarks(prev => ({ ...prev, [toVariantId]: fromRemarks }));
      syncVariantPricingToForm(toVariantId, copiedItems);
      toast.success('Pricing copied successfully');
    } catch (error) {
      console.error('Error copying pricing:', error);
      toast.error('Failed to copy pricing. Please try again.');
    }
  };

  // ─── Room Allocation Helper Functions ───────────────────────────────────────
  const addRoomAllocation = (variantId: string, itineraryId: string) => {
    try {
      const current = variantRoomAllocations || {};
      const variantData = current[variantId] || {};
      const itineraryAllocations = variantData[itineraryId] || [];
      const newAllocation = { roomTypeId: '', occupancyTypeId: '', mealPlanId: '', quantity: 1, guestNames: '', voucherNumber: '', useCustomRoomType: false, customRoomType: '' };
      form.setValue('variantRoomAllocations', { ...current, [variantId]: { ...variantData, [itineraryId]: [...itineraryAllocations, newAllocation] } }, { shouldValidate: false, shouldDirty: true });
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
      const newAllocations = (variantData[itineraryId] || []).filter((_: any, i: number) => i !== allocationIndex);
      form.setValue('variantRoomAllocations', { ...current, [variantId]: { ...variantData, [itineraryId]: newAllocations } }, { shouldValidate: false, shouldDirty: true });
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
      const updatedAllocations = (variantData[itineraryId] || []).map((allocation: any, i: number) => i === allocationIndex ? { ...allocation, [field]: value } : allocation);
      form.setValue('variantRoomAllocations', { ...current, [variantId]: { ...variantData, [itineraryId]: updatedAllocations } }, { shouldValidate: false, shouldDirty: true });
    } catch (error) {
      console.error('Error updating room allocation:', error);
      toast.error('Failed to update room. Please try again.');
    }
  };

  const updateRoomAllocationFields = (variantId: string, itineraryId: string, allocationIndex: number, updates: Record<string, any>) => {
    try {
      const current = variantRoomAllocations || {};
      const variantData = current[variantId] || {};
      const updatedAllocations = (variantData[itineraryId] || []).map((allocation: any, i: number) => i === allocationIndex ? { ...allocation, ...updates } : allocation);
      form.setValue('variantRoomAllocations', { ...current, [variantId]: { ...variantData, [itineraryId]: updatedAllocations } }, { shouldValidate: false, shouldDirty: true });
    } catch (error) {
      console.error('Error updating room allocation:', error);
      toast.error('Failed to update room. Please try again.');
    }
  };

  const copyFirstDayToAllDays = (variantId: string) => {
    try {
      const currentRooms = variantRoomAllocations || {};
      const roomVariantData = currentRooms[variantId] || {};
      const currentTransport = variantTransportDetails || {};
      const transportVariantData = currentTransport[variantId] || {};
      if (!itineraries || itineraries.length === 0) { toast.error('No itineraries available'); return; }
      const firstItinerary = itineraries[0];
      const firstDayRooms = roomVariantData[firstItinerary.id] || [];
      const firstDayTransports = transportVariantData[firstItinerary.id] || [];
      if (firstDayRooms.length === 0 && firstDayTransports.length === 0) { toast.error('No room allocations or transport details on first day to copy'); return; }
      const newRoomVariantData = { ...roomVariantData };
      const newTransportVariantData = { ...transportVariantData };
      itineraries.forEach((itinerary) => {
        newRoomVariantData[itinerary.id] = JSON.parse(JSON.stringify(firstDayRooms));
        newTransportVariantData[itinerary.id] = JSON.parse(JSON.stringify(firstDayTransports));
      });
      form.setValue('variantRoomAllocations', { ...currentRooms, [variantId]: newRoomVariantData }, { shouldValidate: false, shouldDirty: true });
      form.setValue('variantTransportDetails', { ...currentTransport, [variantId]: newTransportVariantData }, { shouldValidate: false, shouldDirty: true });
      toast.success(`Copied room & transport to all ${itineraries.length} days`);
    } catch (error) {
      console.error('Error copying details to all days:', error);
      toast.error('Failed to copy. Please try again.');
    }
  };

  const copyRoomAllocationsFromVariant = (fromVariantId: string, toVariantId: string) => {
    try {
      const currentRooms = variantRoomAllocations || {};
      const fromRoomData = currentRooms[fromVariantId] || {};
      const currentTransport = variantTransportDetails || {};
      const fromTransportData = currentTransport[fromVariantId] || {};
      if (Object.keys(fromRoomData).length === 0 && Object.keys(fromTransportData).length === 0) { toast.error('No room or transport data to copy from selected variant'); return; }
      form.setValue('variantRoomAllocations', { ...currentRooms, [toVariantId]: JSON.parse(JSON.stringify(fromRoomData)) }, { shouldValidate: false, shouldDirty: true });
      form.setValue('variantTransportDetails', { ...currentTransport, [toVariantId]: JSON.parse(JSON.stringify(fromTransportData)) }, { shouldValidate: false, shouldDirty: true });
      toast.success('Room and transport details copied successfully');
    } catch (error) {
      console.error('Error copying details from variant:', error);
      toast.error('Failed to copy data. Please try again.');
    }
  };

  // ─── Transport Helper Functions ──────────────────────────────────────────
  const addTransportDetail = (variantId: string, itineraryId: string) => {
    const current = variantTransportDetails || {};
    const variantData = current[variantId] || {};
    const itineraryTransports = variantData[itineraryId] || [];
    form.setValue('variantTransportDetails', { ...current, [variantId]: { ...variantData, [itineraryId]: [...itineraryTransports, { vehicleTypeId: '', quantity: 1, description: '' }] } });
  };

  const removeTransportDetail = (variantId: string, itineraryId: string, transportIndex: number) => {
    const current = variantTransportDetails || {};
    const variantData = current[variantId] || {};
    form.setValue('variantTransportDetails', { ...current, [variantId]: { ...variantData, [itineraryId]: (variantData[itineraryId] || []).filter((_: any, i: number) => i !== transportIndex) } });
  };

  const updateTransportDetail = (variantId: string, itineraryId: string, transportIndex: number, field: string, value: any) => {
    const current = variantTransportDetails || {};
    const variantData = current[variantId] || {};
    const updatedTransports = (variantData[itineraryId] || []).map((transport: any, i: number) => i === transportIndex ? { ...transport, [field]: value } : transport);
    form.setValue('variantTransportDetails', { ...current, [variantId]: { ...variantData, [itineraryId]: updatedTransports } });
  };

  // ─── Hotel Edit Helpers ──────────────────────────────────────────────────
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
    form.setValue('variantHotelOverrides', { ...currentOverrides, [variantId]: { ...variantOverrides, [itineraryId]: newHotelId } });
    setEditingMapping(null);
    setTempHotelId("");
    toast.success("Hotel updated for this variant");
  };

  const handleCancelEdit = () => {
    setEditingMapping(null);
    setTempHotelId("");
  };

  // Helper: add a new custom variant and switch to its tab
  const addCustomVariant = () => {
    const newVariant = { id: crypto.randomUUID(), name: 'New Custom Variant', description: '' };
    const current = (customQueryVariants || []) as any[];
    form.setValue('customQueryVariants', [...current, newVariant], { shouldDirty: true });
    setActiveVariantTab(newVariant.id);
  };

  // Unified variant list: package variants first, then custom variants
  const allVariantsList = [
    ...selectedVariants.map(v => ({ ...v, _type: 'package' as const })),
    ...((customQueryVariants || []) as any[]).map((v: any) => ({ ...v, _type: 'custom' as const })),
  ];

  // Set initial active tab when variants load
  useEffect(() => {
    if (!activeVariantTab && allVariantsList.length > 0) {
      setActiveVariantTab(allVariantsList[0].id);
    }
  }, [allVariantsList.length, activeVariantTab]);

  // ─── Shared: Render Room Allocation accordion per itinerary ───────────────
  const renderRoomAllocationAccordion = (variantId: string, itineraryList: any[]) => (
    <div className="space-y-3">
      {/* Copy actions */}
      <Card className="shadow-sm border border-blue-200/60 bg-gradient-to-r from-blue-50/30 to-transparent">
        <CardContent className="pt-3 pb-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => copyFirstDayToAllDays(variantId)}
              className="h-8 text-xs border-blue-300 hover:bg-blue-50"
              disabled={itineraryList.length === 0}
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Copy Day 1 to All Days
            </Button>
            <div className="flex gap-2 flex-1">
              <Select
                value={copyFromVariantId[variantId] || ""}
                onValueChange={(value) => setCopyFromVariantId(prev => ({ ...prev, [variantId]: value }))}
              >
                <SelectTrigger className="h-8 text-xs flex-1 border-blue-300">
                  <SelectValue placeholder="Copy rooms from variant..." />
                </SelectTrigger>
                <SelectContent>
                  {allVariantsList
                    .filter(v => v.id !== variantId)
                    .map((v) => (
                      <SelectItem key={v.id} value={v.id} className="text-xs">
                        {v._type === 'custom' ? '⚙ ' : '✦ '}{v.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const fromId = copyFromVariantId[variantId];
                  if (fromId) {
                    copyRoomAllocationsFromVariant(fromId, variantId);
                  } else {
                    toast.error('Please select a variant to copy from');
                  }
                }}
                className="h-8 text-xs border-blue-300 hover:bg-blue-50"
                disabled={!copyFromVariantId[variantId]}
              >
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                Copy Rooms
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Accordion type="multiple" className="space-y-2">
        {itineraryList.map((itinerary: any, idx: number) => {
          const variantRooms = variantRoomAllocations?.[variantId]?.[itinerary.id] || [];
          const variantTransports = variantTransportDetails?.[variantId]?.[itinerary.id] || [];
          return (
            <AccordionItem
              key={itinerary.id}
              value={itinerary.id}
              className="border rounded-lg shadow-sm bg-white overflow-hidden"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50">
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold bg-gradient-to-br from-blue-500 to-blue-600 text-white flex-shrink-0">
                    {itinerary.dayNumber || idx + 1}
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-medium text-sm truncate" dangerouslySetInnerHTML={{ __html: itinerary.itineraryTitle || `Day ${itinerary.dayNumber || idx + 1}` }} />
                    <div className="text-xs text-muted-foreground">
                      {variantRooms.length} room(s) · {variantTransports.length} transport(s)
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-3 space-y-4 bg-slate-50/30 border-t">
                {/* Room Allocations */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <BedDouble className="h-3.5 w-3.5 text-blue-600" /> Room Allocations
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addRoomAllocation(variantId, itinerary.id)}
                      className="h-7 text-xs border-blue-300 hover:bg-blue-50 text-blue-700"
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add Room
                    </Button>
                  </div>
                  {variantRooms.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3 border border-dashed rounded-md">
                      No rooms yet. Click "Add Room" to start.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {variantRooms.map((room: any, roomIdx: number) => (
                        <div key={roomIdx} className="p-3 border border-blue-100 rounded-lg bg-white space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Room {roomIdx + 1}</span>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => removeRoomAllocation(variantId, itinerary.id, roomIdx)}
                              className="h-6 w-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-medium text-slate-600">Room Type</label>
                                <label className="flex items-center gap-1 text-[10px] text-slate-400 cursor-pointer select-none">
                                  <Checkbox
                                    checked={!!room.useCustomRoomType}
                                    onCheckedChange={(checked) => {
                                      updateRoomAllocationFields(variantId, itinerary.id, roomIdx, {
                                        useCustomRoomType: !!checked,
                                        ...(!checked ? { customRoomType: '' } : {})
                                      });
                                    }}
                                    className="h-3 w-3"
                                  />
                                  Custom
                                </label>
                              </div>
                              {room.useCustomRoomType ? (
                                <Input
                                  value={room.customRoomType || ''}
                                  onChange={(e) => updateRoomAllocation(variantId, itinerary.id, roomIdx, 'customRoomType', e.target.value)}
                                  placeholder="Custom room type..."
                                  className="h-8 text-xs"
                                />
                              ) : (
                                <Select
                                  value={room.roomTypeId}
                                  onValueChange={(v) => updateRoomAllocation(variantId, itinerary.id, roomIdx, 'roomTypeId', v)}
                                >
                                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Room type" /></SelectTrigger>
                                  <SelectContent>{roomTypes.map((rt: any) => <SelectItem key={rt.id} value={rt.id} className="text-xs">{rt.name}</SelectItem>)}</SelectContent>
                                </Select>
                              )}
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-medium text-slate-600">Occupancy</label>
                              <Select
                                value={room.occupancyTypeId}
                                onValueChange={(v) => updateRoomAllocation(variantId, itinerary.id, roomIdx, 'occupancyTypeId', v)}
                              >
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Occupancy" /></SelectTrigger>
                                <SelectContent>{occupancyTypes.map((ot: any) => <SelectItem key={ot.id} value={ot.id} className="text-xs">{ot.name}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-medium text-slate-600">Meal Plan</label>
                              <Select
                                value={room.mealPlanId}
                                onValueChange={(v) => updateRoomAllocation(variantId, itinerary.id, roomIdx, 'mealPlanId', v)}
                              >
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Meal plan" /></SelectTrigger>
                                <SelectContent>{mealPlans.map((mp: any) => <SelectItem key={mp.id} value={mp.id} className="text-xs">{mp.name}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-medium text-slate-600">Qty</label>
                              <Input
                                type="number"
                                min={1}
                                value={room.quantity || 1}
                                onChange={(e) => updateRoomAllocation(variantId, itinerary.id, roomIdx, 'quantity', parseInt(e.target.value) || 1)}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="space-y-1 col-span-2">
                              <label className="text-[10px] font-medium text-slate-600">Guest Names</label>
                              <Input
                                value={room.guestNames || ''}
                                onChange={(e) => updateRoomAllocation(variantId, itinerary.id, roomIdx, 'guestNames', e.target.value)}
                                placeholder="Guest names (optional)"
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="space-y-1 col-span-2">
                              <label className="text-[10px] font-medium text-slate-600">Voucher Number</label>
                              <Input
                                value={room.voucherNumber || ''}
                                onChange={(e) => updateRoomAllocation(variantId, itinerary.id, roomIdx, 'voucherNumber', e.target.value)}
                                placeholder="Voucher number (optional)"
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Transport Details */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Car className="h-3.5 w-3.5 text-emerald-600" /> Transport Details
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => addTransportDetail(variantId, itinerary.id)}
                      className="h-7 text-xs border-emerald-300 hover:bg-emerald-50 text-emerald-700"
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add Transport
                    </Button>
                  </div>
                  {variantTransports.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3 border border-dashed rounded-md">
                      No transport yet. Click "Add Transport" to start.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {variantTransports.map((transport: any, transportIdx: number) => (
                        <div key={transportIdx} className="p-3 border border-emerald-100 rounded-lg bg-white space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Transport {transportIdx + 1}</span>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => removeTransportDetail(variantId, itinerary.id, transportIdx)}
                              className="h-6 w-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-medium text-slate-600">Vehicle Type</label>
                              <Select
                                value={transport.vehicleTypeId}
                                onValueChange={(v) => updateTransportDetail(variantId, itinerary.id, transportIdx, 'vehicleTypeId', v)}
                              >
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Vehicle" /></SelectTrigger>
                                <SelectContent>{vehicleTypes.map((vt: any) => <SelectItem key={vt.id} value={vt.id} className="text-xs">{vt.name}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-medium text-slate-600">Quantity</label>
                              <Input
                                type="number"
                                min={1}
                                value={transport.quantity || 1}
                                onChange={(e) => updateTransportDetail(variantId, itinerary.id, transportIdx, 'quantity', parseInt(e.target.value) || 1)}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="space-y-1 col-span-2">
                              <label className="text-[10px] font-medium text-slate-600">Description</label>
                              <Input
                                value={transport.description || ''}
                                onChange={(e) => updateTransportDetail(variantId, itinerary.id, transportIdx, 'description', e.target.value)}
                                placeholder="Transport description (optional)"
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );

  // ─── Shared: Render Pricing tab content ──────────────────────────────────
  const renderPricingContent = (variantId: string, isPackageVariant: boolean, variant?: VariantWithDetails) => {
    const pricingItems = variantPricingItems[variantId] || [];
    const totalPrice = variantTotalPrices[variantId] || '';
    const remarks = variantRemarks[variantId] || '';
    const calcMethod = variantCalcMethods[variantId] || 'useTourPackagePricing';

    return (
      <div className="space-y-4">
        {/* Copy Pricing from Variant */}
        {allVariantsList.filter(v => v.id !== variantId).length > 0 && (
          <Card className="shadow-sm border border-violet-200/60 bg-gradient-to-r from-violet-50/30 to-transparent">
            <CardContent className="pt-3 pb-3">
              <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                <div className="flex items-center gap-2 text-xs font-medium text-violet-700 flex-shrink-0">
                  <Copy className="h-3.5 w-3.5" />
                  Copy Pricing From:
                </div>
                <div className="flex gap-2 flex-1">
                  <Select
                    value={copyPricingFromId[variantId] || ""}
                    onValueChange={(value) => setCopyPricingFromId(prev => ({ ...prev, [variantId]: value }))}
                  >
                    <SelectTrigger className="h-8 text-xs flex-1 border-violet-300">
                      <SelectValue placeholder="Select source variant..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allVariantsList
                        .filter(v => v.id !== variantId)
                        .map((v) => (
                          <SelectItem key={v.id} value={v.id} className="text-xs">
                            {v._type === 'custom' ? '⚙ ' : '✦ '}{v.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const fromId = copyPricingFromId[variantId];
                      if (fromId) {
                        copyPricingFromVariant(fromId, variantId);
                      } else {
                        toast.error('Please select a variant to copy pricing from');
                      }
                    }}
                    className="h-8 text-xs border-violet-300 hover:bg-violet-50 text-violet-700"
                    disabled={!copyPricingFromId[variantId]}
                  >
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    Copy Pricing
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Calculation Method (only for package variants with tour package pricing) */}
        {isPackageVariant && selectedTourPackageId && (
          <Card className="shadow-sm border border-blue-200/60 bg-gradient-to-r from-blue-50/20 to-transparent">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center mb-3">
                <Settings className="mr-2 h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-blue-800">Calculation Method</h3>
              </div>
              <RadioGroup
                value={calcMethod}
                onValueChange={(v: CalculationMethod) => setVariantCalcMethods(prev => ({ ...prev, [variantId]: v }))}
                className="grid grid-cols-1 md:grid-cols-3 gap-2"
              >
                {[
                  { value: 'manual', icon: <Receipt className="h-3.5 w-3.5 mr-1.5" />, label: 'Manual Entry', desc: 'Enter pricing items manually' },
                  { value: 'autoHotelTransport', icon: <Calculator className="h-3.5 w-3.5 mr-1.5" />, label: 'Auto Calculate', desc: 'From hotels + transport' },
                  { value: 'useTourPackagePricing', icon: <Package className="h-3.5 w-3.5 mr-1.5" />, label: 'Package Pricing', desc: 'From tour package template' },
                ].map(opt => (
                  <div
                    key={opt.value}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                      calcMethod === opt.value
                        ? "border-blue-400 bg-blue-50 shadow-sm"
                        : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/50"
                    )}
                    onClick={() => setVariantCalcMethods(prev => ({ ...prev, [variantId]: opt.value as CalculationMethod }))}
                  >
                    <RadioGroupItem value={opt.value} id={`${opt.value}-${variantId}`} className="mt-0.5" />
                    <div>
                      <label htmlFor={`${opt.value}-${variantId}`} className="text-xs font-medium cursor-pointer flex items-center">
                        {opt.icon}{opt.label}
                      </label>
                      <p className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
        )}

        {/* Calculation method specific content */}
        {isPackageVariant && calcMethod === 'manual' && (() => {
          const manualItems = variantManualPricingItems[variantId] || [];
          const manualTotal = manualItems.reduce((sum, item) => sum + Number(item.price || 0), 0);
          return (
            <Card className="shadow-sm border border-indigo-200/60">
              <CardHeader className="pb-3 border-b bg-indigo-50/50">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-indigo-600" /> Manual Pricing Entry
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {manualItems.length === 0 ? (
                  <p className="text-sm text-center text-muted-foreground py-4">Add items using the button below.</p>
                ) : (
                  manualItems.map((item, idx) => (
                    <div key={idx} className="p-3 border rounded-md bg-white space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-slate-500">Item {idx + 1}</span>
                        <Button type="button" size="sm" variant="ghost" onClick={() => handleRemoveManualPricingItem(variantId, idx)} className="h-6 w-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"><Trash className="h-3 w-3" /></Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <Input value={item.name} onChange={(e) => handleUpdateManualPricingItem(variantId, idx, 'name', e.target.value)} placeholder="Component name" className="h-8 text-xs" />
                        <Input value={item.price} onChange={(e) => handleUpdateManualPricingItem(variantId, idx, 'price', e.target.value)} placeholder="Price" type="number" className="h-8 text-xs" />
                        <Input value={item.description} onChange={(e) => handleUpdateManualPricingItem(variantId, idx, 'description', e.target.value)} placeholder="Description (optional)" className="h-8 text-xs" />
                      </div>
                    </div>
                  ))
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button type="button" variant="outline" size="sm" onClick={() => handleAddManualPricingItem(variantId)} className="h-8 text-xs">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
                  </Button>
                  <Button type="button" size="sm" onClick={() => handleApplyManualPricing(variantId)} className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white" disabled={manualItems.length === 0}>
                    <CheckCircle className="h-3.5 w-3.5 mr-1" /> Apply Manual Pricing
                  </Button>
                  {manualItems.length > 0 && (
                    <span className="ml-auto text-sm font-semibold text-indigo-700 self-center">Total: {formatCurrency(manualTotal)}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {isPackageVariant && calcMethod === 'autoHotelTransport' && (() => {
          const calcResult = variantPriceCalculationResults[variantId];
          const markupValue = variantMarkupValues[variantId] || '0';
          const pricingTier = variantPricingTiers[variantId] || 'custom';
          return (
            <Card className="shadow-sm border border-green-200/60">
              <CardHeader className="pb-3 border-b bg-green-50/50">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-green-600" /> Auto Calculate (Hotel + Transport)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <Alert><Info className="h-4 w-4" /><AlertDescription>Calculates pricing based on hotel and transport details from Room Allocation tab.</AlertDescription></Alert>
                <div className="flex flex-wrap gap-3 items-end p-3 border border-emerald-200 rounded-lg bg-emerald-50/30">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-emerald-600" />
                    <label className="text-xs font-medium text-emerald-700 whitespace-nowrap">Markup %:</label>
                    <Input
                      type="number" className="w-20 h-8 bg-white border-emerald-300" value={markupValue} min="0" max="100"
                      onChange={(e) => setVariantMarkupValues(prev => ({ ...prev, [variantId]: e.target.value }))}
                    />
                  </div>
                  <Select
                    value={pricingTier}
                    onValueChange={(value: 'standard' | 'premium' | 'luxury' | 'custom') => {
                      setVariantPricingTiers(prev => ({ ...prev, [variantId]: value }));
                      if (value === 'standard') setVariantMarkupValues(prev => ({ ...prev, [variantId]: '10' }));
                      if (value === 'premium') setVariantMarkupValues(prev => ({ ...prev, [variantId]: '20' }));
                      if (value === 'luxury') setVariantMarkupValues(prev => ({ ...prev, [variantId]: '30' }));
                    }}
                  >
                    <SelectTrigger className="h-8 w-40 bg-white border-emerald-300 text-xs"><SelectValue placeholder="Pricing Tier" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard (10%)</SelectItem>
                      <SelectItem value="premium">Premium (20%)</SelectItem>
                      <SelectItem value="luxury">Luxury (30%)</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button type="button" onClick={() => variant && handleCalculateVariantPricing(variant)} className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" disabled={loading || !variant}>
                      <Calculator className="mr-1.5 h-3.5 w-3.5" /> Calculate
                    </Button>
                    <Button type="button" onClick={() => handleResetVariantCalculation(variantId)} variant="outline" className="h-8 text-xs" disabled={loading}>
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reset
                    </Button>
                  </div>
                </div>
                {calcResult && calcResult.itineraryBreakdown?.length > 0 && (
                  <div className="border border-blue-200 rounded-lg overflow-hidden">
                    <Table>
                      <TableCaption className="py-2 bg-blue-50 text-xs">Pricing Breakdown</TableCaption>
                      <TableHeader>
                        <TableRow className="bg-blue-100">
                          <TableHead className="text-xs w-16">Day</TableHead>
                          <TableHead className="text-xs">Description</TableHead>
                          <TableHead className="text-xs text-right">Room</TableHead>
                          <TableHead className="text-xs text-right">Transport</TableHead>
                          <TableHead className="text-xs text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          const days = new Set<number>();
                          calcResult.itineraryBreakdown?.forEach((item: any) => days.add(item.day));
                          calcResult.transportDetails?.forEach((t: any) => days.add(t.day));
                          return Array.from(days).sort((a, b) => a - b).map(day => {
                            const acc = calcResult.itineraryBreakdown?.find((item: any) => item.day === day);
                            const transports = calcResult.transportDetails?.filter((t: any) => t.day === day);
                            const transportCost = transports?.reduce((s: number, t: any) => s + t.totalCost, 0) || 0;
                            const dayTotal = (acc?.accommodationCost || 0) + transportCost;
                            return (
                              <TableRow key={`day-${day}`}>
                                <TableCell className="text-xs font-medium">Day {day}</TableCell>
                                <TableCell className="text-xs text-gray-600">{acc?.roomBreakdown?.map((rb: any, i: number) => <div key={i}>{rb.roomTypeName} ({rb.occupancyTypeName}) - ₹{rb.totalCost.toFixed(2)}</div>)}</TableCell>
                                <TableCell className="text-xs text-right">{acc?.accommodationCost ? `₹${acc.accommodationCost.toFixed(2)}` : '-'}</TableCell>
                                <TableCell className="text-xs text-right">{transportCost ? `₹${transportCost.toFixed(2)}` : '-'}</TableCell>
                                <TableCell className="text-xs text-right font-medium">₹{dayTotal.toFixed(2)}</TableCell>
                              </TableRow>
                            );
                          });
                        })()}
                        <TableRow className="bg-blue-100 font-bold">
                          <TableCell colSpan={4} className="text-xs text-right">Final Total</TableCell>
                          <TableCell className="text-xs text-right">₹{calcResult.totalCost?.toFixed(2)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })()}

        {isPackageVariant && calcMethod === 'useTourPackagePricing' && (
          <Card className="shadow-sm border border-purple-200/60">
            <CardHeader className="pb-3 border-b bg-purple-50/50">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="h-4 w-4 text-purple-600" /> Tour Package Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-purple-700 flex items-center gap-1.5"><UtensilsIcon className="h-3.5 w-3.5" /> Meal Plan <span className="text-red-500">*</span></label>
                  <Select
                    disabled={loading}
                    onValueChange={(value) => {
                      setVariantMealPlanIds(prev => ({ ...prev, [variantId]: value }));
                      setVariantAvailableComponents(prev => ({ ...prev, [variantId]: [] }));
                      setVariantComponentsFetched(prev => ({ ...prev, [variantId]: false }));
                    }}
                    value={variantMealPlanIds[variantId] || undefined}
                  >
                    <SelectTrigger className="h-8 text-xs border-purple-300"><SelectValue placeholder="Select Meal Plan" /></SelectTrigger>
                    <SelectContent>{mealPlans.map((plan) => <SelectItem key={plan.id} value={plan.id} className="text-xs">{plan.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-purple-700 flex items-center gap-1.5"><BedDouble className="h-3.5 w-3.5" /> Number of Rooms <span className="text-red-500">*</span></label>
                  <div className="flex items-center gap-2">
                    <Button type="button" size="icon" variant="outline" className="h-8 w-8 border-purple-300 hover:bg-purple-50" onClick={() => handleRoomCountChange(variantId, (variantRoomCounts[variantId] || 1) - 1)} disabled={loading || (variantRoomCounts[variantId] || 1) <= 1}>
                      <span className="font-bold text-purple-600">-</span>
                    </Button>
                    <Input type="number" value={variantRoomCounts[variantId] || 1} onChange={(e) => handleRoomCountChange(variantId, parseInt(e.target.value) || 1)} min="1" disabled={loading} className="w-16 text-center h-8 text-sm border-purple-300 font-semibold" />
                    <Button type="button" size="icon" variant="outline" className="h-8 w-8 border-purple-300 hover:bg-purple-50" onClick={() => handleRoomCountChange(variantId, (variantRoomCounts[variantId] || 1) + 1)} disabled={loading}>
                      <span className="font-bold text-purple-600">+</span>
                    </Button>
                  </div>
                </div>
              </div>
              <Button type="button" onClick={() => handleFetchVariantPricingComponents(variantId)} className="w-full h-9 text-xs bg-purple-600 hover:bg-purple-700 text-white" disabled={loading || !variantMealPlanIds[variantId] || (variantRoomCounts[variantId] || 1) <= 0}>
                <Calculator className="mr-2 h-3.5 w-3.5" /> Fetch Available Pricing Components
              </Button>

              {variantComponentsFetched[variantId] && variantAvailableComponents[variantId]?.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-700">Select pricing components to include:</p>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => { const allIds = variantAvailableComponents[variantId].map((c: any) => c.id); setVariantSelectedComponentIds(prev => ({ ...prev, [variantId]: allIds })); }}>Select All</Button>
                      <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setVariantSelectedComponentIds(prev => ({ ...prev, [variantId]: [] }))}>Clear</Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {variantAvailableComponents[variantId].map((component: any) => {
                      const selected = (variantSelectedComponentIds[variantId] || []).includes(component.id);
                      const quantity = (variantComponentQuantities[variantId] || {})[component.id] || 1;
                      const totalPrice = calculateComponentTotalPrice(component, quantity);
                      return (
                        <div key={component.id} className="flex items-center gap-3 p-3 bg-white rounded-md border">
                          <Checkbox
                            id={`comp-${variantId}-${component.id}`}
                            checked={selected}
                            onCheckedChange={() => handleTogglePricingComponent(variantId, component.id)}
                          />
                          <label htmlFor={`comp-${variantId}-${component.id}`} className="flex-1 cursor-pointer">
                            <div className="flex justify-between items-center gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-slate-800 truncate">{component.pricingAttribute?.name || 'Pricing Component'}</p>
                                <p className="text-[10px] text-slate-500">₹{parseFloat(component.price || '0').toFixed(2)} / person</p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <div className="flex items-center gap-1">
                                  <Button type="button" size="icon" variant="outline" className="h-5 w-5" onClick={() => handleComponentRoomQuantityChange(variantId, component.id, quantity - 1)} disabled={quantity <= 1}><span className="text-xs font-bold">-</span></Button>
                                  <span className="text-xs w-6 text-center font-medium">{quantity}</span>
                                  <Button type="button" size="icon" variant="outline" className="h-5 w-5" onClick={() => handleComponentRoomQuantityChange(variantId, component.id, quantity + 1)}><span className="text-xs font-bold">+</span></Button>
                                </div>
                                <span className="text-xs font-semibold text-slate-800 min-w-[70px] text-right">{formatCurrency(totalPrice)}</span>
                              </div>
                            </div>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                  {(variantSelectedComponentIds[variantId] || []).length > 0 && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-xs font-medium text-green-800 mb-2">Selected: {(variantSelectedComponentIds[variantId] || []).length} component(s)</p>
                      <p className="text-sm font-bold text-green-800 flex justify-between">
                        <span>Total:</span>
                        <span>{formatCurrency(
                          variantAvailableComponents[variantId]
                            .filter((c: any) => (variantSelectedComponentIds[variantId] || []).includes(c.id))
                            .reduce((sum: number, c: any) => {
                              const qty = (variantComponentQuantities[variantId] || {})[c.id] || 1;
                              return sum + calculateComponentTotalPrice(c, qty);
                            }, 0)
                        )}</span>
                      </p>
                    </div>
                  )}
                  <Button type="button" onClick={() => handleApplySelectedPricingComponents(variantId)} className="w-full h-9 text-xs bg-green-600 hover:bg-green-700 text-white" disabled={loading || (variantSelectedComponentIds[variantId] || []).length === 0}>
                    <CheckCircle className="mr-2 h-3.5 w-3.5" /> Apply Selected Components ({(variantSelectedComponentIds[variantId] || []).length})
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Always-visible Pricing Breakdown */}
        <Card className="shadow-sm border border-slate-200/70">
          <CardHeader className="pb-3 border-b bg-gradient-to-r from-blue-50 to-transparent">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm flex items-center gap-2 font-semibold">
                <Receipt className="h-4 w-4 text-blue-600" /> Pricing Breakdown
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  onClick={() => {
                    const newItems = DEFAULT_PRICING_SECTION.map(item => ({ ...item }));
                    setVariantPricingItems(prev => ({ ...prev, [variantId]: newItems }));
                    syncVariantPricingToForm(variantId, newItems);
                    toast.success("Default pricing items loaded!");
                  }}
                  className="h-7 text-xs border-purple-300 hover:bg-purple-50 text-purple-700"
                >
                  <RefreshCw className="h-3 w-3 mr-1" /> Load Default
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  onClick={() => handleAddVariantPricingItem(variantId)}
                  className="h-7 text-xs border-blue-300 hover:bg-blue-50 text-blue-700"
                >
                  <Plus className="h-3 w-3 mr-1" /> Add Item
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {pricingItems.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-blue-200 rounded-lg bg-blue-50/20">
                <Receipt className="mx-auto h-8 w-8 text-blue-300 mb-2" />
                <p className="text-sm text-slate-500 mb-2">No pricing items yet.</p>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs border-dashed border-blue-400 text-blue-600 hover:bg-blue-50" disabled={loading} onClick={() => handleAddVariantPricingItem(variantId)}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Item
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {pricingItems.map((item: any, idx: number) => (
                  <div key={idx} className="grid grid-cols-1 lg:grid-cols-3 gap-2 p-2.5 border border-slate-200 rounded-lg bg-white hover:border-blue-300 transition-colors">
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-slate-500">Item Name</label>
                      <Input value={item.name} disabled={loading} placeholder="e.g., Per Person Cost" onChange={(e) => handleUpdateVariantPricingItem(variantId, idx, 'name', e.target.value)} onBlur={() => syncVariantPricingToForm(variantId)} className="h-7 text-xs bg-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-slate-500">Price</label>
                      <Input value={item.price} disabled={loading} placeholder="e.g., 15000" type="number" onChange={(e) => handleUpdateVariantPricingItem(variantId, idx, 'price', e.target.value)} onBlur={() => syncVariantPricingToForm(variantId)} className="h-7 text-xs bg-white" />
                    </div>
                    <div className="flex gap-1.5">
                      <div className="space-y-1 flex-1">
                        <label className="text-[10px] font-medium text-slate-500">Notes</label>
                        <Input value={item.description} disabled={loading} placeholder="Description / calculation" onChange={(e) => handleUpdateVariantPricingItem(variantId, idx, 'description', e.target.value)} onBlur={() => syncVariantPricingToForm(variantId)} className="h-7 text-xs bg-white" />
                      </div>
                      <Button type="button" variant="ghost" size="icon" disabled={loading} onClick={() => { handleRemoveVariantPricingItem(variantId, idx); setTimeout(() => syncVariantPricingToForm(variantId), 0); }} className="text-red-400 hover:text-red-600 hover:bg-red-50 h-7 w-7 self-end flex-shrink-0">
                        <Trash className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total Price */}
        <Card className="shadow-sm border-2 border-orange-200/60 bg-gradient-to-r from-orange-50 to-amber-50">
          <CardContent className="pt-4 pb-4">
            <label className="text-sm font-bold text-orange-800 flex items-center mb-2">
              <Trophy className="mr-2 h-4 w-4 text-orange-600" /> Final Amount (incl. GST)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-orange-600">₹</span>
              <Input
                value={totalPrice}
                disabled={loading}
                placeholder="Total price"
                type="number"
                className="text-xl font-bold pl-8 bg-white border-orange-300 h-12"
                onChange={(e) => setVariantTotalPrices(prev => ({ ...prev, [variantId]: e.target.value }))}
                onBlur={() => syncVariantPricingToForm(variantId)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Remarks */}
        <Card className="shadow-sm border border-slate-200/70">
          <CardContent className="pt-4 pb-4">
            <label className="text-sm font-medium flex items-center gap-2 mb-2">
              <Receipt className="h-4 w-4 text-slate-500" /> Remarks
            </label>
            <Input
              disabled={loading}
              placeholder="Additional remarks for this variant's pricing..."
              value={remarks}
              onChange={(e) => setVariantRemarks(prev => ({ ...prev, [variantId]: e.target.value }))}
              onBlur={() => syncVariantPricingToForm(variantId)}
              className="h-8 text-xs"
            />
          </CardContent>
        </Card>
      </div>
    );
  };

  // ─── Shared: Render Hotels tab for a variant ──────────────────────────────
  const renderHotelsTab = (variantId: string, isPackageVariant: boolean, variant?: VariantWithDetails) => {
    const hotelList = availableHotels.length > 0 ? availableHotels : hotels;

    if (isPackageVariant && variant) {
      return (
        <div className="space-y-3">
          {variant.variantHotelMappings.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg">
              <HotelIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
              No hotel mappings configured.
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-2">
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

                  return (
                    <AccordionItem
                      key={mapping.id}
                      value={mapping.id}
                      className="border rounded-lg overflow-hidden shadow-sm bg-white"
                    >
                      <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold bg-gradient-to-br from-primary to-primary/80 text-white flex-shrink-0">
                            {itinerary?.dayNumber || idx + 1}
                          </div>
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <HotelIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium text-sm truncate">{effectiveHotel.name}</span>
                          </div>
                          {isOverridden && (
                            <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 flex-shrink-0">
                              Modified
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 pt-3 space-y-3 border-t bg-slate-50/30">
                        {effectiveHotel.images && effectiveHotel.images.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {effectiveHotel.images.slice(0, 4).map((img, imgIdx) => (
                              <div key={imgIdx} className="relative h-28 w-full rounded-md overflow-hidden border bg-slate-100 shadow-sm">
                                <Image src={img.url} alt={effectiveHotel.name} fill className="object-cover hover:scale-105 transition duration-500" sizes="(max-width: 768px) 50vw, 25vw" />
                              </div>
                            ))}
                          </div>
                        )}
                        {itinerary && (
                          <div className="p-3 bg-white rounded-md border border-primary/20">
                            <div className="flex items-start gap-2">
                              <Calendar className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                              <div className="text-sm font-medium text-slate-800 [&>p]:m-0" dangerouslySetInnerHTML={{ __html: itinerary.itineraryTitle || '' }} />
                            </div>
                          </div>
                        )}
                        <div className="pt-2 border-t">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <HotelSearchCombobox
                                  hotels={availableHotels}
                                  value={tempHotelId}
                                  onChange={setTempHotelId}
                                  placeholder="Search and select hotel..."
                                  allowNone={false}
                                />
                              </div>
                              <Button type="button" size="sm" variant="default" onClick={() => handleSaveHotelChange(variant.id, mapping.itineraryId, tempHotelId)} disabled={!tempHotelId} className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700">
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button type="button" size="sm" variant="outline" onClick={handleCancelEdit} className="h-8 px-3">
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <Button type="button" size="sm" variant="outline" onClick={() => handleStartEdit(mapping.id, effectiveHotelId)} className="w-full h-8 text-xs hover:bg-primary/5">
                              <Edit2 className="h-3 w-3 mr-2" /> Change Hotel
                            </Button>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
            </Accordion>
          )}
        </div>
      );
    }

    // Custom variant: hotel selection per itinerary day
    if (!queryItineraries || queryItineraries.length === 0) {
      return (
        <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg">
          <HotelIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
          No itineraries configured. Add itineraries in the Hotels tab first.
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {queryItineraries.map((itinerary: any, idx: number) => {
          const selectedHotelId = variantHotelOverrides?.[variantId]?.[itinerary.id] || '';
          return (
            <div key={itinerary.id} className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg bg-white">
              <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold bg-gradient-to-br from-blue-500 to-blue-600 text-white flex-shrink-0 mt-0.5">
                {itinerary.dayNumber || idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-slate-700 mb-1.5 truncate" dangerouslySetInnerHTML={{ __html: itinerary.itineraryTitle || `Day ${itinerary.dayNumber || idx + 1}` }} />
                <HotelSearchCombobox
                  hotels={hotelList}
                  value={selectedHotelId}
                  onChange={(value) => {
                    const currentOverrides = variantHotelOverrides || {};
                    const variantOverrides = currentOverrides[variantId] || {};
                    form.setValue('variantHotelOverrides', {
                      ...currentOverrides,
                      [variantId]: { ...variantOverrides, [itinerary.id]: value }
                    });
                  }}
                  placeholder="Search and select hotel..."
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ─── Main Render ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* ── Top Toolbar ── */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-800">Package Variants</h3>
            <p className="text-xs text-muted-foreground truncate">
              {selectedTourPackage ? selectedTourPackage.tourPackageName : 'No tour package selected — you can still add custom variants'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {selectedVariants.length > 0 && (
            <Badge variant="outline" className="text-xs hidden sm:flex">
              Package: {selectedVariants.length}
            </Badge>
          )}
          {((customQueryVariants as any[]) || []).length > 0 && (
            <Badge variant="outline" className="text-xs bg-violet-50 text-violet-700 border-violet-300 hidden sm:flex">
              Custom: {((customQueryVariants as any[]) || []).length}
            </Badge>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={addCustomVariant}
            className="border-violet-300 text-violet-700 hover:bg-violet-50 h-8 text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Custom Variant
          </Button>
        </div>
      </div>

      {/* ── Empty State ── */}
      {allVariantsList.length === 0 && (
        <div className="flex flex-col items-center justify-center py-14 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <Package className="h-10 w-10 mb-3 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No variants available</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            {!selectedTourPackageId
              ? 'Select a tour package from the Basic Info tab, or add a custom variant above.'
              : 'Select package variants from the Basic Info tab, or add a custom variant above.'}
          </p>
        </div>
      )}

      {/* ── Unified Variants Tabs ── */}
      {allVariantsList.length > 0 && (
        <Tabs value={activeVariantTab} onValueChange={setActiveVariantTab} className="w-full">
          {/* Scrollable tab bar — all variants in one row */}
          <div className="border-b border-slate-200 overflow-x-auto scrollbar-thin">
            <TabsList className="h-auto p-0 bg-transparent rounded-none gap-0 w-max min-w-full">
              {selectedVariants.map(v => (
                <TabsTrigger
                  key={v.id}
                  value={v.id}
                  className={cn(
                    "relative h-10 px-4 text-xs rounded-none border-b-2 border-transparent transition-all",
                    "data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-primary/5",
                    "hover:bg-slate-50 font-medium gap-1.5 flex items-center whitespace-nowrap"
                  )}
                >
                  <Sparkles className="h-3 w-3 text-amber-500 flex-shrink-0" />
                  <span className="truncate max-w-[120px]">{v.name}</span>
                  {v.isDefault && <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 leading-none">Default</Badge>}
                  {confirmedVariantId === v.id && <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />}
                </TabsTrigger>
              ))}
              {((customQueryVariants as any[]) || []).map((cv: any) => (
                <TabsTrigger
                  key={cv.id}
                  value={cv.id}
                  className={cn(
                    "relative h-10 px-4 text-xs rounded-none border-b-2 border-transparent transition-all",
                    "data-[state=active]:border-violet-500 data-[state=active]:text-violet-700 data-[state=active]:bg-violet-50",
                    "hover:bg-slate-50 font-medium gap-1.5 flex items-center whitespace-nowrap"
                  )}
                >
                  <Package className="h-3 w-3 text-violet-500 flex-shrink-0" />
                  <span className="truncate max-w-[120px]">{cv.name || 'Custom Variant'}</span>
                  {confirmedVariantId === cv.id && <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* ── Package Variant Tab Contents ── */}
          {selectedVariants.map(variant => (
            <TabsContent key={variant.id} value={variant.id} className="mt-0 pt-4 space-y-4">
              {/* Variant info card */}
              <Card className={cn("shadow-sm border", confirmedVariantId === variant.id ? 'border-green-400 ring-1 ring-green-300' : 'border-slate-200')}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-8 w-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-base text-slate-800">{variant.name}</span>
                          {variant.priceModifier !== null && variant.priceModifier !== 0 && (
                            <Badge className="text-xs bg-gradient-to-r from-primary to-primary/80">
                              {variant.priceModifier > 0 ? '+' : ''}{variant.priceModifier}%
                            </Badge>
                          )}
                          {confirmedVariantId === variant.id && (
                            <Badge className="text-xs bg-green-600 text-white">✓ Confirmed for Voucher</Badge>
                          )}
                        </div>
                        {variant.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{variant.description}</p>}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={confirmedVariantId === variant.id ? "default" : "outline"}
                      disabled={loading}
                      onClick={() => form.setValue('confirmedVariantId', confirmedVariantId === variant.id ? null : variant.id, { shouldDirty: true })}
                      className={confirmedVariantId === variant.id ? "bg-green-600 hover:bg-green-700 text-white h-8 text-xs" : "border-green-400 text-green-700 hover:bg-green-50 h-8 text-xs"}
                    >
                      {confirmedVariantId === variant.id ? <><Check className="h-3 w-3 mr-1" /> Confirmed</> : <><Trophy className="h-3 w-3 mr-1" /> Confirm for Voucher</>}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Sub-tabs */}
              <Tabs defaultValue="hotels" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-muted p-1 h-9">
                  <TabsTrigger value="hotels" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs gap-1.5">
                    <HotelIcon className="h-3.5 w-3.5" /> Hotels
                  </TabsTrigger>
                  <TabsTrigger value="rooms" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs gap-1.5">
                    <BedDouble className="h-3.5 w-3.5" /> Room Allocation
                  </TabsTrigger>
                  <TabsTrigger value="pricing" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs gap-1.5">
                    <Calculator className="h-3.5 w-3.5" /> Pricing
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="hotels" className="mt-4">
                  {renderHotelsTab(variant.id, true, variant)}
                </TabsContent>

                <TabsContent value="rooms" className="mt-4">
                  {itineraries.length === 0 ? (
                    <Alert><AlertCircle className="h-4 w-4" /><AlertDescription>No itineraries configured. Add itineraries in the Hotels tab first.</AlertDescription></Alert>
                  ) : (
                    renderRoomAllocationAccordion(variant.id, itineraries)
                  )}
                </TabsContent>

                <TabsContent value="pricing" className="mt-4">
                  {renderPricingContent(variant.id, true, variant)}
                </TabsContent>
              </Tabs>
            </TabsContent>
          ))}

          {/* ── Custom Variant Tab Contents ── */}
          {((customQueryVariants as any[]) || []).map((cVariant: any) => {
            const isConfirmed = confirmedVariantId === cVariant.id;
            return (
              <TabsContent key={cVariant.id} value={cVariant.id} className="mt-0 pt-4 space-y-4">
                {/* Custom variant header card */}
                <Card className={cn("shadow-sm border", isConfirmed ? 'border-green-400 ring-1 ring-green-300' : 'border-violet-200/60')}>
                  <CardContent className="pt-4 pb-4 space-y-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Package className="h-4 w-4 text-violet-500 flex-shrink-0" />
                        <Input
                          value={cVariant.name}
                          disabled={loading}
                          placeholder="Variant name..."
                          className="h-8 text-sm font-semibold border-violet-200 bg-white max-w-xs"
                          onChange={(e) => {
                            const updated = ((customQueryVariants as any[]) || []).map((v: any) =>
                              v.id === cVariant.id ? { ...v, name: e.target.value } : v
                            );
                            form.setValue('customQueryVariants', updated, { shouldDirty: true });
                          }}
                        />
                        {isConfirmed && <Badge className="text-xs bg-green-600 text-white flex-shrink-0">✓ Confirmed</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={isConfirmed ? 'default' : 'outline'}
                          disabled={loading}
                          onClick={() => form.setValue('confirmedVariantId', isConfirmed ? null : cVariant.id, { shouldDirty: true })}
                          className={isConfirmed ? 'bg-green-600 hover:bg-green-700 text-white h-8 text-xs' : 'border-green-400 text-green-700 hover:bg-green-50 h-8 text-xs'}
                        >
                          {isConfirmed ? <><Check className="h-3 w-3 mr-1" /> Confirmed</> : <><Trophy className="h-3 w-3 mr-1" /> Confirm for Voucher</>}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={loading}
                          onClick={() => {
                            const updated = ((customQueryVariants as any[]) || []).filter((v: any) => v.id !== cVariant.id);
                            form.setValue('customQueryVariants', updated, { shouldDirty: true });
                            if (isConfirmed) form.setValue('confirmedVariantId', null, { shouldDirty: true });
                            if (activeVariantTab === cVariant.id) {
                              const remaining = allVariantsList.filter(v => v.id !== cVariant.id);
                              setActiveVariantTab(remaining.length > 0 ? remaining[0].id : '');
                            }
                          }}
                          className="text-red-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <Input
                      value={cVariant.description || ''}
                      disabled={loading}
                      placeholder="Description (optional)..."
                      className="h-7 text-xs border-violet-100 bg-white/60"
                      onChange={(e) => {
                        const updated = ((customQueryVariants as any[]) || []).map((v: any) =>
                          v.id === cVariant.id ? { ...v, description: e.target.value } : v
                        );
                        form.setValue('customQueryVariants', updated, { shouldDirty: true });
                      }}
                    />
                  </CardContent>
                </Card>

                {/* Sub-tabs for custom variant */}
                <Tabs defaultValue="hotels" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-muted p-1 h-9">
                    <TabsTrigger value="hotels" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs gap-1.5">
                      <HotelIcon className="h-3.5 w-3.5" /> Hotels
                    </TabsTrigger>
                    <TabsTrigger value="rooms" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs gap-1.5">
                      <BedDouble className="h-3.5 w-3.5" /> Room Allocation
                    </TabsTrigger>
                    <TabsTrigger value="pricing" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs gap-1.5">
                      <Calculator className="h-3.5 w-3.5" /> Pricing
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="hotels" className="mt-4">
                    {renderHotelsTab(cVariant.id, false)}
                  </TabsContent>

                  <TabsContent value="rooms" className="mt-4">
                    {(!queryItineraries || queryItineraries.length === 0) ? (
                      <Alert><AlertCircle className="h-4 w-4" /><AlertDescription>No itineraries found. Add itineraries to the query first.</AlertDescription></Alert>
                    ) : (
                      renderRoomAllocationAccordion(cVariant.id, queryItineraries)
                    )}
                  </TabsContent>

                  <TabsContent value="pricing" className="mt-4">
                    {renderPricingContent(cVariant.id, false)}
                  </TabsContent>
                </Tabs>
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
};

export default QueryVariantsTab;
