"use client"

import * as z from "zod"
import axios from "axios"
import { JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, useEffect, useMemo, useRef, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { FieldErrors, useFieldArray, useForm } from "react-hook-form"
import { toast } from "react-hot-toast"
import { CheckIcon, ChevronDown, ChevronUp, Trash, Plus, ListChecks, AlertCircle, ScrollText, GripVertical, ImageIcon, Type, AlignLeft, Calendar as CalendarIcon } from "lucide-react"
import {
  Activity,
  Images,
  ItineraryMaster,
  RoomType,
  OccupancyType,
  MealPlan,
  VehicleType,
  Location,
  Hotel,
  TourPackage,
  Itinerary,
  FlightDetails,
  ActivityMaster,
  PackageVariant as PrismaPackageVariant,
  TourPackagePricing,
  PricingComponent,
  PricingAttribute,
  LocationSeasonalPeriod,
} from "@prisma/client"
import { useParams, useRouter } from "next/navigation"
import JoditEditor from "jodit-react";

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Users, MapPin, ListPlus, Plane, Tag, FileCheck, Building2, Sparkles } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Heading } from "@/components/ui/heading"
import { AlertModal } from "@/components/modals/alert-modal"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import ImageUpload from "@/components/ui/image-upload"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { AIRLINE_CANCELLATION_POLICY_DEFAULT, CANCELLATION_POLICY_DEFAULT, EXCLUSIONS_DEFAULT, IMPORTANT_NOTES_DEFAULT, INCLUSIONS_DEFAULT, KITCHEN_GROUP_POLICY_DEFAULT, PAYMENT_TERMS_DEFAULT, TERMS_AND_CONDITIONS_DEFAULT, USEFUL_TIPS_DEFAULT, TOTAL_PRICE_DEFAULT, TOUR_PACKAGE_TYPE_DEFAULT, TOUR_CATEGORY_DEFAULT, PRICE_DEFAULT, DEFAULT_PRICING_SECTION } from "./defaultValues"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { CaretSortIcon } from "@radix-ui/react-icons"
import { Switch } from "@/components/ui/switch"
import { PolicyField } from "./policy-fields";
import { DevTool } from "@hookform/devtools"
import HotelsTab from "@/components/tour-package-query/HotelsTab"
import PackageVariantsTab from "@/components/tour-package-query/PackageVariantsTab"
import { Calendar } from "@/components/ui/calendar"
import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core"
import { SortableContext, arrayMove, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { isValid, parse } from "date-fns"
import { formatLocalDate } from "@/lib/timezone-utils"
// Hotels tab now reuses shared HotelsTab component (room/transport disabled for Tour Package)

// This will be overridden in the component
const defaultEditorConfig = {
  readonly: false, // all options from <https://xdsoft.net/jodit/do c/>
};


const activitySchema = z.object({
  activityTitle: z.string().optional(),
  activityDescription: z.string().optional(),
  activityImages: z.object({ url: z.string() }).array(),
});

const itinerarySchema = z.object({
  itineraryImages: z.object({ url: z.string() }).array(),
  itineraryTitle: z.string().optional(),
  itineraryDescription: z.string().optional(),
  dayNumber: z.coerce.number().optional(),
  activities: z.array(activitySchema),
  mealsIncluded: z.array(z.string()).optional(),
  hotelId: z.string().optional(), // Array of hotel IDs
  locationId: z.string(), // Array of hotel IDs
  // Centralized allocations
  // hotel : z.string(),
});



const flightDetailsSchema = z.object({

  date: z.string().optional(),
  flightName: z.string().optional(),
  flightNumber: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  departureTime: z.string().optional(),
  arrivalTime: z.string().optional(),
  flightDuration: z.string().optional(),

});  // Assuming an array of flight details

// Define a pricing item schema
const pricingItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  price: z.string().optional(), // Changed from required to optional
  description: z.string().optional(),
});

const formSchema = z.object({
  tourPackageName: z.string().optional(),
  tourPackageType: z.string().optional(),
  tourCategory: z.string().default("Domestic").optional(),
  numDaysNight: z.string().optional(),
  transport: z.string().optional(),
  pickup_location: z.string().optional(),
  drop_location: z.string().optional(),
  pricingSection: z.array(pricingItemSchema).optional().default([]), // Add this line
  locationId: z.string().min(1),
  //location : z.string(),
  // hotelId: z.string().min(1),
  flightDetails: flightDetailsSchema.array(),
  //  hotelDetails: z.string(),
  inclusions: z.array(z.string()),
  exclusions: z.array(z.string()),
  kitchenGroupPolicy: z.array(z.string()),
  importantNotes: z.array(z.string()).optional(),
  paymentPolicy: z.array(z.string()),
  usefulTip: z.array(z.string()),
  cancellationPolicy: z.array(z.string()),
  airlineCancellationPolicy: z.array(z.string()),
  termsconditions: z.array(z.string()),
  // disclaimer: z.string().optional(),
  images: z.object({ url: z.string() }).array(),
  itineraries: z.array(itinerarySchema).optional().default([]),
  isFeatured: z.boolean().default(false),
  isArchived: z.boolean().default(false).optional(),
  slug: z.string().optional(),
  packageVariants: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Variant name is required"),
    description: z.string().optional(),
    isDefault: z.boolean().optional(),
    sortOrder: z.coerce.number().optional(),
    priceModifier: z.coerce.number().optional(),
    hotelMappings: z.record(z.string()).optional(),
    copiedFromTourPackageId: z.string().optional().nullable()
  })).optional().default([])
});

type TourPackageFormValues = z.infer<typeof formSchema>;
type FormItinerary = TourPackageFormValues['itineraries'][number];

interface TourPackageSummaryItinerary {
  id: string;
  dayNumber: number | null;
  hotelId: string | null;
}

interface TourPackageSummary {
  id: string;
  tourPackageName: string | null;
  numDaysNight: string | null;
  itineraries: TourPackageSummaryItinerary[];
}

type TourPackageVariantWithRelations = PrismaPackageVariant & {
  variantHotelMappings: Array<{
    id: string;
    itineraryId: string;
    hotelId: string;
    itinerary: Itinerary;
    hotel: (Hotel & { images: Images[] }) | null;
  }>;
  tourPackagePricings: Array<
    TourPackagePricing & {
      mealPlan: MealPlan | null;
      vehicleType: VehicleType | null;
      locationSeasonalPeriod: LocationSeasonalPeriod | null;
      pricingComponents: Array<
        PricingComponent & {
          pricingAttribute: PricingAttribute | null;
        }
      >;
    }
  >;
};

const toPlainNumber = (value: unknown): number => {
  if (value == null) return 0;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value === "object" && value !== null) {
    const asNumber = (value as any).toNumber?.();
    if (typeof asNumber === "number" && Number.isFinite(asNumber)) {
      return asNumber;
    }
    const asString = (value as any).toString?.();
    if (typeof asString === "string") {
      const parsed = Number.parseFloat(asString);
      return Number.isNaN(parsed) ? 0 : parsed;
    }
  }
  return 0;
};

interface TourPackageFormProps {
  initialData: (TourPackage & {
    images: Images[];
    itineraries: Itinerary[];
    flightDetails: FlightDetails[];
    packageVariants: TourPackageVariantWithRelations[];
  }) | null;
  locations: Location[];
  hotels: (Hotel & { images: Images[] })[];
  activitiesMaster: (ActivityMaster & {
    activityMasterImages: Images[];
  })[] | null;
  itinerariesMaster: (ItineraryMaster & {
    itineraryMasterImages: Images[];
    activities: (Activity & {
      activityImages: Images[];
    })[] | null;

  })[] | null;
  availableTourPackages: TourPackageSummary[];
  readOnly?: boolean;
};

