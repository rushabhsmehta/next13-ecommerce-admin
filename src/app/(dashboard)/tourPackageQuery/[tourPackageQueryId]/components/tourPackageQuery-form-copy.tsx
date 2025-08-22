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
import { CalendarIcon, Check as CheckIcon, ChevronsUpDown, Trash, FileCheck, ListPlus, Plane, Tag, MapPin, ChevronDown, ChevronUp, Plus, FileText, Users, Calculator, ListChecks, AlertCircle, ScrollText, BuildingIcon, UtensilsIcon, BedDoubleIcon, CarIcon, MapPinIcon, Trash2, PlusCircle, ImageIcon, BedIcon, Type, AlignLeft } from "lucide-react";
import { Activity, AssociatePartner, Images, ItineraryMaster, RoomAllocation, TransportDetail } from "@prisma/client"
import { Location, Hotel, TourPackage, TourPackageQuery, Itinerary, FlightDetails, ActivityMaster, RoomType, OccupancyType, MealPlan, VehicleType } from "@prisma/client"; // Add prisma types
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
  guestNames: z.string().nullable().optional()
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
}); // Assuming an array of flight details

const formSchema = z.object({
  inquiryId: z.string().nullable().optional(),
  tourPackageTemplate: z.string().optional(),
  tourPackageQueryTemplate: z.string().optional(),
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
  pricingSection: z.array(pricingItemSchema).optional().default([]), // Add this line
  pricingTier: z.string().default('standard').optional(), // Added for pricing tier options
  customMarkup: z.string().optional(), // Added for custom markup percentage
  remarks: z.string().optional(),
  locationId: z.string().min(1, "Location is required"),  flightDetails: flightDetailsSchema.array(),
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
  itineraries: z.array(itinerarySchema),
  isFeatured: z.boolean().default(false).optional(),
  isArchived: z.boolean().default(false).optional(),
  associatePartnerId: z.string().optional(), // Add associatePartnerId to the schema
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


  const toastMessage = initialData ? 'Tour Package Query updated.' : 'Tour Package Query created.';
  const action = initialData ? 'Save changes' : 'Create';
  console.log("Initial Data : ", initialData?.itineraries)

  // Ensure quantity is always treated as a string in roomAllocations and transportDetails
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
      }))
    };
  };

  const getCurrentDateTimeString = () => {
    const now = new Date();
    return now.toISOString().replace(/[-:T.]/g, '').slice(0, 14); // Format: YYYYMMDDHHMMSS
  };
  const defaultValues = initialData
    ? {
      ...transformInitialData(initialData),      
      // Restore dropdown field values based on saved template data
      tourPackageTemplate: initialData.selectedTemplateType === 'TourPackage' ? (initialData.selectedTemplateId || '') : '',
      tourPackageQueryTemplate: initialData.selectedTemplateType === 'TourPackageQuery' ? (initialData.selectedTemplateId || '') : '',
      inclusions: parseJsonField(initialData.inclusions),
      exclusions: parseJsonField(initialData.exclusions),
      kitchenGroupPolicy: parseJsonField(initialData.kitchenGroupPolicy) || KITCHEN_GROUP_POLICY_DEFAULT,
      importantNotes: parseJsonField(initialData.importantNotes),
      paymentPolicy: parseJsonField(initialData.paymentPolicy),
      usefulTip: parseJsonField(initialData.usefulTip),
      cancellationPolicy: parseJsonField(initialData.cancellationPolicy),
      airlineCancellationPolicy: parseJsonField(initialData.airlineCancellationPolicy),
      termsconditions: parseJsonField(initialData.termsconditions),
      pricingSection: parsePricingSection(initialData.pricingSection),
    }
    : {
      inquiryId: '',
      tourPackageTemplate: '',
      tourPackageQueryNumber: getCurrentDateTimeString(),
      tourPackageQueryName: '',
      associatePartnerId: '',
      tourPackageQueryType: '',
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
      flightDetails: [],      inclusions: INCLUSIONS_DEFAULT,
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
    };

  const form = useForm<TourPackageQueryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues
  });
  // This useFieldArray is now handled in the PricingTab component
  // Removing unused code

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
  const handleTourPackageSelection = (selectedTourPackageId: string) => {
    const selectedTourPackage = tourPackages?.find(tp => tp.id === selectedTourPackageId);
    if (selectedTourPackage) {
      // Add this line to update the tourPackageTemplate field
      form.setValue('tourPackageTemplate', selectedTourPackageId);
      // Rest of your existing setValue calls
      form.setValue('tourPackageQueryType', selectedTourPackage.tourPackageType || '');
      form.setValue('locationId', selectedTourPackage.locationId);
      form.setValue('numDaysNight', selectedTourPackage.numDaysNight || '');
      form.setValue('transport', selectedTourPackage.transport || '');
      form.setValue('pickup_location', selectedTourPackage.pickup_location || '');
      form.setValue('drop_location', selectedTourPackage.drop_location || '');
      form.setValue('totalPrice', selectedTourPackage.totalPrice || '');
      form.setValue('inclusions', parseJsonField(selectedTourPackage.inclusions) || INCLUSIONS_DEFAULT);
      form.setValue('exclusions', parseJsonField(selectedTourPackage.exclusions) || EXCLUSIONS_DEFAULT);
      form.setValue('importantNotes', parseJsonField(selectedTourPackage.importantNotes) || IMPORTANT_NOTES_DEFAULT);
      form.setValue('paymentPolicy', parseJsonField(selectedTourPackage.paymentPolicy) || PAYMENT_TERMS_DEFAULT);
      form.setValue('usefulTip', parseJsonField(selectedTourPackage.usefulTip) || USEFUL_TIPS_DEFAULT);
      form.setValue('cancellationPolicy', parseJsonField(selectedTourPackage.cancellationPolicy) || CANCELLATION_POLICY_DEFAULT);
      form.setValue('airlineCancellationPolicy', parseJsonField(selectedTourPackage.airlineCancellationPolicy) || AIRLINE_CANCELLATION_POLICY_DEFAULT);
      form.setValue('termsconditions', parseJsonField(selectedTourPackage.termsconditions) || TERMS_AND_CONDITIONS_DEFAULT);
      form.setValue('images', selectedTourPackage.images || []);
      const transformedItineraries = selectedTourPackage.itineraries?.map(itinerary => ({
        locationId: itinerary.locationId,
        itineraryImages: itinerary.itineraryImages?.map(img => ({ url: img.url })) || [],
        itineraryTitle: itinerary.itineraryTitle || '',
        itineraryDescription: itinerary.itineraryDescription || '',
        dayNumber: itinerary.dayNumber || 0,
        days: itinerary.days || '',
        activities: itinerary.activities?.map(activity => ({
          activityImages: activity.activityImages?.map(img => ({ url: img.url })) || [],
          activityTitle: activity.activityTitle || '',
          activityDescription: activity.activityDescription || ''
        })) || [],
        hotelId: itinerary.hotelId || '',
        roomAllocations: (itinerary as any).roomAllocations || [],
        transportDetails: (itinerary as any).transportDetails || [],

      })) || [];
      form.setValue('itineraries', transformedItineraries);
      form.setValue('flightDetails', (selectedTourPackage.flightDetails || []).map(flight => ({
        date: flight.date || undefined,
        flightName: flight.flightName || undefined,
        flightNumber: flight.flightNumber || undefined,
        from: flight.from || undefined,
        to: flight.to || undefined,
        departureTime: flight.departureTime || undefined,
        arrivalTime: flight.arrivalTime || undefined,
        flightDuration: flight.flightDuration || undefined
      })));
      form.setValue('pricingSection', parsePricingSection(selectedTourPackage.pricingSection) || DEFAULT_PRICING_SECTION);
    }
  };
  const handleTourPackageQuerySelection = (selectedTourPackageQueryId: string) => {
    // Find the selected tour package query template
    const selectedTourPackageQuery = tourPackageQueries?.find(tpq => tpq.id === selectedTourPackageQueryId);
    
    if (selectedTourPackageQuery) {
      // Update the tourPackageQueryTemplate field
      form.setValue('tourPackageQueryTemplate', selectedTourPackageQueryId);
      
      // Copy values from the selected template
      form.setValue('tourPackageQueryType', selectedTourPackageQuery.tourPackageQueryType || '');
      form.setValue('locationId', selectedTourPackageQuery.locationId);
      form.setValue('numDaysNight', selectedTourPackageQuery.numDaysNight || '');
      form.setValue('transport', selectedTourPackageQuery.transport || '');
      form.setValue('pickup_location', selectedTourPackageQuery.pickup_location || '');
      form.setValue('drop_location', selectedTourPackageQuery.drop_location || '');
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
      const transformedItineraries = selectedTourPackageQuery.itineraries?.map(itinerary => ({
        locationId: itinerary.locationId,
        itineraryImages: itinerary.itineraryImages?.map(img => ({ url: img.url })) || [],
        itineraryTitle: itinerary.itineraryTitle || '',
        itineraryDescription: itinerary.itineraryDescription || '',
        dayNumber: itinerary.dayNumber || 0,
        days: itinerary.days || '',
        activities: itinerary.activities?.map(activity => ({
          activityImages: activity.activityImages?.map(img => ({ url: img.url })) || [],
          activityTitle: activity.activityTitle || '',
          activityDescription: activity.activityDescription || ''
        })) || [],
        hotelId: itinerary.hotelId || '',
        roomAllocations: (itinerary as any).roomAllocations || [],
        transportDetails: (itinerary as any).transportDetails || [],
      })) || [];
      form.setValue('itineraries', transformedItineraries);
      
      // Set flight details
      form.setValue('flightDetails', (selectedTourPackageQuery.flightDetails || []).map(flight => ({
        date: flight.date || undefined,
        flightName: flight.flightName || undefined,
        flightNumber: flight.flightNumber || undefined,
        from: flight.from || undefined,
        to: flight.to || undefined,
        departureTime: flight.departureTime || undefined,
        arrivalTime: flight.arrivalTime || undefined,
        flightDuration: flight.flightDuration || undefined
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
      }      const formattedData = {
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
        const response = await axios.patch(`/api/tourPackageQuery/${params.tourPackageQueryId}`, formattedData);
        console.log("Update response:", response.data);
      } else {
        console.log("Creating new query...");
        const response = await axios.post(`/api/tourPackageQuery`, formattedData);
        console.log("Create response:", response.data);
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
            <pre className="bg-red-100 text-red-700 p-4 rounded border border-red-300 text-xs">
              {JSON.stringify(form.formState.errors, null, 2)}
            </pre>
          )}
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
            <TabsList className="grid grid-cols-8 w-full"> {/* Changed from grid-cols-7 to grid-cols-8 */}
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
            </TabsList>
            <TabsContent value="basic" className="space-y-4 mt-4">
              <BasicInfoTab // Updated component name
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
              />
            </TabsContent>
            <TabsContent value="flights" className="space-y-4 mt-4">
              <FlightsTab
                control={form.control}
                loading={loading}
                form={form}
              />
            </TabsContent>
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
