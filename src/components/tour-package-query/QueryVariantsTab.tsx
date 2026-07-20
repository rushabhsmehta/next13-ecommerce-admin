"use client";
import { useState, useEffect, useMemo } from "react";
import { Control, useWatch } from "react-hook-form";
import { Hotel, Images, PackageVariant, VariantHotelMapping, Itinerary, TourPackagePricing, PricingComponent, PricingAttribute, MealPlan, VehicleType, LocationSeasonalPeriod } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Sparkles, Hotel as HotelIcon, IndianRupee, Calendar, Info, AlertCircle, Check, Utensils as UtensilsIcon, Car, Receipt, BedDouble, Users, Calculator, Plus, Trash, Settings, Package, CreditCard, ShoppingCart, Wallet, CheckCircle, RefreshCw, Target, Star, Trophy, DollarSign, Copy, ChevronsUpDown, PlusCircle } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { FormControl, FormItem, FormLabel } from "@/components/ui/form";
import Image from "next/image";
import { toast } from "react-hot-toast";
import axios from "axios";
import { utcToLocal } from "@/lib/timezone-utils";
import { DEFAULT_PRICING_SECTION } from "@/components/tour-package-query/defaultValues";
import {
  applyPerPersonRatesToPricingItems,
} from "@/lib/variant-pricing-display";
import {
  applyPercentDiscountToPricingComponents,
  clonePricingComponents,
  computeVariantDiscountWithAirFare,
  formatDiscountLabel,
  hasAppliedVariantDiscount,
  isAirFarePricingLabel,
  sumAirFareAmount,
  sumTaxablePricingAmount,
  type PricingComponentItem,
  type VariantDiscountType,
} from "@/lib/variant-pricing-discount";
import {
  copyFirstDayHotelForVariant,
  copyFirstDayRoomsAndTransportForVariant,
} from "@/lib/tour-query-variant-copy";

