'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  CarIcon,
  PlaneIcon,
  PlaneTakeoffIcon,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import {
  Activity,
  FlightDetails,
  Hotel,
  Images,
  Itinerary,
  Location,
  TourDestination,
  TourPackage,
} from '@prisma/client';
import { useSearchParams } from 'next/navigation';
import { formatItineraryDayHeader } from '@/lib/utils';

interface TourPackageDisplayProps {
  initialData: TourPackage & {
    images: Images[];
    itineraries: (Itinerary & {
      itineraryImages: Images[];
      roomAllocations?: any[];
      transportDetails?: any[];
      activities: (Activity & {
        activityImages: Images[];
      })[];
    })[];
    flightDetails: (FlightDetails & {
      images?: Images[];
    })[];
  } | null;
  locations: Location[];
  hotels: (Hotel & {
    images: Images[];
    location?: Location | null;
    destination?: TourDestination | null;
  })[];
}

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

const companyInfo: CompanyInfo = {
  Empty: { logo: '', name: '', address: '', phone: '', email: '', website: '' },
  AH: {
    logo: '/aagamholidays.png',
    name: 'Aagam Holidays',
    address: 'B - 1203, PNTC, Times of India Press Road, Satellite, Ahmedabad - 380015, Gujarat, India',
    phone: '+91-97244 44701',
    email: 'info@aagamholidays.com',
    website: 'https://aagamholidays.com',
  },
  KH: {
    logo: '/kobawala.png',
    name: 'Kobawala Holidays',
    address: 'Kobawala holidays, 25 Sarthak Shri Ganesh, K-Raheja road, Koba, Gandhinagar-382007',
    phone: '+91-99040 35277',
    email: 'kobawala.holiday@gmail.com',
    website: 'http://kobawalaholidays.com',
  },
  MT: {
    logo: '/mahavirtravels.png',
    name: 'Mahavir Tour and Travels',
    address: 'Mahavir Travels, Ahmedabad',
    phone: '+91-97244 44701',
    email: 'info@aagamholidays.com',
    website: 'https://mahavirtravels.com',
  },
};

const extractText = (obj: any): string => {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  for (const key of ['text', 'value', 'description', 'label', 'name']) {
    if (obj[key]) return String(obj[key]);
  }
  return String(obj);
};

const parsePolicyField = (field: any): string[] => {
  if (!field) return [];
  try {
    if (typeof field === 'string') {
      try {
        const parsed = JSON.parse(field);
        if (Array.isArray(parsed)) return parsed.map((item) => (typeof item === 'string' ? item : extractText(item))).filter(Boolean);
      } catch {
        return field.split(/\n|â€¢|-|\u2022/).map((item) => item.trim()).filter(Boolean);
      }
      return [field];
    }
    if (Array.isArray(field)) {
      return field
        .flatMap((item) => {
          if (item == null) return [];
          if (typeof item === 'string') return [item];
          if (typeof item === 'object') return [extractText(item)];
          return [String(item)];
        })
        .filter(Boolean);
    }
    if (typeof field === 'object') {
      return Object.values(field).flatMap((value) => parsePolicyField(value));
    }
    return [String(field)];
  } catch {
    return [];
  }
};

type PricingRow = { name: string; price?: string; description?: string };

const parsePricingSection = (pricingData: any): PricingRow[] => {
  if (!pricingData) return [];
  try {
    if (Array.isArray(pricingData)) return pricingData;
    if (typeof pricingData === 'string') {
      const parsed = JSON.parse(pricingData);
      return Array.isArray(parsed) ? parsed : [];
    }
    if (typeof pricingData === 'object') {
      return Object.values(pricingData).filter(
        (item: any) => item && typeof item === 'object' && (item.name || item.price),
      ) as PricingRow[];
    }
  } catch (error) {
    console.error('Error parsing pricing section:', error);
  }
  return [];
};

