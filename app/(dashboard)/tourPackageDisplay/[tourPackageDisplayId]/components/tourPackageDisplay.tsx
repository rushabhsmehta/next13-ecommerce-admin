import Image from 'next/image';
import { CheckCircleIcon, CreditCardIcon, InfoIcon, PlaneIcon, PlaneTakeoffIcon, Shield, XCircleIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Location, Images, Hotel, TourPackage, Itinerary, FlightDetails, Activity } from "@prisma/client";


interface TourPackageDisplayProps {
  initialData: TourPackage & {
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

export const TourPackageDisplay: React.FC<TourPackageDisplayProps> = ({
  initialData,
  locations,
  hotels,
}) => {
  if (!initialData) return <div>No data available</div>;

  return (
    <div className="flex flex-col space-y-2 md:space-y-4 px-4 sm:px-2 md:px-8 lg:px-40">
      {/* Tour Images */}
      <Card className="break-inside-avoid">
        <CardHeader>
          <CardTitle>{initialData.tourPackageName}</CardTitle>
          <CardDescription>{initialData.tourPackageType}</CardDescription>
          <CardDescription>Location : {locations.find(location => location.id === initialData.locationId)?.label}</CardDescription>

          <CardContent className="grid gap-4 md:grid-cols-1 justify-center items-center">
            {initialData.images.map((image, index) => (
              <div key={index} className="w-full h-[500px]">
                <Image
                  src={image.url}
                  alt={`Tour Image ${index + 1}`}
                  width={1200}
                  height={500}
                  className="object-cover w-full h-full"// Ensures images are responsive and maintain aspect ratio
                />
              </div>
            ))}
          </CardContent>

          {/*   {initialData.pricePerAdult !== '' && (
            <div> Price :
              <div dangerouslySetInnerHTML={{ __html: initialData.pricePerAdult || '' }}></div>
            </div>
          )}
          {initialData.pricePerChildOrExtraBed !== '' && (
            <div>
              <div className="font-semibold">Price per Child/Extra Bed : {initialData.pricePerChildOrExtraBed}</div>
            </div>
          )}
          {initialData.pricePerChild5to12YearsNoBed !== '' && (
            <div>
              <div className="font-semibold">Price per Child (5-12 Years - No bed) : {initialData.pricePerChild5to12YearsNoBed}</div>
            </div>
          )}
          {initialData.pricePerChildwithSeatBelow5Years !== '' && (
            <div>
              <div className="font-semibold">Price per Child with Seat (Below 5 Years) : {initialData.pricePerChildwithSeatBelow5Years}</div>
            </div>
          )} */}
          {initialData.totalPrice !== '' && (
            <div>
              <div className="font-semibold" dangerouslySetInnerHTML={{ __html: initialData.totalPrice || '' }} /></div>
          )}

          {initialData.disclaimer !== '' && (
            <div>
              <div className="font-semibold" dangerouslySetInnerHTML={{ __html: initialData.disclaimer || '' }} /></div>
          )}

        </CardHeader>


      </Card>

      {/* Tour Highlights */}

      <Card>
        <CardContent>

          {initialData.tour_highlights !== '' && (
            <div>
              <div dangerouslySetInnerHTML={{ __html: initialData.tour_highlights || '' }}></div>
            </div>
          )}

        </CardContent>

      </Card>

      {/* Flight Details */}
      {initialData.flightDetails.length > 0 && (

        <Card className="break-inside-avoid">
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
        <Card key={index} className="mb-4 break-inside-avoid">
          <CardHeader>
            <CardTitle>Day : {itinerary.dayNumber} </CardTitle>
            <CardDescription>{itinerary.days}</CardDescription>
          </CardHeader>

          {/* Flex Container for Itinerary Image and Description */}
          <div className="mb-4 flex items-start space-x-4 ml-6">

            {/* Image Section */}
            <div className="flex-shrink-0 mx-2 my-2 break-inside-avoid">
              {itinerary.itineraryImages && itinerary.itineraryImages.length > 0 && itinerary.itineraryImages.map((image, imageIndex) => (
                <Image
                  key={imageIndex}
                  src={image.url}
                  alt={`Itinerary Image ${imageIndex + 1}`}
                  width={200}
                  height={200}
                  className="rounded-lg object-cover mb-2"
                />
              ))}
            </div>

            {/* Description Section */}
            <div className="flex-grow mx-2 my-2">
              <div className="font-bold mb-2" dangerouslySetInnerHTML={{ __html: itinerary.itineraryTitle || '' }}>
              </div>
              <div>

                <div className="text-sm mb-4" dangerouslySetInnerHTML={{ __html: itinerary.itineraryDescription || '' }}>

                </div>
              </div>
            </div>
          </div>

          <CardContent>



            {/* Hotel Section */}
            {itinerary.hotelId && hotels.find(hotel => hotel.id === itinerary.hotelId) && (
              <div className="mb-4 flex items-start space-x-4">
                {/* Images Container */}
                <div className="flex-shrink-0 mx-2 my-2 break-inside-avoid">
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

                  {itinerary.numberofRooms && (
                    <>
                      <div className="font-bold">Number of Rooms  :</div>
                      <p className="text-sm mb-4">{itinerary.numberofRooms}</p>
                    </>
                  )}


                  {itinerary.roomCategory && (
                    <>
                      <div className="font-bold">Room Category :</div>
                      <p className="text-sm mb-4">{itinerary.roomCategory}</p>
                    </>
                  )}

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
              <div key={activityIndex} className="mb-4 flex items-start space-x-4 break-inside-avoid">
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

                  <div className="font-bold" dangerouslySetInnerHTML={{ __html: activity.activityTitle || '' }}></div>
                  <p className="text-sm" dangerouslySetInnerHTML={{ __html: activity.activityDescription || '' }}></p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}



      <div className="grid gap-4">
        {/* Inclusions Card */}
        <div className="break-inside-avoid rounded-lg overflow-hidden shadow-lg bg-gradient-to-r from-red-500 to-orange-500 text-white w-full mt-4">
          <div className="flex items-center space-x-2 p-4">
            <CheckCircleIcon className="w-6 h-6 text-white" />
            <h3 className="text-2xl font-semibold">Inclusions</h3>
          </div>
          <div className="p-4 bg-white text-gray-700">
            <div className="max-w-full overflow-hidden">
              <div
                dangerouslySetInnerHTML={{ __html: initialData.inclusions || '' }}
                className="whitespace-normal break-words text-2xl"
              ></div>
            </div>
          </div>
        </div>
        {/* Exclusions Card */}
        {/* Example for Exclusions Section */}
        <div className="break-inside-avoid rounded-lg overflow-hidden shadow-lg bg-gradient-to-r from-red-500 to-orange-500 text-white w-full mt-4">
          <div className="flex items-center space-x-2 p-4">
            <XCircleIcon className="w-6 h-6 text-white" />
            <h3 className="text-2xl font-semibold">Exclusions</h3>
          </div>
          <div className="p-4 bg-white text-gray-700">
            <div className="max-w-full overflow-hidden">
              <div
                dangerouslySetInnerHTML={{ __html: initialData.exclusions || '' }}
                className="whitespace-normal break-words text-2xl"
              ></div>
            </div>
          </div>
        </div>

        {/* Important Notes Section */}
        <div className="break-inside-avoid rounded-lg overflow-hidden shadow-lg bg-gradient-to-r from-red-500 to-orange-500 text-white w-full mt-4">
          <div className="flex items-center space-x-2 p-4">
            <InfoIcon className="w-6 h-6 text-white" />
            <h3 className="text-2xl font-semibold">Important Notes</h3>
          </div>
          <div className="p-4 bg-white text-gray-700 w-full">
            <div className="whitespace-normal break-words text-2xl" dangerouslySetInnerHTML={{ __html: initialData.importantNotes || '' }}></div>
          </div>
        </div>

        {/* Payment Policy Section */}
        <div className="break-inside-avoid rounded-lg overflow-hidden shadow-lg bg-gradient-to-r from-red-500 to-orange-500 text-white w-full mt-4">
          <div className="flex items-center space-x-2 p-4">
            <CreditCardIcon className="w-6 h-6 text-white" />
            <h3 className="text-2xl font-semibold">Payment Policy</h3>
          </div>
          <div className="p-4 bg-white text-gray-700 w-full">
            <div className="whitespace-normal break-words text-2xl" dangerouslySetInnerHTML={{ __html: initialData.paymentPolicy || '' }}></div>
          </div>
        </div>

        {/* Terms and Conditions Section */}
        <div className="break-inside-avoid rounded-lg overflow-hidden shadow-lg bg-gradient-to-r from-red-500 to-orange-500 text-white w-full mt-4">
          <div className="flex items-center space-x-2 p-4">
            <Shield className="w-6 h-6 text-white" />
            <h3 className="text-2xl font-semibold">Terms and Conditions</h3>
          </div>
          <div className="p-4 bg-white text-gray-700 w-full">
            <div className="whitespace-normal break-words text-2xl" dangerouslySetInnerHTML={{ __html: initialData.termsconditions || '' }}></div>
          </div>
        </div>

        {/* Cancellation Policy Section */}
        <div className="break-inside-avoid rounded-lg overflow-hidden shadow-lg bg-gradient-to-r from-red-500 to-orange-500 text-white w-full mt-4">
          <div className="flex items-center space-x-2 p-4">
            <XCircleIcon className="w-6 h-6 text-white" />
            <h3 className="text-2xl font-semibold">Cancellation Policy</h3>
          </div>
          <div className="p-4 bg-white text-gray-700 w-full">
            <div className="whitespace-normal break-words text-2xl" dangerouslySetInnerHTML={{ __html: initialData.cancellationPolicy || '' }}></div>
          </div>
        </div>

        {/* Airline Cancellation Policy Section */}
        <div className="break-inside-avoid rounded-lg overflow-hidden shadow-lg bg-gradient-to-r from-red-500 to-orange-500 text-white w-full mt-4">
          <div className="flex items-center space-x-2 p-4">
            <PlaneIcon className="w-6 h-6 text-white" />
            <h3 className="text-2xl font-semibold">Airline Cancellation Policy</h3>
          </div>
          <div className="p-4 bg-white text-gray-700 w-full">
            <div className="whitespace-normal break-words text-2xl" dangerouslySetInnerHTML={{ __html: initialData.airlineCancellationPolicy || '' }}></div>
          </div>
        </div>


      </div>
    </div>
  );
};
