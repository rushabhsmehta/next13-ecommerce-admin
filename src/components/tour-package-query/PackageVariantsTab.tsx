"use client";
import { useState, useEffect, useMemo } from "react";
import { Control, useWatch } from "react-hook-form";
import { Hotel, Images } from "@prisma/client";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Hotel as HotelIcon, Check, ChevronsUpDown, Sparkles, Copy, AlertCircle, Loader2, Calendar, IndianRupee, Edit3, Trash } from "lucide-react";
import Image from "next/image";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "react-hot-toast";

interface VariantPricingComponentDisplay {
  id: string;
  pricingAttributeId: string;
  name: string;
  price: number;
  purchasePrice?: number | null;
  description?: string | null;
}

interface VariantPricingDisplay {
  id: string;
  startDate: string;
  endDate: string;
  mealPlanId?: string | null;
  mealPlanName?: string;
  numberOfRooms: number;
  isGroupPricing: boolean;
  description?: string | null;
  vehicleTypeId?: string | null;
  vehicleTypeName?: string | null;
  locationSeasonalPeriodId?: string | null;
  seasonName?: string | null;
  seasonType?: string | null;
  components: VariantPricingComponentDisplay[];
  totalComponentPrice: number;
}

interface PackageVariant {
  id?: string;
  name: string;
  description?: string;
  isDefault: boolean;
  sortOrder: number;
  priceModifier?: number;
  hotelMappings: {
    [itineraryId: string]: string; // itineraryId -> hotelId
  };
  copiedFromTourPackageId?: string | null;
  seasonalPricings: VariantPricingDisplay[];
}

interface VariantPricingComponentFormState {
  tempId: string;
  pricingAttributeId: string;
  price: string;
  purchasePrice?: string;
  description?: string;
}

interface VariantPricingFormState {
  id?: string;
  startDate: string;
  endDate: string;
  mealPlanId: string;
  numberOfRooms: number;
  vehicleTypeId?: string;
  locationSeasonalPeriodId?: string;
  description?: string;
  isGroupPricing: boolean;
  pricingComponents: VariantPricingComponentFormState[];
}

interface VariantPricingDialogState {
  variantIndex: number;
  mode: "create" | "edit";
  pricingId?: string;
}

interface MealPlanOption {
  id: string;
  name: string;
  description?: string | null;
}

interface PricingAttributeOption {
  id: string;
  name: string;
  description?: string | null;
}

interface VehicleTypeOption {
  id: string;
  name: string;
}

interface SeasonalPeriodOption {
  id: string;
  name: string;
  seasonType?: string | null;
  startMonth?: number | null;
  startDay?: number | null;
  endMonth?: number | null;
  endDay?: number | null;
}

interface TourPackageSourceItinerary {
  id: string;
  dayNumber: number | null;
  hotelId: string | null;
}

interface TourPackageSource {
  id: string;
  tourPackageName: string | null;
  numDaysNight: string | null;
  itineraries: TourPackageSourceItinerary[];
}

interface PackageVariantsTabProps {
  control: Control<any>;
  form: any;
  loading?: boolean;
  hotels: (Hotel & { images: Images[] })[];
  availableTourPackages: TourPackageSource[];
  variantPricingLookup?: Record<string, any[]>;
  tourPackageId?: string;
}

const toNumber = (value: any): number => {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (typeof value === "object") {
    const maybeToNumber = (value as any).toNumber?.();
    if (typeof maybeToNumber === "number" && Number.isFinite(maybeToNumber)) {
      return maybeToNumber;
    }
    const asString = (value as any).toString?.();
    if (typeof asString === "string") {
      const parsed = Number.parseFloat(asString);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
  }
  return 0;
};

const normalizeDateValue = (value: any): string => {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
};

const formatDate = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateRange = (startDate: string, endDate: string) => `${formatDate(startDate)} – ${formatDate(endDate)}`;

const normalizeSeasonalPricingEntries = (entries: any[]): VariantPricingDisplay[] => {
  const list = Array.isArray(entries) ? entries : [];
  const normalized = list.map((entry) => {
    const startDate = normalizeDateValue(entry?.startDate);
    const endDate = normalizeDateValue(entry?.endDate);
  const rawComponents: any[] = Array.isArray(entry?.pricingComponents) ? entry.pricingComponents : [];
  const components: VariantPricingComponentDisplay[] = rawComponents.map((component) => ({
      id: component?.id ?? `${entry?.id ?? startDate}-component-${component?.pricingAttributeId ?? 'component'}`,
      pricingAttributeId: component?.pricingAttributeId ?? component?.pricingAttribute?.id ?? '',
      name: component?.pricingAttribute?.name ?? "Component",
      price: toNumber(component?.price),
      purchasePrice: component?.purchasePrice != null ? toNumber(component.purchasePrice) : null,
      description: component?.description ?? null,
    }));
    const totalComponentPrice = components.reduce((sum, comp) => sum + comp.price, 0);

    const normalizedEntry: VariantPricingDisplay = {
      id: entry?.id ?? `${startDate}-${endDate}-${entry?.mealPlanId ?? ""}`,
      startDate,
      endDate,
      mealPlanId: entry?.mealPlanId ?? null,
      mealPlanName: entry?.mealPlan?.name ?? undefined,
      numberOfRooms: entry?.numberOfRooms ?? 0,
      isGroupPricing: Boolean(entry?.isGroupPricing),
      description: entry?.description ?? null,
      vehicleTypeId: entry?.vehicleTypeId ?? null,
      vehicleTypeName: entry?.vehicleType?.name ?? undefined,
      locationSeasonalPeriodId: entry?.locationSeasonalPeriodId ?? null,
      seasonName: entry?.locationSeasonalPeriod?.name ?? undefined,
      seasonType: entry?.locationSeasonalPeriod?.seasonType ?? undefined,
      components,
      totalComponentPrice,
    };

    return normalizedEntry;
  });

  return normalized.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
};

const generateTempId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `temp-${Math.random().toString(36).slice(2, 11)}`;
};

const toApiDate = (value: string) => {
  if (!value) {
    return value;
  }
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toISOString();
};

const createEmptyPricingForm = (overrides: Partial<VariantPricingFormState> = {}): VariantPricingFormState => ({
  startDate: "",
  endDate: "",
  mealPlanId: "",
  numberOfRooms: 1,
  vehicleTypeId: "",
  locationSeasonalPeriodId: "",
  description: "",
  isGroupPricing: false,
  pricingComponents: [],
  ...overrides,
});

const formatDateInputValue = (value: string | undefined) => {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().slice(0, 10);
};

const EMPTY_PRICING_LOOKUP: Record<string, any[]> = Object.freeze({});

