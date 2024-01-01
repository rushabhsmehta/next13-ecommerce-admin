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
    <div className="flex flex-col space-y-8 md:space-y-12">
      {/* Tour Images */}
      <Card>
      <CardHeader>
          <CardTitle>{initialData.tourPackageQueryName}</CardTitle>
          <CardDescription>
            Customer: {initialData.customerName} | Assigned To: {initialData.assignedTo} | {initialData.assignedToMobileNumber}
          </CardDescription>
       </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3 justify-center items-center">
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
              <div className="font-bold">Location:</div>
              <div>{locations.find(location => location.id === initialData.locationId)?.label || 'N/A'}</div>
            </div>
            <div>
              <div className="font-bold">Duration:</div>
              <div>{initialData.numDaysNight || 'N/A'}</div>
            </div>
            <div>
              <div className="font-bold">Period:</div>
              <div>{initialData.period || 'N/A'}</div>
            </div>
            <div>
              <div className="font-bold">Adults:</div>
              <div>{initialData.numAdults || 'N/A'}</div>
            </div>
            <div>
              <div className="font-bold">Children (5 - 12 Years):</div>
              <div>{initialData.numChild5to12 || 'N/A'}</div>
            </div>
            <div>
              <div className="font-bold">Children (0 - 5 Years):</div>
              <div>{initialData.numChild0to5 || 'N/A'}</div>
            </div>
            <div>
              <div className="font-bold">Price:</div>
              <div>{initialData.price || 'N/A'}</div>
            </div>
          </div>
        </CardContent>

      </Card>

      {/* Flight Details */}
      <Card>
        <CardHeader>
          <CardTitle>Flight Details</CardTitle>
        </CardHeader>
        {initialData.flightDetails.map((flight, index) => (
          <CardContent key={index} className="flex flex-col bg-white rounded-lg shadow-lg p-4 my-4">
            <div className="flex items-center justify-between border-b pb-2 mb-2">
              <span className="font-semibold text-lg">{flight.date || 'Date Not Available'}</span>
              <div>
                <span className="font-semibold">{flight.flightName || 'Flight Name Not Available'}</span> |
                <span className="ml-1">{flight.flightNumber || 'Flight Number Not Available'}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="font-bold">{flight.from || 'Origin Not Available'}</div>
                <div className="text-sm ml-2">{flight.departureTime || 'Departure Time Not Available'}</div>
              </div>
              <div className="mx-2 text-center">
                <span> <PlaneTakeoffIcon /> </span>
                <div className="text-xs">{flight.flightDuration || 'Duration Not Available'}</div>
                <hr className="border-t-2 border-black mx-1" />
              </div>
              <div className="flex items-center">
                <div className="font-bold">{flight.to || 'Destination Not Available'}</div>
                <div className="text-sm ml-2">{flight.arrivalTime || 'Arrival Time Not Available'}</div>
              </div>
            </div>
          </CardContent>
        ))}
      </Card>


      {/* Itineraries */}
      {
        initialData.itineraries.map((itinerary, index) => (
          <Card key={index} className="mb-4">
            <CardHeader>
              <CardTitle>Day {index + 1}: {itinerary.itineraryTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-2">{itinerary.itineraryDescription}</p>
              <div className="font-bold">Hotel:</div>
              <p className="text-sm mb-2">{hotels.find((hotel) => hotel.id === itinerary.hotelId)?.name || 'Hotel Name Not Available'}</p>

              {/* Display hotel images */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {hotels.find((hotel) => hotel.id === itinerary.hotelId)?.images.map((image, imgIndex) => (
                  <Image
                    key={imgIndex}
                    src={image.url}
                    alt={`Hotel Image ${imgIndex + 1}`}
                    width={200}
                    height={200}
                    className="rounded-lg object-cover"
                  />
                ))}
              </div>

              <div className="font-bold">Meal Plan:</div>
              <p className="text-sm mb-4">{itinerary.mealsIncluded}</p>

              {/* Display activities */}
              {itinerary.activities.map((activity, activityIndex) => (
                <div key={activityIndex} className="mb-4">
                  <div className="font-bold">{activity.activityTitle}</div>
                  <p className="text-sm">{activity.activityDescription}</p>
                  {/* Display activity images */}
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    {activity.activityImages.map((image, actImgIndex) => (
                      <Image
                        key={actImgIndex}
                        src={image.url}
                        alt={`Activity Image ${actImgIndex + 1}`}
                        width={200}
                        height={200}
                        className="rounded-lg object-cover"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      }


      <div className="grid gap-4 md:grid-cols-2">
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
            <pre className="whitespace-pre-wrap">{initialData.termsconditions}</pre>
          </CardContent>
        </Card>
      </div>

    </div>
  );
};
