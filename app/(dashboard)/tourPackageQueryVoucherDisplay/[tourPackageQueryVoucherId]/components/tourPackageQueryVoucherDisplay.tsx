'use client'
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircleIcon, CreditCardIcon, InfoIcon, PlaneIcon, PlaneTakeoffIcon, Shield, XCircleIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Location, Images, Hotel, TourPackageQuery, Itinerary, FlightDetails, Activity } from "@prisma/client";
import { useSearchParams } from 'next/navigation';
import { table } from 'console';
import { format, parseISO } from 'date-fns';

interface TourPackageQueryVoucherDisplayProps {
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



export const TourPackageQueryVoucherDisplay: React.FC<TourPackageQueryVoucherDisplayProps> = ({
  initialData,
  locations,
  hotels,
}) => {

  const searchParams = useSearchParams();
  const selectedOption = searchParams.get('search') || 'Empty'; // 'option' is the name of your query parameter

  // Now you can use selectedOption to get data from your companyInfo object
  const currentCompany = companyInfo[selectedOption] ?? companyInfo['Empty'];


  if (!initialData) return <div>No data available</div>;

  return (
    <div className="flex flex-col space-y-2 md:space-y-4 px-4 sm:px-2 md:px-8 lg:px-40">
      {/* Tour Images */}
      <Card className="break-inside-avoid font-bold">
        <CardHeader className="bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-t-lg flex justify-between items-center">
          <CardTitle className="flex items-center justify-between text-2xl font-bold">
            <span>Booking Voucher</span>
          </CardTitle>
        </CardHeader>
      </Card>

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

      <Card className="break-inside-avoid">
        <CardHeader>
          <div>
            <CardDescription className="text-2xl font-bold  mb-4">
              {initialData.tourPackageQueryNumber}
            </CardDescription>
            <CardDescription className="text-xl font-bold  mb-4">
              {initialData.tourPackageQueryName}
            </CardDescription>
            <CardDescription className="text-xl font-bold  mb-4">
              {initialData.tourPackageQueryType}
            </CardDescription>

            {selectedOption !== 'SupplierA' && selectedOption !== "SupplierB" && (
              <CardDescription className="text-xl">
                <div className="mb-2">
                  <span className="font-bold">Customer:</span> {initialData.customerName} | {initialData.customerNumber}
                </div>
                <div>
                  <span className="font-bold">Assigned To:</span> {initialData.assignedTo} | {initialData.assignedToMobileNumber} | {initialData.assignedToEmail}
                </div>
              </CardDescription>
            )}
          </div>
        </CardHeader>


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
      </Card>

      {/* Tour Package Details */}
      <Card className="break-inside-avoid border shadow-lg rounded-lg">
        <CardHeader className="p-6 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-t-lg">
          <h2 className="text-2xl font-bold">Tour Information</h2>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid gap-6 md:grid-cols-1 text-gray-700">
            <div className="mb-4">
              <div className="font-semibold text-xl">
                Location:
                <span className="ml-2 text-2xl text-gray-900">
                  {locations.find(location => location.id === initialData.locationId)?.label}
                </span>
              </div>
            </div>

            {initialData.numDaysNight && (
              <div className="mb-4">
                <div className="font-semibold text-xl">
                  Duration:
                  <span className="ml-2 text-2xl text-gray-900">{initialData.numDaysNight}</span>
                </div>
              </div>
            )}

            <div className="flex mb-4">
              {initialData.tourStartsFrom && (
                <div className="font-semibold text-xl">
                  Period:
                  <span className="ml-2 text-2xl text-gray-900">{format(initialData.tourStartsFrom, 'dd-MM-yyyy')}</span>
                </div>
              )}
              {initialData.tourEndsOn && (
                <div className="ml-4 font-semibold text-xl">
                  To:
                  <span className="ml-2 text-2xl text-gray-900">{format(initialData.tourEndsOn, 'dd-MM-yyyy')}</span>
                </div>
              )}
            </div>

            {initialData.transport && (
              <div className="mb-4">
                <div className="font-semibold text-xl">
                  Transport:
                  <span className="ml-2 text-2xl text-gray-900">{initialData.transport}</span>
                </div>
              </div>
            )}

            {initialData.pickup_location && (
              <div className="mb-4">
                <div className="font-semibold text-xl">
                  Pickup:
                  <span className="ml-2 text-2xl text-gray-900">{initialData.pickup_location}</span>
                </div>
              </div>
            )}

            {initialData.drop_location && (
              <div className="mb-4">
                <div className="font-semibold text-xl">
                  Drop:
                  <span className="ml-2 text-2xl text-gray-900">{initialData.drop_location}</span>
                </div>
              </div>
            )}

            {initialData.numAdults && (
              <div className="mb-4">
                <div className="font-semibold text-xl">
                  Adults:
                  <span className="ml-2 text-2xl text-gray-900">{initialData.numAdults}</span>
                </div>
              </div>
            )}

            {initialData.numChild5to12 && (
              <div className="mb-4">
                <div className="font-semibold text-xl">
                  Children (5 - 12 Years):
                  <span className="ml-2 text-2xl text-gray-900">{initialData.numChild5to12}</span>
                </div>
              </div>
            )}

            {initialData.numChild0to5 && (
              <div className="mb-4">
                <div className="font-semibold text-xl">
                  Children (0 - 5 Years):
                  <span className="ml-2 text-2xl text-gray-900">{initialData.numChild0to5}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>



      {selectedOption !== 'SupplierA' && selectedOption !== 'SupplierB' && selectedOption !== 'Empty' && (
        <Card className="break-inside-avoid border shadow-lg rounded-lg">
          <CardHeader className="p-6 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-t-lg">
            <h2 className="text-2xl font-bold">Tour Pricing</h2>
          </CardHeader>

          {initialData.price && selectedOption !== 'Empty' && selectedOption !== 'SupplierA' && selectedOption !== 'SupplierB' && initialData.price !== ' ' && (
            <Card className="grid gap-4 border rounded-lg shadow-lg p-6">
              <CardContent>
                <div className="font-semibold text-2xl text-gray-900 bg-gray-100 p-4 rounded-lg shadow-sm">
                  <span className="text-orange-500" dangerouslySetInnerHTML={{ __html: initialData.price || '' }} />
                </div>
              </CardContent>
            </Card>
          )}

          <CardContent className="p-6">
            <div className="grid gap-6 md:grid-cols-2 text-gray-700">
              {/* Price per Adult Section */}
              {initialData.pricePerAdult !== '' && (
                <div className="md:col-span-1">
                  <div className="font-semibold text-xl bg-gray-100 p-4 rounded-lg shadow-sm">
                    <span className="block text-gray-900">Price per Adult:</span>
                    <span className="text-2xl font-normal text-gray-700">{initialData.pricePerAdult}</span>
                  </div>
                </div>
              )}

              {/* Price for Children Section */}
              <div className="md:col-span-1 space-y-4">
                {initialData.pricePerChildOrExtraBed !== '' && (
                  <div className="font-semibold text-xl bg-gray-100 p-4 rounded-lg shadow-sm">
                    <span className="block text-gray-900">Price for Triple Occupancy:</span>
                    <span className="text-2xl font-normal text-gray-700">{initialData.pricePerChildOrExtraBed}</span>
                  </div>
                )}
                {initialData.pricePerChild5to12YearsNoBed !== '' && (
                  <div className="font-semibold text-xl bg-gray-100 p-4 rounded-lg shadow-sm">
                    <span className="block text-gray-900">Price per Child (5-12 Years - No bed):</span>
                    <span className="text-2xl font-normal text-gray-700">{initialData.pricePerChild5to12YearsNoBed}</span>
                  </div>
                )}
                {initialData.pricePerChildwithSeatBelow5Years !== '' && (
                  <div className="font-semibold text-xl bg-gray-100 p-4 rounded-lg shadow-sm">
                    <span className="block text-gray-900">Price per Child with Seat (Below 5 Years):</span>
                    <span className="text-2xl font-normal text-gray-700">{initialData.pricePerChildwithSeatBelow5Years}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {initialData.totalPrice && selectedOption !== 'SupplierA' && selectedOption !== 'SupplierB' && selectedOption !== 'Empty' && initialData.totalPrice !== ' ' && (
        <Card>
          <CardContent>
            <div className="font-semibold text-2xl text-gray-900 bg-gray-100 p-4 rounded-lg shadow-sm">
              Total Price: <span className="text-orange-500">{initialData.totalPrice}</span>
            </div>
          </CardContent>
        </Card>
      )}



      {initialData.remarks !== '' && (
        <Card className="break-inside-avoid text-3xl">
          <CardContent>
            <div>
              <div dangerouslySetInnerHTML={{ __html: initialData.remarks || '' }}></div>
            </div>
          </CardContent>
        </Card>
      )}


      {/* Itineraries */}
      <Card className="break-inside-avoid border shadow-lg rounded-lg">
        <CardHeader className="p-6 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-t-lg">
          <h2 className="text-2xl font-bold">Short Itinerary</h2>
        </CardHeader>

        {
          initialData.itineraries && initialData.itineraries.map((itinerary, index) => {
            // Remove the initial <p> tag and any closing tags
            const cleanedTitle = itinerary.itineraryTitle?.replace(/^<p>/, '').replace(/<\/p>$/, '');
            return (
              <CardHeader key={index} className="d-flex align-items-center border-b border-gray-300 px-4 py-2">
                <div className="flex-grow-1 font-semibold" dangerouslySetInnerHTML={{ __html: `Day ${itinerary.dayNumber} : ${itinerary.days} - ${cleanedTitle || ''}` }} />
              </CardHeader>
            );
          })
        }
      </Card>

      {/* Flight Details */}
      {initialData.flightDetails && selectedOption !== 'SupplierA' && selectedOption !== 'SupplierB' && initialData.flightDetails.length > 0 && (
        <Card className="break-inside-avoid border rounded-lg shadow-lg p-6">
          <CardHeader className="p-4 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-t-lg">
            <CardTitle className="text-2xl font-bold">Flight Details</CardTitle>
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


      {/* Itineraries and Hotel Details */}
      {initialData.itineraries && initialData.itineraries.length > 0 && (
        <Card className="break-inside-avoid border shadow-lg rounded-lg">
          <CardHeader className="p-6 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-t-lg">
            <h2 className="text-2xl font-bold">Accomodation Details</h2>
          </CardHeader>
          <CardContent>
            <table className="min-w-full divide-y divide-gray-200 mt-2">
              <thead className="bg-gradient-to-r from-red-500 to-orange-500 text-white">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">
                    Day/Date
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">
                    Hotel Name
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">
                    Number of Rooms
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">
                    Room Category
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">
                    Meal Plan
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {initialData.itineraries.map((itinerary, idx) => {
                  const hotelDetails = hotels.find(hotel => hotel.id === itinerary.hotelId);
                  return (
                    <tr key={idx}>
                      <td className="px-3 py-2 whitespace-normal text-sm font-medium text-gray-900">
                        {itinerary.days ? itinerary.days : itinerary.dayNumber}
                      </td>

                      <td className="px-3 py-2 whitespace-normal text-sm font-medium text-gray-900">
                        <Link href={hotels.find(hotel => hotel.id === itinerary.hotelId)?.link || ''} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                          {hotelDetails?.name}
                        </Link>
                      </td>

                      <td className="px-3 py-2 whitespace-normal text-sm text-gray-500">
                        {itinerary.numberofRooms}
                      </td>
                      <td className="px-3 py-2 whitespace-normal text-sm text-gray-500">
                        {itinerary.roomCategory}
                      </td>
                      <td className="px-3 py-2 whitespace-normal text-sm text-gray-500">
                        {itinerary.mealsIncluded}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
      {/* Payment Policy Card */}


      {/* Inclusions Card */}
      <div className="rounded-lg overflow-hidden shadow-lg bg-gradient-to-r from-red-500 to-orange-500 text-white w-full mt-4">
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
      <div className="rounded-lg overflow-hidden shadow-lg bg-gradient-to-r from-red-500 to-orange-500 text-white w-full mt-4">
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
      <div className="rounded-lg overflow-hidden shadow-lg bg-gradient-to-r from-red-500 to-orange-500 text-white w-full mt-4">
        <div className="flex items-center space-x-2 p-4">
          <InfoIcon className="w-6 h-6 text-white" />
          <h3 className="text-2xl font-semibold">Important Notes</h3>
        </div>
        <div className="p-4 bg-white text-gray-700 w-full">
          <div className="whitespace-normal break-words text-2xl" dangerouslySetInnerHTML={{ __html: initialData.importantNotes || '' }}></div>
        </div>
      </div>

      {/* Payment Policy Section */}
      <div className="rounded-lg overflow-hidden shadow-lg bg-gradient-to-r from-red-500 to-orange-500 text-white w-full mt-4">
        <div className="flex items-center space-x-2 p-4">
          <CreditCardIcon className="w-6 h-6 text-white" />
          <h3 className="text-2xl font-semibold">Payment Policy</h3>
        </div>
        <div className="p-4 bg-white text-gray-700 w-full">
          <div className="whitespace-normal break-words text-2xl" dangerouslySetInnerHTML={{ __html: initialData.paymentPolicy || '' }}></div>
        </div>
      </div>

      {/* Terms and Conditions Section */}
      <div className="rounded-lg overflow-hidden shadow-lg bg-gradient-to-r from-red-500 to-orange-500 text-white w-full mt-4">
        <div className="flex items-center space-x-2 p-4">
          <Shield className="w-6 h-6 text-white" />
          <h3 className="text-2xl font-semibold">Terms and Conditions</h3>
        </div>
        <div className="p-4 bg-white text-gray-700 w-full">
          <div className="whitespace-normal break-words text-2xl" dangerouslySetInnerHTML={{ __html: initialData.termsconditions || '' }}></div>
        </div>
      </div>

      {/* Cancellation Policy Section */}
      <div className="rounded-lg overflow-hidden shadow-lg bg-gradient-to-r from-red-500 to-orange-500 text-white w-full mt-4">
        <div className="flex items-center space-x-2 p-4">
          <XCircleIcon className="w-6 h-6 text-white" />
          <h3 className="text-2xl font-semibold">Cancellation Policy</h3>
        </div>
        <div className="p-4 bg-white text-gray-700 w-full">
          <div className="whitespace-normal break-words text-2xl" dangerouslySetInnerHTML={{ __html: initialData.cancellationPolicy || '' }}></div>
        </div>
      </div>

      {/* Airline Cancellation Policy Section */}
      <div className="rounded-lg overflow-hidden shadow-lg bg-gradient-to-r from-red-500 to-orange-500 text-white w-full mt-4">
        <div className="flex items-center space-x-2 p-4">
          <PlaneIcon className="w-6 h-6 text-white" />
          <h3 className="text-2xl font-semibold">Airline Cancellation Policy</h3>
        </div>
        <div className="p-4 bg-white text-gray-700 w-full">
          <div className="whitespace-normal break-words text-2xl" dangerouslySetInnerHTML={{ __html: initialData.airlineCancellationPolicy || '' }}></div>
        </div>
      </div>
    </div>
  );
};
