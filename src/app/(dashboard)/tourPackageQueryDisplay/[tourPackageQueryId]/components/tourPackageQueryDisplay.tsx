'use client'
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircleIcon, ChefHatIcon, CreditCardIcon, InfoIcon, PlaneIcon, PlaneTakeoffIcon, Shield, XCircleIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Location, Images, Hotel, TourPackageQuery, Itinerary, FlightDetails, Activity, AssociatePartner, RoomAllocation, TransportDetail } from "@prisma/client";
import { useSearchParams } from 'next/navigation'
import { format, parseISO } from 'date-fns';
import { Separator } from '@radix-ui/react-separator';

interface TourPackageQueryDisplayProps {
  initialData: TourPackageQuery & {
    images: Images[];
    itineraries: (Itinerary & {
      itineraryImages: Images[];
      activities: (Activity & {
        activityImages: Images[];
      })[];
      roomAllocations?: RoomAllocation[];
      transportDetails?: TransportDetail[];
    })[];
    flightDetails: FlightDetails[];
    associatePartner: AssociatePartner | null;
  } | null;
  locations: Location[];
  hotels: (Hotel & {
    images: Images[];
  })[];
  selectedOption?: string;
  associatePartners: AssociatePartner[];
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
    address: 'B - 1203, PNTC, Times of India Press Road, Satellite, Ahmedabad - 380015, Gujarat, India',
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

// Add this helper function to parse policy fields from the database
const parsePolicyField = (field: any): string[] => {
  if (!field) return [];
  try {
    if (typeof field === 'string') {
      return JSON.parse(field);
    } else if (Array.isArray(field)) {
      return field.map(item => String(item));
    } else {
      return [String(field)];
    }
  } catch (e) {
    return [String(field)];
  }
};

// Add this helper function to parse pricing section from JSON
const parsePricingSection = (pricingData: any): Array<{ name: string, price?: string, description?: string }> => {
  if (!pricingData) return [];

  try {
    if (typeof pricingData === 'string') {
      return JSON.parse(pricingData);
    }
    return Array.isArray(pricingData) ? pricingData : [];
  } catch (e) {
    console.error("Error parsing pricing section:", e);
    return [];
  }
};

// Update the PolicySection component with larger font sizes
const PolicySection = ({ title, items }: { title: string; items: string[] }) => {
  if (!items || items.length === 0) return null;

  // Determine the icon based on the title
  const getIcon = () => {
    switch (title) {      case "Inclusions": return <CheckCircleIcon className="h-7 w-7" />;
      case "Exclusions": return <XCircleIcon className="h-7 w-7" />;
      case "Important Notes": return <InfoIcon className="h-7 w-7" />;
      case "Payment Policy": return <CreditCardIcon className="h-7 w-7" />;
      case "Kitchen Group Policy": return <ChefHatIcon className="h-7 w-7" />;
      case "Useful Tips": return <InfoIcon className="h-7 w-7" />;
      case "Cancellation Policy": return <XCircleIcon className="h-7 w-7" />;
      case "Airline Cancellation Policy": return <PlaneIcon className="h-7 w-7" />;
      case "Terms and Conditions": return <Shield className="h-7 w-7" />;
      default: return <InfoIcon className="h-7 w-7" />;
    }
  };

  return (
    <Card className="mb-6 border shadow-lg rounded-lg overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-5">
        <div className="flex items-center gap-3">
          {getIcon()}
          <CardTitle className="text-2xl font-bold">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {items.length > 0 ? (
          <ul className="space-y-3">
            {items.map((item, index) => {
              // Check if the item has a bullet point already
              const hasPrefix =
                item.startsWith("✔") ||
                item.startsWith("➤") ||
                item.startsWith("∎") ||
                item.startsWith("-");

              // Add appropriate styling based on the item type
              let className = "flex items-start gap-2 text-gray-700 text-lg";
              if (item.startsWith("✔")) className += " text-green-700";
              else if (item.startsWith("➤")) className += " text-red-700";
              else if (item.startsWith("∎")) className += " text-blue-700";

              return (
                <li key={index} className={className}>
                  {!hasPrefix && <span className="text-orange-500 text-xl">•</span>}
                  <span className="leading-relaxed">{item}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-gray-500 italic text-lg">No items available</p>
        )}
      </CardContent>
    </Card>
  );
};

export const TourPackageQueryDisplay: React.FC<TourPackageQueryDisplayProps> = ({
  initialData,
  locations,
  hotels,
  associatePartners,
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
        <CardHeader className="bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-t-lg flex justify-between items-center">
          <CardTitle className="flex items-center justify-between text-xl font-bold">
            <span>{initialData.tourPackageQueryName}</span>
          </CardTitle>
          <CardTitle className="flex items-center justify-between text-xl font-bold">
            <span>{initialData.tourPackageQueryType + " Package"} </span>
          </CardTitle>
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
      <Card>
        <CardHeader>
          <div>
            <CardDescription className="text-xl font-bold  mb-4">
              {initialData.tourPackageQueryNumber}
            </CardDescription>

            {selectedOption !== 'SupplierA' && selectedOption !== "SupplierB" && (
              <CardDescription className="text-xl">
                <div className="mb-2">
                  <span className="font-bold">Customer:</span> {initialData.customerName} | {initialData.customerNumber}
                </div>
                <div>
                  <span className="font-bold">Associate Partner :</span> {initialData.associatePartner?.name} | {initialData.associatePartner?.mobileNumber} | {initialData.associatePartner?.email}
                </div>
              </CardDescription>
            )}
            <CardDescription>
              {selectedOption !== 'SupplierA' && selectedOption !== "SupplierB" && (
                <div className="mb-2">
                  <div className="font-bold">
                    Associate Partner: {initialData.associatePartner?.name || 'No Associate Partner Assigned yet'}
                  </div>
                  {initialData.associatePartner && (
                    <>
                      <div>Mobile: {initialData.associatePartner?.mobileNumber}</div>
                      <div>Email: {initialData.associatePartner?.email}</div>
                    </>
                  )}
                </div>
              )}
            </CardDescription>
          </div>
        </CardHeader>
      </Card>


      {/* Tour Package Details */}
      <Card className="break-inside-avoid border shadow-lg rounded-lg">
        <CardHeader className="p-6 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-t-lg">
          <h2 className="text-xl font-bold">Tour Information</h2>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid gap-6 md:grid-cols-1 text-gray-700">
            <div className="mb-4">
              <div className="font-semibold text-xl">
                Location:
                <span className="ml-2 text-xl text-gray-900">
                  {locations.find(location => location.id === initialData.locationId)?.label}
                </span>
              </div>
            </div>

            {initialData.numDaysNight && (
              <div className="mb-4">
                <div className="font-semibold text-xl">
                  Duration:
                  <span className="ml-2 text-xl text-gray-900">{initialData.numDaysNight}</span>
                </div>
              </div>
            )}

            <div className="flex mb-4">
              {initialData.tourStartsFrom && (
                <div className="font-semibold text-xl">
                  Period:
                  <span className="ml-2 text-xl text-gray-900">{format(initialData.tourStartsFrom, 'dd-MM-yyyy')}</span>
                </div>
              )}
              {initialData.tourEndsOn && (
                <div className="ml-4 font-semibold text-xl">
                  To:
                  <span className="ml-2 text-xl text-gray-900">{format(initialData.tourEndsOn, 'dd-MM-yyyy')}</span>
                </div>
              )}
            </div>

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

            {initialData.numAdults && (
              <div className="mb-4">
                <div className="font-semibold text-xl">
                  Adults:
                  <span className="ml-2 text-xl text-gray-900">{initialData.numAdults}</span>
                </div>
              </div>
            )}

            {initialData.numChild5to12 && (
              <div className="mb-4">
                <div className="font-semibold text-xl">
                  Children (5 - 12 Years):
                  <span className="ml-2 text-xl text-gray-900">{initialData.numChild5to12}</span>
                </div>
              </div>
            )}

            {initialData.numChild0to5 && (
              <div className="mb-4">
                <div className="font-semibold text-xl">
                  Children (0 - 5 Years):
                  <span className="ml-2 text-xl text-gray-900">{initialData.numChild0to5}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* <div className="break-inside-avoid">
        {selectedOption !== 'Empty' && selectedOption !== 'SupplierA' && selectedOption !== 'SupplierB' && (
          <Card className="border shadow-lg rounded-lg">
            <CardHeader className="p-6 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-t-lg">
              <h2 className="text-xl font-bold">Tour Pricing</h2>
            </CardHeader>

            {initialData.price && selectedOption !== 'Empty' && selectedOption !== 'SupplierA' && selectedOption !== 'SupplierB' && initialData.price !== ' ' && (
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
                {initialData.pricePerAdult !== '' && (
                  <div className="md:col-span-1">
                    <div className="font-semibold text-xl bg-gray-100 p-4 rounded-lg shadow-sm">
                      <span className="block text-gray-900">Price per Adult:</span>
                      <span className="text-xl font-normal text-gray-700">{initialData.pricePerAdult}</span>
                    </div>
                  </div>
                )}

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
        )}
 */}

      {/* Add this before the Tour Highlights section */}
      {initialData.pricingSection && selectedOption !== 'Empty' && selectedOption !== 'SupplierA' && selectedOption !== 'SupplierB' && (
        <div className="mt-6 border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b">
            <h3 className="text-lg font-medium text-gray-900">Pricing Options</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {parsePricingSection(initialData.pricingSection).map((item, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.price || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {item.description || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {initialData.totalPrice && selectedOption !== 'Empty' && selectedOption !== 'SupplierA' && selectedOption !== 'SupplierB' && initialData.totalPrice !== ' ' && (
        <Card className="grid gap-4 border rounded-lg shadow-lg p-6">
          <CardContent>
            <div className="font-semibold text-xl text-gray-900 bg-gray-100 p-4 rounded-lg shadow-sm">
              Total Price: <span className="text-orange-500" dangerouslySetInnerHTML={{ __html: initialData.totalPrice || ' ' }} />
            </div>
          </CardContent>
        </Card>
      )}

      {initialData.remarks !== '' && (
        <Card className="break-inside-avoid text-xl">
          <CardContent>
            <div>
              <div dangerouslySetInnerHTML={{ __html: initialData.remarks || '' }}></div>
            </div>
          </CardContent>
        </Card>
      )}


      {/*  {initialData.disclaimer && selectedOption !== 'Empty' && selectedOption !== 'SupplierA' && selectedOption !== 'SupplierB' && initialData.totalPrice !== ' ' && (
          <Card className="grid gap-4 border rounded-lg shadow-lg p-6">
            <CardContent>
              <div className="font-semibold text-xl text-gray-900 bg-gray-100 p-4 rounded-lg shadow-sm">
                <span className="text-orange-500" dangerouslySetInnerHTML={{ __html: initialData.disclaimer || ' ' }} />
              </div>
            </CardContent>
          </Card>
        )} */}



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


      {/* {initialData.tour_highlights && initialData.tour_highlights !== ' ' && (
        <Card className="break-inside-avoid border shadow-lg rounded-lg">
          <CardHeader className="p-6 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-t-lg">
            <h2 className="text-xl font-bold">Tour Highlights</h2>
          </CardHeader>
          <CardContent>
            <div className="text-gray-900" dangerouslySetInnerHTML={{ __html: initialData.tour_highlights || ' ' }}></div>
          </CardContent>
        </Card>
      )} */}


      {/* Flight Details */}
      {
        initialData.flightDetails && selectedOption !== 'SupplierA' && selectedOption !== 'SupplierB' && initialData.flightDetails.length > 0 && (
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
        )
      }


      {/* Itineraries */}
      {
        selectedOption !== 'SupplierA' && initialData.itineraries && initialData.itineraries.map((itinerary, index) => (

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
                  <div className="p-4">                    {/* Hotel Images */}
                    {hotels.find(hotel => hotel.id === itinerary.hotelId)?.images.length === 1 ? (
                      <div className="flex items-start mb-4">
                        <Link href={hotels.find(hotel => hotel.id === itinerary.hotelId)?.link || ''} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
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
                          <Link href={hotels.find(hotel => hotel.id === itinerary.hotelId)?.link || ''} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                            <p className="text-xl mb-2">{hotels.find(hotel => hotel.id === itinerary.hotelId)?.name}</p>
                          </Link>

                          {/* Room Allocations Section */}
                          {itinerary.roomAllocations && itinerary.roomAllocations.length > 0 && (
                            <div className="mt-4">
                              <div className="text-xl font-bold border-b pb-2 mb-3">Room Details:</div>
                              <div className="space-y-3">
                                {itinerary.roomAllocations.map((room: any, roomIndex: number) => (
                                  <div key={roomIndex} className="bg-gray-50 rounded-lg p-3 border">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                      <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded font-medium">
                                        Occupancy Type #{roomIndex + 1}
                                      </span>                                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                        {room.roomType?.name || 'Standard'}
                                      </span>
                                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                                        {room.occupancyType?.name || 'Double'}
                                      </span>
                                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">
                                        {room.mealPlan?.name || 'CP (Breakfast Only)'}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-600">
                                      <span className="font-medium">Number of Rooms/Occupancy :</span> {room.quantity || '1'}
                                      {room.guestNames ? <span className="ml-3 font-medium">Guests:</span> : ''} {room.guestNames || ''}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Fallback to old structure if roomAllocations is not available */}
                          {!itinerary.roomAllocations?.length && (
                            <>
                              {itinerary.numberofRooms && (
                                <>
                                  <div className="text-xl font-bold">Number of Rooms/Occupancy:</div>
                                  <p className="text-xl mb-2">{itinerary.numberofRooms}</p>
                                </>
                              )}

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
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="grid grid-cols-3 gap-4">
                          {hotels.find(hotel => hotel.id === itinerary.hotelId)?.images.map((image, imgIndex) => (
                            <Link key={imgIndex} href={hotels.find(hotel => hotel.id === itinerary.hotelId)?.link || ''} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
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
                          <Link href={hotels.find(hotel => hotel.id === itinerary.hotelId)?.link || ''} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                            <p className="text-xl mb-2">{hotels.find(hotel => hotel.id === itinerary.hotelId)?.name}</p>
                          </Link>

                          {/* Room Allocations Section */}
                          {itinerary.roomAllocations && itinerary.roomAllocations.length > 0 && (
                            <div className="mt-4">
                              <div className="text-xl font-bold border-b pb-2 mb-3">Room Details:</div>
                              <div className="space-y-3">
                                {itinerary.roomAllocations.map((room: any, roomIndex: number) => (
                                  <div key={roomIndex} className="bg-gray-50 rounded-lg p-3 border">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                      <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded font-medium">
                                        Occupancy Type #{roomIndex + 1}
                                      </span>                                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                        {typeof room.roomType === 'object' ? room.roomType?.name : room.roomType || 'Standard'}
                                      </span>
                                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                                        {typeof room.occupancyType === 'object' ? room.occupancyType?.name : room.occupancyType || 'Double'}
                                      </span>
                                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">
                                        {typeof room.mealPlan === 'object' ? room.mealPlan?.name : room.mealPlan || 'CP (Breakfast Only)'}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-600">
                                      <span className="font-medium">Number of Rooms/Occupancy :</span> {room.quantity || '1'}
                                      {room.guestNames ? <span className="ml-3 font-medium">Guests:</span> : ''} {room.guestNames || ''}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Fallback to old structure if roomAllocations is not available */}
                          {!itinerary.roomAllocations?.length && (
                            <>
                              {itinerary.numberofRooms && (
                                <>
                                  <div className="text-xl font-bold">Number of Rooms/Occupancy:</div>
                                  <p className="text-xl mb-2">{itinerary.numberofRooms}</p>
                                </>
                              )}

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
                            </>
                          )}
                        </div>
                      </div>)}

                    {/* Transport Details Section */}
                    {itinerary.transportDetails && itinerary.transportDetails.length > 0 && (
                      <div className="mt-6">
                        <div className="text-xl font-bold border-b pb-2 mb-3">Transport Details:</div>
                        <div className="space-y-3">
                          {itinerary.transportDetails.map((transport: any, transportIndex: number) => (
                            <div key={transportIndex} className="bg-gray-50 rounded-lg p-3 border">
                              <div className="flex flex-wrap items-center gap-2 mb-1">                                <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded font-medium">
                                  Transport #{transportIndex + 1}
                                </span>
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                  {transport.vehicleType?.name || 'Car'}
                                </span>
                                {/* <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                                  {transport.transportType || 'Per Day'}
                                </span> */}
                              </div>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Number of Vehicles:</span> {transport.quantity || '1'}
                                {transport.description ? <span className="ml-3 font-medium">Details:</span> : ''} {transport.description || ''}
                              </p>
                            </div>
                          ))}
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

        ))
      }


      {
        selectedOption === 'SupplierA' && initialData.itineraries && (
          <Card className="break-inside-avoid border rounded-lg shadow-lg p-4 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 text-white text-center">
            <CardTitle className="text-4xl font-bold">Itinerary</CardTitle>
          </Card>
        )
      }

      <Card className="break-inside-avoid border rounded-lg shadow-lg p-6">

        {/* Itineraries */}
        {selectedOption === 'SupplierA' && initialData.itineraries && initialData.itineraries.map((itinerary, index) => (
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



      {/* Replace individual policy sections with a single organized section */}
      <Card className="break-before-all border rounded-lg shadow-lg overflow-hidden mb-8">
        <CardHeader className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-6 text-center">
          <CardTitle className="text-4xl font-bold">Policies & Terms</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <PolicySection title="Inclusions" items={parsePolicyField(initialData.inclusions)} />
          <PolicySection title="Exclusions" items={parsePolicyField(initialData.exclusions)} />
          <PolicySection title="Important Notes" items={parsePolicyField(initialData.importantNotes)} />
          <PolicySection title="Payment Policy" items={parsePolicyField(initialData.paymentPolicy)} />
          <PolicySection title="Kitchen Group Policy" items={parsePolicyField(initialData.kitchenGroupPolicy)} />
          <PolicySection title="Useful Tips" items={parsePolicyField(initialData.usefulTip)} />
          <PolicySection title="Cancellation Policy" items={parsePolicyField(initialData.cancellationPolicy)} />
          <PolicySection title="Airline Cancellation Policy" items={parsePolicyField(initialData.airlineCancellationPolicy)} />
          <PolicySection title="Terms and Conditions" items={parsePolicyField(initialData.termsconditions)} />
        </CardContent>
      </Card>

      {
        selectedOption !== 'Empty' && selectedOption !== 'SupplierA' && selectedOption !== 'SupplierB' && (

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
        )
      }

      {
        (selectedOption === 'SupplierA' || selectedOption === 'SupplierB') && (
          <Card className="border-b break-inside-avoid">
            <CardDescription className="flex justify-between items-center px-4">
              <div className="inline-block relative w-48 h-48">
                <Image src={companyInfo.AH.logo} alt={`${companyInfo.AH.name} Logo`} fill className="object-contain" />
              </div>
              <ul className="font-bold">
                <li>{companyInfo.AH.address}</li>
                <li>Phone: {companyInfo.AH.phone}</li>
                <li>Email: <Link href={`mailto:${companyInfo.AH.email}`} className="text-blue-600 underline">{companyInfo.AH.email}</Link></li>
                <li>Website: <Link href={companyInfo.AH.website || '#'} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{companyInfo.AH.website}</Link></li>
              </ul>
            </CardDescription>
          </Card>
        )
      }

      {/* Footer Section with Company Details */}


    </div >
  );
};