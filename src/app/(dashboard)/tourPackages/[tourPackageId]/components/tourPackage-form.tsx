"use client"

import * as z from "zod"
import axios from "axios"
import { JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, useEffect, useRef, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm } from "react-hook-form"
import { toast } from "react-hot-toast"
import { CheckIcon, ChevronDown, ChevronUp, Trash, Plus, ListChecks, AlertCircle, ScrollText } from "lucide-react"
import { Activity, Images, ItineraryMaster } from "@prisma/client"
import { Location, Hotel, TourPackage, Itinerary, FlightDetails, ActivityMaster } from "@prisma/client"
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
import { FileText, Users, MapPin, Calendar as CalendarIcon, ListPlus, Plane, Tag, FileCheck } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Heading } from "@/components/ui/heading"
import { AlertModal } from "@/components/modals/alert-modal"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import ImageUpload from "@/components/ui/image-upload"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { AIRLINE_CANCELLATION_POLICY_DEFAULT, CANCELLATION_POLICY_DEFAULT, EXCLUSIONS_DEFAULT, IMPORTANT_NOTES_DEFAULT, INCLUSIONS_DEFAULT, KITCHEN_GROUP_POLICY_DEFAULT, PAYMENT_TERMS_DEFAULT, TERMS_AND_CONDITIONS_DEFAULT, USEFUL_TIPS_DEFAULT, TOUR_HIGHLIGHTS_DEFAULT, TOTAL_PRICE_DEFAULT, TOUR_PACKAGE_TYPE_DEFAULT, TOUR_CATEGORY_DEFAULT, PRICE_DEFAULT, DEFAULT_PRICING_SECTION } from "./defaultValues"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { CaretSortIcon } from "@radix-ui/react-icons"
import { Switch } from "@/components/ui/switch"
import { PolicyField } from "./policy-fields";
import { DevTool } from "@hookform/devtools"

// This will be overridden in the component
const defaultEditorConfig = {
  readonly: false, // all options from <https://xdsoft.net/jodit/doc/>
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
  days: z.string().optional(),
  activities: z.array(activitySchema),
  mealsIncluded: z.array(z.string()).optional(),
  hotelId: z.string().optional(), // Array of hotel IDs
  numberofRooms: z.string().optional(),
  roomCategory: z.string().optional(),
  locationId: z.string(), // Array of hotel IDs

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
  customerName: z.string().optional(),
  customerNumber: z.string().optional(),
  numDaysNight: z.string().optional(),
  period: z.string().optional(),
  tour_highlights: z.string().optional(),
  transport: z.string().optional(),
  pickup_location: z.string().optional(),
  drop_location: z.string().optional(),
  numAdults: z.string().optional(),
  numChild5to12: z.string().optional(),
  numChild0to5: z.string().optional(),  totalPrice: z.string().optional(),
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
  itineraries: z.array(itinerarySchema),
  isFeatured: z.boolean().default(false).optional(),
  isArchived: z.boolean().default(false).optional(),
  assignedTo: z.string().optional(),
  assignedToMobileNumber: z.string().optional(),
  assignedToEmail: z.string().optional(),
  slug: z.string().optional(),
});

type TourPackageFormValues = z.infer<typeof formSchema>

interface TourPackageFormProps {
  initialData: TourPackage & {
    images: Images[];
    itineraries: Itinerary[];
    flightDetails: FlightDetails[];
  } | null;
  locations: Location[];
  hotels: Hotel[];
  activitiesMaster: (ActivityMaster & {
    activityMasterImages: Images[];
  })[] | null;
  itinerariesMaster: (ItineraryMaster & {
    itineraryMasterImages: Images[];
    activities: (Activity & {
      activityImages: Images[];
    })[] | null;

  })[] | null;
  readOnly?: boolean;
};

