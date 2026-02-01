"use client"

import * as z from "zod"
import axios from "axios"
import { JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, useEffect, useRef, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "react-hot-toast"
import { format } from "date-fns"
import { AlertCircle, AlignLeft, BedDouble, BuildingIcon, CheckIcon, ChevronDown, ChevronsUpDown, ChevronUp, Edit, FileCheck, FileText, HotelIcon, ImageIcon, ListChecks, ListPlus, MapPin, Plane, Plus, ScrollText, Tag, Trash, Type, Users, Utensils, Calendar as CalendarIcon } from "lucide-react"
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
import dynamic from "next/dynamic";

const JoditEditor = dynamic(() => import("jodit-react"), { ssr: false });

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
import { cn } from "@/lib/utils"
import { convertJourneyDateToTourStart, normalizeApiDate } from "@/lib/timezone-utils"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { DevTool } from "@hookform/devtools"
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

// Brand Colors from PDF Generator
const brandColors = {
  primary: "#DC2626",
  secondary: "#EA580C",
  accent: "#F97316",
  light: "#FEF2F2",
  lightOrange: "#FFF7ED",
  text: "#1F2937",
  muted: "#6B7280",
  white: "#FFFFFF",
  border: "#E5E7EB",
  success: "#059669",
  panelBg: "#FFF8F5",
  subtlePanel: "#FFFDFB",
  tableHeaderBg: "#FFF3EC",
};

const PDFLikeSection = ({ title, children, className, icon: Icon, action }: { title: string, children: React.ReactNode, className?: string, icon?: any, action?: React.ReactNode }) => (
  <div className={cn("mb-8 overflow-hidden rounded-lg border shadow-sm", className)} style={{ borderColor: brandColors.border, backgroundColor: brandColors.white }}>
    <div className="flex items-center justify-between px-4 py-3 border-b" style={{ background: brandColors.tableHeaderBg, borderColor: brandColors.border }}>
       <div className="flex items-center gap-2">
         {Icon && <Icon className="h-5 w-5" style={{ color: brandColors.secondary }} />}
         <h3 className="text-lg font-bold" style={{ color: brandColors.text }}>{title}</h3>
       </div>
       {action && <div>{action}</div>}
    </div>
    <div className="p-6">
      {children}
    </div>
  </div>
);

// Display Components
const DataDisplayRow = ({ label, value, className }: { label: string, value?: string | number, className?: string }) => {
  if (!value) return null;
  return (
    <div className={cn("flex justify-between py-2 border-b", className)} style={{ borderColor: brandColors.border }}>
      <span className="font-semibold text-sm" style={{ color: brandColors.muted }}>{label}</span>
      <span className="text-sm" style={{ color: brandColors.text }}>{value}</span>
    </div>
  );
};

const InfoCard = ({ label, value }: { label: string, value?: string | number }) => {
  if (!value) return null;
  return (
    <div className="p-3 rounded-md border-l-4" style={{ 
      background: brandColors.panelBg, 
      borderColor: brandColors.primary 
    }}>
      <div className="text-xs font-semibold mb-1" style={{ color: brandColors.muted }}>{label}</div>
      <div className="text-sm font-semibold" style={{ color: brandColors.text }}>{value}</div>
    </div>
  );
};

const InfoCardGrid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-2 gap-3 mb-4">
    {children}
  </div>
);

// Define the pricing item schema
const activitySchema = z.object({
  activityTitle: z.string().optional(),
  activityDescription: z.string().optional(),
  activityImages: z.object({ url: z.string() }).array(),
});

const roomAllocationSchema = z.object({
  roomTypeId: z.string().optional(),
  occupancyTypeId: z.string().optional(),
  mealPlanId: z.string().optional(),
  quantity: z.union([
    z.string().transform(val => parseInt(val) || 1),
    z.number()
  ]).optional(),
  guestNames: z.string().nullable().optional(),
  voucherNumber: z.string().optional().nullable(),
  customRoomType: z.string().optional().nullable(),
  useCustomRoomType: z.boolean().optional().default(false)
});

