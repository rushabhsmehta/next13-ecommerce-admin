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
import { CalendarIcon, Check as CheckIcon, ChevronsUpDown, Trash, FileCheck, ListPlus, Plane, Tag, MapPin, ChevronDown, ChevronUp, Plus, FileText, Users, Calculator, ListChecks, AlertCircle, ScrollText, BuildingIcon, UtensilsIcon, BedDoubleIcon, CarIcon, MapPinIcon, Trash2, PlusCircle } from "lucide-react";
import { Activity, AssociatePartner, Images, ItineraryMaster, RoomAllocation, TransportDetail } from "@prisma/client"
import { Location, Hotel, TourPackage, TourPackageQuery, Itinerary, FlightDetails, ActivityMaster } from "@prisma/client"
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
import { AIRLINE_CANCELLATION_POLICY_DEFAULT, CANCELLATION_POLICY_DEFAULT, EXCLUSIONS_DEFAULT, IMPORTANT_NOTES_DEFAULT, TERMS_AND_CONDITIONS_DEFAULT, DISCLAIMER_DEFAULT, INCLUSIONS_DEFAULT, PAYMENT_TERMS_DEFAULT, TOTAL_PRICE_DEFAULT, TOUR_HIGHLIGHTS_DEFAULT, TOUR_PACKAGE_QUERY_TYPE_DEFAULT, USEFUL_TIPS_DEFAULT, DEFAULT_PRICING_SECTION } from "./defaultValues"
import { cn } from "@/lib/utils"
import { DatePickerWithRange } from "@/components/DatePickerWithRange"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { format } from "date-fns"

// Add these imports at the top
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PolicyField } from "./policy-fields"
import JoditEditor from "jodit-react";
import { Calendar } from "@/components/ui/calendar";

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


