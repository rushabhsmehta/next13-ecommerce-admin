"use client"

import * as z from "zod"
import axios from "axios"
import { JSXElementConstructor, Key, PromiseLikeOfReactNode, ReactElement, ReactNode, ReactPortal, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "react-hot-toast"
import { Trash } from "lucide-react"
import { Images } from "@prisma/client"
import { Location, Hotel, TourPackageQuery, Itinerary, FlightDetails, ActivityMaster } from "@prisma/client"
import { useParams, useRouter } from "next/navigation"

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
import { ARILINE_CANCELLATION_POLICY_DEFAULT, CANCELLATION_POLICY_DEFAULT, EXCLUSIONS_DEFAULT, IMPORTANT_NOTES_DEFAULT, INCLUSIONS_DEFAULT, PAYMENT_TERMS_DEFAULT, USEFUL_TIPS_DEFAULT } from "./defaultValues"


const activitySchema = z.object({
  activityTitle: z.string(),
  activityDescription: z.string(),
  activityImages: z.object({ url: z.string() }).array(),
});

const itinerarySchema = z.object({
  itineraryImages: z.object({ url: z.string() }).array(),
  itineraryTitle: z.string(),
  itineraryDescription: z.string(),
  dayNumber: z.number(),
  days: z.string(),
  activities: z.array(activitySchema),
  mealsIncluded: z.array(z.string()).optional(),
  hotelId: z.string(), // Array of hotel IDs
  roomCategory: z.string(),
  locationId: z.string(), // Array of hotel IDs

  // hotel : z.string(),
});


const flightDetailsSchema = z.object({

  date: z.string(),
  flightName: z.string(),
  flightNumber: z.string(),
  from: z.string(),
  to: z.string(),
  departureTime: z.string(),
  arrivalTime: z.string(),
  flightDuration: z.string(),

}); // Assuming an array of flight details

const formSchema = z.object({
  tourPackageQueryName: z.string().min(1),
  customerName: z.string().min(1),
  numDaysNight: z.string().min(1),
  period: z.string().optional(),
  transport: z.string().optional(),
  numAdults: z.string().optional(),
  numChild5to12: z.string().optional(),
  numChild0to5: z.string().optional(),
  //price: z.string().optional(),
  pricePerAdult: z.string().optional(),
  pricePerChildOrExtraBed: z.string().optional(),
  pricePerChild5to12YearsNoBed: z.string().optional(),
  pricePerChildwithSeatBelow5Years: z.string().optional(),
  totalPrice: z.string().optional(),
  locationId: z.string().min(1),
  //location : z.string(),
  // hotelId: z.string().min(1),
  flightDetails: flightDetailsSchema.array(),
  //  hotelDetails: z.string(),
  inclusions: z.string(),
  exclusions: z.string(),
  paymentPolicy: z.string(),
  usefulTip: z.string(),
  cancellationPolicy: z.string(),
  airlineCancellationPolicy: z.string(),
  termsconditions: z.string(),
  images: z.object({ url: z.string() }).array(),
  itineraries: z.array(itinerarySchema),
  isFeatured: z.boolean().default(false).optional(),
  isArchived: z.boolean().default(false).optional(),
  assignedTo: z.string().optional(),
  assignedToMobileNumber: z.string().optional(),
  assignedToEmail: z.string().optional(),
});

type TourPackageQueryCreateCopyFormValues = z.infer<typeof formSchema>

interface TourPackageQueryCreateCopyFormProps {
  initialData: TourPackageQuery & {
    images: Images[];
    itineraries: Itinerary[];
    flightDetails: FlightDetails[];
  } | null;
  locations: Location[];
  hotels: Hotel[];
  activitiesMaster: ActivityMaster[];
  //  itineraries: Itinerary[];
};

export const TourPackageQueryCreateCopyForm: React.FC<TourPackageQueryCreateCopyFormProps> = ({
  initialData,
  locations,
  hotels,
  activitiesMaster,
}) => {
  const params = useParams();
  const router = useRouter();

  //const defaultItinerary = { days: '1', activities: '', places: '', mealsIncluded: false };

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [flightDetails, setFlightDetails] = useState([]);

  //console.log(initialData);
  const title = 'Create Tour Package Query';
  const description = 'Add a new Tour Package Query';
  const toastMessage = 'Tour Package Query created.';
  const action = 'Create';
  // console.log("Initial Data : ", initialData?.itineraries)

  const transformInitialData = (data: any) => {
    return {
      ...data,
      assignedTo: data.assignedTo ?? '', // Fallback to empty string if null
      assignedToMobileNumber: data.assignedToMobileNumber ?? '',
      assignedToEmail: data.assignedToEmail ?? '',
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

        storeId: params.storeId,
        dayNumber: itinerary.dayNumber ?? 0,
        days: itinerary.days ?? '',
        itineraryImages: itinerary.itineraryImages.map((image: { url: any }) => ({ url: image.url })), // Transform to { url: string }[]        
        itineraryTitle: itinerary.itineraryTitle ?? '',
        itineraryDescription: itinerary.itineraryDescription ?? '',
        hotelId: itinerary.hotelId ?? '',
        roomCategory: itinerary.roomCategory ?? '',
        locationId: itinerary.locationId ?? '',
        //hotel : hotels.find(hotel => hotel.id === hotelId)?.name ?? '',
        mealsIncluded: itinerary.mealsIncluded ? itinerary.mealsIncluded.split('-') : [],
        activities: itinerary.activities?.map((activity: any) => ({
          storeId: params.storeId,
          locationId: activity.locationId ?? '',
          activityImages: activity.activityImages.map((image: { url: any }) => ({ url: image.url })), // Transform to { url: string }[]        
          activityTitle: activity.activityTitle ?? '',
          activityDescription: activity.activityDescription ?? '',
        }))
      }))
    };
  };
  const defaultValues = initialData ? transformInitialData(initialData) : {

    tourPackageQueryName: '',
    customerName: '',
    numDaysNight: '',
    period: '',
    transport: '',
    numAdults: '',
    numChild5to12: '',
    numChild0to5: '',
    price: '',
    pricePerAdult: '',
    pricePerChildOrExtraBed: '',
    pricePerChild5to12YearsNoBed: '',
    pricePerChildwithSeatBelow5Years: '',
    totalPrice: '',
    assignedTo: '',
    assignedToMobileNumber: '',
    assignedToEmail: '',
    flightDetails: [],
    // hotelDetails: '',
    inclusions: INCLUSIONS_DEFAULT,
    exclusions: EXCLUSIONS_DEFAULT,
    paymentPolicy: PAYMENT_TERMS_DEFAULT,
    usefulTip: USEFUL_TIPS_DEFAULT,
    cancellationPolicy: CANCELLATION_POLICY_DEFAULT,
    airlineCancellationPolicy: ARILINE_CANCELLATION_POLICY_DEFAULT,
    termsconditions: IMPORTANT_NOTES_DEFAULT,
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
  };

  const form = useForm<TourPackageQueryCreateCopyFormValues>({
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

  const onSubmit = async (data: TourPackageQueryCreateCopyFormValues) => {

    const formattedData = {
      ...data,
      itineraries: data.itineraries.map(itinerary => ({
        ...itinerary,
        storeId: params.storeId,
        locationId: data.locationId,
        mealsIncluded: itinerary.mealsIncluded && itinerary.mealsIncluded.length > 0 ? itinerary.mealsIncluded.join('-') : '',
        activities: itinerary.activities?.map((activity) => ({
          ...activity,
          // activityTitle : activity.activityTitle,
          // activityDescription : activity.activityDescription,
          storeId: params.storeId,
          locationId: data.locationId,

          //      activityImages: activity.activityImages.map(img => img.url) // Extract URLs from activityImages  
        }))
      }))
    };



    try {
      setLoading(true);
      await axios.post(`/api/${params.storeId}/tourPackageQuery`, formattedData);
      router.refresh();
      router.push(`/${params.storeId}/tourPackageQuery`);
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
          <div className="md:grid md:grid-cols-4 gap-8">

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
          <div className="md:grid md:grid-cols-4 gap-8">

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
          </div>

          {/* // add formfield for period */}
          <div className="md:grid md:grid-cols-5 gap-8">

            <FormField
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
            />

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
                    <Input disabled={loading} placeholder="" {...field} />
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
                    <Input disabled={loading} placeholder="" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pricePerChild5to12YearsNoBed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price Per Child (5 to 12 Years - No Bed)</FormLabel>
                  <FormControl>
                    <Input disabled={loading} placeholder="" {...field} />
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
                    <Input disabled={loading} placeholder="" {...field} />
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
                    <Input disabled={loading} placeholder="" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>



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

                      <div key={index} className="md:grid md:grid-cols-6 gap-8">
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
                  <div key={index} className="md:grid md:grid-cols-3 gap-8">
                    <FormItem>
                      <FormLabel>Day {index + 1}</FormLabel>
                      <FormControl>
                        <Input
                          disabled={loading}
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
                        <Textarea rows={3}
                          placeholder="Title"
                          disabled={loading}

                          value={itinerary.itineraryTitle}
                          onChange={(e) => {
                            const newItineraries = [...value];
                            newItineraries[index] = { ...itinerary, itineraryTitle: e.target.value };
                            onChange(newItineraries);
                          }}
                        />
                      </FormControl>
                    </FormItem>

                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea rows={10}
                          placeholder="Description"
                          disabled={loading}

                          value={itinerary.itineraryDescription}
                          onChange={(e) => {
                            const newItineraries = [...value];
                            newItineraries[index] = { ...itinerary, itineraryDescription: e.target.value };
                            onChange(newItineraries);
                          }}
                        />
                      </FormControl>
                    </FormItem>

                    <FormItem>
                      <FormLabel>Hotel</FormLabel>
                      <Select
                        disabled={loading}
                        value={itinerary.hotelId}
                        defaultValue={itinerary.hotelId}
                        onValueChange={(selectedHotelId) => {
                          const newItineraries = [...value];
                          newItineraries[index] = {
                            ...itinerary,
                            hotelId: selectedHotelId
                          };
                          onChange(newItineraries); // Update the state with the new itineraries

                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              defaultValue={itinerary.hotelId}
                              placeholder="Select a Hotel"
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {hotels.map((hotel) => (
                            <SelectItem key={hotel.id} value={hotel.id}>
                              {hotel.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                            {activitiesMaster.map((activityMaster: { id: string; activityMasterTitle: string | number | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | PromiseLikeOfReactNode | null | undefined }) => (
                              <SelectItem key={activityMaster.id}
                                value={activityMaster.id}>
                                {activityMaster.activityMasterTitle}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormControl>
                          <Textarea rows={3}
                            disabled={loading}
                            placeholder="Activity Title"
                            value={activity.activityTitle}
                            onChange={(e) => {
                              const newItineraries = [...value];
                              newItineraries[index].activities[activityIndex] = { ...activity, activityTitle: e.target.value };
                              onChange(newItineraries);
                            }}
                          />
                        </FormControl>
                        <FormControl>
                          <Textarea rows={10}
                            placeholder="Activity Description"
                            disabled={loading}
                            value={activity.activityDescription}
                            onChange={(e) => {
                              const newItineraries = [...value];
                              newItineraries[index].activities[activityIndex] = { ...activity, activityDescription: e.target.value };
                              onChange(newItineraries);
                            }}
                          />
                        </FormControl>

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
                ))}
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onChange([...value, { dayNumber: 0, days: '', itineraryImages: [], itineraryTitle: '', itineraryDescription: '', activities: [], mealsIncluded: [], hotelId: '', roomCategory: '', locationId: '' }])}
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
                    <Textarea rows={10} disabled={loading} placeholder="Inclusions" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

            {/* //add formfield for exclusions */}
            <FormField
              control={form.control}
              name="exclusions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Exclusions</FormLabel>
                  <FormControl>
                    <Textarea rows={10} disabled={loading} placeholder="Exclusions" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
          </div>
          {/* //add formfield for paymentPolicy */}
          <div className="md:grid md:grid-cols-2 gap-8">

            <FormField
              control={form.control}
              name="paymentPolicy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Policy</FormLabel>
                  <FormControl>
                    <Textarea rows={10} disabled={loading} placeholder="Payment Policy" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

            {/* //add formfield for usefulTip */}
            <FormField
              control={form.control}
              name="usefulTip"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Useful Tip</FormLabel>
                  <FormControl>
                    <Textarea rows={10} disabled={loading} placeholder="Useful Tip" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
          </div>
          {/* //add formfield for cancellationPolicy */}
          <div className="md:grid md:grid-cols-2 gap-8">

            <FormField
              control={form.control}
              name="cancellationPolicy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cancellation Policy</FormLabel>
                  <FormControl>
                    <Textarea rows={10} disabled={loading} placeholder="Cancellation Policy" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

            {/* //add formfield for airlineCancellationPolicy */}

            <FormField
              control={form.control}
              name="airlineCancellationPolicy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Airline Cancellation Policy</FormLabel>
                  <FormControl>
                    <Textarea rows={10} disabled={loading} placeholder="Airline Cancellation Policy" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
          </div>
          {/* //add formfield for termsconditions */}
          <FormField
            control={form.control}
            name="termsconditions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Terms and Conditions</FormLabel>
                <FormControl>
                  <Textarea rows={10} disabled={loading} placeholder="Terms and Conditions" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />


          <Button disabled={loading} className="ml-auto" type="submit">
            {action}
          </Button>

        </form >
      </Form >
    </>
  )
} 
