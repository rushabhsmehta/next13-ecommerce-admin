"use client"

import * as z from "zod"
import axios from "axios"
import { JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, useEffect, useRef, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "react-hot-toast"
import { AlertCircle, AlignLeft, BedDouble, BuildingIcon, CheckIcon, ChevronDown, ChevronsUpDown, ChevronUp, FileCheck, FileText, HotelIcon, ImageIcon, ListChecks, ListPlus, MapPin, Plane, Plus, ScrollText, Tag, Trash, Type, Users, Utensils, Calendar as CalendarIcon } from "lucide-react"
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { convertJourneyDateToTourStart, createDatePickerValue, normalizeApiDate } from "@/lib/timezone-utils"
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
    form.setValue('selectedTourPackageVariantName', variant.name || 'Standard');
    form.setValue('selectedTemplateId', tourPackageId);
    form.setValue('selectedTemplateType', 'TourPackage');
    form.setValue('tourPackageTemplateName', selectedTourPackage.tourPackageName || `Package ${tourPackageId.substring(0, 8)}`);
  };

  const handleTourPackageSelection = (packageId: string) => {
    const selectedPackage = tourPackages?.find(tp => tp.id === packageId);
    if (!selectedPackage) {
      toast.error("Tour Package not found");
      return;
    }

    form.setValue('selectedTemplateId', packageId);
    form.setValue('selectedTemplateType', 'TourPackage');
    form.setValue('tourPackageTemplateName', selectedPackage.tourPackageName || `Package ${packageId.substring(0, 8)}`);
    form.setValue('tourPackageQueryName', selectedPackage.tourPackageName || '');
    form.setValue('numDaysNight', selectedPackage.numDaysNight || '');
    form.setValue('images', selectedPackage.images || []);
    form.setValue('itineraries', selectedPackage.itineraries || []);
    form.setValue('flightDetails', selectedPackage.flightDetails || []);
    form.setValue('inclusions', parseJsonField(selectedPackage.inclusions) || []);
    form.setValue('exclusions', parseJsonField(selectedPackage.exclusions) || []);
    form.setValue('importantNotes', parseJsonField(selectedPackage.importantNotes) || []);
    form.setValue('paymentPolicy', parseJsonField(selectedPackage.paymentPolicy) || []);
    form.setValue('usefulTip', parseJsonField(selectedPackage.usefulTip) || []);
    form.setValue('cancellationPolicy', parseJsonField(selectedPackage.cancellationPolicy) || []);
    form.setValue('airlineCancellationPolicy', parseJsonField(selectedPackage.airlineCancellationPolicy) || []);
    form.setValue('termsconditions', parseJsonField(selectedPackage.termsconditions) || []);

    toast.success("Tour Package loaded as template");
    setOpenTemplate(false);
  };

  const handleTourPackageQuerySelection = (queryId: string) => {
    const selectedQuery = tourPackageQueries?.find(tpq => tpq.id === queryId);
    if (!selectedQuery) {
      toast.error("Tour Package Query not found");
      return;
    }

    form.setValue('selectedTemplateId', queryId);
    form.setValue('selectedTemplateType', 'TourPackageQuery');
    form.setValue('tourPackageTemplateName', selectedQuery.tourPackageQueryName || `Query ${queryId.substring(0, 8)}`);
    form.setValue('tourPackageQueryName', selectedQuery.tourPackageQueryName || '');
    form.setValue('numDaysNight', selectedQuery.numDaysNight || '');
    form.setValue('images', selectedQuery.images || []);
    form.setValue('itineraries', selectedQuery.itineraries || []);
    form.setValue('flightDetails', selectedQuery.flightDetails || []);
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
            <PDFLikeSection title="Basic Information" icon={FileText}>
              <Accordion type="single" collapsible>
                <AccordionItem value="basic-info">
                  <AccordionTrigger className="text-sm font-medium">
                    Edit Basic Information
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
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
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </PDFLikeSection>

            {/* Guests Section */}
            <PDFLikeSection title="Guest Information" icon={Users}>
              <Accordion type="single" collapsible>
                <AccordionItem value="guests">
                  <AccordionTrigger className="text-sm font-medium">
                    Edit Guest Details
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <GuestsTab
                      control={form.control}
                      loading={loading}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </PDFLikeSection>

            {/* Location Section */}
            <PDFLikeSection title="Tour Information" icon={MapPin}>
              <Accordion type="single" collapsible>
                <AccordionItem value="location">
                  <AccordionTrigger className="text-sm font-medium">
                    Edit Tour Details
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <LocationTab
                      control={form.control}
                      loading={loading}
                      locations={locations}
                      form={form}
                      updateLocationDefaults={handleUseLocationDefaultsChange}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </PDFLikeSection>

            {/* Dates Section */}
            <PDFLikeSection title="Dates & Duration" icon={CalendarIcon}>
              <Accordion type="single" collapsible>
                <AccordionItem value="dates">
                  <AccordionTrigger className="text-sm font-medium">
                    Edit Dates
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <DatesTab
                      control={form.control}
                      loading={loading}
                      form={form}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </PDFLikeSection>

            {/* Itinerary Section */}
            <PDFLikeSection title="Itinerary Details" icon={ListPlus}>
              <Accordion type="single" collapsible>
                <AccordionItem value="itinerary">
                  <AccordionTrigger className="text-sm font-medium">
                    Edit Itinerary
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
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
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </PDFLikeSection>

            {/* Hotels Section */}
            <PDFLikeSection title="Hotel Details" icon={BuildingIcon}>
              <Accordion type="single" collapsible>
                <AccordionItem value="hotels">
                  <AccordionTrigger className="text-sm font-medium">
                    Edit Hotels
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
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
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </PDFLikeSection>

            {/* Flights Section */}
            <PDFLikeSection title="Flight Details" icon={Plane}>
              <Accordion type="single" collapsible>
                <AccordionItem value="flights">
                  <AccordionTrigger className="text-sm font-medium">
                    Edit Flights
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <FlightsTab
                      control={form.control}
                      loading={loading}
                      form={form}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </PDFLikeSection>

            {/* Pricing Section */}
            <PDFLikeSection title="Pricing Details" icon={Tag}>
              <Accordion type="single" collapsible>
                <AccordionItem value="pricing">
                  <AccordionTrigger className="text-sm font-medium">
                    Edit Pricing
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
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
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </PDFLikeSection>

            {/* Policies Section */}
            <PDFLikeSection title="Policies & Terms" icon={FileCheck}>
              <Accordion type="single" collapsible>
                <AccordionItem value="policies">
                  <AccordionTrigger className="text-sm font-medium">
                    Edit Policies
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <PoliciesTab
                      control={form.control}
                      loading={loading}
                      form={form}
                      useLocationDefaults={useLocationDefaults}
                      onUseLocationDefaultsChange={handleUseLocationDefaultsChange}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
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
