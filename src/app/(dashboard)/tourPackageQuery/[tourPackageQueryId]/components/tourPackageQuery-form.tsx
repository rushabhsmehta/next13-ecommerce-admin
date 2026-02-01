"use client"

import * as z from "zod"
import axios from "axios"
import { useForm, useFieldArray } from "react-hook-form";
import { useState, useRef, useEffect, ReactElement, JSXElementConstructor, ReactNode, ReactPortal } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import dynamic from 'next/dynamic';

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RoomAllocationComponent, TransportDetailsComponent } from "@/components/forms/pricing-components";
import { useRouter, useParams } from "next/navigation";
import { CalendarIcon, Check as CheckIcon, ChevronsUpDown, Trash, FileCheck, ListPlus, Plane, Tag, MapPin, ChevronDown, ChevronUp, Plus, FileText, Users, Calculator, ListChecks, AlertCircle, ScrollText, BuildingIcon, UtensilsIcon, BedDoubleIcon, CarIcon, MapPinIcon, Trash2, PlusCircle, ImageIcon, BedIcon, Type, AlignLeft, Sparkles } from "lucide-react";
import { Activity, AssociatePartner, Images, ItineraryMaster, RoomAllocation, TransportDetail } from "@prisma/client"
import { Location, Hotel, TourPackage, TourPackageQuery, Itinerary, FlightDetails, ActivityMaster, RoomType, OccupancyType, MealPlan, VehicleType, PackageVariant, VariantHotelMapping, TourPackagePricing, PricingComponent, PricingAttribute, LocationSeasonalPeriod } from "@prisma/client"; // Add prisma types
import { toast } from "react-hot-toast"
import { DevTool } from "@hookform/devtools"

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
import { normalizeApiDate } from "@/lib/timezone-utils"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import Image from "next/image"
import { Separator } from "@/components/ui/separator"
import { Heading } from "@/components/ui/heading"
import { AlertModal } from "@/components/modals/alert-modal"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import ImageUpload from "@/components/ui/image-upload"
import { Checkbox } from "@/components/ui/checkbox"

import { cn } from "@/lib/utils"
import { DatePickerWithRange } from "@/components/DatePickerWithRange"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { format } from "date-fns"

// Add these imports at the top
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import JoditEditor from "jodit-react";
import { Calendar } from "@/components/ui/calendar";
import { ro } from "date-fns/locale";
import { Textarea } from "@/components/ui/textarea";
import BasicInfoTab from '@/components/tour-package-query/BasicInfoTab'; // Updated path
import DatesTab from '@/components/tour-package-query/DatesTab'; // Updated path

import FlightsTab from '@/components/tour-package-query/FlightsTab'; // Updated path
import GuestsTab from '@/components/tour-package-query/GuestsTab'; // Updated path
import ItineraryTab from '@/components/tour-package-query/ItineraryTab'; // Updated path
import LocationTab from '@/components/tour-package-query/LocationTab'; // Updated path
import PoliciesTab from '@/components/tour-package-query/PoliciesTab'; // Updated path
import PricingTab from '@/components/tour-package-query/PricingTab'; // Updated path
import HotelsTab from '@/components/tour-package-query/HotelsTab';
import QueryVariantsTab from '@/components/tour-package-query/QueryVariantsTab';
import { AIRLINE_CANCELLATION_POLICY_DEFAULT, CANCELLATION_POLICY_DEFAULT, DEFAULT_PRICING_SECTION, DISCLAIMER_DEFAULT, EXCLUSIONS_DEFAULT, IMPORTANT_NOTES_DEFAULT, INCLUSIONS_DEFAULT, KITCHEN_GROUP_POLICY_DEFAULT, PAYMENT_TERMS_DEFAULT, TERMS_AND_CONDITIONS_DEFAULT, USEFUL_TIPS_DEFAULT } from "@/components/tour-package-query/defaultValues";


// Define the pricing item schema
const pricingItemSchema = z.object({
  name: z.string().optional(),
  price: z.string().optional(),
  description: z.string().optional(),
});

const activitySchema = z.object({
  activityTitle: z.string().optional(),
  activityDescription: z.string().optional(),
  activityImages: z.object({ url: z.string() }).array(),
});

const roomAllocationSchema = z.object({
  roomTypeId: z.string().optional(), // Changed from roomType
  occupancyTypeId: z.string().optional(), // Changed from occupancyType
  mealPlanId: z.string().optional(), // Changed from mealPlan
  quantity: z.union([
    z.string().transform(val => parseInt(val) || 1), // Transform string to number
    z.number()
  ]).optional(),
  // Accept nulls from API or forms; coerce undefined/null when writing to DB elsewhere
  guestNames: z.string().optional().nullable(),
  // New fields for enhanced room allocation
  // Accept nulls from API/forms (some saved records contain null) as well as undefined
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
  // Allow nulls here as some saved records may have null description
  description: z.string().optional().nullable()
});

const itinerarySchema = z.object({
  itineraryImages: z.object({ url: z.string() }).array(),
  itineraryTitle: z.string().optional(),
  itineraryDescription: z.string().nullable().optional(),
  dayNumber: z.coerce.number().optional(),
  days: z.string().optional(),
  activities: z.array(activitySchema),
  hotelId: z.string().optional().default(''), // Make hotelId optional with default value
  locationId: z.string().optional().default(''), // Make locationId optional with default value
  // Room allocations array for detailed room configuration
  roomAllocations: z.array(roomAllocationSchema).optional().default([]),
  // Transport details array for transport configuration
  transportDetails: z.array(transportDetailsSchema).optional().default([]), // Added transportDetails field 
});


const flightDetailsSchema = z.object({
  date: z.string().optional(),
  flightName: z.string().optional(),
  flightNumber: z.string().optional(), // Added flightNumber
  from: z.string().optional(), // Added from
  to: z.string().optional(), // Added to
  departureTime: z.string().optional(),
  arrivalTime: z.string().optional(),
  flightDuration: z.string().optional(),
  images: z.object({ url: z.string() }).array().optional(), // Added images array
}); // Assuming an array of flight details

