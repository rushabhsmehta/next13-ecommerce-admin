'use client'

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
  }) =>
 {
    if (!data) return <div>No data available</div>;
  
    return (
      <div className="tour-package-query-detail">
        {/* Tour Package Query Details */}
        <h2 className="text-xl font-semibold">{data.tourPackageQueryName}</h2>
        <p>Customer Name: {data.customerName}</p>
        <p>Days/Nights: {data.numDaysNight}</p>
        <p>Period: {data.period}</p>
        <p>Number of Adults: {data.numAdults}</p>
        <p>Number of Children (5-12): {data.numChild5to12}</p>
        <p>Number of Children (0-5): {data.numChild0to5}</p>
        <p>Price: {data.price}</p>
        <p>Location: {data.locationId}</p>
  
        {/* Flight Details */}
        <h3 className="text-lg font-semibold mt-4">Flight Details</h3>
        
        {data.flightDetails.map((flight: { date: string ; from: string; to: string ; departureTime: string; arrivalTime: string }, index: number) => (
          <div key={index} className="mb-2">
            <p>Date: {flight.date}</p>
            <p>From: {flight.from}</p>
            <p>To: {flight.to}</p>
            <p>Departure Time: {flight.departureTime}</p>
            <p>Arrival Time: {flight.arrivalTime}</p>
          </div>
        ))}
  
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
        {/* Images Gallery */}
        <h3 className="text-lg font-semibold mt-4">Images</h3>
        <div className="image-gallery">
          {data.images.map((image: { url: string }, index: number) => (
            <img key={index} src={image.url} alt={`Image ${index + 1}`} className="mb-2" />
          ))}
        </div>
  
        {/* Additional Information */}
        <h3 className="text-lg font-semibold mt-4">Additional Information</h3>
        <p>Inclusions: {data.inclusions}</p>
        <p>Exclusions: {data.exclusions}</p>
        <p>Payment Policy: {data.paymentPolicy}</p>
        <p>Useful Tips: {data.usefulTip}</p>
        <p>Cancellation Policy: {data.cancellationPolicy}</p>
        <p>Airline Cancellation Policy: {data.airlineCancellationPolicy}</p>
        <p>Terms and Conditions: {data.termsconditions}</p>
      </div>
    );
  };
  
  