const transportDetailsSchema = z.object({
  vehicleTypeId: z.string().optional(),
  transportType: z.string().optional(),
  quantity: z.union([
    z.string().transform(val => parseInt(val) || 1),
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
  hotelId: z.string().optional().default(''),
  locationId: z.string().optional().default(''),
  roomAllocations: z.array(roomAllocationSchema).optional().default([]),
  transportDetails: z.array(transportDetailsSchema).optional().default([]),
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
});

const pricingItemSchema = z.object({
  name: z.string().optional(),
  price: z.string().optional(),
  description: z.string().optional(),
});

const formSchema = z.object({
  inquiryId: z.string().nullable().optional(),
  tourPackageTemplate: z.string().optional(),
  tourPackageQueryTemplate: z.string().optional(),
  selectedTemplateId: z.string().optional(),
  selectedTemplateType: z.string().optional(),
  tourPackageTemplateName: z.string().optional(),
  selectedTourPackageVariantId: z.string().optional(),
  selectedTourPackageVariantName: z.string().optional(),
  selectedVariantIds: z.array(z.string()).optional(),
  numberOfRooms: z.number().optional(),
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
  itineraries: z.array(itinerarySchema).optional().default([]),
  isFeatured: z.boolean().default(false).optional(),
  isArchived: z.boolean().default(false).optional(),
  associatePartnerId: z.string().optional(),
  pricingSection: z.array(pricingItemSchema).optional().default([]),
  pricingTier: z.string().default('standard').optional(),
  customMarkup: z.string().optional(),
});

type TourPackageQueryFormValues = z.infer<typeof formSchema>

interface TourPackageQueryFormProps {
  inquiry: Inquiry | null;
  locations: Location[];
  hotels: (Hotel & {
    images: Images[];
  })[];
  activitiesMaster: (ActivityMaster & {
    activityMasterImages: Images[];
  })[] | null;
  itinerariesMaster: (ItineraryMaster & {
    itineraryMasterImages: Images[];
    activities: (Activity & {
      activityImages: Images[];
    })[] | null;
  })[] | null;
  associatePartners: AssociatePartner[];
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
  roomTypes?: RoomType[];
  occupancyTypes?: OccupancyType[];
  mealPlans?: MealPlan[];
  vehicleTypes?: VehicleType[];
};

export const TourPackageQueryFormWYSIWYG: React.FC<TourPackageQueryFormProps> = ({
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
  
  // Track which sections are being edited
  const [editingSection, setEditingSection] = useState<string | null>(null);
  
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
  const [lookupLoading, setLookupLoading] = useState(true);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [occupancyTypes, setOccupancyTypes] = useState<OccupancyType[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);

  const title = "Create Tour Package Query from Inquiry";
  const description = "Convert this inquiry into a detailed tour package";
  
  const defaultValues = {
    tourPackageTemplate: '',
    tourPackageQueryTemplate: '',
    selectedTemplateId: '',
    selectedTemplateType: '',
    tourPackageTemplateName: '',
    selectedTourPackageVariantId: '',
    selectedTourPackageVariantName: '',
    numberOfRooms: undefined,
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
    pricingTier: 'standard',
    customMarkup: '',
    images: [],
    flightDetails: [],
    itineraries: [],
    isFeatured: false,
  };

  const form = useForm<TourPackageQueryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  useEffect(() => {
    const fetchLookupData = async () => {
      setLookupLoading(true);
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
        setLookupLoading(false);
      }
    };

    fetchLookupData();
  }, []);

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

    form.setValue('selectedVariantIds', variantIds);
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

  const handleTourPackageQuerySelection = (queryId: string) => {
    const selectedQuery = tourPackageQueries?.find(tpq => tpq.id === queryId);
    if (!selectedQuery) {
      toast.error("Tour Package Query not found");
      return;
    }

    form.setValue('tourPackageQueryTemplate', queryId);
    form.setValue('selectedTemplateId', queryId);
    form.setValue('selectedTemplateType', 'TourPackageQuery');
    form.setValue('tourPackageTemplateName', selectedQuery.tourPackageQueryName || `Query ${queryId.substring(0, 8)}`);
    form.setValue('tourPackageQueryName', selectedQuery.tourPackageQueryName || '');
    form.setValue('numDaysNight', selectedQuery.numDaysNight || '');
    form.setValue('transport', String(selectedQuery.transport || ''));
    form.setValue('pickup_location', String(selectedQuery.pickup_location || ''));
    form.setValue('drop_location', String(selectedQuery.drop_location || ''));
    form.setValue('totalPrice', String(selectedQuery.totalPrice || ''));
    form.setValue('remarks', String(selectedQuery.remarks || REMARKS_DEFAULT));
    form.setValue('disclaimer', String(selectedQuery.disclaimer || DISCLAIMER_DEFAULT));
    form.setValue('associatePartnerId', selectedQuery.associatePartnerId || '');
    form.setValue('images', selectedQuery.images || []);
    // Map itineraries to match form schema
    form.setValue('itineraries', (selectedQuery.itineraries || []).map(it => ({
      itineraryImages: it.itineraryImages || [],
      itineraryTitle: it.itineraryTitle || '',
      itineraryDescription: it.itineraryDescription || '',
      dayNumber: it.dayNumber || 0,
      days: it.days || '',
      activities: (it.activities || []).map(act => ({
        activityTitle: act.activityTitle || '',
        activityDescription: act.activityDescription || '',
        activityImages: act.activityImages || []
      })),
      hotelId: it.hotelId || '',
      locationId: it.locationId || '',
      // Map roomAllocations and transportDetails from query template
      roomAllocations: (it as any).roomAllocations?.map((alloc: any) => ({
        roomTypeId: alloc.roomTypeId || alloc.roomType || '',
        occupancyTypeId: alloc.occupancyTypeId || alloc.occupancyType || '',
        mealPlanId: alloc.mealPlanId || alloc.mealPlan || '',
        quantity: Number(alloc.quantity) || 1,
        guestNames: alloc.guestNames || ''
      })) || [],
      transportDetails: (it as any).transportDetails?.map((detail: any) => ({
        vehicleTypeId: detail.vehicleTypeId || detail.vehicleType || '',
        transportType: detail.transportType || '',
        quantity: Number(detail.quantity) || 1,
        description: detail.description || ''
      })) || [],
    })));
    // Map flight details to match form schema  
    form.setValue('flightDetails', (selectedQuery.flightDetails || []).map(fd => ({
      date: fd.date || '',
      flightName: fd.flightName || '',
      flightNumber: fd.flightNumber || '',
      from: fd.from || '',
      to: fd.to || '',
      departureTime: fd.departureTime || '',
      arrivalTime: fd.arrivalTime || '',
      flightDuration: fd.flightDuration || ''
    })));
    form.setValue('inclusions', parseJsonField(selectedQuery.inclusions) || []);
    form.setValue('exclusions', parseJsonField(selectedQuery.exclusions) || []);
    form.setValue('importantNotes', parseJsonField(selectedQuery.importantNotes) || []);
    form.setValue('paymentPolicy', parseJsonField(selectedQuery.paymentPolicy) || []);
    form.setValue('usefulTip', parseJsonField(selectedQuery.usefulTip) || []);
    form.setValue('cancellationPolicy', parseJsonField(selectedQuery.cancellationPolicy) || []);
    form.setValue('airlineCancellationPolicy', parseJsonField(selectedQuery.airlineCancellationPolicy) || []);
    form.setValue('termsconditions', parseJsonField(selectedQuery.termsconditions) || []);
    form.setValue('pricingSection', parsePricingSection(selectedQuery.pricingSection) || []);

    toast.success("Tour Package Query loaded as template");
    setOpenQueryTemplate(false);
  };

  const onSubmit = async (data: TourPackageQueryFormValues) => {
    const formattedData = {
      ...data,
      inquiryId: params.inquiryId,
      transport: data.transport || '',
      pickup_location: data.pickup_location || '',
      drop_location: data.drop_location || '',
      totalPrice: data.totalPrice || '',
      disclaimer: data.disclaimer || '',
      tourStartsFrom: normalizeApiDate(data.tourStartsFrom),
      tourEndsOn: normalizeApiDate(data.tourEndsOn),
      itineraries: data.itineraries.map((itinerary: z.infer<typeof itinerarySchema>) => ({
        ...itinerary,
        locationId: data.locationId,
        activities: itinerary.activities?.map((activity) => ({
          ...activity,
          locationId: data.locationId,
        })),
        roomAllocations: itinerary.roomAllocations?.map((alloc: z.infer<typeof roomAllocationSchema>) => ({
          ...alloc,
          quantity: Number(alloc.quantity) || 1
        })),
        transportDetails: itinerary.transportDetails?.map((detail: z.infer<typeof transportDetailsSchema>) => ({
          ...detail,
          quantity: Number(detail.quantity) || 1
        })),
      })),
      pricingSection: data.pricingSection || [],
    };

    try {
      setLoading(true);
      console.log("Submitting data:", formattedData);
      const response = await axios.post(`/api/tourPackageQuery`, formattedData);
      console.log("API Response:", response.data);

      if (response.data?.id) {
        router.refresh();
        router.push(`/tourPackageQueryDisplay/${response.data.id}`);
        toast.success("Tour Package Query created successfully! Redirecting to display page...");
      } else {
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

  if (lookupLoading) {
    return <div className="flex justify-center items-center h-64">Loading configuration data...</div>;
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

          <div className="mx-auto max-w-[850px] space-y-8 pb-20">
            
            {/* Basic Info Section */}
            <PDFLikeSection 
              title="Basic Information" 
              icon={FileText}
              action={
                <Button 
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingSection(editingSection === 'basic-info' ? null : 'basic-info')}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  {editingSection === 'basic-info' ? 'Close' : 'Edit'}
                </Button>
              }
            >
              {editingSection !== 'basic-info' ? (
                // Display View
                <div className="space-y-3">
                  <DataDisplayRow label="Query Number" value={form.watch('tourPackageQueryNumber')} />
                  <DataDisplayRow label="Query Name" value={form.watch('tourPackageQueryName')} />
                  <DataDisplayRow label="Query Type" value={form.watch('tourPackageQueryType')} />
                  <DataDisplayRow label="Customer Name" value={form.watch('customerName')} />
                  <DataDisplayRow label="Customer Number" value={form.watch('customerNumber')} />
                  {form.watch('associatePartnerId') && (
                    <DataDisplayRow 
                      label="Associate Partner" 
                      value={associatePartners.find(p => p.id === form.watch('associatePartnerId'))?.name || 'Not specified'} 
                    />
                  )}
                  {form.watch('tourPackageTemplateName') && (
                    <DataDisplayRow label="Template Used" value={form.watch('tourPackageTemplateName')} />
                  )}
                </div>
              ) : (
                // Edit View
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
              )}
            </PDFLikeSection>

            {/* Guests Section */}
            <PDFLikeSection 
              title="Guest Information" 
              icon={Users}
              action={
                <Button 
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingSection(editingSection === 'guests' ? null : 'guests')}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  {editingSection === 'guests' ? 'Close' : 'Edit'}
                </Button>
              }
            >
              {editingSection !== 'guests' ? (
                // Display View
                <div className="p-3 rounded-md" style={{ background: brandColors.panelBg }}>
                  <div className="text-xs font-semibold mb-3" style={{ color: brandColors.muted }}>TRAVELLERS</div>
                  <div className="flex gap-6 flex-wrap">
                    {form.watch('numAdults') && (
                      <div className="text-center">
                        <div className="text-2xl font-bold" style={{ color: brandColors.text }}>{form.watch('numAdults')}</div>
                        <div className="text-xs font-medium" style={{ color: brandColors.muted }}>Adults</div>
                      </div>
                    )}
                    {form.watch('numChild5to12') && (
                      <div className="text-center">
                        <div className="text-2xl font-bold" style={{ color: brandColors.text }}>{form.watch('numChild5to12')}</div>
                        <div className="text-xs font-medium" style={{ color: brandColors.muted }}>Children (5-12)</div>
                      </div>
                    )}
                    {form.watch('numChild0to5') && (
                      <div className="text-center">
                        <div className="text-2xl font-bold" style={{ color: brandColors.text }}>{form.watch('numChild0to5')}</div>
                        <div className="text-xs font-medium" style={{ color: brandColors.muted }}>Children (0-5)</div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // Edit View
                <GuestsTab
                  control={form.control}
                  loading={loading}
                />
              )}
            </PDFLikeSection>

            {/* Location Section */}
            <PDFLikeSection 
              title="Tour Information" 
              icon={MapPin}
              action={
                <Button 
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingSection(editingSection === 'location' ? null : 'location')}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  {editingSection === 'location' ? 'Close' : 'Edit'}
                </Button>
              }
            >
              {editingSection !== 'location' ? (
                // Display View
                <div className="space-y-4">
                  <InfoCardGrid>
                    <InfoCard 
                      label="DESTINATION" 
                      value={locations.find(l => l.id === form.watch('locationId'))?.label || 'Not specified'} 
                    />
                    {form.watch('numDaysNight') && (
                      <InfoCard label="DURATION" value={form.watch('numDaysNight')} />
                    )}
                  </InfoCardGrid>
                  
                  {form.watch('transport') && (
                    <InfoCard label="TRANSPORT" value={form.watch('transport')} />
                  )}
                  
                  <div className="grid grid-cols-2 gap-3">
                    {form.watch('pickup_location') && (
                      <InfoCard label="PICKUP" value={form.watch('pickup_location')} />
                    )}
                    {form.watch('drop_location') && (
                      <InfoCard label="DROP" value={form.watch('drop_location')} />
                    )}
                  </div>
                </div>
              ) : (
                // Edit View
                <LocationTab
                  control={form.control}
                  loading={loading}
                  locations={locations}
                  form={form}
                  updateLocationDefaults={handleUseLocationDefaultsChange}
                />
              )}
            </PDFLikeSection>

            {/* Dates Section */}
            <PDFLikeSection 
              title="Dates & Duration" 
              icon={CalendarIcon}
              action={
                <Button 
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingSection(editingSection === 'dates' ? null : 'dates')}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  {editingSection === 'dates' ? 'Close' : 'Edit'}
                </Button>
              }
            >
              {editingSection !== 'dates' ? (
                // Display View
                <div>
                  {(form.watch('tourStartsFrom') || form.watch('tourEndsOn')) && (
                    <div className="p-3 rounded-md border-l-4" style={{ 
                      background: brandColors.panelBg, 
                      borderColor: brandColors.primary 
                    }}>
                      <div className="text-xs font-semibold mb-2" style={{ color: brandColors.muted }}>TRAVEL DATES</div>
                      <div className="flex gap-6 items-center">
                        {form.watch('tourStartsFrom') && (
                          <div>
                            <div className="text-xs font-semibold" style={{ color: brandColors.muted }}>FROM</div>
                            <div className="text-sm font-bold" style={{ color: brandColors.text }}>
                              {format(new Date(form.watch('tourStartsFrom')!), "dd MMM, yyyy")}
                            </div>
                          </div>
                        )}
                        {form.watch('tourStartsFrom') && form.watch('tourEndsOn') && (
                          <div className="text-lg" style={{ color: brandColors.muted }}>→</div>
                        )}
                        {form.watch('tourEndsOn') && (
                          <div>
                            <div className="text-xs font-semibold" style={{ color: brandColors.muted }}>TO</div>
                            <div className="text-sm font-bold" style={{ color: brandColors.text }}>
                              {format(new Date(form.watch('tourEndsOn')!), "dd MMM, yyyy")}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Edit View
                <DatesTab
                  control={form.control}
                  loading={loading}
                  form={form}
                />
              )}
            </PDFLikeSection>

            {/* Itinerary Section */}
            <PDFLikeSection 
              title="Itinerary Details" 
              icon={ListPlus}
              action={
                <Button 
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingSection(editingSection === 'itinerary' ? null : 'itinerary')}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  {editingSection === 'itinerary' ? 'Close' : 'Edit'}
                </Button>
              }
            >
              {editingSection !== 'itinerary' ? (
                // Display View - Summary
                <div className="space-y-4">
                  {form.watch('itineraries') && form.watch('itineraries').length > 0 ? (
                    form.watch('itineraries').map((itinerary: any, index: number) => {
                      const hotel = hotels.find(h => h.id === itinerary.hotelId);
                      return (
                        <div key={index} className="p-4 rounded-lg border-l-4" style={{ 
                          background: brandColors.subtlePanel, 
                          borderColor: brandColors.primary 
                        }}>
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm" style={{
                              background: brandColors.primary,
                              color: brandColors.white
                            }}>
                              {itinerary.dayNumber || index + 1}
                            </div>
                            <div>
                              <h4 className="font-bold text-sm" style={{ color: brandColors.text }}>
                                {itinerary.days || `Day ${itinerary.dayNumber || index + 1}`}
                              </h4>
                              {itinerary.itineraryTitle && (
                                <p className="text-xs" style={{ color: brandColors.muted }}>{itinerary.itineraryTitle}</p>
                              )}
                            </div>
                          </div>
                          {hotel && (
                            <div className="mt-2 text-xs" style={{ color: brandColors.muted }}>
                              🏨 {hotel.name}
                            </div>
                          )}
                          {itinerary.roomAllocations && itinerary.roomAllocations.length > 0 && (
                            <div className="mt-2 text-xs" style={{ color: brandColors.muted }}>
                              🛏️ {itinerary.roomAllocations.length} room allocation(s)
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm" style={{ color: brandColors.muted }}>No itinerary added yet</p>
                  )}
                </div>
              ) : (
                // Edit View
                <ItineraryTab
                  control={form.control}
                  loading={loading}
                  hotels={hotels}
                  activitiesMaster={activitiesMaster}
                  itinerariesMaster={itinerariesMaster}
                  form={form}
                  roomTypes={roomTypes}
                  occupancyTypes={occupancyTypes}
                  mealPlans={mealPlans}
                  vehicleTypes={vehicleTypes}
                />
              )}
            </PDFLikeSection>

            {/* Hotels Section */}
            <PDFLikeSection 
              title="Hotel Details" 
              icon={BuildingIcon}
              action={
                <Button 
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingSection(editingSection === 'hotels' ? null : 'hotels')}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  {editingSection === 'hotels' ? 'Close' : 'Edit'}
                </Button>
              }
            >
              {editingSection !== 'hotels' ? (
                // Display View - Summary
                <div className="space-y-3">
                  {form.watch('itineraries') && form.watch('itineraries').length > 0 ? (
                    form.watch('itineraries').map((itinerary: any, index: number) => {
                      const hotel = hotels.find(h => h.id === itinerary.hotelId);
                      if (!hotel) return null;
                      
                      return (
                        <div key={index} className="p-3 rounded-lg border" style={{ 
                          background: brandColors.white, 
                          borderColor: brandColors.border 
                        }}>
                          <div className="flex gap-3">
                            <div className="flex-shrink-0 w-20 h-16 rounded overflow-hidden" style={{ background: '#f3f4f6' }}>
                              {hotel.images && hotel.images.length > 0 ? (
                                <img src={hotel.images[0].url} alt={hotel.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: brandColors.muted }}>
                                  No Image
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-sm" style={{ color: brandColors.text }}>{hotel.name}</h4>
                              <p className="text-xs mt-1" style={{ color: brandColors.muted }}>
                                Day {itinerary.dayNumber || index + 1}
                              </p>
                              {itinerary.roomAllocations && itinerary.roomAllocations.length > 0 && (
                                <p className="text-xs mt-1" style={{ color: brandColors.muted }}>
                                  {itinerary.roomAllocations.length} room(s) allocated
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }).filter(Boolean)
                  ) : (
                    <p className="text-sm" style={{ color: brandColors.muted }}>No hotels assigned yet</p>
                  )}
                </div>
              ) : (
                // Edit View
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
              )}
            </PDFLikeSection>

            {/* Flights Section */}
            <PDFLikeSection 
              title="Flight Details" 
              icon={Plane}
              action={
                <Button 
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingSection(editingSection === 'flights' ? null : 'flights')}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  {editingSection === 'flights' ? 'Close' : 'Edit'}
                </Button>
              }
            >
              {editingSection !== 'flights' ? (
                // Display View - Table format
                <div>
                  {form.watch('flightDetails') && form.watch('flightDetails').length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr style={{ background: brandColors.tableHeaderBg }}>
                            <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: brandColors.text }}>Flight</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: brandColors.text }}>Route</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: brandColors.text }}>Time</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: brandColors.text }}>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {form.watch('flightDetails').map((flight: any, index: number) => (
                            <tr key={index} className="border-b" style={{ borderColor: brandColors.border }}>
                              <td className="px-3 py-2 text-sm">
                                <div className="font-semibold" style={{ color: brandColors.text }}>{flight.flightName}</div>
                                <div className="text-xs" style={{ color: brandColors.muted }}>{flight.flightNumber}</div>
                              </td>
                              <td className="px-3 py-2 text-sm" style={{ color: brandColors.text }}>
                                {flight.from} → {flight.to}
                              </td>
                              <td className="px-3 py-2 text-sm" style={{ color: brandColors.text }}>
                                {flight.departureTime} - {flight.arrivalTime}
                              </td>
                              <td className="px-3 py-2 text-sm" style={{ color: brandColors.text }}>
                                {flight.date}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: brandColors.muted }}>No flight details added yet</p>
                  )}
                </div>
              ) : (
                // Edit View
                <FlightsTab
                  control={form.control}
                  loading={loading}
                  form={form}
                />
              )}
            </PDFLikeSection>

            {/* Pricing Section */}
            <PDFLikeSection 
              title="Pricing Details" 
              icon={Tag}
              action={
                <Button 
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingSection(editingSection === 'pricing' ? null : 'pricing')}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  {editingSection === 'pricing' ? 'Close' : 'Edit'}
                </Button>
              }
            >
              {editingSection !== 'pricing' ? (
                // Display View - Card format
                <div className="space-y-3">
                  {form.watch('pricingSection') && form.watch('pricingSection').length > 0 ? (
                    form.watch('pricingSection').map((item: any, index: number) => (
                      <div key={index} className="p-4 rounded-lg border-l-4" style={{ 
                        background: brandColors.subtlePanel, 
                        borderColor: brandColors.success 
                      }}>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-sm" style={{ color: brandColors.text }}>
                            {item.name || 'Pricing Component'}
                          </h4>
                          <span className="px-3 py-1 rounded-full text-sm font-bold" style={{ 
                            background: brandColors.success, 
                            color: brandColors.white 
                          }}>
                            ₹{item.price || '0'}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-xs" style={{ color: brandColors.muted }}>{item.description}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm" style={{ color: brandColors.muted }}>No pricing details added yet</p>
                  )}
                  {form.watch('totalPrice') && (
                    <div className="mt-4 p-4 rounded-lg" style={{ background: brandColors.lightOrange }}>
                      <div className="flex justify-between items-center">
                        <span className="font-bold" style={{ color: brandColors.text }}>Total Price</span>
                        <span className="text-xl font-bold" style={{ color: brandColors.success }}>
                          ₹{form.watch('totalPrice')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Edit View
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
              )}
            </PDFLikeSection>

            {/* Policies Section */}
            <PDFLikeSection 
              title="Policies & Terms" 
              icon={FileCheck}
              action={
                <Button 
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingSection(editingSection === 'policies' ? null : 'policies')}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  {editingSection === 'policies' ? 'Close' : 'Edit'}
                </Button>
              }
            >
              {editingSection !== 'policies' ? (
                // Display View - List format
                <div className="space-y-4">
                  {form.watch('inclusions') && form.watch('inclusions').length > 0 && (
                    <div>
                      <h4 className="font-bold text-sm mb-2" style={{ color: brandColors.text }}>✓ Inclusions</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {form.watch('inclusions').slice(0, 3).map((item: string, index: number) => (
                          <li key={index} className="text-sm" style={{ color: brandColors.muted }}>{item}</li>
                        ))}
                        {form.watch('inclusions').length > 3 && (
                          <li className="text-sm italic" style={{ color: brandColors.muted }}>
                            +{form.watch('inclusions').length - 3} more...
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                  
                  {form.watch('exclusions') && form.watch('exclusions').length > 0 && (
                    <div>
                      <h4 className="font-bold text-sm mb-2" style={{ color: brandColors.text }}>✗ Exclusions</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {form.watch('exclusions').slice(0, 3).map((item: string, index: number) => (
                          <li key={index} className="text-sm" style={{ color: brandColors.muted }}>{item}</li>
                        ))}
                        {form.watch('exclusions').length > 3 && (
                          <li className="text-sm italic" style={{ color: brandColors.muted }}>
                            +{form.watch('exclusions').length - 3} more...
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                  
                  {form.watch('importantNotes') && form.watch('importantNotes').length > 0 && (
                    <div>
                      <h4 className="font-bold text-sm mb-2" style={{ color: brandColors.text }}>📌 Important Notes</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {form.watch('importantNotes').slice(0, 3).map((item: string, index: number) => (
                          <li key={index} className="text-sm" style={{ color: brandColors.muted }}>{item}</li>
                        ))}
                        {form.watch('importantNotes').length > 3 && (
                          <li className="text-sm italic" style={{ color: brandColors.muted }}>
                            +{form.watch('importantNotes').length - 3} more...
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                  
                  {form.watch('cancellationPolicy') && form.watch('cancellationPolicy').length > 0 && (
                    <div>
                      <h4 className="font-bold text-sm mb-2" style={{ color: brandColors.text }}>🔄 Cancellation Policy</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {form.watch('cancellationPolicy').slice(0, 2).map((item: string, index: number) => (
                          <li key={index} className="text-sm" style={{ color: brandColors.muted }}>{item}</li>
                        ))}
                        {form.watch('cancellationPolicy').length > 2 && (
                          <li className="text-sm italic" style={{ color: brandColors.muted }}>
                            +{form.watch('cancellationPolicy').length - 2} more...
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                  
                  <p className="text-xs italic mt-4" style={{ color: brandColors.muted }}>
                    Click Edit to view all policies and terms
                  </p>
                </div>
              ) : (
                // Edit View
                <PoliciesTab
                  control={form.control}
                  loading={loading}
                  form={form}
                  useLocationDefaults={useLocationDefaults}
                  onUseLocationDefaultsChange={handleUseLocationDefaultsChange}
                />
              )}
            </PDFLikeSection>

          </div>

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
