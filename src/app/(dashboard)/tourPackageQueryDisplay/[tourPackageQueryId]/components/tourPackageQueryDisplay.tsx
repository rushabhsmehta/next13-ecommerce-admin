'use client'
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircleIcon, ChefHatIcon, CreditCardIcon, InfoIcon, PlaneIcon, PlaneTakeoffIcon, Shield, XCircleIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Location, Images, Hotel, TourPackageQuery, Itinerary, FlightDetails, Activity, AssociatePartner, RoomAllocation, TransportDetail } from "@prisma/client";
import { useSearchParams } from 'next/navigation'
import { format, parseISO } from 'date-fns';
import { formatLocalDate } from '@/lib/timezone-utils';
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
    flightDetails: (FlightDetails & {
      images: Images[];
    })[];
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
      </Card>      <Card>
        <CardHeader>
          <div>
            <CardDescription className="text-2xl font-bold mb-4">
              {initialData.tourPackageQueryNumber}
            </CardDescription>

            {selectedOption !== 'SupplierA' && selectedOption !== "SupplierB" && (
              <CardDescription className="text-lg">
                <div className="mb-3">
                  <span className="font-bold">Customer:</span> {initialData.customerName} | {initialData.customerNumber}
                </div>
                <div>
                  <span className="font-bold">Associate Partner :</span> {initialData.associatePartner?.name} | {initialData.associatePartner?.mobileNumber} | {initialData.associatePartner?.email}
                </div>
              </CardDescription>
            )}
            <CardDescription className="text-lg">
              {selectedOption !== 'SupplierA' && selectedOption !== "SupplierB" && (
                <div className="mb-3">
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
      <Card className="break-inside-avoid border shadow-lg rounded-lg">        <CardHeader className="p-6 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-t-lg">
          <h2 className="text-2xl font-bold">Tour Information</h2>
        </CardHeader>

        <CardContent className="p-6">
          <div className="grid gap-6 md:grid-cols-1 text-gray-700">
            <div className="mb-4">
              <div className="font-semibold text-2xl">
                Location:
                <span className="ml-2 text-2xl text-gray-900">
                  {locations.find(location => location.id === initialData.locationId)?.label}
                </span>
              </div>
            </div>

            {initialData.numDaysNight && (
              <div className="mb-4">
                <div className="font-semibold text-2xl">
                  Duration:
                  <span className="ml-2 text-2xl text-gray-900">{initialData.numDaysNight}</span>
                </div>
              </div>
            )}

            <div className="flex mb-4">
              {initialData.tourStartsFrom && (
                <div className="font-semibold text-2xl">
                  Period:
                  <span className="ml-2 text-2xl text-gray-900">{formatLocalDate(initialData.tourStartsFrom, 'dd-MM-yyyy')}</span>
                </div>
              )}
              {initialData.tourEndsOn && (
                <div className="ml-4 font-semibold text-2xl">
                  To:
                  <span className="ml-2 text-2xl text-gray-900">{formatLocalDate(initialData.tourEndsOn, 'dd-MM-yyyy')}</span>
                </div>
              )}
            </div>

            {initialData.transport && (
              <div className="mb-4">
                <div className="font-semibold text-2xl">
                  Transport:
                  <span className="ml-2 text-2xl text-gray-900">{initialData.transport}</span>
                </div>
              </div>
            )}

            {initialData.pickup_location && (
              <div className="mb-4">
                <div className="font-semibold text-2xl">
                  Pickup:
                  <span className="ml-2 text-2xl text-gray-900">{initialData.pickup_location}</span>
                </div>
              </div>
            )}

            {initialData.drop_location && (
              <div className="mb-4">
                <div className="font-semibold text-2xl">
                  Drop:
                  <span className="ml-2 text-2xl text-gray-900">{initialData.drop_location}</span>
                </div>
              </div>
            )}

            {initialData.numAdults && (
              <div className="mb-4">
                <div className="font-semibold text-2xl">
                  Adults:
                  <span className="ml-2 text-2xl text-gray-900">{initialData.numAdults}</span>
                </div>
              </div>
            )}

            {initialData.numChild5to12 && (
              <div className="mb-4">
                <div className="font-semibold text-2xl">
                  Children (5 - 12 Years):
                  <span className="ml-2 text-2xl text-gray-900">{initialData.numChild5to12}</span>
                </div>
              </div>
            )}

            {initialData.numChild0to5 && (
              <div className="mb-4">
                <div className="font-semibold text-2xl">
                  Children (0 - 5 Years):
                  <span className="ml-2 text-2xl text-gray-900">{initialData.numChild0to5}</span>
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
 */}      {/* Enhanced Pricing Options Table */}
      {initialData.pricingSection && selectedOption !== 'Empty' && selectedOption !== 'SupplierA' && selectedOption !== 'SupplierB' && parsePricingSection(initialData.pricingSection).length > 0 && (
        <div className="mt-6 border border-orange-200 rounded-lg overflow-hidden shadow-lg">          <div className="bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 px-6 py-4 border-b border-orange-200">
            <h3 className="text-2xl font-bold text-white">💰 Pricing Options</h3>
            <p className="text-base text-orange-100 mt-1">Detailed breakdown of tour package pricing</p>
          </div>
          <div className="overflow-x-auto">            <table className="min-w-full divide-y divide-gray-200 bg-white">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">📋</span>
                      <span>Item Name</span>
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">💵</span>
                      <span>Price (Base)</span>
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">📊</span>
                      <span>Calculation & Total</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {parsePricingSection(initialData.pricingSection).map((item, index) => (
                  <tr key={index} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-orange-50 transition-colors duration-200`}>
                    <td className="px-6 py-5 whitespace-nowrap border-r border-gray-100">
                      <div className="text-lg font-semibold text-gray-900">{item.name}</div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap border-r border-gray-100">
                      <div className="text-lg font-bold text-green-600">
                        {item.price ? `₹ ${parseFloat(item.price).toLocaleString('en-IN')}` : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-base text-gray-700 leading-relaxed">
                        {item.description || '-'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>          <div className="bg-gradient-to-r from-orange-50 to-pink-50 px-6 py-3 border-t border-orange-200">
            <p className="text-sm text-orange-600 italic font-medium">* All prices are in INR and subject to availability at the time of confirmation.</p>
          </div>
        </div>
      )}

      {/* Enhanced Total Price Display */}
      {initialData.totalPrice && selectedOption !== 'Empty' && selectedOption !== 'SupplierA' && selectedOption !== 'SupplierB' && initialData.totalPrice !== ' ' && (
        <div className="mt-6">
          <Card className="border-2 border-orange-200 rounded-lg shadow-xl overflow-hidden">            <div className="bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 px-6 py-5">
              <h3 className="text-2xl font-bold text-white flex items-center">
                <span className="mr-3 text-3xl">🎯</span>
                Total Package Price
              </h3>
            </div>
            <CardContent className="p-8">
              <div className="text-center">
                <div className="text-5xl font-bold text-gray-900 mb-4">
                  <span className="text-orange-600">₹ </span>
                  <span dangerouslySetInnerHTML={{ 
                    __html: initialData.totalPrice ? 
                      parseFloat(initialData.totalPrice.replace(/[^\d.-]/g, '')).toLocaleString('en-IN') : 
                      initialData.totalPrice 
                  }} />
                </div>
                <div className="text-lg text-gray-600 bg-orange-50 px-6 py-3 rounded-full inline-block">
                  <span className="font-semibold">Final Tour Package Cost</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}      {initialData.remarks !== '' && (
        <Card className="break-inside-avoid text-2xl">
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



      {/* Hotel, Room Allocation and Transport Details Day-wise */}
      {selectedOption !== 'SupplierA' && initialData.itineraries && initialData.itineraries.length > 0 && (
        <Card className="mb-6 break-inside-avoid bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="bg-gray-50 text-gray-800 p-6 border-b">
            <CardTitle className="text-4xl font-semibold text-center flex items-center justify-center gap-3">
              <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 3a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
              <span className="bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
                Hotel, Room Allocation & Transport Details
              </span>
            </CardTitle>
          </div>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 bg-white">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-5 text-left text-base md:text-lg font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">📅</span>
                        <span>Day</span>
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-5 text-left text-base md:text-lg font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🏨</span>
                        <span>Hotel Details</span>
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-5 text-left text-base md:text-lg font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🛏️</span>
                        <span>Room Allocation</span>
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-5 text-left text-base md:text-lg font-semibold text-gray-700 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🚗</span>
                        <span>Transport Details</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {initialData.itineraries.map((itinerary, index) => (
                    <tr key={index} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition-colors`}>
                      {/* Day Column */}
                      <td className="px-6 py-6 whitespace-nowrap border-r border-gray-100 align-top">
                        <div className="flex items-center">
                          <div className="bg-gray-200 text-gray-700 rounded-full w-10 h-10 flex items-center justify-center text-base md:text-lg font-semibold mr-3">
                            {itinerary.dayNumber}
                          </div>
                          <div>
                            <div className="text-lg md:text-xl font-semibold text-gray-900">Day {itinerary.dayNumber}: {itinerary.days}</div>
                            <div className="text-base text-gray-600" dangerouslySetInnerHTML={{ __html: itinerary.itineraryTitle?.replace(/^<p>/, '').replace(/<\/p>$/, '') || '' }} />
                          </div>
                        </div>
                      </td>

                      {/* Hotel Details Column */}
                      <td className="px-6 py-6 border-r border-gray-100 align-top">
                        {itinerary.hotelId && hotels.find(hotel => hotel.id === itinerary.hotelId) ? (
                          <div>
                            <div className="text-lg font-semibold text-gray-900 mb-1">
                              {hotels.find(hotel => hotel.id === itinerary.hotelId)?.name}
                            </div>
                            {(() => {
                              const hotel = hotels.find(h => h.id === itinerary.hotelId);
                              const locationLabel = hotel?.locationId ? locations.find(l => l.id === hotel.locationId)?.label : undefined;
                              return locationLabel ? (
                                <div className="text-base text-gray-600 flex items-center">
                                  <span className="mr-1">📍</span>
                                  {locationLabel}
                                </div>
                              ) : null;
                            })()}
                          </div>
                        ) : (
                          <div className="text-lg text-gray-500 italic">No hotel assigned</div>
                        )}
                      </td>

                      {/* Room Allocation Column */}
                      <td className="px-6 py-6 border-r border-gray-100 align-top">
                        {itinerary.roomAllocations && itinerary.roomAllocations.length > 0 ? (
                          <div className="space-y-2">
                            {itinerary.roomAllocations.map((room: any, roomIndex: number) => (
                              <div key={roomIndex} className="text-base">
                                <div className="flex flex-wrap gap-2 mb-2">
                                  <span className="px-2.5 py-0.5 bg-gray-100 text-gray-800 rounded text-base">
                                    {typeof room.roomType === 'object' ? room.roomType?.name : room.roomType || 'Standard'}
                                  </span>
                                  <span className="px-2.5 py-0.5 bg-gray-100 text-gray-800 rounded text-base">
                                    {typeof room.occupancyType === 'object' ? room.occupancyType?.name : room.occupancyType || 'Double'}
                                  </span>
                                  <span className="px-2.5 py-0.5 bg-gray-100 text-gray-800 rounded text-base">
                                    {typeof room.mealPlan === 'object' ? room.mealPlan?.name : room.mealPlan || 'CP'}
                                  </span>
                                </div>
                                <div className="text-base text-gray-600">
                                  Rooms: {room.quantity || '1'} {room.guestNames && `| Guests: ${room.guestNames}`}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-lg text-gray-500 italic">No room details</div>
                        )}
                      </td>

                      {/* Transport Details Column */}
                      <td className="px-6 py-6 align-top">
                        {itinerary.transportDetails && itinerary.transportDetails.length > 0 ? (
                          <div className="space-y-2">
                            {itinerary.transportDetails.map((transport: any, transportIndex: number) => (
                              <div key={transportIndex} className="text-base">
                                <div className="flex flex-wrap gap-2 mb-2">
                                  <span className="px-2.5 py-0.5 bg-gray-100 text-gray-800 rounded text-base">
                                    {transport.vehicleType?.name || 'Car'}
                                  </span>
                                  <span className="px-2.5 py-0.5 bg-gray-100 text-gray-800 rounded text-base">
                                    Qty: {transport.quantity || '1'}
                                  </span>
                                </div>
                                {transport.description && (
                                  <div className="text-base text-gray-600">
                                    {transport.description}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-lg text-gray-500 italic">No transport details</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-gray-50 px-6 py-4 border-t mt-4">
              <p className="text-base text-gray-600 italic">* This summary provides day-wise overview of accommodation and transport arrangements.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Itineraries */}
      {
        selectedOption !== 'SupplierA' && initialData.itineraries && initialData.itineraries.map((itinerary, index) => (          <Card key={index} className="mb-6 break-inside-avoid bg-white shadow-lg rounded-lg overflow-hidden">
            {index === 0 &&
              <Card className="border rounded-lg shadow-lg p-6 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 text-white text-center break-before-always">
                <CardTitle className="text-5xl font-bold">Itinerary</CardTitle>
              </Card>}
            <div className="flex items-center justify-between bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 text-white p-6 rounded-t-lg">
              {/* Day and Title grouped */}


              <div>
                <CardTitle className="text-2xl font-bold"
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
            </div>            {/* Description Section */}
            <div className="flex-grow p-8">
              <div className="text-2xl text-justify mb-6" dangerouslySetInnerHTML={{ __html: itinerary.itineraryDescription || '' }}></div>
            </div>

            <CardContent className="p-8">
              {/* Hotel Section */}
              {itinerary.hotelId && hotels.find(hotel => hotel.id === itinerary.hotelId) && (
                <Card className="my-4">                  <CardHeader className="bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 text-white p-6 text-2xl font-bold text-center rounded-t-lg">
                    Hotel Details
                  </CardHeader>
                  <div className="p-6">                    {/* Hotel Images */}
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
                        </Link>                        {/* Hotel Text Content */}
                        <div className="ml-4">
                          <div className="text-2xl font-bold">Hotel Name:</div>
                          <Link href={hotels.find(hotel => hotel.id === itinerary.hotelId)?.link || ''} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                            <p className="text-2xl mb-3">{hotels.find(hotel => hotel.id === itinerary.hotelId)?.name}</p>
                          </Link>

                          {/* Room Allocations Section */}
                          {itinerary.roomAllocations && itinerary.roomAllocations.length > 0 && (
                            <div className="mt-6">
                              <div className="text-2xl font-bold border-b pb-3 mb-4">Room Details:</div>
                              <div className="space-y-4">
                                {itinerary.roomAllocations.map((room: any, roomIndex: number) => (
                                  <div key={roomIndex} className="bg-gray-50 rounded-lg p-4 border">
                                    <div className="flex flex-wrap items-center gap-3 mb-2">
                                      <span className="px-3 py-2 bg-orange-100 text-orange-800 rounded font-medium text-lg">
                                        Occupancy Type #{roomIndex + 1}
                                      </span>                                      <span className="px-3 py-2 bg-blue-100 text-blue-800 rounded text-lg">
                                        {room.roomType?.name || 'Standard'}
                                      </span>
                                      <span className="px-3 py-2 bg-green-100 text-green-800 rounded text-lg">
                                        {room.occupancyType?.name || 'Double'}
                                      </span>
                                      <span className="px-3 py-2 bg-purple-100 text-purple-800 rounded text-lg">
                                        {room.mealPlan?.name || 'CP (Breakfast Only)'}
                                      </span>
                                    </div>
                                    <p className="text-lg text-gray-600">
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
                                  <div className="text-2xl font-bold">Number of Rooms/Occupancy:</div>
                                  <p className="text-2xl mb-3">{itinerary.numberofRooms}</p>
                                </>
                              )}

                              {itinerary.roomCategory && (
                                <>
                                  <div className="text-2xl font-bold">Room Category:</div>
                                  <p className="text-2xl mb-3">{itinerary.roomCategory}</p>
                                </>
                              )}

                              {itinerary.mealsIncluded && (
                                <>
                                  <div className="text-2xl font-bold">Meal Plan:</div>
                                  <p className="text-2xl mb-3">{itinerary.mealsIncluded}</p>
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
                      </div>)}                    {/* Transport Details Section */}
                    {itinerary.transportDetails && itinerary.transportDetails.length > 0 && (
                      <div className="mt-8">
                        <div className="text-2xl font-bold border-b pb-3 mb-4">Transport Details:</div>
                        <div className="space-y-4">
                          {itinerary.transportDetails.map((transport: any, transportIndex: number) => (
                            <div key={transportIndex} className="bg-gray-50 rounded-lg p-4 border">
                              <div className="flex flex-wrap items-center gap-3 mb-2">                                <span className="px-3 py-2 bg-orange-100 text-orange-800 rounded font-medium text-lg">
                                  Transport #{transportIndex + 1}
                                </span>
                                <span className="px-3 py-2 bg-blue-100 text-blue-800 rounded text-lg">
                                  {transport.vehicleType?.name || 'Car'}
                                </span>
                                {/* <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                                  {transport.transportType || 'Per Day'}
                                </span> */}
                              </div>
                              <p className="text-lg text-gray-600">
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
              )}              {/* Activities Section */}
              {itinerary.activities && itinerary.activities.length > 0 && (
                <Card className="my-6">
                  <CardHeader className="bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 text-white p-6 text-2xl font-bold text-center rounded-t-lg">
                    Activities
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid gap-6">
                      {itinerary.activities.map((activity, activityIndex) => (
                        <div key={activityIndex} className="mb-6">
                          {activity.activityImages && activity.activityImages.length === 1 ? (
                            <div className="flex items-start mb-6 w-full">
                              <div className="w-[250px] h-[250px] flex-shrink-0">
                                <Image
                                  src={activity.activityImages[0].url}
                                  alt={`Activity Image ${activityIndex + 1}`}
                                  className="rounded-lg object-cover w-full h-full"
                                  width={250}
                                  height={250}
                                />
                              </div>
                              <div className="ml-6 w-full">
                                <div className="text-3xl font-bold mb-3" dangerouslySetInnerHTML={{ __html: activity.activityTitle || '' }}></div>
                                <p className="text-2xl text-justify" dangerouslySetInnerHTML={{ __html: activity.activityDescription || '' }}></p>
                              </div>
                            </div>
                          ) : (
                            <div className="w-full">
                              <div className="flex justify-start items-center mb-6 gap-6">
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
                              <div className="text-3xl font-bold mb-3" dangerouslySetInnerHTML={{ __html: activity.activityTitle || '' }}></div>
                              <p className="text-2xl text-justify" dangerouslySetInnerHTML={{ __html: activity.activityDescription || '' }}></p>
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
      }      {
        selectedOption === 'SupplierA' && initialData.itineraries && (
          <Card className="break-inside-avoid border rounded-lg shadow-lg p-6 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 text-white text-center">
            <CardTitle className="text-5xl font-bold">Itinerary</CardTitle>
          </Card>
        )
      }

      <Card className="break-inside-avoid border rounded-lg shadow-lg p-6">

        {/* Itineraries */}
        {selectedOption === 'SupplierA' && initialData.itineraries && initialData.itineraries.map((itinerary, index) => (
          <div key={index} className="mb-6 break-inside-avoid bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-6 rounded-t-lg">
              {/* Day and Title grouped */}
              <div>
                <CardTitle className="text-2xl font-bold"
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
        <CardHeader className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-8 text-center">
          <CardTitle className="text-5xl font-bold">Policies & Terms</CardTitle>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
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
      </Card>      {
        selectedOption !== 'Empty' && selectedOption !== 'SupplierA' && selectedOption !== 'SupplierB' && (

          <Card className="border-b break-inside-avoid m-4">
            <CardDescription className="flex justify-between items-center px-6 py-4">
              <div className="inline-block relative w-48 h-48">
                <Image src={currentCompany.logo} alt={`${currentCompany.name} Logo`} fill className="object-contain" />
              </div>
              <ul className='font-bold text-lg space-y-2'>
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
          <Card className="border-b break-inside-avoid m-4">
            <CardDescription className="flex justify-between items-center px-6 py-4">
              <div className="inline-block relative w-48 h-48">
                <Image src={companyInfo.AH.logo} alt={`${companyInfo.AH.name} Logo`} fill className="object-contain" />
              </div>
              <ul className="font-bold text-lg space-y-2">
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