const itinerarySchema = z.object({
  itineraryImages: z.object({ url: z.string() }).array(),
  itineraryTitle: z.string().optional(),
  itineraryDescription: z.string().optional(),
  dayNumber: z.coerce.number().optional(),
  days: z.string().optional(),
  activities: z.array(activitySchema),
  hotelId: z.string().optional().default(''), // Make hotelId optional with default value
  locationId: z.string().optional().default(''), // Make locationId optional with default value
  // Room allocations array for detailed room configuration
  roomAllocations: z.array(
    z.object({
      roomType: z.string().optional(),
      occupancyType: z.string().optional(),
      mealPlan: z.string().optional(),
      quantity: z.string().optional(),
      guestNames: z.string().optional()
    })
  ).optional(),
  // Transport details array for vehicle configuration
  transportDetails: z.array(
    z.object({
      vehicleType: z.string().optional(),
      transportType: z.string().optional(),
      quantity: z.string().optional(),
      description: z.string().optional()
    })
  ).optional(),
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
  tourPackageQueryNumber: z.string().optional(),
  tourPackageQueryName: z.string().min(1, "Tour Package Query Name is required"),
  tourPackageQueryType: z.string().optional(),
  customerName: z.string().optional(),
  customerNumber: z.string().optional(),
  numDaysNight: z.string().optional(),
  period: z.string().optional(),
  tour_highlights: z.string().optional(),
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
  flightDetails: flightDetailsSchema.array(),
  inclusions: z.array(z.string()),
  exclusions: z.array(z.string()),
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

type TourPackageQueryFormValues = z.infer<typeof formSchema>

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
};

export const TourPackageQueryForm: React.FC<TourPackageQueryFormProps> = ({
  initialData,
  locations,
  hotels,
  activitiesMaster,
  itinerariesMaster,
  associatePartners, // Add this
  tourPackages,
}) => {
  const params = useParams();
  const router = useRouter();

  //const defaultItinerary = { days: '1', activities: '', places: '', mealsIncluded: false };

  const [open, setOpen] = useState(false);
  const [openTemplate, setOpenTemplate] = useState(false);
  const [loading, setLoading] = useState(false); const [flightDetails, setFlightDetails] = useState([]);
  const [priceCalculationResult, setPriceCalculationResult] = useState<any>(null);
  const editor = useRef(null)

  // Store price calculation result in window for access in nested functions
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

  const transformInitialData = (data: any) => {
    return {
      ...data,
      inquiryId: data.inquiryId ?? '',  // Handle null/undefined inquiryId by using empty string as fallback
      tourPackageQueryNumber: data.tourPackageQueryNumber ?? getCurrentDateTimeString(), // Set the current date and time
      //  assignedTo: data.assignedTo ?? '', // Fallback to empty string if null
      //  assignedToMobileNumber: data.assignedToMobileNumber ?? '',
      //  assignedToEmail: data.assignedToEmail ?? '',

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
        dayNumber: itinerary.dayNumber ?? 0,
        days: itinerary.days ?? '',
        itineraryImages: itinerary.itineraryImages.map((image: { url: any }) => ({ url: image.url })),
        itineraryTitle: itinerary.itineraryTitle ?? '',
        itineraryDescription: itinerary.itineraryDescription ?? '',
        hotelId: itinerary.hotelId ?? '',
        locationId: itinerary.locationId ?? '',
        roomAllocations: itinerary.roomAllocations || [], // Handle room allocations array
        transportDetails: itinerary.transportDetails || [], // Handle transport details array
        activities: itinerary.activities?.map((activity: any) => ({
          locationId: activity.locationId ?? '',
          activityImages: activity.activityImages.map((image: { url: any }) => ({ url: image.url })),
          activityTitle: activity.activityTitle ?? '',
          activityDescription: activity.activityDescription ?? '',
        })),
      })),
      transport: data.transport || '',
      pickup_location: data.pickup_location || '',
      drop_location: data.drop_location || '',
      totalPrice: data.totalPrice || '',
      disclaimer: data.disclaimer || '',
      inclusions: parseJsonField(data.inclusions) || INCLUSIONS_DEFAULT,
      exclusions: parseJsonField(data.exclusions) || EXCLUSIONS_DEFAULT,
      importantNotes: parseJsonField(data.importantNotes) || IMPORTANT_NOTES_DEFAULT,
      paymentPolicy: parseJsonField(data.paymentPolicy) || PAYMENT_TERMS_DEFAULT,
      usefulTip: parseJsonField(data.usefulTip) || USEFUL_TIPS_DEFAULT,
      cancellationPolicy: parseJsonField(data.cancellationPolicy) || CANCELLATION_POLICY_DEFAULT,
      airlineCancellationPolicy: parseJsonField(data.airlineCancellationPolicy) || AIRLINE_CANCELLATION_POLICY_DEFAULT,
      termsconditions: parseJsonField(data.termsconditions) || TERMS_AND_CONDITIONS_DEFAULT,
      pricingSection: parsePricingSection(data.pricingSection) || DEFAULT_PRICING_SECTION,
    };
  };

  const getCurrentDateTimeString = () => {
    const now = new Date();
    return now.toISOString().replace(/[-:T.]/g, '').slice(0, 14); // Format: YYYYMMDDHHMMSS
  };

  const defaultValues = initialData ? transformInitialData(initialData) : {
    inquiryId: '',
    tourPackageTemplate: '',
    tourPackageQueryNumber: getCurrentDateTimeString(), // Set the current date and time
    tourPackageQueryName: '',
    associatePartnerId: '',
    tourPackageQueryType: '',
    customerName: '',
    customerNumber: '',
    numDaysNight: '',
    period: '',
    tour_highlights: TOUR_HIGHLIGHTS_DEFAULT,
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
    //  assignedTo: '',
    //  assignedToMobileNumber: '',
    //  assignedToEmail: '',

    flightDetails: [],

    // hotelDetails: '',
    inclusions: INCLUSIONS_DEFAULT,
    exclusions: EXCLUSIONS_DEFAULT,
    importantNotes: IMPORTANT_NOTES_DEFAULT,
    paymentPolicy: PAYMENT_TERMS_DEFAULT,
    usefulTip: USEFUL_TIPS_DEFAULT,
    cancellationPolicy: CANCELLATION_POLICY_DEFAULT,
    airlineCancellationPolicy: AIRLINE_CANCELLATION_POLICY_DEFAULT,
    termsconditions: TERMS_AND_CONDITIONS_DEFAULT,
    disclaimer: DISCLAIMER_DEFAULT,
    images: [],
    itineraries: [],
    /* itineraries: [{
      days: '',
      activities: [],
      mealsIncluded: false,
      hotelId: '',
    }],
     */
    locationId: '',
    //location : '',
    // hotelId: '',
    isFeatured: false,
    isArchived: false,
    pricingSection: DEFAULT_PRICING_SECTION, // Update this line to use the default pricing section
  };

  const form = useForm<TourPackageQueryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  // Add this right after the form declaration
  // This gives us specialized methods to handle the pricing section array
  const {
    fields: pricingFields,
    append: appendPricing,
    remove: removePricing,
    insert: insertPricing
  } = useFieldArray({
    control: form.control,
    name: "pricingSection"
  });

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
      form.setValue('tour_highlights', selectedTourPackage.tour_highlights || '');
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

  // Fix the handleAddPricingItem function using splice for direct array manipulation
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
      }

      const formattedData = {
        ...data,
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


  const handleActivitySelection = (selectedActivityId: string, itineraryIndex: number, activityIndex: number) => {
    const selectedActivityMaster = activitiesMaster?.find(activity => activity.id === selectedActivityId);

    if (selectedActivityMaster) {
      const updatedItineraries = [...form.getValues('itineraries')];
      updatedItineraries[itineraryIndex].activities[activityIndex] = {
        ...updatedItineraries[itineraryIndex].activities[activityIndex],

        activityTitle: selectedActivityMaster.activityMasterTitle || '',
        activityDescription: selectedActivityMaster.activityMasterDescription || '',
        activityImages: selectedActivityMaster.activityMasterImages?.map((image: { url: any }) => ({ url: image.url }))
      };
      form.setValue('itineraries', updatedItineraries);
    }
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
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="tourPackageTemplate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Load from Tour Package</FormLabel>
                        <Popover open={openTemplate} onOpenChange={setOpenTemplate}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  "w-full justify-between",
                                  !field.value && "text-muted-foreground"
                                )}
                                disabled={!form.getValues('locationId')} // Disable if no location selected
                              >
                                {!form.getValues('locationId')
                                  ? "Select a location first"
                                  : tourPackages?.find((tourPackage) => tourPackage.id === field.value)?.tourPackageName || "Select Tour Package Template"
                                }
                                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0">
                            <Command>
                              <CommandInput placeholder="Search tour package..." />
                              <CommandEmpty>No tour package found.</CommandEmpty>
                              <CommandGroup>
                                {tourPackages
                                  ?.filter(tp => tp.locationId === form.getValues('locationId'))
                                  .map((tourPackage) => (
                                    <CommandItem
                                      value={tourPackage.tourPackageName ?? ''}
                                      key={tourPackage.id}
                                      onSelect={() => {
                                        handleTourPackageSelection(tourPackage.id);
                                        setOpenTemplate(false); // Close the popover after selection
                                      }}
                                    >
                                      <CheckIcon
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          tourPackage.id === field.value ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      {tourPackage.tourPackageName}
                                    </CommandItem>
                                  ))}

                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormDescription>
                          {!form.getValues('locationId')
                            ? "Please select a location first to view available tour packages"
                            : "Select an existing tour package to use as a template"}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-3 gap-8">

                    <FormField
                      control={form.control}
                      name="associatePartnerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Associate Partner</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className={cn(
                                    "w-full justify-between",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value
                                    ? associatePartners.find((partner) => partner.id === field.value)?.name
                                    : "Select Associate Partner..."}
                                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0">
                              <Command>
                                <CommandInput placeholder="Search associate partner..." />
                                <CommandEmpty>No associate partner found.</CommandEmpty>
                                <CommandGroup>
                                  {associatePartners.map((partner) => (
                                    <CommandItem
                                      value={partner.name}
                                      key={partner.id}
                                      onSelect={() => {
                                        form.setValue("associatePartnerId", partner.id);
                                      }}
                                    >
                                      <CheckIcon
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          partner.id === field.value ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      {partner.name}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormDescription>
                            Associate partner details will be automatically linked to this query
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <div className="text-sm">
                        {form.watch("associatePartnerId") ? (
                          <>
                            <div className="flex flex-col space-y-1">
                              <p className="text-muted-foreground">
                                Mobile: {associatePartners.find((partner) => partner.id === form.watch("associatePartnerId"))?.mobileNumber}
                              </p>
                            </div>
                          </>
                        ) : (
                          <p className="text-muted-foreground italic">
                            Select an associate partner to view contact details
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm">
                        {form.watch("associatePartnerId") ? (
                          <>
                            <div className="flex flex-col space-y-1">
                              <p className="text-muted-foreground">
                                Email: {associatePartners.find((partner) => partner.id === form.watch("associatePartnerId"))?.email || 'Not provided'}
                              </p>
                            </div>
                          </>
                        ) : (
                          <p className="text-muted-foreground italic">
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="images"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Images</FormLabel>
                        <FormControl>
                          <ImageUpload
                            value={field.value.map((image) => image.url)}
                            disabled={loading}
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
                            // @ts-ignore
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Confirmed
                          </FormLabel>
                          <FormDescription>
                            Please Select Whether Query is confirmed or not ?
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-8">

                    <FormField
                      control={form.control}
                      name="tourPackageQueryNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tour Package Query Number</FormLabel>
                          <FormControl>
                            <Input
                              disabled={loading}
                              placeholder="Tour Package Query Number"
                              value={field.value}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />


                    {/* add formfield for TourPackageQueryName */}
                    <FormField
                      control={form.control}
                      name="tourPackageQueryName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tour Package Query Name<span className="text-red-500">*</span></FormLabel>
                          <FormControl>
                            <Input
                              disabled={loading}
                              placeholder="Tour Package Query Name"
                              value={field.value}
                              onChange={field.onChange}
                              className={form.formState.errors.tourPackageQueryName ? "border-red-500" : ""}
                            />
                          </FormControl>
                          <FormMessage>
                            {form.formState.errors.tourPackageQueryName?.message}
                          </FormMessage>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tourPackageQueryType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tour Package Query Type</FormLabel>
                          <FormControl>
                            <Select
                              disabled={loading}
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger>
                                {field.value || 'Select Tour Package Query Type'}
                              </SelectTrigger>
                              <SelectContent>
                                {TOUR_PACKAGE_QUERY_TYPE_DEFAULT.map((value) => (
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
                            <Input disabled={loading} placeholder="Number of Days/Night" {...field} />
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

                  <FormField
                    control={form.control}
                    name="remarks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Remarks</FormLabel>
                        <FormControl>
                          <Input
                            disabled={loading}
                            placeholder="Additional remarks for the tour package"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Add any special notes or requirements for this tour package
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="disclaimer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Disclaimer</FormLabel>
                        <FormControl>
                          <JoditEditor
                            ref={editor}
                            value={field.value || DISCLAIMER_DEFAULT}
                            config={{
                              readonly: loading,
                            }}
                            onChange={(e) => field.onChange(e)}
                          />
                        </FormControl>
                        <FormDescription>
                          Legal disclaimers and important information for the client
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Add similar TabsContent sections for other tabs */}
            <TabsContent value="guests" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Guests</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Move guests form fields here */}
                  {/* //add formfield for numAdults */}
                  <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Name</FormLabel>
                        <FormControl>
                          <Input disabled={loading} placeholder="Customer Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customerNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Number</FormLabel>
                        <FormControl>
                          <Input disabled={loading} placeholder="Customer Number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />


                  <FormField
                    control={form.control}
                    name="numAdults"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Adults</FormLabel>
                        <FormControl>
                          <Input disabled={loading} placeholder="Number of Adults" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* //add formfield for numChildren */}
                  <FormField
                    control={form.control}
                    name="numChild5to12"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Children 5 to 12</FormLabel>
                        <FormControl>
                          <Input disabled={loading} placeholder="Number of Children 5 to 12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* //add formfield for numChildren */}
                  <FormField
                    control={form.control}
                    name="numChild0to5"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Children 0 to 5</FormLabel>
                        <FormControl>
                          <Input disabled={loading} placeholder="Number of Children 0 to 5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

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
                                      }
                                      if (useLocationDefaults.termsconditions) {
                                        form.setValue('termsconditions', parseJsonField(location.termsconditions) || TERMS_AND_CONDITIONS_DEFAULT);
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

            <TabsContent value="dates" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Dates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Move dates form fields here */}
                  <FormField
                    control={form.control}
                    name="tourStartsFrom"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Tour Starts From</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-[240px] pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => date && field.onChange(date)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tourEndsOn"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Tour Ends On</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-[240px] pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => date && field.onChange(date)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>

                        <FormMessage />
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
                    <FormField
                      control={form.control}
                      name="itineraries"
                      render={({ field: { value = [] } }) => (
                        <>
                          {value.length > 1 ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="shadow-sm border-primary hover:bg-primary/10 transition-all flex items-center gap-2"
                              onClick={() => {
                                const itineraries = [...value];
                                if (itineraries.length <= 1) return;

                                const firstDay = itineraries[0];
                                // Get specifically roomAllocations and transportDetails arrays
                                const roomAllocations = firstDay.roomAllocations || [];
                                const transportDetails = firstDay.transportDetails || [];

                                const updatedItineraries = itineraries.map((itinerary, idx) => {
                                  if (idx === 0) return itinerary;
                                  return {
                                    ...itinerary,
                                    // Copy only roomAllocations and transportDetails from the first day
                                    roomAllocations: JSON.parse(JSON.stringify(roomAllocations)),
                                    transportDetails: JSON.parse(JSON.stringify(transportDetails))
                                  };
                                });

                                form.setValue('itineraries', updatedItineraries);
                                toast.success('Room allocations and transport details copied to all days');
                              }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              Apply First Day Room Allocations & Transport
                            </Button>
                          ) : null}
                        </>
                      )}
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <FormField
                    control={form.control}
                    name="itineraries"
                    render={({ field: { value = [], onChange } }) => (
                      <FormItem>
                        <div className="space-y-6">
                          {/* Itinerary Days */}
                          {value.map((itinerary, index) => (
                            <Accordion key={index} type="single" collapsible className="w-full border rounded-lg shadow-sm hover:shadow-md transition-all">
                              <AccordionItem value={`item-${index}`} className="border-0">
                                <AccordionTrigger className="bg-gradient-to-r from-white to-slate-50 px-4 py-3 hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100 rounded-t-lg">
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-white font-bold text-sm">
                                      {index + 1}
                                    </div>
                                    <div className="font-bold" dangerouslySetInnerHTML={{
                                      __html: itinerary.itineraryTitle || `Day ${index + 1}`,
                                    }}></div>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="pt-4 px-4 pb-6">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                  </div>
                                    <div className="flex flex-col gap-4 p-2 bg-slate-50 rounded-lg border border-slate-100">
                                      <h3 className="font-medium text-sm text-slate-500">Itinerary Template</h3>
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
                                              disabled={loading}
                                            >
                                              {itinerary.itineraryTitle
                                                ? (itinerariesMaster && itinerariesMaster.find(
                                                  (itineraryMaster) => itinerary.itineraryTitle === itineraryMaster.itineraryMasterTitle
                                                )?.itineraryMasterTitle)
                                                : "Select an Itinerary Master"}
                                              <ChevronUp className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                          </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[240px] p-0 max-h-[240px] overflow-auto">
                                          <Command>
                                            <CommandInput
                                              placeholder="Search itinerary master..."
                                              className="h-9"
                                            />
                                            <CommandEmpty>No itinerary master found.</CommandEmpty>
                                            <CommandGroup>
                                              {itinerariesMaster && itinerariesMaster.map((itineraryMaster) => (
                                                <CommandItem
                                                  value={itineraryMaster.itineraryMasterTitle ?? ''}
                                                  key={itineraryMaster.id}                                                  onSelect={() => {
                                                    const updatedItineraries = [...value];
                                                    updatedItineraries[index] = {
                                                      ...value[index],
                                                      itineraryTitle: itineraryMaster.itineraryMasterTitle || '',
                                                      itineraryDescription: itineraryMaster.itineraryMasterDescription || '',
                                                      itineraryImages: itineraryMaster.itineraryMasterImages?.map((image) => ({ url: image.url })) || [],
                                                      activities: itineraryMaster.activities?.map(activity => ({
                                                        activityTitle: activity.activityTitle || '',
                                                        activityDescription: activity.activityDescription || '',
                                                        activityImages: activity.activityImages?.map(image => ({ url: image.url })) || [],
                                                      })) || [],
                                                    };
                                                    onChange(updatedItineraries); // Update the state with the new itineraries
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

                                    <div className="grid grid-cols-2 gap-4">
                                      <FormItem>
                                        <FormLabel>Day</FormLabel>
                                        <FormControl>
                                          <Input
                                            disabled={loading}
                                            type="number"
                                            className="bg-white shadow-sm"
                                            value={itinerary.dayNumber}
                                            onChange={(e) => {
                                              const dayNumber = Number(e.target.value);
                                              const newItineraries = [...value];
                                              newItineraries[index] = { ...itinerary, dayNumber: dayNumber };
                                              onChange(newItineraries);
                                            }}
                                          />
                                        </FormControl>
                                      </FormItem>

                                      <FormItem>
                                        <FormLabel>Date</FormLabel>
                                        <FormControl>
                                          <Input
                                            placeholder="Day"
                                            disabled={loading}
                                            className="bg-white shadow-sm"
                                            value={itinerary.days}
                                            onChange={(e) => {
                                              const newItineraries = [...value];
                                              newItineraries[index] = { ...itinerary, days: e.target.value };
                                              onChange(newItineraries);
                                            }}
                                          />
                                        </FormControl>
                                      </FormItem>
                                    </div>

                                    <div className="md:col-span-2">
                                      <div className="bg-slate-50 p-3 rounded-md mb-4">
                                        <h3 className="text-sm font-medium text-slate-700 mb-2">Destination Images</h3>
                                        <ImageUpload
                                          value={itinerary.itineraryImages?.map((image) => image.url) || []}
                                          disabled={loading}
                                          onChange={(newItineraryUrl) => {
                                            const updatedImages = [...itinerary.itineraryImages, { url: newItineraryUrl }];
                                            // Update the itinerary with the new images array
                                            const updatedItineraries = [...value];
                                            updatedItineraries[index] = { ...itinerary, itineraryImages: updatedImages };
                                            onChange(updatedItineraries);
                                          }}
                                          onRemove={(itineraryURLToRemove) => {
                                            // Filter out the image to remove
                                            const updatedImages = itinerary.itineraryImages.filter((image) => image.url !== itineraryURLToRemove);
                                            // Update the itinerary with the new images array
                                            const updatedItineraries = [...value];
                                            updatedItineraries[index] = { ...itinerary, itineraryImages: updatedImages };
                                            onChange(updatedItineraries);
                                          }}
                                        />
                                      </div>
                                    </div>

                                    <div className="md:col-span-2 grid md:grid-cols-2 gap-6">
                                      <FormItem>
                                        <FormLabel>Title</FormLabel>
                                        <FormControl>
                                          <JoditEditor
                                            ref={editor}
                                            value={itinerary.itineraryTitle || ''}
                                            onChange={(e) => {
                                              const newItineraries = [...value]
                                              newItineraries[index] = { ...itinerary, itineraryTitle: e }
                                              onChange(newItineraries)
                                            }} />
                                        </FormControl>
                                      </FormItem>

                                      <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                          <JoditEditor
                                            ref={editor}
                                            value={itinerary.itineraryDescription || ''}
                                            onChange={(e) => {
                                              const newItineraries = [...value]
                                              newItineraries[index] = { ...itinerary, itineraryDescription: e }
                                              onChange(newItineraries)
                                            }} />
                                        </FormControl>
                                      </FormItem>
                                    </div>

                                    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                                      <h3 className="text-sm font-medium mb-4 flex items-center gap-2 text-slate-700">
                                        <BuildingIcon className="h-4 w-4 text-primary" />
                                        Accommodation
                                      </h3>
                                      <div className="space-y-4">
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
                                                  disabled={loading}
                                                >
                                                  {itinerary.hotelId
                                                    ? hotels.find(
                                                      (hotel) => hotel.id === itinerary.hotelId
                                                    )?.name
                                                    : "Select a Hotel"}
                                                  <ChevronUp className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                              </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[200px] p-0 max-h-[10rem] overflow-auto">
                                              <Command>
                                                <CommandInput
                                                  placeholder="Search hotel..."
                                                  className="h-9"
                                                />
                                                <CommandEmpty>No hotel found.</CommandEmpty>
                                                <CommandGroup>
                                                  {[...hotels.filter(hotel => hotel.locationId === itinerary.locationId || hotel.id === 'cdd32e64-4fc4-4784-9f46-507611eb0168')
                                                  ].map((hotel) => (
                                                    <CommandItem
                                                      value={hotel.name}
                                                      key={hotel.id}
                                                      onSelect={() => {
                                                        const newItineraries = [...value];
                                                        newItineraries[index] = {
                                                          ...itinerary,
                                                          hotelId: hotel.id
                                                        };
                                                        onChange(newItineraries); // Update the state with the new itineraries
                                                      }}
                                                    >
                                                      {hotel.name}
                                                      <CheckIcon
                                                        className={cn(
                                                          "ml-auto h-4 w-4",
                                                          hotel.id === itinerary.hotelId
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
                                          <FormMessage />
                                        </FormItem>

                                        {/* Display selected hotel images */}
                                        {(() => {
                                          const hotel = itinerary.hotelId ? hotels.find(h => h.id === itinerary.hotelId) : undefined;
                                          if (hotel && hotel.images && hotel.images.length > 0) {
                                            return (
                                              <div className="mt-4">
                                                <h4 className="text-sm font-medium mb-2">Hotel Images</h4>
                                                <div className="grid grid-cols-3 gap-2">
                                                  {hotel.images.map((image, imgIndex) => (
                                                    <div key={imgIndex} className="relative w-[120px] h-[120px] rounded-md overflow-hidden border">
                                                      <Image
                                                        src={image.url}
                                                        alt={`Hotel Image ${imgIndex + 1}`}
                                                        fill
                                                        className="object-cover"
                                                      />
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            );
                                          }
                                          return null;
                                        })()}

                                      </div>

                                      <div className="md:col-span-2">
                                        {/* Room Allocation Component */}
                                        <div className="mb-6">
                                          <h3 className="text-sm font-medium mb-2 flex items-center gap-2 text-slate-700">
                                            <BedDoubleIcon className="h-4 w-4 text-primary" />
                                            Room Allocation
                                          </h3>
                                          <RoomAllocationComponent
                                            itinerary={itinerary}
                                            index={index}
                                            value={value}
                                            onChange={onChange}
                                            loading={loading}
                                          />
                                        </div>

                                        {/* Transport Details Component */}
                                        <div className="mb-6">
                                          <h3 className="text-sm font-medium mb-2 flex items-center gap-2 text-slate-700">
                                            <CarIcon className="h-4 w-4 text-primary" />
                                            Transport Details
                                          </h3>
                                          <TransportDetailsComponent
                                            itinerary={itinerary}
                                            index={index}
                                            value={value}
                                            onChange={onChange}
                                            loading={loading}
                                          />
                                        </div>
                                      </div>

                                      <div className="md:col-span-2">
                                        <h3 className="text-sm font-medium mb-4 flex items-center gap-2 text-slate-700">
                                          <MapPinIcon className="h-4 w-4 text-primary" />
                                          Activities
                                        </h3>
                                        {itinerary.activities.map((activity, activityIndex) => (
                                          <div key={activityIndex} className="mb-6 p-4 border border-slate-200 rounded-lg bg-white shadow-sm">
                                            <div className="flex justify-between items-center mb-4">
                                              <h4 className="text-sm font-medium text-slate-700">Activity {activityIndex + 1}</h4>
                                              <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => {
                                                  const newItineraries = [...value];
                                                  newItineraries[index].activities = newItineraries[index].activities.filter((_, idx: number) => idx !== activityIndex);
                                                  onChange(newItineraries);
                                                }}
                                                className="h-8 px-3"
                                              >
                                                <Trash2 className="h-4 w-4 mr-1" />
                                                Remove
                                              </Button>
                                            </div>
                                            <div className="space-y-4">
                                              <Select
                                                disabled={loading}
                                                onValueChange={(selectedActivityId) =>
                                                  handleActivitySelection(selectedActivityId, index, activityIndex)
                                                }
                                              >
                                                <FormControl>
                                                  <SelectTrigger className="bg-white">
                                                    <SelectValue placeholder="Select an Activity" />
                                                  </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                  {activitiesMaster?.map((activityMaster: { id: string; activityMasterTitle: string | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | null | undefined }) => (
                                                    <SelectItem key={activityMaster.id}
                                                      value={activityMaster.id}>
                                                      {activityMaster.activityMasterTitle}
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>

                                              <div className="grid md:grid-cols-2 gap-4">
                                                <FormItem>
                                                  <FormLabel>Activity Title</FormLabel>
                                                  <FormControl>
                                                    <JoditEditor
                                                      ref={editor}
                                                      value={activity.activityTitle || ''}
                                                      onChange={(e) => {
                                                        const newItineraries = [...value]
                                                        newItineraries[index].activities[activityIndex] = { ...activity, activityTitle: e }
                                                        onChange(newItineraries)
                                                      }} />
                                                  </FormControl>
                                                </FormItem>

                                                <FormItem>
                                                  <FormLabel>Activity Description</FormLabel>
                                                  <FormControl>
                                                    <JoditEditor
                                                      ref={editor}
                                                      value={activity.activityDescription || ''}
                                                      onChange={(e) => {
                                                        const newItineraries = [...value]
                                                        newItineraries[index].activities[activityIndex] = { ...activity, activityDescription: e }
                                                        onChange(newItineraries)
                                                      }} />
                                                  </FormControl>
                                                </FormItem>
                                              </div>

                                              <div>
                                                <h5 className="text-xs font-medium mb-2 text-slate-600">Activity Images</h5>
                                                <ImageUpload
                                                  value={activity.activityImages?.map((image) => image.url)}
                                                  disabled={loading}
                                                  onChange={(newActivityURL) => {
                                                    // Add new image URL to the activity's images
                                                    const updatedImages = [...activity.activityImages, { url: newActivityURL }];
                                                    // Update the specific activity in the itinerary
                                                    const updatedActivities = [...itinerary.activities];
                                                    updatedActivities[activityIndex] = { ...activity, activityImages: updatedImages };

                                                    // Update the specific itinerary in the itineraries array
                                                    const updatedItineraries = [...value];
                                                    updatedItineraries[index] = { ...itinerary, activities: updatedActivities };
                                                    onChange(updatedItineraries);
                                                  }}
                                                  onRemove={(activityURLToRemove) => {
                                                    // Filter out the image to remove
                                                    const updatedImages = activity.activityImages.filter((image) => image.url !== activityURLToRemove);
                                                    // Update the specific activity in the itinerary
                                                    const updatedActivities = [...itinerary.activities];
                                                    updatedActivities[activityIndex] = { ...activity, activityImages: updatedImages };

                                                    // Update the specific itinerary in the itineraries array
                                                    const updatedItineraries = [...value];
                                                    updatedItineraries[index] = { ...itinerary, activities: updatedActivities };
                                                    onChange(updatedItineraries);
                                                  }}
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        ))}

                                        <Button
                                          type="button"
                                          size="sm"
                                          className="ml-2"
                                          onClick={() => handleSaveToMasterItinerary(itinerary)}
                                        >
                                          <Plus className="h-4 w-4 mr-2" />
                                          Save to Master Itinerary
                                        </Button>
                                      </div>
                                    </div>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          ))}

                          <div className="flex justify-center">
                            <Button
                              type="button"
                              size="default"
                              className="mt-4 bg-primary/10 hover:bg-primary/20 text-primary hover:text-primary border-dashed border-2 border-primary/30"
                              onClick={() => onChange([...value, {
                                dayNumber: 0,
                                days: '',
                                itineraryImages: [],
                                itineraryTitle: '',
                                itineraryDescription: '',
                                activities: [],
                                hotelId: '',
                                locationId: form.getValues('locationId') || ''
                              }])}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add New Day
                            </Button>
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

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
                                  }} >
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
            </TabsContent>            <TabsContent value="pricing" className="space-y-4 mt-4">
              {/* Price calculation results are now managed at the component level */}
              <Card>
                <CardHeader>
                  <CardTitle>Pricing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Auto-calculate pricing section */}
                  <div className="border border-blue-100 bg-blue-50 rounded-lg p-4 mb-6">                    <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-blue-800">Auto Price Calculation</h3>
                      {/* Add spinner that shows during calculation */}
                      <div id="price-calculating-spinner" className="hidden animate-spin rounded-full h-5 w-5 border-b-2 border-blue-800"></div>
                    </div>

                    {/* Markup Input and Pricing Tier Selection */}
                    <div className="flex space-x-2 items-center">
                      <div className="flex items-center">
                        <label htmlFor="markup" className="text-sm mr-2 text-blue-700">Markup %:</label>
                        <Input
                          id="markup"
                          type="number"
                          className="w-20 h-8"
                          defaultValue="0"
                          min="0"
                          max="100"
                          onChange={(e) => {
                            // Store the custom markup value for calculations
                            (window as any).customMarkupValue = e.target.value;
                          }}
                          ref={(el) => {
                            if (el) (window as any).markupInput = el;
                          }}
                        />
                      </div>
                      <div>
                        <Select onValueChange={(value) => {
                          // When a tier is selected, set the corresponding markup percentage
                          if (value === 'standard') {
                            if ((window as any).markupInput) (window as any).markupInput.value = '10';
                            (window as any).customMarkupValue = '10';
                          } else if (value === 'premium') {
                            if ((window as any).markupInput) (window as any).markupInput.value = '20';
                            (window as any).customMarkupValue = '20';
                          } else if (value === 'luxury') {
                            if ((window as any).markupInput) (window as any).markupInput.value = '30';
                            (window as any).customMarkupValue = '30';
                          } else if (value === 'custom') {
                            // For custom option, keep the current value
                            (window as any).customMarkupValue = (window as any).markupInput.value;
                          }
                        }}>
                          <SelectTrigger className="w-32 h-8">
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
                    </div>                      <Button
                      type="button"
                      onClick={async () => {
                        try {
                          // Set calculating state to true to show spinner
                          const calculatingElement = document.getElementById('price-calculating-spinner');
                          if (calculatingElement) calculatingElement.classList.remove('hidden');

                          console.log("Starting simple price calculation...");

                          // Get required data from form
                          const tourStartsFrom = form.getValues('tourStartsFrom');
                          const tourEndsOn = form.getValues('tourEndsOn');
                          const itineraries = form.getValues('itineraries');

                          // Validate required data
                          if (!tourStartsFrom || !tourEndsOn) {
                            const errorMsg = 'Please select tour start and end dates first';
                            console.error(errorMsg);
                            toast.error(errorMsg);
                            return;
                          }

                          // Check if we have any itineraries with hotels
                          const validItineraries = itineraries.filter(itinerary => {
                            return itinerary.hotelId &&
                              hotels.some(hotel => hotel.id === itinerary.hotelId);
                          });

                          if (validItineraries.length === 0) {
                            toast.error('Please select hotels for at least one day to calculate pricing');
                            return;
                          }

                          toast.success('Calculating room prices...');

                          // Convert to PricingItinerary type by ensuring all required fields are present
                          const pricingItineraries = validItineraries.map(itinerary => ({
                            locationId: itinerary.locationId,
                            dayNumber: itinerary.dayNumber || 0, // Default to day 0 if not specified
                            hotelId: itinerary.hotelId,
                            // Add room allocations if available
                            roomAllocations: itinerary.roomAllocations || [],
                            transportDetails: itinerary.transportDetails || [],
                          }));                            // Get the markup value from the window object that's storing the user's selection
                          const markupValue = (window as any).customMarkupValue || '0';
                          const markupPercentage = parseFloat(markupValue);

                          console.log('Sending data to price calculation API:', {
                            tourStartsFrom,
                            tourEndsOn,
                            itineraries: pricingItineraries,
                            markup: markupPercentage
                          });

                          // Call the API to calculate price with our simplified approach
                          const response = await axios.post('/api/pricing/calculate', {
                            tourStartsFrom,
                            tourEndsOn,
                            itineraries: pricingItineraries,
                            markup: markupPercentage
                          });

                          const result = response.data;
                          console.log('Price calculation result:', result);                            // Update form with the calculated prices
                          if (result && result.totalCost) {
                            form.setValue('totalPrice', result.totalCost.toString());

                            // Update pricing section with basic room cost
                            form.setValue('pricingSection', [
                              {
                                name: 'Total Room Cost',
                                price: result.totalCost.toString(),
                                description: 'Total accommodation cost'
                              },
                              {
                                name: 'Accommodation Breakdown',
                                price: result.breakdown.accommodation.toString(),
                                description: 'Hotel room costs only'
                              }
                            ]);                              // Store the calculation result for display in the table
                            (window as any).setPriceCalculationResult(result); toast.success('Price calculation complete!');
                          } else {
                            toast.error('Invalid price calculation result');
                          }
                          // Hide spinner when calculation is complete
                          const spinnerElement = document.getElementById('price-calculating-spinner');
                          if (spinnerElement) spinnerElement.classList.add('hidden');

                        } catch (error: any) {
                          console.error('Price calculation error:', error);

                          let errorMessage = 'Error calculating price';

                          if (error instanceof Error) {
                            errorMessage = error.message;
                            console.error('Error details:', error.stack);
                          }

                          if (error.response) {
                            console.error('API response error data:', error.response.data);
                            console.error('API response error status:', error.response.status);

                            if (error.response.data) {
                              errorMessage = typeof error.response.data === 'string'
                                ? `API Error: ${error.response.data}`
                                : `API Error: Status ${error.response.status}`;
                            }
                          }

                          toast.error(`Price calculation failed: ${errorMessage}`);
                        }
                      }}
                      variant="outline"
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      <Calculator className="mr-2 h-4 w-4" />
                      Calculate Price
                    </Button>                    </div>
                    {/* Integrated Price Calculation Result Table */}
                    {(window as any).priceCalculationResult && ((window as any).priceCalculationResult.itineraryBreakdown?.length > 0 ||
                      (window as any).priceCalculationResult.transportDetails?.length > 0) && (
                        <div className="mt-6 border border-blue-200 rounded-lg overflow-hidden">
                          <Table>
                            <TableCaption>Complete Pricing Details</TableCaption>
                            <TableHeader>
                              <TableRow className="bg-blue-50">
                                <TableHead className="w-[80px]">Day</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Room Cost</TableHead>
                                <TableHead className="text-right">Transport Cost</TableHead>
                                <TableHead className="text-right">Day Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {/* Create a day-by-day breakdown combining accommodation and transport */}
                              {(() => {
                                // Get all unique days from both itineraries and transport
                                const days = new Set<number>();

                                // Add days from accommodation
                                (window as any).priceCalculationResult.itineraryBreakdown?.forEach((item: any) => {
                                  days.add(item.day);
                                });

                                // Add days from transport
                                (window as any).priceCalculationResult.transportDetails?.forEach((transport: any) => {
                                  days.add(transport.day);
                                });

                                // Convert to sorted array
                                const sortedDays = Array.from(days).sort((a, b) => a - b);

                                // Create a row for each day
                                return sortedDays.map(day => {
                                  // Find accommodation for this day
                                  const accommodation = (window as any).priceCalculationResult.itineraryBreakdown?.find((item: any) => item.day === day);

                                  // Find transport for this day
                                  const transports = (window as any).priceCalculationResult.transportDetails?.filter((transport: any) => transport.day === day);

                                  // Calculate transport cost for this day
                                  const transportCost = transports?.reduce((sum: number, transport: any) => sum + transport.totalCost, 0) || 0;

                                  // Get accommodation info
                                  const formItineraries = form.getValues('itineraries');
                                  const originalItinerary = formItineraries.find((it: any) => it.dayNumber === day);
                                  const hotelName = originalItinerary && hotels.find((h: any) => h.id === originalItinerary.hotelId)?.name;

                                  // Accommodation details
                                  const roomAllocation = originalItinerary?.roomAllocations?.[0];
                                  const roomType = roomAllocation?.roomType || "Standard";
                                  const occupancyType = roomAllocation?.occupancyType || "Single";
                                  const quantity = roomAllocation?.quantity || "1";

                                  // Transport details summary
                                  interface TransportDetail {
                                    vehicleType: string;
                                    quantity: number;
                                    totalCost: number;
                                    day: number;
                                  }

                                  const transportSummary: string | undefined = transports?.map((t: TransportDetail) =>
                                    `${t.vehicleType}${t.quantity > 1 ? ` (x${t.quantity})` : ''}`
                                  ).join(", ");

                                  const accommodationCost = accommodation?.accommodationCost || 0;
                                  const dayTotal = accommodationCost + transportCost;

                                  return (
                                    <TableRow key={`day-${day}`}>
                                      <TableCell className="font-medium">Day {day}</TableCell>
                                      <TableCell>
                                        {hotelName ? (
                                          <div>
                                            <span className="font-medium">{hotelName}</span>
                                            <span className="text-xs text-gray-500 block">
                                              {roomType}, {occupancyType} {quantity && parseInt(quantity) > 1 ? `(x${quantity})` : ''}
                                            </span>
                                            {transportSummary && (
                                              <span className="text-xs text-gray-500 block mt-1">
                                                Transport: {transportSummary}
                                              </span>
                                            )}
                                          </div>
                                        ) : transportSummary ? (
                                          <div>
                                            <span className="text-xs text-gray-500 block">
                                              Transport only: {transportSummary}
                                            </span>
                                          </div>
                                        ) : (
                                          'N/A'
                                        )}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {accommodationCost ? accommodationCost.toFixed(2) : '-'}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {transportCost ? transportCost.toFixed(2) : '-'}
                                      </TableCell>
                                      <TableCell className="text-right font-medium">
                                        {dayTotal.toFixed(2)}
                                      </TableCell>
                                    </TableRow>
                                  );
                                });
                              })()}

                              {/* Summary Section */}
                              <TableRow className="bg-blue-50">
                                <TableCell colSpan={5} className="font-medium text-right">
                                  Base Accommodation Cost
                                </TableCell>
                                <TableCell className="text-right font-bold">
                                  {(window as any).priceCalculationResult.breakdown.accommodation.toFixed(2)}
                                </TableCell>
                              </TableRow>

                              <TableRow className="bg-blue-50">
                                <TableCell colSpan={5} className="font-medium text-right">
                                  Base Transport Cost
                                </TableCell>
                                <TableCell className="text-right font-bold">
                                  {(window as any).priceCalculationResult.breakdown.transport.toFixed(2)}
                                </TableCell>
                              </TableRow>

                              <TableRow className="bg-blue-50">
                                <TableCell colSpan={5} className="font-medium text-right">
                                  Total Base Cost
                                </TableCell>
                                <TableCell className="text-right font-bold">
                                  {((window as any).priceCalculationResult.breakdown.accommodation +
                                    (window as any).priceCalculationResult.breakdown.transport).toFixed(2)}
                                </TableCell>
                              </TableRow>

                              {(window as any).priceCalculationResult.appliedMarkup && (
                                <TableRow className="bg-blue-100">
                                  <TableCell colSpan={5} className="font-medium text-right">
                                    Markup ({(window as any).priceCalculationResult.appliedMarkup.percentage}%)
                                  </TableCell>
                                  <TableCell className="text-right font-bold">
                                    {(window as any).priceCalculationResult.appliedMarkup.amount.toFixed(2)}
                                  </TableCell>
                                </TableRow>
                              )}

                              <TableRow className="bg-blue-200">
                                <TableCell colSpan={5} className="font-medium text-right">
                                  Final Total Cost
                                </TableCell>
                                <TableCell className="text-right font-bold">
                                  {(window as any).priceCalculationResult.totalCost.toFixed(2)}
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      )}
                  </div>

                  <div className="grid grid-cols-3 gap-8">
                    <FormField
                      control={form.control}
                      name="totalPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Price
                          </FormLabel>
                          <FormControl>
                            <Input disabled={loading} placeholder="Total Price" {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                                          variant="ghost"
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
                      <TabsTrigger value="notes" className="flex items-center gap-2">
                        <FileText className="h-4 w-4 mr-2" />
                        Notes & Tips
                      </TabsTrigger>
                      <TabsTrigger value="cancellation" className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Cancellation
                      </TabsTrigger>
                      <TabsTrigger value="terms" className="flex items-center gap-2">
                        <ScrollText className="h-4 w-4 mr-2" />
                        Terms
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="inclusions" className="space-y-4 mt-4">
                      <div className="grid gap-4">
                        <PolicyField
                          form={form}
                          name="inclusions"
                          label="Inclusions"
                          loading={loading}
                          useDefaultsChecked={useLocationDefaults.inclusions}
                          onUseDefaultsChange={(checked: boolean) => handleUseLocationDefaultsChange('inclusions', checked)}
                          description="Inclusions for this tour package"
                        />

                        <PolicyField
                          form={form}
                          name="exclusions"
                          label="Exclusions"
                          loading={loading}
                          useDefaultsChecked={useLocationDefaults.exclusions}
                          onUseDefaultsChange={(checked: boolean) => handleUseLocationDefaultsChange('exclusions', checked)}
                          description="Exclusions for this tour package"
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="notes" className="space-y-4 mt-4">
                      <div className="grid gap-4">
                        <PolicyField
                          form={form}
                          name="importantNotes"
                          label="Important Notes"
                          loading={loading}
                          useDefaultsChecked={useLocationDefaults.importantNotes}
                          onUseDefaultsChange={(checked: boolean) => handleUseLocationDefaultsChange('importantNotes', checked)}
                          description="Important notes for this tour package"
                        />

                        <PolicyField
                          form={form}
                          name="usefulTip"
                          label="Useful Tips"
                          loading={loading}
                          useDefaultsChecked={useLocationDefaults.usefulTip}
                          onUseDefaultsChange={(checked: boolean) => handleUseLocationDefaultsChange('usefulTip', checked)}
                          description="Useful tips for this tour package"
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="cancellation" className="space-y-4 mt-4">
                      <div className="grid gap-4">
                        <PolicyField
                          form={form}
                          name="cancellationPolicy"
                          label="General Cancellation Policy"
                          loading={loading}
                          useDefaultsChecked={useLocationDefaults.cancellationPolicy}
                          onUseDefaultsChange={(checked: boolean) => handleUseLocationDefaultsChange('cancellationPolicy', checked)}
                          description="Cancellation policy for this tour package"
                        />

                        <PolicyField
                          form={form}
                          name="airlineCancellationPolicy"
                          label="Airline Cancellation Policy"
                          loading={loading}
                          useDefaultsChecked={useLocationDefaults.airlineCancellationPolicy}
                          onUseDefaultsChange={(checked: boolean) => handleUseLocationDefaultsChange('airlineCancellationPolicy', checked)}
                          description="Airline cancellation policy for this tour package"
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="terms" className="space-y-4 mt-4">
                      <div className="grid gap-4">
                        <PolicyField
                          form={form}
                          name="paymentPolicy"
                          label="Payment Policy"
                          loading={loading}
                          useDefaultsChecked={useLocationDefaults.paymentPolicy}
                          onUseDefaultsChange={(checked: boolean) => handleUseLocationDefaultsChange('paymentPolicy', checked)}
                          description="Payment policy for this tour package"
                        />

                        <PolicyField
                          form={form}
                          name="termsconditions"
                          label="Terms and Conditions"
                          loading={loading}
                          useDefaultsChecked={useLocationDefaults.termsconditions}
                          onUseDefaultsChange={(checked: boolean) => handleUseLocationDefaultsChange('termsconditions', checked)}
                          description="Terms and conditions for this tour package"
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>

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
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM8.707 7.293a1 1 0 0 0-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 1 0 1.414 1.414L10 11.414l1.293 1.293a1 1 0 0 0 1.414-1.414L11.414 10l1.293-1.293a1 1 0 0 0-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              {action}
            </Button>
          </div>
        </form>
      </Form>

      {process.env.NODE_ENV !== 'production' && <DevTool control={form.control} />}

    </>
  )
}


