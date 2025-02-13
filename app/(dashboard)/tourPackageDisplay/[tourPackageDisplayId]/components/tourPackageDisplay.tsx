import Image from 'next/image';
import { CheckCircleIcon, CreditCardIcon, InfoIcon, PlaneIcon, PlaneTakeoffIcon, Shield, XCircleIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Location, Images, Hotel, TourPackage, Itinerary, FlightDetails, Activity } from "@prisma/client";
import Link from 'next/link';


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

  const currentCompany = {
    logo: '/aagamholidays.png',
    name: 'Aagam Holidays',
    address: '1203, PNTC, Times of India Press Road, Satellite, Ahmedabad - 380015, Gujarat, India',
    phone: '+91-97244 44701',
    email: 'info@aagamholidays.com', // Add the missing fields
    website: 'https://aagamholidays.com',
  };
  if (!initialData) return <div>No data available</div>;

  return (
    <div className="flex flex-col space-y-2 md:space-y-4 px-4 sm:px-2 md:px-8 lg:px-40">
      <Card className="break-inside-avoid font-bold">
        <CardHeader className="bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-t-lg flex justify-between items-center">
          <CardTitle className="flex items-center justify-between text-xl font-bold">
            {initialData.tourPackageName}
          </CardTitle>
          <CardTitle className="flex items-center justify-between text-xl font-bold">
            {initialData.tourPackageType}
          </CardTitle>
          <CardTitle className="flex items-center justify-between text-xl font-bold">
            Location : {locations.find(location => location.id === initialData.locationId)?.label}
          </CardTitle>
        </CardHeader>
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
      </Card>

      {/* Tour Package Details */}
      <Card className="break-inside-avoid border shadow-lg rounded-lg">
        <CardHeader className="p-6 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-t-lg">
          <h2 className="text-xl font-bold">Tour Information</h2>
        </CardHeader>

        <CardContent className="p-6">
          {initialData.numDaysNight && (
            <div className="mb-4">
              <div className="font-semibold text-xl">
                Duration:
                <span className="ml-2 text-xl text-gray-900">{initialData.numDaysNight}</span>
              </div>
            </div>
          )}

          {initialData.transport && (
            <div className="mb-4">
              <div className="font-semibold text-xl">
                Transport:
                <span className="ml-2 text-xl text-gray-900">{initialData.transport}</span>
              </div>
            </div>
          )}

          {initialData.pickup_location && (
            <div className="mb-4">
              <div className="font-semibold text-xl">
                Pickup:
                <span className="ml-2 text-xl text-gray-900">{initialData.pickup_location}</span>
              </div>
            </div>
          )}

          {initialData.drop_location && (
            <div className="mb-4">
              <div className="font-semibold text-xl">
                Drop:
                <span className="ml-2 text-xl text-gray-900">{initialData.drop_location}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="break-inside-avoid">
        <Card className="border shadow-lg rounded-lg">
          <CardHeader className="p-6 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-t-lg">
            <h2 className="text-xl font-bold">Tour Pricing</h2>
          </CardHeader>

          {initialData.price && initialData.price !== ' ' && (
            <Card className="grid gap-4 border rounded-lg shadow-lg p-6">
              <CardContent>
                <div className="font-semibold text-xl text-gray-900 bg-gray-100 p-4 rounded-lg shadow-sm">
                  <span className="text-orange-500" dangerouslySetInnerHTML={{ __html: initialData.price || '' }} />
                </div>
              </CardContent>
            </Card>
          )}

          <CardContent className="p-6">
            <div className="grid gap-6 text-gray-700">
              {/* Price per Adult Section */}
              {initialData.pricePerAdult !== '' && (
                <div className="md:col-span-1">
                  <div className="font-semibold text-xl bg-gray-100 p-4 rounded-lg shadow-sm">
                    <span className="block text-gray-900">Price per Adult:</span>
                    <span className="text-xl font-normal text-gray-700">{initialData.pricePerAdult}</span>
                  </div>
                </div>
              )}

              {/* Price for Children Section */}
              <div className="md:col-span-1 space-y-4">
                {initialData.pricePerChildOrExtraBed !== '' && (
                  <div className="font-semibold text-xl bg-gray-100 p-4 rounded-lg shadow-sm">
                    <span className="block text-gray-900">Price for Triple Occupancy:</span>
                    <span className="text-xl font-normal text-gray-700">{initialData.pricePerChildOrExtraBed}</span>
                  </div>
                )}
                {initialData.pricePerChild5to12YearsNoBed !== '' && (
                  <div className="font-semibold text-xl bg-gray-100 p-4 rounded-lg shadow-sm">
                    <span className="block text-gray-900">Price per Child (5-12 Years - No bed):</span>
                    <span className="text-xl font-normal text-gray-700">{initialData.pricePerChild5to12YearsNoBed}</span>
                  </div>
                )}
                {initialData.pricePerChildwithSeatBelow5Years !== '' && (
                  <div className="font-semibold text-xl bg-gray-100 p-4 rounded-lg shadow-sm">
                    <span className="block text-gray-900">Price per Child with Seat (Below 5 Years):</span>
                    <span className="text-xl font-normal text-gray-700">{initialData.pricePerChildwithSeatBelow5Years}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {initialData.totalPrice && initialData.totalPrice !== ' ' && (
          <Card className="grid gap-4 border rounded-lg shadow-lg p-6">
            <CardContent>
              <div className="font-semibold text-xl text-gray-900 bg-gray-100 p-4 rounded-lg shadow-sm">
                Total Price: <span className="text-orange-500" dangerouslySetInnerHTML={{ __html: initialData.totalPrice || ' ' }} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tour Highlights */}

      <Card className="break-inside-avoid border rounded-lg">
        <CardTitle className="text-4xl font-bold shadow-lg p-4 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 text-white text-center">Tour Highlights</CardTitle>
        {initialData.itineraries && initialData.itineraries.map((itinerary, index) => (
          <div key={index} className="mb-4 break-inside-avoid bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 rounded-t-lg">
              {/* Day and Title grouped */}
              <div>
                <CardTitle className="text-xl font-bold"
                  dangerouslySetInnerHTML={{
                    __html: `Day ${itinerary.dayNumber} : ${itinerary.days} - ${itinerary.itineraryTitle?.replace(/^<p>/, '').replace(/<\/p>$/, '')}` || '',
                  }} />
              </div>
            </div>
          </div>
        ))}
      </Card>

      {/* Flight Details */}
      {initialData.flightDetails && initialData.flightDetails.length > 0 && (
        <Card className="break-inside-avoid border rounded-lg shadow-lg p-6">
          <CardHeader className="p-4 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-t-lg">
            <CardTitle className="text-xl font-bold">Flight Details</CardTitle>
          </CardHeader>
          {initialData.flightDetails.map((flight, index) => (
            <CardContent key={index} className="bg-gray-100 rounded-lg shadow-sm p-4 my-4">
              <div className="flex items-center justify-between border-b pb-2 mb-2">
                <span className="font-semibold text-xl text-gray-700">{flight.date}</span>
                <div className="text-xl text-gray-700">
                  <span className="font-semibold">{flight.flightName}</span> |
                  <span className="ml-1">{flight.flightNumber}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="font-bold text-xs text-gray-700">{flight.from}</div>
                  <div className="text-xs text-gray-600 ml-2">{flight.departureTime}</div>
                </div>
                <div className="mx-2 text-center">
                  <span className="text-gray-600"><PlaneTakeoffIcon /></span>
                  <div className="text-xs text-gray-600">{flight.flightDuration}</div>
                  <hr className="border-t-2 border-gray-400 mx-1" />
                </div>
                <div className="flex items-center">
                  <div className="font-bold text-xs text-gray-700">{flight.to}</div>
                  <div className="text-xs text-gray-600 ml-2">{flight.arrivalTime}</div>
                </div>
              </div>
            </CardContent>
          ))}
        </Card>
      )}




      {/* Itineraries */}
      {initialData.itineraries && initialData.itineraries.map((itinerary, index) => (

        <Card key={index} className="mb-4 break-inside-avoid bg-white shadow-lg rounded-lg overflow-hidden">
          {index === 0 &&
            <Card className="border rounded-lg shadow-lg p-4 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 text-white text-center break-before-always">
              <CardTitle className="text-4xl font-bold">Itinerary</CardTitle>
            </Card>}
          <div className="flex items-center justify-between bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 text-white p-4 rounded-t-lg">
            {/* Day and Title grouped */}


            <div>
              <CardTitle className="text-xl font-bold"
                dangerouslySetInnerHTML={{
                  __html: `Day ${itinerary.dayNumber} : ${itinerary.days} - ${itinerary.itineraryTitle?.replace(/^<p>/, '').replace(/<\/p>$/, '')}` || '',
                }} />
            </div>
          </div>

          {/* Fixed Size Image Section */}
          <div className="flex justify-center items-center break-inside-avoid">
            {itinerary.itineraryImages && itinerary.itineraryImages.length > 0 && itinerary.itineraryImages.map((image, imageIndex) => (
              <div key={imageIndex} className="w-full h-[500px]">
                <Image
                  src={image.url}
                  alt={`Itinerary Image ${imageIndex + 1}`}
                  width={1200}
                  height={500}
                  className="object-cover w-full h-full"
                />
              </div>
            ))}
          </div>

          {/* Description Section */}
          <div className="flex-grow p-8">
            <div className="text-xl text-justify mb-4" dangerouslySetInnerHTML={{ __html: itinerary.itineraryDescription || '' }}></div>
          </div>

          <CardContent className="p-8">
            {/* Hotel Section */}
            {itinerary.hotelId && hotels.find(hotel => hotel.id === itinerary.hotelId) && (
              <Card className="my-4">
                <CardHeader className="bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 text-white p-4 text-xl font-bold text-center rounded-t-lg">
                  Hotel Details
                </CardHeader>
                <div className="p-4">
                  {/* Hotel Images */}
                  {hotels.find(hotel => hotel.id === itinerary.hotelId)?.images.length === 1 ? (
                    <div className="flex items-start mb-4">
                      <Link href={hotels.find(hotel => hotel.id === itinerary.hotelId)?.link || '#'} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                        <div className="w-[250px] h-[250px]">
                          <Image
                            src={hotels.find(hotel => hotel.id === itinerary.hotelId)?.images[0].url || ''}
                            alt="Hotel Image"
                            className="rounded-lg object-cover w-full h-full"
                            width={250}
                            height={250}
                          />
                        </div>
                      </Link>
                      {/* Hotel Text Content */}
                      <div className="ml-4">
                        <div className="text-xl font-bold">Hotel Name:</div>
                        <Link href={hotels.find(hotel => hotel.id === itinerary.hotelId)?.link || '#'} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                          <p className="text-xl mb-2">{hotels.find(hotel => hotel.id === itinerary.hotelId)?.name}</p>
                        </Link>

                        {itinerary.roomCategory && (
                          <>
                            <div className="text-xl font-bold">Room Category:</div>
                            <p className="text-xl mb-2">{itinerary.roomCategory}</p>
                          </>
                        )}

                        {itinerary.mealsIncluded && (
                          <>
                            <div className="text-xl font-bold">Meal Plan:</div>
                            <p className="text-xl mb-2">{itinerary.mealsIncluded}</p>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="grid grid-cols-3 gap-4">
                        {hotels.find(hotel => hotel.id === itinerary.hotelId)?.images.map((image, imgIndex) => (
                          <Link key={imgIndex} href={hotels.find(hotel => hotel.id === itinerary.hotelId)?.link || '#'} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                            <div className="w-[250px] h-[250px]">
                              <Image
                                src={image.url}
                                alt={`Hotel Image ${imgIndex + 1}`}
                                className="rounded-lg object-cover w-full h-full"
                                width={250}
                                height={250}
                              />
                            </div>
                          </Link>
                        ))}
                      </div>
                      <div className="ml-4">
                        <div className="text-xl font-bold">Hotel Name:</div>
                        <Link href={hotels.find(hotel => hotel.id === itinerary.hotelId)?.link || '#'} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                          <p className="text-xl mb-2">{hotels.find(hotel => hotel.id === itinerary.hotelId)?.name}</p>
                        </Link>
                        {itinerary.numberofRooms && (
                          <>
                            <div className="text-xl font-bold">Number of Rooms:</div>
                            <p className="text-xl mb-2">{itinerary.numberofRooms}</p>
                          </>
                        )}

                        {itinerary.mealsIncluded && (
                          <>
                            <div className="text-xl font-bold">Meal Plan:</div>
                            <p className="text-xl mb-2">{itinerary.mealsIncluded}</p>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Activities Section */}
            {itinerary.activities && itinerary.activities.length > 0 && (
              <Card className="my-4">
                <CardHeader className="bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 text-white p-4 text-xl font-bold text-center rounded-t-lg">
                  Activities
                </CardHeader>
                <CardContent className="p-4">
                  <div className="grid gap-4">
                    {itinerary.activities.map((activity, activityIndex) => (
                      <div key={activityIndex} className="mb-4">
                        {activity.activityImages && activity.activityImages.length === 1 ? (
                          <div className="flex items-start mb-4 w-full">
                            <div className="w-[250px] h-[250px] flex-shrink-0">
                              <Image
                                src={activity.activityImages[0].url}
                                alt={`Activity Image ${activityIndex + 1}`}
                                className="rounded-lg object-cover w-full h-full"
                                width={250}
                                height={250}
                              />
                            </div>
                            <div className="ml-4 w-full">
                              <div className="text-3xl font-bold" dangerouslySetInnerHTML={{ __html: activity.activityTitle || '' }}></div>
                              <p className="text-xl text-justify" dangerouslySetInnerHTML={{ __html: activity.activityDescription || '' }}></p>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full">
                            <div className="flex justify-start items-center mb-4 gap-4">
                              {activity.activityImages && activity.activityImages.map((image, actImgIndex) => (
                                <div key={actImgIndex} className="w-[250px] h-[250px] flex-shrink-0">
                                  <Image
                                    src={image.url}
                                    alt={`Activity Image ${actImgIndex + 1}`}
                                    className="rounded-lg object-cover w-full h-full"
                                    width={250}
                                    height={250}
                                  />
                                </div>
                              ))}
                            </div>
                            <div className="text-3xl font-bold" dangerouslySetInnerHTML={{ __html: activity.activityTitle || '' }}></div>
                            <p className="text-xl text-justify" dangerouslySetInnerHTML={{ __html: activity.activityDescription || '' }}></p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

          </CardContent>
        </Card>
      ))}

      {/* Inclusions Card */}
      <div className="break-inside-avoid rounded-lg overflow-hidden shadow-lg bg-gradient-to-r from-red-500 to-orange-500 text-white w-full mt-4">
        <div className="flex items-center space-x-2 p-4">
          <CheckCircleIcon className="w-6 h-6 text-white" />
          <h3 className="text-xl font-semibold">Inclusions</h3>
        </div>
        <div className="p-4 bg-white text-gray-700">
          <div className="max-w-full overflow-hidden">
            <div
              dangerouslySetInnerHTML={{ __html: initialData.inclusions || '' }}
              className="whitespace-normal break-words text-xl"
            ></div>
          </div>
        </div>
      </div>
      {/* Exclusions Card */}
      {/* Example for Exclusions Section */}
      <div className="break-inside-avoid rounded-lg overflow-hidden shadow-lg bg-gradient-to-r from-red-500 to-orange-500 text-white w-full mt-4">
        <div className="flex items-center space-x-2 p-4">
          <XCircleIcon className="w-6 h-6 text-white" />
          <h3 className="text-xl font-semibold">Exclusions</h3>
        </div>
        <div className="p-4 bg-white text-gray-700">
          <div className="max-w-full overflow-hidden">
            <div
              dangerouslySetInnerHTML={{ __html: initialData.exclusions || '' }}
              className="whitespace-normal break-words text-xl"
            ></div>
          </div>
        </div>
      </div>

      {/* Important Notes Section */}
      <div className="break-inside-avoid rounded-lg overflow-hidden shadow-lg bg-gradient-to-r from-red-500 to-orange-500 text-white w-full mt-4">
        <div className="flex items-center space-x-2 p-4">
          <InfoIcon className="w-6 h-6 text-white" />
          <h3 className="text-xl font-semibold">Important Notes</h3>
        </div>
        <div className="p-4 bg-white text-gray-700 w-full">
          <div className="whitespace-normal break-words text-xl" dangerouslySetInnerHTML={{ __html: initialData.importantNotes || '' }}></div>
        </div>
      </div>

      {/* Payment Policy Section */}
      <div className="break-inside-avoid rounded-lg overflow-hidden shadow-lg bg-gradient-to-r from-red-500 to-orange-500 text-white w-full mt-4">
        <div className="flex items-center space-x-2 p-4">
          <CreditCardIcon className="w-6 h-6 text-white" />
          <h3 className="text-xl font-semibold">Payment Policy</h3>
        </div>
        <div className="p-4 bg-white text-gray-700 w-full">
          <div className="whitespace-normal break-words text-xl" dangerouslySetInnerHTML={{ __html: initialData.paymentPolicy || '' }}></div>
        </div>
      </div>

      {/* Terms and Conditions Section */}
      <div className="break-inside-avoid rounded-lg overflow-hidden shadow-lg bg-gradient-to-r from-red-500 to-orange-500 text-white w-full mt-4">
        <div className="flex items-center space-x-2 p-4">
          <Shield className="w-6 h-6 text-white" />
          <h3 className="text-xl font-semibold">Terms and Conditions</h3>
        </div>
        <div className="p-4 bg-white text-gray-700 w-full">
          <div className="whitespace-normal break-words text-xl" dangerouslySetInnerHTML={{ __html: initialData.termsconditions || '' }}></div>
        </div>
      </div>

      {/* Cancellation Policy Section */}
      <div className="break-inside-avoid rounded-lg overflow-hidden shadow-lg bg-gradient-to-r from-red-500 to-orange-500 text-white w-full mt-4">
        <div className="flex items-center space-x-2 p-4">
          <XCircleIcon className="w-6 h-6 text-white" />
          <h3 className="text-xl font-semibold">Cancellation Policy</h3>
        </div>
        <div className="p-4 bg-white text-gray-700 w-full">
          <div className="whitespace-normal break-words text-xl" dangerouslySetInnerHTML={{ __html: initialData.cancellationPolicy || '' }}></div>
        </div>
      </div>

      {/* Airline Cancellation Policy Section */}
      <div className="break-inside-avoid rounded-lg overflow-hidden shadow-lg bg-gradient-to-r from-red-500 to-orange-500 text-white w-full mt-4">
        <div className="flex items-center space-x-2 p-4">
          <PlaneIcon className="w-6 h-6 text-white" />
          <h3 className="text-xl font-semibold">Airline Cancellation Policy</h3>
        </div>
        <div className="p-4 bg-white text-gray-700 w-full">
          <div className="whitespace-normal break-words text-xl" dangerouslySetInnerHTML={{ __html: initialData.airlineCancellationPolicy || '' }}></div>
        </div>
      </div>
      <Card className="border-b break-inside-avoid m-2">
        <CardDescription className="flex justify-between items-center px-4">
          <div className="inline-block relative w-48 h-48">
            <Image src={currentCompany.logo} alt={`${currentCompany.name} Logo`} fill className="object-contain" />
          </div>
          <ul className='font-bold'>
            <li>{currentCompany.address}</li>
            <li>Phone: {currentCompany.phone}</li>
            <li>Email: <Link href={`mailto:${currentCompany.email}`} className="text-blue-600 underline">{currentCompany.email}</Link></li>
            <li>Website: <Link href={currentCompany.website || '#'} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{currentCompany.website}</Link></li>

          </ul>
        </CardDescription>
      </Card >
    </div>
  );
}
