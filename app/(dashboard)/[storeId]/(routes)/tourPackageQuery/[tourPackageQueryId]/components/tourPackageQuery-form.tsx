"use client"

import * as z from "zod"
import axios from "axios"
import { Key, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "react-hot-toast"
import { Trash } from "lucide-react"
import { Images } from "@prisma/client"
import { Location, Hotel, TourPackageQuery, Itinerary, FlightDetails } from "@prisma/client"
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
  title: z.string(),
  description: z.string(),
});

const itinerarySchema = z.object({
  itineraryTitle: z.string(),
  itineraryDescription: z.string(),
  days: z.string(),
  activities: z.array(activitySchema),
  mealsIncluded: z.array(z.string()).optional(),
  hotelId: z.string(), // Array of hotel IDs
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
  period: z.string(),
  numAdults: z.string(),
  numChild5to12: z.string(),
  numChild0to5: z.string(),
  price: z.string().min(1),
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
  itineraries: itinerarySchema.array(),
  isFeatured: z.boolean().default(false).optional(),
  isArchived: z.boolean().default(false).optional(),
  assignedTo: z.string().optional(),
  assignedToMobileNumber: z.string().optional(),
  assignedToEmail: z.string().optional(),
});

type TourPackageQueryFormValues = z.infer<typeof formSchema>

interface TourPackageQueryFormProps {
  initialData: TourPackageQuery & {
    images: Images[];
    itineraries: Itinerary[];
    flightDetails: FlightDetails[];
  } | null;
  locations: Location[];
  hotels: Hotel[];
  //  itineraries: Itinerary[];
};

