'use client'
import Image from 'next/image';
import Link from 'next/link';
import { PlaneTakeoffIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Location, Images, Hotel, TourPackageQuery, Itinerary, FlightDetails, Activity } from "@prisma/client";
import { useSearchParams } from 'next/navigation'
import { format, parseISO } from 'date-fns';


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
  selectedOption?: string; // Add this line to accept the selected option

};

// Define a type for the company information
type CompanyInfo = {
  [key: string]: {
    logo: string;
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
  };
};

// Define the company data using the CompanyInfo type
const companyInfo: CompanyInfo = {
  Empty: { logo: '', name: '', address: '', phone: '', email: '', website: '' },
  AH: {
    logo: '/aagamholidays.png',
    name: 'Aagam Holidays',
    address: '1203, PNTC, Times of India Press Road, Satellite, Ahmedabad - 380015, Gujarat, India',
    phone: '+91-97244 44701',
    email: 'info@aagamholidays.com', // Add the missing fields
    website: 'https://aagamholidays.com',
  },
  // Define KH and MT with their respective details
  KH: {
    logo: '/kobawala.png',
    name: 'Kobawala Holidays',
    address: 'Kobawala holidays, 25 Sarthak Shri Ganesh, K-Raheja road, Koba, Gandhinagar-382007',
    phone: '+91-99040 35277',
    email: 'kobawala.holiday@gmail.com', // Add the missing fields
    website: 'http://kobawalaholidays.com'
  },
  MT: {
    logo: '/mahavirtravels.png',
    name: 'Mahavir Tour and Travels',
    address: 'Mahavir Travels, Ahmedabad',
    phone: '+91-97244 44701',
    email: 'info@aagamholidays.com', // Add the missing fields
    website: 'https://mahavirtravels.com',
  },
};

// ...rest of your component


