"use client"

import * as z from "zod"
import axios from "axios"
import { Key, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "react-hot-toast"
import { Trash } from "lucide-react"
import { Location, Image, Hotel, TourPackageQuery, Itinerary, FlightDetails } from "@prisma/client"
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


const itinerarySchema = z.object({
  days: z.string(),
  activities: z.string(),
  places: z.string(),
  mealsIncluded: z.array(z.string()).optional(),
});

const flightDetailsSchema = z.object({

  date: z.string(),
  from: z.string(),
  to: z.string(),
  departureTime: z.string(),
  arrivalTime: z.string(),
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
  hotelId: z.string().min(1),
  flightDetails: flightDetailsSchema.array(),
  hotelDetails: z.string(),
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
});



type TourPackageQueryFormValues = z.infer<typeof formSchema>

interface TourPackageQueryFormProps {
  initialData: TourPackageQuery & {
    images: Image[];
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
    hotelId: string;
    price: string;
    isFeatured: boolean;
    isArchived: boolean;
    createdAt: Date;
    updatedAt: Date;
    flightDetails: {
      id: string;
      date: string | null;
      from: string | null,
      to: string | null,
      departureTime: string | null;
      arrivalTime: string | null;
    }[];
    hotelDetails: string;
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
      days: string | null;
      activities: string | null;
      places: string | null;
      mealsIncluded: string | null;
    }[];
  }) => {
    return {
      ...data,
      flightDetails: data.flightDetails.map(({ date, from, to, departureTime, arrivalTime }) => ({
        date: date ?? '',
        from: from ?? '',
        to: to ?? '',
        departureTime: departureTime ?? '',
        arrivalTime: arrivalTime ?? '',
      })),

      itineraries: data.itineraries.map(({ days, activities, places, mealsIncluded }) => ({
        days: days ?? '', // Convert null to empty string or undefined
        activities: activities ?? '',
        places: places ?? '',
        mealsIncluded: mealsIncluded ? mealsIncluded.split(',') : [] // Assuming mealsIncluded is a comma-separated string
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
    flightDetails: [],
    hotelDetails: '',
    inclusions: '',
    exclusions: '',
    paymentPolicy: '',
    usefulTip: '',
    cancellationPolicy: '',
    airlineCancellationPolicy: '',
    termsconditions: '',
    images: [],
    itineraries: [],
    locationId: '',
    hotelId: '',
    isFeatured: false,
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
          <div className="md:grid md:grid-cols-3 gap-8">

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
          <div className="md:grid md:grid-cols-4 gap-8">

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
          </div>
          {/* //add formfield for flightDetails */}
          <div className="md:grid md:grid-cols-3 gap-8">
            <FormField
              control={form.control}
              name="flightDetails"
              render={({ field: { value = [], onChange } }) => (
                <FormItem>
                  <FormLabel>Create Itineraries</FormLabel>
                  {

                    value.map((flight, index) => (
                      <div key={index} className="space-y-4">
                        <FormControl>
                          <Input
                            placeholder="Date"                            
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
                            placeholder="From"
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
                            value={flight.arrivalTime}
                            onChange={(e) => {
                              const newFlightDetails = [...value];
                              newFlightDetails[index] = { ...flight, arrivalTime : e.target.value };
                              onChange(newFlightDetails);
                            }}
                          />
                        </FormControl>
                        <FormControl>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
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
                      onClick={() => onChange([...value, { date: '', from: '', to: '', departureTime: '', arrivalTime: '' }])}
                    >
                      Add Flight
                    </Button>
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {/* //add formfield for hotelDetails */}
          <FormField
            control={form.control}
            name="hotelDetails"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hotel Details</FormLabel>
                <FormControl>
                  <Input disabled={loading} placeholder="Hotel Details" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

          {/* //add formfield for inclusions */}
          <FormField
            control={form.control}
            name="inclusions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Inclusions</FormLabel>
                <FormControl>
                  <Input disabled={loading} placeholder="Inclusions" {...field} />
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
                  <Input disabled={loading} placeholder="Exclusions" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

          {/* //add formfield for paymentPolicy */}
          <FormField
            control={form.control}
            name="paymentPolicy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Policy</FormLabel>
                <FormControl>
                  <Input disabled={loading} placeholder="Payment Policy" {...field} />
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
                  <Input disabled={loading} placeholder="Useful Tip" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

          {/* //add formfield for cancellationPolicy */}
          <FormField
            control={form.control}
            name="cancellationPolicy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cancellation Policy</FormLabel>
                <FormControl>
                  <Input disabled={loading} placeholder="Cancellation Policy" {...field} />
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
                  <Input disabled={loading} placeholder="Airline Cancellation Policy" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

          {/* //add formfield for termsconditions */}
          <FormField
            control={form.control}
            name="termsconditions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Terms and Conditions</FormLabel>
                <FormControl>
                  <Input disabled={loading} placeholder="Terms and Conditions" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />


          <div className="md:grid md:grid-cols-3 gap-8">

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
            <FormField
              control={form.control}
              name="hotelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hotel</FormLabel>
                  <Select disabled={loading} onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue defaultValue={field.value} placeholder="Select a Hotel" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {hotels.map((hotel) => (
                        <SelectItem key={hotel.id} value={hotel.id}>{hotel.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      Featured
                    </FormLabel>
                    <FormDescription>
                      This Tour Package will appear on the home page
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isArchived"
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
                      Archived
                    </FormLabel>
                    <FormDescription>
                      This Tour Package will not appear anywhere in the store.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="itineraries"
            render={({ field: { value = [], onChange } }) => (
              <FormItem>
                <FormLabel>Create Itineraries</FormLabel>
                {

                  value.map((itinerary, index) => (
                    <div key={index} className="space-y-4">
                      <FormControl>
                        <Input
                          placeholder="Day"
                          value={itinerary.days}
                          onChange={(e) => {
                            const newItineraries = [...value];
                            newItineraries[index] = { ...itinerary, days: e.target.value };
                            onChange(newItineraries);
                          }}
                        />

                      </FormControl>

                      <FormControl>
                        <Input
                          placeholder="Activities"
                          value={itinerary.activities}
                          onChange={(e) => {
                            const newItineraries = [...value];
                            newItineraries[index] = { ...itinerary, activities: e.target.value };
                            onChange(newItineraries);
                          }}
                        />
                      </FormControl>
                      <FormControl>
                        <Input
                          placeholder="Places"
                          value={itinerary.places}
                          onChange={(e) => {
                            const newItineraries = [...value];
                            newItineraries[index] = { ...itinerary, places: e.target.value };
                            onChange(newItineraries);
                          }}
                        />
                      </FormControl>
                      <FormControl>
                        <div className="flex flex-col">
                          <label>
                            <Checkbox
                              checked={itinerary.mealsIncluded?.includes('breakfast')}
                              onCheckedChange={(isChecked) =>
                                handleMealChange('breakfast', !!isChecked, index)
                              }
                            />
                            Breakfast
                          </label>
                          <label>
                            <Checkbox
                              checked={itinerary.mealsIncluded?.includes('lunch')}
                              onCheckedChange={(isChecked) =>
                                handleMealChange('lunch', !!isChecked, index)
                              }
                            />
                            Lunch
                          </label>
                          <label>
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



                      {/* Other inputs or elements related to each itinerary can go here */}

                      <FormControl>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            const newItineraries = value.filter((_, i) => i !== index);
                            onChange(newItineraries);
                          }}
                        >
                          Remove Itinerary
                        </Button>
                      </FormControl>
                    </div>
                  ))}
                <FormControl>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onChange([...value, { days: '', activities: '', places: '', mealsIncluded: [] }])}
                  >
                    Add Itinerary
                  </Button>
                </FormControl>
              </FormItem>
            )}
          />


          <Button disabled={loading} className="ml-auto" type="submit">
            {action}
          </Button>

        </form>
      </Form >
    </>
  )
} 