export const TourPackageQueryForm: React.FC<TourPackageQueryFormProps> = ({
  initialData,
  locations,
  hotels,
}) => {
  const params = useParams();
  const router = useRouter();

  //const defaultItinerary = { days: '1', activities: '', places: '', mealsIncluded: false };

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [flightDetails, setFlightDetails] = useState([]);

  //console.log(initialData);
  const title = initialData ? 'Edit Tour  Query' : 'Create Tour Package Query';
  const description = initialData ? 'Edit a Tour Package Query.' : 'Add a new Tour Package Query';
  const toastMessage = initialData ? 'Tour Package Query updated.' : 'Tour Package Query created.';
  const action = initialData ? 'Save changes' : 'Create';
  console.log("Initial Data : ", initialData?.itineraries)

  const transformInitialData = (data: {
    id: string;
    storeId: string;
    tourPackageQueryName: string;
    customerName: string;
    numDaysNight: string;
    period: string;
    numAdults: string;
    numChild5to12: string;
    numChild0to5: string;
    locationId: string;
    //location : string;
    //hotelId: string;
    price: string;
    isFeatured: boolean;
    isArchived: boolean;
    assignedTo: string | null;
    assignedToMobileNumber: string | null;
    assignedToEmail: string | null;
    createdAt: Date;
    updatedAt: Date;
    flightDetails: {
      id: string;
      date: string | null;
      flightName: string | null;
      flightNumber: string | null;
      from: string | null,
      to: string | null,
      departureTime: string | null;
      arrivalTime: string | null;
      flightDuration: string | null;
    }[];
    // hotelDetails: string;
    inclusions: string;
    exclusions: string;
    paymentPolicy: string;
    usefulTip: string;
    cancellationPolicy: string;
    airlineCancellationPolicy: string;
    termsconditions: string;
    images: { id: string; url: string; }[];
    itineraries: {
      id: string;
      itineraryTitle: string | null;
      itineraryDescription: string | null;
      days: string | null;
      hotelId: string | null;
      //hotel : string | null;
      mealsIncluded: string | null;
      createdAt: Date;
      updatedAt: Date;
      activities?: { title: string, description: string }[]; // Mark as optional
    }[];
  }) => {
    return {
      ...data,
      assignedTo: data.assignedTo ?? '', // Fallback to empty string if null
      assignedToMobileNumber: data.assignedToMobileNumber ?? '',
      assignedToEmail: data.assignedToEmail ?? '',
      flightDetails: data.flightDetails.map(({ date, flightName, flightNumber, from, to, departureTime, arrivalTime, flightDuration }) => ({
        date: date ?? '',
        flightName: from ?? '',
        flightNumber: to ?? '',
        from: from ?? '',
        to: to ?? '',
        departureTime: departureTime ?? '',
        arrivalTime: arrivalTime ?? '',
        flightDuration: flightDuration ?? '',
      })),

      itineraries: data.itineraries.map(({ days, itineraryTitle, itineraryDescription, hotelId, mealsIncluded, activities, }) => ({
        days: days ?? '',
        itineraryTitle: itineraryTitle ?? '',
        itineraryDescription: itineraryDescription ?? '',
        hotelId: hotelId ?? '',
        //hotel : hotels.find(hotel => hotel.id === hotelId)?.name ?? '',
        mealsIncluded: mealsIncluded ? mealsIncluded.split(',') : [],
        activities: activities ?? [],
      }))
    };
  };
  const defaultValues = initialData ? transformInitialData(initialData) : {

    tourPackageQueryName: '',
    customerName: '',
    numDaysNight: '',
    period: '',
    numAdults: '',
    numChild5to12: '',
    numChild0to5: '',
    price: '',
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

  const form = useForm<TourPackageQueryFormValues>({
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

  const onSubmit = async (data: TourPackageQueryFormValues) => {
    console.log("Itineraries before submission:", data.itineraries);

    const formattedData = {
      ...data,
      itineraries: data.itineraries.map(itinerary => ({
        ...itinerary,
        mealsIncluded: itinerary.mealsIncluded && itinerary.mealsIncluded.length > 0 ? itinerary.mealsIncluded.join(',') : 'none'
      }))
    };


    try {
      setLoading(true);
      if (initialData) {
        // console.log({ formattedData })
        await axios.patch(`/api/${params.storeId}/tourPackageQuery/${params.tourPackageQueryId}`, formattedData);
      } else {
        await axios.post(`/api/${params.storeId}/tourPackageQuery`, formattedData);
      }
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

  const onDelete = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/${params.storeId}/tourPackageQuery/${params.tourPackageQueryId}`);
      router.refresh();
      router.push(`/${params.storeId}/tourPackageQuery`);
      toast.success('Tour Package Query deleted.');
    } catch (error: any) {
      toast.error('Something went wrong.');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }



  // Function to handle meal checkbox changes



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
        {initialData && (
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
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
                <FormLabel>Assigned To</FormLabel>
                <FormControl>
                  <Input
                    disabled={loading}
                    placeholder="Mobile Number"
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
                <FormLabel>Email ID</FormLabel>
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



            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price</FormLabel>
                  <FormControl>
                    <Input disabled={loading} placeholder="9.99" {...field} />
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
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input
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
                        <Input
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
                      <FormLabel>Day {index + 1}</FormLabel>
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

                    <FormItem className="flex flex-col items-start space-y-3 rounded-md border p-4">
                      <FormLabel>Meal Plan</FormLabel>
                      <FormControl>
                        <div className="flex flex-col gap-2">
                          <label className="flex items-center gap-2">
                            <Checkbox
                              checked={itinerary.mealsIncluded?.includes('breakfast')}
                              onCheckedChange={(isChecked) =>
                                handleMealChange('breakfast', !!isChecked, index)
                              }
                            />
                            Breakfast
                          </label>
                          <label className="flex items-center gap-2">
                            <Checkbox
                              checked={itinerary.mealsIncluded?.includes('lunch')}
                              onCheckedChange={(isChecked) =>
                                handleMealChange('lunch', !!isChecked, index)
                              }
                            />
                            Lunch
                          </label>
                          <label className="flex items-center gap-2">
                            <Checkbox
                              checked={itinerary.mealsIncluded?.includes('dinner')}
                              onCheckedChange={(isChecked) =>
                                handleMealChange('dinner', !!isChecked, index)
                              }
                            />
                            Dinner
                          </label>
                        </div>
                      </FormControl>
                    </FormItem>


                    {itinerary.activities.map((activity, activityIndex) => (
                      <div key={activityIndex} className="space-y-2">
                        <FormControl>
                          <Input
                            disabled={loading}
                            placeholder="Activity Title"
                            value={activity.title}
                            onChange={(e) => {
                              const newItineraries = [...value];
                              newItineraries[index].activities[activityIndex] = { ...activity, title: e.target.value };
                              onChange(newItineraries);
                            }}
                          />
                        </FormControl>
                        <FormControl>
                          <Textarea rows={10}
                            placeholder="Activity Description"
                            disabled={loading}
                            value={activity.description}
                            onChange={(e) => {
                              const newItineraries = [...value];
                              newItineraries[index].activities[activityIndex] = { ...activity, description: e.target.value };
                              onChange(newItineraries);
                            }}
                          />
                        </FormControl>
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
                        newItineraries[index].activities = [...newItineraries[index].activities, { title: '', description: '' }];
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
                  onClick={() => onChange([...value, { days: '', itineraryTitle : '', itineraryDescription : '', activities: [], mealsIncluded: [], hotelId: '' }])}
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
