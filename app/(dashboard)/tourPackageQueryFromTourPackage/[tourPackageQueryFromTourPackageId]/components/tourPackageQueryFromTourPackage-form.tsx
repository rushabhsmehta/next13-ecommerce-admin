"use client"

import * as z from "zod"
import axios from "axios"
import { JSXElementConstructor, Key, PromiseLikeOfReactNode, ReactElement, ReactNode, ReactPortal, useRef, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "react-hot-toast"
import { CalendarIcon, CheckIcon, ChevronDown, ChevronUp, Trash } from "lucide-react"
import { Activity, Images, ItineraryMaster, TourPackage } from "@prisma/client"
import { Location, Hotel, TourPackageQuery, Itinerary, FlightDetails, ActivityMaster } from "@prisma/client"
import { useParams, useRouter } from "next/navigation"
import { format } from "date-fns"
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
import { Textarea } from "@/components/ui/textarea"
import { ARILINE_CANCELLATION_POLICY_DEFAULT, CANCELLATION_POLICY_DEFAULT, EXCLUSIONS_DEFAULT, IMPORTANT_NOTES_DEFAULT, INCLUSIONS_DEFAULT, PAYMENT_TERMS_DEFAULT, TERMS_AND_CONDITIONS_DEFAULT, DISCLAIMER_DEFAULT, TOUR_PACKAGE_QUERY_TYPE_DEFAULT, USEFUL_TIPS_DEFAULT } from "./defaultValues"
import JoditEditor from "jodit-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { DatePickerWithRange } from "@/components/DatePickerWithRange"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PRICE_DEFAULT } from "@/app/(dashboard)/tourPackageQuery/[tourPackageQueryId]/components/defaultValues"

const editorConfig = {
  readonly: false,
  contentStyle: `
    table {
      border: 1px solid black;
      border-collapse: collapse;
    }
    table td, table th {
      border: 1px solid black;
      padding: 5px;
    }
  `,
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
  dayNumber: z.number().optional(),
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

}); // Assuming an array of flight details

const formSchema = z.object({
  tourPackageQueryNumber: z.string().optional(),
  tourPackageQueryName: z.string().min(1),
  tourPackageQueryType: z.string().optional(),
  customerName: z.string().optional(),
  customerNumber: z.string().optional(),
  numDaysNight: z.string().optional(),
  period: z.string().optional(),
  tour_highlights: z.string().optional(),
  tourStartsFrom: z.date().optional(),
  tourEndsOn: z.date().optional(),
  transport: z.string().optional(),
  pickup_location: z.string().optional(),
  drop_location: z.string().optional(),
  numAdults: z.string().optional(),
  numChild5to12: z.string().optional(),
  numChild0to5: z.string().optional(),
  price: z.string().optional(),
  pricePerAdult: z.string().optional(),
  pricePerChildOrExtraBed: z.string().optional(),
  pricePerChild5to12YearsNoBed: z.string().optional(),
  pricePerChildwithSeatBelow5Years: z.string().optional(),
  totalPrice: z.string().optional(),
  remarks: z.string().optional(),
  locationId: z.string().min(1),
  //location : z.string(),
  // hotelId: z.string().min(1),
  flightDetails: flightDetailsSchema.array(),
  //  hotelDetails: z.string(),
  inclusions: z.string(),
  exclusions: z.string(),
  importantNotes: z.string(),
  paymentPolicy: z.string(),
  usefulTip: z.string(),
  cancellationPolicy: z.string(),
  airlineCancellationPolicy: z.string(),
  termsconditions: z.string(),
  disclaimer: z.string().optional(),
  images: z.object({ url: z.string() }).array(),
  itineraries: z.array(itinerarySchema),
  isFeatured: z.boolean().default(false).optional(),
  isArchived: z.boolean().default(false).optional(),
  assignedTo: z.string().optional(),
  assignedToMobileNumber: z.string().optional(),
  assignedToEmail: z.string().optional(),
  purchaseDetails: z.string().optional(),
  saleDetails: z.string().optional(),
  paymentDetails: z.string().optional(),
  receiptDetails: z.string().optional(),
  expenseDetails: z.string().optional(),
});