export const TourPackageQueryDisplay: React.FC<TourPackageQueryDisplayProps> = ({
  initialData,
  locations,
  hotels,
  // selectedOption = 'Empty', // Provide a default value
}) => {

  const searchParams = useSearchParams();
  const selectedOption = searchParams.get('search') || 'Empty'; // 'option' is the name of your query parameter

  // Now you can use selectedOption to get data from your companyInfo object
  const currentCompany = companyInfo[selectedOption] ?? companyInfo['Empty'];

  if (!initialData) return <div>No data available</div>;

  return (
    <div className="flex flex-col space-y-2 md:space-y-4 px-4 sm:px-2 md:px-8 lg:px-40">

      <Card className="break-inside-avoid font-bold">
        <CardHeader>
          <CardTitle>{initialData.tourPackageQueryName}</CardTitle>
          <CardDescription>{initialData.tourPackageQueryNumber}</CardDescription>

          <CardDescription>
            Customer: {initialData.customerName} | {initialData.customerNumber} |
            Assigned To: {initialData.assignedTo} | {initialData.assignedToMobileNumber}
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
      <Card className="break-inside-avoid">
        <CardHeader>

        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="font-semibold">Location : {locations.find(location => location.id === initialData.locationId)?.label}</div>
            </div>
            <div>
              {initialData.numDaysNight !== '' && (
                <div className="font-semibold">Duration : {initialData.numDaysNight}</div>
              )}
            </div>

            <div>
              {initialData.period !== '' && (
                <div className="font-semibold">
                  Period : {
                    (() => {
                      try {
                        const periodData = initialData.period ? JSON.parse(initialData.period) : null;
                        if (periodData) {
                          const { from, to } = periodData;
                          const fromDate = format(parseISO(from), 'dd-MM-yyyy');
                          const toDate = format(parseISO(to), 'dd-MM-yyyy');
                          return `${fromDate} To ${toDate}`;
                        } else {
                          return initialData.period;
                        }
                      } catch (error) {
                        console.error("Error parsing period:", error);
                        return initialData.period; // Return the original value if parsing fails
                      }
                    })()
                  }
                </div>
              )}
            </div>
            <div>
              {initialData.transport !== '' && (
                <div className="font-semibold">Transport  : {initialData.transport}</div>
              )}
            </div>
            <div>
              {initialData.pickup_location !== '' && (
                <div className="font-semibold">Pickup  : {initialData.pickup_location}</div>
              )}
            </div>
            <div>
              {initialData.drop_location !== '' && (
                <div className="font-semibold">Drop  : {initialData.drop_location}</div>
              )}
            </div>
            <div>
              {initialData.numAdults !== '' && (
                <div className="font-semibold">Adults : {initialData.numAdults}</div>
              )}
            </div>
            <div>
              {initialData.numChild5to12 !== '' && (
                <div className="font-semibold">Children (5 - 12 Years) : {initialData.numChild5to12}</div>
              )}

            </div>
            <div>
              {initialData.numChild0to5 !== '' && (
                <div className="font-semibold">Children (0 - 5 Years) : {initialData.numChild0to5}</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="break-inside-avoid">
        <CardHeader>

        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {selectedOption !== 'Supplier' && (
              <>
                {initialData.pricePerAdult !== '' && (
                  <div>
                    <div className="font-semibold">Price per Adult : {initialData.pricePerAdult}</div>
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
                )}
                {initialData.totalPrice !== '' && (
                  <div>
                    <div className="font-semibold">Total Price : {initialData.totalPrice}</div>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>

      </Card >

      {/* Flight Details */}
      {
        initialData.flightDetails.length > 0 && (

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
        )
      }


      {/* Itineraries */}
      {
        initialData.itineraries && initialData.itineraries.map((itinerary, index) => (
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
                <div className="font-bold">{itinerary.itineraryTitle}</div>
                <div>
                  {itinerary.itineraryDescription && <p className="text-sm mb-4">{itinerary.itineraryDescription}</p>}
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
                        <div className="font-bold">Number of Rooms :</div>
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
              {itinerary.activities && itinerary.activities.length > 0 && (
                <Card className="break-inside-avoid">
                  <CardHeader>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      {/* Title */}
                      <div className="mb-4">
                        <h2 className="font-bold text-xl">Activities</h2>
                      </div>
                      {/* Activities List */}
                      {itinerary.activities.map((activity, activityIndex) => (
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
                            <div className="font-bold">{activity.activityTitle}</div>
                            <p className="text-sm">{activity.activityDescription}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        ))
      }



      <div className="grid gap-4">
        {/* Inclusions Card */}
        <Card className="break-inside-avoid">
          <CardHeader>
            <CardTitle>Inclusions</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap">{initialData.inclusions}</pre>
          </CardContent>
        </Card>

        {/* Exclusions Card */}
        <Card className="break-inside-avoid">
          <CardHeader>
            <CardTitle>Exclusions</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap">{initialData.exclusions}</pre>
          </CardContent>
        </Card>

        <Card className="break-inside-avoid">
          <CardHeader>
            <CardTitle>Important Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap">{initialData.importantNotes}</pre>
          </CardContent>
        </Card>



        {/* Payment Policy Card */}
        <Card className="break-inside-avoid">
          <CardHeader>
            <CardTitle>Payment Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap">{initialData.paymentPolicy}</pre>
          </CardContent>
        </Card>

        {/* Useful Tips Card */}
        <Card className="break-inside-avoid">
          <CardHeader>
            <CardTitle>Useful Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap">{initialData.usefulTip}</pre>
          </CardContent>
        </Card>

        {/* Cancellation Policy Card */}
        <Card className="break-inside-avoid">
          <CardHeader>
            <CardTitle>Cancellation Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap">{initialData.cancellationPolicy}</pre>
          </CardContent>
        </Card>

        {/* Airline Cancellation Policy Card */}
        <Card className="break-inside-avoid">
          <CardHeader>
            <CardTitle>Airline Cancellation Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap">{initialData.airlineCancellationPolicy}</pre>
          </CardContent>
        </Card>

        {/* Terms and Conditions Card */}
        <Card className="break-inside-avoid">
          <CardHeader>
            <CardTitle>Terms and Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap ">{initialData.termsconditions}</pre>
          </CardContent>
        </Card>
      </div>

      {selectedOption !== 'Empty' && (

        <Card className="border-b">
          <CardDescription className="flex justify-between items-center px-4">
            <div className="inline-block relative w-48 h-48">
              <Image src={currentCompany.logo} alt={`${currentCompany.name} Logo`} fill className="object-contain" />
            </div>
            <ul>
              <li>{currentCompany.address}</li>
              <li>Phone: {currentCompany.phone}</li>
              <li>Email: <Link href={`mailto:${currentCompany.email}`} className="text-blue-600 underline">{currentCompany.email}</Link></li>
              <li>Website: <Link href={currentCompany.website || '#'} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{currentCompany.website}</Link></li>

            </ul>
          </CardDescription>
        </Card >
      )}

      {/* Footer Section with Company Details */}


    </div >
  );
};
