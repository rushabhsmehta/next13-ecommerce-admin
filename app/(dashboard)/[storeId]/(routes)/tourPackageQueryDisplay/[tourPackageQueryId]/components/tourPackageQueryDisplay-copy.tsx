'use client'
import * as z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Location, Images, Hotel, TourPackageQuery, FlightDetails } from "@prisma/client"
import { Key, ReactElement, useState } from "react";
import Image from 'next/image'
import { useForm } from "react-hook-form";
import { useParams, useRouter } from "next/navigation";

interface Activity {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  // Add other fields from the Activity model as needed
}
interface Itinerary {
  id: string;
  tourPackageId?: string;
  tourPackageQueryId?: string;
  days?: string;
  hotelId?: string;
 // hotel?: Hotel; // Assuming you have a corresponding interface for Hotel
  mealsIncluded?: string;
  createdAt: Date;
  updatedAt: Date;
  activities: Activity[]; // Include activities here
  // Add other fields from the Itinerary model as needed
}

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



export const TourPackageQueryDisplay: React.FC<TourPackageQueryDisplayProps> = ({
  initialData,
  locations,
  hotels,
}) => {

 
  if (!initialData) return <div>No data available</div>;

  return (
    <>
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
        {/* Itinerary Details */}
        <Card>
          <CardHeader>
            <CardTitle>Itinerary Details</CardTitle>
          </CardHeader>
          {initialData.itineraries.map((itinerary, index) => (
            <CardContent key={index} >              
              <div className="grid gap-4 md:grid-cols-1">
                <div className="p-4 rounded-lg">
                  <div className="font-bold text-lg">Day {index + 1}</div>

                  <div className="font-medium">
                    Hotel : {hotels.find((hotel) => hotel.id === itinerary.hotelId)?.name}
                    {/* {itinerary.hotel?.name} */}
                    </div>
                
                  
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
                    <Card key = {activityIndex} className="mt-4">
                      <CardHeader>
                        <CardTitle>{activity.title}</CardTitle>
                      </CardHeader>
                      <CardContent>{activity.description}</CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          ))}

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
      </>
      );  
};