type TourPackageQueryFromTourPackageFormValues = z.infer<typeof formSchema>

interface TourPackageQueryFromTourPackageFormProps {
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
};

export const TourPackageQueryFromTourPackageForm: React.FC<TourPackageQueryFromTourPackageFormProps> = ({
  initialData,
  locations,
  hotels,
  activitiesMaster,
  itinerariesMaster,

}) => {
  const params = useParams();
  const router = useRouter();

  //const defaultItinerary = { days: '1', activities: '', places: '', mealsIncluded: false };

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [flightDetails, setFlightDetails] = useState([]);
  const editor = useRef(null)

  //console.log(initialData);
  const title = 'Create Tour Package Query';
  const description = 'Add a new Tour Package Query';
  const toastMessage = 'Tour Package Query created.';
  const action = 'Create';
  // console.log("Initial Data : ", initialData?.itineraries)

  const transformInitialData = (data: any) => {
    return {
      ...data,
      tourPackageQueryType: data.tourPackageType ?? '', // Fallback to empty string if null
      assignedTo: data.assignedTo ?? '', // Fallback to empty string if null
      assignedToMobileNumber: data.assignedToMobileNumber ?? '',
      assignedToEmail: data.assignedToEmail ?? '',
      purchaseDetails: data.purchaseDetails ?? '',
      saleDetails: data.saleDetails ?? '',
      paymentDetails: data.paymentDetails ?? '',
      receiptDetails: data.receiptDetails ?? '',
      expenseDetails: data.expenseDetails ?? '',

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
      }))
    };
  };

  const getCurrentDateTimeString = () => {
    const now = new Date();
    return now.toISOString().replace(/[-:T.]/g, '').slice(0, 14); // Format: YYYYMMDDHHMMSS
  };

  const defaultValues = initialData ? transformInitialData(initialData) : {

    tourPackageQueryNumber: getCurrentDateTimeString(), // Set the current date and time
    tourPackageQueryName: '',
    tourPackageQueryType: '',
    customerName: '',
    customerNumber: '',
    numDaysNight: '',
    period: '',
    tour_highlights: '',
    tourStartsFrom: '',
    tourEndsOn: '',
    transport: '',
    pickup_location: '',
    drop_location: '',
    numAdults: '',
    numChild5to12: '',
    numChild0to5: '',
    price: PRICE_DEFAULT,
    pricePerAdult: '',
    pricePerChildOrExtraBed: '',
    pricePerChild5to12YearsNoBed: '',
    pricePerChildwithSeatBelow5Years: '',
    totalPrice: '',
    remarks: '',
    assignedTo: '',
    assignedToMobileNumber: '',
    assignedToEmail: '',

    purchaseDetails: '',
    saleDetails: '',
    paymentDetails: '',
    receiptDetails: '',
    expenseDetails: '',

    flightDetails: [],
    // hotelDetails: '',
    inclusions: INCLUSIONS_DEFAULT.replace(/\n/g, '<br>'),
    exclusions: EXCLUSIONS_DEFAULT.replace(/\n/g, '<br>'),
    importantNotes: IMPORTANT_NOTES_DEFAULT.replace(/\n/g, '<br>'),
    paymentPolicy: PAYMENT_TERMS_DEFAULT.replace(/\n/g, '<br>'),
    usefulTip: USEFUL_TIPS_DEFAULT.replace(/\n/g, '<br>'),
    cancellationPolicy: CANCELLATION_POLICY_DEFAULT.replace(/\n/g, '<br>'),
    airlineCancellationPolicy: ARILINE_CANCELLATION_POLICY_DEFAULT.replace(/\n/g, '<br>'),
    termsconditions: TERMS_AND_CONDITIONS_DEFAULT.replace(/\n/g, '<br>'),
    disclaimer: DISCLAIMER_DEFAULT.replace(/\n/g, '<br>'),

    images: [],
    itineraries: [],
    locationId: '',
    isFeatured: false,
    isArchived: false,
  };

  const form = useForm<TourPackageQueryFromTourPackageFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues
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
      // Remove the meal type if unchecked
      currentMeals = currentMeals.filter((meal) => meal !== mealType);
    }

    updatedItineraries[itineraryIndex].mealsIncluded = currentMeals;
    form.setValue('itineraries', updatedItineraries);
  };

  const onSubmit = async (data: TourPackageQueryFromTourPackageFormValues) => {

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
      await axios.post(`/api/tourPackageQuery`, formattedData);
      router.refresh();
      router.push(`/tourPackageQuery`);
      toast.success(toastMessage);
    } catch (error: any) {
      console.error('Error:', error.response ? error.response.data : error.message);  // Updated line
      toast.error('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };



  const handleActivitySelection = (selectedActivityId: string, itineraryIndex: number, activityIndex: number) => {
    const selectedActivityMaster = (activitiesMaster as ActivityMaster[]).find(activity => activity.id === selectedActivityId);

    if (selectedActivityMaster) {
      const updatedItineraries = [...form.getValues('itineraries')];
      updatedItineraries[itineraryIndex].activities[activityIndex] = {
        ...updatedItineraries[itineraryIndex].activities[activityIndex],

        activityTitle: selectedActivityMaster.activityMasterTitle || '',
        activityDescription: selectedActivityMaster.activityMasterDescription || '',
        // activityImages: selectedActivityMaster.activityMasterImages.map((image: { url: any }) => ({ url: image.url }))
      };
      form.setValue('itineraries', updatedItineraries);
    }
  };


  // Function to handle meal checkbox changes



  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
          <div className="grid grid-cols-3 gap-8">
            <FormField
              control={form.control}
              name="assignedTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned To</FormLabel>
                  <FormControl>
                    <Input
                      disabled={loading}
                      placeholder="Assigned To"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="assignedToMobileNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile Number (Assigned To)</FormLabel>
                  <FormControl>
                    <Input
                      disabled={loading}
                      placeholder="Mobile Number (Assigned To)"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="assignedToEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email ID (Assinged To)</FormLabel>
                  <FormControl>
                    <Input
                      disabled={loading}
                      placeholder="Email ID"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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

          <div className="grid grid-cols-4 gap-8">

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
                  <FormLabel>Tour Package Query Name</FormLabel>
                  <FormControl>
                    <Input
                      disabled={loading}
                      placeholder="Tour Package Query Name"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tourPackageQueryType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tour Package Query Type</FormLabel>
                  <Select disabled={loading} onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue defaultValue={field.value} placeholder="Select a Tour Package Query Type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TOUR_PACKAGE_QUERY_TYPE_DEFAULT.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
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
                    <Input
                      disabled={loading}
                      placeholder="Tour Package Query Type"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />


            {/* //add formfield for customerName */}
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
          </div>
          <div className="grid grid-cols-4 gap-8">

            <FormField
              control={form.control}
              name="locationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <Select disabled={loading} onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue defaultValue={field.value} placeholder="Select a Location" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>{location.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* //add formfield for numDaysNight */}
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

            {/* // add formfield for period */}

            {/*  <FormField
              control={form.control}
              name="period"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Period</FormLabel>
                  <FormControl>
                    <Input disabled={loading} placeholder="Period" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            /> */}

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
                        onSelect={field.onChange}

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
                        onSelect={field.onChange}

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
              name="period"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Period</FormLabel>
                  <FormControl>
                    <DatePickerWithRange control={form.control} name="period" />
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

            {/* //add formfield for numAdults */}
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
          </div>
          <div className="grid grid-cols-3 gap-8">

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


            <FormField
              control={form.control}
              name="price" // Ensure the name is lowercase with no spaces
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pricing Table</FormLabel>
                  <FormControl>
                    <JoditEditor // Replace Textarea with JoditEditor
                      ref={editor} // Optional ref for programmatic access
                      value={field.value || PRICE_DEFAULT} // Set initial content from form field value
                      config={{ // Configure Jodit options
                        readonly: loading, // Disable editing if loading                
                      }} // Type assertion (optional)
                      onBlur={(newContent) => field.onChange(newContent)} // Update form field on blur
                    />
                  </FormControl>
                </FormItem>
              )}
            />


            {/*     <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price</FormLabel>
                  <FormControl>
                    <Textarea rows={5} disabled={loading} placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
 */}
            <FormField
              control={form.control}
              name="pricePerAdult"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price Per Adult</FormLabel>
                  <FormControl>
                    <Input disabled={loading} placeholder="Price per Adult" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pricePerChildOrExtraBed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price Per Child/Extra Bed</FormLabel>
                  <FormControl>
                    <Input disabled={loading} placeholder="Price per Child or Extra Bed" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

          </div>
          <div className="grid grid-cols-3 gap-8">

            <FormField
              control={form.control}
              name="pricePerChild5to12YearsNoBed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price Per Child (5 to 12 Years - No Bed)</FormLabel>
                  <FormControl>
                    <Input disabled={loading} placeholder="Price per Child 5 to 12 Years - No Bed" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pricePerChildwithSeatBelow5Years"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price Per Child with Seat (Below 5 Years)</FormLabel>
                  <FormControl>
                    <Input disabled={loading} placeholder="Price per Child with Seat - Below 5 years" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="totalPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Price</FormLabel>
                  <FormControl>
                    <Input disabled={loading} placeholder="Total Price" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="disclaimer" // Ensure the name is lowercase with no spaces
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Disclaimer</FormLabel>
                  <FormControl>
                    <JoditEditor // Replace Textarea with JoditEditor
                      ref={editor} // Optional ref for programmatic access
                      value={field.value || ''} // Set initial content from form field value
                      config={{ // Configure Jodit options
                        readonly: loading, // Disable editing if loading                
                      }} // Type assertion (optional)
                      onBlur={(newContent) => field.onChange(newContent)} // Update form field on blur
                    />
                  </FormControl>
                </FormItem>
              )}
            />


            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks</FormLabel>
                  <FormControl>

                    <JoditEditor // Replace Textarea with JoditEditor
                      ref={editor} // Optional ref for programmatic access
                      value={field.value || ''} // Set initial content from form field value
                      config={{ // Configure Jodit options (optional)
                        readonly: loading, // Disable editing if loading                       
                      }}
                      onBlur={(newContent) => field.onChange(newContent)} // Update form field on blur
                    />


                    {/* <Textarea rows={5} disabled={loading} placeholder="" {...field} /> */}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

          </div>

          <FormField
            control={form.control}
            name="tour_highlights"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tour Highlights</FormLabel>
                <FormControl>
                  <JoditEditor // Replace Textarea with JoditEditor
                    ref={editor} // Optional ref for programmatic access
                    config={editorConfig}
                    value={field.value || ''} // Set initial content from form field value

                    /*  config={{ // Configure Jodit options (optional)
                       readonly: loading, // Disable editing if loading                       
                     }} */
                    onBlur={(newContent) => field.onChange(newContent)} // Update form field on blur
                  />

                </FormControl>
              </FormItem>
            )}
          />


          {/* //add formfield for flightDetails */}
          <div>
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
                              const newFlightDetails = value.filter((_, i) => i != index);
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
          </div>

          <FormField
            control={form.control}
            name="itineraries"
            render={({ field: { value = [], onChange } }) => (
              <FormItem className="flex flex-col items-start space-y-3 rounded-md border p-4">
                <FormLabel>Create Itineraries</FormLabel>


                {value.map((itinerary, index) => (
                  <><Accordion key={index} type="single" collapsible className="w-full">
                    <AccordionItem value="item-${index}">
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
                                    {hotels.filter(hotel => hotel.locationId === itinerary.locationId).map((hotel) => (
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
                            <FormLabel>Number of Rooms</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Number of Rooms"
                                disabled={loading}

                                value={itinerary.numberofRooms}
                                onChange={(e) => {
                                  const newItineraries = [...value];
                                  newItineraries[index] = { ...itinerary, numberofRooms: e.target.value };
                                  onChange(newItineraries);
                                }}
                              />
                            </FormControl>
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
                                  {activitiesMaster?.map((activityMaster: { id: string; activityMasterTitle: string | number | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | PromiseLikeOfReactNode | null | undefined }) => (
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
                                  newItineraries[index].activities = newItineraries[index].activities.filter((_, idx) => idx !== activityIndex);
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
                              const newItineraries = value.filter((_, i) => i !== index);
                              onChange(newItineraries);
                            }}
                          >
                            Remove Itinerary for Day {index + 1}

                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion >
                  </>
                ))}
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onChange([...value, {
                    dayNumber: 0, days: '', itineraryImages: [], itineraryTitle: '', itineraryDescription: '', activities: [], mealsIncluded: [], hotelId: '', numberofRooms: '', roomCategory: '', locationId: ''
                  }])}
                >
                  Add Itinerary
                </Button>


              </FormItem>
            )}
          />

          <div className="md:grid md:grid-cols-2 gap-8">
            {/* //add formfield for hotelDetails */}


            {/* //add formfield for inclusions */}
            <FormField
              control={form.control}
              name="inclusions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Inclusions</FormLabel>
                  <FormControl>
                    <JoditEditor // Replace Textarea with JoditEditor
                      ref={editor} // Optional ref for programmatic access
                      value={field.value} // Set initial content from form field value
                      config={{ // Configure Jodit options (optional)
                        readonly: loading, // Disable editing if loading                       
                      }}
                      onBlur={(newContent) => field.onChange(newContent)} // Update form field on blur
                    />

                  </FormControl>
                </FormItem>
              )}
            />

            {/* //add formfield for exclusions */}
            <FormField
              control={form.control}
              name="exclusions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Exclusions</FormLabel>
                  <FormControl>
                    <JoditEditor // Replace Textarea with JoditEditor
                      ref={editor} // Optional ref for programmatic access
                      value={field.value} // Set initial content from form field value
                      config={{ // Configure Jodit options
                        readonly: loading, // Disable editing if loading                        
                      }} // Type assertion (optional)
                      onBlur={(newContent) => field.onChange(newContent)} // Update form field on blur
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="importantNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Important Notes</FormLabel>
                  <FormControl>
                    <JoditEditor // Replace Textarea with JoditEditor
                      ref={editor} // Optional ref for programmatic access
                      value={field.value || ''} // Set initial content from form field value
                      config={{ // Configure Jodit options
                        readonly: loading, // Disable editing if loading                
                      }} // Type assertion (optional)
                      onBlur={(newContent) => field.onChange(newContent)} // Update form field on blur
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentPolicy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Policy</FormLabel>
                  <FormControl>
                    <JoditEditor // Replace Textarea with JoditEditor
                      ref={editor} // Optional ref for programmatic access
                      value={field.value} // Set initial content from form field value
                      config={{ // Configure Jodit options
                        readonly: loading, // Disable editing if loading                
                      }} // Type assertion (optional)
                      onBlur={(newContent) => field.onChange(newContent)} // Update form field on blur
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* //add formfield for usefulTip */}
            <FormField
              control={form.control}
              name="usefulTip"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Useful Tip</FormLabel>
                  <FormControl>
                    <JoditEditor // Replace Textarea with JoditEditor
                      ref={editor} // Optional ref for programmatic access
                      value={field.value} // Set initial content from form field value
                      config={{ // Configure Jodit options
                        readonly: loading, // Disable editing if loading                
                      }} // Type assertion (optional)
                      onBlur={(newContent) => field.onChange(newContent)} // Update form field on blur
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cancellationPolicy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cancellation Policy</FormLabel>
                  <FormControl>
                    <JoditEditor // Replace Textarea with JoditEditor
                      ref={editor} // Optional ref for programmatic access
                      value={field.value} // Set initial content from form field value
                      config={{ // Configure Jodit options
                        readonly: loading, // Disable editing if loading

                      }} // Type assertion (optional)
                      onBlur={(newContent) => field.onChange(newContent)} // Update form field on blur
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* //add formfield for airlineCancellationPolicy */}

            <FormField
              control={form.control}
              name="airlineCancellationPolicy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Airline Cancellation Policy</FormLabel>
                  <FormControl>
                    <JoditEditor // Replace Textarea with JoditEditor
                      ref={editor} // Optional ref for programmatic access
                      value={field.value} // Set initial content from form field value
                      config={{ // Configure Jodit options
                        readonly: loading, // Disable editing if loading                      
                      }} // Type assertion (optional)
                      onBlur={(newContent) => field.onChange(newContent)} // Update form field on blur
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            {/* //add formfield for termsconditions */}
            <FormField
              control={form.control}
              name="termsconditions" // Ensure the name is lowercase with no spaces
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Terms and Conditions</FormLabel>
                  <FormControl>
                    <JoditEditor // Replace Textarea with JoditEditor
                      ref={editor} // Optional ref for programmatic access
                      value={field.value} // Set initial content from form field value
                      config={{ // Configure Jodit options
                        readonly: loading, // Disable editing if loading                
                      }} // Type assertion (optional)
                      onBlur={(newContent) => field.onChange(newContent)} // Update form field on blur
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <Tabs hidden defaultValue="purchaseDetails">
            <TabsList>
              <TabsTrigger value="purchaseDetails">Purchase</TabsTrigger>
              <TabsTrigger value="saleDetails">Sale</TabsTrigger>
              <TabsTrigger value="paymentDetails">Payment</TabsTrigger>
              <TabsTrigger value="receiptDetails">Receipt</TabsTrigger>
              <TabsTrigger value="expenseDetails">Expense</TabsTrigger>
            </TabsList>
            <TabsContent value="purchaseDetails">
              <FormField
                control={form.control}
                name="purchaseDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Details</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={5}
                        disabled={loading}
                        placeholder="Purchase Details"
                        value={field.value || ''}
                        onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>
            <TabsContent value="saleDetails">
              <FormField
                control={form.control}
                name="saleDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sales Details</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={5}
                        disabled={loading}
                        placeholder="Sales Details"
                        value={field.value || ''}
                        onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>
            <TabsContent value="paymentDetails">
              <FormField
                control={form.control}
                name="paymentDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Details</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={5}
                        disabled={loading}
                        placeholder="Payment Details"
                        value={field.value || ''}
                        onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>
            <TabsContent value="receiptDetails">
              <FormField
                control={form.control}
                name="receiptDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Receipt Details</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={5}
                        disabled={loading}
                        placeholder="Receipt Details"
                        value={field.value || ''}
                        onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>
            <TabsContent value="expenseDetails">
              <FormField
                control={form.control}
                name="expenseDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expense Details</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={5}
                        disabled={loading}
                        placeholder="Expense Details"
                        value={field.value || ''}
                        onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>
          </Tabs>
          <Button disabled={loading} className="ml-auto" type="submit">
            {action}
          </Button>

        </form >
      </Form >

    </>
  )
} 