/** Returns a fresh shallow-clone of each DEFAULT_PRICING_SECTION item to avoid shared-reference mutations. */
const cloneDefaultPricingSection = () => DEFAULT_PRICING_SECTION.map(item => ({ ...item }));

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
  hotels: hotelsProp,
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
  const numAdultsRaw = useWatch({ control, name: "numAdults" });
  const numChild5to12Raw = useWatch({ control, name: "numChild5to12" });
  const numChild0to5Raw = useWatch({ control, name: "numChild0to5" });
  const numAdults = parseInt(numAdultsRaw || '0') || 0;
  const numChild5to12 = parseInt(numChild5to12Raw || '0') || 0;
  const numChild0to5 = parseInt(numChild0to5Raw || '0') || 0;
  const confirmedVariantId = useWatch({ control, name: "confirmedVariantId" }) as string | null | undefined;
  const customQueryVariants = useWatch({ control, name: "customQueryVariants" }) as any[] | undefined;

  const [createdHotels, setCreatedHotels] = useState<Array<Hotel & { images: Images[] }>>([]);
  const hotels = useMemo(() => {
    const seen = new Set(createdHotels.map((h) => h.id));
    return [...createdHotels, ...hotelsProp.filter((h) => !seen.has(h.id))];
  }, [createdHotels, hotelsProp]);
  const [addHotelOpen, setAddHotelOpen] = useState(false);
  const [newHotelName, setNewHotelName] = useState("");
  const [savingHotel, setSavingHotel] = useState(false);
  const [addHotelTarget, setAddHotelTarget] = useState<{
    variantId: string;
    itineraryId: string;
    locationId: string;
  } | null>(null);

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
  const [variantDiscountTypes, setVariantDiscountTypes] = useState<Record<string, VariantDiscountType>>({});
  const [variantDiscountValues, setVariantDiscountValues] = useState<Record<string, string>>({});
  const [variantDiscountReasons, setVariantDiscountReasons] = useState<Record<string, string>>({});
  // Pricing breakdown items (always-visible, editable), total price, and remarks per variant
  const [variantPricingItems, setVariantPricingItems] = useState<Record<string, { name: string; price: string; description: string; derivationFormula?: string }[]>>({});
  const [variantTotalPrices, setVariantTotalPrices] = useState<Record<string, string>>({});
  const [variantRemarks, setVariantRemarks] = useState<Record<string, string>>({});
  const [openRoomTypeKey, setOpenRoomTypeKey] = useState<string | null>(null);

  // Hydrate state from saved form data when component mounts or when variants change
  useEffect(() => {
    const activeVariantIds = Array.from(
      new Set([
        ...(selectedVariantIds || []),
        ...((customQueryVariants || []).map((variant: any) => variant?.id).filter(Boolean) as string[]),
      ])
    );

    if (savedVariantPricingData && activeVariantIds.length > 0) {
      const newPricingItems: Record<string, { name: string; price: string; description: string }[]> = {};
      const newTotalPrices: Record<string, string> = {};
      const newRemarks: Record<string, string> = {};
      const newDiscountTypes: Record<string, VariantDiscountType> = {};
      const newDiscountValues: Record<string, string> = {};
      const newDiscountReasons: Record<string, string> = {};
      const variantsNeedingFormDefaults: string[] = [];

      activeVariantIds.forEach(variantId => {
        const savedData = savedVariantPricingData[variantId];
        if (savedData) {
          if (Array.isArray(savedData.components)) {
            newPricingItems[variantId] = savedData.components;
          } else {
            newPricingItems[variantId] = cloneDefaultPricingSection();
            variantsNeedingFormDefaults.push(variantId);
          }
          if (typeof savedData.totalCost === 'number' && Number.isFinite(savedData.totalCost)) {
            newTotalPrices[variantId] = savedData.totalCost.toString();
          }
          if (typeof savedData.remarks === 'string') {
            newRemarks[variantId] = savedData.remarks;
          }
          if (savedData.appliedDiscount && hasAppliedVariantDiscount(savedData.appliedDiscount)) {
            newDiscountTypes[variantId] = savedData.appliedDiscount.type;
            newDiscountValues[variantId] = String(savedData.appliedDiscount.inputValue);
            if (savedData.appliedDiscount.reason) {
              newDiscountReasons[variantId] = savedData.appliedDiscount.reason;
            }
          }
        } else {
          newPricingItems[variantId] = cloneDefaultPricingSection();
          variantsNeedingFormDefaults.push(variantId);
        }
      });

      setVariantPricingItems(newPricingItems);
      setVariantTotalPrices(newTotalPrices);
      setVariantRemarks(newRemarks);
      setVariantDiscountTypes(newDiscountTypes);
      setVariantDiscountValues(newDiscountValues);
      setVariantDiscountReasons(newDiscountReasons);

      if (variantsNeedingFormDefaults.length > 0) {
        const currentPricingData = form.getValues('variantPricingData') || {};
        const updatedPricingData = { ...currentPricingData };
        variantsNeedingFormDefaults.forEach(variantId => {
          updatedPricingData[variantId] = {
            ...(updatedPricingData[variantId] || {}),
            components: cloneDefaultPricingSection(),
          };
        });
        form.setValue('variantPricingData', updatedPricingData, { shouldDirty: false });
      }
    }
  }, [savedVariantPricingData, selectedVariantIds, customQueryVariants, form]);

  const selectedTourPackage = tourPackages?.find(tp => tp.id === selectedTourPackageId);
  const allVariants = selectedTourPackage?.packageVariants || [];
  const selectedVariants = allVariants.filter(v => selectedVariantIds?.includes(v.id));
  const getCopySourceVariants = (currentVariantId: string) => {
    const sources = [
      ...selectedVariants.map((variant) => ({
        id: variant.id,
        name: variant.name || `Package Variant ${variant.id.slice(0, 6)}`,
      })),
      ...((customQueryVariants || []) as any[]).map((variant) => ({
        id: variant.id,
        name: variant.name || `Custom Variant ${String(variant.id).slice(0, 6)}`,
      })),
    ];
    const seen = new Set<string>();
    return sources.filter((source) => {
      if (!source.id || source.id === currentVariantId || seen.has(source.id)) return false;
      seen.add(source.id);
      return true;
    });
  };

  const itineraries = (queryItineraries && queryItineraries.length > 0)
    ? queryItineraries
    : (selectedTourPackage?.itineraries || []);

  useEffect(() => {
    if (selectedVariants.length === 0) {
      return;
    }

    setVariantMealPlanIds(prev => {
      let changed = false;
      const next = { ...prev };

      selectedVariants.forEach((variant) => {
        if (next[variant.id]) {
          return;
        }

        const defaultPricing = [...(variant.tourPackagePricings || [])]
          .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
          .find((pricing) => !!pricing.mealPlanId);

        if (defaultPricing?.mealPlanId) {
          next[variant.id] = defaultPricing.mealPlanId;
          changed = true;
        }
      });

      return changed ? next : prev;
    });

    setVariantRoomCounts(prev => {
      let changed = false;
      const next = { ...prev };
      const fallbackRoomCount = Number(form.getValues('numberOfRooms')) || 1;

      selectedVariants.forEach((variant) => {
        if (next[variant.id]) {
          return;
        }

        const defaultPricing = [...(variant.tourPackagePricings || [])]
          .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
          .find((pricing) => typeof pricing.numberOfRooms === 'number' && pricing.numberOfRooms > 0);

        next[variant.id] = defaultPricing?.numberOfRooms || fallbackRoomCount;
        changed = true;
      });

      return changed ? next : prev;
    });
  }, [selectedVariants, form]);

  // Helper function to get occupancy multiplier from component name or occupancy type name
  const getOccupancyMultiplier = (componentName: string): number => {
    const name = componentName.toLowerCase();
    if (name.includes('quad')) return 4;
    if (name.includes('triple') || name.includes('extra bed') || name.includes('extra mattress')) return 3;
    if (name.includes('double') || name.includes('twin') || name.includes('couple')) return 2;
    if (name.includes('single') || (name.includes('per person') && !name.includes('extra'))) return 1;
    return 1;
  };

  // Resolve a variant (selected or custom) to the shape resolveVariantHotelId expects
  const findVariantForPricing = (variantId: string): { id: string; variantHotelMappings?: any[] } | null => {
    const selected = selectedVariants.find((v) => v.id === variantId);
    if (selected) return selected;
    const custom = (customQueryVariants || []).find((v: any) => v?.id === variantId);
    if (custom) return { id: custom.id, variantHotelMappings: [] };
    return null;
  };

  // Map a pricing item name to a guest quantity + label for auto-description.
  const getItemQuantityInfo = (itemName: string): { qty: number; label: string } => {
    const n = (itemName || '').toLowerCase();
    if ((n.includes('extra bed') || n.includes('extra mattress')) && n.includes('per person'))
      return { qty: numAdults, label: 'Pax' };
    if (n.includes('couple'))
      return { qty: Math.ceil(numAdults / 2) || 0, label: 'Couples' };
    if (n.includes('per person') || n.includes('adult'))
      return { qty: numAdults, label: 'Adults' };
    if (n.includes('child') && (n.includes('below 5') || n.includes('under 5') || n.includes('infant')))
      return { qty: numChild0to5, label: 'Children (<5)' };
    if (n.includes('child'))
      return { qty: numChild5to12, label: 'Children (5-11)' };
    return { qty: numAdults + numChild5to12 + numChild0to5, label: 'Pax' };
  };

  // Auto-calculate the Pricing Breakdown rate sheet from hotel + transport data.
  const recalculatePricingFromRooms = async (variantId: string) => {
    const variant = findVariantForPricing(variantId);
    if (!variant) {
      toast.error('Variant not found.');
      return;
    }
    if (!queryStartDate || !queryEndDate) {
      toast.error('Select tour start and end dates first.');
      return;
    }
    const currentItems = variantPricingItems[variantId] || [];
    if (currentItems.length === 0) {
      toast.error('Add pricing items (or click Load Default) before calculating.');
      return;
    }

    const pricingItineraries = itineraries.map((itinerary: any, idx: number) => ({
      locationId: itinerary.locationId || selectedTourPackage?.locationId || '',
      dayNumber: itinerary.dayNumber || idx + 1,
      hotelId: resolveVariantHotelId(variant, itinerary, idx) || undefined,
      roomAllocations: variantRoomAllocations?.[variantId]?.[itinerary.id] || [],
      transportDetails: variantTransportDetails?.[variantId]?.[itinerary.id] || [],
    }));

    if (!pricingItineraries.some((it) => (it.roomAllocations?.length || 0) > 0)) {
      toast.error('Add room allocations to the variant before calculating.');
      return;
    }

    const incompleteRoomDays = pricingItineraries
      .filter((it) => (it.roomAllocations || []).some((r: any) => !r.roomTypeId || !r.occupancyTypeId || !r.mealPlanId))
      .map((it) => it.dayNumber);
    if (incompleteRoomDays.length > 0) {
      toast.error(`Complete room type, occupancy, and meal plan for ${formatDayList(incompleteRoomDays)} first.`);
      return;
    }

    const markupValue = variantMarkupValues[variantId] || '0';
    const markupPercentage = parseFloat(markupValue) || 0;

    try {
      toast.loading('Deriving rates from hotel + transport...');
      const response = await axios.post('/api/pricing/calculate-variant', {
        variantId,
        variantRoomAllocations,
        variantTransportDetails,
        itineraries: pricingItineraries,
        tourStartsFrom: queryStartDate,
        tourEndsOn: queryEndDate,
        markup: markupPercentage,
        includeBreakdown: true,
      });
      toast.dismiss();

      const perPersonRates = response.data?.perPersonRates;
      if (!perPersonRates?.rates) {
        toast.error('Could not derive rates. Check hotel pricing setup.');
        return;
      }

      const updatedItems = applyPerPersonRatesToPricingItems(currentItems, perPersonRates, {
        numChild5to12,
        numChild0to5,
      });

      setVariantPricingItems((prev) => ({ ...prev, [variantId]: updatedItems }));

      const currentPricingData = form.getValues('variantPricingData') || {};
      const existingData = currentPricingData[variantId] || {};
      form.setValue(
        'variantPricingData',
        {
          ...currentPricingData,
          [variantId]: {
            ...existingData,
            components: updatedItems,
            perPersonRates,
            updatedAt: new Date().toISOString(),
          },
        },
        { shouldDirty: true }
      );

      toast.success('Per-guest rates calculated from hotel + transport.');
    } catch (error) {
      toast.dismiss();
      console.log('[RECALCULATE_PRICING_FROM_ROOMS]', error);
      toast.error('Failed to calculate rates. Check hotel pricing setup.');
    }
  };

  // Helper function to calculate total price for a component
  const calculateComponentTotalPrice = (component: any, roomQuantity: number = 1): number => {
    const basePrice = parseFloat(component.price || '0');
    const componentName = component.pricingAttribute?.name || '';
    const occupancyMultiplier = getOccupancyMultiplier(componentName);
    return basePrice * occupancyMultiplier * roomQuantity;
  };

  const formatCurrency = (amount: number): string => {
    return `Rs.${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatShortDate = (value: Date | string | undefined) => {
    if (!value) return "";

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  const formatDayList = (days: number[]) => days.map((day) => `Day ${day}`).join(', ');

  const getMealPlanLabel = (mealPlanId?: string) =>
    mealPlans.find((mealPlan: any) => mealPlan.id === mealPlanId)?.name || 'the selected meal plan';

  const getPricingCriteriaLabel = (mealPlanId: string, roomCount: number) => {
    const startLabel = formatShortDate(queryStartDate);
    const endLabel = formatShortDate(queryEndDate);
    const dateLabel = startLabel && endLabel
      ? `${startLabel} to ${endLabel}`
      : 'the selected travel dates';

    return `${getMealPlanLabel(mealPlanId)}, ${roomCount} room${roomCount === 1 ? '' : 's'}, ${dateLabel}`;
  };

  const getHotelOptions = (itineraryLocationId?: string | null) => {
    if (!itineraryLocationId) {
      return hotels;
    }

    const preferred = hotels.filter((hotel) => hotel.locationId === itineraryLocationId);
    const remaining = hotels.filter((hotel) => hotel.locationId !== itineraryLocationId);
    return [...preferred, ...remaining];
  };

  // Handler to fetch available pricing components for a variant
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
      queryParams.append('startDate', new Date(queryStartDate as Date).toISOString());
      queryParams.append('endDate', new Date(queryEndDate as Date).toISOString());

      const requestUrl = `/api/tourPackages/${baseTourPackageId}/pricing?${queryParams.toString()}`;
      const response = await axios.get(requestUrl);
      const tourPackagePricings = response.data;
      toast.dismiss();

      if (!tourPackagePricings || tourPackagePricings.length === 0) {
        toast.error("No active pricing periods were found for this variant. Check the package pricing setup.");
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
        toast.error(`No pricing matched ${getPricingCriteriaLabel(mealPlanId, roomCount)}.`);
        setVariantAvailableComponents(prev => ({ ...prev, [variantId]: [] }));
        setVariantComponentsFetched(prev => ({ ...prev, [variantId]: false }));
        return;
      }

      if (matchedPricings.length > 1) {
        toast.error(`Multiple pricing periods matched ${getPricingCriteriaLabel(mealPlanId, roomCount)}. Narrow the dates or pricing setup.`);
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
    let taxableSubtotal = 0;

    components.forEach((comp: any) => {
      const componentName = comp.pricingAttribute?.name || 'Pricing Component';
      const basePrice = parseFloat(comp.price || '0');
      const roomQuantity = (variantComponentQuantities[variantId] || {})[comp.id] || 1;
      const occupancyMultiplier = getOccupancyMultiplier(componentName);
      const totalComponentPrice = calculateComponentTotalPrice(comp, roomQuantity);
      const isAirFare = isAirFarePricingLabel(componentName);

      finalComponents.push({
        name: componentName,
        // Air Fare stores the full line total so discount math can add it back cleanly.
        price: (isAirFare ? totalComponentPrice : basePrice).toString(),
        description: `${basePrice.toFixed(2)} x ${occupancyMultiplier} occupancy${roomQuantity > 1 ? ` x ${roomQuantity} rooms` : ''} = Rs.${totalComponentPrice.toFixed(2)}`
      });

      if (!isAirFare) {
        taxableSubtotal += totalComponentPrice;
      }
    });

    const currentPricingData = form.getValues('variantPricingData') || {};
    finalizeVariantSubtotal(variantId, taxableSubtotal, {
      ...(currentPricingData[variantId] || {}),
      calculationMethod: 'useTourPackagePricing',
      components: finalComponents,
      calculatedAt: new Date().toISOString(),
    });

    // Also update the always-visible pricing breakdown and total
    setVariantPricingItems(prev => ({ ...prev, [variantId]: finalComponents }));

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

    const taxableSubtotal = sumTaxablePricingAmount(items);
    const currentPricingData = form.getValues('variantPricingData') || {};
    finalizeVariantSubtotal(variantId, taxableSubtotal, {
      ...(currentPricingData[variantId] || {}),
      calculationMethod: 'manual',
      components: items,
      calculatedAt: new Date().toISOString(),
    });

    // Also update the always-visible pricing breakdown and total
    setVariantPricingItems(prev => ({ ...prev, [variantId]: items }));

    toast.success("Manual pricing applied successfully!");
  };

  const handleCalculateVariantPricing = async (variant: VariantWithDetails) => {
    const variantId = variant.id;
    const tourStartsFrom = queryStartDate;
    const tourEndsOn = queryEndDate;

    if (!tourStartsFrom || !tourEndsOn) {
      console.log('Missing dates for calculation:', { tourStartsFrom, tourEndsOn });
      toast.error("Please select tour start and end dates first.");
      return;
    }

    const pricingItineraries = itineraries.map((itinerary, idx) => {
      const dayNum = itinerary.dayNumber || idx + 1;
      const hotelId = resolveVariantHotelId(variant, itinerary, idx) || undefined;

      return {
        locationId: itinerary.locationId || selectedTourPackage?.locationId || '',
        dayNumber: dayNum,
        hotelId,
        roomAllocations: variantRoomAllocations?.[variantId]?.[itinerary.id] || [],
        transportDetails: variantTransportDetails?.[variantId]?.[itinerary.id] || [],
      };
    });

    if (!pricingItineraries.some(it => (it.roomAllocations?.length || 0) > 0 || (it.transportDetails?.length || 0) > 0)) {
      toast.error("Please add room allocations or transport details before calculating.");
      return;
    }

    const missingHotelDays = pricingItineraries
      .filter((itinerary) => (itinerary.roomAllocations?.length || 0) > 0 && !itinerary.hotelId)
      .map((itinerary) => itinerary.dayNumber);
    if (missingHotelDays.length > 0) {
      toast(`No hotel selected for ${formatDayList(missingHotelDays)} — room costs for those days will be skipped.`, {
        icon: '⚠️',
        duration: 5000,
      });
    }

    const incompleteRoomDays = pricingItineraries
      .filter((itinerary) => (itinerary.roomAllocations || []).some((room: any) => !room.roomTypeId || !room.occupancyTypeId || !room.mealPlanId))
      .map((itinerary) => itinerary.dayNumber);
    if (incompleteRoomDays.length > 0) {
      toast.error(`Complete room type, occupancy, and meal plan for ${formatDayList(incompleteRoomDays)} before auto-calculating.`);
      return;
    }

    const incompleteTransportDays = pricingItineraries
      .filter((itinerary) => (itinerary.transportDetails || []).some((transport: any) => !transport.vehicleTypeId))
      .map((itinerary) => itinerary.dayNumber);
    if (incompleteTransportDays.length > 0) {
      toast.error(`Select a vehicle type for ${formatDayList(incompleteTransportDays)} before auto-calculating transport costs.`);
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
        markup: markupPercentage,
        includeBreakdown: true,
      });

      const result = response.data;
      toast.dismiss();

      setVariantPriceCalculationResults(prev => ({ ...prev, [variantId]: result }));

      const subtotal = result?.totalCost || 0;
      const perPersonRates = result?.perPersonRates;
      const baseItems =
        (variantPricingItems[variantId] || []).length > 0
          ? variantPricingItems[variantId]
          : cloneDefaultPricingSection();
      const pricingItems = perPersonRates?.rates
        ? applyPerPersonRatesToPricingItems(baseItems, perPersonRates, {
            numChild5to12,
            numChild0to5,
          })
        : baseItems;

      const currentPricingData = form.getValues('variantPricingData') || {};
      finalizeVariantSubtotal(variantId, subtotal, {
        ...(currentPricingData[variantId] || {}),
        calculationMethod: 'autoHotelTransport',
        ...result,
        components: pricingItems,
        perPersonRates: perPersonRates ?? undefined,
        calculatedAt: result.calculatedAt || new Date().toISOString(),
      });

      setVariantPricingItems(prev => ({ ...prev, [variantId]: pricingItems }));

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
    setVariantDiscountTypes(prev => ({ ...prev, [variantId]: 'percent' }));
    setVariantDiscountValues(prev => ({ ...prev, [variantId]: '' }));
    setVariantDiscountReasons(prev => ({ ...prev, [variantId]: '' }));

    const currentPricingData = form.getValues('variantPricingData') || {};
    const existingData = currentPricingData[variantId] || {};
    const restoredComponents = Array.isArray(existingData.componentsBeforeDiscount)
      ? clonePricingComponents(existingData.componentsBeforeDiscount as PricingComponentItem[])
      : null;
    const {
      appliedDiscount: _a,
      subtotalBeforeDiscount: _s,
      componentsBeforeDiscount: _c,
      ...rest
    } = existingData;
    form.setValue(
      'variantPricingData',
      {
        ...currentPricingData,
        [variantId]: {
          ...rest,
          ...(restoredComponents ? { components: restoredComponents } : {}),
        },
      },
      { shouldDirty: true }
    );

    if (restoredComponents) {
      setVariantPricingItems((prev) => ({ ...prev, [variantId]: restoredComponents }));
    }

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
      queryParams.append('startDate', new Date(queryStartDate as Date).toISOString());
      queryParams.append('endDate', new Date(queryEndDate as Date).toISOString());

      const requestUrl = `/api/tourPackages/${baseTourPackageId}/pricing?${queryParams.toString()}`;
      const response = await axios.get(requestUrl);
      const tourPackagePricings = response.data;
      toast.dismiss();

      if (!tourPackagePricings || tourPackagePricings.length === 0) {
        toast.error("No active pricing periods were found for this variant. Check the package pricing setup.");
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
        toast.error(`No pricing matched ${getPricingCriteriaLabel(mealPlanId, roomCount)}.`);
        return;
      }

      if (matchedPricings.length > 1) {
        toast.error(`Multiple pricing periods matched ${getPricingCriteriaLabel(mealPlanId, roomCount)}. Narrow the dates or pricing setup.`);
        return;
      }

      const selectedPricing = matchedPricings[0];
      const finalComponents: { name: string; price: string; description: string }[] = [];
      let taxableSubtotal = 0;

      if (selectedPricing.pricingComponents && selectedPricing.pricingComponents.length > 0) {
        selectedPricing.pricingComponents.forEach((comp: any) => {
          const componentName = comp.pricingAttribute?.name || 'Pricing Component';
          const basePrice = parseFloat(comp.price || '0');
          const occupancyMultiplier = getOccupancyMultiplier(componentName);
          const totalComponentPrice = basePrice * occupancyMultiplier * roomCount;
          const isAirFare = isAirFarePricingLabel(componentName);

          finalComponents.push({
            name: componentName,
            price: (isAirFare ? totalComponentPrice : basePrice).toString(),
            description: `${basePrice.toFixed(2)} x ${occupancyMultiplier} occupancy x ${roomCount} room${roomCount > 1 ? 's' : ''} = INR ${totalComponentPrice.toFixed(2)}`
          });

          if (!isAirFare) {
            taxableSubtotal += totalComponentPrice;
          }
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
      finalizeVariantSubtotal(variantId, taxableSubtotal, {
        ...(currentPricingData[variantId] || {}),
        calculationMethod: 'useTourPackagePricing',
        components: finalComponents,
        calculatedAt: new Date().toISOString(),
      });

      setVariantPricingItems(prev => ({ ...prev, [variantId]: finalComponents }));

      toast.success("Tour package pricing applied successfully!");
    } catch (error) {
      toast.dismiss();
      console.error("Error fetching/applying tour package pricing:", error);
      toast.error("Failed to fetch or apply tour package pricing.");
    }
  };

  const getVariantDiscountInput = (variantId: string) => ({
    type: variantDiscountTypes[variantId] || "percent" as VariantDiscountType,
    inputValue: parseFloat(variantDiscountValues[variantId] || "0") || 0,
    reason: variantDiscountReasons[variantId]?.trim() || undefined,
  });

  const resolveUndiscountedComponents = (
    variantId: string,
    baseEntry: Record<string, unknown>,
    existingData: Record<string, unknown>
  ): PricingComponentItem[] => {
    if (Array.isArray(baseEntry.components) && baseEntry.components.length > 0) {
      return clonePricingComponents(baseEntry.components as PricingComponentItem[]);
    }
    if (
      Array.isArray(existingData.componentsBeforeDiscount) &&
      existingData.componentsBeforeDiscount.length > 0
    ) {
      return clonePricingComponents(
        existingData.componentsBeforeDiscount as PricingComponentItem[]
      );
    }
    const stateItems = variantPricingItems[variantId];
    if (stateItems?.length) {
      return clonePricingComponents(stateItems);
    }
    if (Array.isArray(existingData.components) && existingData.components.length > 0) {
      return clonePricingComponents(existingData.components as PricingComponentItem[]);
    }
    return [];
  };

  const resolveAirFareFromEntry = (
    variantId: string,
    baseEntry: Record<string, unknown>,
    existingData: Record<string, unknown>
  ): number => {
    const components = resolveUndiscountedComponents(variantId, baseEntry, existingData);
    if (components.length > 0) {
      return sumAirFareAmount(components);
    }
    if (Array.isArray(baseEntry.components)) {
      return sumAirFareAmount(baseEntry.components as PricingComponentItem[]);
    }
    return sumAirFareAmount(
      (existingData.components as PricingComponentItem[] | undefined) ?? []
    );
  };

  /**
   * @param taxableSubtotal Package total excluding Air Fare (discount/GST base).
   * Air Fare from breakdown rows is added back into stored totalCost.
   */
  const buildVariantPricingWithDiscount = (
    variantId: string,
    taxableSubtotal: number,
    baseEntry: Record<string, unknown>
  ) => {
    const discountInput = getVariantDiscountInput(variantId);
    const existingData = (form.getValues("variantPricingData") || {})[variantId] || {};
    const airFareAmount = resolveAirFareFromEntry(variantId, baseEntry, existingData);
    const safeTaxable = Math.max(0, Math.round(taxableSubtotal));
    const shouldApply =
      discountInput.inputValue > 0 ||
      hasAppliedVariantDiscount(existingData.appliedDiscount);

    if (!shouldApply) {
      const {
        appliedDiscount: _removed,
        subtotalBeforeDiscount: _sub,
        componentsBeforeDiscount: _cbd,
        ...rest
      } = baseEntry as Record<string, unknown>;
      return {
        ...rest,
        totalCost: safeTaxable + airFareAmount,
      };
    }

    const effectiveInput =
      discountInput.inputValue > 0
        ? discountInput
        : existingData.appliedDiscount
          ? {
              type: existingData.appliedDiscount.type as VariantDiscountType,
              inputValue: Number(existingData.appliedDiscount.inputValue) || 0,
              reason: existingData.appliedDiscount.reason as string | undefined,
            }
          : discountInput;

    const result = computeVariantDiscountWithAirFare(
      safeTaxable,
      airFareAmount,
      effectiveInput
    );
    const nextEntry: Record<string, unknown> = {
      ...baseEntry,
      subtotalBeforeDiscount: result.subtotalBeforeDiscount,
      totalCost: result.totalCost,
    };

    if (result.appliedDiscount) {
      nextEntry.appliedDiscount = result.appliedDiscount;
    } else {
      delete nextEntry.appliedDiscount;
      delete nextEntry.subtotalBeforeDiscount;
      delete nextEntry.componentsBeforeDiscount;
    }

    if (result.appliedDiscount?.type === "percent") {
      const sourceComponents = resolveUndiscountedComponents(
        variantId,
        baseEntry,
        existingData
      );
      if (sourceComponents.length > 0) {
        const snapshot = clonePricingComponents(sourceComponents);
        nextEntry.componentsBeforeDiscount = snapshot;
        nextEntry.components = applyPercentDiscountToPricingComponents(
          snapshot,
          result.appliedDiscount.inputValue
        );
      }
    } else if (result.appliedDiscount?.type === "fixed") {
      if (Array.isArray(existingData.componentsBeforeDiscount)) {
        nextEntry.components = clonePricingComponents(
          existingData.componentsBeforeDiscount as PricingComponentItem[]
        );
        delete nextEntry.componentsBeforeDiscount;
      }
    }

    return nextEntry;
  };

  const persistVariantPricingEntry = (
    variantId: string,
    entry: Record<string, unknown>
  ) => {
    const currentPricingData = form.getValues("variantPricingData") || {};
    form.setValue(
      "variantPricingData",
      {
        ...currentPricingData,
        [variantId]: entry,
      },
      { shouldDirty: true }
    );
    const totalCost = typeof entry.totalCost === "number" ? entry.totalCost : 0;
    setVariantTotalPrices((prev) => ({ ...prev, [variantId]: totalCost.toString() }));
    if (Array.isArray(entry.components)) {
      setVariantPricingItems((prev) => ({
        ...prev,
        [variantId]: entry.components as PricingComponentItem[],
      }));
    }
  };

  const clearStructuredDiscount = (variantId: string, showToast = false) => {
    const currentPricingData = form.getValues("variantPricingData") || {};
    const existingData = currentPricingData[variantId] || {};
    const hadDiscount = hasAppliedVariantDiscount(existingData.appliedDiscount);
    const restoredComponents = Array.isArray(existingData.componentsBeforeDiscount)
      ? clonePricingComponents(existingData.componentsBeforeDiscount as PricingComponentItem[])
      : null;
    const restoredTotal =
      typeof existingData.subtotalBeforeDiscount === "number"
        ? existingData.subtotalBeforeDiscount
        : typeof existingData.totalCost === "number"
          ? existingData.totalCost
          : null;

    setVariantDiscountValues((prev) => ({ ...prev, [variantId]: "" }));
    setVariantDiscountReasons((prev) => ({ ...prev, [variantId]: "" }));

    const {
      appliedDiscount: _a,
      subtotalBeforeDiscount: _s,
      componentsBeforeDiscount: _c,
      ...rest
    } = existingData;
    const nextEntry: Record<string, unknown> = {
      ...rest,
      ...(restoredComponents ? { components: restoredComponents } : {}),
      ...(restoredTotal != null ? { totalCost: restoredTotal } : {}),
    };

    form.setValue(
      "variantPricingData",
      {
        ...currentPricingData,
        [variantId]: nextEntry,
      },
      { shouldDirty: true }
    );

    if (restoredComponents) {
      setVariantPricingItems((prev) => ({ ...prev, [variantId]: restoredComponents }));
    }
    if (restoredTotal != null) {
      setVariantTotalPrices((prev) => ({ ...prev, [variantId]: restoredTotal.toString() }));
    }

    if (showToast && hadDiscount) {
      toast("Structured discount cleared because the final amount was edited manually.", {
        icon: "ℹ️",
      });
    }
  };

  const clearDiscountOnBreakdownEdit = (variantId: string) => {
    const currentPricingData = form.getValues("variantPricingData") || {};
    const existingData = currentPricingData[variantId] || {};
    if (
      !hasAppliedVariantDiscount(existingData.appliedDiscount) ||
      existingData.appliedDiscount?.type !== "percent"
    ) {
      return;
    }

    setVariantDiscountValues((prev) => ({ ...prev, [variantId]: "" }));
    setVariantDiscountReasons((prev) => ({ ...prev, [variantId]: "" }));

    const restoredTotal =
      typeof existingData.subtotalBeforeDiscount === "number"
        ? existingData.subtotalBeforeDiscount
        : typeof existingData.totalCost === "number"
          ? existingData.totalCost
          : 0;

    const stateItems = variantPricingItems[variantId];
    const {
      appliedDiscount: _a,
      subtotalBeforeDiscount: _s,
      componentsBeforeDiscount: _c,
      ...rest
    } = existingData;

    form.setValue(
      "variantPricingData",
      {
        ...currentPricingData,
        [variantId]: {
          ...rest,
          ...(stateItems !== undefined ? { components: stateItems } : {}),
          totalCost: restoredTotal,
          updatedAt: new Date().toISOString(),
        },
      },
      { shouldDirty: true }
    );

    setVariantTotalPrices((prev) => ({ ...prev, [variantId]: restoredTotal.toString() }));
    toast("Discount cleared because pricing breakdown was edited.", { icon: "ℹ️" });
  };

  const handleApplyVariantDiscount = (variantId: string, subtotalOverride?: number) => {
    const currentPricingData = form.getValues("variantPricingData") || {};
    const existingData = currentPricingData[variantId] || {};
    const calcResult = variantPriceCalculationResults[variantId];
    const components = resolveUndiscountedComponents(variantId, existingData, existingData);
    const airFareAmount = sumAirFareAmount(components);

    let taxableSubtotal =
      subtotalOverride ??
      (typeof existingData.subtotalBeforeDiscount === "number"
        ? existingData.subtotalBeforeDiscount
        : (calcResult?.totalCost ?? null));

    if (taxableSubtotal == null) {
      const storedTotal = Number.isFinite(parseFloat(variantTotalPrices[variantId] || "0"))
        ? parseFloat(variantTotalPrices[variantId] || "0")
        : typeof existingData.totalCost === "number"
          ? existingData.totalCost
          : 0;
      taxableSubtotal = Math.max(0, Math.round(storedTotal) - airFareAmount);
    }

    if (taxableSubtotal <= 0 && airFareAmount <= 0) {
      toast.error("Calculate or enter pricing before applying a discount.");
      return;
    }

    const discountInput = getVariantDiscountInput(variantId);
    if (discountInput.inputValue <= 0) {
      toast.error("Enter a discount percentage or fixed amount.");
      return;
    }

    const nextEntry = buildVariantPricingWithDiscount(variantId, taxableSubtotal, {
      ...existingData,
      ...(components.length > 0 ? { components } : {}),
      subtotalBeforeDiscount: taxableSubtotal,
    });

    persistVariantPricingEntry(variantId, nextEntry);
    toast.success("Discount applied.");
  };

  const finalizeVariantSubtotal = (
    variantId: string,
    taxableSubtotal: number,
    baseEntry: Record<string, unknown>
  ) => {
    const nextEntry = buildVariantPricingWithDiscount(variantId, taxableSubtotal, {
      ...baseEntry,
      subtotalBeforeDiscount: taxableSubtotal,
    });
    persistVariantPricingEntry(variantId, nextEntry);
    return nextEntry;
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
    const newItems = (variantPricingItems[variantId] || []).filter((_, i) => i !== index);
    setVariantPricingItems(prev => ({ ...prev, [variantId]: newItems }));
    // Sync directly with computed newItems to avoid stale closure issues from setTimeout
    const currentPricingData = form.getValues('variantPricingData') || {};
    const existingData = currentPricingData[variantId] || {};
    form.setValue('variantPricingData', {
      ...currentPricingData,
      [variantId]: { ...existingData, components: newItems, updatedAt: new Date().toISOString() }
    }, { shouldDirty: true });
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
    }, { shouldDirty: true });
  };

  const syncVariantPricingBreakdown = (variantId: string) => {
    clearDiscountOnBreakdownEdit(variantId);
    syncVariantPricingToForm(variantId);
  };

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
        customRoomType: '',
        extraBeds: []
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

  // Atomic multi-field update for room allocation - prevents double-call stale state issues
  const updateRoomAllocationFields = (variantId: string, itineraryId: string, allocationIndex: number, updates: Record<string, any>) => {
    try {
      const current = variantRoomAllocations || {};
      const variantData = current[variantId] || {};
      const itineraryAllocations = variantData[itineraryId] || [];

      const updatedAllocations = itineraryAllocations.map((allocation: any, i: number) =>
        i === allocationIndex ? { ...allocation, ...updates } : allocation
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

  const copyFirstDayRoomsAndTransportToAllDays = (variantId: string, sourceItineraries = itineraries) => {
    try {
      if (!sourceItineraries || sourceItineraries.length === 0) {
        toast.error('No itineraries available');
        return;
      }

      const copyResult = copyFirstDayRoomsAndTransportForVariant({
        variantId,
        itineraries: sourceItineraries,
        variantRoomAllocations,
        variantTransportDetails,
      });

      if (!copyResult) {
        toast.error('No itineraries available');
        return;
      }

      if (copyResult.firstDayRooms.length === 0 && copyResult.firstDayTransports.length === 0) {
        toast.error('No room allocations or transport on first day to copy');
        return;
      }

      form.setValue('variantRoomAllocations', copyResult.variantRoomAllocations, {
        shouldValidate: false,
        shouldDirty: true,
      });

      form.setValue('variantTransportDetails', copyResult.variantTransportDetails, {
        shouldValidate: false,
        shouldDirty: true,
      });

      toast.success(`Copied room allocations and transport to all ${copyResult.copiedDayCount} days`);
    } catch (error) {
      console.error('Error copying room and transport details to all days:', error);
      toast.error('Failed to copy. Please try again.');
    }
  };

  const copyFirstDayHotelToAllDays = (
    variantId: string,
    variant: { id: string; variantHotelMappings?: any[] },
    sourceItineraries = itineraries
  ) => {
    try {
      if (!sourceItineraries || sourceItineraries.length === 0) {
        toast.error('No itineraries available');
        return;
      }

      const firstItinerary = sourceItineraries[0];
      const firstDayHotelId = resolveVariantHotelId(variant, firstItinerary, 0);

      if (!firstDayHotelId) {
        toast.error('No hotel on first day to copy');
        return;
      }

      const copyResult = copyFirstDayHotelForVariant({
        variantId,
        itineraries: sourceItineraries,
        variantHotelOverrides,
        hotelId: firstDayHotelId,
      });

      if (!copyResult) {
        toast.error('No itineraries available');
        return;
      }

      form.setValue('variantHotelOverrides', copyResult.variantHotelOverrides, {
        shouldValidate: false,
        shouldDirty: true,
      });

      toast.success(`Copied Day 1 hotel to all ${copyResult.copiedDayCount} days`);
    } catch (error) {
      console.error('Error copying hotel to all days:', error);
      toast.error('Failed to copy. Please try again.');
    }
  };

  // Copy room allocations and transport details from one variant to another
  const copyRoomAllocationsFromVariant = (fromVariantId: string, toVariantId: string) => {
    try {
      const currentRooms = variantRoomAllocations || {};
      const fromRoomData = currentRooms[fromVariantId] || {};

      const currentTransport = variantTransportDetails || {};
      const fromTransportData = currentTransport[fromVariantId] || {};

      if (Object.keys(fromRoomData).length === 0 && Object.keys(fromTransportData).length === 0) {
        toast.error('No room or transport data to copy from selected variant');
        return;
      }

      // Deep copy the allocations to avoid reference issues
      const copiedRoomData = JSON.parse(JSON.stringify(fromRoomData));
      const copiedTransportData = JSON.parse(JSON.stringify(fromTransportData));

      form.setValue('variantRoomAllocations', {
        ...currentRooms,
        [toVariantId]: copiedRoomData
      }, { shouldValidate: false, shouldDirty: true });

      form.setValue('variantTransportDetails', {
        ...currentTransport,
        [toVariantId]: copiedTransportData
      }, { shouldValidate: false, shouldDirty: true });

      toast.success('Room and transport details copied successfully');
    } catch (error) {
      console.error('Error copying details from variant:', error);
      toast.error('Failed to copy data. Please try again.');
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

  const getVariantHotelMapping = (variant: { variantHotelMappings?: any[] }, itinerary: any, index: number) => {
    const dayNum = itinerary.dayNumber || index + 1;
    return variant.variantHotelMappings?.find((mapping: any) => mapping.itineraryId === itinerary.id)
      || variant.variantHotelMappings?.find((mapping: any) => (mapping.itinerary?.dayNumber ?? 0) === dayNum);
  };

  const resolveVariantHotelId = (variant: { id: string; variantHotelMappings?: any[] }, itinerary: any, index: number) => {
    const overrideHotelId = variantHotelOverrides?.[variant.id]?.[itinerary.id];
    if (overrideHotelId !== undefined) {
      return overrideHotelId;
    }

    const mapping = getVariantHotelMapping(variant, itinerary, index);
    return mapping?.hotelId || '';
  };

  const resolveVariantHotel = (variant: { id: string; variantHotelMappings?: any[] }, itinerary: any, index: number) => {
    const hotelId = resolveVariantHotelId(variant, itinerary, index);
    const mapping = getVariantHotelMapping(variant, itinerary, index);
    return hotels.find((hotel) => hotel.id === hotelId) || mapping?.hotel || null;
  };

  const setVariantHotelOverride = (variantId: string, itineraryId: string, hotelId: string) => {
    const currentOverrides = variantHotelOverrides || {};
    const variantOverrides = currentOverrides[variantId] || {};

    form.setValue('variantHotelOverrides', {
      ...currentOverrides,
      [variantId]: {
        ...variantOverrides,
        [itineraryId]: hotelId
      }
    }, { shouldDirty: true });
  };

  const handleAddHotel = async () => {
    const name = newHotelName.trim();
    const locationId =
      addHotelTarget?.locationId ||
      selectedTourPackage?.locationId ||
      "";
    if (!name) {
      toast.error("Hotel name is required.");
      return;
    }
    if (!locationId) {
      toast.error("A location is required to create a hotel.");
      return;
    }
    setSavingHotel(true);
    try {
      const res = await axios.post("/api/hotels", {
        name,
        locationId,
        images: [{ url: "https://admin.aagamholidays.com/aagamholidays.png" }],
      });
      const created = res.data as Hotel & { images: Images[] };
      setCreatedHotels((prev) => [created, ...prev.filter((h) => h.id !== created.id)]);
      if (addHotelTarget) {
        setVariantHotelOverride(
          addHotelTarget.variantId,
          addHotelTarget.itineraryId,
          created.id
        );
      }
      setAddHotelOpen(false);
      setNewHotelName("");
      setAddHotelTarget(null);
      toast.success("Hotel created.");
    } catch (error: any) {
      toast.error(error?.response?.data || "Could not create hotel.");
    } finally {
      setSavingHotel(false);
    }
  };


  return (
    <div className="space-y-5">
      <Dialog open={addHotelOpen} onOpenChange={setAddHotelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Hotel</DialogTitle>
            <DialogDescription>
              Creates a hotel and selects it as the variant override for this day.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Label htmlFor="query-variant-hotel-name">Hotel name</Label>
            <Input
              id="query-variant-hotel-name"
              placeholder="Hotel name"
              value={newHotelName}
              onChange={(e) => setNewHotelName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleAddHotel();
                }
              }}
              disabled={savingHotel}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddHotelOpen(false)}
              disabled={savingHotel}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleAddHotel()}
              disabled={savingHotel || !newHotelName.trim()}
            >
              {savingHotel ? "Adding..." : "Add Hotel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Card className="shadow-sm border border-slate-200/70 bg-gradient-to-r from-white to-slate-50">
        <CardHeader className="pb-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" /> Package Variants
            </CardTitle>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="h-3.5 w-3.5 text-primary" />
              Variants from <strong className="font-semibold">{selectedTourPackage?.tourPackageName || 'this query'}</strong>
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant="outline" className="bg-white/60 backdrop-blur text-xs font-medium">
              Package: {selectedVariants.length}
            </Badge>
            {(customQueryVariants as any[] || []).length > 0 && (
              <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-300 text-xs">
                Custom: {(customQueryVariants as any[] || []).length}
              </Badge>
            )}
            {selectedVariants.some(v => v.isDefault) && (
              <Badge variant="default" className="text-xs bg-gradient-to-r from-primary to-primary/80">
                Has Default
              </Badge>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={loading}
              onClick={() => {
                const newVariant = { id: crypto.randomUUID(), name: 'New Custom Variant', description: '' };
                const current = (customQueryVariants || []) as any[];
                form.setValue('customQueryVariants', [...current, newVariant], { shouldDirty: true });
              }}
              className="border-violet-300 text-violet-700 hover:bg-violet-50 h-8 text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Custom Variant
            </Button>
          </div>
        </CardHeader>
      </Card>

      {!selectedTourPackageId ? (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Select a tour package from the <strong>Basic Info</strong> tab to use saved package variants. Custom variants remain available below.
          </AlertDescription>
        </Alert>
      ) : selectedVariants.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No package variants are selected right now. Choose them in <strong>Basic Info</strong> or continue with custom variants below.
          </AlertDescription>
        </Alert>
      ) : null}

      {/* --- Custom Query Variants (shown before package variants) --- */}
      {(customQueryVariants as any[] || []).map((cVariant: any) => {
        const isConfirmed = confirmedVariantId === cVariant.id;
        const pricingItems = variantPricingItems[cVariant.id] || [];
        const totalPrice = variantTotalPrices[cVariant.id] || '';
        const remarks = variantRemarks[cVariant.id] || '';
        return (
          <Card key={cVariant.id} className={`shadow-sm border bg-gradient-to-br from-white to-violet-50/30 ${isConfirmed ? 'border-green-500 ring-1 ring-green-400' : 'border-violet-200/60'}`}>
            {/* Header */}
            <CardHeader className="pb-3 border-b bg-gradient-to-r from-violet-50 via-violet-25 to-transparent">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Package className="h-4 w-4 text-violet-500 flex-shrink-0" />
                  <Input
                    value={cVariant.name}
                    disabled={loading}
                    placeholder="Variant name..."
                    className="h-8 text-sm font-semibold border-violet-200 bg-white max-w-xs"
                    onChange={(e) => {
                      const updated = (customQueryVariants as any[]).map((v: any) =>
                        v.id === cVariant.id ? { ...v, name: e.target.value } : v
                      );
                      form.setValue('customQueryVariants', updated, { shouldDirty: true });
                    }}
                  />
                  {isConfirmed && (
                    <Badge className="text-xs bg-green-600 text-white">Query confirmed</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={isConfirmed ? 'default' : 'outline'}
                    disabled={loading}
                    onClick={() => form.setValue('confirmedVariantId', isConfirmed ? null : cVariant.id, { shouldDirty: true })}
                    className={isConfirmed ? 'bg-green-600 hover:bg-green-700 text-white h-8 text-xs' : 'border-green-500 text-green-700 hover:bg-green-50 h-8 text-xs'}
                  >
                    {isConfirmed ? <><Check className="h-3 w-3 mr-1" /> Query confirmed</> : <><Trophy className="h-3 w-3 mr-1" /> Confirm query</>}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={loading}
                    onClick={() => {
                      const updated = (customQueryVariants as any[]).filter((v: any) => v.id !== cVariant.id);
                      form.setValue('customQueryVariants', updated, { shouldDirty: true });
                      if (isConfirmed) form.setValue('confirmedVariantId', null, { shouldDirty: true });
                    }}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                  >
                    <Trash className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <Input
                value={cVariant.description || ''}
                disabled={loading}
                placeholder="Description (optional)..."
                className="h-7 text-xs border-violet-100 bg-white/60 mt-2"
                onChange={(e) => {
                  const updated = (customQueryVariants as any[]).map((v: any) =>
                    v.id === cVariant.id ? { ...v, description: e.target.value } : v
                  );
                  form.setValue('customQueryVariants', updated, { shouldDirty: true });
                }}
              />
              {isConfirmed && (
                <p className="mt-2 text-[11px] text-green-700">
                  Confirming this variant also confirms the parent tour package query.
                </p>
              )}
            </CardHeader>

            <CardContent className="pt-4">
              <Tabs defaultValue="hotels" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-muted p-1">
                  <TabsTrigger value="hotels" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs">
                    <HotelIcon className="h-3.5 w-3.5 mr-1.5" />
                    Hotels
                  </TabsTrigger>
                  <TabsTrigger value="rooms" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs">
                    <BedDouble className="h-3.5 w-3.5 mr-1.5" />
                    Room Allocation
                  </TabsTrigger>
                  <TabsTrigger value="pricing" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs">
                    <Calculator className="h-3.5 w-3.5 mr-1.5" />
                    Pricing
                  </TabsTrigger>
                </TabsList>

                {/* Hotels Tab for Custom Variant */}
                <TabsContent value="hotels" className="mt-4">
                  <Card className="shadow-sm border border-slate-200/70">
                    <CardHeader className="pb-3 border-b bg-gradient-to-r from-blue-50 via-blue-100 to-transparent">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <CardTitle className="text-sm flex items-center gap-2 font-semibold">
                          <HotelIcon className="h-4 w-4 text-blue-600" />
                          Hotel Selection per Day
                        </CardTitle>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            copyFirstDayHotelToAllDays(cVariant.id, cVariant, queryItineraries || [])
                          }
                          className="h-8 text-xs border-blue-300 hover:bg-blue-50"
                          disabled={loading || !queryItineraries || queryItineraries.length === 0}
                        >
                          <Copy className="h-3.5 w-3.5 mr-1.5" />
                          Copy Day 1 Hotel
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      {(!queryItineraries || queryItineraries.length === 0) ? (
                        <div className="text-center py-6 text-sm text-muted-foreground">
                          <HotelIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                          No itineraries configured. Add itineraries in the Itinerary tab first.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {queryItineraries.map((itinerary: any, idx: number) => {
                            const selectedHotelId = resolveVariantHotelId(cVariant, itinerary, idx);
                            const selectedHotel = resolveVariantHotel(cVariant, itinerary, idx);
                            const hotelList = getHotelOptions(itinerary.locationId);
                            return (
                              <div key={itinerary.id} className="flex items-start gap-3 p-3 border border-slate-200 rounded-md bg-white">
                                <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold bg-gradient-to-br from-blue-500 to-blue-600 text-white flex-shrink-0 mt-1">
                                  {itinerary.dayNumber || idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div
                                    className="text-xs font-medium text-slate-700 mb-1.5 truncate"
                                    dangerouslySetInnerHTML={{ __html: itinerary.itineraryTitle || `Day ${itinerary.dayNumber || idx + 1}` }}
                                  />
                                  <Select
                                    value={selectedHotelId || 'none'}
                                    onValueChange={(value) => setVariantHotelOverride(cVariant.id, itinerary.id, value === 'none' ? '' : value)}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue placeholder="Select hotel..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none" className="text-xs text-muted-foreground">-- No hotel selected --</SelectItem>
                                      {hotelList.map((hotel) => (
                                        <SelectItem key={hotel.id} value={hotel.id} className="text-xs">
                                          {hotel.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-0 text-[10px] text-primary"
                                    onClick={() => {
                                      setAddHotelTarget({
                                        variantId: cVariant.id,
                                        itineraryId: itinerary.id,
                                        locationId:
                                          itinerary.locationId ||
                                          selectedTourPackage?.locationId ||
                                          "",
                                      });
                                      setNewHotelName("");
                                      setAddHotelOpen(true);
                                    }}
                                  >
                                    <PlusCircle className="mr-1 h-3 w-3" />
                                    Add new hotel
                                  </Button>
                                  {selectedHotel && (
                                    <p className="text-[10px] text-blue-600 mt-1 flex items-center gap-1">
                                      <HotelIcon className="h-2.5 w-2.5" /> {selectedHotel.name}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Room Allocation Tab for Custom Variant */}
                {/* Room Allocation Tab for Custom Variant */}
                <TabsContent value="rooms" className="mt-4">
                  {!queryItineraries || queryItineraries.length === 0 ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>No itineraries found. Add itineraries to the query first.</AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-3">
                      <Card className="shadow-sm border border-violet-200/60 bg-gradient-to-r from-violet-50/40 to-transparent">
                        <CardContent className="pt-4 pb-3">
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                copyFirstDayRoomsAndTransportToAllDays(
                                  cVariant.id,
                                  queryItineraries || []
                                )
                              }
                              className="h-9 text-xs border-violet-300 hover:bg-violet-50 text-violet-700"
                              disabled={loading || !queryItineraries || queryItineraries.length === 0}
                            >
                              <Copy className="h-3.5 w-3.5 mr-1.5" />
                              Copy Day 1 Rooms + Transport
                            </Button>

                            <div className="flex gap-2 flex-1">
                              <Select
                                value={copyFromVariantId[cVariant.id] || ""}
                                onValueChange={(value) => setCopyFromVariantId({ ...copyFromVariantId, [cVariant.id]: value })}
                              >
                                <SelectTrigger className="h-9 text-xs flex-1 border-violet-300">
                                  <SelectValue placeholder="Select variant to copy from..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {getCopySourceVariants(cVariant.id).map((source) => (
                                    <SelectItem key={source.id} value={source.id} className="text-xs">
                                      {source.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const fromId = copyFromVariantId[cVariant.id];
                                  if (fromId) {
                                    copyRoomAllocationsFromVariant(fromId, cVariant.id);
                                  } else {
                                    toast.error('Please select a variant to copy from');
                                  }
                                }}
                                className="h-9 text-xs border-violet-300 hover:bg-violet-50 text-violet-700"
                                disabled={loading || !copyFromVariantId[cVariant.id]}
                              >
                                <Copy className="h-3.5 w-3.5 mr-1.5" />
                                Copy Details
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Accordion type="multiple" className="space-y-3">
                      {queryItineraries.map((itinerary: any, idx: number) => {
                        const variantRooms = variantRoomAllocations?.[cVariant.id]?.[itinerary.id] || [];
                        const variantTransports = variantTransportDetails?.[cVariant.id]?.[itinerary.id] || [];
                        return (
                          <AccordionItem
                            key={itinerary.id}
                            value={itinerary.id}
                            className="border rounded-md shadow-sm bg-white"
                          >
                            <AccordionTrigger className="px-4 py-3 hover:no-underline">
                              <div className="flex items-center gap-3 flex-1">
                                <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold bg-gradient-to-br from-violet-500 to-violet-600 text-white">
                                  {itinerary.dayNumber || idx + 1}
                                </div>
                                <div className="text-left">
                                  <div className="font-medium text-sm" dangerouslySetInnerHTML={{ __html: itinerary.itineraryTitle || `Day ${itinerary.dayNumber || idx + 1}` }} />
                                  <div className="text-xs text-muted-foreground">{variantRooms.length} room(s), {variantTransports.length} transport(s)</div>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4 space-y-3">
                              <div className="space-y-2">
                                {variantRooms.map((room: any, roomIdx: number) => (
                                  <Card key={roomIdx} className="border-violet-200/60 bg-violet-50/20">
                                    <CardContent className="pt-3 pb-3 space-y-2">
                                      {/* Custom Room Type Toggle */}
                                      <label className="flex items-center gap-1.5 text-[10px] text-slate-500 cursor-pointer select-none">
                                        <Checkbox
                                          checked={!!room.useCustomRoomType}
                                          onCheckedChange={(checked) => {
                                            updateRoomAllocationFields(cVariant.id, itinerary.id, roomIdx, {
                                              useCustomRoomType: !!checked,
                                              ...(!checked ? { customRoomType: '' } : {})
                                            });
                                          }}
                                          className="h-3 w-3"
                                        />
                                        Custom Room Type
                                      </label>

                                      {/* Row 1: Room Type | Occupancy | Qty */}
                                      <div className="grid grid-cols-3 gap-2">
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-medium text-slate-600">Room Type</label>
                                          {room.useCustomRoomType ? (
                                            <Input value={room.customRoomType || ''} onChange={(e) => updateRoomAllocation(cVariant.id, itinerary.id, roomIdx, 'customRoomType', e.target.value)} placeholder="Custom room type..." className="h-8 text-xs" />
                                          ) : (
                                            <Popover open={openRoomTypeKey === `c-${cVariant.id}-${itinerary.id}-${roomIdx}`} onOpenChange={(o) => setOpenRoomTypeKey(o ? `c-${cVariant.id}-${itinerary.id}-${roomIdx}` : null)}>
                                              <PopoverTrigger asChild>
                                                <Button type="button" variant="outline" size="sm" className="w-full justify-between h-8 text-xs font-normal">
                                                  <span className="truncate">{roomTypes.find((rt: any) => rt.id === room.roomTypeId)?.name || 'Room type'}</span>
                                                  <ChevronsUpDown className="h-3 w-3 opacity-50 shrink-0" />
                                                </Button>
                                              </PopoverTrigger>
                                              <PopoverContent className="w-[200px] p-0" align="start">
                                                <Command onKeyDownCapture={e => e.stopPropagation()}>
                                                  <CommandInput placeholder="Search room type..." className="text-xs h-8" />
                                                  <CommandList className="max-h-48 overflow-auto">
                                                    <CommandEmpty className="text-xs py-2 text-center">No room type found.</CommandEmpty>
                                                    <CommandGroup>
                                                      {roomTypes.map((rt: any) => (
                                                        <CommandItem key={rt.id} value={rt.name} onSelect={() => { updateRoomAllocation(cVariant.id, itinerary.id, roomIdx, 'roomTypeId', rt.id); setOpenRoomTypeKey(null); }} className="text-xs">
                                                          <span className="flex-1 truncate">{rt.name}</span>
                                                          {room.roomTypeId === rt.id && <Check className="h-3.5 w-3.5 text-primary ml-auto" />}
                                                        </CommandItem>
                                                      ))}
                                                    </CommandGroup>
                                                  </CommandList>
                                                </Command>
                                              </PopoverContent>
                                            </Popover>
                                          )}
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-medium text-slate-600">Occupancy</label>
                                          <Select value={room.occupancyTypeId} onValueChange={(v) => updateRoomAllocation(cVariant.id, itinerary.id, roomIdx, 'occupancyTypeId', v)}>
                                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Occupancy" /></SelectTrigger>
                                            <SelectContent>{occupancyTypes.map((ot: any) => <SelectItem key={ot.id} value={ot.id} className="text-xs">{ot.name}</SelectItem>)}</SelectContent>
                                          </Select>
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-medium text-slate-600">Qty</label>
                                          <div className="flex items-center gap-1">
                                            <Button type="button" variant="outline" size="sm" className="h-8 w-7 p-0 text-xs" disabled={loading || (room.quantity || 1) <= 1} onClick={() => updateRoomAllocation(cVariant.id, itinerary.id, roomIdx, 'quantity', Math.max(1, (room.quantity || 1) - 1))}>−</Button>
                                            <Input type="number" min={1} value={room.quantity || 1} onChange={(e) => updateRoomAllocation(cVariant.id, itinerary.id, roomIdx, 'quantity', parseInt(e.target.value) || 1)} className="h-8 text-xs text-center w-10 px-1" />
                                            <Button type="button" variant="outline" size="sm" className="h-8 w-7 p-0 text-xs" disabled={loading} onClick={() => updateRoomAllocation(cVariant.id, itinerary.id, roomIdx, 'quantity', (room.quantity || 1) + 1)}>+</Button>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Additional Occupancies */}
                                      <div className="border border-amber-200 rounded-md p-2 bg-amber-50/30 space-y-1.5">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[10px] font-semibold text-amber-800">Additional Occupancies</span>
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={loading}
                                            onClick={() => {
                                              const current = variantRoomAllocations || {};
                                              const varData = current[cVariant.id] || {};
                                              const allocations = [...(varData[itinerary.id] || [])];
                                              const updatedRoom = { ...allocations[roomIdx], extraBeds: [...(allocations[roomIdx].extraBeds || []), { occupancyTypeId: '', quantity: 1 }] };
                                              allocations[roomIdx] = updatedRoom;
                                              form.setValue('variantRoomAllocations', { ...current, [cVariant.id]: { ...varData, [itinerary.id]: allocations } }, { shouldDirty: true });
                                            }}
                                            className="h-5 px-1.5 text-[9px] border-amber-300 hover:bg-amber-100 text-amber-800"
                                          >
                                            + Add Occupancy
                                          </Button>
                                        </div>
                                        {(room.extraBeds || []).length === 0 && (
                                          <p className="text-[10px] text-amber-700/70 italic">e.g. Child with Extra Bed, CNB, Extra Mattress…</p>
                                        )}
                                        {(room.extraBeds || []).map((eb: any, ebIdx: number) => (
                                          <div key={ebIdx} className="flex items-center gap-1.5">
                                            <Select
                                              value={eb.occupancyTypeId || ''}
                                              onValueChange={(v) => {
                                                const current = variantRoomAllocations || {};
                                                const varData = current[cVariant.id] || {};
                                                const allocations = [...(varData[itinerary.id] || [])];
                                                const updatedBeds = [...(allocations[roomIdx].extraBeds || [])];
                                                updatedBeds[ebIdx] = { ...updatedBeds[ebIdx], occupancyTypeId: v };
                                                allocations[roomIdx] = { ...allocations[roomIdx], extraBeds: updatedBeds };
                                                form.setValue('variantRoomAllocations', { ...current, [cVariant.id]: { ...varData, [itinerary.id]: allocations } }, { shouldDirty: true });
                                              }}
                                            >
                                              <SelectTrigger className="h-7 text-[10px] flex-1 border-amber-200 bg-white"><SelectValue placeholder="Select occupancy type" /></SelectTrigger>
                                              <SelectContent>{occupancyTypes.map((ot: any) => <SelectItem key={ot.id} value={ot.id} className="text-xs">{ot.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                            {/* Qty stepper for this extra occupancy */}
                                            <div className="flex items-center gap-0.5 shrink-0">
                                              <Button type="button" variant="outline" size="sm" className="h-7 w-6 p-0 text-xs border-amber-300" disabled={loading || (eb.quantity || 1) <= 1} onClick={() => {
                                                const current = variantRoomAllocations || {};
                                                const varData = current[cVariant.id] || {};
                                                const allocations = [...(varData[itinerary.id] || [])];
                                                const updatedBeds = [...(allocations[roomIdx].extraBeds || [])];
                                                updatedBeds[ebIdx] = { ...updatedBeds[ebIdx], quantity: Math.max(1, (eb.quantity || 1) - 1) };
                                                allocations[roomIdx] = { ...allocations[roomIdx], extraBeds: updatedBeds };
                                                form.setValue('variantRoomAllocations', { ...current, [cVariant.id]: { ...varData, [itinerary.id]: allocations } }, { shouldDirty: true });
                                              }}>−</Button>
                                              <Input type="number" min={1} value={eb.quantity || 1} onChange={(e) => {
                                                const current = variantRoomAllocations || {};
                                                const varData = current[cVariant.id] || {};
                                                const allocations = [...(varData[itinerary.id] || [])];
                                                const updatedBeds = [...(allocations[roomIdx].extraBeds || [])];
                                                updatedBeds[ebIdx] = { ...updatedBeds[ebIdx], quantity: parseInt(e.target.value) || 1 };
                                                allocations[roomIdx] = { ...allocations[roomIdx], extraBeds: updatedBeds };
                                                form.setValue('variantRoomAllocations', { ...current, [cVariant.id]: { ...varData, [itinerary.id]: allocations } }, { shouldDirty: true });
                                              }} className="h-7 text-[10px] text-center w-9 border-amber-200 px-0.5" />
                                              <Button type="button" variant="outline" size="sm" className="h-7 w-6 p-0 text-xs border-amber-300" disabled={loading} onClick={() => {
                                                const current = variantRoomAllocations || {};
                                                const varData = current[cVariant.id] || {};
                                                const allocations = [...(varData[itinerary.id] || [])];
                                                const updatedBeds = [...(allocations[roomIdx].extraBeds || [])];
                                                updatedBeds[ebIdx] = { ...updatedBeds[ebIdx], quantity: (eb.quantity || 1) + 1 };
                                                allocations[roomIdx] = { ...allocations[roomIdx], extraBeds: updatedBeds };
                                                form.setValue('variantRoomAllocations', { ...current, [cVariant.id]: { ...varData, [itinerary.id]: allocations } }, { shouldDirty: true });
                                              }}>+</Button>
                                            </div>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7 hover:text-red-600 shrink-0"
                                              onClick={() => {
                                                const current = variantRoomAllocations || {};
                                                const varData = current[cVariant.id] || {};
                                                const allocations = [...(varData[itinerary.id] || [])];
                                                const updatedBeds = (allocations[roomIdx].extraBeds || []).filter((_: any, i: number) => i !== ebIdx);
                                                allocations[roomIdx] = { ...allocations[roomIdx], extraBeds: updatedBeds };
                                                form.setValue('variantRoomAllocations', { ...current, [cVariant.id]: { ...varData, [itinerary.id]: allocations } }, { shouldDirty: true });
                                              }}
                                            >
                                              <Trash className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        ))}
                                      </div>

                                      {/* Meal Plan */}
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-medium text-slate-600">Meal Plan</label>
                                        <Select value={room.mealPlanId} onValueChange={(v) => updateRoomAllocation(cVariant.id, itinerary.id, roomIdx, 'mealPlanId', v)}>
                                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Meal plan" /></SelectTrigger>
                                          <SelectContent>{mealPlans.map((mp: any) => <SelectItem key={mp.id} value={mp.id} className="text-xs">{mp.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                      </div>

                                      {/* Guest Names */}
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-medium text-slate-600">Guest Names (optional)</label>
                                        <Input value={room.guestNames || ''} onChange={(e) => updateRoomAllocation(cVariant.id, itinerary.id, roomIdx, 'guestNames', e.target.value)} placeholder="e.g. John Smith, Jane Smith" className="h-8 text-xs" />
                                      </div>

                                      {/* Voucher Number */}
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-medium text-slate-600">Voucher Number (optional)</label>
                                        <Input value={room.voucherNumber || ''} onChange={(e) => updateRoomAllocation(cVariant.id, itinerary.id, roomIdx, 'voucherNumber', e.target.value)} placeholder="Hotel booking confirmation number" className="h-8 text-xs" />
                                      </div>

                                      <div className="flex justify-end">
                                        <Button type="button" variant="ghost" size="icon" onClick={() => {
                                          const current = variantRoomAllocations?.[cVariant.id]?.[itinerary.id] || [];
                                          const updated = current.filter((_: any, i: number) => i !== roomIdx);
                                          const alloc = { ...(variantRoomAllocations || {}) };
                                          alloc[cVariant.id] = { ...(alloc[cVariant.id] || {}), [itinerary.id]: updated };
                                          form.setValue('variantRoomAllocations', alloc, { shouldDirty: true });
                                        }} className="text-red-500 hover:text-red-700 h-7 w-7">
                                          <Trash className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                                <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => {
                                  const newRoom = { roomTypeId: '', occupancyTypeId: '', mealPlanId: '', quantity: 1, guestNames: '', voucherNumber: '', useCustomRoomType: false, customRoomType: '', extraBeds: [] };
                                  const current = variantRoomAllocations?.[cVariant.id]?.[itinerary.id] || [];
                                  const alloc = { ...(variantRoomAllocations || {}) };
                                  alloc[cVariant.id] = { ...(alloc[cVariant.id] || {}), [itinerary.id]: [...current, newRoom] };
                                  form.setValue('variantRoomAllocations', alloc, { shouldDirty: true });
                                }} className="h-8 text-xs border-violet-300 hover:bg-violet-50 text-violet-700">
                                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Room
                                </Button>
                              </div>

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
                                      onClick={() => addTransportDetail(cVariant.id, itinerary.id)}
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
                                            onClick={() => removeTransportDetail(cVariant.id, itinerary.id, transportIdx)}
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
                                              onValueChange={(value) => updateTransportDetail(cVariant.id, itinerary.id, transportIdx, 'vehicleTypeId', value)}
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
                                              onChange={(e) => updateTransportDetail(cVariant.id, itinerary.id, transportIdx, 'quantity', parseInt(e.target.value) || 1)}
                                              className="h-8 text-xs"
                                            />
                                          </div>
                                          <div className="space-y-1 col-span-2">
                                            <label className="text-[10px] font-medium text-slate-600">Description</label>
                                            <Input
                                              value={transport.description || ''}
                                              onChange={(e) => updateTransportDetail(cVariant.id, itinerary.id, transportIdx, 'description', e.target.value)}
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

                {/* Pricing Tab for Custom Variant */}
                <TabsContent value="pricing" className="mt-4 space-y-4">
                  <Card className="shadow-sm border border-slate-200/70">
                    <CardHeader className="pb-3 border-b bg-gradient-to-r from-violet-50 to-transparent">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <CardTitle className="text-sm flex items-center gap-2 font-semibold">
                          <IndianRupee className="h-4 w-4 text-violet-600" />
                          Pricing Breakdown
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={loading}
                            onClick={() => {
                              setVariantPricingItems(prev => ({ ...prev, [cVariant.id]: cloneDefaultPricingSection() }));
                              setTimeout(() => syncVariantPricingToForm(cVariant.id), 0);
                              toast.success("Default pricing items loaded!");
                            }}
                            className="h-7 text-xs border-purple-300 hover:bg-purple-50 text-purple-700"
                          >
                            <RefreshCw className="h-3 w-3 mr-1" /> Load Default
                          </Button>
                          <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => recalculatePricingFromRooms(cVariant.id)} className="h-7 text-xs border-blue-300 hover:bg-blue-50 text-blue-700">
                            <Calculator className="h-3 w-3 mr-1" /> Calculate from Rooms
                          </Button>
                          <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => handleAddVariantPricingItem(cVariant.id)} className="h-7 text-xs border-violet-300 hover:bg-violet-50 text-violet-700">
                            <Plus className="h-3 w-3 mr-1" /> Add Item
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 pb-2">
                      {pricingItems.length === 0 ? (
                        <div className="text-center py-4 text-sm text-muted-foreground border border-dashed border-violet-200 rounded-lg bg-violet-50/20 mt-3">
                          <p className="text-xs">No pricing items yet. Click &quot;Load Default&quot; or &quot;Add Item&quot;.</p>
                        </div>
                      ) : (
                        <div className="border border-slate-200 rounded-md overflow-hidden">
                          {/* Header row */}
                          <div className="grid grid-cols-[1fr_6rem_1fr_3.5rem] gap-0 px-2 py-1.5 bg-slate-100 border-b border-slate-200">
                            <span className="text-[10px] font-semibold text-slate-600">Item Name</span>
                            <span className="text-[10px] font-semibold text-slate-600 text-right pr-1">Price (Base)</span>
                            <span className="text-[10px] font-semibold text-slate-600 pl-2">Description</span>
                            <span className="text-[10px] font-semibold text-slate-600 text-center">Actions</span>
                          </div>
                          {pricingItems.map((item: any, idx: number) => (
                            <div key={idx} className={`grid grid-cols-[1fr_6rem_1fr_3.5rem] gap-0 px-2 py-1 border-b border-slate-100 last:border-b-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}>
                              <Input value={item.name} disabled={loading} placeholder="Item name" onChange={(e) => handleUpdateVariantPricingItem(cVariant.id, idx, 'name', e.target.value)} onBlur={() => syncVariantPricingBreakdown(cVariant.id)} className="h-7 text-xs border-0 shadow-none px-1 focus-visible:ring-0 bg-transparent" />
                              <Input value={item.price} disabled={loading} placeholder="0" type="number" onChange={(e) => handleUpdateVariantPricingItem(cVariant.id, idx, 'price', e.target.value)} onBlur={() => syncVariantPricingBreakdown(cVariant.id)} className="h-7 text-xs border-0 shadow-none px-1 focus-visible:ring-0 bg-transparent text-right" />
                              <Input value={item.description} disabled={loading} placeholder="e.g., 6 Adults × Rs.20,000 = Rs.1,20,000" onChange={(e) => handleUpdateVariantPricingItem(cVariant.id, idx, 'description', e.target.value)} onBlur={() => syncVariantPricingBreakdown(cVariant.id)} className="h-7 text-xs border-0 shadow-none px-2 focus-visible:ring-0 bg-transparent" />
                              <div className="flex items-center justify-center gap-0.5">
                                {item.derivationFormula ? (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-blue-500 hover:text-blue-700 hover:bg-blue-50">
                                        <Info className="h-3 w-3" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-72 text-xs p-3 space-y-1.5" side="left">
                                      <p className="font-semibold text-slate-700">{item.name}</p>
                                      <p className="text-slate-500 whitespace-pre-wrap leading-relaxed">{item.derivationFormula}</p>
                                    </PopoverContent>
                                  </Popover>
                                ) : <span className="w-6" />}
                                <Button type="button" variant="ghost" size="icon" disabled={loading} onClick={() => handleRemoveVariantPricingItem(cVariant.id, idx)} className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50">
                                  <Trash className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm border-2 border-orange-200/60 bg-gradient-to-r from-orange-50 to-red-50">
                    <CardContent className="pt-5 pb-5">
                      <label className="text-sm font-semibold text-orange-700 flex items-center mb-2">
                        <Trophy className="mr-2 h-4 w-4" /> Final Amount
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-lg font-bold text-orange-600">Rs.</span>
                        <Input value={totalPrice} disabled={loading} placeholder="Total price" type="number" className="text-xl font-bold pl-8 bg-white border-orange-300 h-12" onChange={(e) => setVariantTotalPrices(prev => ({ ...prev, [cVariant.id]: e.target.value }))} onBlur={() => syncVariantPricingToForm(cVariant.id)} />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm border border-slate-200/70">
                    <CardContent className="pt-4 pb-4">
                      <label className="text-sm font-medium flex items-center gap-2 mb-2">
                        <Receipt className="h-4 w-4 text-violet-600" /> Remarks
                      </label>
                      <Input disabled={loading} placeholder="Additional remarks..." value={remarks} onChange={(e) => setVariantRemarks(prev => ({ ...prev, [cVariant.id]: e.target.value }))} onBlur={() => syncVariantPricingToForm(cVariant.id)} />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        );
      })}

      {/* --- Selected Package Variants --- */}
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
            <Card className={`shadow-sm border bg-gradient-to-br from-white to-primary/5 ${confirmedVariantId === variant.id ? 'border-green-500 ring-1 ring-green-400' : 'border-primary/20'}`}>
              <CardHeader className="pb-3 border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-sm flex items-center gap-2 font-semibold">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    Variant Details
                    {confirmedVariantId === variant.id && (
                      <Badge className="text-xs bg-green-600 text-white ml-2">Query confirmed</Badge>
                    )}
                  </CardTitle>
                  <Button
                    type="button"
                    size="sm"
                    variant={confirmedVariantId === variant.id ? "default" : "outline"}
                    disabled={loading}
                    onClick={() => form.setValue('confirmedVariantId', confirmedVariantId === variant.id ? null : variant.id, { shouldDirty: true })}
                    className={confirmedVariantId === variant.id ? "bg-green-600 hover:bg-green-700 text-white h-8 text-xs" : "border-green-500 text-green-700 hover:bg-green-50 h-8 text-xs"}
                  >
                    {confirmedVariantId === variant.id ? (
                      <><Check className="h-3 w-3 mr-1" /> Query confirmed</>
                    ) : (
                      <><Trophy className="h-3 w-3 mr-1" /> Confirm query</>
                    )}
                  </Button>
                  {confirmedVariantId === variant.id && (
                    <p className="text-[11px] text-green-700 mt-1 text-right">
                      This variant confirmation also marks the query confirmed.
                    </p>
                  )}
                </div>
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
              <TabsList className="grid w-full grid-cols-3 bg-muted p-1">
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
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <CardTitle className="text-sm flex items-center gap-2 font-semibold">
                        <HotelIcon className="h-4 w-4 text-blue-600" />
                        Hotel Selection ({itineraries.length})
                      </CardTitle>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => copyFirstDayHotelToAllDays(variant.id, variant)}
                        className="h-8 text-xs border-blue-300 hover:bg-blue-50"
                        disabled={itineraries.length === 0}
                      >
                        <Copy className="h-3.5 w-3.5 mr-1.5" />
                        Copy Day 1 Hotel
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {itineraries.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        <HotelIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                        No itineraries configured.
                      </div>
                    ) : (
                      <Accordion type="multiple" className="space-y-3">
                        {itineraries.map((itinerary: any, idx: number) => {
                          const selectedHotelId = resolveVariantHotelId(variant, itinerary, idx);
                          const selectedHotel = resolveVariantHotel(variant, itinerary, idx);
                          const variantRooms = variantRoomAllocations?.[variant.id]?.[itinerary.id] || [];
                          const variantTransports = variantTransportDetails?.[variant.id]?.[itinerary.id] || [];
                          const hotelList = getHotelOptions(itinerary.locationId);
                          const isOverridden = variantHotelOverrides?.[variant.id]?.[itinerary.id] !== undefined;
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
                              key={itinerary.id}
                              value={itinerary.id}
                              className={`relative border rounded-md overflow-hidden shadow-sm bg-white hover:shadow-md transition pl-0 before:absolute before:inset-y-0 before:left-0 before:w-1 ${accent}`}
                            >
                              <AccordionTrigger className="px-4 py-3 hover:no-underline data-[state=open]:bg-gradient-to-r data-[state=open]:from-primary/5 data-[state=open]:to-primary/10">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold bg-gradient-to-br from-primary to-primary/80 text-white border border-primary/20 shadow-sm">
                                    {itinerary.dayNumber || idx + 1}
                                  </div>
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <HotelIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                    <span className="font-medium text-sm truncate">{selectedHotel?.name || 'No hotel selected'}</span>
                                  </div>
                                  {isOverridden && (
                                    <Badge variant="secondary" className="text-[10px] px-2 py-0.5 h-5 animate-pulse bg-amber-100 text-amber-700 border border-amber-200">
                                      Modified
                                    </Badge>
                                  )}
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-5 pt-4 space-y-4 bg-gradient-to-b from-white to-slate-50/40 border-t">
                                {selectedHotel?.images && selectedHotel.images.length > 0 && (
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {selectedHotel.images.slice(0, 4).map((img: Images, imgIdx: number) => (
                                      <div key={imgIdx} className="relative h-56 w-full rounded-md overflow-hidden border bg-slate-100 shadow-sm group">
                                        <Image
                                          src={img.url}
                                          alt={selectedHotel.name}
                                          fill
                                          className="object-cover group-hover:scale-105 transition duration-500"
                                          sizes="(max-width: 768px) 50vw, 25vw"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                                  <CardContent className="pt-3 pb-3">
                                    <div className="flex items-start gap-2">
                                      <Calendar className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <div
                                          className="font-semibold text-sm text-slate-800 [&>p]:m-0"
                                          dangerouslySetInnerHTML={{ __html: itinerary.itineraryTitle || `Day ${itinerary.dayNumber || idx + 1}` }}
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

                                {(variantRooms.length > 0 || variantTransports.length > 0) && (
                                  <Card className="border-slate-200/70 bg-slate-50/50">
                                    <CardContent className="pt-4 pb-4 space-y-3">
                                      {variantRooms.length > 0 && (
                                        <div className="space-y-2">
                                          <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                                            <BedDouble className="h-3.5 w-3.5 text-blue-600" />
                                            Room Allocations ({variantRooms.length})
                                          </div>
                                          {variantRooms.map((room: any, roomIdx: number) => {
                                            const roomType = roomTypes?.find((rt: any) => rt.id === room.roomTypeId);
                                            const occupancyType = occupancyTypes?.find((ot: any) => ot.id === room.occupancyTypeId);
                                            const mealPlan = mealPlans?.find((mp: any) => mp.id === room.mealPlanId);

                                            return (
                                              <div key={roomIdx} className="flex items-start gap-3 py-2 px-3 bg-white rounded-md border border-blue-100 text-xs">
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
                                                    <span className="text-slate-600">x{room.quantity || 1}</span>
                                                  </div>
                                                  {room.guestNames && (
                                                    <div className="text-slate-600 text-[10px]">Guests: {room.guestNames}</div>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}

                                      {variantTransports.length > 0 && (
                                        <div className="space-y-2">
                                          <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                                            <Car className="h-3.5 w-3.5 text-emerald-600" />
                                            Transport Details ({variantTransports.length})
                                          </div>
                                          {variantTransports.map((transport: any, transportIdx: number) => {
                                            const vehicleType = vehicleTypes.find((vehicle: any) => vehicle.id === transport.vehicleTypeId);

                                            return (
                                              <div key={transportIdx} className="flex items-start gap-3 py-2 px-3 bg-white rounded-md border border-emerald-100 text-xs">
                                                <Car className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                                                <div className="flex-1 space-y-1">
                                                  <div className="flex items-center gap-2 flex-wrap">
                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-emerald-50">
                                                      {vehicleType?.name || 'Vehicle not selected'}
                                                    </Badge>
                                                    <span className="text-slate-600">x{transport.quantity || 1}</span>
                                                  </div>
                                                  {transport.description && (
                                                    <div className="text-slate-600 text-[10px]">{transport.description}</div>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </CardContent>
                                  </Card>
                                )}

                                <Card className="border-primary/20">
                                  <CardContent className="pt-3 pb-3 space-y-3">
                                    <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">
                                      Select Hotel
                                    </div>
                                    <Select
                                      value={selectedHotelId || 'none'}
                                      onValueChange={(value) => setVariantHotelOverride(variant.id, itinerary.id, value === 'none' ? '' : value)}
                                    >
                                      <SelectTrigger className="h-9 text-xs bg-white">
                                        <SelectValue placeholder="Select hotel" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none" className="text-xs text-muted-foreground">-- No hotel selected --</SelectItem>
                                        {hotelList.map((hotel) => (
                                          <SelectItem key={hotel.id} value={hotel.id} className="text-xs">
                                            {hotel.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-8 text-xs w-full"
                                      onClick={() => {
                                        setAddHotelTarget({
                                          variantId: variant.id,
                                          itineraryId: itinerary.id,
                                          locationId:
                                            itinerary.locationId ||
                                            selectedTourPackage?.locationId ||
                                            "",
                                        });
                                        setNewHotelName("");
                                        setAddHotelOpen(true);
                                      }}
                                    >
                                      <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                                      Add new hotel
                                    </Button>
                                    <p className="text-[10px] text-slate-500">
                                      Saved as a variant-specific hotel override for this day.
                                    </p>
                                  </CardContent>
                                </Card>
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
                        <p className="text-xs mt-2">Add itineraries in the Itinerary tab first.</p>
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
                            onClick={() => copyFirstDayRoomsAndTransportToAllDays(variant.id)}
                            className="h-9 text-xs border-blue-300 hover:bg-blue-50"
                            disabled={itineraries.length === 0}
                          >
                            <Copy className="h-3.5 w-3.5 mr-1.5" />
                            Copy Day 1 Rooms + Transport
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
                              Copy Details
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Accordion type="multiple" className="space-y-3">
                      {itineraries.map((itinerary, idx) => {
                        const itineraryKey = itinerary.id || `itinerary-${idx}`;
                        const variantRooms = variantRoomAllocations?.[variant.id]?.[itineraryKey] || [];
                        const variantTransports = variantTransportDetails?.[variant.id]?.[itineraryKey] || [];

                        return (
                          <AccordionItem
                            key={itineraryKey}
                            value={itineraryKey}
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
                                          <Button type="button" size="sm" variant="ghost" onClick={() => removeRoomAllocation(variant.id, itinerary.id, roomIdx)} className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600">
                                            <Trash className="h-3 w-3" />
                                          </Button>
                                        </div>

                                        {/* Custom Room Type toggle */}
                                        <label className="flex items-center gap-1.5 text-[10px] text-slate-400 cursor-pointer select-none">
                                          <Checkbox checked={!!room.useCustomRoomType} onCheckedChange={(checked) => { updateRoomAllocationFields(variant.id, itinerary.id, roomIdx, { useCustomRoomType: !!checked, ...(!checked ? { customRoomType: '' } : {}) }); }} className="h-3 w-3" />
                                          Custom Room Type
                                        </label>

                                        {/* Row: Room Type | Occupancy | Qty */}
                                        <div className="grid grid-cols-3 gap-2">
                                          <div className="space-y-1">
                                            <label className="text-[10px] font-medium text-slate-600">Room Type</label>
                                            {room.useCustomRoomType ? (
                                              <Input value={room.customRoomType || ''} onChange={(e) => updateRoomAllocation(variant.id, itinerary.id, roomIdx, 'customRoomType', e.target.value)} placeholder="Custom room type..." className="h-8 text-xs" />
                                            ) : (
                                              <Popover open={openRoomTypeKey === `v-${variant.id}-${itinerary.id}-${roomIdx}`} onOpenChange={(o) => setOpenRoomTypeKey(o ? `v-${variant.id}-${itinerary.id}-${roomIdx}` : null)}>
                                                <PopoverTrigger asChild>
                                                  <Button type="button" variant="outline" size="sm" className="w-full justify-between h-8 text-xs font-normal">
                                                    <span className="truncate">{roomTypes.find((rt: any) => rt.id === room.roomTypeId)?.name || 'Select room type'}</span>
                                                    <ChevronsUpDown className="h-3 w-3 opacity-50 shrink-0" />
                                                  </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[200px] p-0" align="start">
                                                  <Command onKeyDownCapture={e => e.stopPropagation()}>
                                                    <CommandInput placeholder="Search room type..." className="text-xs h-8" />
                                                    <CommandList className="max-h-48 overflow-auto">
                                                      <CommandEmpty className="text-xs py-2 text-center">No room type found.</CommandEmpty>
                                                      <CommandGroup>
                                                        {roomTypes.map((rt: any) => (
                                                          <CommandItem key={rt.id} value={rt.name} onSelect={() => { updateRoomAllocation(variant.id, itinerary.id, roomIdx, 'roomTypeId', rt.id); setOpenRoomTypeKey(null); }} className="text-xs">
                                                            <span className="flex-1 truncate">{rt.name}</span>
                                                            {room.roomTypeId === rt.id && <Check className="h-3.5 w-3.5 text-primary ml-auto" />}
                                                          </CommandItem>
                                                        ))}
                                                      </CommandGroup>
                                                    </CommandList>
                                                  </Command>
                                                </PopoverContent>
                                              </Popover>
                                            )}
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[10px] font-medium text-slate-600">Occupancy</label>
                                            <Select value={room.occupancyTypeId} onValueChange={(value) => updateRoomAllocation(variant.id, itinerary.id, roomIdx, 'occupancyTypeId', value)}>
                                              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select occupancy" /></SelectTrigger>
                                              <SelectContent>{occupancyTypes.map((ot: any) => <SelectItem key={ot.id} value={ot.id} className="text-xs">{ot.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[10px] font-medium text-slate-600">Qty</label>
                                            <div className="flex items-center gap-1">
                                              <Button type="button" variant="outline" size="sm" className="h-8 w-7 p-0 text-xs" disabled={loading || (room.quantity || 1) <= 1} onClick={() => updateRoomAllocation(variant.id, itinerary.id, roomIdx, 'quantity', Math.max(1, (room.quantity || 1) - 1))}>−</Button>
                                              <Input type="number" min={1} value={room.quantity || 1} onChange={(e) => updateRoomAllocation(variant.id, itinerary.id, roomIdx, 'quantity', parseInt(e.target.value) || 1)} className="h-8 text-xs text-center w-10 px-1" />
                                              <Button type="button" variant="outline" size="sm" className="h-8 w-7 p-0 text-xs" disabled={loading} onClick={() => updateRoomAllocation(variant.id, itinerary.id, roomIdx, 'quantity', (room.quantity || 1) + 1)}>+</Button>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Additional Occupancies */}
                                        <div className="border border-amber-200 rounded-md p-2 bg-amber-50/30 space-y-1.5">
                                          <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-semibold text-amber-800">Additional Occupancies</span>
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              disabled={loading}
                                              onClick={() => {
                                                const current = variantRoomAllocations || {};
                                                const itKey = itinerary.id || itineraryKey;
                                                const varData = current[variant.id] || {};
                                                const allocations = [...(varData[itKey] || [])];
                                                const updatedRoom = { ...allocations[roomIdx], extraBeds: [...(allocations[roomIdx].extraBeds || []), { occupancyTypeId: '', quantity: 1 }] };
                                                allocations[roomIdx] = updatedRoom;
                                                form.setValue('variantRoomAllocations', { ...current, [variant.id]: { ...varData, [itKey]: allocations } }, { shouldDirty: true });
                                              }}
                                              className="h-5 px-1.5 text-[9px] border-amber-300 hover:bg-amber-100 text-amber-800"
                                            >
                                              + Add Occupancy
                                            </Button>
                                          </div>
                                          {(room.extraBeds || []).length === 0 && (
                                            <p className="text-[10px] text-amber-700/70 italic">e.g. Child with Extra Bed, CNB, Extra Mattress…</p>
                                          )}
                                          {(room.extraBeds || []).map((eb: any, ebIdx: number) => (
                                            <div key={ebIdx} className="flex items-center gap-1.5">
                                              <Select
                                                value={eb.occupancyTypeId || ''}
                                                onValueChange={(v) => {
                                                  const current = variantRoomAllocations || {};
                                                  const itKey = itinerary.id || itineraryKey;
                                                  const varData = current[variant.id] || {};
                                                  const allocations = [...(varData[itKey] || [])];
                                                  const updatedBeds = [...(allocations[roomIdx].extraBeds || [])];
                                                  updatedBeds[ebIdx] = { ...updatedBeds[ebIdx], occupancyTypeId: v };
                                                  allocations[roomIdx] = { ...allocations[roomIdx], extraBeds: updatedBeds };
                                                  form.setValue('variantRoomAllocations', { ...current, [variant.id]: { ...varData, [itKey]: allocations } }, { shouldDirty: true });
                                                }}
                                              >
                                                <SelectTrigger className="h-7 text-[10px] flex-1 border-amber-200 bg-white"><SelectValue placeholder="Select occupancy type" /></SelectTrigger>
                                                <SelectContent>{occupancyTypes.map((ot: any) => <SelectItem key={ot.id} value={ot.id} className="text-xs">{ot.name}</SelectItem>)}</SelectContent>
                                              </Select>
                                              <div className="flex items-center gap-0.5 shrink-0">
                                                <Button type="button" variant="outline" size="sm" className="h-7 w-6 p-0 text-xs border-amber-300" disabled={loading || (eb.quantity || 1) <= 1} onClick={() => {
                                                  const current = variantRoomAllocations || {};
                                                  const itKey = itinerary.id || itineraryKey;
                                                  const varData = current[variant.id] || {};
                                                  const allocations = [...(varData[itKey] || [])];
                                                  const updatedBeds = [...(allocations[roomIdx].extraBeds || [])];
                                                  updatedBeds[ebIdx] = { ...updatedBeds[ebIdx], quantity: Math.max(1, (eb.quantity || 1) - 1) };
                                                  allocations[roomIdx] = { ...allocations[roomIdx], extraBeds: updatedBeds };
                                                  form.setValue('variantRoomAllocations', { ...current, [variant.id]: { ...varData, [itKey]: allocations } }, { shouldDirty: true });
                                                }}>−</Button>
                                                <Input type="number" min={1} value={eb.quantity || 1} onChange={(e) => {
                                                  const current = variantRoomAllocations || {};
                                                  const itKey = itinerary.id || itineraryKey;
                                                  const varData = current[variant.id] || {};
                                                  const allocations = [...(varData[itKey] || [])];
                                                  const updatedBeds = [...(allocations[roomIdx].extraBeds || [])];
                                                  updatedBeds[ebIdx] = { ...updatedBeds[ebIdx], quantity: parseInt(e.target.value) || 1 };
                                                  allocations[roomIdx] = { ...allocations[roomIdx], extraBeds: updatedBeds };
                                                  form.setValue('variantRoomAllocations', { ...current, [variant.id]: { ...varData, [itKey]: allocations } }, { shouldDirty: true });
                                                }} className="h-7 text-[10px] text-center w-9 border-amber-200 px-0.5" />
                                                <Button type="button" variant="outline" size="sm" className="h-7 w-6 p-0 text-xs border-amber-300" disabled={loading} onClick={() => {
                                                  const current = variantRoomAllocations || {};
                                                  const itKey = itinerary.id || itineraryKey;
                                                  const varData = current[variant.id] || {};
                                                  const allocations = [...(varData[itKey] || [])];
                                                  const updatedBeds = [...(allocations[roomIdx].extraBeds || [])];
                                                  updatedBeds[ebIdx] = { ...updatedBeds[ebIdx], quantity: (eb.quantity || 1) + 1 };
                                                  allocations[roomIdx] = { ...allocations[roomIdx], extraBeds: updatedBeds };
                                                  form.setValue('variantRoomAllocations', { ...current, [variant.id]: { ...varData, [itKey]: allocations } }, { shouldDirty: true });
                                                }}>+</Button>
                                              </div>
                                              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 hover:text-red-600 shrink-0" onClick={() => {
                                                const current = variantRoomAllocations || {};
                                                const itKey = itinerary.id || itineraryKey;
                                                const varData = current[variant.id] || {};
                                                const allocations = [...(varData[itKey] || [])];
                                                const updatedBeds = (allocations[roomIdx].extraBeds || []).filter((_: any, i: number) => i !== ebIdx);
                                                allocations[roomIdx] = { ...allocations[roomIdx], extraBeds: updatedBeds };
                                                form.setValue('variantRoomAllocations', { ...current, [variant.id]: { ...varData, [itKey]: allocations } }, { shouldDirty: true });
                                              }}>
                                                <Trash className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          ))}
                                        </div>

                                        {/* Meal Plan */}
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-medium text-slate-600">Meal Plan</label>
                                          <Select value={room.mealPlanId} onValueChange={(value) => updateRoomAllocation(variant.id, itinerary.id, roomIdx, 'mealPlanId', value)}>
                                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select meal plan" /></SelectTrigger>
                                            <SelectContent>{mealPlans.map((mp: any) => <SelectItem key={mp.id} value={mp.id} className="text-xs">{mp.name}</SelectItem>)}</SelectContent>
                                          </Select>
                                        </div>

                                        {/* Guest Names */}
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-medium text-slate-600">Guest Names (optional)</label>
                                          <Input value={room.guestNames || ''} onChange={(e) => updateRoomAllocation(variant.id, itinerary.id, roomIdx, 'guestNames', e.target.value)} placeholder="e.g. John Smith, Jane Smith" className="h-8 text-xs" />
                                        </div>

                                        {/* Voucher Number */}
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-medium text-slate-600">Voucher Number (optional)</label>
                                          <Input value={room.voucherNumber || ''} onChange={(e) => updateRoomAllocation(variant.id, itinerary.id, roomIdx, 'voucherNumber', e.target.value)} placeholder="Hotel booking confirmation number" className="h-8 text-xs" />
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
                      Pricing Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-white rounded-lg border border-slate-200 p-4">
                      <div className="flex items-center mb-3">
                        <Settings className="mr-2 h-4 w-4 text-indigo-600" />
                        <h3 className="text-sm font-semibold">Calculation Method</h3>
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
                              <Receipt className="mr-2 h-3.5 w-3.5" />Manual Pricing Entry
                            </label>
                            <p className="text-[10px] text-slate-500 mt-0.5">Enter pricing components manually with full control</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 p-3 rounded-lg border hover:border-green-300 hover:bg-green-50 transition">
                          <RadioGroupItem value="autoHotelTransport" id={`a-${variant.id}`} />
                          <div className="flex-1">
                            <label htmlFor={`a-${variant.id}`} className="text-xs font-medium cursor-pointer flex items-center">
                              <Calculator className="mr-2 h-3.5 w-3.5" />Auto Calculate (Hotel + Transport)
                            </label>
                            <p className="text-[10px] text-slate-500 mt-0.5">Automatically calculate based on itinerary hotels and transport</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 p-3 rounded-lg border hover:border-purple-300 hover:bg-purple-50 transition">
                          <RadioGroupItem value="useTourPackagePricing" id={`u-${variant.id}`} />
                          <div className="flex-1">
                            <label htmlFor={`u-${variant.id}`} className="text-xs font-medium cursor-pointer flex items-center">
                              <Package className="mr-2 h-3.5 w-3.5" />Fetch &amp; Select Pricing Components
                            </label>
                            <p className="text-[10px] text-slate-500 mt-0.5">Fetch pre-defined pricing components from the tour package template and select which to apply</p>
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
                            Manual Pricing Entry
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
                                <p className="text-xs mt-1">Click "Add Item" to get started.</p>
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
                    const variantPricingEntry = savedVariantPricingData?.[variant.id];
                    const appliedDiscount = variantPricingEntry?.appliedDiscount;
                    const hasDiscount = hasAppliedVariantDiscount(appliedDiscount);
                    const subtotalBeforeDiscount =
                      typeof variantPricingEntry?.subtotalBeforeDiscount === 'number'
                        ? variantPricingEntry.subtotalBeforeDiscount
                        : calcResult?.totalCost ?? 0;
                    const finalTotalAfterDiscount =
                      typeof variantPricingEntry?.totalCost === 'number'
                        ? variantPricingEntry.totalCost
                        : calcResult?.totalCost ?? 0;

                    return (
                      <div className="space-y-4">
                        <Card className="shadow-sm border border-slate-200/70">
                          <CardHeader className="pb-3 border-b bg-gradient-to-r from-green-50 via-green-25 to-transparent">
                            <CardTitle className="text-sm flex items-center gap-2 font-semibold">
                              <Calculator className="h-4 w-4 text-green-600" />
                              Auto Calculate Pricing
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

                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    onClick={() => handleCalculateVariantPricing(variant)}
                                    className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white border-emerald-600 shadow-md"
                                    disabled={loading}
                                  >
                                    <Calculator className="mr-2 h-4 w-4" />
                                    Calculate Price
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
                                                {accommodation?.hotelName && (
                                                  <div className="font-semibold text-gray-800 mb-1">{accommodation.hotelName}</div>
                                                )}
                                                {accommodation?.roomBreakdown?.map((rb: any, idx: number) => {
                                                  const qty = rb.quantity || 1;
                                                  const priceLine =
                                                    rb.totalCost > 0 && rb.pricePerNight > 0 && qty > 1
                                                      ? `Rs.${rb.pricePerNight.toFixed(2)} x ${qty} = Rs.${rb.totalCost.toFixed(2)}`
                                                      : rb.totalCost > 0
                                                        ? `Rs.${rb.totalCost.toFixed(2)}`
                                                        : 'Rs.0.00';
                                                  return (
                                                  <div key={idx} className="mb-1 pl-2 border-l-2 border-blue-100">
                                                    <div>
                                                      {rb.roomTypeName || 'Room'} ({rb.occupancyTypeName || 'Occupancy'})
                                                      {qty > 1 ? ` x ${qty}` : ''} — {priceLine}
                                                    </div>
                                                    {(rb.extraBedCosts || []).map((eb: any, ebIdx: number) => {
                                                      const ebQty = eb.quantity || 1;
                                                      const ebPriceLine =
                                                        eb.totalCost > 0 && eb.pricePerNight > 0 && ebQty > 1
                                                          ? `Rs.${eb.pricePerNight.toFixed(2)} x ${ebQty} = Rs.${eb.totalCost.toFixed(2)}`
                                                          : eb.totalCost > 0
                                                            ? `Rs.${eb.totalCost.toFixed(2)}`
                                                            : 'Rs.0.00';
                                                      return (
                                                      <div key={ebIdx} className="text-[10px] text-amber-700 pl-2 border-l border-amber-200">
                                                        + Extra Bed: {eb.occupancyTypeName || eb.occupancyTypeId} — {ebPriceLine}
                                                      </div>
                                                      );
                                                    })}
                                                  </div>
                                                  );
                                                })}
                                              </div>
                                            </TableCell>
                                            <TableCell className="text-right text-sm">
                                              {accommodation?.accommodationCost ? `Rs.${accommodation.accommodationCost.toFixed(2)}` : '-'}
                                            </TableCell>
                                            <TableCell className="text-right text-sm">
                                              {transportCost ? `Rs.${transportCost.toFixed(2)}` : '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-sm">Rs.{dayTotal.toFixed(2)}</TableCell>
                                          </TableRow>
                                        );
                                      });
                                    })()}
                                    <TableRow className="bg-blue-50">
                                      <TableCell colSpan={4} className="font-medium text-right text-sm">Base Accommodation Cost</TableCell>
                                      <TableCell className="text-right font-bold text-sm">Rs.{calcResult.breakdown.accommodation.toFixed(2)}</TableCell>
                                    </TableRow>
                                    <TableRow className="bg-blue-50">
                                      <TableCell colSpan={4} className="font-medium text-right text-sm">Base Transport Cost</TableCell>
                                      <TableCell className="text-right font-bold text-sm">Rs.{calcResult.breakdown.transport.toFixed(2)}</TableCell>
                                    </TableRow>
                                    <TableRow className="bg-blue-100">
                                      <TableCell colSpan={4} className="font-medium text-right text-sm">Total Base Cost</TableCell>
                                      <TableCell className="text-right font-bold text-sm">Rs.{(calcResult.breakdown.accommodation + calcResult.breakdown.transport).toFixed(2)}</TableCell>
                                    </TableRow>
                                    {calcResult.appliedMarkup && (
                                      <TableRow className="bg-blue-100">
                                        <TableCell colSpan={4} className="font-medium text-right text-sm">Markup ({calcResult.appliedMarkup.percentage}%)</TableCell>
                                        <TableCell className="text-right font-bold text-sm">Rs.{calcResult.appliedMarkup.amount.toFixed(2)}</TableCell>
                                      </TableRow>
                                    )}
                                    <TableRow className="bg-blue-100">
                                      <TableCell colSpan={4} className="font-medium text-right text-sm">
                                        {hasDiscount ? 'Subtotal (before discount)' : 'Final Total Cost'}
                                      </TableCell>
                                      <TableCell className="text-right font-bold text-sm">Rs.{subtotalBeforeDiscount.toFixed(2)}</TableCell>
                                    </TableRow>
                                    {hasDiscount && (
                                      <>
                                        <TableRow className="bg-emerald-50">
                                          <TableCell colSpan={4} className="font-medium text-right text-sm text-emerald-800">
                                            {formatDiscountLabel(appliedDiscount)}
                                          </TableCell>
                                          <TableCell className="text-right font-bold text-sm text-emerald-700">
                                            - Rs.{appliedDiscount.amount.toFixed(2)}
                                          </TableCell>
                                        </TableRow>
                                        <TableRow className="bg-blue-200">
                                          <TableCell colSpan={4} className="font-medium text-right text-base">Final Total (after discount)</TableCell>
                                          <TableCell className="text-right font-bold text-base">Rs.{finalTotalAfterDiscount.toFixed(2)}</TableCell>
                                        </TableRow>
                                      </>
                                    )}
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
                            Fetch &amp; Select Pricing Components
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
                                    {selectedTourPackage?.tourPackageName || `Package ID: ${selectedTourPackageId}`}
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
                                Meal Plan <span className="text-red-500">*</span>
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
                                      {plan.name}
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
                                Number of Rooms <span className="text-red-500">*</span>
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
                                    {variantRoomCounts[variant.id] || 1} room{(variantRoomCounts[variant.id] || 1) > 1 ? 's' : ''}
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
                            Fetch Available Pricing Components
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
                                            <span className="font-medium">Sales Price:</span> Rs.{parseFloat(component.price || '0').toFixed(2)} per person
                                            {component.purchasePrice && (
                                              <span className="ml-3">
                                                <span className="font-medium text-orange-600">Purchase Price:</span> Rs.{parseFloat(component.purchasePrice || '0').toFixed(2)} per person
                                              </span>
                                            )}
                                            {getOccupancyMultiplier(component.pricingAttribute?.name || '') > 1 && (
                                              <span className="text-blue-600 ml-1 block">
                                                (x{getOccupancyMultiplier(component.pricingAttribute?.name || '')} for {component.pricingAttribute?.name?.toLowerCase().includes('double') ? 'Double' : component.pricingAttribute?.name?.toLowerCase().includes('triple') ? 'Triple' : component.pricingAttribute?.name?.toLowerCase().includes('quad') ? 'Quad' : 'Multi'} occupancy)
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
                                                {quantity} rooms x Rs.{parseFloat(component.price || '0').toFixed(2)} x {getOccupancyMultiplier(component.pricingAttribute?.name || '')} occupancy
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
                                            {occupancyMultiplier > 1 ? ` x ${occupancyMultiplier}` : ''}
                                          </span>
                                          <span>Rs.{compTotal.toFixed(2)}</span>
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
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <CardTitle className="text-sm flex items-center gap-2 font-semibold">
                        <Receipt className="h-4 w-4 text-blue-600" />
                        Pricing Breakdown
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={loading}
                          onClick={() => {
                            setVariantPricingItems(prev => ({ ...prev, [variant.id]: cloneDefaultPricingSection() }));
                            setTimeout(() => syncVariantPricingToForm(variant.id), 0);
                            toast.success("Default pricing items loaded!");
                          }}
                          className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-300 text-xs"
                        >
                          <RefreshCw className="mr-1.5 h-3 w-3" />
                          Load Default
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={loading}
                          onClick={() => recalculatePricingFromRooms(variant.id)}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300 text-xs"
                        >
                          <Calculator className="mr-1.5 h-3 w-3" />
                          Calculate from Rooms
                        </Button>
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
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 pb-2">
                    {(variantPricingItems[variant.id] || []).length === 0 ? (
                      <div className="text-center py-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-dashed border-blue-300 mt-3">
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
                      <div className="border border-slate-200 rounded-b-md overflow-hidden">
                        {/* Single header row */}
                        <div className="grid grid-cols-[1fr_7rem_1fr_4rem] gap-0 px-3 py-2 bg-slate-100 border-b border-slate-200">
                          <span className="text-[10px] font-semibold text-slate-600 flex items-center gap-1"><Star className="h-2.5 w-2.5 text-yellow-500" />Item Name</span>
                          <span className="text-[10px] font-semibold text-slate-600 flex items-center gap-1"><DollarSign className="h-2.5 w-2.5 text-green-500" />Price (Base)</span>
                          <span className="text-[10px] font-semibold text-slate-600 flex items-center gap-1 pl-2"><Calculator className="h-2.5 w-2.5 text-blue-500" />Description</span>
                          <span className="text-[10px] font-semibold text-slate-500 text-center">Actions</span>
                        </div>
                        {(variantPricingItems[variant.id] || []).map((item, idx) => {
                          const variantHasDiscount = hasAppliedVariantDiscount(
                            savedVariantPricingData?.[variant.id]?.appliedDiscount
                          );
                          return (
                          <div key={idx} className={`grid grid-cols-[1fr_7rem_1fr_4rem] gap-0 px-2 py-1 border-b border-slate-100 last:border-b-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}>
                            <Input
                              value={item.name}
                              disabled={loading}
                              placeholder="e.g., Per Person Cost"
                              onChange={(e) => handleUpdateVariantPricingItem(variant.id, idx, 'name', e.target.value)}
                              onBlur={() => syncVariantPricingBreakdown(variant.id)}
                              className="h-8 text-xs border-0 shadow-none px-1 focus-visible:ring-0 bg-transparent"
                            />
                            <Input
                              value={item.price}
                              disabled={loading || variantHasDiscount}
                              readOnly={variantHasDiscount}
                              placeholder="0"
                              type="number"
                              onChange={(e) => handleUpdateVariantPricingItem(variant.id, idx, 'price', e.target.value)}
                              onBlur={() => syncVariantPricingBreakdown(variant.id)}
                              className={`h-8 text-xs border-0 shadow-none px-1 focus-visible:ring-0 ${variantHasDiscount ? 'bg-slate-100/80 cursor-not-allowed' : 'bg-transparent'}`}
                            />
                            <Input
                              value={item.description}
                              disabled={loading || variantHasDiscount}
                              readOnly={variantHasDiscount}
                              placeholder={`e.g., ${numAdults > 0 ? numAdults : 'N'} Adults × Rs.20,000 = Rs.${numAdults > 0 ? (numAdults * 20000).toLocaleString('en-IN') : '1,20,000'}`}
                              onChange={(e) => handleUpdateVariantPricingItem(variant.id, idx, 'description', e.target.value)}
                              onBlur={() => syncVariantPricingBreakdown(variant.id)}
                              className={`h-8 text-xs border-0 shadow-none px-2 focus-visible:ring-0 ${variantHasDiscount ? 'bg-slate-100/80 cursor-not-allowed' : 'bg-transparent'}`}
                            />
                            <div className="flex items-center justify-center gap-0.5">
                              {item.derivationFormula ? (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-blue-500 hover:text-blue-700 hover:bg-blue-50">
                                      <Info className="h-3.5 w-3.5" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-80 text-xs p-3 space-y-2" side="left">
                                    <p className="font-semibold text-slate-700 border-b pb-1">{item.name}</p>
                                    <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">{item.derivationFormula}</p>
                                  </PopoverContent>
                                </Popover>
                              ) : <span className="w-7" />}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={loading}
                                onClick={() => handleRemoveVariantPricingItem(variant.id, idx)}
                                className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                              >
                                <Trash className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Discount Section - apply after pricing calculation */}
                <Card className="shadow-sm border-2 border-emerald-200/60 bg-gradient-to-r from-emerald-50 to-teal-50 mt-4">
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-center mb-3">
                      <IndianRupee className="mr-2 h-5 w-5 text-emerald-600" />
                      <h3 className="text-base font-bold text-emerald-800">Apply Discount</h3>
                    </div>
                    <p className="text-xs text-emerald-700 mb-4">
                      Percentage discounts update each row&apos;s description with discount and GST; base prices stay unchanged. Fixed-amount discounts apply to the final total only.
                    </p>
                    <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-end">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-emerald-700">Discount type</label>
                        <Select
                          value={variantDiscountTypes[variant.id] || 'percent'}
                          onValueChange={(value: VariantDiscountType) =>
                            setVariantDiscountTypes(prev => ({ ...prev, [variant.id]: value }))
                          }
                        >
                          <SelectTrigger className="w-40 h-9 bg-white border-emerald-300">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percent">Percentage (%)</SelectItem>
                            <SelectItem value="fixed">Fixed amount (Rs.)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-emerald-700">
                          {(variantDiscountTypes[variant.id] || 'percent') === 'percent' ? 'Discount %' : 'Discount amount (Rs.)'}
                        </label>
                        <Input
                          type="number"
                          min="0"
                          max={(variantDiscountTypes[variant.id] || 'percent') === 'percent' ? '100' : undefined}
                          value={variantDiscountValues[variant.id] || ''}
                          disabled={loading}
                          placeholder={(variantDiscountTypes[variant.id] || 'percent') === 'percent' ? 'e.g. 5' : 'e.g. 5000'}
                          className="w-36 h-9 bg-white border-emerald-300"
                          onChange={(e) =>
                            setVariantDiscountValues(prev => ({ ...prev, [variant.id]: e.target.value }))
                          }
                        />
                      </div>
                      <div className="flex-1 space-y-1 min-w-[200px]">
                        <label className="text-xs font-semibold text-emerald-700">Reason (optional)</label>
                        <Input
                          value={variantDiscountReasons[variant.id] || ''}
                          disabled={loading}
                          placeholder="e.g. Early bird offer"
                          className="h-9 bg-white border-emerald-300"
                          onChange={(e) =>
                            setVariantDiscountReasons(prev => ({ ...prev, [variant.id]: e.target.value }))
                          }
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={() => handleApplyVariantDiscount(variant.id)}
                        disabled={loading}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        Apply Discount
                      </Button>
                    </div>
                    {hasAppliedVariantDiscount(savedVariantPricingData?.[variant.id]?.appliedDiscount) && (
                      <p className="text-xs text-emerald-800 mt-3 bg-white/70 border border-emerald-200 rounded px-2 py-1.5 inline-block">
                        Active: {formatDiscountLabel(savedVariantPricingData?.[variant.id]?.appliedDiscount)} — saves Rs.{savedVariantPricingData?.[variant.id]?.appliedDiscount?.amount?.toLocaleString('en-IN')}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Total Package Price - Always visible and editable */}
                <Card className="shadow-sm border-2 border-orange-200/60 bg-gradient-to-r from-orange-50 to-red-50 mt-4">
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-center mb-3">
                      <Target className="mr-2 h-5 w-5 text-orange-600" />
                      <h3 className="text-base font-bold text-orange-800">Total Package Price</h3>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-orange-700 flex items-center">
                        <Trophy className="mr-2 h-4 w-4" />
                        Final Amount
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-lg font-bold text-orange-600">Rs.</span>
                        <Input
                          value={variantTotalPrices[variant.id] || ''}
                          disabled={loading}
                          placeholder="Total price for the package"
                          className="text-xl font-bold pl-8 bg-white border-orange-300 focus:border-orange-500 h-12"
                          type="number"
                          onChange={(e) => {
                            setVariantTotalPrices(prev => ({ ...prev, [variant.id]: e.target.value }));
                          }}
                          onBlur={() => {
                            clearStructuredDiscount(variant.id, true);
                            syncVariantPricingToForm(variant.id);
                          }}
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
                          <span className="text-sm mr-2">MP</span>
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
                            <span className="text-sm mr-2">RM</span>
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
