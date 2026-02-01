"use client"

import * as z from "zod"
import axios from "axios"
import { JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, useEffect, useRef, useState } from "react" // Ensure useEffect is imported
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "react-hot-toast"
import { AlertCircle, AlignLeft, BedDouble, BuildingIcon, CheckIcon, ChevronDown, ChevronsUpDown, ChevronUp, FileCheck, FileText, HotelIcon, ImageIcon, ListChecks, ListPlus, MapPin, Plane, Plus, ScrollText, Tag, Trash, Type, Users, Utensils } from "lucide-react"
import {
  Activity,
  ActivityMaster,
  AssociatePartner,
  FlightDetails,
  Hotel,
  Images,
  Inquiry,
  Itinerary,
  ItineraryMaster,
  Location,
  MealPlan,
  OccupancyType,
  PackageVariant,
  PricingAttribute,
  PricingComponent,
  RoomType,
  TourPackage,
  TourPackagePricing,
  TourPackageQuery,
  VariantHotelMapping,
  VehicleType,
  LocationSeasonalPeriod,
} from "@prisma/client"
import { useParams, useRouter } from "next/navigation"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

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
import { Separator } from "@/components/ui/separator"
import { Heading } from "@/components/ui/heading"
import { AlertModal } from "@/components/modals/alert-modal"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import ImageUpload from "@/components/ui/image-upload"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { DatePickerWithRange } from "@/components/DatePickerWithRange"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "@radix-ui/react-icons"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { format } from "date-fns"
import JoditEditor from "jodit-react";
import { Switch } from "@/components/ui/switch"
import { convertJourneyDateToTourStart, createDatePickerValue, normalizeApiDate } from "@/lib/timezone-utils"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DevTool } from "@hookform/devtools"
import { Textarea } from "@/components/ui/textarea";
// Update imports for shared tab components
import BasicInfoTab from '@/components/tour-package-query/BasicInfoTab';
import DatesTab from '@/components/tour-package-query/DatesTab';
import FlightsTab from '@/components/tour-package-query/FlightsTab';
import GuestsTab from '@/components/tour-package-query/GuestsTab';
import ItineraryTab from '@/components/tour-package-query/ItineraryTab';
import LocationTab from '@/components/tour-package-query/LocationTab';
import PoliciesTab from '@/components/tour-package-query/PoliciesTab';
import PricingTab from '@/components/tour-package-query/PricingTab';
import HotelsTab from '@/components/tour-package-query/HotelsTab';
import { REMARKS_DEFAULT } from "@/app/(dashboard)/tourPackageQueryFromTourPackage/[tourPackageQueryFromTourPackageId]/components/defaultValues"
import { INCLUSIONS_DEFAULT, EXCLUSIONS_DEFAULT, IMPORTANT_NOTES_DEFAULT, KITCHEN_GROUP_POLICY_DEFAULT, PAYMENT_TERMS_DEFAULT, USEFUL_TIPS_DEFAULT, CANCELLATION_POLICY_DEFAULT, AIRLINE_CANCELLATION_POLICY_DEFAULT, TERMS_AND_CONDITIONS_DEFAULT, DISCLAIMER_DEFAULT, DEFAULT_PRICING_SECTION } from "@/components/tour-package-query/defaultValues"

// Define the pricing item schema
const activitySchema = z.object({
  activityTitle: z.string().optional(),
  activityDescription: z.string().optional(),
  activityImages: z.object({ url: z.string() }).array(),
});

// --- ADJUSTED SCHEMAS ---
const roomAllocationSchema = z.object({
  roomTypeId: z.string().optional(), // Changed from roomType
  occupancyTypeId: z.string().optional(), // Changed from occupancyType
  mealPlanId: z.string().optional(), // Changed from mealPlan
  quantity: z.union([
    z.string().transform(val => parseInt(val) || 1), // Transform string to number
    z.number()
  ]).optional(),
  guestNames: z.string().nullable().optional(),
  // New fields for enhanced room allocation
  voucherNumber: z.string().optional().nullable(),
  customRoomType: z.string().optional().nullable(),
  useCustomRoomType: z.boolean().optional().default(false)
});

const transportDetailsSchema = z.object({
  vehicleTypeId: z.string().optional(), // Changed from vehicleType
  transportType: z.string().optional(), // This might also need to become an ID if it's a lookup
  quantity: z.union([
    z.string().transform(val => parseInt(val) || 1), // Transform string to number
    z.number()
  ]).optional(),
  description: z.string().nullable().optional()
});

const itinerarySchema = z.object({
  itineraryImages: z.object({ url: z.string() }).array(),
  itineraryTitle: z.string().optional(),
  itineraryDescription: z.string().nullable().optional(),
  dayNumber: z.coerce.number().optional(),
  days: z.string().optional(),
  activities: z.array(activitySchema),
  hotelId: z.string().optional().default(''), // Make optional with default
  locationId: z.string().optional().default(''), // Make optional with default
  // Add room allocations and transport details arrays matching shared component schema
  roomAllocations: z.array(roomAllocationSchema).optional().default([]),
  transportDetails: z.array(transportDetailsSchema).optional().default([]),
});
// --- END ADJUSTED SCHEMAS ---