const formSchema = z.object({
  inquiryId: z.string().nullable().optional(),
  tourPackageTemplate: z.string().optional(),
  tourPackageQueryTemplate: z.string().optional(),
  selectedTemplateId: z.string().optional(),
  selectedTemplateType: z.string().optional(),
  tourPackageTemplateName: z.string().optional(),
  selectedVariantIds: z.array(z.string()).optional(), // Array of variant IDs for snapshots
  selectedTourPackageVariantId: z.string().optional(), // Kept for backward compatibility
  selectedTourPackageVariantName: z.string().optional(),
  numberOfRooms: z.number().optional(),
  // Added fields for storing pricing configuration
  selectedMealPlanId: z.string().optional(),
  occupancySelections: z.array(
    z.object({
      occupancyTypeId: z.string(),
      count: z.number(),
      paxPerUnit: z.number()
    })
  ).optional(),

  tourPackageQueryNumber: z.string().optional(),
  tourPackageQueryName: z.string().min(1, "Tour Package Query Name is required"),
  tourPackageQueryType: z.string().optional(),
  tourCategory: z.string().default("Domestic").optional(),
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
  pricingSection: z.array(pricingItemSchema).optional().default([]), // Add this line
  pricingTier: z.string().default('standard').optional(), // Added for pricing tier options
  customMarkup: z.string().optional(), // Added for custom markup percentage
  remarks: z.string().optional(),
  locationId: z.string().min(1, "Location is required"),
  flightDetails: flightDetailsSchema.array().optional().default([]),
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
  // Accept missing/null itineraries from API/forms and default to empty array
  itineraries: z.array(itinerarySchema).optional().default([]),
  isFeatured: z.boolean().default(false).optional(),
  isArchived: z.boolean().default(false).optional(),
  associatePartnerId: z.string().optional(), // Add associatePartnerId to the schema
  variantHotelOverrides: z.record(z.record(z.string())).optional(), // Variant hotel modifications: { variantId: { itineraryId: hotelId } }
});

export type TourPackageQueryFormValues = z.infer<typeof formSchema>

