"use client"

import * as z from "zod"
import axios from "axios"
import { JSXElementConstructor, Key, PromiseLikeOfReactNode, ReactElement, ReactNode, ReactPortal, useEffect, useRef, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "react-hot-toast"
import { Activity, Images, ItineraryMaster } from "@prisma/client"
import { Location, Hotel, TourPackageQuery, Itinerary, FlightDetails, ActivityMaster } from "@prisma/client"
import { useParams, useRouter } from "next/navigation"

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

import { Textarea } from "@/components/ui/textarea"
import { ARILINE_CANCELLATION_POLICY_DEFAULT, CANCELLATION_POLICY_DEFAULT, EXCLUSIONS_DEFAULT, IMPORTANT_NOTES_DEFAULT, INCLUSIONS_DEFAULT, PAYMENT_TERMS_DEFAULT, TOTAL_PRICE_DEFAULT, TOUR_HIGHLIGHTS_DEFAULT, TOUR_PACKAGE_QUERY_TYPE_DEFAULT, USEFUL_TIPS_DEFAULT } from "./defaultValues"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"



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
  hotelId: z.string(), // Array of hotel IDs
  numberofRooms: z.string().optional(),
  roomCategory: z.string().optional(),
  locationId: z.string(),
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

  locationId: z.string().min(1),

  flightDetails: flightDetailsSchema.array(),

  images: z.object({ url: z.string() }).array(),
  itineraries: z.array(itinerarySchema),

  purchaseDetails: z.string().optional(),
  saleDetails: z.string().optional(),
  paymentDetails: z.string().optional(),
  receiptDetails: z.string().optional(),
  expenseDetails: z.string().optional(),
});

type TourPackageQueryFormValues = z.infer<typeof formSchema>

interface TourPackageQueryFormProps {
  initialData: TourPackageQuery | null;
};

export const TourPackageQueryForm: React.FC<TourPackageQueryFormProps> = ({
  initialData,
}) => {
  const params = useParams();
  const router = useRouter();


  const [loading, setLoading] = useState(false);


  const toastMessage = initialData ? 'Tour Package Query updated.' : 'Tour Package Query created.';
  const action = initialData ? 'Save changes' : 'Create';

  const transformInitialData = (data: any) => {
    return {
      ...data,
      tourPackageQueryNumber: data.tourPackageQueryNumber ?? getCurrentDateTimeString(), // Set the current date and time
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
    tour_highlights: TOUR_HIGHLIGHTS_DEFAULT,
    tourStartsFrom: '',
    tourEndsOn: '',
    transport: '',
    pickup_location: '',
    drop_location: '',
    numAdults: '',
    numChild5to12: '',
    numChild0to5: '',
    price: '',
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
    inclusions: INCLUSIONS_DEFAULT,
    exclusions: EXCLUSIONS_DEFAULT,
    importantNotes: IMPORTANT_NOTES_DEFAULT,
    paymentPolicy: PAYMENT_TERMS_DEFAULT,
    usefulTip: USEFUL_TIPS_DEFAULT,
    cancellationPolicy: CANCELLATION_POLICY_DEFAULT,
    airlineCancellationPolicy: ARILINE_CANCELLATION_POLICY_DEFAULT,
    termsconditions: IMPORTANT_NOTES_DEFAULT,
    images: [],
    itineraries: [],
    locationId: '', 
    isFeatured: false,
    isArchived: false,
  };

  const form = useForm<TourPackageQueryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  const onSubmit = async (data: TourPackageQueryFormValues) => {

    
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
      await axios.patch(`/api/tourPackageQuery/${params.tourPackageQueryId}`, formattedData);
      router.refresh();
      router.push(`/accounts`);
      toast.success(toastMessage);
    } catch (error: any) {
      console.error('Error:', error.response ? error.response.data : error.message);  // Updated line
      toast.error('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">

          <Tabs defaultValue="purchaseDetails">
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
                        value={field.value || '0'}
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
                        value={field.value || '0'}
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
                        value={field.value || '0'}
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
                        value={field.value || '0'}
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
                        value={field.value || '0'}
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
