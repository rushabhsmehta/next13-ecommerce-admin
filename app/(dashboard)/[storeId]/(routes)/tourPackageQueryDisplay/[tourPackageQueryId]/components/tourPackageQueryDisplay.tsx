import Image from 'next/image';
import { PlaneTakeoffIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Location, Images, Hotel, TourPackageQuery, Itinerary, FlightDetails, Activity } from "@prisma/client";


interface TourPackageQueryDisplayProps {
  initialData: TourPackageQuery & {
    images: Images[];
    itineraries: (Itinerary & {
      itineraryImages: Images[];
      activities: (Activity & {
        activityImages: Images[];
      })[];
    })[];
    flightDetails: FlightDetails[];
  } | null;
  locations: Location[];
  hotels: (Hotel & {
    images: Images[];
  })[];
};

export const TourPackageQueryDisplay: React.FC<TourPackageQueryDisplayProps> = ({
  initialData,
  locations,
  hotels,
}) => {
  if (!initialData) return <div>No data available</div>;

  return (
    <div className="flex flex-col space-y-2 md:space-y-4 px-4 sm:px-2 md:px-8 lg:px-40">
      {/* Tour Images */}
      <Card>
        <CardHeader>
          <CardTitle>{initialData.tourPackageQueryName}</CardTitle>
          <CardDescription>
            Customer: {initialData.customerName} | Assigned To: {initialData.assignedTo} | {initialData.assignedToMobileNumber}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-1 justify-center items-center">
          {initialData.images.map((image, index) => (
            <div key={index} className="flex justify-center items-center">
              <Image
                src={image.url}
                alt={`Tour Image ${index + 1}`}
                width={800}
                height={300}
                className="rounded-lg object-cover"
                style={{ maxWidth: '100%', height: 'auto' }} // Ensures images are responsive and maintain aspect ratio
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Tour Package Details */}
      <Card>
        <CardHeader>

        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="font-bold">Location : {locations.find(location => location.id === initialData.locationId)?.label}</div>
            </div>
            <div>
              <div className="font-semibold">Duration : {initialData.numDaysNight}</div>
            </div>
            <div>
              <div className="font-semibold">Period : {initialData.period}</div>
            </div>
            <div>
              <div className="font-semibold">Adults : {initialData.numAdults}</div>
            </div>
            <div>
              <div className="font-semibold">Children (5 - 12 Years) : {initialData.numChild5to12}</div>
            </div>
            <div>
              <div className="font-semibold">Children (0 - 5 Years) : {initialData.numChild0to5}</div>
            </div>
            <div>
              <div className="font-semibold">Price : {initialData.price}</div>
            </div>
          </div>
        </CardContent>

      </Card>

      {/* Flight Details */}
      {initialData.flightDetails.length > 0 && (

        <Card>
          <CardHeader>
            <CardTitle>Flight Details</CardTitle>
          </CardHeader>
          {initialData.flightDetails.map((flight, index) => (
            <CardContent key={index} className="flex flex-col rounded-lg shadow-lg p-4 my-4">
              <div className="flex items-center justify-between border-b pb-2 mb-2">
                <span className="font-semibold text-sm">{flight.date}</span>
                <div>
                  <span className="font-semibold text-xs">{flight.flightName}</span> |
                  <span className="text-xs ml-1">{flight.flightNumber}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="font-bold text-xs">{flight.from}</div>
                  <div className="text-xs ml-2">{flight.departureTime}</div>
                </div>
                <div className="mx-2 text-center">
                  <span> <PlaneTakeoffIcon /> </span>
                  <div className="text-xs">{flight.flightDuration}</div>
                  <hr className="border-t-2 border-black mx-1" />
                </div>
                <div className="flex items-center">
                  <div className="font-bold text-xs">{flight.to}</div>
                  <div className="text-sm ml-2">{flight.arrivalTime}</div>
                </div>
              </div>
            </CardContent>
          ))}
        </Card>
      )}


      {/* Itineraries */}
      {initialData.itineraries && initialData.itineraries.map((itinerary, index) => (
        <Card key={index} className="mb-4">
          <CardHeader>
            <CardTitle>Day {index + 1}: {itinerary.itineraryTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            {itinerary.itineraryDescription && <p className="text-sm mb-2">{itinerary.itineraryDescription}</p>}

            {/* Hotel Section */}
            {itinerary.hotelId && hotels.find(hotel => hotel.id === itinerary.hotelId) && (
              <div className="mb-4 flex items-start space-x-4">
                {/* Images Container */}
                <div className="flex-shrink-0 mx-2 my-2">
                  {hotels.find(hotel => hotel.id === itinerary.hotelId)?.images.map((image, imgIndex) => (
                    <Image
                      key={imgIndex}
                      src={image.url}
                      alt={`Hotel Image ${imgIndex + 1}`}
                      width={200}
                      height={200}
                      className="rounded-lg object-cover mb-2"
                    />
                  ))}
                </div>
                {/* Text Content */}
                <div className="flex-grow mx-2 my-2">
                  <div className="font-bold">Hotel:</div>
                  <p className="text-sm mb-2">{hotels.find(hotel => hotel.id === itinerary.hotelId)?.name}</p>

                  {itinerary.mealsIncluded && (
                    <>
                      <div className="font-bold">Meal Plan:</div>
                      <p className="text-sm mb-4">{itinerary.mealsIncluded}</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Activities Section */}
            {itinerary.activities && itinerary.activities.length > 0 && itinerary.activities.map((activity, activityIndex) => (
              <div key={activityIndex} className="mb-4 flex items-start space-x-4">
                {/* Images Container */}
                <div className="flex-shrink-0 mx-2 my-2">
                  {activity.activityImages && activity.activityImages.length > 0 && activity.activityImages.map((image, actImgIndex) => (
                    <Image
                      key={actImgIndex}
                      src={image.url}
                      alt={`Activity Image ${actImgIndex + 1}`}
                      width={200}
                      height={200}
                      className="rounded-lg object-cover mb-2"
                    />
                  ))}
                </div>
                {/* Text Content */}
                <div className="flex-grow mx-2 my-2">
                  <div className="font-bold">{activity.activityTitle}</div>
                  <p className="text-sm">{activity.activityDescription}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}



      <div className="grid gap-4">
        {/* Inclusions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Inclusions</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap">{initialData.inclusions}</pre>
          </CardContent>
        </Card>

        {/* Exclusions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Exclusions</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap">{initialData.exclusions}</pre>
          </CardContent>
        </Card>

        {/* Payment Policy Card */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap">{initialData.paymentPolicy}</pre>
          </CardContent>
        </Card>

        {/* Useful Tips Card */}
        <Card>
          <CardHeader>
            <CardTitle>Useful Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap">{initialData.usefulTip}</pre>
          </CardContent>
        </Card>

        {/* Cancellation Policy Card */}
        <Card>
          <CardHeader>
            <CardTitle>Cancellation Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap">{initialData.cancellationPolicy}</pre>
          </CardContent>
        </Card>

        {/* Airline Cancellation Policy Card */}
        <Card>
          <CardHeader>
            <CardTitle>Airline Cancellation Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap">{initialData.airlineCancellationPolicy}</pre>
          </CardContent>
        </Card>

        {/* Terms and Conditions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Terms and Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap ">{initialData.termsconditions}</pre>
          </CardContent>
        </Card>
      </div>

    </div>
  );
};