interface TourPackageQueryFormProps {
  initialData: TourPackageQuery & {
    images: Images[];
    itineraries: Itinerary[];
    flightDetails: FlightDetails[];
  } | null;
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
  associatePartners: AssociatePartner[]; // Add this line
  tourPackages: (TourPackage & {
    images: Images[];
    flightDetails: FlightDetails[];
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
  tourPackageQueries: (TourPackageQuery & {
    images: Images[];
    flightDetails: FlightDetails[];
    itineraries: (Itinerary & {
      itineraryImages: Images[];
      activities: (Activity & {
        activityImages: Images[];
      })[] | null;
    })[] | null;
  })[] | null;
};

export const TourPackageQueryForm: React.FC<TourPackageQueryFormProps> = ({
  initialData,
  locations,
  hotels,
  activitiesMaster,
  itinerariesMaster,
  associatePartners,
  tourPackages,
  tourPackageQueries,
}) => {
  const params = useParams();
  const router = useRouter();

  //const defaultItinerary = { days: '1', activities: '', places: '', mealsIncluded: false };
  const [open, setOpen] = useState(false);
  const [openTemplate, setOpenTemplate] = useState(false);
  const [openQueryTemplate, setOpenQueryTemplate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [priceCalculationResult, setPriceCalculationResult] = useState<any>(null);
  const [dynamicTourPackages, setDynamicTourPackages] = useState<any[]>(tourPackages || []);
  const [fetchingPackages, setFetchingPackages] = useState(false);
  const editor = useRef(null)

  // Add state for lookup data
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [occupancyTypes, setOccupancyTypes] = useState<OccupancyType[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [lookupLoading, setLookupLoading] = useState(true);  // Store price calculation result in window for access in nested functions
  useEffect(() => {
    (window as any).setPriceCalculationResult = setPriceCalculationResult;
    (window as any).priceCalculationResult = priceCalculationResult;
  }, [priceCalculationResult]);
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

  const parsePricingSection = (data: any): Array<{ name: string, price: string, description?: string }> => {
    if (!data) return [];

    // If it's already an array, return it
    if (Array.isArray(data)) return data;

    // If it's a string, try to parse it
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error("Error parsing pricingSection:", e);
        return [];
      }
    }

    // If it's neither an array nor a string, return empty array
    return [];
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

  const handleUseLocationDefaultsChange = (field: string, checked: boolean): void => {
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

  //console.log(initialData);
  const title = initialData ? 'Edit Tour  Query' : 'Create Tour Package Query';
  const description = initialData ? 'Edit a Tour Package Query.' : 'Add a new Tour Package Query';

  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const res = await axios.get("/api/suppliers");
        setSuppliers(res.data);
      } catch (error) {
        console.error("Error fetching suppliers", error);
      }
    };
    fetchSuppliers();
  }, []);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await axios.get("/api/customers");
        setCustomers(res.data);
      } catch (error) {
        console.error("Error fetching customers", error);
      }
    };
    fetchCustomers();
  }, []);

  // Fetch tour packages when location changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!form) return;
    
    const subscription = form.watch((value, { name }) => {
      if (name === 'locationId' && value.locationId) {
        fetchTourPackagesByLocation(value.locationId);
      }
    });
    return () => subscription.unsubscribe();
  }, []); // Empty dependency array - watch is set up once

  const fetchTourPackagesByLocation = async (locationId: string) => {
    if (!locationId) {
      setDynamicTourPackages([]);
      return;
    }

    setFetchingPackages(true);
    try {
      const response = await axios.get(`/api/tourPackages?locationId=${locationId}&isArchived=false&includeVariants=true&includeComplete=true`);
      setDynamicTourPackages(response.data);
      console.log('✅ Fetched tour packages for location:', response.data.length);
    } catch (error) {
      console.error('Error fetching tour packages:', error);
      toast.error('Failed to load tour packages');
      setDynamicTourPackages([]);
    } finally {
      setFetchingPackages(false);
    }
  };

  const toastMessage = initialData ? 'Tour Package Query updated.' : 'Tour Package Query created.';
  const action = initialData ? 'Save changes' : 'Create';
  console.log("Initial Data : ", initialData?.itineraries)  // Ensure quantity is always treated as a string in roomAllocations and transportDetails
  const transformInitialData = (data: any) => {
    return {
      ...data,
      itineraries: data.itineraries.map((itinerary: any) => ({
        ...itinerary,
        roomAllocations: itinerary.roomAllocations?.map((allocation: any) => ({
          ...allocation,
        })) || [],
        transportDetails: itinerary.transportDetails?.map((detail: any) => ({
          ...detail,
        })) || []
      })),
      // Transform flight details to ensure images are properly handled
      flightDetails: data.flightDetails?.map((flight: any) => ({
        ...flight,
        images: flight.images || []
      })) || []
    };
  };

  const getCurrentDateTimeString = () => {
    const now = new Date();
    return now.toISOString().replace(/[-:T.]/g, '').slice(0, 14); // Format: YYYYMMDDHHMMSS
  };
  const defaultValues = initialData
    ? {
      ...transformInitialData(initialData),
      selectedTemplateId: initialData.selectedTemplateId || '',
      selectedTemplateType: initialData.selectedTemplateType || '',
      tourPackageTemplateName: (initialData as any).tourPackageTemplateName || '',
      // Restore dropdown field values based on saved template data
      tourPackageTemplate: initialData.selectedTemplateType === 'TourPackage' ? (initialData.selectedTemplateId || '') : '',
      tourPackageQueryTemplate: initialData.selectedTemplateType === 'TourPackageQuery' ? (initialData.selectedTemplateId || '') : '',
      selectedMealPlanId: initialData.selectedMealPlanId || '',
      selectedVariantIds: (initialData as any).selectedVariantIds || [], // Initialize from saved data
      selectedTourPackageVariantId: (initialData as any).selectedTourPackageVariantId || '',
      selectedTourPackageVariantName: (initialData as any).selectedTourPackageVariantName || '',
      numberOfRooms: (initialData as any).numberOfRooms ?? 1,
      occupancySelections: initialData.occupancySelections || [],
      inclusions: parseJsonField(initialData.inclusions),
      exclusions: parseJsonField(initialData.exclusions),
      kitchenGroupPolicy: parseJsonField((initialData as any).kitchenGroupPolicy) || KITCHEN_GROUP_POLICY_DEFAULT,
      importantNotes: parseJsonField(initialData.importantNotes),
      paymentPolicy: parseJsonField(initialData.paymentPolicy),
      usefulTip: parseJsonField(initialData.usefulTip),
      cancellationPolicy: parseJsonField(initialData.cancellationPolicy),
      airlineCancellationPolicy: parseJsonField(initialData.airlineCancellationPolicy),
      termsconditions: parseJsonField(initialData.termsconditions),
      pricingSection: parsePricingSection(initialData.pricingSection),
    } : {
      inquiryId: '',
      tourPackageTemplate: '',
      tourPackageQueryNumber: getCurrentDateTimeString(),
      tourPackageQueryName: '',
      associatePartnerId: '',
      tourPackageQueryType: '',
      tourCategory: 'Domestic',
      customerName: '',
      customerNumber: '',
      numDaysNight: '',
      period: '',
      tourStartsFrom: '',
      tourEndsOn: '',
      transport: '',
      pickup_location: '',
      drop_location: '',
      numAdults: '',
      numChild5to12: '',
      numChild0to5: '',
      totalPrice: '',
      remarks: '',
      flightDetails: [], inclusions: INCLUSIONS_DEFAULT,
      exclusions: EXCLUSIONS_DEFAULT,
      kitchenGroupPolicy: KITCHEN_GROUP_POLICY_DEFAULT,
      importantNotes: IMPORTANT_NOTES_DEFAULT,
      paymentPolicy: PAYMENT_TERMS_DEFAULT,
      usefulTip: USEFUL_TIPS_DEFAULT,
      cancellationPolicy: CANCELLATION_POLICY_DEFAULT,
      airlineCancellationPolicy: AIRLINE_CANCELLATION_POLICY_DEFAULT,
      termsconditions: TERMS_AND_CONDITIONS_DEFAULT,
      disclaimer: DISCLAIMER_DEFAULT,
      images: [],
      itineraries: [],
      locationId: '',
      isFeatured: false,
      isArchived: false,
      pricingSection: DEFAULT_PRICING_SECTION,
      // Initialize the optional fields with empty values
      selectedTemplateId: '',
      selectedTemplateType: '',
      tourPackageTemplateName: '',
      selectedMealPlanId: '',
      selectedVariantIds: [], // Empty array for new queries
      selectedTourPackageVariantId: '',
      selectedTourPackageVariantName: '',
      numberOfRooms: 1,
      occupancySelections: [],
    }; const form = useForm<TourPackageQueryFormValues>({
      resolver: zodResolver(formSchema),
      defaultValues
    });

  // This useFieldArray is now handled in the PricingTab component
  // Removing unused code

  // Auto-load draft from Auto Builder
  useEffect(() => {
    const loadDraft = () => {
      // Only run if we are in "create" mode (no initialData)
      if (initialData) return;

      const draftKey = 'autoQueryDraft';
      const storedDraft = localStorage.getItem(draftKey);

      if (!storedDraft) return;

      try {
        const { data } = JSON.parse(storedDraft);
        console.log("Found auto-generated draft:", data);

        // Find Location ID
        let foundLocationId = '';
        if (data.locationName && locations.length > 0) {
          const search = data.locationName.toLowerCase();
          const loc = locations.find(l => l.label && l.label.toLowerCase().includes(search));
          if (loc) foundLocationId = loc.id;
        }
        // Fallback if not found
        if (!foundLocationId && locations.length > 0) {
          foundLocationId = locations[0].id; // Default to first location if no match
        }

        // Map AI JSON to Form Values
        const mappedData: Partial<TourPackageQueryFormValues> = {
          tourPackageQueryName: data.tourPackageName || data.tourPackageQueryName || '',
          customerName: data.customerName || '',
          customerNumber: data.customerNumber || '',
          tourCategory: data.tourCategory || 'Domestic',
          numDaysNight: data.numDaysNight || '',
          totalPrice: data.price ? String(data.price) : '',
          transport: data.transport || '',
          pickup_location: data.pickup_location || '',
          drop_location: data.drop_location || '',
          locationId: foundLocationId, // Set the found location ID
          numAdults: String(data.numAdults || ''),
          numChild5to12: String(data.numChildren || data.numChild5to12 || ''),
          numChild0to5: String(data.numChild0to5 || ''),

          // Handle Date
          tourStartsFrom: data.tourStartsFrom ? new Date(data.tourStartsFrom) : undefined,

          // Map Itineraries
          itineraries: Array.isArray(data.itineraries) ? data.itineraries.map((day: any) => ({
            dayNumber: day.dayNumber,
            itineraryTitle: day.itineraryTitle || '',
            itineraryDescription: day.itineraryDescription || '',
            mealsIncluded: day.mealsIncluded ? day.mealsIncluded.split(',') : [],

            // Handle activities from AI generation
            // AI generates: [{ activityTitle: "", activityDescription: "i. ...\nii. ...\niii. ..." }]
            // We want to map the activityDescription to the first activity and convert \n to <br> for HTML display
            activities: Array.isArray(day.activities) && day.activities.length > 0 
              ? (() => {
                  // Check if activities are objects with activityDescription field
                  const firstActivity = day.activities[0];
                  if (typeof firstActivity === 'object' && firstActivity.activityDescription) {
                    // AI-generated format: single activity object with description containing all activities
                    // Escape HTML entities first to prevent XSS, then convert newlines to <br>
                    const escapeHtml = (text: string) => {
                      const div = document.createElement('div');
                      div.textContent = text;
                      return div.innerHTML;
                    };
                    
                    const escapedDescription = escapeHtml(firstActivity.activityDescription);
                    const descriptionWithLineBreaks = escapedDescription.replace(/\n/g, '<br>');
                    
                    return [{
                      activityTitle: firstActivity.activityTitle || '',
                      activityDescription: descriptionWithLineBreaks,
                      activityImages: []
                    }];
                  } else if (typeof firstActivity === 'string') {
                    // Legacy format: array of strings
                    return day.activities.map((act: string) => ({
                      activityTitle: act,
                      activityDescription: '',
                      activityImages: []
                    }));
                  } else {
                    // Unknown format, return empty array
                    return [];
                  }
                })()
              : [],
            itineraryImages: [],
            hotelId: '',
            locationId: foundLocationId, // Set location ID for itineraries too
            roomAllocations: [],
            transportDetails: []
          })) : [],

          inclusions: data.inclusions ? (Array.isArray(data.inclusions) ? data.inclusions : [data.inclusions]) : INCLUSIONS_DEFAULT,
          exclusions: data.exclusions ? (Array.isArray(data.exclusions) ? data.exclusions : [data.exclusions]) : EXCLUSIONS_DEFAULT,
          importantNotes: data.importantNotes ? (Array.isArray(data.importantNotes) ? data.importantNotes : [data.importantNotes]) : IMPORTANT_NOTES_DEFAULT,
        };

        // Reset form with mapped data
        // We use reset(values) to set the form values.
        // We need to merge with defaultValues to ensure consistency
        form.reset({
          ...defaultValues,
          ...mappedData
        });

        toast.success("Loaded properties from AI generation");

        // Clear the draft so it doesn't persist
        localStorage.removeItem(draftKey);

      } catch (err) {
        console.error("Failed to load auto-query draft:", err);
        toast.error("Failed to load generated draft");
      }
    };

    loadDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, form, locations]);

  // Auto-save form data to localStorage every 30 seconds - moved after form initialization
  useEffect(() => {
    // Don't auto-save if we're in loading state
    if (loading) return;

    // Get the current form ID (either tourPackageQueryId or 'new')
    const formId = params.tourPackageQueryId || 'new';
    const autoSaveKey = `tourPackageQuery_autosave_${formId}`;

    // Set up auto-save interval
    const saveInterval = setInterval(() => {
      const formData = form.getValues();
      try {
        localStorage.setItem(autoSaveKey, JSON.stringify({
          timestamp: new Date().toISOString(),
          data: formData
        }));
        console.log('Form auto-saved at', new Date().toLocaleTimeString());
      } catch (err) {
        console.error('Error auto-saving form:', err);
      }
    }, 30000); // Every 30 seconds

    // On component mount, check if we have saved data
    const savedData = localStorage.getItem(autoSaveKey);
    if (savedData) {
      try {
        const { timestamp, data } = JSON.parse(savedData);
        const saveDate = new Date(timestamp);
        const now = new Date();
        const hoursSinceSave = (now.getTime() - saveDate.getTime()) / (1000 * 60 * 60);

        // If the saved data is less than 24 hours old, offer to restore it
        if (hoursSinceSave < 24 && !initialData) {
          const shouldRestore = window.confirm(
            `Found saved work from ${saveDate.toLocaleString()}. Would you like to restore it?`
          );
          if (shouldRestore) {
            // Restore the form data
            Object.entries(data).forEach(([key, value]) => {
              form.setValue(key as any, value as any);
            });
            toast.success('Restored saved form data');
          } else {
            // User declined, remove the saved data
            localStorage.removeItem(autoSaveKey);
          }
        }
      } catch (err) {
        console.error('Error parsing saved form data:', err);
      }
    }

    // Clean up interval on component unmount
    return () => {
      clearInterval(saveInterval);
    };
  }, [params.tourPackageQueryId, form, initialData, loading]);

  // Auto-calculate Number of Days/Night based on itinerary length
  const watchedItineraries = form.watch('itineraries');
  useEffect(() => {
    if (Array.isArray(watchedItineraries) && watchedItineraries.length > 0) {
      const days = watchedItineraries.length;
      const nights = Math.max(0, days - 1);
      const durationString = `${nights}N-${days}D`;
      const currentDuration = form.getValues('numDaysNight');

      if (currentDuration !== durationString) {
        form.setValue('numDaysNight', durationString, {
          shouldValidate: true,
          shouldDirty: true
        });
        // Also update the period field if needed, or just the numDaysNight as requested
      }
    }
  }, [watchedItineraries, form]);
  const handleTourPackageSelection = (selectedTourPackageId: string) => {
    // Use dynamicTourPackages instead of tourPackages
    const selectedTourPackage = dynamicTourPackages?.find(tp => tp.id === selectedTourPackageId);
    console.log('🔍 handleTourPackageSelection:', { 
      selectedTourPackageId, 
      found: !!selectedTourPackage,
      availablePackages: dynamicTourPackages?.length 
    });
    
    if (selectedTourPackage) {
      // Add this line to update the tourPackageTemplate field 
      form.setValue('tourPackageTemplate', selectedTourPackageId);
      form.setValue('selectedTemplateId', selectedTourPackageId);
      form.setValue('selectedTemplateType', 'TourPackage');
      form.setValue('tourPackageTemplateName', selectedTourPackage.tourPackageName || `Package ${selectedTourPackageId.substring(0, 8)}`);
      form.setValue('tourPackageQueryTemplate', ''); // Clear the other template field
      form.setValue('selectedTourPackageVariantId', '');
      form.setValue('selectedTourPackageVariantName', '');

      // Rest of your existing setValue calls
      form.setValue('tourPackageQueryType', selectedTourPackage.tourPackageType || '');
      form.setValue('tourCategory', selectedTourPackage.tourCategory || 'Domestic');
      form.setValue('locationId', selectedTourPackage.locationId);
      form.setValue('numDaysNight', selectedTourPackage.numDaysNight || '');
      form.setValue('transport', selectedTourPackage.transport || '');
      form.setValue('pickup_location', selectedTourPackage.pickup_location || '');
      form.setValue('drop_location', selectedTourPackage.drop_location || '');
      // tour_highlights removed
      // form.setValue('totalPrice', selectedTourPackage.totalPrice || ''); // REMOVED
      form.setValue('inclusions', parseJsonField(selectedTourPackage.inclusions) || INCLUSIONS_DEFAULT);
      form.setValue('exclusions', parseJsonField(selectedTourPackage.exclusions) || EXCLUSIONS_DEFAULT);
      form.setValue('importantNotes', parseJsonField(selectedTourPackage.importantNotes) || IMPORTANT_NOTES_DEFAULT);
      form.setValue('paymentPolicy', parseJsonField(selectedTourPackage.paymentPolicy) || PAYMENT_TERMS_DEFAULT);
      form.setValue('usefulTip', parseJsonField(selectedTourPackage.usefulTip) || USEFUL_TIPS_DEFAULT);
      form.setValue('cancellationPolicy', parseJsonField(selectedTourPackage.cancellationPolicy) || CANCELLATION_POLICY_DEFAULT);
      form.setValue('airlineCancellationPolicy', parseJsonField(selectedTourPackage.airlineCancellationPolicy) || AIRLINE_CANCELLATION_POLICY_DEFAULT);
      form.setValue('termsconditions', parseJsonField(selectedTourPackage.termsconditions) || TERMS_AND_CONDITIONS_DEFAULT);
      form.setValue('images', selectedTourPackage.images || []);
      const transformedItineraries = selectedTourPackage.itineraries?.map((itinerary: any) => ({
        locationId: itinerary.locationId,
        itineraryImages: itinerary.itineraryImages?.map((img: any) => ({ url: img.url })) || [],
        itineraryTitle: itinerary.itineraryTitle || '',
        itineraryDescription: itinerary.itineraryDescription || '',
        dayNumber: itinerary.dayNumber || 0,
        days: itinerary.days || '',
        activities: itinerary.activities?.map((activity: any) => ({
          activityImages: activity.activityImages?.map((img: any) => ({ url: img.url })) || [],
          activityTitle: activity.activityTitle || '',
          activityDescription: activity.activityDescription || ''
        })) || [],
        hotelId: itinerary.hotelId || '',
        roomAllocations: (itinerary as any).roomAllocations || [],
        transportDetails: (itinerary as any).transportDetails || [],

      })) || [];
      form.setValue('itineraries', transformedItineraries);
      form.setValue('flightDetails', (selectedTourPackage.flightDetails || []).map((flight: any) => ({
        date: flight.date || undefined,
        flightName: flight.flightName || undefined,
        flightNumber: flight.flightNumber || undefined,
        from: flight.from || undefined,
        to: flight.to || undefined,
        departureTime: flight.departureTime || undefined,
        arrivalTime: flight.arrivalTime || undefined,
        flightDuration: flight.flightDuration || undefined,
        images: (flight as any).images || []
      })));
      form.setValue('pricingSection', parsePricingSection(selectedTourPackage.pricingSection) || DEFAULT_PRICING_SECTION);

      const defaultVariant = selectedTourPackage.packageVariants?.find((variantItem: any) => variantItem.isDefault);
      if (defaultVariant?.id) {
        handleTourPackageVariantSelection(selectedTourPackageId, [defaultVariant.id]);
      }
    }
  };

  const handleTourPackageVariantSelection = (tourPackageId: string, selectedVariantIds: string[]) => {
    const selectedTourPackage = tourPackages?.find(tp => tp.id === tourPackageId);
    if (!selectedTourPackage) {
      toast.error('Unable to locate selected tour package.');
      return;
    }

    // Store the array of selected variant IDs
    form.setValue('selectedVariantIds', selectedVariantIds);

    if (!selectedVariantIds || selectedVariantIds.length === 0) {
      // Clear variant selection, revert to base package
      form.setValue('selectedTourPackageVariantId', '');
      form.setValue('selectedTourPackageVariantName', '');
      form.setValue('selectedTemplateId', tourPackageId);
      form.setValue('selectedTemplateType', 'TourPackage');
      form.setValue('tourPackageTemplateName', selectedTourPackage.tourPackageName || `Package ${tourPackageId.substring(0, 8)}`);
      toast.success('Variant selection cleared');
      return;
    }

    // Get variant names for display
    const variants = selectedTourPackage.packageVariants?.filter(v => selectedVariantIds.includes(v.id)) || [];
    const variantNames = variants.map(v => v.name).join(', ');

    // Store first variant for backward compatibility (if needed by other code)
    const firstVariant = variants[0];
    if (firstVariant) {
      form.setValue('selectedTourPackageVariantId', firstVariant.id);
      form.setValue('selectedTourPackageVariantName', firstVariant.name || 'Variant');
    }

    // Set template info
    form.setValue('selectedTemplateId', tourPackageId); // Keep package ID as template
    form.setValue('selectedTemplateType', 'TourPackageVariant');
    form.setValue('tourPackageTemplate', tourPackageId);
    
    const combinedTemplateName = [selectedTourPackage.tourPackageName, variantNames].filter(Boolean).join(' - ');
    if (combinedTemplateName) {
      form.setValue('tourPackageTemplateName', combinedTemplateName);
    }

    // NOTE: Hotel mappings are NO LONGER applied to itineraries here
    // The snapshots will store the hotel mappings per variant
    // The UI will display multiple hotel options from different variants side-by-side

    // Apply pricing from first variant if available (for backward compatibility with pricing tab)
    if (firstVariant && Array.isArray(firstVariant.tourPackagePricings) && firstVariant.tourPackagePricings.length > 0) {
      const sortedPricings = [...firstVariant.tourPackagePricings].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      const primaryPricing = sortedPricings[0];
      if (primaryPricing?.mealPlanId) {
        form.setValue('selectedMealPlanId', primaryPricing.mealPlanId);
      }
      if (primaryPricing?.numberOfRooms) {
        form.setValue('numberOfRooms', primaryPricing.numberOfRooms);
      }
    }

    if (selectedVariantIds.length === 1) {
      toast.success('Variant selected successfully.');
    } else if (selectedVariantIds.length > 1) {
      toast.success(`${selectedVariantIds.length} variants selected successfully.`);
    }
  };
  const handleTourPackageQuerySelection = (selectedTourPackageQueryId: string) => {
    // Find the selected tour package query template
    const selectedTourPackageQuery = tourPackageQueries?.find(tpq => tpq.id === selectedTourPackageQueryId);

    if (selectedTourPackageQuery) {
      // Update the tourPackageQueryTemplate field
      form.setValue('tourPackageQueryTemplate', selectedTourPackageQueryId);
      form.setValue('selectedTemplateId', selectedTourPackageQueryId);
      form.setValue('selectedTemplateType', 'TourPackage');
      form.setValue('tourPackageTemplate', ''); // Clear the other template field
      form.setValue('selectedTourPackageVariantId', '');
      form.setValue('selectedTourPackageVariantName', '');

      // Copy values from the selected template
      form.setValue('tourPackageQueryType', selectedTourPackageQuery.tourPackageQueryType || '');
      form.setValue('tourCategory', selectedTourPackageQuery.tourCategory || 'Domestic');
      form.setValue('locationId', selectedTourPackageQuery.locationId);
      form.setValue('numDaysNight', selectedTourPackageQuery.numDaysNight || '');
      form.setValue('transport', selectedTourPackageQuery.transport || '');
      form.setValue('pickup_location', selectedTourPackageQuery.pickup_location || '');
      form.setValue('drop_location', selectedTourPackageQuery.drop_location || '');
      // tour_highlights removed
      form.setValue('totalPrice', selectedTourPackageQuery.totalPrice || '');
      form.setValue('inclusions', parseJsonField(selectedTourPackageQuery.inclusions) || INCLUSIONS_DEFAULT);
      form.setValue('exclusions', parseJsonField(selectedTourPackageQuery.exclusions) || EXCLUSIONS_DEFAULT);
      form.setValue('importantNotes', parseJsonField(selectedTourPackageQuery.importantNotes) || IMPORTANT_NOTES_DEFAULT);
      form.setValue('paymentPolicy', parseJsonField(selectedTourPackageQuery.paymentPolicy) || PAYMENT_TERMS_DEFAULT);
      form.setValue('usefulTip', parseJsonField(selectedTourPackageQuery.usefulTip) || USEFUL_TIPS_DEFAULT);
      form.setValue('cancellationPolicy', parseJsonField(selectedTourPackageQuery.cancellationPolicy) || CANCELLATION_POLICY_DEFAULT);
      form.setValue('airlineCancellationPolicy', parseJsonField(selectedTourPackageQuery.airlineCancellationPolicy) || AIRLINE_CANCELLATION_POLICY_DEFAULT);
      form.setValue('termsconditions', parseJsonField(selectedTourPackageQuery.termsconditions) || TERMS_AND_CONDITIONS_DEFAULT);
      form.setValue('images', selectedTourPackageQuery.images || []);
      form.setValue('pricingSection', parsePricingSection(selectedTourPackageQuery.pricingSection) || DEFAULT_PRICING_SECTION);

      // Convert and set itineraries
      const transformedItineraries = selectedTourPackageQuery.itineraries?.map((itinerary: any) => ({
        locationId: itinerary.locationId,
        itineraryImages: itinerary.itineraryImages?.map((img: any) => ({ url: img.url })) || [],
        itineraryTitle: itinerary.itineraryTitle || '',
        itineraryDescription: itinerary.itineraryDescription || '',
        dayNumber: itinerary.dayNumber || 0,
        days: itinerary.days || '',
        activities: itinerary.activities?.map((activity: any) => ({
          activityImages: activity.activityImages?.map((img: any) => ({ url: img.url })) || [],
          activityTitle: activity.activityTitle || '',
          activityDescription: activity.activityDescription || ''
        })) || [],
        hotelId: itinerary.hotelId || '',
        roomAllocations: (itinerary as any).roomAllocations || [],
        transportDetails: (itinerary as any).transportDetails || [],
      })) || [];
      form.setValue('itineraries', transformedItineraries);
      // Set flight details
      form.setValue('flightDetails', (selectedTourPackageQuery.flightDetails || []).map((flight: any) => ({
        date: flight.date || undefined,
        flightName: flight.flightName || undefined,
        flightNumber: flight.flightNumber || undefined,
        from: flight.from || undefined,
        to: flight.to || undefined,
        departureTime: flight.departureTime || undefined,
        arrivalTime: flight.arrivalTime || undefined,
        flightDuration: flight.flightDuration || undefined,
        images: (flight as any).images || []
      })));

      toast.success('Tour Package Query template applied successfully');
    }
  };
  // These functions are now handled in the PricingTab component
  // Removing unused functions

  // Enhanced function to extract deep validation errors from itineraries
  const extractItineraryErrors = (errors: any) => {
    if (!errors || !errors.itineraries) return 'Unknown itinerary validation error';

    const itineraryErrors = errors.itineraries;

    // Check if it's a root error on the entire itineraries array
    if (itineraryErrors.message) {
      return `Itineraries: ${itineraryErrors.message}`;
    }

    // Check if there are specific indexed errors (errors on specific itinerary items)
    if (Array.isArray(itineraryErrors)) {
      return itineraryErrors.map((error, index) => {
        if (!error) return null;

        // Handle errors on specific fields inside an itinerary
        if (typeof error === 'object') {
          const fieldErrors = Object.entries(error)
            .map(([field, fieldError]: [string, any]) => {
              if (!fieldError) return null;
              return `Day ${index + 1} - ${field}: ${fieldError.message}`;
            })
            .filter(Boolean);

          return fieldErrors.length ? fieldErrors.join('; ') : null;
        }

        return `Day ${index + 1}: ${JSON.stringify(error)}`;
      })
        .filter(Boolean)
        .join('; ');
    }

    // If none of the above formats match
    return `Itinerary validation error: ${JSON.stringify(itineraryErrors)}`;
  };
  const onSubmit = async (data: TourPackageQueryFormValues) => {
    try {
      setLoading(true);

      // Add extremely detailed logging to diagnose the issue
      console.log("==== FORM SUBMISSION DIAGNOSIS ====");
      console.log("Form data structure:", Object.keys(data));
      console.log("Itineraries count:", data.itineraries?.length || 0);


      // Log specific details about each itinerary
      if (data.itineraries && data.itineraries.length > 0) {
        console.log("ITINERARY DETAILS:");
        data.itineraries.forEach((itinerary, index) => {
          console.log(`Itinerary #${index + 1}:`);
          console.log(`  locationId: "${itinerary.locationId || 'MISSING'}" (${typeof itinerary.locationId})`);
          console.log(`  hotelId: "${itinerary.hotelId || 'MISSING'}" (${typeof itinerary.hotelId})`);
          console.log(`  dayNumber: ${itinerary.dayNumber || 'MISSING'}`);
          console.log(`  activities count: ${itinerary.activities?.length || 0}`);

          // Check if this itinerary meets the schema requirements
          const hasRequiredFields =
            !!itinerary.locationId &&
            !!itinerary.hotelId;

          console.log(`  VALID: ${hasRequiredFields ? 'YES' : 'NO - Missing required fields'}`);

          // For activities
          if (itinerary.activities && itinerary.activities.length > 0) {
            itinerary.activities.forEach((activity, actIdx) => {
              console.log(`  Activity #${actIdx + 1}:`);
              console.log(`    activityTitle: ${activity.activityTitle ? 'Present' : 'MISSING'}`);
              console.log(`    activityImages: ${activity.activityImages?.length || 0} images`);
            });
          }
        });
      } else {
        console.log("NO ITINERARIES FOUND IN SUBMISSION DATA");
      }

      // Check form validation state
      console.log("Triggering form validation...");
      const isValid = await form.trigger();
      console.log("Form validation result:", isValid ? "PASSED" : "FAILED");

      if (!isValid) {
        console.log("VALIDATION ERROR DETAILS:");
        console.log("All errors:", form.formState.errors);

        let errorMessage = "Please fix the validation errors."; // Default message

        if (form.formState.errors.itineraries) {
          try {
            // Attempt to get detailed errors first
            const detailedErrors = extractItineraryErrors(form.formState.errors);
            // Check if the detailed message is more specific than the default
            if (detailedErrors && detailedErrors !== 'Unknown itinerary validation error') {
              errorMessage = `Validation failed: ${detailedErrors}`;
            } else {
              // Fallback to stringifying the raw error object for itineraries
              errorMessage = `Itinerary validation errors: ${JSON.stringify(form.formState.errors.itineraries, null, 2)}`;
            }
          } catch (e) {
            // If stringifying fails, use a generic message but log the raw error
            console.error("Error processing itinerary validation errors:", form.formState.errors.itineraries);
            errorMessage = "Validation failed within itineraries. Check console for details.";
          }
          toast.error(errorMessage, {
            duration: 10000 // Show for longer to read full message
          });
        } else {
          // Handle other top-level errors
          const errorDetails = Object.entries(form.formState.errors)
            .map(([field, error]) => `${field}: ${error?.message as string}`)
            .join(', ');
          errorMessage = `Please fix the following errors: ${errorDetails}`;
          toast.error(errorMessage);
        }

        setLoading(false);
        return;
      } const formattedData = {
        ...data,
        // Apply timezone normalization to tour dates
        tourStartsFrom: normalizeApiDate(data.tourStartsFrom),
        tourEndsOn: normalizeApiDate(data.tourEndsOn),
        itineraries: data.itineraries.map(itinerary => ({
          ...itinerary,
          locationId: data.locationId,
          activities: itinerary.activities?.map((activity) => ({
            ...activity,
            locationId: data.locationId,
          }))
        })),
        transport: data.transport || '',
        pickup_location: data.pickup_location || '',
        drop_location: data.drop_location || '',
        totalPrice: data.totalPrice || '',
        disclaimer: data.disclaimer || '',
      };

      if (initialData) {
        console.log("Updating existing query...");
        await axios.patch(`/api/tourPackageQuery/${params.tourPackageQueryId}`, formattedData);
        console.log("Update successful");
      } else {
        console.log("Creating new query...");
        await axios.post(`/api/tourPackageQuery`, formattedData);
        console.log("Create successful");
      }

      router.refresh();
      router.push(`/tourPackageQuery`);
      toast.success(toastMessage);
    } catch (error: any) {
      console.error('Error details:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/tourPackageQuery/${params.tourPackageQueryId}`);
      router.refresh();
      router.push(`/tourPackageQuery`);
      toast.success('Tour Package Query deleted.');
    } catch (error: any) {
      toast.error('Something went wrong.');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  // These functions are now handled in the ItineraryTab component
  // Removing unused functions

  // Fetch lookup data
  useEffect(() => {
    const fetchLookupData = async () => {
      setLookupLoading(true);
      try {
        const [roomTypesRes, occupancyTypesRes, mealPlansRes, vehicleTypesRes] = await Promise.all([
          axios.get('/api/room-types'),      // Adjust API path if needed
          axios.get('/api/occupancy-types'), // Adjust API path if needed
          axios.get('/api/meal-plans'),       // Adjust API path if needed
          axios.get('/api/vehicle-types')    // Adjust API path if needed
        ]);
        setRoomTypes(roomTypesRes.data);
        setOccupancyTypes(occupancyTypesRes.data);
        setMealPlans(mealPlansRes.data);
        setVehicleTypes(vehicleTypesRes.data);
      } catch (error) {
        console.error("Error fetching lookup data:", error);
        toast.error("Failed to load necessary configuration data.");
      } finally {
        setLookupLoading(false);
      }
    };
    fetchLookupData();
  }, []);


  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={onDelete}
        loading={loading}
      />

      <div className="flex items-center justify-between mb-4">
        <div className="space-y-1">
          <Heading title={title} description={description} />
          {initialData?.isFeatured && (
            <Badge variant="secondary" className="bg-green-500 text-white">Confirmed</Badge>
          )}
        </div>
        {initialData && (
          <Button
            disabled={loading}
            variant="destructive"
            size="sm"
            onClick={() => setOpen(true)}
          >
            <Trash className="h-4 w-4 mr-2" />
            Delete
          </Button>
        )}
      </div>

      <Separator className="mb-8" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {Object.keys(form.formState.errors).length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-800 text-sm font-medium flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293-1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
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
            <TabsList className="grid grid-cols-10 w-full">
              <TabsTrigger value="basic" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Basic Info
              </TabsTrigger>
              <TabsTrigger value="guests" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Guests
              </TabsTrigger>
              <TabsTrigger value="location" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </TabsTrigger>
              <TabsTrigger value="dates" className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Dates
              </TabsTrigger>
              <TabsTrigger value="itinerary" className="flex items-center gap-2">
                <ListPlus className="h-4 w-4" />
                Itinerary
              </TabsTrigger>
              <TabsTrigger value="hotels" className="flex items-center gap-2 relative">
                <BuildingIcon className="h-4 w-4" />
                Hotels
                {/* Inline indicator */}
                {(() => {
                  try {
                    const its: any[] = form.watch('itineraries') || [];
                    const missing = its.reduce((a, it) => !it?.hotelId ? a + 1 : a, 0);
                    return missing > 0 ? (
                      <span className="ml-1 bg-red-600 text-white rounded-full px-1.5 py-0.5 text-[10px] leading-none font-medium">
                        {missing}
                      </span>
                    ) : null;
                  } catch { return null; }
                })()}
              </TabsTrigger>
              <TabsTrigger value="flights" className="flex items-center gap-2">
                <Plane className="h-4 w-4" />
                Flights
              </TabsTrigger>
              <TabsTrigger value="pricing" className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Pricing
              </TabsTrigger>
              <TabsTrigger value="variants" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Variants
              </TabsTrigger>
              <TabsTrigger value="policies" className="flex items-center gap-2">
                <FileCheck className="h-4 w-4" />
                Policies
              </TabsTrigger>
            </TabsList>
            <TabsContent value="basic" className="space-y-4 mt-4">
              <BasicInfoTab // Updated component name
                control={form.control}
                loading={loading || fetchingPackages}
                associatePartners={associatePartners}
                tourPackages={dynamicTourPackages}
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
            <TabsContent value="guests" className="space-y-4 mt-4">
              <GuestsTab // Updated component name
                control={form.control}
                loading={loading}
              />
            </TabsContent>
            <TabsContent value="location" className="space-y-4 mt-4">
              <LocationTab
                control={form.control}
                loading={loading}
                locations={locations}
                form={form}
                updateLocationDefaults={(field, checked) => handleUseLocationDefaultsChange(field, checked)}
              />
            </TabsContent>
            <TabsContent value="dates" className="space-y-4 mt-4">
              <DatesTab
                control={form.control}
                loading={loading}
                form={form}
              />
            </TabsContent>
            <TabsContent value="itinerary" className="space-y-4 mt-4">
              <ItineraryTab
                control={form.control}
                loading={loading}
                hotels={hotels}
                activitiesMaster={activitiesMaster}
                itinerariesMaster={itinerariesMaster}
                form={form}
                // Pass lookup data down to ItineraryTab
                roomTypes={roomTypes}
                occupancyTypes={occupancyTypes}
                mealPlans={mealPlans}
                vehicleTypes={vehicleTypes}
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
            <TabsContent value="flights" className="space-y-4 mt-4">
              <FlightsTab
                control={form.control}
                loading={loading}
                form={form}
              />
            </TabsContent>            <TabsContent value="pricing" className="space-y-4 mt-4">
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
            <TabsContent value="variants" className="space-y-4 mt-4">
              <QueryVariantsTab
                control={form.control}
                form={form}
                loading={loading || fetchingPackages}
                tourPackages={dynamicTourPackages}
                hotels={hotels}
              />
            </TabsContent>
            <TabsContent value="policies" className="space-y-4 mt-4">
              <PoliciesTab
                control={form.control}
                loading={loading}
                form={form}
                useLocationDefaults={useLocationDefaults}
                onUseLocationDefaultsChange={handleUseLocationDefaultsChange}
              />
            </TabsContent>

          </Tabs >

          <div className="flex justify-end mt-8">
            <Button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading && (
                /* Corrected SVG path */
                <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM8.707 7.293a1 1 0 0 0-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293-1.293a1 1 0 0 0 1.414-1.414L11.414 10l1.293-1.293a1 1 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              {action}
            </Button>
          </div>
        </form >
      </Form >

      {process.env.NODE_ENV !== 'production' && <DevTool control={form.control} />}

    </>
  )
}
