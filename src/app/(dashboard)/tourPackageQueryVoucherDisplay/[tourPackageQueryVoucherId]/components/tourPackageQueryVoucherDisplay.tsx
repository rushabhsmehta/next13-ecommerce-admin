'use client'
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircleIcon, ChefHatIcon, CreditCardIcon, InfoIcon, PlaneIcon, PlaneTakeoffIcon, Shield, XCircleIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Location, Images, Hotel, TourPackageQuery, Itinerary, FlightDetails, Activity, RoomAllocation, TransportDetail, RoomType, OccupancyType, MealPlan, VehicleType } from "@prisma/client";
import { useSearchParams } from 'next/navigation';
import { table } from 'console';
import { format, parseISO } from 'date-fns';
import { formatLocalDate } from '@/lib/timezone-utils';

interface TourPackageQueryVoucherDisplayProps {
  initialData: TourPackageQuery & {
    images: Images[];
    itineraries: (Itinerary & {
      itineraryImages: Images[];
      activities: (Activity & {
        activityImages: Images[];
      })[];    roomAllocations?: (RoomAllocation & {
        roomType: RoomType;
        occupancyType: OccupancyType;
        mealPlan: MealPlan | null;
      })[];
      transportDetails?: (TransportDetail & {
        vehicleType: VehicleType;
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
    <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center mb-4">
        {getIcon()}
        <h3 className="text-2xl font-bold ml-2 text-gray-800">{title}</h3>
      </div>
      <ul className="list-disc pl-10 space-y-2 text-xl">
        {items.map((item, index) => (
          <li key={index} className="text-gray-700">{item}</li>
        ))}
      </ul>
    </div>
  );
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

  // Update the PolicySection component with larger font sizes


  if (!initialData || !initialData.isFeatured) return <div>No data available</div>;

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

        <Card className="border-b">          <CardDescription className="flex justify-between items-center px-4">
            <div className="inline-block relative w-48 h-48">
              <Image src={currentCompany.logo} alt={`${currentCompany.name || 'Company'} Logo`} fill className="object-contain" />
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
        </CardHeader>        {initialData.images.map((image, index) => (
          <div key={index} className="w-full h-[500px]">
            <Image
              src={image.url}
              alt={`${initialData.tourPackageQueryName || 'Tour'} Image ${index + 1}`}
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
                  <span className="ml-2 text-2xl text-gray-900">{formatLocalDate(initialData.tourStartsFrom, 'dd-MM-yyyy')}</span>
                </div>
              )}
              {initialData.tourEndsOn && (
                <div className="ml-4 font-semibold text-xl">
                  To:
                  <span className="ml-2 text-2xl text-gray-900">{formatLocalDate(initialData.tourEndsOn, 'dd-MM-yyyy')}</span>
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


      {/* 
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
              {initialData.pricePerAdult !== '' && (
                <div className="md:col-span-1">
                  <div className="font-semibold text-xl bg-gray-100 p-4 rounded-lg shadow-sm">
                    <span className="block text-gray-900">Price per Adult:</span>
                    <span className="text-2xl font-normal text-gray-700">{initialData.pricePerAdult}</span>
                  </div>
                </div>
              )}

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

      */}



      {initialData.pricingSection && selectedOption !== 'SupplierA' && selectedOption !== 'SupplierB' && selectedOption !== 'Empty' && parsePricingSection(initialData.pricingSection).length > 0 && (
        <div className="mt-6 border border-orange-200 rounded-lg overflow-hidden shadow-md">
          <div className="bg-gradient-to-r from-orange-100 to-orange-50 px-4 py-3 border-b flex justify-between items-center">
            <h3 className="text-xl font-bold text-orange-800">Detailed Pricing</h3>
            <div className="text-sm bg-orange-100 text-orange-800 px-3 py-1 rounded-full">
              {initialData.isFeatured ? "Confirmed Prices" : "Indicative Prices"}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-orange-50 text-orange-800 uppercase text-sm leading-normal">
                  <th className="py-3 px-6 text-left font-bold border-b-2 border-orange-200">Category</th>
                  <th className="py-3 px-6 text-left font-bold border-b-2 border-orange-200">Price</th>
                  <th className="py-3 px-6 text-left font-bold border-b-2 border-orange-200">Details</th>
                </tr>
              </thead>
              <tbody className="text-gray-600 text-md">
                {parsePricingSection(initialData.pricingSection).map((item, index) => (
                  <tr key={index} className={`${index % 2 === 0 ? 'bg-white' : 'bg-orange-50'} hover:bg-orange-100 transition-colors duration-150`}>
                    <td className="py-3 px-6 border-b border-orange-100 font-medium">
                      {item.name}
                    </td>
                    <td className="py-3 px-6 border-b border-orange-100 font-semibold">
                      {item.price || '-'}
                    </td>
                    <td className="py-3 px-6 border-b border-orange-100">
                      {item.description || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="bg-orange-50 px-6 py-4 text-orange-800 text-sm italic">
              * All prices are in INR and subject to availability at the time of confirmation.
            </div>
          </div>
        </div>
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
      )}      {/* Itineraries and Hotel Details */}
      {initialData.itineraries && initialData.itineraries.length > 0 && (
        <Card className="break-inside-avoid border shadow-lg rounded-lg">
          <CardHeader className="p-6 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-t-lg">
            <h2 className="text-2xl font-bold">Accomodation Details</h2>
          </CardHeader>
          <CardContent>
            {initialData.itineraries.map((itinerary, itineraryIdx) => {
              const hotelDetails = hotels.find(hotel => hotel.id === itinerary.hotelId);
              
              return (
                <div key={itineraryIdx} className="mb-6">
                  <h3 className="text-xl font-bold mb-3 px-3 py-2 bg-orange-100 text-orange-800 rounded-md">
                    Day {itinerary.dayNumber}: {itinerary.days} - {hotelDetails?.name || 'Hotel'}
                  </h3>
                  
                  {itinerary.roomAllocations && itinerary.roomAllocations.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200 mt-2 border">
                      <thead className="bg-gradient-to-r from-red-500 to-orange-500 text-white">
                        <tr>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">
                            Room Type
                          </th>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">
                            Occupancy
                          </th>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">
                            Meal Plan
                          </th>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider">
                            Quantity
                          </th>
                        
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {itinerary.roomAllocations.map((room, roomIdx) => (
                          <tr key={roomIdx} className={roomIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-3 py-2 whitespace-normal text-sm text-gray-900">
                              {room.roomType?.name || '-'}
                            </td>
                            <td className="px-3 py-2 whitespace-normal text-sm text-gray-900">
                              {room.occupancyType?.name || '-'}
                            </td>
                            <td className="px-3 py-2 whitespace-normal text-sm text-gray-900">
                              {room.mealPlan?.name || '-'}
                            </td>
                            <td className="px-3 py-2 whitespace-normal text-sm text-gray-900">
                              {(room as any).quantity || '-'}
                            </td>                           
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center py-4 bg-gray-100 rounded-md text-gray-600">
                      No room allocation details available
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
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
    </div>
  );
};