const flightDetailsSchema = z.object({

  date: z.string().optional(),
  flightName: z.string().optional(),
  flightNumber: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  departureTime: z.string().optional(),
  arrivalTime: z.string().optional(),
  flightDuration: z.string().optional(),

}); // Assuming an array of flight details

const pricingItemSchema = z.object({
  name: z.string().optional(), // Make optional to align
  price: z.string().optional(),
  description: z.string().optional(),
});

const formSchema = z.object({
  inquiryId: z.string().nullable().optional(),
  tourPackageTemplate: z.string().optional(),
  tourPackageQueryTemplate: z.string().optional(),  // Add fields to store the selected template ID and type
  selectedTemplateId: z.string().optional(),
  selectedTemplateType: z.string().optional(),
  tourPackageTemplateName: z.string().optional(),
  selectedTourPackageVariantId: z.string().optional(),
  selectedTourPackageVariantName: z.string().optional(),
  selectedVariantIds: z.array(z.string()).optional(),
  numberOfRooms: z.number().optional(),
  // Add fields for pricing calculations
  selectedMealPlanId: z.string().optional(),
  occupancySelections: z.array(z.object({
    occupancyTypeId: z.string(),
    count: z.number(),
    paxPerUnit: z.number()
  })).optional(),
  tourPackageQueryNumber: z.string().optional(),
  tourPackageQueryName: z.string().min(1, "Tour Package Query Name is required"),
  tourPackageQueryType: z.string().optional(),
  customerName: z.string().optional(),
  customerNumber: z.string().optional(),
  numDaysNight: z.string().optional(),
  period: z.string().optional(),
  tourStartsFrom: z.date().optional(),
  tourEndsOn: z.date().optional(),
  transport: z.string().optional().nullable().transform(val => val || ''),
  pickup_location: z.string().optional().nullable().transform(val => val || ''),
  drop_location: z.string().optional().nullable().transform(val => val || ''),
  numAdults: z.string().optional(),
  numChild5to12: z.string().optional(),
  numChild0to5: z.string().optional(),

  totalPrice: z.string().optional().nullable().transform(val => val || ''),
  remarks: z.string().optional(),
  locationId: z.string().min(1),
  flightDetails: flightDetailsSchema.array(),
  inclusions: z.array(z.string()),
  exclusions: z.array(z.string()),
  kitchenGroupPolicy: z.array(z.string()),
  importantNotes: z.array(z.string()),
  paymentPolicy: z.array(z.string()),
  usefulTip: z.array(z.string()),
  cancellationPolicy: z.array(z.string()),
  airlineCancellationPolicy: z.array(z.string()),
  termsconditions: z.array(z.string()),
  disclaimer: z.string().optional().nullable().transform(val => val || ''),
  images: z.object({ url: z.string() }).array(),
  itineraries: z.array(itinerarySchema).optional().default([]), // Use adjusted schema
  isFeatured: z.boolean().default(false).optional(),
  isArchived: z.boolean().default(false).optional(),
  associatePartnerId: z.string().optional(),
  pricingSection: z.array(pricingItemSchema).optional().default([]), // Use adjusted schema
  pricingTier: z.string().default('standard').optional(), // Added for pricing tier options
  customMarkup: z.string().optional(), // Added for custom markup percentage
});

type TourPackageQueryFormValues = z.infer<typeof formSchema>

interface TourPackageQueryFormProps {
  inquiry: Inquiry | null;
  locations: Location[];
  // --- ADJUSTED hotels TYPE ---
  hotels: (Hotel & {
    images: Images[];
  })[];
  // --- END ADJUSTED hotels TYPE ---
  activitiesMaster: (ActivityMaster & {
    activityMasterImages: Images[];
  })[] | null;
  itinerariesMaster: (ItineraryMaster & {
    itineraryMasterImages: Images[];
    activities: (Activity & {
      activityImages: Images[];
    })[] | null;
  })[] | null;
  associatePartners: AssociatePartner[]; // Add this line
  tourPackages: (TourPackage & {
    images: Images[];
    flightDetails: (FlightDetails & {
      images: Images[];
    })[];
    itineraries: (Itinerary & {
      itineraryImages: Images[];
      activities: (Activity & {
        activityImages: Images[];
      })[] | null;
    })[] | null;
    packageVariants?: (PackageVariant & {
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
    })[] | null;
  })[] | null;
  tourPackageQueries?: (TourPackageQuery & {
    images: Images[];
    flightDetails: FlightDetails[];
    itineraries: (Itinerary & {
      itineraryImages: Images[];
      activities: (Activity & {
        activityImages: Images[];
      })[] | null;
    })[] | null;
  })[] | null;
  // Add lookup types
  roomTypes?: RoomType[];
  occupancyTypes?: OccupancyType[];
  mealPlans?: MealPlan[];
  vehicleTypes?: VehicleType[];
};