const buildPricingRows = (data: TourPackage): PricingRow[] => {
  const parsedRows = parsePricingSection(data.pricingSection);
  if (parsedRows.length > 0) return parsedRows;

  return [
    { name: 'Package Price', price: data.price || undefined },
    { name: 'Price per Adult', price: data.pricePerAdult || undefined },
    { name: 'Triple Occupancy / Extra Bed', price: data.pricePerChildOrExtraBed || undefined },
    { name: 'Child 5-12 Years (No Bed)', price: data.pricePerChild5to12YearsNoBed || undefined },
    { name: 'Child Below 5 Years With Seat', price: data.pricePerChildwithSeatBelow5Years || undefined },
  ].filter((row) => displayValue(row.price));
};

function displayValue(value: unknown): string {
  if (value == null) return '';
  const text = String(value).trim();
  if (!text || text === 'null' || text === 'undefined') return '';
  return text;
}

export const TourPackageDisplay: React.FC<TourPackageDisplayProps> = ({
  initialData,
  locations,
  hotels,
}) => {
  const searchParams = useSearchParams();
  const selectedOption = searchParams?.get('search') || 'AH';
  const fallbackCompany = companyInfo.AH;
  const selectedCompany = companyInfo[selectedOption] ?? companyInfo.Empty;
  const currentCompany = {
    ...fallbackCompany,
    ...selectedCompany,
  };

  if (!initialData) return <div>No data available</div>;

  const location = locations.find((item) => item.id === initialData.locationId) as any;
  const pricingRows = buildPricingRows(initialData);

  const withFallback = (primary: any, fallback: any) => {
    const primaryParsed = parsePolicyField(primary);
    if (primaryParsed.length > 0) return primaryParsed;
    return parsePolicyField(fallback);
  };

  const policySections = [
    { key: 'inclusions', title: 'Inclusions', data: withFallback(initialData.inclusions, location?.inclusions) },
    { key: 'exclusions', title: 'Exclusions', data: withFallback(initialData.exclusions, location?.exclusions) },
    { key: 'importantNotes', title: 'Important Notes', data: withFallback(initialData.importantNotes, location?.importantNotes) },
    { key: 'paymentPolicy', title: 'Payment Policy', data: withFallback(initialData.paymentPolicy, location?.paymentPolicy) },
    { key: 'cancellationPolicy', title: 'Cancellation Policy', data: withFallback(initialData.cancellationPolicy, location?.cancellationPolicy) },
    { key: 'airlineCancellationPolicy', title: 'Airline Cancellation Policy', data: withFallback(initialData.airlineCancellationPolicy, location?.airlineCancellationPolicy) },
    { key: 'kitchenGroupPolicy', title: 'Kitchen Group Policy', data: withFallback(initialData.kitchenGroupPolicy, location?.kitchenGroupPolicy) },
    { key: 'usefulTip', title: 'Useful Tips', data: withFallback(initialData.usefulTip, location?.usefulTip) },
    { key: 'termsconditions', title: 'Terms and Conditions', data: withFallback(initialData.termsconditions, location?.termsconditions) },
  ].filter((section) => section.data.length > 0);

  return (
    <div className="flex flex-col space-y-2 md:space-y-4 px-4 sm:px-2 md:px-8 lg:px-40">
      <Card className="break-inside-avoid font-bold avoid-break-inside">
        <CardHeader className="bg-gray-50 rounded-t-lg flex justify-between items-center p-6">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-red-500 to-orange-500 text-transparent bg-clip-text print-gradient-fallback">
            {initialData.tourPackageName || 'Tour Package'}
          </CardTitle>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-red-500 to-orange-500 text-transparent bg-clip-text print-gradient-fallback">
            {initialData.tourPackageType ? `${initialData.tourPackageType} Package` : 'Package'}
          </CardTitle>
        </CardHeader>

        {initialData.images.map((image, index) => (
          <div key={index} className="w-full h-[500px]">
            <Image
              src={image.url}
              alt={`Tour Image ${index + 1}`}
              width={1200}
              height={500}
              className="object-cover w-full h-full"
            />
          </div>
        ))}
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardDescription className="text-2xl font-bold mb-4">
              {initialData.slug || initialData.id}
            </CardDescription>
            <div className="flex items-center justify-between mb-2">
              <CardDescription className="text-lg">
                <span className="font-bold">Package:</span> {initialData.tourPackageName || 'Tour Package'}
              </CardDescription>
              <Link href={`/tourPackagePDFGenerator/${initialData.id}?search=${selectedOption}`} className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium bg-orange-500 text-white hover:bg-orange-600">
                Download PDF
              </Link>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="break-inside-avoid border border-orange-200 shadow-md rounded-xl avoid-break-inside">
        <CardHeader className="px-5 py-4 bg-gray-50 border-b border-orange-100">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-transparent bg-clip-text print-gradient-fallback">Tour Information</h2>
        </CardHeader>
        <CardContent className="px-5 py-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-sm leading-snug">
            <div><span className="font-semibold text-gray-600">Location:</span> <span className="font-medium text-gray-900">{location?.label}</span></div>
            {initialData.tourCategory && (
              <div><span className="font-semibold text-gray-600">Category:</span> <span className="font-medium text-gray-900">{initialData.tourCategory}</span></div>
            )}
            {initialData.numDaysNight && (
              <div><span className="font-semibold text-gray-600">Duration:</span> <span className="font-medium text-gray-900">{initialData.numDaysNight}</span></div>
            )}
            {initialData.transport && (
              <div><span className="font-semibold text-gray-600">Transport:</span> <span className="font-medium text-gray-900">{initialData.transport}</span></div>
            )}
            {initialData.pickup_location && (
              <div><span className="font-semibold text-gray-600">Pickup:</span> <span className="font-medium text-gray-900">{initialData.pickup_location}</span></div>
            )}
            {initialData.drop_location && (
              <div><span className="font-semibold text-gray-600">Drop:</span> <span className="font-medium text-gray-900">{initialData.drop_location}</span></div>
            )}
          </div>
        </CardContent>
      </Card>

      {initialData.flightDetails && initialData.flightDetails.length > 0 && selectedOption !== 'SupplierA' && selectedOption !== 'SupplierB' && (
        <Card className="break-inside-avoid border border-blue-200 shadow-md rounded-xl">
          <CardHeader className="px-5 py-4 bg-gradient-to-r from-blue-50 to-sky-50 border-b border-blue-100">
            <h2 className="text-2xl font-bold flex items-center gap-2 bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-600 text-transparent bg-clip-text print-gradient-fallback">
              <PlaneIcon className="w-6 h-6 text-blue-600" />
              Flight Details
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Complete flight itinerary and travel information
            </p>
          </CardHeader>
          <CardContent className="px-5 py-6">
            <div className="space-y-4">
              {initialData.flightDetails.map((flight, index) => (
                <div key={flight.id} className="border border-blue-100 rounded-lg p-4 bg-gradient-to-r from-blue-50/50 to-sky-50/50 hover:shadow-md transition-shadow">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <PlaneTakeoffIcon className="w-5 h-5 text-blue-600" />
                        <span className="font-semibold text-gray-700">Flight {index + 1}</span>
                      </div>
                      {flight.flightName && <div><span className="text-sm font-semibold text-gray-600">Airline:</span><span className="ml-2 text-sm text-gray-900 font-medium">{flight.flightName}</span></div>}
                      {flight.flightNumber && <div><span className="text-sm font-semibold text-gray-600">Flight Number:</span><span className="ml-2 text-sm text-gray-900 font-medium">{flight.flightNumber}</span></div>}
                      {flight.date && <div><span className="text-sm font-semibold text-gray-600">Date:</span><span className="ml-2 text-sm text-gray-900 font-medium">{flight.date}</span></div>}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          {flight.from && <div><span className="text-sm font-semibold text-gray-600">From:</span><span className="ml-2 text-sm text-gray-900 font-medium">{flight.from}</span></div>}
                          {flight.departureTime && <div className="text-xs text-gray-500 mt-1">Departure: {flight.departureTime}</div>}
                        </div>
                        <div className="text-blue-600 font-bold">-&gt;</div>
                        <div>
                          {flight.to && <div><span className="text-sm font-semibold text-gray-600">To:</span><span className="ml-2 text-sm text-gray-900 font-medium">{flight.to}</span></div>}
                          {flight.arrivalTime && <div className="text-xs text-gray-500 mt-1">Arrival: {flight.arrivalTime}</div>}
                        </div>
                      </div>
                      {flight.flightDuration && (
                        <div className="text-center">
                          <span className="text-xs font-semibold text-gray-600">Duration:</span>
                          <span className="ml-2 text-xs text-gray-900 font-medium">{flight.flightDuration}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {flight.images && flight.images.length > 0 && (
                    <div className="mt-4 flex gap-2 flex-wrap">
                      {flight.images.map((image, imgIndex) => (
                        <div key={imgIndex} className="relative w-20 h-20 rounded overflow-hidden border border-blue-200">
                          <Image src={image.url} alt={`Flight ${index + 1} Image ${imgIndex + 1}`} fill className="object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {pricingRows.length > 0 && selectedOption !== 'Empty' && selectedOption !== 'SupplierA' && selectedOption !== 'SupplierB' && (
        <div className="mt-4 border border-orange-200 rounded-lg overflow-hidden shadow-sm">
          <div className="bg-gray-50 px-4 py-3 border-b border-orange-100 flex items-center justify-between">
            <h3 className="text-xl font-semibold bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-transparent bg-clip-text print-gradient-fallback flex items-center gap-2">Pricing Options</h3>
            <span className="text-xs text-gray-500">INR</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm bg-white">
              <colgroup>
                <col style={{ width: '55%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '25%' }} />
              </colgroup>
              <thead className="bg-orange-50 text-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold border-b">Type</th>
                  <th className="px-4 py-2 text-left font-semibold border-b">Price</th>
                  <th className="px-4 py-2 text-left font-semibold border-b">Description</th>
                </tr>
              </thead>
              <tbody>
                {pricingRows.map((item, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-orange-50/30'}>
                    <td className="px-4 py-2 border-b font-medium text-gray-900">{item.name}</td>
                    <td className="px-4 py-2 border-b text-gray-700">{item.price || '-'}</td>
                    <td className="px-4 py-2 border-b text-gray-600">{item.description || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedOption !== 'SupplierA' && initialData.itineraries && initialData.itineraries.length > 0 && (
        <Card className="mb-8 break-inside-avoid bg-white shadow-xl rounded-xl overflow-hidden border-2 border-gray-100 avoid-break-inside page-break-before">
          <div className="bg-gray-50 p-8 border-b">
            <CardTitle className="text-4xl font-bold text-center flex items-center justify-center gap-4 bg-gradient-to-r from-red-500 to-orange-500 text-transparent bg-clip-text print-gradient-fallback">
              <span>Hotel & Room Details</span>
            </CardTitle>
            <p className="text-center text-gray-500 mt-2 text-lg">Day-wise accommodation overview</p>
          </div>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <colgroup>
                  <col style={{ width: '40%' }} />
                  <col style={{ width: '60%' }} />
                </colgroup>
                <tbody className="bg-white">
                  {initialData.itineraries.map((itinerary) => {
                    const hotel = hotels.find((item) => item.id === itinerary.hotelId);
                    const roomAllocations = itinerary.roomAllocations ?? [];
                    const transportDetails = itinerary.transportDetails ?? [];
                    return (
                      <React.Fragment key={itinerary.id}>
                        <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-6 align-top" colSpan={2}>
                            <div className="flex items-start gap-4">
                              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-bold text-lg">
                                {itinerary.dayNumber}
                              </div>
                              <div>
                                <div className="text-xl font-bold text-gray-900" dangerouslySetInnerHTML={{ __html: formatItineraryDayHeader(itinerary) }} />
                              </div>
                            </div>
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 pb-6 pt-0" colSpan={2}>
                            <div className="bg-white ring-1 ring-gray-200 rounded-lg p-4 shadow-sm text-sm">
                              {hotel ? (
                                <div className="md:flex md:items-start md:gap-6 mb-2">
                                  <div className="md:w-48 w-36 flex-shrink-0">
                                    <div className="w-36 h-24 md:w-48 md:h-32 relative rounded overflow-hidden bg-gray-100">
                                      <Image
                                        src={hotel.images?.[0]?.url || '/placeholder-hotel.png'}
                                        alt={hotel.name || 'Hotel'}
                                        fill
                                        className="object-cover"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex-1 mt-3 md:mt-0">
                                    <Link href={hotel.link || '#'} target="_blank" rel="noopener noreferrer" className="text-lg font-semibold text-gray-900 underline">
                                      {hotel.name}
                                    </Link>
                                    <div className="text-sm text-gray-600">{hotel.destination?.name || hotel.location?.label || location?.label}</div>

                                    {roomAllocations.length > 0 ? (
                                      <div className="mt-3 overflow-x-auto">
                                        <table className="table-auto w-full text-left">
                                          <thead>
                                            <tr>
                                              <th className="px-2 py-1 text-gray-900 font-semibold">Room Type</th>
                                              <th className="px-2 py-1 text-gray-900 font-semibold">Occupancy</th>
                                              <th className="px-2 py-1 text-gray-900 font-semibold text-center">Qty</th>
                                              <th className="px-2 py-1 text-gray-900 font-semibold">Voucher No.</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {roomAllocations.map((room: any, roomIndex: number) => (
                                              <React.Fragment key={room.id || roomIndex}>
                                                <tr className="border-t border-gray-100 hover:bg-gray-50">
                                                  <td className="px-2 py-1 whitespace-nowrap">
                                                    {displayValue(room.customRoomType) || room?.roomType?.name || room.roomType || 'Standard'}
                                                  </td>
                                                  <td className="px-2 py-1 whitespace-nowrap">
                                                    {room?.occupancyType?.name || room.occupancyType || room.occupancyTypeId || '-'}
                                                  </td>
                                                  <td className="px-2 py-1 text-center whitespace-nowrap">{room.quantity || 1}</td>
                                                  <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-600">{room.voucherNumber || '-'}</td>
                                                </tr>
                                                {(room.extraBeds || []).map((extraBed: any, extraBedIndex: number) => (
                                                  <tr key={`${room.id || roomIndex}-extra-${extraBedIndex}`} className="bg-amber-50/50">
                                                    <td className="px-2 py-0.5 pl-6 text-xs text-amber-700">
                                                      + {extraBed.occupancyType?.name || '-'}
                                                    </td>
                                                    <td colSpan={3} className="px-2 py-0.5 text-xs text-amber-600 italic">Extra Bed</td>
                                                  </tr>
                                                ))}
                                              </React.Fragment>
                                            ))}
                                          </tbody>
                                        </table>
                                        {(() => {
                                          const plans = Array.from(new Set(roomAllocations.map((room: any) => room?.mealPlan?.name || room.mealPlan).filter(Boolean)));
                                          if (plans.length === 0) return null;
                                          return (
                                            <div className="mt-3 text-sm text-gray-700 italic">
                                              <span className="font-semibold">Meal Plan:</span> {plans.join(' / ')}
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    ) : (
                                      <div className="mt-3 grid sm:grid-cols-3 gap-2">
                                        {itinerary.roomCategory && <InfoPill label="Room" value={itinerary.roomCategory} />}
                                        {itinerary.numberofRooms && <InfoPill label="Rooms" value={itinerary.numberofRooms} />}
                                        {itinerary.mealsIncluded && <InfoPill label="Meal Plan" value={itinerary.mealsIncluded} />}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm text-gray-500 italic">No hotel selected for this day.</div>
                              )}

                              {transportDetails.length > 0 && (
                                <div className="mt-3 border-t pt-3">
                                  <h4 className="text-sm font-semibold text-orange-700 mb-2">Transport Details</h4>
                                  <div className="space-y-2">
                                    {transportDetails.map((transport: any, transportIndex: number) => (
                                      <div key={transport.id || transportIndex} className="flex items-center justify-between bg-orange-50 p-2 rounded gap-3">
                                        <div className="flex items-center gap-2">
                                          <CarIcon className="w-5 h-5 text-orange-700" />
                                          <div>
                                            <div className="font-semibold text-orange-800">{transport.vehicleType?.name || 'Vehicle'}</div>
                                            {transport.capacity && <div className="text-xs text-gray-600">Capacity: {transport.capacity}</div>}
                                            {transport.description && <div className="text-xs text-gray-500 mt-0.5">{transport.description}</div>}
                                          </div>
                                        </div>
                                        <div className="text-sm font-medium text-orange-800">Qty: {transport.quantity || 1}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {initialData.itineraries && initialData.itineraries.map((itinerary, index) => (
        <Card key={itinerary.id} className="mb-6 break-inside-avoid bg-white shadow-lg rounded-lg overflow-hidden avoid-break-inside page-break-before">
          {index === 0 && (
            <Card className="border rounded-lg shadow-lg p-6 bg-gray-50 text-center break-before-always">
              <CardTitle className="text-5xl font-bold bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 text-transparent bg-clip-text print-gradient-fallback">Itinerary</CardTitle>
            </Card>
          )}
          <div className="flex items-center justify-between bg-gray-50 p-6 rounded-t-lg">
            <CardTitle
              className="text-3xl font-bold bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 text-transparent bg-clip-text print-gradient-fallback"
              dangerouslySetInnerHTML={{ __html: formatItineraryDayHeader(itinerary) }}
            />
          </div>
          <div className="flex-grow p-8">
            <div className="text-2xl text-justify mb-6" dangerouslySetInnerHTML={{ __html: itinerary.itineraryDescription || '' }} />
          </div>

          <CardContent className="p-8">
            {itinerary.activities && itinerary.activities.length > 0 && (
              <Card className="my-6">
                <CardHeader className="bg-gray-50 p-6 text-3xl font-bold text-center rounded-t-lg">
                  <span className="bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 text-transparent bg-clip-text print-gradient-fallback">
                    Activities
                  </span>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid gap-6">
                    {itinerary.activities.map((activity, activityIndex) => (
                      <div key={activity.id || activityIndex} className="mb-6">
                        {activity.activityImages && activity.activityImages.length === 1 ? (
                          <div className="flex items-start mb-6 w-full">
                            <div className="w-[250px] h-[250px] flex-shrink-0">
                              <Image src={activity.activityImages[0].url} alt={`Activity Image ${activityIndex + 1}`} className="rounded-lg object-cover w-full h-full" width={250} height={250} />
                            </div>
                            <div className="ml-6 w-full">
                              <div className="text-3xl font-bold mb-3" dangerouslySetInnerHTML={{ __html: activity.activityTitle || '' }} />
                              <p className="text-2xl text-justify" dangerouslySetInnerHTML={{ __html: activity.activityDescription || '' }} />
                            </div>
                          </div>
                        ) : (
                          <div className="w-full">
                            <div className="flex justify-start items-center mb-6 gap-6">
                              {activity.activityImages && activity.activityImages.map((image, actImgIndex) => (
                                <div key={actImgIndex} className="w-[250px] h-[250px] flex-shrink-0">
                                  <Image src={image.url} alt={`Activity Image ${actImgIndex + 1}`} className="rounded-lg object-cover w-full h-full" width={250} height={250} />
                                </div>
                              ))}
                            </div>
                            <div className="text-3xl font-bold mb-3" dangerouslySetInnerHTML={{ __html: activity.activityTitle || '' }} />
                            <p className="text-2xl text-justify" dangerouslySetInnerHTML={{ __html: activity.activityDescription || '' }} />
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

      {policySections.length > 0 && (
        <Card className="break-inside-avoid border border-orange-200 shadow-md rounded-xl overflow-hidden avoid-break-inside page-break-before">
          <CardHeader className="p-6 bg-gray-50 border-b border-orange-100">
            <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-transparent bg-clip-text print-gradient-fallback">Policies & Terms</h2>
            <p className="text-sm text-gray-500 mt-1">Comprehensive overview of inclusions, exclusions and important travel policies</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid md:grid-cols-2 gap-6 p-6">
              {policySections.map((section) => (
                <div key={section.key} className="group rounded-xl border border-orange-100 hover:border-orange-300 transition-colors bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md">
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-orange-100 bg-gradient-to-r from-orange-50 via-rose-50 to-pink-50">
                    <span className="text-lg font-semibold bg-gradient-to-r from-orange-500 to-red-500 text-transparent bg-clip-text print-gradient-fallback">{section.title}</span>
                  </div>
                  <div className="px-4 py-4 space-y-3 text-sm leading-relaxed text-gray-700">
                    {section.data.map((item, index) => (
                      <p key={index} dangerouslySetInnerHTML={{ __html: item }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 bg-gradient-to-r from-orange-50 via-red-50 to-pink-50 border-t border-orange-200">
              <p className="text-xs text-orange-700 font-medium text-center">Policies are subject to change based on supplier terms & prevailing conditions at the time of booking.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedOption !== 'Empty' && selectedOption !== 'SupplierA' && selectedOption !== 'SupplierB' && (
        <CompanyFooter company={currentCompany} />
      )}

      {(selectedOption === 'SupplierA' || selectedOption === 'SupplierB') && (
        <CompanyFooter company={companyInfo.AH} />
      )}
    </div>
  );
};

function InfoPill({ label, value }: { label: string; value: string }) {
  const cleaned = displayValue(value);
  if (!cleaned) return null;
  return (
    <div className="bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-orange-700 font-semibold">{label}</div>
      <div className="text-sm text-gray-900 font-medium mt-1">{cleaned}</div>
    </div>
  );
}

function CompanyFooter({
  company,
}: {
  company: CompanyInfo[string];
}) {
  return (
    <Card className="mt-8 border border-orange-200 break-inside-avoid shadow-md rounded-xl overflow-hidden avoid-break-inside page-break-before">
      <CardDescription className="flex flex-col md:flex-row justify-between items-center px-6 py-6 gap-6 bg-gray-50">
        {company.logo && (
          <div className="inline-block relative w-40 h-40 md:w-48 md:h-48">
            <Image src={company.logo} alt={`${company.name} Logo`} fill className="object-contain" />
          </div>
        )}
        <ul className="font-semibold text-base md:text-lg space-y-2 text-center md:text-left">
          {company.name && <li className="bg-gradient-to-r from-orange-500 to-red-500 text-transparent bg-clip-text print-gradient-fallback font-bold text-lg">{company.name}</li>}
          {company.address && <li>{company.address}</li>}
          {company.phone && <li>Phone: {company.phone}</li>}
          {company.email && <li>Email: <Link href={`mailto:${company.email}`} className="text-blue-600 underline">{company.email}</Link></li>}
          {company.website && <li>Website: <Link href={company.website || '#'} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{company.website}</Link></li>}
        </ul>
      </CardDescription>
    </Card>
  );
}
