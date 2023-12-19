'use client'

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Location, Image, Hotel, TourPackageQuery, Itinerary, FlightDetails } from "@prisma/client"
import { Key, ReactElement } from "react";

interface TourPackageQueryDisplayProps {
  data: TourPackageQuery & {
    images: Image[];
    itineraries: Itinerary[];
    flightDetails: FlightDetails[];
  } | null;
  locations: Location[];
  hotels: Hotel[];
  //  itineraries: Itinerary[];
};

export const TourPackageQueryDisplay: React.FC<TourPackageQueryDisplayProps> = ({
  data,
  locations,
  hotels,
}) => {
  if (!data) return <div>No data available</div>;

  return (

    <div key="1" className="flex flex-col space-y-8 md:space-y-12">
      <Card>
        <CardHeader>
          <CardTitle>Tour Images</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {data.images.map((image: { url: string }, index: number) => (
            <img key={index} src={image.url} alt={`Image ${index + 1}`} className="mb-2" />
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{data.tourPackageQueryName}</CardTitle>
          <CardDescription>Customer: {data.customerName}</CardDescription>
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
                {data.locationId}
              </div>

              <div>
                <div className="font-bold">Duration:</div>
                {data.numDaysNight}
              </div>
              <div>
                <div className="font-bold">Period:</div>
                {data.period}
              </div>
              <div>
                <div className="font-bold">Adults:</div>
                {data.numAdults}
              </div>
              <div>
                <div className="font-bold">Children (5 - 12 Years):</div>
                {data.numChild5to12}
              </div>
              <div>
                <div className="font-bold">Children (0 - 5 Years):</div>
                {data.numChild0to5}
              </div>
              <div>
                <div className="font-bold">Price:</div>
                {data.price}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Flight Details</CardTitle>
        </CardHeader>

        {data.flightDetails.map((flight, index) => (
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
      {/* <h3 className="text-lg font-semibold mt-4">Itineraries</h3>
        {data.itineraries.map((itinerary: { days : string, activities : [], mealsIncluded : string, hotelId : string}, index: number ) => (
          <div key={index} className="mb-4">
            <h4 className="font-semibold">Day {index + 1}</h4>
            <p>Hotel: {itinerary.hotelId }</p>
            <p>Meals Included: {itinerary.mealsIncluded?.join(', ')}</p>
            <div>
              {itinerary.activities.map((activity: { title: string ; description: string; }, activityIndex: number) => (
                <div key={activityIndex}>
                  <p>Activity Title: {activity.title}</p>
                  <p>Description: {activity.description}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
   */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Inclusions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul>
              <li> {data.inclusions}</li>
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
              <li> {data.exclusions}</li>
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
          <CardContent> {data.paymentPolicy}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Useful Tips</CardTitle>
          </CardHeader>
          <CardContent> {data.usefulTip}</CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cancellation Policy</CardTitle>
          </CardHeader>
          <CardContent> {data.cancellationPolicy}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Airline Cancellation Policy</CardTitle>
          </CardHeader>
          <CardContent> {data.airlineCancellationPolicy}</CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2">

        <Card>
          <CardHeader>
            <CardTitle>Terms and Conditions</CardTitle>
          </CardHeader>
          <CardContent> {data.termsconditions}</CardContent>

        </Card>
      </div>
    </div>
  );
};