export const TourPackageForm: React.FC<TourPackageFormProps> = ({
  initialData,
  locations,
  hotels,
  activitiesMaster,
  itinerariesMaster,
  availableTourPackages,
  readOnly = false,
}) => {
  const params = useParams();
  const router = useRouter();

  // Dynamic editor config based on readOnly prop
  const editorConfig = {
    readonly: readOnly,
    toolbar: readOnly ? false : true,
    showCharsCounter: !readOnly,
    showWordsCounter: !readOnly,
    showXPathInStatusbar: false,
  };

  //const defaultItinerary = { days: '1', activities: '', places: '', mealsIncluded: false };
  const [useLocationDefaults, setUseLocationDefaults] = useState({
    inclusions: false,
    exclusions: false,
    importantNotes: false,
    paymentPolicy: false,
    usefulTip: false,
    cancellationPolicy: false,
    airlineCancellationPolicy: false,
    termsconditions: false,
    kitchenGroupPolicy: false,
  });

  const [useDefaultPricing, setUseDefaultPricing] = useState(false);

  const handleUseLocationDefaultsChange = (field: string, checked: boolean) => {
    setUseLocationDefaults(prevState => ({ ...prevState, [field]: checked }));
    if (checked) {
      const selectedLocation = locations.find(location => location.id === form.getValues('locationId'));
      if (selectedLocation) {
        switch (field) {
          case 'inclusions':
            form.setValue('inclusions', parseJsonField(selectedLocation.inclusions) || INCLUSIONS_DEFAULT);
            break;
          case 'exclusions':
            form.setValue('exclusions', parseJsonField(selectedLocation.exclusions) || EXCLUSIONS_DEFAULT);
            break;
          case 'importantNotes':
            form.setValue('importantNotes', parseJsonField(selectedLocation.importantNotes) || IMPORTANT_NOTES_DEFAULT);
            break;
          case 'paymentPolicy':
            form.setValue('paymentPolicy', parseJsonField(selectedLocation.paymentPolicy) || PAYMENT_TERMS_DEFAULT);
            break;
          case 'usefulTip':
            form.setValue('usefulTip', parseJsonField(selectedLocation.usefulTip) || USEFUL_TIPS_DEFAULT);
            break;
          case 'cancellationPolicy':
            form.setValue('cancellationPolicy', parseJsonField(selectedLocation.cancellationPolicy) || CANCELLATION_POLICY_DEFAULT);
            break;
          case 'airlineCancellationPolicy':
            form.setValue('airlineCancellationPolicy', parseJsonField(selectedLocation.airlineCancellationPolicy) || AIRLINE_CANCELLATION_POLICY_DEFAULT);
            break; case 'termsconditions':
            form.setValue('termsconditions', parseJsonField(selectedLocation.termsconditions) || TERMS_AND_CONDITIONS_DEFAULT);
            break; case 'kitchenGroupPolicy':
            form.setValue('kitchenGroupPolicy', parseJsonField((selectedLocation as any).kitchenGroupPolicy) || KITCHEN_GROUP_POLICY_DEFAULT);
            break;
        }
      }
    }
  };

  const handleUseDefaultPricingChange = (checked: boolean) => {
    setUseDefaultPricing(checked);
    if (checked) {
      // Reset pricing section to default values
      form.setValue('pricingSection', DEFAULT_PRICING_SECTION);
    }
  };

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [flightDetails, setFlightDetails] = useState([]);
  // Lookup data for Hotels tab
  // Removed lookupLoading since Hotels tab is not used in Tour Package form
  // const [lookupLoading, setLookupLoading] = useState(true);

  const editor = useRef(null)
  const [itineraryOpenMap, setItineraryOpenMap] = useState<Record<number, boolean>>({ 0: true });
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const reindexItineraries = (items: any[]) => items.map((item, idx) => ({ ...item, dayNumber: idx + 1 }));

  const buildBlankItinerary = (dayNumber: number) => ({
    dayNumber,
    itineraryImages: [],
    itineraryTitle: '',
    itineraryDescription: '',
    activities: [],
    mealsIncluded: [],
    hotelId: '',
    locationId: form.getValues('locationId') || '',
    days: '',
  });

  const handleAddNewDay = () => {
    if (readOnly) {
      return;
    }
    const current = Array.isArray(form.getValues('itineraries')) ? [...form.getValues('itineraries')] : [];
    const updated = reindexItineraries([...current, buildBlankItinerary(current.length + 1)]);
    form.setValue('itineraries', updated, { shouldDirty: true });
    setItineraryOpenMap({ [updated.length - 1]: true });
  };

  const handleItineraryDragEnd = (event: any, itineraries: any[], onChange: (items: any[]) => void) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const parseIndex = (id: string | number) => {
      const safeId = String(id);
      const parts = safeId.split('-');
      const last = parts[parts.length - 1];
      const parsed = Number(last);
      return Number.isFinite(parsed) ? parsed : -1;
    };
    const oldIndex = parseIndex(active.id);
    const newIndex = parseIndex(over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(itineraries, oldIndex, newIndex);
    const normalized = reindexItineraries(reordered);
    onChange(normalized);
    setItineraryOpenMap({ [newIndex]: true });
  };

  const SortableWrapper = ({ id, children }: { id: string; children: (opts: { attributes: any; listeners: any; isDragging: boolean; }) => ReactNode; }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      zIndex: isDragging ? 10 : undefined,
    } as const;
    return (
      <div ref={setNodeRef} style={style}>
        {children({ attributes, listeners, isDragging })}
      </div>
    );
  };

  //console.log(initialData);
  const title = readOnly ? 'View Tour Package' : (initialData ? 'Edit Tour Package' : 'Create Tour Package');
  const description = readOnly ? 'View Tour Package details.' : (initialData ? 'Edit a Tour Package.' : 'Add a new Tour Package');
  const toastMessage = initialData ? 'Tour Package updated.' : 'Tour Package created.';
  const action = readOnly ? 'Close' : (initialData ? 'Save changes' : 'Create');
  //console.log("Initial Data : ", initialData)

  const parseJsonField = (field: any): string[] => {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    try {
      const parsed = JSON.parse(field as string);
      return Array.isArray(parsed) ? parsed : [field as string];
    } catch (e) {
      return [field as string];
    }
  };

  const parsePricingSection = (pricingData: any): any[] => {
    if (!pricingData) return DEFAULT_PRICING_SECTION;

    // If it's already an array of objects, return it
    if (Array.isArray(pricingData) && pricingData.length > 0 && typeof pricingData[0] === 'object') {
      return pricingData;
    }

    // If it's a string, try to parse it
    if (typeof pricingData === 'string') {
      try {
        const parsed = JSON.parse(pricingData);
        return Array.isArray(parsed) ? parsed : DEFAULT_PRICING_SECTION;
      } catch (e) {
        console.error("Error parsing pricingSection:", e);
        return DEFAULT_PRICING_SECTION;
      }
    }

    return DEFAULT_PRICING_SECTION;
  };

  // Transform packageVariants from API response to component format
  const transformPackageVariants = (variants: TourPackageVariantWithRelations[] | undefined): any[] => {
    if (!variants || !Array.isArray(variants)) return [];

    console.log('🔄 [TRANSFORM VARIANTS] Transforming packageVariants from API:', {
      count: variants.length,
      rawData: variants
    });

    return variants.map(variant => {
      // Convert variantHotelMappings array to hotelMappings object
      const hotelMappings: { [itineraryId: string]: string } = {};

      if (variant.variantHotelMappings && Array.isArray(variant.variantHotelMappings)) {
        variant.variantHotelMappings.forEach((mapping: any) => {
          if (mapping.itineraryId && mapping.hotelId) {
            hotelMappings[mapping.itineraryId] = mapping.hotelId;
          }
        });
      }

      console.log(`🔄 [TRANSFORM] Variant "${variant.name}":`, {
        mappingsCount: Object.keys(hotelMappings).length,
        hotelMappings
      });

      return {
        id: variant.id,
        name: variant.name,
        description: variant.description ?? undefined,
        isDefault: variant.isDefault,
        sortOrder: typeof variant.sortOrder === "number" ? variant.sortOrder : Number(variant.sortOrder) || 0,
        priceModifier: toPlainNumber(variant.priceModifier),
        hotelMappings,
        copiedFromTourPackageId: (variant as any).copiedFromTourPackageId ?? undefined,
        seasonalPricings: [],
      };
    });
  };

  const extractVariantPricingLookup = (
    variants: TourPackageVariantWithRelations[] | undefined
  ): Record<string, TourPackageVariantWithRelations["tourPackagePricings"]> => {
    if (!Array.isArray(variants)) {
      return {};
    }

    return variants.reduce((acc, variant) => {
      if (variant?.id && Array.isArray(variant?.tourPackagePricings) && variant.tourPackagePricings.length > 0) {
        acc[variant.id] = variant.tourPackagePricings;
      }
      return acc;
    }, {} as Record<string, TourPackageVariantWithRelations["tourPackagePricings"]>);
  };

  const transformInitialData = (data: any) => {
    return {
      ...data,
      assignedTo: data.assignedTo ?? '',
      isArchived: initialData?.isArchived || false,
      customerNumber: data.customerNumber ?? '',
      tourCategory: data.tourCategory ?? 'Domestic', // Add default for tour category
      slug: initialData?.slug || '',
      flightDetails: data.flightDetails.map((flightDetail: any) => ({
        date: flightDetail.date ?? '',
        flightName: flightDetail.flightName ?? '',
        flightNumber: flightDetail.flightNumber ?? '',
        from: flightDetail.from ?? '',
        to: flightDetail.to ?? '',
        departureTime: flightDetail.departureTime ?? '',
        arrivalTime: flightDetail.arrivalTime ?? '',
        flightDuration: flightDetail.flightDuration ?? '',

      })),

      itineraries: data.itineraries.map((itinerary: any) => ({
        id: itinerary.id, // CRITICAL: Preserve the itinerary ID for variant hotel mappings
        dayNumber: itinerary.dayNumber ?? 0,
        itineraryImages: itinerary.itineraryImages.map((image: { url: any }) => ({ url: image.url })), // Transform to { url: string }[]        
        itineraryTitle: itinerary.itineraryTitle ?? '',
        itineraryDescription: itinerary.itineraryDescription ?? '',
        hotelId: itinerary.hotelId ?? '',
        numberofRooms: itinerary.numberofRooms ?? '',
        roomCategory: itinerary.roomCategory ?? '',
        locationId: itinerary.locationId ?? '',
        //hotel : hotels.find(hotel => hotel.id === hotelId)?.name ?? '',
        mealsIncluded: itinerary.mealsIncluded ? itinerary.mealsIncluded.split('-') : [],
        activities: itinerary.activities?.map((activity: any) => ({
          locationId: activity.locationId ?? '',
          activityImages: activity.activityImages.map((image: { url: any }) => ({ url: image.url })), // Transform to { url: string }[]        
          activityTitle: activity.activityTitle ?? '',
          activityDescription: activity.activityDescription ?? '',
        }))
      })), inclusions: parseJsonField(data.inclusions) || INCLUSIONS_DEFAULT,
      exclusions: parseJsonField(data.exclusions) || EXCLUSIONS_DEFAULT,
      kitchenGroupPolicy: parseJsonField(data.kitchenGroupPolicy) || KITCHEN_GROUP_POLICY_DEFAULT,
      importantNotes: parseJsonField(data.importantNotes) || IMPORTANT_NOTES_DEFAULT,
      paymentPolicy: parseJsonField(data.paymentPolicy) || PAYMENT_TERMS_DEFAULT,
      usefulTip: parseJsonField(data.usefulTip) || USEFUL_TIPS_DEFAULT,
      cancellationPolicy: parseJsonField(data.cancellationPolicy) || CANCELLATION_POLICY_DEFAULT,
      airlineCancellationPolicy: parseJsonField(data.airlineCancellationPolicy) || AIRLINE_CANCELLATION_POLICY_DEFAULT,
      termsconditions: parseJsonField(data.termsconditions) || TERMS_AND_CONDITIONS_DEFAULT,
      pricingSection: parsePricingSection(data.pricingSection),
      packageVariants: transformPackageVariants((data as any).packageVariants || []),
    };
  };
  const defaultValues = initialData ? transformInitialData(initialData) : {

    tourPackageName: '',
    tourPackageType: '',
    tourCategory: 'Domestic',
    customerName: '',
    customerNumber: '',
    numDaysNight: '',
    period: '',
    transport: '',
    pickup_location: '',
    drop_location: '',
    numAdults: '',
    numChild5to12: '',
    numChild0to5: '',
    totalPrice: TOTAL_PRICE_DEFAULT,
    isArchived: false,
    // assignedTo: '',
    // assignedToEmail: '',
    slug: '',
    flightDetails: [],
    // hotelDetails: '',    inclusions: INCLUSIONS_DEFAULT,
    exclusions: EXCLUSIONS_DEFAULT,
    kitchenGroupPolicy: KITCHEN_GROUP_POLICY_DEFAULT,
    importantNotes: IMPORTANT_NOTES_DEFAULT,
    paymentPolicy: PAYMENT_TERMS_DEFAULT,
    usefulTip: USEFUL_TIPS_DEFAULT,
    cancellationPolicy: CANCELLATION_POLICY_DEFAULT,
    airlineCancellationPolicy: AIRLINE_CANCELLATION_POLICY_DEFAULT,
    termsconditions: TERMS_AND_CONDITIONS_DEFAULT,
    // disclaimer: DISCLAIMER_DEFAULT.replace(/\n/g, '<br>'),

    images: [],
    itineraries: [],
    locationId: '',
    //location : '',
    // hotelId: '',
    isFeatured: true,
    // isArchived: false, // REMOVED DUPLICATE
    pricingSection: DEFAULT_PRICING_SECTION, // Update this line to use the default pricing section
    packageVariants: [],
  };

  const packageVariantData = initialData?.packageVariants;
  const variantPricingLookup = useMemo(() => {
    if (!packageVariantData || packageVariantData.length === 0) {
      return {};
    }
    return extractVariantPricingLookup(packageVariantData);
  }, [packageVariantData]);

  const form = useForm<TourPackageFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  // Auto-load draft from Auto Builder
  useEffect(() => {
    const loadDraft = () => {
      // Only run if we are in "create" mode (no initialData)
      if (initialData) return;

      const draftKey = 'autoTourPackageDraft';
      const storedDraft = localStorage.getItem(draftKey);

      if (!storedDraft) return;

      try {
        const { data } = JSON.parse(storedDraft);
        console.log("Found auto-generated package draft:", data);

        // Find Location ID
        let foundLocationId = '';
        if (data.locationName && locations.length > 0) {
          const search = data.locationName.toLowerCase();
          const loc = locations.find(l => l.label && l.label.toLowerCase().includes(search));
          if (loc) foundLocationId = loc.id;
        }
        // Fallback if not found (mimics API behavior)
        if (!foundLocationId && locations.length > 0) {
          foundLocationId = locations[0].id;
        }

        // Map AI JSON to Form Values
        const mappedData: Partial<TourPackageFormValues> = {
          tourPackageName: data.tourPackageName || '',
          tourCategory: data.tourCategory || 'Domestic',
          tourPackageType: data.tourPackageType || 'General',
          numDaysNight: data.numDaysNight || '',
          // totalPrice: data.price ? String(data.price) : '', // REMOVED
          transport: data.transport || '',
          pickup_location: data.pickup_location || '',
          drop_location: data.drop_location || '',
          locationId: foundLocationId,

          // Map Itineraries
          itineraries: Array.isArray(data.itineraries) ? data.itineraries.map((day: any) => ({
            dayNumber: day.dayNumber,
            itineraryTitle: day.itineraryTitle || '',
            itineraryDescription: day.itineraryDescription || '',
            mealsIncluded: day.mealsIncluded ? (Array.isArray(day.mealsIncluded) ? day.mealsIncluded : [day.mealsIncluded]) : [],
            hotelId: '',
            locationId: foundLocationId,

            // Map activities as individuals, deviating slightly from API's "Day Highlights" block for better editing
            activities: Array.isArray(day.activities) ? day.activities.map((act: string) => ({
              activityTitle: act,
              activityDescription: '',
              activityImages: []
            })) : [],
            itineraryImages: [],
          })) : [],

          inclusions: data.inclusions ? (Array.isArray(data.inclusions) ? data.inclusions : [data.inclusions]) : INCLUSIONS_DEFAULT,
          exclusions: data.exclusions ? (Array.isArray(data.exclusions) ? data.exclusions : [data.exclusions]) : EXCLUSIONS_DEFAULT,
          importantNotes: data.importantNotes ? (Array.isArray(data.importantNotes) ? data.importantNotes : [data.importantNotes]) : IMPORTANT_NOTES_DEFAULT,
          paymentPolicy: data.paymentPolicy ? (Array.isArray(data.paymentPolicy) ? data.paymentPolicy : [data.paymentPolicy]) : PAYMENT_TERMS_DEFAULT,
          cancellationPolicy: data.cancellationPolicy ? (Array.isArray(data.cancellationPolicy) ? data.cancellationPolicy : [data.cancellationPolicy]) : CANCELLATION_POLICY_DEFAULT,
          termsconditions: data.termsconditions ? (Array.isArray(data.termsconditions) ? data.termsconditions : [data.termsconditions]) : TERMS_AND_CONDITIONS_DEFAULT,

          // Defaults
          images: [],
          flightDetails: [],
          pricingSection: DEFAULT_PRICING_SECTION
        };

        // Reset form with mapped data
        form.reset({
          ...defaultValues,
          ...mappedData
        });

        toast.success("Loaded properties from AI generation");

        // Clear the draft so it doesn't persist
        localStorage.removeItem(draftKey);

      } catch (err) {
        console.error("Failed to load auto-package draft:", err);
        toast.error("Failed to load generated draft");
      }
    };

    loadDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, form, locations]);

  // Fetch lookup data required for Hotels tab

  const {
    fields: pricingFields,
    append: appendPricing,
    remove: removePricing,
    insert: insertPricing
  } = useFieldArray({
    control: form.control,
    name: "pricingSection"
  });

  const handleMealChange = (mealType: string, isChecked: boolean, itineraryIndex: number) => {

    // console.log("Current meal change:", mealType, isChecked, itineraryIndex);

    const updatedItineraries = [...form.getValues('itineraries')];
    let currentMeals = updatedItineraries[itineraryIndex].mealsIncluded || [];

    if (isChecked) {
      // Add the meal type if checked and not already present
      if (!currentMeals.includes(mealType)) {
        currentMeals.push(mealType);
      }
    } else {
      // Remove the meal type if unccked
      currentMeals = currentMeals.filter((meal) => meal !== mealType);
    }

    updatedItineraries[itineraryIndex].mealsIncluded = currentMeals;
    form.setValue('itineraries', updatedItineraries);
  };

  const convertToSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/ /g, '-')
      .replace(/[^\w-]+/g, '');
  }
  // Update slug when label changes
  const tourPackageName = form.watch('tourPackageName');
  useEffect(() => {
    const slug = convertToSlug(tourPackageName || '');
    form.setValue('slug', slug);
  }, [form, tourPackageName]);

  const handleSubmitError = (errors: FieldErrors<TourPackageFormValues>) => {
    console.error('❌ [TOUR PACKAGE FORM] Validation errors prevented submission', {
      errorKeys: Object.keys(errors),
      errors,
    });

    if (errors.packageVariants) {
      console.error('❌ [TOUR PACKAGE FORM] packageVariants validation details', errors.packageVariants);
    }
  };

  const onSubmit = async (data: TourPackageFormValues) => {

    console.log('📋 [TOUR PACKAGE FORM] Raw submit data received', {
      variantsCount: data.packageVariants?.length || 0,
      hasItineraries: Array.isArray(data.itineraries) && data.itineraries.length > 0,
      payload: data,
    });
    const formattedData = {
      ...data,
      itineraries: data.itineraries.map(itinerary => ({
        ...itinerary,
        locationId: data.locationId,
        mealsIncluded: itinerary.mealsIncluded && itinerary.mealsIncluded.length > 0 ? itinerary.mealsIncluded.join('-') : '',
        activities: itinerary.activities?.map((activity) => ({
          ...activity,
          // activityTitle : activity.activityTitle,
          // activityDescription : activity.activityDescription,
          locationId: data.locationId,

          //      activityImages: activity.activityImages.map(img => img.url) // Extract URLs from activityImages  
        }))
      })),
      packageVariants: data.packageVariants || [], // Include variants
    };

    console.log('📦 [TOUR PACKAGE FORM] Formatted request payload', {
      variantsCount: formattedData.packageVariants.length,
      itineraryCount: formattedData.itineraries.length,
      payload: formattedData,
    });


    try {
      setLoading(true);
      if (initialData) {
        formattedData.itineraries.forEach((itinerary, index) => {
          itinerary.activities.forEach(activity => {
            //    console.log("Activity Data Being Submitted is :", activity);
          }
          )
        })

        await axios.patch(`/api/tourPackages/${params.tourPackageId}`, formattedData);
      } else {
        await axios.post(`/api/tourPackages`, formattedData);
      }
      console.log('✅ [TOUR PACKAGE FORM] Tour package saved successfully', {
        tourPackageId: params.tourPackageId,
        isUpdate: Boolean(initialData),
      });
      router.refresh();
      router.push(`/tourPackages`);
      toast.success(toastMessage);
    } catch (error: any) {
      console.error('❌ [TOUR PACKAGE FORM] Failed to save tour package', {
        message: error?.message,
        status: error?.response?.status,
        responseData: error?.response?.data,
      });
      toast.error('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/tourPackages/${params.tourPackageId}`);
      router.refresh();
      router.push(`/tourPackages`);
      toast.success('Tour Package  deleted.');
    } catch (error: any) {
      toast.error('Something went wrong.');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }


  const handleActivitySelection = (selectedActivityId: string, itineraryIndex: number, activityIndex: number) => {
    const selectedActivityMaster = (activitiesMaster as ActivityMaster[]).find(activity => activity.id === selectedActivityId);

    if (selectedActivityMaster) {
      const updatedItineraries = [...form.getValues('itineraries')];
      updatedItineraries[itineraryIndex].activities[activityIndex] = {
        ...updatedItineraries[itineraryIndex].activities[activityIndex],

        activityTitle: selectedActivityMaster.activityMasterTitle || '',
        activityDescription: selectedActivityMaster.activityMasterDescription || '',
        //  activityImages: selectedActivityMaster.activityMasterImages.map((image: { url: any }) => ({ url: image.url }))
      };
      form.setValue('itineraries', updatedItineraries);
    }
  };


  // Function to handle meal checkbox changes

  // Add this function to handle pricing items
  const handleAddPricingItem = (insertAtIndex?: number) => {
    const newItem = { name: '', price: '', description: '' };

    if (insertAtIndex !== undefined) {
      // Insert after the specified index
      insertPricing(insertAtIndex + 1, newItem);
      console.log("Inserted item after index", insertAtIndex);
    } else {
      // Add to the end
      appendPricing(newItem);
      console.log("Added item at the end");
    }
  };

  const handleRemovePricingItem = (indexToRemove: number) => {
    removePricing(indexToRemove);
    console.log("Removed item at index", indexToRemove);
  };

  const handleSaveToMasterItinerary = async (itinerary: any) => {
    try {
      setLoading(true);

      // Prepare the data for saving to master itinerary
      const masterItineraryData = {
        itineraryMasterTitle: itinerary.itineraryTitle,
        itineraryMasterDescription: itinerary.itineraryDescription,
        locationId: itinerary.locationId,
        itineraryMasterImages: itinerary.itineraryImages,
        activities: itinerary.activities.map((activity: any) => ({
          activityTitle: activity.activityTitle,
          activityDescription: activity.activityDescription,
          activityImages: activity.activityImages,
          locationId: itinerary.locationId
        })),
        // Include any additional fields required by the API
        dayNumber: itinerary.dayNumber,
        days: itinerary.days,
        hotelId: itinerary.hotelId,
        numberofRooms: itinerary.numberofRooms,
        roomCategory: itinerary.roomCategory,
        mealsIncluded: itinerary.mealsIncluded ? itinerary.mealsIncluded.join('-') : ''
      };

      // Send to existing API endpoint
      const response = await axios.post('/api/itinerariesMaster', masterItineraryData);

      toast.success('Saved to Master Itinerary successfully!');
      console.log('Saved to master itinerary:', response.data);

    } catch (error: any) {
      console.error('Error saving to master itinerary:', error);
      toast.error(error.response?.data?.message || 'Failed to save to Master Itinerary');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={onDelete}
        loading={loading}
      />
      <div className="flex items-center justify-between">
        <Heading title={title} description={description} />
        {initialData && !readOnly && (
          <Button
            disabled={loading}
            variant="destructive"
            size="sm"
            onClick={() => setOpen(true)}
          >
            <Trash className="h-4 w-4" />
          </Button>
        )}
      </div>
      <Separator />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, handleSubmitError)} className="space-y-8">
          {Object.keys(form.formState.errors).length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-800 text-sm font-medium flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293-1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  Please fix the following errors:
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-1">
                  {Object.entries(form.formState.errors).map(([field, error]) => (
                    <li key={field} className="text-sm text-red-700">
                      {field}: {error?.message as string}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid grid-cols-9 w-full">
              <TabsTrigger value="basic" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Basic Info
              </TabsTrigger>
              {/* <TabsTrigger value="guests" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Guests
              </TabsTrigger> */}
              <TabsTrigger value="location" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </TabsTrigger>
              <TabsTrigger value="itinerary" className="flex items-center gap-2">
                <ListPlus className="h-4 w-4" />
                Itinerary
              </TabsTrigger>
              <TabsTrigger value="hotels" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Hotels
              </TabsTrigger>
              <TabsTrigger value="flights" className="flex items-center gap-2">
                <Plane className="h-4 w-4" />
                Flights
              </TabsTrigger>
              <TabsTrigger value="pricing" className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Pricing
              </TabsTrigger>
              <TabsTrigger value="policies" className="flex items-center gap-2">
                <FileCheck className="h-4 w-4" />
                Policies
              </TabsTrigger>
              <TabsTrigger value="variants" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Variants
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">

                  <FormField
                    control={form.control}
                    name="images"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Images</FormLabel>
                        <FormControl>
                          <ImageUpload
                            value={field.value.map((image) => image.url)}
                            disabled={loading || readOnly}
                            onChange={(url) => field.onChange([...field.value, { url }])}
                            onRemove={(url) => field.onChange([...field.value.filter((current) => current.url !== url)])}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isFeatured"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            disabled={readOnly}
                            // @ts-ignore
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Available on Website
                          </FormLabel>
                          <FormDescription>
                            Make this tour package available on the public website.
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-8">


                    {/* add formfield for TourPackageQueryName */}
                    <FormField
                      control={form.control}
                      name="tourPackageName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tour Package Query Name<span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input
                              disabled={loading || readOnly}
                              placeholder="Tour Package Name"
                              value={field.value}
                              onChange={field.onChange}
                              className={form.formState.errors.tourPackageName ? "border-red-500" : ""}
                            />
                          </FormControl>
                          <FormMessage>
                            {form.formState.errors.tourPackageName?.message}
                          </FormMessage>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tourPackageType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tour Package Type</FormLabel>
                          <FormControl>
                            <Select
                              disabled={loading || readOnly}
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger>
                                {field.value || 'Select Tour Package Type'}
                              </SelectTrigger>
                              <SelectContent>
                                {TOUR_PACKAGE_TYPE_DEFAULT.map((value) => (
                                  <SelectItem key={value} value={value}>
                                    {value}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tourCategory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tour Category</FormLabel>
                          <FormControl>
                            <Select
                              disabled={loading || readOnly}
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger>
                                {field.value || 'Select Tour Category'}
                              </SelectTrigger>
                              <SelectContent>
                                {TOUR_CATEGORY_DEFAULT.map((value) => (
                                  <SelectItem key={value} value={value}>
                                    {value}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="numDaysNight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Days/Night</FormLabel>
                          <FormControl>
                            <Input disabled={loading || readOnly} placeholder="Number of Days/Night" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />


                  </div>
                  <div className="grid grid-cols-3 gap-8">

                    <FormField
                      control={form.control}
                      name="transport"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Transport</FormLabel>
                          <FormControl>
                            <Input disabled={loading} placeholder="Transport" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pickup_location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pickup Location</FormLabel>
                          <FormControl>
                            <Input disabled={loading} placeholder="Pickup Location" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="drop_location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Drop Location</FormLabel>
                          <FormControl>
                            <Input disabled={loading} placeholder="Drop Location" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="hotels" className="space-y-4 mt-4">
              <HotelsTab
                control={form.control}
                form={form}
                loading={loading}
                hotels={hotels}
                enableRoomAllocations={false}
                enableTransportDetails={false}
                readOnly={readOnly}
              />
            </TabsContent>

            {/* Add similar TabsContent sections for other tabs */}
            <TabsContent value="location" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Location</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Move location form fields here */}
                  <FormField
                    control={form.control}
                    name="locationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location<span className="text-red-500">*</span></FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  "w-full justify-between",
                                  !field.value && "text-muted-foreground",
                                  form.formState.errors.locationId ? "border-red-500" : ""
                                )}
                              >
                                {field.value
                                  ? locations.find((location) => location.id === field.value)?.label
                                  : "Select a location..."}
                                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0">
                            <Command>
                              <CommandInput placeholder="Search location..." />
                              <CommandEmpty>No location found.</CommandEmpty>
                              <CommandGroup>
                                {locations.map((location) => (
                                  <CommandItem
                                    value={location.label}
                                    key={location.id}
                                    onSelect={() => {
                                      form.setValue("locationId", location.id);
                                      // Update location-dependent fields if needed
                                      if (useLocationDefaults.inclusions) {
                                        form.setValue('inclusions', parseJsonField(location.inclusions) || INCLUSIONS_DEFAULT);
                                      }
                                      if (useLocationDefaults.exclusions) {
                                        form.setValue('exclusions', parseJsonField(location.exclusions) || EXCLUSIONS_DEFAULT);
                                      }
                                      if (useLocationDefaults.importantNotes) {
                                        form.setValue('importantNotes', parseJsonField(location.importantNotes) || IMPORTANT_NOTES_DEFAULT);
                                      }
                                      if (useLocationDefaults.paymentPolicy) {
                                        form.setValue('paymentPolicy', parseJsonField(location.paymentPolicy) || PAYMENT_TERMS_DEFAULT);
                                      }
                                      if (useLocationDefaults.usefulTip) {
                                        form.setValue('usefulTip', parseJsonField(location.usefulTip) || USEFUL_TIPS_DEFAULT);
                                      }
                                      if (useLocationDefaults.cancellationPolicy) {
                                        form.setValue('cancellationPolicy', parseJsonField(location.cancellationPolicy) || CANCELLATION_POLICY_DEFAULT);
                                      }
                                      if (useLocationDefaults.airlineCancellationPolicy) {
                                        form.setValue('airlineCancellationPolicy', parseJsonField(location.airlineCancellationPolicy) || AIRLINE_CANCELLATION_POLICY_DEFAULT);
                                      } if (useLocationDefaults.termsconditions) {
                                        form.setValue('termsconditions', parseJsonField(location.termsconditions) || TERMS_AND_CONDITIONS_DEFAULT);
                                      } if (useLocationDefaults.kitchenGroupPolicy) {
                                        form.setValue('kitchenGroupPolicy', parseJsonField((location as any).kitchenGroupPolicy) || KITCHEN_GROUP_POLICY_DEFAULT);
                                      }
                                      const currentItineraries = form.getValues('itineraries');
                                      const updatedItineraries = currentItineraries.map(itinerary => ({
                                        ...itinerary,
                                        locationId: location.id
                                      }));
                                      form.setValue('itineraries', updatedItineraries);

                                      // Update activities locationId within itineraries
                                      const updatedItinerariesWithActivities = updatedItineraries.map(itinerary => ({
                                        ...itinerary,
                                        activities: itinerary.activities?.map(activity => ({
                                          ...activity,
                                          locationId: location.id
                                        })) || []
                                      }));
                                      form.setValue('itineraries', updatedItinerariesWithActivities);
                                    }}
                                  >
                                    <CheckIcon
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        location.id === field.value ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {location.label}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage>
                          {form.formState.errors.locationId?.message}
                        </FormMessage>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="itinerary" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <CardTitle className="flex items-center gap-2 text-slate-800">
                      <ListPlus className="h-5 w-5 text-primary" />
                      Itinerary Details
                    </CardTitle>
                    {!readOnly && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddNewDay}
                        disabled={loading}
                        className="shadow-sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Day
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <FormField
                    control={form.control}
                    name="itineraries"
                    render={({ field: { value = [], onChange } }) => {
                      const itineraries = Array.isArray(value) ? value : [];

                      const ensureItinerary = (entry: any, idx: number) => {
                        const defaults = buildBlankItinerary(idx + 1);
                        return {
                          ...defaults,
                          ...entry,
                          itineraryImages: Array.isArray(entry?.itineraryImages) ? entry.itineraryImages : defaults.itineraryImages,
                          activities: Array.isArray(entry?.activities) ? entry.activities : defaults.activities,
                          mealsIncluded: Array.isArray(entry?.mealsIncluded) ? entry.mealsIncluded : defaults.mealsIncluded,
                        };
                      };

                      const updateItinerary = (index: number, updater: (current: any) => any) => {
                        const normalized = itineraries.map((item, idx) => ensureItinerary(item, idx));
                        const next = [...normalized];
                        next[index] = updater(normalized[index]);
                        onChange(reindexItineraries(next));
                      };

                      const removeItinerary = (index: number) => {
                        const filtered = itineraries.filter((_, idx) => idx !== index);
                        onChange(reindexItineraries(filtered));
                        setItineraryOpenMap(prev => {
                          const next: Record<number, boolean> = {};
                          reindexItineraries(filtered).forEach((_, idx) => {
                            next[idx] = prev[idx] ?? idx === Math.max(0, index - 1);
                          });
                          return next;
                        });
                      };

                      return (
                        <FormItem>
                          {itineraries.length === 0 && (
                            <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 py-8 text-center text-sm text-slate-500">
                              Start by adding a day to craft the perfect journey.
                            </div>
                          )}
                          <div className="space-y-6">
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => handleItineraryDragEnd(event, itineraries, (items) => onChange(items))}>
                              <SortableContext items={itineraries.map((_, idx) => `it-${idx}`)} strategy={verticalListSortingStrategy}>
                                {itineraries.map((rawItinerary, index) => {
                                  const itinerary = ensureItinerary(rawItinerary, index);
                                  const itineraryImages = Array.isArray(itinerary.itineraryImages) ? itinerary.itineraryImages : [];
                                  const activities = Array.isArray(itinerary.activities) ? itinerary.activities : [];
                                  const mealsIncluded = Array.isArray(itinerary.mealsIncluded) ? itinerary.mealsIncluded : [];

                                  return (
                                    <SortableWrapper key={`it-${index}`} id={`it-${index}`}>
                                      {({ attributes, listeners }) => (
                                        <Accordion
                                          type="single"
                                          collapsible
                                          value={itineraryOpenMap[index] ? `item-${index}` : undefined}
                                          onValueChange={(val) => setItineraryOpenMap(prev => ({ ...prev, [index]: !!val }))}
                                          className="w-full border rounded-lg shadow-sm hover:shadow-md transition-shadow"
                                        >
                                          <AccordionItem value={`item-${index}`} className="border-0">
                                            <AccordionTrigger className="bg-gradient-to-r from-white to-slate-50 px-4 py-3 rounded-t-lg">
                                              <div className="flex items-center gap-3">
                                                <button
                                                  type="button"
                                                  aria-label="Drag to reorder"
                                                  className="p-1 text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing"
                                                  {...attributes}
                                                  {...listeners}
                                                  onClick={(event) => event.preventDefault()}
                                                >
                                                  <GripVertical className="h-4 w-4" />
                                                </button>
                                                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-white font-semibold text-sm">
                                                  {index + 1}
                                                </div>
                                                <div className="font-semibold text-left" dangerouslySetInnerHTML={{ __html: itinerary.itineraryTitle || `Day ${index + 1}` }} />
                                              </div>
                                              <span className="text-xs font-medium text-slate-500">
                                                {itinerary.days ? `Scheduled: ${itinerary.days}` : ''}
                                              </span>
                                            </AccordionTrigger>
                                            <AccordionContent className="px-4 pb-6 pt-4 space-y-6">
                                              <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-3">
                                                <p className="text-xs text-slate-500">Refine the content below to match the exact guest experience.</p>
                                                <div className="flex flex-wrap gap-2">
                                                  <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8"
                                                    disabled={loading || readOnly}
                                                    onClick={() => handleSaveToMasterItinerary(itinerary)}
                                                  >
                                                    <Plus className="h-4 w-4 mr-2" />
                                                    Save to Master Itinerary
                                                  </Button>
                                                  <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="destructive"
                                                    className="h-8"
                                                    disabled={loading || readOnly}
                                                    onClick={() => removeItinerary(index)}
                                                  >
                                                    <Trash className="h-4 w-4 mr-2" />
                                                    Remove Day
                                                  </Button>
                                                </div>
                                              </div>

                                              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                                                <h3 className="text-sm font-medium text-slate-600">Apply a saved template</h3>
                                                <Popover>
                                                  <PopoverTrigger asChild>
                                                    <FormControl>
                                                      <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        className={cn(
                                                          "w-full justify-between bg-white shadow-sm",
                                                          !itinerary.itineraryTitle && "text-muted-foreground"
                                                        )}
                                                        disabled={loading || readOnly}
                                                      >
                                                        {itinerary.itineraryTitle
                                                          ? itinerariesMaster?.find((item) => item.itineraryMasterTitle === itinerary.itineraryTitle)?.itineraryMasterTitle || itinerary.itineraryTitle
                                                          : "Select an Itinerary Master"}
                                                        <ChevronUp className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                      </Button>
                                                    </FormControl>
                                                  </PopoverTrigger>
                                                  <PopoverContent className="w-[240px] p-0 max-h-[240px] overflow-auto">
                                                    <Command>
                                                      <CommandInput placeholder="Search itinerary master..." className="h-9" />
                                                      <CommandEmpty>No itinerary master found.</CommandEmpty>
                                                      <CommandGroup>
                                                        {itinerariesMaster?.map((itineraryMaster) => (
                                                          <CommandItem
                                                            key={itineraryMaster.id}
                                                            value={itineraryMaster.itineraryMasterTitle ?? ''}
                                                            onSelect={() => {
                                                              updateItinerary(index, (current) => ({
                                                                ...current,
                                                                itineraryTitle: itineraryMaster.itineraryMasterTitle || '',
                                                                itineraryDescription: itineraryMaster.itineraryMasterDescription || '',
                                                                itineraryImages: itineraryMaster.itineraryMasterImages?.map((image) => ({ url: image.url })) || [],
                                                                activities: itineraryMaster.activities?.map((activity) => ({
                                                                  activityTitle: activity.activityTitle || '',
                                                                  activityDescription: activity.activityDescription || '',
                                                                  activityImages: activity.activityImages?.map((image) => ({ url: image.url })) || [],
                                                                })) || [],
                                                              }));
                                                            }}
                                                          >
                                                            {itineraryMaster.itineraryMasterTitle}
                                                            <CheckIcon
                                                              className={cn(
                                                                "ml-auto h-4 w-4",
                                                                itineraryMaster.locationId === itinerary.locationId
                                                                  ? "opacity-100"
                                                                  : "opacity-0"
                                                              )}
                                                            />
                                                          </CommandItem>
                                                        ))}
                                                      </CommandGroup>
                                                    </Command>
                                                  </PopoverContent>
                                                </Popover>
                                              </div>

                                              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <FormItem className="bg-white rounded-lg p-4 border shadow-sm">
                                                  <FormLabel className="text-base font-medium flex items-center gap-2 mb-2">
                                                    <Type className="h-4 w-4" />
                                                    Title
                                                  </FormLabel>
                                                  <FormControl>
                                                    <JoditEditor
                                                      ref={editor}
                                                      value={itinerary.itineraryTitle || ''}
                                                      onBlur={(content) => updateItinerary(index, (current) => ({ ...current, itineraryTitle: content }))}
                                                      onChange={() => { }}
                                                    />
                                                  </FormControl>
                                                </FormItem>
                                                <FormItem className="bg-white rounded-lg p-4 border shadow-sm">
                                                  <FormLabel className="text-base font-medium flex items-center gap-2 mb-2">
                                                    <AlignLeft className="h-4 w-4" />
                                                    Description
                                                  </FormLabel>
                                                  <FormControl>
                                                    <JoditEditor
                                                      ref={editor}
                                                      value={itinerary.itineraryDescription || ''}
                                                      onBlur={(content) => updateItinerary(index, (current) => ({ ...current, itineraryDescription: content }))}
                                                      onChange={() => { }}
                                                    />
                                                  </FormControl>
                                                </FormItem>
                                              </div>

                                              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <FormItem>
                                                  <FormLabel>Day</FormLabel>
                                                  <FormControl>
                                                    <Input
                                                      disabled={loading || readOnly}
                                                      type="number"
                                                      value={itinerary.dayNumber ?? index + 1}
                                                      onChange={(event) => {
                                                        const nextValue = Number(event.target.value);
                                                        updateItinerary(index, (current) => ({ ...current, dayNumber: Number.isFinite(nextValue) ? nextValue : current.dayNumber }));
                                                      }}
                                                      onKeyDown={(event) => event.stopPropagation()}
                                                    />
                                                  </FormControl>
                                                </FormItem>
                                                <FormItem>
                                                  <FormLabel>Date</FormLabel>
                                                  <Popover>
                                                    <PopoverTrigger asChild>
                                                      <Button
                                                        type="button"
                                                        variant="outline"
                                                        disabled={loading || readOnly}
                                                        className={cn("w-full justify-between text-left font-normal bg-white shadow-sm", !itinerary.days && "text-muted-foreground")}
                                                        onClick={(event) => event.stopPropagation()}
                                                      >
                                                        <span>{itinerary.days || 'Pick a date'}</span>
                                                        <CalendarIcon className="ml-2 h-4 w-4 opacity-60" />
                                                      </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent
                                                      className="w-auto p-3"
                                                      align="start"
                                                      onClick={(event) => event.stopPropagation()}
                                                    >
                                                      <Calendar
                                                        mode="single"
                                                        selected={(() => {
                                                          try {
                                                            if (!itinerary.days) return undefined;
                                                            const parsed = parse(itinerary.days, 'dd-MM-yyyy', new Date());
                                                            return isValid(parsed) ? parsed : undefined;
                                                          } catch {
                                                            return undefined;
                                                          }
                                                        })()}
                                                        onSelect={(date) => {
                                                          updateItinerary(index, (current) => ({
                                                            ...current,
                                                            days: date && isValid(date) ? formatLocalDate(date, 'dd-MM-yyyy') : '',
                                                          }));
                                                          setItineraryOpenMap(prev => ({ ...prev, [index]: true }));
                                                        }}
                                                        initialFocus
                                                      />
                                                      <div className="flex items-center justify-between pt-2">
                                                        <Button
                                                          type="button"
                                                          size="sm"
                                                          variant="ghost"
                                                          disabled={loading || readOnly || !itinerary.days}
                                                          onClick={() => {
                                                            updateItinerary(index, (current) => ({ ...current, days: '' }));
                                                            setItineraryOpenMap(prev => ({ ...prev, [index]: true }));
                                                          }}
                                                        >
                                                          Clear
                                                        </Button>
                                                        <span className="text-xs text-slate-500 pr-1">Format: dd-MM-yyyy</span>
                                                      </div>
                                                    </PopoverContent>
                                                  </Popover>
                                                </FormItem>
                                              </div>

                                              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                                <h3 className="text-sm font-medium mb-3 flex items-center gap-2 text-slate-700">
                                                  <ImageIcon className="h-4 w-4 text-primary" />
                                                  Destination Images
                                                </h3>
                                                <ImageUpload
                                                  value={itineraryImages.map((image: { url: string }) => image.url)}
                                                  disabled={loading || readOnly}
                                                  onChange={(url) => {
                                                    updateItinerary(index, (current) => ({
                                                      ...current,
                                                      itineraryImages: [...(Array.isArray(current.itineraryImages) ? current.itineraryImages : []), { url }],
                                                    }));
                                                  }}
                                                  onRemove={(url) => {
                                                    updateItinerary(index, (current) => ({
                                                      ...current,
                                                      itineraryImages: (Array.isArray(current.itineraryImages) ? current.itineraryImages : []).filter((image: { url: string }) => image.url !== url),
                                                    }));
                                                  }}
                                                />
                                              </div>

                                              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <FormItem className="flex flex-col">
                                                  <FormLabel>Hotel</FormLabel>
                                                  <Popover>
                                                    <PopoverTrigger asChild>
                                                      <FormControl>
                                                        <Button
                                                          variant="outline"
                                                          role="combobox"
                                                          className={cn(
                                                            "w-full justify-between",
                                                            !itinerary.hotelId && "text-muted-foreground"
                                                          )}
                                                          disabled={loading || readOnly}
                                                        >
                                                          {itinerary.hotelId
                                                            ? hotels.find((hotel) => hotel.id === itinerary.hotelId)?.name || 'Select a Hotel'
                                                            : "Select a Hotel"}
                                                          <ChevronUp className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                      </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[240px] p-0 max-h-[240px] overflow-auto">
                                                      <Command>
                                                        <CommandInput placeholder="Search hotel..." className="h-9" />
                                                        <CommandEmpty>No hotel found.</CommandEmpty>
                                                        <CommandGroup>
                                                          {hotels
                                                            .filter((hotel) => hotel.locationId === itinerary.locationId || hotel.id === 'cdd32e64-4fc4-4784-9f46-507611eb0168')
                                                            .map((hotel) => (
                                                              <CommandItem
                                                                value={hotel.name}
                                                                key={hotel.id}
                                                                onSelect={() => {
                                                                  updateItinerary(index, (current) => ({ ...current, hotelId: hotel.id }));
                                                                }}
                                                              >
                                                                {hotel.name}
                                                                <CheckIcon
                                                                  className={cn(
                                                                    "ml-auto h-4 w-4",
                                                                    hotel.id === itinerary.hotelId ? "opacity-100" : "opacity-0"
                                                                  )}
                                                                />
                                                              </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                      </Command>
                                                    </PopoverContent>
                                                  </Popover>
                                                  <FormMessage />
                                                </FormItem>

                                                <div className="rounded-lg border border-slate-200 bg-white p-4">
                                                  <FormLabel className="font-medium mb-3 block">Meal Plan</FormLabel>
                                                  <div className="flex flex-wrap gap-3">
                                                    {['Breakfast', 'Lunch', 'Dinner'].map((meal) => (
                                                      <label key={meal} className="flex items-center gap-2 text-sm">
                                                        <Checkbox
                                                          checked={mealsIncluded.includes(meal)}
                                                          onCheckedChange={(checked) => handleMealChange(meal, !!checked, index)}
                                                          disabled={loading || readOnly}
                                                        />
                                                        {meal}
                                                      </label>
                                                    ))}
                                                  </div>
                                                </div>
                                              </div>

                                              <div>
                                                <h3 className="text-sm font-medium mb-4 text-slate-700 flex items-center gap-2">
                                                  <MapPin className="h-4 w-4 text-primary" />
                                                  Activities
                                                </h3>
                                                <div className="space-y-5">
                                                  {activities.map((activity: FormItinerary['activities'][number], activityIndex: number) => {
                                                    const activityImages = Array.isArray(activity?.activityImages) ? activity.activityImages : [];
                                                    return (
                                                      <div key={activityIndex} className="rounded-lg border border-slate-200 bg-white shadow-sm p-4 space-y-4">
                                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                                          <h4 className="text-sm font-semibold text-slate-700">Activity {activityIndex + 1}</h4>
                                                          <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-red-600 hover:text-red-700"
                                                            disabled={loading || readOnly}
                                                            onClick={() => {
                                                              updateItinerary(index, (current) => ({
                                                                ...current,
                                                                activities: (Array.isArray(current.activities) ? current.activities : []).filter((_activity: FormItinerary['activities'][number], idx: number) => idx !== activityIndex),
                                                              }));
                                                            }}
                                                          >
                                                            <Trash className="h-4 w-4 mr-1" />
                                                            Remove
                                                          </Button>
                                                        </div>

                                                        <FormItem>
                                                          <Select
                                                            disabled={loading || readOnly}
                                                            onValueChange={(selectedActivityId) =>
                                                              handleActivitySelection(selectedActivityId, index, activityIndex)
                                                            }
                                                          >
                                                            <SelectTrigger className="bg-white">
                                                              <SelectValue placeholder="Select an Activity" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                              {activitiesMaster?.map((activityMaster) => (
                                                                <SelectItem key={activityMaster.id} value={activityMaster.id}>
                                                                  {activityMaster.activityMasterTitle}
                                                                </SelectItem>
                                                              ))}
                                                            </SelectContent>
                                                          </Select>
                                                          <FormMessage />
                                                        </FormItem>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                          <FormItem>
                                                            <FormLabel>Activity Title</FormLabel>
                                                            <FormControl>
                                                              <JoditEditor
                                                                ref={editor}
                                                                value={activity.activityTitle || ''}
                                                                onBlur={(content) => {
                                                                  updateItinerary(index, (current) => {
                                                                    const updatedActivities = [...(Array.isArray(current.activities) ? current.activities : [])];
                                                                    updatedActivities[activityIndex] = {
                                                                      ...updatedActivities[activityIndex],
                                                                      activityTitle: content,
                                                                    };
                                                                    return { ...current, activities: updatedActivities };
                                                                  });
                                                                }}
                                                                onChange={() => { }}
                                                              />
                                                            </FormControl>
                                                          </FormItem>
                                                          <FormItem>
                                                            <FormLabel>Activity Description</FormLabel>
                                                            <FormControl>
                                                              <JoditEditor
                                                                ref={editor}
                                                                value={activity.activityDescription || ''}
                                                                onBlur={(content) => {
                                                                  updateItinerary(index, (current) => {
                                                                    const updatedActivities = [...(Array.isArray(current.activities) ? current.activities : [])];
                                                                    updatedActivities[activityIndex] = {
                                                                      ...updatedActivities[activityIndex],
                                                                      activityDescription: content,
                                                                    };
                                                                    return { ...current, activities: updatedActivities };
                                                                  });
                                                                }}
                                                                onChange={() => { }}
                                                              />
                                                            </FormControl>
                                                          </FormItem>
                                                        </div>

                                                        <ImageUpload
                                                          value={activityImages.map((image: { url: string }) => image.url)}
                                                          disabled={loading || readOnly}
                                                          onChange={(url) => {
                                                            updateItinerary(index, (current) => {
                                                              const updatedActivities = [...(Array.isArray(current.activities) ? current.activities : [])];
                                                              const safeImages = Array.isArray(updatedActivities[activityIndex]?.activityImages)
                                                                ? updatedActivities[activityIndex].activityImages
                                                                : [];
                                                              updatedActivities[activityIndex] = {
                                                                ...updatedActivities[activityIndex],
                                                                activityImages: [...safeImages, { url }],
                                                              };
                                                              return { ...current, activities: updatedActivities };
                                                            });
                                                          }}
                                                          onRemove={(url) => {
                                                            updateItinerary(index, (current) => {
                                                              const updatedActivities = [...(Array.isArray(current.activities) ? current.activities : [])];
                                                              const safeImages = Array.isArray(updatedActivities[activityIndex]?.activityImages)
                                                                ? updatedActivities[activityIndex].activityImages
                                                                : [];
                                                              updatedActivities[activityIndex] = {
                                                                ...updatedActivities[activityIndex],
                                                                activityImages: safeImages.filter((image: { url: string }) => image.url !== url),
                                                              };
                                                              return { ...current, activities: updatedActivities };
                                                            });
                                                          }}
                                                        />
                                                      </div>
                                                    );
                                                  })}

                                                  <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={loading || readOnly}
                                                    onClick={() => {
                                                      updateItinerary(index, (current) => ({
                                                        ...current,
                                                        activities: [
                                                          ...(Array.isArray(current.activities) ? current.activities : []),
                                                          { activityImages: [], activityTitle: '', activityDescription: '' },
                                                        ],
                                                      }));
                                                      setItineraryOpenMap(prev => ({ ...prev, [index]: true }));
                                                    }}
                                                  >
                                                    <Plus className="h-4 w-4 mr-2" />
                                                    Add Activity
                                                  </Button>
                                                </div>
                                              </div>
                                            </AccordionContent>
                                          </AccordionItem>
                                        </Accordion>
                                      )}
                                    </SortableWrapper>
                                  );
                                })}
                              </SortableContext>
                            </DndContext>
                          </div>
                        </FormItem>
                      );
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Hotels tab content removed */}

            <TabsContent value="flights" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Flights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Move flights form fields here */}
                  <FormField
                    control={form.control}
                    name="flightDetails"
                    render={({ field: { value = [], onChange } }) => (
                      <FormItem>
                        <FormLabel>Create Flight Plan</FormLabel>
                        {
                          value.map((flight, index) => (

                            <div key={index} className="grid grid-cols-3 gap-8">
                              <FormControl>
                                <Input
                                  placeholder="Date"
                                  disabled={loading}
                                  value={flight.date}
                                  onChange={(e) => {
                                    const newFlightDetails = [...value];
                                    newFlightDetails[index] = { ...flight, date: e.target.value };
                                    onChange(newFlightDetails);
                                  }}
                                />
                              </FormControl>

                              <FormControl>
                                <Input
                                  placeholder="Flight Name"
                                  disabled={loading}
                                  value={flight.flightName}
                                  onChange={(e) => {
                                    const newFlightDetails = [...value];
                                    newFlightDetails[index] = { ...flight, flightName: e.target.value };
                                    onChange(newFlightDetails);
                                  }}
                                />
                              </FormControl>

                              <FormControl>
                                <Input
                                  placeholder="Flight Number"
                                  disabled={loading}
                                  value={flight.flightNumber}
                                  onChange={(e) => {
                                    const newFlightDetails = [...value];
                                    newFlightDetails[index] = { ...flight, flightNumber: e.target.value };
                                    onChange(newFlightDetails);
                                  }}
                                />
                              </FormControl>

                              <FormControl>
                                <Input
                                  placeholder="From"
                                  disabled={loading}
                                  value={flight.from}
                                  onChange={(e) => {
                                    const newFlightDetails = [...value];
                                    newFlightDetails[index] = { ...flight, from: e.target.value };
                                    onChange(newFlightDetails);
                                  }}
                                />
                              </FormControl>

                              <FormControl>

                                <Input
                                  placeholder="To"
                                  disabled={loading}
                                  value={flight.to}
                                  onChange={(e) => {
                                    const newFlightDetails = [...value];
                                    newFlightDetails[index] = { ...flight, to: e.target.value };
                                    onChange(newFlightDetails);
                                  }}
                                />
                              </FormControl>

                              <FormControl>

                                <Input
                                  placeholder="Departure Time"
                                  disabled={loading}
                                  value={flight.departureTime}
                                  onChange={(e) => {
                                    const newFlightDetails = [...value]; // Ensure this is your state array
                                    newFlightDetails[index] = { ...flight, departureTime: e.target.value };
                                    onChange(newFlightDetails);
                                  }}

                                />

                              </FormControl>
                              <FormControl>

                                <Input
                                  placeholder="Arrival Time"
                                  disabled={loading}
                                  value={flight.arrivalTime}
                                  onChange={(e) => {
                                    const newFlightDetails = [...value];
                                    newFlightDetails[index] = { ...flight, arrivalTime: e.target.value };
                                    onChange(newFlightDetails);
                                  }}
                                />
                              </FormControl>

                              <FormControl>
                                <Input
                                  placeholder="Flight Duration"
                                  disabled={loading}
                                  value={flight.flightDuration}
                                  onChange={(e) => {
                                    const newFlightDetails = [...value];
                                    newFlightDetails[index] = { ...flight, flightDuration: e.target.value };
                                    onChange(newFlightDetails);
                                  }}
                                />
                              </FormControl>


                              <FormControl>
                                <Button

                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  disabled={loading}
                                  onClick={() => {
                                    const newFlightDetails = value.filter((_, i: number) => i != index);
                                    onChange(newFlightDetails);
                                  }}>
                                  Remove Flight
                                </Button>
                              </FormControl>
                            </div>
                          ))}
                        <FormControl>
                          <Button type="button" size="sm"
                            disabled={loading}
                            onClick={() => onChange([...value, { date: '', flightName: '', flightNumber: '', from: '', to: '', departureTime: '', arrivalTime: '', flightDuration: '' }])}
                          >
                            Add Flight
                          </Button>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pricing" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Pricing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Add switch for default pricing options at the top */}
                  <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md mb-4">
                    <Switch
                      checked={useDefaultPricing}
                      onCheckedChange={handleUseDefaultPricingChange}
                      id="use-default-pricing"
                    />
                    <label
                      htmlFor="use-default-pricing"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Use default pricing options
                    </label>
                  </div>


                  <div className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-4">Dynamic Pricing Options</h3>
                    <FormField
                      control={form.control}
                      name="pricingSection"
                      render={() => (
                        <FormItem>
                          {/* Add column headers */}
                          <div className="grid grid-cols-3 gap-4 mb-2 px-1">
                            <div className="font-medium text-sm">Price Type</div>
                            <div className="font-medium text-sm">Price</div>
                            <div className="font-medium text-sm">Description (Optional)</div>
                          </div>
                          <div className="space-y-4">
                            {/* Use pricingFields from useFieldArray instead of field.value */}
                            {pricingFields.map((field, index) => (
                              <div key={field.id} className="grid grid-cols-3 gap-4 items-end relative pr-20 pt-2 border-t border-gray-100 first:border-t-0">
                                <FormField
                                  control={form.control}
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
                                  control={form.control}
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
                                  control={form.control}
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
                                          variant="destructive"
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
            </TabsContent>

            <TabsContent value="policies" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileCheck className="h-5 w-5" />
                    Policies & Terms
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="inclusions" className="w-full">
                    <TabsList className="grid grid-cols-4 w-full">
                      <TabsTrigger value="inclusions">
                        <ListChecks className="h-4 w-4 mr-2" />
                        Inclusions
                      </TabsTrigger>
                      <TabsTrigger value="notes">
                        <FileText className="h-4 w-4 mr-2" />
                        Notes & Tips
                      </TabsTrigger>
                      <TabsTrigger value="cancellation">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Cancellation
                      </TabsTrigger>
                      <TabsTrigger value="terms">
                        <ScrollText className="h-4 w-4 mr-2" />
                        Terms
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="inclusions" className="space-y-4 mt-4">
                      <div className="grid gap-4">
                        <PolicyField
                          control={form.control}
                          name="inclusions"
                          label="Inclusions"
                          loading={loading}
                          checked={useLocationDefaults.inclusions}
                          onCheckedChange={(checked) => handleUseLocationDefaultsChange('inclusions', checked)}
                          switchDescription="Use Switch to Copy Inclusions from the Selected Location"
                          placeholder="Add inclusion item..."
                        />

                        <PolicyField
                          control={form.control}
                          name="exclusions"
                          label="Exclusions"
                          loading={loading}
                          checked={useLocationDefaults.exclusions}
                          onCheckedChange={(checked) => handleUseLocationDefaultsChange('exclusions', checked)}
                          switchDescription="Use Switch to Copy Exclusions from the Selected Location"
                          placeholder="Add exclusion item..."
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="notes" className="space-y-4 mt-4">
                      <div className="grid gap-4">
                        <PolicyField
                          control={form.control}
                          name="importantNotes"
                          label="Important Notes"
                          loading={loading}
                          checked={useLocationDefaults.importantNotes}
                          onCheckedChange={(checked) => handleUseLocationDefaultsChange('importantNotes', checked)}
                          switchDescription="Use Switch to Copy Important Notes from the Selected Location"
                          placeholder="Add important note..."
                        />

                        <PolicyField
                          control={form.control}
                          name="usefulTip"
                          label="Useful Tips"
                          loading={loading}
                          checked={useLocationDefaults.usefulTip}
                          onCheckedChange={(checked) => handleUseLocationDefaultsChange('usefulTip', checked)}
                          switchDescription="Use Switch to Copy Useful Tips from the Selected Location"
                          placeholder="Add useful tip..."
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="cancellation" className="space-y-4 mt-4">
                      <div className="grid gap-4">
                        <PolicyField
                          control={form.control}
                          name="cancellationPolicy"
                          label="General Cancellation Policy"
                          loading={loading}
                          checked={useLocationDefaults.cancellationPolicy}
                          onCheckedChange={(checked) => handleUseLocationDefaultsChange('cancellationPolicy', checked)}
                          switchDescription="Use Switch to Copy Cancellation Policy from the Selected Location"
                          placeholder="Add cancellation policy item..."
                        />                        <PolicyField
                          control={form.control}
                          name="airlineCancellationPolicy"
                          label="Airline Cancellation Policy"
                          loading={loading}
                          checked={useLocationDefaults.airlineCancellationPolicy}
                          onCheckedChange={(checked) => handleUseLocationDefaultsChange('airlineCancellationPolicy', checked)}
                          switchDescription="Use Switch to Copy Airline Cancellation Policy from the Selected Location"
                          placeholder="Add airline cancellation policy item..."
                        />

                        <PolicyField
                          control={form.control}
                          name="kitchenGroupPolicy"
                          label="Kitchen Group Policy"
                          loading={loading}
                          checked={useLocationDefaults.kitchenGroupPolicy}
                          onCheckedChange={(checked) => handleUseLocationDefaultsChange('kitchenGroupPolicy', checked)}
                          switchDescription="Use Switch to Copy Kitchen Group Policy from the Selected Location"
                          placeholder="Add kitchen group policy item..."
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="terms" className="space-y-4 mt-4">
                      <div className="grid gap-4">
                        <PolicyField
                          control={form.control}
                          name="paymentPolicy"
                          label="Payment Policy"
                          loading={loading}
                          checked={useLocationDefaults.paymentPolicy}
                          onCheckedChange={(checked) => handleUseLocationDefaultsChange('paymentPolicy', checked)}
                          switchDescription="Use Switch to Copy Payment Policy from the Selected Location"
                          placeholder="Add payment policy item..."
                        />

                        <PolicyField
                          control={form.control}
                          name="termsconditions"
                          label="Terms and Conditions"
                          loading={loading}
                          checked={useLocationDefaults.termsconditions}
                          onCheckedChange={(checked) => handleUseLocationDefaultsChange('termsconditions', checked)}
                          switchDescription="Use Switch to Copy Terms and Conditions from the Selected Location"
                          placeholder="Add terms and conditions item..."
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="variants" className="space-y-4 mt-4">
              <PackageVariantsTab
                control={form.control}
                form={form}
                loading={loading}
                hotels={hotels}
                availableTourPackages={availableTourPackages}
                variantPricingLookup={variantPricingLookup}
                tourPackageId={initialData?.id}
              />
            </TabsContent>

          </Tabs >

          <div className="flex justify-end mt-8">
            {readOnly ? (
              <Button
                type="button"
                onClick={() => router.back()}
                className="flex items-center gap-2"
              >
                {action}
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading && (
                  <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293-1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
                {action}
              </Button>
            )}
          </div>
        </form >
      </Form >

      {process.env.NODE_ENV !== 'production' && <DevTool control={form.control} />}

    </>
  )
}
