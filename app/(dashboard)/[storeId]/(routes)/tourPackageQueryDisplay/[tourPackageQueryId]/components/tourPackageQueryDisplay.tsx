'use client'
import * as z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Location, Images, Hotel, TourPackageQuery, Itinerary, FlightDetails } from "@prisma/client"
import Image from 'next/image'
import {
  Form,    
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form"



const activitySchema = z.object({
  title: z.string(),
  description: z.string(),
});

const itinerarySchema = z.object({
  days: z.string(),
  activities: z.array(activitySchema),
  mealsIncluded: z.array(z.string()).optional(),
  hotelId: z.string(), // Array of hotel IDs
  // hotel : z.string(),
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
});

type TourPackageQueryDisplayValues = z.infer<typeof formSchema>

interface TourPackageQueryDisplayProps {
  initialData: TourPackageQuery & {
    images: Images[];
    itineraries: Itinerary[];
    flightDetails: FlightDetails[];
  } | null;
  locations: Location[];
  hotels: Hotel[];
  //  itineraries: Itinerary[];
};

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
    flightDetails: data.flightDetails.map(({ date, from, to, departureTime, arrivalTime }) => ({
      date: date ?? '',
      from: from ?? '',
      to: to ?? '',
      departureTime: departureTime ?? '',
      arrivalTime: arrivalTime ?? '',
    })),

    itineraries: data.itineraries.map(({ days, hotelId, mealsIncluded, activities, }) => ({
      days: days ?? '',
      hotelId: hotelId ?? '',
      //hotel : hotels.find(hotel => hotel.id === hotelId)?.name ?? '',
      mealsIncluded: mealsIncluded ? mealsIncluded.split(',') : [],
      activities: activities ?? [],
    }))
  };
};

export const TourPackageQueryDisplay: React.FC<TourPackageQueryDisplayProps> = ({
  initialData,
  locations,
  hotels,
}) => {

  const form = useForm<TourPackageQueryDisplayValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? transformInitialData(initialData) : {
      // Default values
    }
  });
  
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
  // hotelDetails: '',
  inclusions: '',
  exclusions: '',
  paymentPolicy: '',
  usefulTip: '',
  cancellationPolicy: '',
  airlineCancellationPolicy: '',
  termsconditions: '',
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




  if (!initialData) return <div>No data available</div>;


  

 

  return (

    <div className="flex flex-col space-y-8 md:space-y-12">
      <Card>
        <CardHeader>
          {/* <CardTitle>Tour Images</CardTitle> */}
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {initialData.images.map((image: { url: string }, index: number) => (
            <Image key={index} src={image.url} alt={`Images ${index + 1}`} className="mb-2" />
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{initialData.tourPackageQueryName}</CardTitle>
          <CardDescription>Customer: {initialData.customerName}</CardDescription>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-1">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="font-bold">Location:</div>
                {locations.find((location) => location.id === initialData.locationId)?.label}
                {/*   {initialData.locationId} */}
              </div>

              <div>
                <div className="font-bold">Duration:</div>
                {initialData.numDaysNight}
              </div>
              <div>
                <div className="font-bold">Period:</div>
                {initialData.period}
              </div>
              <div>
                <div className="font-bold">Adults:</div>
                {initialData.numAdults}
              </div>
              <div>
                <div className="font-bold">Children (5 - 12 Years):</div>
                {initialData.numChild5to12}
              </div>
              <div>
                <div className="font-bold">Children (0 - 5 Years):</div>
                {initialData.numChild0to5}
              </div>
              <div>
                <div className="font-bold">Price:</div>
                {initialData.price}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Flight Details</CardTitle>
        </CardHeader>

        {initialData.flightDetails.map((flight, index) => (
          <CardContent key={index}>


            <div className="grid gap-4 md:grid-cols-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div>
                  <div className="font-bold">Date:</div>
                  {flight.date}
                </div>
                <div>
                  <div className="font-bold">From:</div>
                  {flight.from}
                </div>
                <div>
                  <div className="font-bold">To:</div>
                  {flight.to}
                </div>
                <div>
                  <div className="font-bold">Departure Time:</div>
                  {flight.departureTime}
                </div>
                <div>
                  <div className="font-bold">Arrival Time:</div>
                  {flight.arrivalTime}
                </div>
              </div>
            </div>
          </CardContent>
        ))}
      </Card>
      <Card>
      {/* Itinerary Details */}
      <Form {...form}>
        <form className="space-y-8 w-full">
          <FormField
            control={form.control}
            name="itineraries"
            render={({ field: { value = [], onChange } }) => (
              <FormItem className="flex flex-col items-start space-y-3 rounded-md border p-4">
                <FormLabel>Create Itineraries</FormLabel>
                {value.map((itinerary, index) => (
                  <div key={index} className="grid gap-4 md:grid-cols-1">
                    <Card>
                      <div className="grid gap-4 md:grid-cols-1">
                        <div className="p-4 rounded-lg">
                          <div className="font-bold text-lg">Day {index + 1}</div>

                          <div className="font-medium">
                            Hotel : {hotels.find((hotel) => hotel.id === itinerary.hotelId)?.name}
                            <Image
                              alt="Hotel Image"
                              className="rounded-lg object-cover mt-2"
                              height="200"
                              src="/placeholder.svg"
                              style={{
                                aspectRatio: "200/200",
                                objectFit: "cover",
                              }}
                              width="200"
                            />
                            <div className="font-bold mt-2">Meal Plan:</div>
                            <div className="font-medium">{itinerary.mealsIncluded}</div>
                            {itinerary.activities.map((activity, activityIndex: number) => (
                              <Card key={activityIndex} className="mt-4">
                                <CardHeader>
                                  <CardTitle>{activity.title}</CardTitle>
                                </CardHeader>
                                <CardContent>{activity.description}</CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                ))}
              </FormItem>
            )}
          />
        </form>
      </Form>
      </Card>




      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Inclusions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul>
              <li> {initialData.inclusions}</li>
              <li>Flight tickets</li>
              <li>Breakfast</li>
              <li>Sightseeing</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exclusions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul>
              <li> {initialData.exclusions}</li>
              <li>Travel insurance</li>
              <li>Personal expenses</li>
            </ul>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Payment Policy</CardTitle>
          </CardHeader>
          <CardContent> {initialData.paymentPolicy}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Useful Tips</CardTitle>
          </CardHeader>
          <CardContent> {initialData.usefulTip}</CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cancellation Policy</CardTitle>
          </CardHeader>
          <CardContent> {initialData.cancellationPolicy}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Airline Cancellation Policy</CardTitle>
          </CardHeader>
          <CardContent> {initialData.airlineCancellationPolicy}</CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2">

        <Card>
          <CardHeader>
            <CardTitle>Terms and Conditions</CardTitle>
          </CardHeader>
          <CardContent> {initialData.termsconditions}</CardContent>

        </Card>
      </div>
    </div>
  )
}