export const TourPackageQueryFormClassic: React.FC<TourPackageQueryFormProps> = ({
  inquiry,
  locations,
  hotels,
  activitiesMaster,
  itinerariesMaster,
  associatePartners,
  tourPackages,
  tourPackageQueries = [],
}) => {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [openTemplate, setOpenTemplate] = useState(false);
  const [openQueryTemplate, setOpenQueryTemplate] = useState(false);
  const editor = useRef(null);
  // Keep state handlers but remove initialData related code  
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
  const [priceCalculationResult, setPriceCalculationResult] = useState<any>(null);
  const [lookupLoading, setLookupLoading] = useState(true); // Initialize as true
  // --- ADDED STATE FOR LOOKUP DATA ---
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [occupancyTypes, setOccupancyTypes] = useState<OccupancyType[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  // --- END ADDED STATE ---

  const title = "Create Tour Package Query from Inquiry";
  const description = "Convert this inquiry into a detailed tour package";
  const defaultValues = {
    tourPackageTemplate: '',
    tourPackageQueryTemplate: '',
    // Add defaults for the new fields
    selectedTemplateId: '',
    selectedTemplateType: '',
    tourPackageTemplateName: '',
    selectedTourPackageVariantId: '',
    selectedTourPackageVariantName: '',
    numberOfRooms: undefined,
    // Add defaults for pricing calculation fields
    selectedMealPlanId: '',
    occupancySelections: [],
    tourPackageQueryNumber: `TPQ-${Date.now()}`,
    associatePartnerId: inquiry?.associatePartnerId || '',
    tourPackageQueryType: '',
    customerName: inquiry?.customerName || '',
    customerNumber: inquiry?.customerMobileNumber || '',
    numDaysNight: '',
    period: '',
    locationId: inquiry?.locationId || '',
    pickup_location: '',
    drop_location: '',
    numAdults: inquiry?.numAdults?.toString() || '',
    numChild5to12: inquiry?.numChildren5to11?.toString() || '',
    numChild0to5: inquiry?.numChildrenBelow5?.toString() || '',
    tourStartsFrom: convertJourneyDateToTourStart(inquiry?.journeyDate),
    tourEndsOn: undefined,
    remarks: REMARKS_DEFAULT,

    totalPrice: '',
    inclusions: INCLUSIONS_DEFAULT,
    exclusions: EXCLUSIONS_DEFAULT,
    importantNotes: IMPORTANT_NOTES_DEFAULT,
    paymentPolicy: PAYMENT_TERMS_DEFAULT,
    usefulTip: USEFUL_TIPS_DEFAULT,
    kitchenGroupPolicy: KITCHEN_GROUP_POLICY_DEFAULT,
    cancellationPolicy: CANCELLATION_POLICY_DEFAULT,
    airlineCancellationPolicy: AIRLINE_CANCELLATION_POLICY_DEFAULT,
    termsconditions: TERMS_AND_CONDITIONS_DEFAULT,
    disclaimer: DISCLAIMER_DEFAULT,
    pricingSection: DEFAULT_PRICING_SECTION,
    pricingTier: 'standard', // Add default
    customMarkup: '', // Add default
    images: [],
    flightDetails: [],
    itineraries: [],
    isFeatured: false,
  };

  const form = useForm<TourPackageQueryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  // --- ADDED useEffect TO FETCH LOOKUP DATA ---
  useEffect(() => {
    const fetchLookupData = async () => {
      // Keep setLoading(true) if it was already there, otherwise remove this line
      // setLoading(true); // This might be for the main form submission, not lookup
      setLookupLoading(true); // Set lookup loading to true
      try {
        const [roomTypesRes, occupancyTypesRes, mealPlansRes, vehicleTypesRes] = await Promise.all([
          axios.get('/api/room-types'),
          axios.get('/api/occupancy-types'),
          axios.get('/api/meal-plans'),
          axios.get('/api/vehicle-types')
        ]);
        setRoomTypes(roomTypesRes.data);
        setOccupancyTypes(occupancyTypesRes.data);
        setMealPlans(mealPlansRes.data);
        setVehicleTypes(vehicleTypesRes.data);
      } catch (error) {
        console.error("Error fetching lookup data:", error);
        toast.error("Failed to load configuration data. Please try refreshing.");
      } finally {
        setLookupLoading(false); // Set lookup loading to false after fetch/error
        // Keep setLoading(false) if it was tied to the main form submission
        // setLoading(false);
      }
    };

    fetchLookupData();
  }, []); // Empty dependency array ensures this runs only once on mount
  // --- END ADDED useEffect ---

  const parsePricingSection = (data: any): Array<{ name: string, price: string, description?: string }> => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    try {
      const parsed = JSON.parse(data as string);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  };


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
            break;
          case 'termsconditions':
            form.setValue('termsconditions', parseJsonField(selectedLocation.termsconditions) || TERMS_AND_CONDITIONS_DEFAULT);
            break;
        }
      }
    }
  };

  const handleTourPackageVariantSelection = (tourPackageId: string, variantIds: string[]) => {
    const selectedTourPackage = tourPackages?.find(tp => tp.id === tourPackageId);
    if (!selectedTourPackage) {
      toast.error('Unable to locate selected tour package.');
      return;
    }

    // Store the selected variant IDs array
    form.setValue('selectedVariantIds', variantIds);

    // Handle legacy single variant field for backward compatibility
    const selectedVariantId = variantIds.length > 0 ? variantIds[0] : '';

    if (!selectedVariantId) {
      form.setValue('selectedTourPackageVariantId', '');
      form.setValue('selectedTourPackageVariantName', '');
      form.setValue('selectedTemplateId', tourPackageId);
      form.setValue('selectedTemplateType', 'TourPackage');
      form.setValue('tourPackageTemplateName', selectedTourPackage.tourPackageName || `Package ${tourPackageId.substring(0, 8)}`);
      form.setValue('selectedMealPlanId', '');
      form.setValue('numberOfRooms', undefined);
      return;
    }

    const variant = selectedTourPackage.packageVariants?.find((variantItem) => variantItem.id === selectedVariantId);
    if (!variant) {
      toast.error('Variant not found for selected tour package.');
      return;
    }

    form.setValue('selectedTourPackageVariantId', selectedVariantId);
    form.setValue('selectedTourPackageVariantName', variant.name || 'Variant');
    form.setValue('selectedTemplateId', selectedVariantId);
    form.setValue('selectedTemplateType', 'TourPackageVariant');
    form.setValue('tourPackageTemplate', tourPackageId);
    const combinedTemplateName = [selectedTourPackage.tourPackageName, variant.name].filter(Boolean).join(' - ');
    if (combinedTemplateName) {
      form.setValue('tourPackageTemplateName', combinedTemplateName);
    }

    // Hotel mappings are now handled via variant snapshots created on save
    // No need to apply them here

    if (Array.isArray(variant.tourPackagePricings) && variant.tourPackagePricings.length > 0) {
      const sortedPricings = [...variant.tourPackagePricings].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      const primaryPricing = sortedPricings[0];
      if (primaryPricing?.mealPlanId) {
        form.setValue('selectedMealPlanId', primaryPricing.mealPlanId);
      }
      if (typeof primaryPricing?.numberOfRooms === 'number') {
        form.setValue('numberOfRooms', primaryPricing.numberOfRooms);
      }
    }

    if (variantIds.length === 1) {
      toast.success('Variant selected successfully.');
    } else if (variantIds.length > 1) {
      toast.success(`${variantIds.length} variants selected successfully.`);
    }
  };

  const handleTourPackageSelection = (selectedTourPackageId: string) => {
    const selectedTourPackage = tourPackages?.find((tp) => tp.id === selectedTourPackageId);
    if (!selectedTourPackage) {
      toast.error('Unable to locate selected tour package.');
      return;
    }

    form.setValue('tourPackageTemplate', selectedTourPackageId);
    form.setValue('tourPackageQueryTemplate', '');

    const customerName = form.getValues('customerName');
    const packageName = selectedTourPackage.tourPackageName || '';

    const queryNameParts: string[] = [];
    if (customerName) queryNameParts.push(customerName);
    if (packageName) queryNameParts.push(packageName);
    if (queryNameParts.length > 0) {
      form.setValue('tourPackageQueryName', queryNameParts.join(' - '));
    }

    form.setValue('tourPackageQueryType', String(selectedTourPackage.tourPackageType || ''));
    form.setValue('locationId', selectedTourPackage.locationId || '');
    form.setValue('numDaysNight', String(selectedTourPackage.numDaysNight || ''));
    form.setValue('transport', String(selectedTourPackage.transport || ''));
    form.setValue('pickup_location', String(selectedTourPackage.pickup_location || ''));
    form.setValue('drop_location', String(selectedTourPackage.drop_location || ''));
    // form.setValue('totalPrice', String(selectedTourPackage.totalPrice || '')); // REMOVED
    form.setValue('inclusions', parseJsonField(selectedTourPackage.inclusions) || INCLUSIONS_DEFAULT);
    form.setValue('exclusions', parseJsonField(selectedTourPackage.exclusions) || EXCLUSIONS_DEFAULT);
    form.setValue('importantNotes', parseJsonField(selectedTourPackage.importantNotes) || IMPORTANT_NOTES_DEFAULT);
    form.setValue('paymentPolicy', parseJsonField(selectedTourPackage.paymentPolicy) || PAYMENT_TERMS_DEFAULT);
    form.setValue('usefulTip', parseJsonField(selectedTourPackage.usefulTip) || USEFUL_TIPS_DEFAULT);
    form.setValue('cancellationPolicy', parseJsonField(selectedTourPackage.cancellationPolicy) || CANCELLATION_POLICY_DEFAULT);
    form.setValue('airlineCancellationPolicy', parseJsonField(selectedTourPackage.airlineCancellationPolicy) || AIRLINE_CANCELLATION_POLICY_DEFAULT);
    form.setValue('termsconditions', parseJsonField(selectedTourPackage.termsconditions) || TERMS_AND_CONDITIONS_DEFAULT);
    form.setValue('images', selectedTourPackage.images || []);

    const transformedItineraries = selectedTourPackage.itineraries?.map((itinerary) => ({
      locationId: itinerary.locationId || '',
      itineraryImages: itinerary.itineraryImages?.map((img) => ({ url: img.url })) || [],
      itineraryTitle: itinerary.itineraryTitle || '',
      itineraryDescription: itinerary.itineraryDescription || '',
      dayNumber: itinerary.dayNumber || 0,
      days: itinerary.days || '',
      activities: itinerary.activities?.map((activity) => ({
        activityImages: activity.activityImages?.map((img) => ({ url: img.url })) || [],
        activityTitle: activity.activityTitle || '',
        activityDescription: activity.activityDescription || '',
      })) || [],
      hotelId: itinerary.hotelId || '',
      roomAllocations: (itinerary as any).roomAllocations?.map((alloc: any) => ({
        roomTypeId: alloc.roomTypeId || alloc.roomType || '',
        occupancyTypeId: alloc.occupancyTypeId || alloc.occupancyType || '',
        mealPlanId: alloc.mealPlanId || alloc.mealPlan || '',
        quantity: Number(alloc.quantity) || 1,
        guestNames: alloc.guestNames || '',
      })) || [],
      transportDetails: (itinerary as any).transportDetails?.map((detail: any) => ({
        vehicleTypeId: detail.vehicleTypeId || detail.vehicleType || '',
        transportType: detail.transportType || '',
        quantity: Number(detail.quantity) || 1,
        description: detail.description || '',
      })) || [],
    })) || [];

    form.setValue('itineraries', transformedItineraries);
    form.setValue('flightDetails', (selectedTourPackage.flightDetails || []).map((flight) => ({
      date: flight.date || undefined,
      flightName: flight.flightName || undefined,
      flightNumber: flight.flightNumber || undefined,
      from: flight.from || undefined,
      to: flight.to || undefined,
      departureTime: flight.departureTime || undefined,
      arrivalTime: flight.arrivalTime || undefined,
      flightDuration: flight.flightDuration || undefined,
    })));
    form.setValue('pricingSection', parsePricingSection(selectedTourPackage.pricingSection) || DEFAULT_PRICING_SECTION);
    form.setValue('pricingTier', (selectedTourPackage as any).pricingTier || 'standard');
    form.setValue('customMarkup', (selectedTourPackage as any).customMarkup || '');

    handleTourPackageVariantSelection(selectedTourPackageId, []);
    const defaultVariant = selectedTourPackage.packageVariants?.find((variantItem) => variantItem.isDefault);
    if (defaultVariant?.id) {
      handleTourPackageVariantSelection(selectedTourPackageId, [defaultVariant.id]);
    }
  };

  const handleTourPackageQuerySelection = (selectedTourPackageQueryId: string) => {
    const selectedTourPackageQuery = tourPackageQueries?.find(tpq => tpq.id === selectedTourPackageQueryId);
    if (selectedTourPackageQuery) {
      form.setValue('tourPackageQueryTemplate', selectedTourPackageQueryId);
      // Set the selected template info
      form.setValue('selectedTemplateId', selectedTourPackageQueryId);
      form.setValue('selectedTemplateType', 'TourPackageQuery');
      form.setValue('tourPackageTemplate', ''); // Clear the package template field
      form.setValue('selectedTourPackageVariantId', '');
      form.setValue('selectedTourPackageVariantName', '');
      form.setValue('selectedMealPlanId', '');
      form.setValue('numberOfRooms', undefined);
      form.setValue('tourPackageTemplateName', selectedTourPackageQuery.tourPackageQueryName || '');
      // Update form fields with selected tour package query data
      form.setValue('tourPackageQueryName', selectedTourPackageQuery.tourPackageQueryName || '');
      form.setValue('tourPackageQueryType', String(selectedTourPackageQuery.tourPackageQueryType || ''));
      form.setValue('locationId', selectedTourPackageQuery.locationId);
      //form.setValue('numDaysNight', String(selectedTourPackageQuery.numDaysNight || ''));
      // form.setValue('customerName', selectedTourPackageQuery.customerName || '');
      // form.setValue('customerNumber', selectedTourPackageQuery.customerNumber || '');
      form.setValue('transport', String(selectedTourPackageQuery.transport || ''));
      form.setValue('pickup_location', String(selectedTourPackageQuery.pickup_location || ''));
      form.setValue('drop_location', String(selectedTourPackageQuery.drop_location || ''));
      form.setValue('totalPrice', String(selectedTourPackageQuery.totalPrice || ''));
      //form.setValue('numAdults', String(selectedTourPackageQuery.numAdults || ''));
      //form.setValue('numChild5to12', String(selectedTourPackageQuery.numChild5to12 || ''));
      //form.setValue('numChild0to5', String(selectedTourPackageQuery.numChild0to5 || ''));
      form.setValue('remarks', String(selectedTourPackageQuery.remarks || REMARKS_DEFAULT));
      form.setValue('inclusions', selectedTourPackageQuery.inclusions ? parseJsonField(selectedTourPackageQuery.inclusions) : INCLUSIONS_DEFAULT);
      form.setValue('exclusions', selectedTourPackageQuery.exclusions ? parseJsonField(selectedTourPackageQuery.exclusions) : EXCLUSIONS_DEFAULT);
      form.setValue('importantNotes', selectedTourPackageQuery.importantNotes ? parseJsonField(selectedTourPackageQuery.importantNotes) : IMPORTANT_NOTES_DEFAULT);
      form.setValue('paymentPolicy', selectedTourPackageQuery.paymentPolicy ? parseJsonField(selectedTourPackageQuery.paymentPolicy) : PAYMENT_TERMS_DEFAULT);
      form.setValue('usefulTip', selectedTourPackageQuery.usefulTip ? parseJsonField(selectedTourPackageQuery.usefulTip) : USEFUL_TIPS_DEFAULT);
      form.setValue('cancellationPolicy', selectedTourPackageQuery.cancellationPolicy ? parseJsonField(selectedTourPackageQuery.cancellationPolicy) : CANCELLATION_POLICY_DEFAULT);
      form.setValue('airlineCancellationPolicy', selectedTourPackageQuery.airlineCancellationPolicy ? parseJsonField(selectedTourPackageQuery.airlineCancellationPolicy) : AIRLINE_CANCELLATION_POLICY_DEFAULT);
      form.setValue('termsconditions', selectedTourPackageQuery.termsconditions ? parseJsonField(selectedTourPackageQuery.termsconditions) : TERMS_AND_CONDITIONS_DEFAULT);
      form.setValue('disclaimer', String(selectedTourPackageQuery.disclaimer || DISCLAIMER_DEFAULT));
      form.setValue('associatePartnerId', selectedTourPackageQuery.associatePartnerId || inquiry?.associatePartnerId || '');
      form.setValue('images', selectedTourPackageQuery.images || []);

      // Copy complex objects like flightDetails and itineraries
      if (selectedTourPackageQuery.flightDetails && selectedTourPackageQuery.flightDetails.length > 0) {
        form.setValue('flightDetails', selectedTourPackageQuery.flightDetails.map(flight => ({
          date: flight.date || '',
          flightName: flight.flightName || '',
          flightNumber: flight.flightNumber || '',
          from: flight.from || '',
          to: flight.to || '',
          departureTime: flight.departureTime || '',
          arrivalTime: flight.arrivalTime || '',
          flightDuration: flight.flightDuration || ''
        })));
      }

      if (selectedTourPackageQuery.itineraries && selectedTourPackageQuery.itineraries.length > 0) {
        form.setValue('itineraries', selectedTourPackageQuery.itineraries.map(itinerary => ({
          locationId: itinerary.locationId || form.getValues('locationId') || '', // Use optional default
          itineraryImages: itinerary.itineraryImages?.map(img => ({ url: img.url })) || [],
          itineraryTitle: itinerary.itineraryTitle || '',
          itineraryDescription: itinerary.itineraryDescription || '',
          dayNumber: itinerary.dayNumber || 0,
          days: itinerary.days || '',
          activities: itinerary.activities?.map(activity => ({
            activityTitle: activity.activityTitle || '',
            activityDescription: activity.activityDescription || '',
            activityImages: activity.activityImages?.map(img => ({ url: img.url })) || []
          })) || [],
          hotelId: itinerary.hotelId || '', // Use optional default
          // Map roomAllocations and transportDetails from query template
          roomAllocations: (itinerary as any).roomAllocations?.map((alloc: any) => ({
            roomTypeId: alloc.roomTypeId || alloc.roomType || '',
            occupancyTypeId: alloc.occupancyTypeId || alloc.occupancyType || '',
            mealPlanId: alloc.mealPlanId || alloc.mealPlan || '',
            quantity: Number(alloc.quantity) || 1,
            guestNames: alloc.guestNames || ''
          })) || [],
          transportDetails: (itinerary as any).transportDetails?.map((detail: any) => ({
            vehicleTypeId: detail.vehicleTypeId || detail.vehicleType || '',
            transportType: detail.transportType || '',
            quantity: Number(detail.quantity) || 1,
            description: detail.description || ''
          })) || [],
        })));
      } else {
        form.setValue('itineraries', []); // Clear if template has none
      }

      // Attempt to parse and set pricing section if available
      try {
        if (selectedTourPackageQuery.pricingSection) {
          form.setValue('pricingSection', parsePricingSection(selectedTourPackageQuery.pricingSection));
        }
      } catch (error) {
        console.error("Error parsing pricing section:", error);
      }
    }
  };
  const onSubmit = async (data: TourPackageQueryFormValues) => {
    // --- ADJUST onSubmit TO MATCH SCHEMA ---
    const formattedData = {
      ...data, // selectedTemplateId and selectedTemplateType are included here
      inquiryId: params.inquiryId,
      transport: data.transport || '',
      pickup_location: data.pickup_location || '',
      drop_location: data.drop_location || '',
      totalPrice: data.totalPrice || '',
      disclaimer: data.disclaimer || '',
      // Apply timezone normalization to date fields
      tourStartsFrom: normalizeApiDate(data.tourStartsFrom),
      tourEndsOn: normalizeApiDate(data.tourEndsOn),
      // Explicitly type the 'itinerary' parameter
      itineraries: data.itineraries.map((itinerary: z.infer<typeof itinerarySchema>) => ({
        ...itinerary,
        locationId: data.locationId,
        activities: itinerary.activities?.map((activity) => ({
          ...activity,
          locationId: data.locationId,
        })),
        // Ensure correct spelling and explicit types
        roomAllocations: itinerary.roomAllocations?.map((alloc: z.infer<typeof roomAllocationSchema>) => ({
          ...alloc,
          quantity: Number(alloc.quantity) || 1 // Ensure quantity is a number
        })),
        transportDetails: itinerary.transportDetails?.map((detail: z.infer<typeof transportDetailsSchema>) => ({
          ...detail,
          quantity: Number(detail.quantity) || 1 // Ensure quantity is a number
        })),
      })),
      pricingSection: data.pricingSection || [],
    };

    // --- END ADJUST onSubmit ---
    try {
      setLoading(true);
      console.log("Submitting data:", formattedData); // Log data before sending
      const response = await axios.post(`/api/tourPackageQuery`, formattedData);
      console.log("API Response:", response.data); // Log API response

      // Check if we have a tour package query ID to redirect to display page
      if (response.data?.id) {
        router.refresh();
        // Redirect to tour package query display page instead of edit page
        router.push(`/tourPackageQueryDisplay/${response.data.id}`);
        toast.success("Tour Package Query created successfully! Redirecting to display page...");
      } else {
        // Fallback to inquiries if no ID is returned
        router.refresh();
        router.push(`/inquiries`);
        toast.success("Tour Package Query created successfully!");
      }
    } catch (error: any) {
      console.error("Submission error:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // Remove handlers now managed by shared components
  // const handleMealChange = (...) => { ... };
  // const handleActivitySelection = (...) => { ... };
  // const handleAddPricingItem = () => { ... };
  // const handleRemovePricingItem = (index: number) => { ... };

  const [open, setOpen] = useState(false); // Keep if delete functionality is needed

  // Add loading indicator for lookup data
  if (lookupLoading) {
    return <div className="flex justify-center items-center h-64">Loading configuration data...</div>; // Improved loading indicator
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-1">
          <Heading title={title} description={description} />
        </div>
      </div>
      <Separator className="mb-8" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {Object.keys(form.formState.errors).length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-800 text-sm font-medium flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 001.414-1.414L11.414 10l1.293-1.293a1 1 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
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
            {/* Mobile-friendly tab list with responsive grid and scroll */}
            <div className="overflow-x-auto pb-2 mb-2 -mx-4 sm:mx-0">
              <div className="min-w-full px-4 sm:px-0">
                <TabsList className="grid min-w-max md:min-w-0 grid-cols-4 md:grid-cols-9 w-full bg-muted/60">
                  <TabsTrigger value="basic" className="flex items-center gap-1 md:gap-2 text-xs sm:text-sm py-1.5 sm:py-2">
                    <FileText className="h-4 w-4" />
                    <span className="truncate">Basic</span>
                  </TabsTrigger>
                  <TabsTrigger value="guests" className="flex items-center gap-1 md:gap-2 text-xs sm:text-sm py-1.5 sm:py-2">
                    <Users className="h-4 w-4" />
                    <span className="truncate">Guests</span>
                  </TabsTrigger>
                  <TabsTrigger value="location" className="flex items-center gap-1 md:gap-2 text-xs sm:text-sm py-1.5 sm:py-2">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">Location</span>
                  </TabsTrigger>
                  <TabsTrigger value="dates" className="flex items-center gap-1 md:gap-2 text-xs sm:text-sm py-1.5 sm:py-2">
                    <CalendarIcon className="h-4 w-4" />
                    <span className="truncate">Dates</span>
                  </TabsTrigger>
                  <TabsTrigger value="itinerary" className="flex items-center gap-1 md:gap-2 text-xs sm:text-sm py-1.5 sm:py-2">
                    <ListPlus className="h-4 w-4" />
                    <span className="truncate">Itinerary</span>
                  </TabsTrigger>
                  <TabsTrigger value="hotels" className="flex items-center gap-1 md:gap-2 text-xs sm:text-sm py-1.5 sm:py-2">
                    <BuildingIcon className="h-4 w-4" />
                    <span className="truncate">Hotels</span>
                    {(() => {
                      try {
                        const its: any[] = form.watch('itineraries') || [];
                        const missing = its.reduce((acc, it) => (!it?.hotelId ? acc + 1 : acc), 0);
                        return missing > 0 ? (
                          <span className="ml-1 bg-red-600 text-white rounded-full px-1.5 py-0.5 text-[10px] leading-none font-medium">
                            {missing}
                          </span>
                        ) : null;
                      } catch {
                        return null;
                      }
                    })()}
                  </TabsTrigger>
                  <TabsTrigger value="flights" className="flex items-center gap-1 md:gap-2 text-xs sm:text-sm py-1.5 sm:py-2">
                    <Plane className="h-4 w-4" />
                    <span className="truncate">Flights</span>
                  </TabsTrigger>
                  <TabsTrigger value="pricing" className="flex items-center gap-1 md:gap-2 text-xs sm:text-sm py-1.5 sm:py-2">
                    <Tag className="h-4 w-4" />
                    <span className="truncate">Pricing</span>
                  </TabsTrigger>
                  <TabsTrigger value="policies" className="flex items-center gap-1 md:gap-2 text-xs sm:text-sm py-1.5 sm:py-2">
                    <FileCheck className="h-4 w-4" />
                    <span className="truncate">Policies</span>
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>

            <TabsContent value="basic" className="space-y-4 mt-4">
              {/* Use BasicInfoTab from shared components */}
              <BasicInfoTab
                control={form.control}
                loading={loading}
                associatePartners={associatePartners}
                tourPackages={tourPackages}
                tourPackageQueries={tourPackageQueries}
                openTemplate={openTemplate}
                setOpenTemplate={setOpenTemplate}
                openQueryTemplate={openQueryTemplate}
                setOpenQueryTemplate={setOpenQueryTemplate}
                handleTourPackageSelection={handleTourPackageSelection}
                handleTourPackageVariantSelection={handleTourPackageVariantSelection}
                handleTourPackageQuerySelection={handleTourPackageQuerySelection}
                form={form}
              />
            </TabsContent>

            {/* Use GuestsTab from shared components */}
            <TabsContent value="guests" className="space-y-4 mt-4">
              <GuestsTab
                control={form.control}
                loading={loading}
              />
            </TabsContent>

            {/* Use LocationTab from shared components */}
            <TabsContent value="location" className="space-y-4 mt-4">
              <LocationTab
                control={form.control}
                loading={loading}
                locations={locations}
                form={form}
                updateLocationDefaults={handleUseLocationDefaultsChange}
              />
            </TabsContent>

            {/* Use DatesTab from shared components */}
            <TabsContent value="dates" className="space-y-4 mt-4">
              <DatesTab
                control={form.control}
                loading={loading}
                form={form}
              />
            </TabsContent>

            {/* Use ItineraryTab from shared components */}
            <TabsContent value="itinerary" className="space-y-4 mt-4">
              <ItineraryTab
                control={form.control}
                loading={loading}
                hotels={hotels} // Correctly typed
                activitiesMaster={activitiesMaster}
                itinerariesMaster={itinerariesMaster}
                form={form}
                // --- PASS LOOKUP DATA TO ITINERARY TAB ---
                roomTypes={roomTypes}
                occupancyTypes={occupancyTypes}
                mealPlans={mealPlans}
                vehicleTypes={vehicleTypes}
              // --- END PASS LOOKUP DATA ---
              />
            </TabsContent>

            <TabsContent value="hotels" className="space-y-4 mt-4">
              <HotelsTab
                control={form.control}
                form={form}
                loading={loading}
                hotels={hotels}
                roomTypes={roomTypes}
                occupancyTypes={occupancyTypes}
                mealPlans={mealPlans}
                vehicleTypes={vehicleTypes}
              />
            </TabsContent>

            {/* Use FlightsTab from shared components */}
            <TabsContent value="flights" className="space-y-4 mt-4">
              <FlightsTab
                control={form.control}
                loading={loading}
                form={form}
              />
            </TabsContent>

            {/* Use PricingTab from shared components */}
            <TabsContent value="pricing" className="space-y-4 mt-4">
              <PricingTab
                control={form.control}
                loading={loading}
                form={form}
                hotels={hotels}
                roomTypes={roomTypes}
                occupancyTypes={occupancyTypes}
                mealPlans={mealPlans}
                vehicleTypes={vehicleTypes}
                priceCalculationResult={priceCalculationResult}
                setPriceCalculationResult={setPriceCalculationResult}
                selectedTemplateId={form.watch('selectedTemplateId')}
                selectedTemplateType={form.watch('selectedTemplateType')}
                selectedTourPackageVariantId={form.watch('selectedTourPackageVariantId')}
              />
            </TabsContent>

            {/* Use PoliciesTab from shared components */}
            <TabsContent value="policies" className="space-y-4 mt-4">
              <PoliciesTab
                control={form.control}
                loading={loading}
                form={form}
                useLocationDefaults={useLocationDefaults}
                onUseLocationDefaultsChange={handleUseLocationDefaultsChange}
              />
            </TabsContent>

          </Tabs>

          <div className="flex justify-end mt-8">
            <Button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading && (
                <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              Create Tour Package Query
            </Button>
          </div>
        </form>
      </Form>

      {process.env.NODE_ENV !== 'production' && <DevTool control={form.control} />}

    </>
  )
}