const PackageVariantsTab: React.FC<PackageVariantsTabProps> = ({
  control,
  form,
  loading,
  hotels,
  availableTourPackages,
  variantPricingLookup,
  tourPackageId,
}) => {
  const watchedItineraries = useWatch({ control, name: "itineraries" }) as unknown;
  const itineraries = useMemo<any[]>(
    () => (Array.isArray(watchedItineraries) ? watchedItineraries : []),
    [watchedItineraries]
  );
  const availablePackages = Array.isArray(availableTourPackages) ? availableTourPackages : [];
  const pricingLookup = useMemo(() => variantPricingLookup ?? EMPTY_PRICING_LOOKUP, [variantPricingLookup]);
  const locationId = useWatch({ control, name: "locationId" }) as string | undefined;
  const currencyFormatter = useMemo(() => new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }), []);

  // Helper: Fetch hotel pricing for a hotel, period, and meal plan
  const fetchHotelPricing = async (hotelId: string, startDate: string, endDate: string, mealPlanId?: string) => {
    try {
      if (!hotelId) return [];
      const params = new URLSearchParams();
      params.set('startDate', startDate);
      params.set('endDate', endDate);
      if (mealPlanId) params.set('mealPlanId', mealPlanId);
      const res = await axios.get(`/api/hotels/${hotelId}/pricing?${params.toString()}`);
      return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
      console.error('[HOTEL_PRICING_FETCH]', err);
      return [];
    }
  };
  
  // Initialize variants from form or use default
  const [variants, setVariants] = useState<PackageVariant[]>(() => {
    console.log('🎬 [VARIANTS INIT] Initializing PackageVariantsTab state...');
    try {
      if (form && typeof form.getValues === 'function') {
        const current = form.getValues("packageVariants");
        console.log('📋 [VARIANTS INIT] Current form value:', {
          exists: !!current,
          type: typeof current,
          isArray: Array.isArray(current),
          length: current?.length,
          data: current
        });
        
        if (current) {
          // If stored as string (older versions), parse it
          if (typeof current === 'string') {
            try {
              const parsed = JSON.parse(current);
              if (Array.isArray(parsed) && parsed.length > 0) {
                console.log('✅ [VARIANTS INIT] Loaded from parsed string:', parsed.length, 'variants');
                return (parsed as PackageVariant[]).map(variant => {
                  const seasonalPricings = variant.id && pricingLookup[variant.id]
                    ? normalizeSeasonalPricingEntries(pricingLookup[variant.id])
                    : [];
                  return {
                    ...variant,
                    hotelMappings: { ...(variant.hotelMappings || {}) },
                    copiedFromTourPackageId: variant.copiedFromTourPackageId ?? undefined,
                    seasonalPricings,
                  };
                });
              }
            } catch (e) {
              console.warn('⚠️ [VARIANTS INIT] Failed to parse string format:', e);
              // ignore parse errors and fall through to default
            }
          } else if (Array.isArray(current) && current.length > 0) {
            console.log('✅ [VARIANTS INIT] Loaded from array:', current.length, 'variants');
            console.log('🏨 [VARIANTS INIT] Hotel mappings:', current.map(v => ({
              name: v.name,
              mappings: v.hotelMappings
            })));
            return (current as PackageVariant[]).map(variant => {
              const seasonalPricings = variant.id && pricingLookup[variant.id]
                ? normalizeSeasonalPricingEntries(pricingLookup[variant.id])
                : [];
              return {
                ...variant,
                hotelMappings: { ...(variant.hotelMappings || {}) },
                copiedFromTourPackageId: variant.copiedFromTourPackageId ?? undefined,
                seasonalPricings,
              };
            });
          }
        }
      }
    } catch (e) {
      console.error('❌ [VARIANTS INIT] Failed to initialize packageVariants from form:', e);
    }
    
    // Default variant if no data from form
    console.log('🆕 [VARIANTS INIT] Using default variant (no data in form)');
    return [{
      name: "Standard",
      description: "Standard package with good quality hotels",
      isDefault: true,
      sortOrder: 0,
      priceModifier: 0,
      hotelMappings: {},
      copiedFromTourPackageId: undefined,
      seasonalPricings: [],
    }];
  });
  
  // State: Hotel pricing cache per variant/pricing/hotel
  const [hotelPricingCache, setHotelPricingCache] = useState<Record<string, any>>({});

  // Effect: Fetch hotel pricing for all variants/pricings/hotels and cache results
  useEffect(() => {
    const fetchAllHotelPricing = async () => {
      const cache: Record<string, any> = {};
      const promises: Array<Promise<void>> = [];
      variants.forEach((variant, variantIdx) => {
        (variant.seasonalPricings || []).forEach((pricing, pricingIdx) => {
          itineraries.forEach((itinerary) => {
            const hotelId = variant.hotelMappings[itinerary.id] || variant.hotelMappings[String(itinerary.dayNumber)];
            if (!hotelId) return;
            const key = `${variantIdx}_${pricingIdx}_${hotelId}`;
            const p = fetchHotelPricing(hotelId, pricing.startDate, pricing.endDate, pricing.mealPlanId ?? undefined)
              .then((result) => { cache[key] = result; })
              .catch((err) => { console.error('[HOTEL_PRICING_FETCH_ERROR]', err); cache[key] = []; });
            promises.push(p);
          });
        });
      });
      await Promise.all(promises);
      setHotelPricingCache(cache);
    };
    fetchAllHotelPricing();
  }, [variants, itineraries]);
  
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [openHotelPopover, setOpenHotelPopover] = useState<string | null>(null);
  const [openVariantSourcePopover, setOpenVariantSourcePopover] = useState<number | null>(null);
  const [pricingLoadingVariant, setPricingLoadingVariant] = useState<number | null>(null);
  const [mealPlans, setMealPlans] = useState<MealPlanOption[]>([]);
  const [pricingAttributes, setPricingAttributes] = useState<PricingAttributeOption[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleTypeOption[]>([]);
  const [seasonalPeriods, setSeasonalPeriods] = useState<SeasonalPeriodOption[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [seasonalPeriodsLoading, setSeasonalPeriodsLoading] = useState(false);
  const [pricingDialogState, setPricingDialogState] = useState<VariantPricingDialogState | null>(null);
  const [pricingFormState, setPricingFormState] = useState<VariantPricingFormState>(createEmptyPricingForm());
  const [savingPricing, setSavingPricing] = useState(false);
  const activeDialogVariant = pricingDialogState ? variants[pricingDialogState.variantIndex] : null;
  const computeFormTotal = (state: VariantPricingFormState) =>
    state.pricingComponents.reduce((sum, component) => sum + toNumber(component.price), 0);
  const pricingFormTotal = computeFormTotal(pricingFormState);

  const convertPricingToFormState = (pricing: VariantPricingDisplay): VariantPricingFormState => ({
    id: pricing.id,
    startDate: formatDateInputValue(pricing.startDate),
    endDate: formatDateInputValue(pricing.endDate),
    mealPlanId: pricing.mealPlanId ?? "",
    numberOfRooms: pricing.numberOfRooms ?? 1,
    vehicleTypeId: pricing.vehicleTypeId ?? "",
    locationSeasonalPeriodId: pricing.locationSeasonalPeriodId ?? "",
    description: pricing.description ?? "",
    isGroupPricing: Boolean(pricing.isGroupPricing),
    pricingComponents: (pricing.components || []).map((component) => ({
      tempId: component.id || generateTempId(),
      pricingAttributeId: component.pricingAttributeId || "",
      price: component.price != null ? component.price.toString() : "",
      purchasePrice: component.purchasePrice != null ? component.purchasePrice.toString() : "",
      description: component.description ?? "",
    })),
  });

  const handlePricingFieldChange = <K extends keyof VariantPricingFormState>(key: K, value: VariantPricingFormState[K]) => {
    setPricingFormState((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handlePricingComponentChange = <K extends keyof VariantPricingComponentFormState>(
    tempId: string,
    key: K,
    value: VariantPricingComponentFormState[K]
  ) => {
    setPricingFormState((prev) => ({
      ...prev,
      pricingComponents: prev.pricingComponents.map((component) =>
        component.tempId === tempId ? { ...component, [key]: value } : component
      ),
    }));
  };

  const handleAddPricingComponent = () => {
    const defaultAttributeId = pricingAttributes[0]?.id ?? "";
    if (!defaultAttributeId) {
      toast.error("No pricing attributes available. Configure pricing attributes first.");
      return;
    }

    setPricingFormState((prev) => ({
      ...prev,
      pricingComponents: [
        ...prev.pricingComponents,
        {
          tempId: generateTempId(),
          pricingAttributeId: defaultAttributeId,
          price: "",
          purchasePrice: "",
          description: "",
        },
      ],
    }));
  };

  const handleRemovePricingComponent = (tempId: string) => {
    setPricingFormState((prev) => ({
      ...prev,
      pricingComponents: prev.pricingComponents.filter((component) => component.tempId !== tempId),
    }));
  };

  const handleOpenPricingDialog = (
    variantIndex: number,
    mode: "create" | "edit",
    pricing?: VariantPricingDisplay
  ) => {
    const variant = variants[variantIndex];
    if (!variant?.id) {
      toast.error('Save the tour package to manage seasonal pricing for this variant.');
      return;
    }

    if (!tourPackageId) {
      toast.error('Save the tour package before managing seasonal pricing.');
      return;
    }

    if (mode === 'edit' && pricing) {
      setPricingFormState(convertPricingToFormState(pricing));
    } else {
      const fallbackMealPlanId = mealPlans[0]?.id ?? '';
      const defaultAttributeId = pricingAttributes[0]?.id;
      const baseForm = createEmptyPricingForm({
        mealPlanId: fallbackMealPlanId,
        pricingComponents: defaultAttributeId
          ? [{
              tempId: generateTempId(),
              pricingAttributeId: defaultAttributeId,
              price: '',
              purchasePrice: '',
              description: '',
            }]
          : [],
      });
      setPricingFormState(baseForm);

      if (!defaultAttributeId) {
        toast('Add components once pricing attributes are configured.');
      }
    }

    setPricingDialogState({
      variantIndex,
      mode,
      pricingId: pricing?.id,
    });
  };

  const handleClosePricingDialog = () => {
    setPricingDialogState(null);
    setPricingFormState(createEmptyPricingForm());
  };

  const refreshVariantPricing = async (variantIndex: number, variantId: string) => {
    if (!tourPackageId) {
      return;
    }

    try {
      setPricingLoadingVariant(variantIndex);
      const response = await axios.get(`/api/tourPackages/${tourPackageId}/pricing`, {
        params: {
          packageVariantId: variantId,
          includeGlobal: true,
        },
      });
      const pricingEntries = normalizeSeasonalPricingEntries(response.data);
      setVariants((prev) => {
        const next = [...prev];
        if (!next[variantIndex]) {
          return prev;
        }
        next[variantIndex] = {
          ...next[variantIndex],
          seasonalPricings: pricingEntries,
        };
        return next;
      });
    } catch (error) {
      console.error('[VARIANTS] Failed to refresh variant pricing', error);
      toast.error('Unable to refresh seasonal pricing.');
    } finally {
      setPricingLoadingVariant(null);
    }
  };

  const handleSaveVariantPricing = async () => {
    if (!pricingDialogState) {
      return;
    }

    const { variantIndex, mode, pricingId } = pricingDialogState;
    const variant = variants[variantIndex];

    if (!tourPackageId || !variant?.id) {
      toast.error('Save the tour package to manage seasonal pricing.');
      return;
    }

    const {
      startDate,
      endDate,
      mealPlanId,
      numberOfRooms,
      vehicleTypeId,
      locationSeasonalPeriodId,
      description,
      isGroupPricing,
      pricingComponents,
    } = pricingFormState;

    if (!startDate || !endDate) {
      toast.error('Please select start and end dates.');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      toast.error('Invalid date selection.');
      return;
    }

    if (end < start) {
      toast.error('End date must be on or after the start date.');
      return;
    }

    if (!mealPlanId) {
      toast.error('Select a meal plan for this pricing period.');
      return;
    }

    if (!Number.isFinite(numberOfRooms) || numberOfRooms < 1) {
      toast.error('Number of rooms must be at least 1.');
      return;
    }

    if (!pricingComponents || pricingComponents.length === 0) {
      toast.error('Add at least one pricing component.');
      return;
    }

    try {
      const sanitizedComponents = pricingComponents.map((component) => {
        const parsedPrice = Number.parseFloat(component.price || '0');
        const parsedPurchasePrice = component.purchasePrice
          ? Number.parseFloat(component.purchasePrice)
          : null;

        if (!component.pricingAttributeId) {
          throw new Error('Each component must have a pricing attribute selected.');
        }

        if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
          throw new Error('Component prices must be valid numbers.');
        }

        if (parsedPurchasePrice != null && (!Number.isFinite(parsedPurchasePrice) || parsedPurchasePrice < 0)) {
          throw new Error('Component purchase prices must be valid numbers.');
        }

        return {
          pricingAttributeId: component.pricingAttributeId,
          price: parsedPrice,
          purchasePrice: parsedPurchasePrice,
          description: component.description ? component.description.trim() : null,
        };
      });

      const payload = {
        startDate: toApiDate(startDate),
        endDate: toApiDate(endDate),
        mealPlanId,
        numberOfRooms,
        vehicleTypeId: vehicleTypeId || null,
        locationSeasonalPeriodId: locationSeasonalPeriodId || null,
        description: description ? description.trim() : null,
        isGroupPricing,
        pricingComponents: sanitizedComponents,
      };

      setSavingPricing(true);
      if (mode === 'edit' && pricingId) {
        await axios.patch(`/api/tourPackages/${tourPackageId}/pricing/${pricingId}`, payload);
        toast.success('Seasonal pricing updated for this variant.');
      } else {
        await axios.post(`/api/tourPackages/${tourPackageId}/pricing`, {
          ...payload,
          packageVariantId: variant.id,
        });
        toast.success('Seasonal pricing added to this variant.');
      }

      handleClosePricingDialog();
      await refreshVariantPricing(variantIndex, variant.id);
    } catch (error: any) {
      console.error('[VARIANTS] Failed to save seasonal pricing', error);
      const message = error?.response?.data || error?.message || 'Failed to save seasonal pricing for this variant.';
      toast.error(message);
    } finally {
      setSavingPricing(false);
    }
  };

  const handleDeleteVariantPricing = async (variantIndex: number, pricing: VariantPricingDisplay) => {
    if (!tourPackageId || !pricing?.id) {
      return;
    }

    const variant = variants[variantIndex];
    if (!variant?.id) {
      return;
    }

    const confirmed = window.confirm(
      `Delete seasonal pricing for ${formatDateRange(pricing.startDate, pricing.endDate)}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setPricingLoadingVariant(variantIndex);
      await axios.delete(`/api/tourPackages/${tourPackageId}/pricing/${pricing.id}`);
      toast.success('Seasonal pricing deleted.');
      await refreshVariantPricing(variantIndex, variant.id);
    } catch (error) {
      console.error('[VARIANTS] Failed to delete seasonal pricing', error);
      toast.error('Unable to delete seasonal pricing.');
    } finally {
      setPricingLoadingVariant(null);
    }
  };

  useEffect(() => {
    const fetchLookups = async () => {
      try {
        setLookupLoading(true);
        const [mealPlansResponse, attributesResponse, vehicleTypesResponse] = await Promise.all([
          axios.get('/api/meal-plans'),
          axios.get('/api/pricing-attributes?isActive=true'),
          axios.get('/api/vehicle-types?isActive=true'),
        ]);

        setMealPlans(Array.isArray(mealPlansResponse.data) ? mealPlansResponse.data : []);
        setPricingAttributes(Array.isArray(attributesResponse.data) ? attributesResponse.data : []);
        setVehicleTypes(Array.isArray(vehicleTypesResponse.data) ? vehicleTypesResponse.data : []);
      } catch (lookupError) {
        console.error('[VARIANTS] Failed to load pricing lookups', lookupError);
        toast.error('Unable to load pricing configuration. Please refresh.');
      } finally {
        setLookupLoading(false);
      }
    };

    fetchLookups();
  }, []);

  useEffect(() => {
    const fetchSeasonalPeriods = async () => {
      if (!locationId) {
        setSeasonalPeriods([]);
        return;
      }

      try {
        setSeasonalPeriodsLoading(true);
        const response = await axios.get(`/api/locations/${locationId}/seasonal-periods`);
        setSeasonalPeriods(Array.isArray(response.data) ? response.data : []);
      } catch (seasonError) {
        console.error('[VARIANTS] Failed to fetch seasonal periods', seasonError);
        toast.error('Unable to load seasonal periods for this location.');
      } finally {
        setSeasonalPeriodsLoading(false);
      }
    };

    fetchSeasonalPeriods();
  }, [locationId]);

  // Sync variants to form whenever they change
  useEffect(() => {
    try {
      if (form && typeof form.setValue === 'function') {
        const variantsForForm = variants.map(({ seasonalPricings, ...variant }) => ({
          ...variant,
        }));
        console.log('🔄 [VARIANTS SYNC] Syncing variants to form:', {
          variantsCount: variants.length,
          variants: variants.map(v => ({
            name: v.name,
            hotelMappingsCount: Object.keys(v.hotelMappings || {}).length,
            hotelMappings: v.hotelMappings,
            seasonalPricingCount: v.seasonalPricings?.length ?? 0,
          }))
        });
        form.setValue("packageVariants", variantsForForm, { shouldValidate: false, shouldDirty: true });
      }
    } catch (e) {
      console.error('Failed to sync packageVariants to form:', e);
    }
  }, [variants, form]);

  // Close any open popovers when switching between variants
  useEffect(() => {
    setOpenHotelPopover(null);
    setOpenVariantSourcePopover(null);
  }, [activeVariantIndex]);

  useEffect(() => {
    if (!pricingLookup || Object.keys(pricingLookup).length === 0) {
      return;
    }

    setVariants((prev) => {
      let updated = false;
      const next = prev.map((variant) => {
        if (!variant.id) {
          return variant;
        }
        const pricingEntries = pricingLookup[variant.id];
        if (!pricingEntries || pricingEntries.length === 0) {
          return variant;
        }
        if (variant.seasonalPricings && variant.seasonalPricings.length > 0) {
          return variant;
        }
        updated = true;
        return {
          ...variant,
          seasonalPricings: normalizeSeasonalPricingEntries(pricingEntries),
        };
      });

      return updated ? next : prev;
    });
  }, [pricingLookup]);

  const addVariant = () => {
    const newVariant: PackageVariant = {
      name: `Variant ${variants.length + 1}`,
      description: "",
      isDefault: false,
      sortOrder: variants.length,
      priceModifier: 0,
      hotelMappings: {},
      copiedFromTourPackageId: undefined,
      seasonalPricings: [],
    };
    setVariants([...variants, newVariant]);
    setActiveVariantIndex(variants.length);
  };

  const deleteVariant = (index: number) => {
    if (variants.length <= 1) {
      alert("Cannot delete the last variant");
      return;
    }
    const updated = variants.filter((_, i) => i !== index);
    setVariants(updated);
    if (activeVariantIndex >= updated.length) {
      setActiveVariantIndex(updated.length - 1);
    }
  };

  const updateVariant = (index: number, updates: Partial<PackageVariant>) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], ...updates };
    setVariants(updated);
  };

  const updateHotelMapping = (variantIndex: number, itineraryId: string, hotelId: string) => {
    // CRITICAL: Use itinerary.id as primary key for stable, unique mappings
    // Only fall back to dayNumber if id is missing (backward compatibility)
    const itinerary = itineraries.find(i => i.id === itineraryId);
    const key = itineraryId || (itinerary && typeof itinerary.dayNumber === 'number' ? String(itinerary.dayNumber) : `fallback-${itineraryId}`);
    
    console.log('🏨 [HOTEL MAPPING] Updating hotel:', {
      variantIndex,
      variantName: variants[variantIndex]?.name,
      itineraryId,
      itineraryDayNumber: itinerary?.dayNumber,
      mappingKey: key,
      hotelId,
      hotelName: hotels.find(h => h.id === hotelId)?.name
    });
    
    const updated = [...variants];
    updated[variantIndex].hotelMappings = { ...(updated[variantIndex].hotelMappings || {}) };
    updated[variantIndex].hotelMappings[key] = hotelId;
    
    console.log('🏨 [HOTEL MAPPING] Updated mappings:', updated[variantIndex].hotelMappings);
    setVariants(updated);
  };

  const normalizeItineraryOrder = (list: any[]) => {
    return (Array.isArray(list) ? list : []).map((entry, index) => {
      const rawDay = entry?.dayNumber;
      const numericDay = typeof rawDay === 'number'
        ? rawDay
        : typeof rawDay === 'string'
          ? Number.parseInt(rawDay, 10)
          : Number.NaN;

      return {
        data: entry,
        order: Number.isFinite(numericDay) ? numericDay : index + 1,
        index,
      };
    }).sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.index - b.index;
    });
  };

  const applyHotelsFromTourPackage = async (variantIndex: number, tourPackageId: string) => {
    const selectedPackage = availablePackages.find(pkg => pkg.id === tourPackageId);
    if (!selectedPackage) {
      toast.error("Selected tour package could not be found.");
      return;
    }

    const currentDayCount = itineraries.length;
    const selectedDayCount = selectedPackage.itineraries?.length ?? 0;

    if (selectedDayCount !== currentDayCount) {
      toast.error(`Day mismatch: selected package has ${selectedDayCount} day(s) while this package has ${currentDayCount}.`);
      return;
    }

    const currentOrdered = normalizeItineraryOrder(itineraries);
    const selectedOrdered = normalizeItineraryOrder(selectedPackage.itineraries);
    const nextMappings: Record<string, string> = {};
    const missingHotelDays: number[] = [];

    currentOrdered.forEach((currentEntry, orderIndex) => {
      const currentItinerary = currentEntry.data;
      if (!currentItinerary) {
        return;
      }

      const sourceItinerary = selectedOrdered[orderIndex]?.data;
      const dayNumber = Number.isFinite(currentEntry.order) ? currentEntry.order : orderIndex + 1;

      const mappingKey = currentItinerary.id
        || (Number.isFinite(dayNumber)
          ? String(dayNumber)
          : `fallback-${orderIndex}`);

      const sourceHotelId = sourceItinerary?.hotelId;

      if (sourceHotelId) {
        nextMappings[mappingKey] = sourceHotelId;
      } else {
        missingHotelDays.push(dayNumber);
      }
    });

    setVariants(prev => {
      const next = [...prev];
      if (!next[variantIndex]) {
        return prev;
      }
      next[variantIndex] = {
        ...next[variantIndex],
        hotelMappings: nextMappings,
        copiedFromTourPackageId: undefined,
        seasonalPricings: [],
      };
      return next;
    });
    setOpenVariantSourcePopover(null);

    if (missingHotelDays.length > 0) {
      toast(`Hotels copied, but no hotel was set for day(s): ${missingHotelDays.join(', ')} in the selected package.`);
    } else {
      toast.success("Hotels copied from the selected tour package.");
    }

    setPricingLoadingVariant(variantIndex);
    try {
      const response = await axios.get(`/api/tourPackages/${tourPackageId}/pricing`, {
        params: {
          onlyGlobal: true,
        },
      });
      const rawEntries = Array.isArray(response?.data)
        ? response.data.filter((entry: any) => !entry?.packageVariantId)
        : [];
      const pricingEntries = normalizeSeasonalPricingEntries(rawEntries);
      setVariants(prev => {
        const next = [...prev];
        if (!next[variantIndex]) {
          return prev;
        }
        next[variantIndex] = {
          ...next[variantIndex],
          seasonalPricings: pricingEntries,
          copiedFromTourPackageId: undefined,
        };
        return next;
      });

      if (pricingEntries.length > 0) {
        toast.success("Seasonal pricing copied to this variant.");
      } else {
        toast("Selected tour package has no seasonal pricing to copy.");
      }
    } catch (pricingError) {
      console.error('[VARIANT_PRICING_COPY_ERROR]', pricingError);
      toast.error("Unable to copy seasonal pricing from the selected tour package.");
    } finally {
      setPricingLoadingVariant(null);
    }
  };

  const copyFirstVariantHotels = () => {
    if (variants.length <= 1) return;
    const firstVariantMappings = variants[0].hotelMappings;
    const firstVariantPricing = variants[0].seasonalPricings ?? [];
    const updated = variants.map((variant, idx) => {
      if (idx === 0) return variant;
      return {
        ...variant,
        hotelMappings: { ...firstVariantMappings },
        seasonalPricings: firstVariantPricing.map((pricing) => ({ ...pricing, components: pricing.components.map((component) => ({ ...component })) })),
      };
    });
    setVariants(updated);
    alert("Hotels from first variant copied to all variants");
  };

  const applyHotelsFromCurrentPackage = (variantIndex: number) => {
    const nextMappings: Record<string, string> = {};
    const missingHotelDays: number[] = [];

    // Extract hotels from current itineraries in Hotels Tab
    itineraries.forEach((itinerary, orderIndex) => {
      const dayNumber = Number.isFinite(itinerary.dayNumber) ? itinerary.dayNumber : orderIndex + 1;
      
      const mappingKey = itinerary.id
        || (Number.isFinite(dayNumber)
          ? String(dayNumber)
          : `fallback-${orderIndex}`);

      const hotelId = itinerary.hotelId;

      if (hotelId) {
        nextMappings[mappingKey] = hotelId;
      } else {
        missingHotelDays.push(dayNumber);
      }
    });

    setVariants(prev => {
      const next = [...prev];
      if (!next[variantIndex]) {
        return prev;
      }
      next[variantIndex] = {
        ...next[variantIndex],
        hotelMappings: nextMappings,
      };
      return next;
    });

    if (missingHotelDays.length > 0) {
      toast(`Hotels applied, but no hotel is set for day(s): ${missingHotelDays.join(', ')} in the Hotels tab.`);
    } else {
      toast.success("Hotels from this package applied to variant.");
    }
  };

  if (itineraries.length === 0) {
    return (
      <Card className="border-dashed border-2">
        <CardHeader>
          <CardTitle className="text-sm">No itineraries added yet</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          Add day-wise itineraries first in the Itinerary tab before creating package variants.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="shadow-sm border border-slate-200/70 bg-gradient-to-r from-white to-slate-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> Package Variants
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Create multiple package tiers (Luxury, Premium, Standard) with different hotels
              </p>
            </div>
            <Badge variant="outline" className="bg-white/60 backdrop-blur text-xs font-medium">
              {variants.length} Variant{variants.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-2 flex flex-wrap gap-3">
          <Button
            type="button"
            variant="default"
            size="sm"
            className="h-8 px-3 text-xs flex items-center gap-1"
            disabled={loading}
            onClick={addVariant}
          >
            <Plus className="h-3.5 w-3.5" /> Add Variant
          </Button>
          {variants.length > 1 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs flex items-center gap-1 border-primary/40 hover:bg-primary/10"
              disabled={loading}
              onClick={copyFirstVariantHotels}
            >
              <Copy className="h-3.5 w-3.5" /> Copy First Variant Hotels
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Package variants allow you to offer the same itinerary with different hotel options. Perfect for offering Luxury, Premium, and Standard packages.
        </AlertDescription>
      </Alert>

      {/* Variants Tabs */}
      <Tabs value={activeVariantIndex.toString()} onValueChange={(v) => setActiveVariantIndex(parseInt(v))}>
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${variants.length}, 1fr)` }}>
          {variants.map((variant, index) => (
            <TabsTrigger key={index} value={index.toString()} className="text-xs">
              {variant.name}
              {variant.isDefault && <Badge className="ml-1 h-4 px-1 text-[10px]">Default</Badge>}
            </TabsTrigger>
          ))}
        </TabsList>

        {variants.map((variant, variantIndex) => {
          const selectedSourcePackage = variant.copiedFromTourPackageId
            ? availablePackages.find(pkg => pkg.id === variant.copiedFromTourPackageId)
            : undefined;
          const selectedPackageDayCount = selectedSourcePackage?.itineraries?.length ?? 0;
          const requiredDayCount = itineraries.length;
          const variantSourcePopoverOpen = openVariantSourcePopover === variantIndex;

          return (
            <TabsContent key={variantIndex} value={variantIndex.toString()} className="space-y-4">
              {/* Variant Settings */}
              <Card>
                <CardHeader className="pb-3 border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-t-md">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>Variant Settings</span>
                    {variants.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => deleteVariant(variantIndex)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Variant Name *</Label>
                      <Input
                        placeholder="e.g., Luxury, Premium, Standard"
                        value={variant.name}
                        onChange={(e) => updateVariant(variantIndex, { name: e.target.value })}
                        className="text-sm"
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Price Modifier (%)</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 50 for 50% increase"
                        value={variant.priceModifier || 0}
                        onChange={(e) => updateVariant(variantIndex, { priceModifier: parseFloat(e.target.value) || 0 })}
                        className="text-sm"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Description</Label>
                    <Textarea
                      placeholder="Describe what makes this variant special..."
                      value={variant.description || ""}
                      onChange={(e) => updateVariant(variantIndex, { description: e.target.value })}
                      className="text-sm min-h-[60px]"
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Copy Hotels From Tour Package</Label>
                    {availablePackages.length > 0 ? (
                      <Popover
                        open={variantSourcePopoverOpen}
                        onOpenChange={(open) => {
                          setOpenVariantSourcePopover(open ? variantIndex : null);
                          if (open) {
                            setOpenHotelPopover(null);
                          }
                        }}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full justify-between bg-white hover:bg-primary/10 transition"
                            disabled={loading}
                          >
                            <span className="truncate text-xs font-medium">
                              {selectedSourcePackage ? (selectedSourcePackage.tourPackageName || "Untitled package") : "Select tour package"}
                            </span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {selectedSourcePackage
                                  ? `${selectedPackageDayCount} day${selectedPackageDayCount === 1 ? "" : "s"}`
                                  : `${requiredDayCount} day${requiredDayCount === 1 ? "" : "s"}`}
                              </Badge>
                              <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
                            </div>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[360px] p-0" align="start" side="bottom" sideOffset={5}>
                          <Command>
                            <CommandInput placeholder="Search tour package..." className="text-xs" />
                            <CommandList className="max-h-60 overflow-auto">
                              <CommandEmpty>No tour packages found.</CommandEmpty>
                              <CommandGroup>
                                {availablePackages.map((pkg) => {
                                  const packageDayCount = pkg.itineraries?.length ?? 0;
                                  const hasDayMismatch = packageDayCount !== requiredDayCount;
                                  const packageName = pkg.tourPackageName || "Untitled package";
                                  const isSelected = variant.copiedFromTourPackageId === pkg.id;

                                  return (
                                    <CommandItem
                                      key={pkg.id}
                                      value={packageName}
                                      onSelect={async () => {
                                        if (hasDayMismatch) {
                                          toast.error(`Day mismatch: selected package has ${packageDayCount} day(s) while this package has ${requiredDayCount}.`);
                                          setOpenVariantSourcePopover(variantIndex);
                                          return;
                                        }
                                        await applyHotelsFromTourPackage(variantIndex, pkg.id);
                                      }}
                                      className={`text-xs cursor-pointer flex items-center justify-between gap-2 ${hasDayMismatch ? 'opacity-60' : ''}`}
                                    >
                                      <div className="flex flex-col text-left">
                                        <span className="font-medium">{packageName}</span>
                                        <span className="text-[10px] text-muted-foreground">{packageDayCount} day{packageDayCount === 1 ? '' : 's'}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {hasDayMismatch ? (
                                          <Badge variant="destructive" className="text-[10px]">Mismatch</Badge>
                                        ) : (
                                          <Badge variant="secondary" className="text-[10px]">Apply</Badge>
                                        )}
                                        {isSelected && <Check className="h-3 w-3 text-primary" />}
                                      </div>
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full justify-between text-xs"
                        disabled
                      >
                        No tour packages available
                      </Button>
                    )}
                    {selectedSourcePackage && (
                      <p className="text-[11px] text-muted-foreground">
                        Hotels copied from: {selectedSourcePackage.tourPackageName || 'Untitled package'}
                      </p>
                    )}
                  </div>

                  {/* Use Hotels From This Package Button */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Or Use Hotels From This Package</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full justify-center text-xs bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border-emerald-200/50"
                      onClick={() => applyHotelsFromCurrentPackage(variantIndex)}
                      disabled={loading}
                    >
                      <HotelIcon className="h-3.5 w-3.5 mr-1.5" />
                      <span>Quick Apply Hotels from Hotels Tab</span>
                    </Button>
                    <p className="text-[10px] text-muted-foreground italic">
                      💡 Applies the hotels you&apos;ve already selected in the Hotels tab to this variant with one click
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`default-${variantIndex}`}
                      checked={variant.isDefault}
                      onCheckedChange={(checked) => {
                        const updated = variants.map((v, i) => ({
                          ...v,
                          isDefault: i === variantIndex ? Boolean(checked) : false,
                        }));
                        setVariants(updated);
                      }}
                      disabled={loading}
                    />
                    <Label htmlFor={`default-${variantIndex}`} className="text-xs font-normal cursor-pointer">
                      Set as default variant
                    </Label>
                  </div>
                </CardContent>
              </Card>

              {/* Hotel Assignments */}
              <Card>
                <CardHeader className="pb-3 border-b bg-gradient-to-r from-orange-500/10 via-orange-500/5 to-transparent rounded-t-md">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <HotelIcon className="h-4 w-4 text-orange-600" /> Hotel Assignments
                  </CardTitle>
                  {Object.keys(variant.hotelMappings).length === 0 && (
                    <p className="text-xs text-orange-600 mt-1 font-normal">
                      ⚠️ No hotels assigned yet. Please select a hotel for each day below.
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  {itineraries.map((itinerary, itineraryIndex) => {
                    // Support mappings keyed by itinerary.id or by dayNumber (string)
                    const selectedHotelId = variant.hotelMappings[itinerary.id] || variant.hotelMappings[String(itinerary.dayNumber)] || "";
                    const selectedHotel = hotels.find(h => h.id === selectedHotelId);
                    // Use itinerary.id as primary key, fallback to index to ensure unique popover keys
                    const popoverKey = `${variantIndex}-${itinerary.id || `index-${itineraryIndex}`}`;
                    const isOpen = openHotelPopover === popoverKey;

                    return (
                      <div key={itinerary.id || itineraryIndex} className="border rounded-lg p-3 bg-white">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="h-6 w-6 rounded-full flex items-center justify-center p-0 font-semibold">
                                {itinerary.dayNumber || itineraryIndex + 1}
                              </Badge>
                              <span className="font-medium text-sm" dangerouslySetInnerHTML={{ __html: itinerary.itineraryTitle || `Day ${itineraryIndex + 1}` }} />
                            </div>
                            {itinerary.days && (
                              <p className="text-xs text-muted-foreground mt-1 ml-8">{itinerary.days}</p>
                            )}
                          </div>
                        </div>
                        <div className="ml-8">
                          <Label className="text-[11px] font-medium uppercase tracking-wide text-slate-600 mb-2 block">Select Hotel</Label>
                          <Popover 
                            open={isOpen} 
                            onOpenChange={(open) => {
                              // Only allow opening one popover at a time
                              setOpenHotelPopover(open ? popoverKey : null);
                              if (open) {
                                setOpenVariantSourcePopover(null);
                              }
                            }}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full justify-between bg-white hover:bg-orange-50/50 transition"
                                disabled={loading}
                              >
                                <span className="truncate text-xs font-medium">
                                  {selectedHotel ? selectedHotel.name : 'Choose hotel'}
                                </span>
                                <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[320px] p-0" align="start" side="bottom" sideOffset={5}>
                              <Command>
                                <CommandInput placeholder="Search hotel..." className="text-xs" />
                                <CommandList className="max-h-60 overflow-auto">
                                  <CommandEmpty>No hotel found.</CommandEmpty>
                                  <CommandGroup>
                                    {hotels.map(h => (
                                      <CommandItem
                                        key={h.id}
                                        value={h.name}
                                        onSelect={() => {
                                          updateHotelMapping(variantIndex, itinerary.id, h.id);
                                          setOpenHotelPopover(null);
                                        }}
                                        className="text-xs cursor-pointer"
                                      >
                                        {h.images?.[0]?.url && (
                                          <Image
                                            src={h.images[0].url}
                                            alt={h.name}
                                            width={28}
                                            height={20}
                                            className="mr-2 rounded object-cover"
                                          />
                                        )}
                                        <span className="truncate flex-1">{h.name}</span>
                                        {selectedHotelId === h.id && <Check className="h-3.5 w-3.5 text-primary" />}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          {selectedHotel && selectedHotel.images?.[0]?.url && (
                            <div className="mt-2">
                              <Image
                                src={selectedHotel.images[0].url}
                                alt={selectedHotel.name}
                                width={120}
                                height={80}
                                className="rounded object-cover"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Seasonal Pricing Preview */}
              <Card>
                <CardHeader className="pb-3 border-b bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent rounded-t-md">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-emerald-600" /> Seasonal Pricing
                      </CardTitle>
                      {variant.id ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-xs flex items-center gap-1 border-emerald-500/30 hover:bg-emerald-500/10"
                          onClick={() => handleOpenPricingDialog(variantIndex, 'create')}
                          disabled={loading || lookupLoading}
                        >
                          <Plus className="h-3.5 w-3.5" /> New Period
                        </Button>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-white/60">
                          Save variant to add pricing
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Define date-bound pricing blocks, attach components, and curate variant-specific rates with one click.
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {pricingLoadingVariant === variantIndex ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-600" /> Fetching seasonal pricing...
                    </div>
                  ) : variant.seasonalPricings.length === 0 ? (
                    <div className="border border-dashed border-emerald-200/70 rounded-md bg-emerald-50/40 p-4 text-xs text-muted-foreground">
                      {variant.id
                        ? variant.copiedFromTourPackageId
                          ? "Selected tour package has no seasonal pricing entries to copy."
                          : "Seasonal pricing keeps this variant competitive across peak and lean periods. Add your first rate block to begin."
                        : "Save this tour package to unlock seasonal pricing for the variant."}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {variant.seasonalPricings.map((pricing, pricingIndex) => {
                        const components = pricing.components || [];
                        const totalPriceLabel = currencyFormatter.format(pricing.totalComponentPrice || 0);
                        return (
                          <div
                            key={`${pricing.id}-${pricingIndex}`}
                            className="rounded-lg border bg-white p-4 shadow-sm space-y-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                                  <Calendar className="h-4 w-4 text-emerald-600" />
                                  {formatDateRange(pricing.startDate, pricing.endDate)}
                                </div>
                                {(pricing.seasonName || pricing.seasonType) && (
                                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                    <span className="font-medium text-emerald-700/80">
                                      {pricing.seasonName || pricing.seasonType}
                                    </span>
                                    <span className="hidden sm:inline">•</span>
                                    <span>
                                      {pricing.mealPlanName || 'Meal plan not set'}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-emerald-700 hover:bg-emerald-50"
                                  onClick={() => handleOpenPricingDialog(variantIndex, 'edit', pricing)}
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-600 hover:bg-red-50"
                                  onClick={() => handleDeleteVariantPricing(variantIndex, pricing)}
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline" className="text-[10px]">
                                {pricing.numberOfRooms} room{pricing.numberOfRooms === 1 ? '' : 's'}
                              </Badge>
                              {pricing.isGroupPricing && (
                                <Badge variant="default" className="text-[10px] bg-emerald-600/90 hover:bg-emerald-600">
                                  Group Departure
                                </Badge>
                              )}
                              {pricing.vehicleTypeName && (
                                <Badge variant="outline" className="text-[10px]">
                                  {pricing.vehicleTypeName}
                                </Badge>
                              )}
                            </div>

                            {pricing.description && (
                              <p className="text-xs text-muted-foreground bg-slate-50 border border-slate-100 rounded-md p-2">
                                {pricing.description}
                              </p>
                            )}

                            <div className="space-y-2">
                              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 flex items-center justify-between">
                                <span>Components</span>
                                <span className="text-[10px] text-muted-foreground">{components.length} item{components.length === 1 ? '' : 's'}</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {components.length > 0 ? (
                                  components.map((component) => (
                                    <Badge
                                      key={component.id}
                                      variant="outline"
                                      className="text-[10px] bg-white border-slate-200 flex items-center gap-1"
                                    >
                                      <IndianRupee className="h-3 w-3" />
                                      <span className="font-medium text-slate-800">{component.name}</span>
                                      <span className="inline-block h-3 w-px bg-slate-200" />
                                      <span>{currencyFormatter.format(component.price)}</span>
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-[11px] text-muted-foreground">
                                    No component breakdown saved.
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                              <span className="text-xs text-muted-foreground">Total Component Price</span>
                              <span className="text-sm font-semibold text-slate-900 flex items-center gap-1">
                                <IndianRupee className="h-3 w-3 text-emerald-600" />
                                {totalPriceLabel}
                              </span>
                            </div>

                            {/* Hotel Pricing Breakdown */}
                            <div className="mt-4">
                              <div className="text-xs font-semibold text-slate-700 mb-1">Hotel Pricing Breakdown</div>
                              {itineraries.map((itinerary) => {
                                const hotelId = variant.hotelMappings[itinerary.id] || variant.hotelMappings[String(itinerary.dayNumber)];
                                if (!hotelId) return null;
                                const key = `${variantIndex}_${pricingIndex}_${hotelId}`;
                                const hotel = hotels.find(h => h.id === hotelId);
                                const pricingList = hotelPricingCache[key] || [];
                                return (
                                  <div key={hotelId} className="mb-2 border rounded p-2 bg-slate-50">
                                    <div className="font-medium text-xs mb-1 flex items-center gap-2">
                                      <span>{hotel?.name || 'Hotel'}</span>
                                      {hotel?.images?.[0]?.url && (
                                        <Image src={hotel.images[0].url} alt={hotel.name} width={32} height={24} className="rounded object-cover" />
                                      )}
                                    </div>
                                    {pricingList.length === 0 ? (
                                      <span className="text-[11px] text-muted-foreground">No pricing found for this period/meal plan.</span>
                                    ) : (
                                      <table className="text-[11px] w-full">
                                        <thead>
                                          <tr>
                                            <th className="text-left">Room Type</th>
                                            <th className="text-left">Occupancy</th>
                                            <th className="text-left">Meal Plan</th>
                                            <th className="text-right">Price</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {pricingList.map((hp: any) => (
                                            <tr key={hp.id}>
                                              <td>{hp.roomType?.name || '-'}</td>
                                              <td>{hp.occupancyType?.name || '-'}</td>
                                              <td>{hp.mealPlan?.name || '-'}</td>
                                              <td className="text-right">{currencyFormatter.format(hp.price)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <p className="text-[11px] text-muted-foreground">
                    Seasonal pricing is previewed here. Save the tour package to persist edits, and remember to review core pricing if you add overlapping periods.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>

      <Dialog
        open={Boolean(pricingDialogState)}
        onOpenChange={(open) => {
          if (!open) {
            handleClosePricingDialog();
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-emerald-600" />
              {pricingDialogState?.mode === 'edit' ? 'Edit Seasonal Pricing' : 'Create Seasonal Pricing'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {activeDialogVariant ? `Variant: ${activeDialogVariant.name}` : 'Configure seasonal pricing for this variant.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs">Start Date</Label>
                <Input
                  type="date"
                  value={pricingFormState.startDate}
                  onChange={(event) => handlePricingFieldChange('startDate', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">End Date</Label>
                <Input
                  type="date"
                  value={pricingFormState.endDate}
                  onChange={(event) => handlePricingFieldChange('endDate', event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs">Seasonal Period (optional)</Label>
                <Select
                  value={pricingFormState.locationSeasonalPeriodId || ''}
                  onValueChange={(value) => handlePricingFieldChange('locationSeasonalPeriodId', value || '')}
                  disabled={seasonalPeriodsLoading || seasonalPeriods.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={seasonalPeriodsLoading ? 'Loading...' : 'Manual date range'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Manual date range</SelectItem>
                    {seasonalPeriods.map((period) => (
                      <SelectItem key={period.id} value={period.id}>
                        {period.name}
                        {period.seasonType ? ` • ${period.seasonType}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Meal Plan</Label>
                <Select
                  value={pricingFormState.mealPlanId}
                  onValueChange={(value) => handlePricingFieldChange('mealPlanId', value)}
                  disabled={lookupLoading || mealPlans.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={lookupLoading ? 'Loading...' : 'Select meal plan'} />
                  </SelectTrigger>
                  <SelectContent>
                    {mealPlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-xs">Number of Rooms</Label>
                <Input
                  type="number"
                  min={1}
                  value={pricingFormState.numberOfRooms}
                  onChange={(event) => {
                    const value = Number.parseInt(event.target.value, 10);
                    handlePricingFieldChange('numberOfRooms', Number.isFinite(value) && value > 0 ? value : 1);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Vehicle Type</Label>
                <Select
                  value={pricingFormState.vehicleTypeId || ''}
                  onValueChange={(value) => handlePricingFieldChange('vehicleTypeId', value || '')}
                  disabled={lookupLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No vehicle</SelectItem>
                    {vehicleTypes.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Group Departure</Label>
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="text-xs text-muted-foreground">Mark as group pricing</span>
                  <Switch
                    checked={pricingFormState.isGroupPricing}
                    onCheckedChange={(checked) => handlePricingFieldChange('isGroupPricing', Boolean(checked))}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Internal Notes</Label>
              <Textarea
                rows={3}
                value={pricingFormState.description || ''}
                onChange={(event) => handlePricingFieldChange('description', event.target.value)}
                placeholder="Highlight inclusions, blackout rules, or supplier-specific notes."
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs uppercase tracking-wide text-slate-500">Pricing Components</Label>
                  <p className="text-[11px] text-muted-foreground">Break down cost drivers like occupancy, transfers, or add-ons.</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 text-xs"
                  onClick={handleAddPricingComponent}
                  disabled={lookupLoading || pricingAttributes.length === 0}
                >
                  <Plus className="h-3.5 w-3.5" /> Add Component
                </Button>
              </div>

              {pricingFormState.pricingComponents.length === 0 ? (
                <div className="rounded-md border border-dashed border-slate-200 bg-slate-50/60 p-4 text-xs text-muted-foreground">
                  Add at least one pricing component to finalise this seasonal rate.
                </div>
              ) : (
                <div className="space-y-2">
                  {pricingFormState.pricingComponents.map((component) => (
                    <div
                      key={component.tempId}
                      className="grid gap-2 rounded-lg border border-slate-200/80 bg-white/80 p-3 md:grid-cols-[minmax(0,1fr)_120px_120px_minmax(0,1fr)_40px]"
                    >
                      <Select
                        value={component.pricingAttributeId}
                        onValueChange={(value) => handlePricingComponentChange(component.tempId, 'pricingAttributeId', value)}
                        disabled={lookupLoading || pricingAttributes.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={lookupLoading ? 'Loading...' : 'Component type'} />
                        </SelectTrigger>
                        <SelectContent>
                          {pricingAttributes.map((attribute) => (
                            <SelectItem key={attribute.id} value={attribute.id}>
                              {attribute.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={component.price}
                        onChange={(event) => handlePricingComponentChange(component.tempId, 'price', event.target.value)}
                        placeholder="Sale"
                      />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={component.purchasePrice || ''}
                        onChange={(event) => handlePricingComponentChange(component.tempId, 'purchasePrice', event.target.value)}
                        placeholder="Purchase"
                      />
                      <Input
                        value={component.description || ''}
                        onChange={(event) => handlePricingComponentChange(component.tempId, 'description', event.target.value)}
                        placeholder="Optional description"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-600 hover:bg-red-50"
                        onClick={() => handleRemovePricingComponent(component.tempId)}
                        disabled={pricingFormState.pricingComponents.length === 1}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-500/40 bg-emerald-50/60 px-4 py-3">
              <div className="text-xs text-muted-foreground">
                Variant total preview
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                <IndianRupee className="h-4 w-4" />
                {currencyFormatter.format(pricingFormTotal)}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClosePricingDialog}
              disabled={savingPricing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveVariantPricing}
              disabled={savingPricing || lookupLoading || pricingFormState.pricingComponents.length === 0}
            >
              {savingPricing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving
                </>
              ) : (
                'Save Pricing'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Summary */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          {variants.map((variant, index) => {
            // Build a list of hotel assignments per itinerary
            // Support both itinerary.id and dayNumber (string) as mapping keys
            const assignments: Array<{itinerary: any, hotel: any}> = [];
            const pricingCount = variant.seasonalPricings?.length ?? 0;
            
            itineraries.forEach(itinerary => {
              // Check both possible key formats: itinerary.id or String(dayNumber)
              const hotelId = variant.hotelMappings[itinerary.id] 
                           || variant.hotelMappings[String(itinerary.dayNumber)];
              
              if (hotelId) {
                const hotel = hotels.find(h => h.id === hotelId);
                if (hotel) {
                  assignments.push({ itinerary, hotel });
                }
              }
            });
            
            const assignedCount = assignments.length;
            const totalDays = itineraries.length;
            const isComplete = assignedCount === totalDays;
            
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-white rounded border">
                  <span className="font-medium">{variant.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={isComplete ? "default" : "destructive"} className="text-xs">
                      {assignedCount}/{totalDays} Hotels Assigned
                    </Badge>
                    <Badge variant={pricingCount > 0 ? "default" : "outline"} className="text-xs">
                      {pricingCount} Seasonal Pricing
                    </Badge>
                  </div>
                </div>
                {assignedCount > 0 && (
                  <div className="ml-2 space-y-1 text-[10px] text-muted-foreground">
                    {assignments.map(({ itinerary, hotel }) => (
                      <div key={itinerary.id} className="flex items-center gap-2">
                        <Badge variant="outline" className="h-4 w-4 rounded-full flex items-center justify-center p-0 text-[9px]">
                          {itinerary.dayNumber}
                        </Badge>
                        <span className="truncate">{hotel.name}</span>
                      </div>
                    ))}
                  </div>
                )}
                {pricingCount > 0 && (
                  <div className="ml-2 mt-2 space-y-2">
                    {variant.seasonalPricings.map((pricing, pricingIdx) => {
                      const components = pricing.components || [];
                      const totalPrice = currencyFormatter.format(pricing.totalComponentPrice || 0);
                      return (
                        <div key={`${pricing.id}-${pricingIdx}`} className="border border-emerald-200/60 bg-emerald-50/40 rounded-md p-2 space-y-1 text-[10px]">
                          <div className="flex items-center justify-between font-semibold text-emerald-900">
                            <span>{formatDateRange(pricing.startDate, pricing.endDate)}</span>
                            <span className="flex items-center gap-1 text-emerald-700">
                              <IndianRupee className="h-3 w-3" />{totalPrice}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1 text-[9px] text-muted-foreground">
                            {pricing.mealPlanName && (
                              <Badge variant="outline" className="text-[9px]">
                                {pricing.mealPlanName}
                              </Badge>
                            )}
                            {pricing.numberOfRooms ? (
                              <Badge variant="outline" className="text-[9px]">
                                {pricing.numberOfRooms} room{pricing.numberOfRooms === 1 ? '' : 's'}
                              </Badge>
                            ) : null}
                            {pricing.isGroupPricing && (
                              <Badge variant="default" className="text-[9px] bg-emerald-600/90">
                                Group Departure
                              </Badge>
                            )}
                            {pricing.vehicleTypeName && (
                              <Badge variant="outline" className="text-[9px]">
                                {pricing.vehicleTypeName}
                              </Badge>
                            )}
                            {pricing.seasonName && (
                              <Badge variant="outline" className="text-[9px]">
                                {pricing.seasonName}
                              </Badge>
                            )}
                          </div>
                          {pricing.description && (
                            <p className="text-[9px] text-muted-foreground">
                              {pricing.description}
                            </p>
                          )}
                          {components.length > 0 && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                                <span>Components</span>
                                <span>{components.length} item{components.length === 1 ? '' : 's'}</span>
                              </div>
                              <div className="grid grid-cols-1 gap-1">
                                {components.map((component) => (
                                  <div key={component.id} className="flex items-center justify-between rounded border border-emerald-100 bg-white px-2 py-1">
                                    <span className="font-medium">{component.name}</span>
                                    <span className="flex items-center gap-1 text-emerald-700">
                                      <IndianRupee className="h-3 w-3" />
                                      {currencyFormatter.format(component.price)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* packageVariants is synced to the form using form.setValue - no hidden input required */}
    </div>
  );
};

export default PackageVariantsTab;