export const TourPackageForm: React.FC<TourPackageFormProps> = ({
  initialData,
  locations,
  hotels,
  activitiesMaster,
  itinerariesMaster,
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
            break;          case 'termsconditions':
            form.setValue('termsconditions', parseJsonField(selectedLocation.termsconditions) || TERMS_AND_CONDITIONS_DEFAULT);
            break;          case 'kitchenGroupPolicy':
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

  const editor = useRef(null)

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

  const transformInitialData = (data: any) => {
    return {
      ...data,
      assignedTo: data.assignedTo ?? '', // Fallback to empty string if null
      assignedToMobileNumber: data.assignedToMobileNumber ?? '',
      assignedToEmail: data.assignedToEmail ?? '',
      customerNumber: data.customerNumber ?? '',
      tour_highlights: data.tour_highlights ?? TOUR_HIGHLIGHTS_DEFAULT,
      tourCategory: data.tourCategory ?? 'Domestic', // Add default for tour category
      slug: data.slug ?? '',
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
      })),      inclusions: parseJsonField(data.inclusions) || INCLUSIONS_DEFAULT,
      exclusions: parseJsonField(data.exclusions) || EXCLUSIONS_DEFAULT,
      kitchenGroupPolicy: parseJsonField(data.kitchenGroupPolicy) || KITCHEN_GROUP_POLICY_DEFAULT,
      importantNotes: parseJsonField(data.importantNotes) || IMPORTANT_NOTES_DEFAULT,
      paymentPolicy: parseJsonField(data.paymentPolicy) || PAYMENT_TERMS_DEFAULT,
      usefulTip: parseJsonField(data.usefulTip) || USEFUL_TIPS_DEFAULT,
      cancellationPolicy: parseJsonField(data.cancellationPolicy) || CANCELLATION_POLICY_DEFAULT,
      airlineCancellationPolicy: parseJsonField(data.airlineCancellationPolicy) || AIRLINE_CANCELLATION_POLICY_DEFAULT,
      termsconditions: parseJsonField(data.termsconditions) || TERMS_AND_CONDITIONS_DEFAULT,
      pricingSection: parsePricingSection(data.pricingSection),
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
    tour_highlights: TOUR_HIGHLIGHTS_DEFAULT,
    transport: '',
    pickup_location: '',
    drop_location: '',
    numAdults: '',
    numChild5to12: '',
    numChild0to5: '',
    totalPrice: TOTAL_PRICE_DEFAULT,
    assignedTo: '',
    assignedToMobileNumber: '',
    assignedToEmail: '',
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
    /* itineraries: [{
      days: '',
      activities: [],
      mealsIncluded: [],
      hotelId: '',
    }],
     */
    locationId: '',
    //location : '',
    // hotelId: '',
    isFeatured: true,
    isArchived: false,
    pricingSection: DEFAULT_PRICING_SECTION, // Update this line to use the default pricing section
  };

  const form = useForm<TourPackageFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues
  });

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

  const onSubmit = async (data: TourPackageFormValues) => {

    // console.log("Data Being Submitted is : ", data)
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
      }))
    };



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
      router.refresh();
      router.push(`/tourPackages`);
      toast.success(toastMessage);
    } catch (error: any) {
      console.error('Error:', error.response ? error.response.data : error.message);  // Updated line
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                                      }                                      if (useLocationDefaults.termsconditions) {
                                        form.setValue('termsconditions', parseJsonField(location.termsconditions) || TERMS_AND_CONDITIONS_DEFAULT);
                                      }                                      if (useLocationDefaults.kitchenGroupPolicy) {
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
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ListPlus className="h-5 w-5" />
                    Itinerary Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="itineraries"
                    render={({ field: { value = [], onChange } }) => (
                      <FormItem>
                        <div className="space-y-4">
                          {/* Move existing itinerary form fields here */}
                          {value.map((itinerary, index) => (
                            <Accordion key={index} type="single" collapsible className="w-full border rounded-lg">
                              <AccordionItem value={`item-${index}`}>
                                <AccordionTrigger>
                                  <div className="font-bold mb-2" dangerouslySetInnerHTML={{
                                    __html: `Day ${index + 1}: ${itinerary.itineraryTitle || ''}`,
                                  }}></div>
                                </AccordionTrigger>
                                <AccordionContent>
                                  <div className="md:grid md:grid-cols-2 gap-8">
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <FormControl>
                                          <Button
                                            variant="outline"
                                            role="combobox"
                                            className={cn(
                                              "w-[200px] justify-between",
                                              !itinerary.itineraryTitle && "text-muted-foreground"
                                            )}
                                            disabled={loading}
                                          >
                                            {itinerary.itineraryTitle
                                              ? (itinerariesMaster && itinerariesMaster.find(
                                                (itineraryMaster) => itineraryMaster.itineraryMasterTitle === itinerary.itineraryTitle
                                              )?.itineraryMasterTitle)
                                              : "Select an Itinerary Master"}
                                            <ChevronUp className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                          </Button>
                                        </FormControl>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-[200px] p-0 max-h-[10rem] overflow-auto">
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
                                                key={itineraryMaster.id}
                                                onSelect={() => {
                                                  const updatedItineraries = [...value];
                                                  updatedItineraries[index] = {
                                                    ...updatedItineraries[index],
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

                                    <FormItem>
                                      <FormLabel>Day {index + 1}</FormLabel>
                                      <FormControl>
                                        <Input
                                          disabled={loading}
                                          type="number"
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

                                          value={itinerary.days}
                                          onChange={(e) => {
                                            const newItineraries = [...value];
                                            newItineraries[index] = { ...itinerary, days: e.target.value };
                                            onChange(newItineraries);
                                          }}
                                        />
                                      </FormControl>
                                    </FormItem>

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

                                    <FormItem className="flex flex-col">
                                      <FormLabel>Hotel</FormLabel>
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <FormControl>
                                            <Button
                                              variant="outline"
                                              role="combobox"
                                              className={cn(
                                                "w-[200px] justify-between",
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
                                              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />                            </Button>
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

                                    <FormItem>
                                      <FormLabel>Room Category</FormLabel>
                                      <FormControl>
                                        <Input
                                          placeholder="Room Category"
                                          disabled={loading}

                                          value={itinerary.roomCategory}
                                          onChange={(e) => {
                                            const newItineraries = [...value];
                                            newItineraries[index] = { ...itinerary, roomCategory: e.target.value };
                                            onChange(newItineraries);
                                          }}
                                        />
                                      </FormControl>
                                    </FormItem>


                                    <FormItem className="flex flex-col items-start space-y-3 rounded-md border p-4">
                                      <FormLabel>Meal Plan</FormLabel>
                                      <FormControl>
                                        <div className="flex flex-col gap-2">
                                          <label className="flex items-center gap-2">
                                            <Checkbox
                                              checked={itinerary.mealsIncluded?.includes('Breakfast')}
                                              onCheckedChange={(isChecked) =>
                                                handleMealChange('Breakfast', !!isChecked, index)
                                              }
                                            />
                                            Breakfast
                                          </label>
                                          <label className="flex items-center gap-2">
                                            <Checkbox
                                              checked={itinerary.mealsIncluded?.includes('Lunch')}
                                              onCheckedChange={(isChecked) =>
                                                handleMealChange('Lunch', !!isChecked, index)
                                              }
                                            />
                                            Lunch
                                          </label>
                                          <label className="flex items-center gap-2">
                                            <Checkbox
                                              checked={itinerary.mealsIncluded?.includes('Dinner')}
                                              onCheckedChange={(isChecked) =>
                                                handleMealChange('Dinner', !!isChecked, index)
                                              }
                                            />
                                            Dinner
                                          </label>
                                        </div>
                                      </FormControl>
                                    </FormItem>



                                    {itinerary.activities.map((activity, activityIndex) => (
                                      <div key={activityIndex} className="space-y-2">
                                        <Select
                                          disabled={loading}
                                          onValueChange={(selectedActivityId) =>
                                            handleActivitySelection(selectedActivityId, index, activityIndex)
                                          }
                                        >
                                          <FormControl>
                                            <SelectTrigger>
                                              <SelectValue placeholder="Select an Activity" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            {activitiesMaster?.map((activityMaster: { id: string; activityMasterTitle: string | number | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | null | undefined }) => (
                                              <SelectItem key={activityMaster.id}
                                                value={activityMaster.id}>
                                                {activityMaster.activityMasterTitle}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
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


                                        <Button
                                          type="button"
                                          variant="destructive"
                                          size="sm"
                                          onClick={() => {
                                            const newItineraries = [...value];
                                            newItineraries[index].activities = newItineraries[index].activities.filter((_, idx: number) => idx !== activityIndex);
                                            onChange(newItineraries);
                                          }}
                                        >
                                          Remove Activity
                                        </Button>
                                      </div>
                                    ))}
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => {
                                        const newItineraries = [...value];
                                        newItineraries[index].activities = [...newItineraries[index].activities, { activityImages: [], activityTitle: '', activityDescription: '' }];
                                        onChange(newItineraries);
                                      }}
                                    >
                                      Add Activity
                                    </Button>



                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => {
                                        const newItineraries = value.filter((_, i: number) => i !== index);
                                        onChange(newItineraries);
                                      }}
                                    >
                                      Remove Itinerary for Day {index + 1}

                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleSaveToMasterItinerary(itinerary)}
                                    >
                                      <Plus className="h-4 w-4 mr-2" />
                                      Save to Master Itinerary
                                    </Button>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          ))}
                          <Button
                            type="button"
                            size="sm"
                            className="mt-4"
                            onClick={() => onChange([...value, {
                              dayNumber: 0,
                              days: '',
                              itineraryImages: [],
                              itineraryTitle: '',
                              itineraryDescription: '',
                              activities: [],
                              mealsIncluded: [],
                              hotelId: '',
                              numberofRooms: '',
                              roomCategory: '',
                              locationId: form.getValues('locationId') || ''
                            }])}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add New Day
                          </Button>
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

                  <FormField
                    control={form.control}
                    name="totalPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Price</FormLabel>
                        <FormControl>
                          <Input disabled={loading} placeholder="Total Price" {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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

          </Tabs>

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
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
                {action}
              </Button>
            )}
          </div>
        </form>
      </Form>

      {process.env.NODE_ENV !== 'production' && <DevTool control={form.control} />}

    </>
  )
}
