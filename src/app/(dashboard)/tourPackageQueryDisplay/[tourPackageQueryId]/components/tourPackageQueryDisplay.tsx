'use client'
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircleIcon, ChefHatIcon, CreditCardIcon, InfoIcon, PlaneIcon, PlaneTakeoffIcon, Shield, XCircleIcon, Building2Icon, BedIcon, CarIcon, MapPinIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Location, Images, Hotel, TourPackageQuery, Itinerary, FlightDetails, Activity, AssociatePartner, RoomAllocation, TransportDetail, TourDestination } from "@prisma/client";
import { useSearchParams } from 'next/navigation'
import { format, parseISO } from 'date-fns';
import { formatLocalDate } from '@/lib/timezone-utils';
import { Separator } from '@radix-ui/react-separator';
import { useEffect, useState } from 'react';
import { VariantComparisonSection } from '@/components/tour-package-query/VariantComparisonSection';

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
    queryVariantSnapshots?: {
      id: string;
      name: string;
      description: string | null;
      priceModifier: number | null;
      isDefault: boolean;
      sortOrder: number;
      hotelSnapshots: {
        id: string;
        dayNumber: number;
        hotelName: string;
        locationLabel: string;
        imageUrl: string | null;
        roomCategory: string | null;
      }[];
      pricingSnapshots: {
        id: string;
        mealPlanName: string;
        vehicleTypeName: string | null;
        numberOfRooms: number;
        totalPrice: any;
        pricingComponentSnapshots: {
          id: string;
          attributeName: string;
          price: any;
          purchasePrice: any | null;
          description: string | null;
        }[];
      }[];
    }[];
  } | null;
  locations: Location[];
  hotels: (Hotel & {
    images: Images[];
    location: Location;
    destination: TourDestination | null;
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

// Company info constant
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
    website: 'http://kobawalaholidays.com'
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

// ...existing code...

// Add this helper function to parse policy fields from the database
const parsePolicyField = (field: any): string[] => {
  if (!field) return [];
  try {
    if (typeof field === 'string') {
      // Try JSON, else treat as plain text (split by newline or bullet markers)
      try {
        const parsed = JSON.parse(field);
        if (Array.isArray(parsed)) return parsed.map(i => typeof i === 'string' ? i : extractText(i));
      } catch {
        // Not JSON; split heuristically
        return field.split(/\n|•|-|\u2022/).map(s => s.trim()).filter(Boolean);
      }
      return [field];
    }
    if (Array.isArray(field)) {
      return field.flatMap(item => {
        if (item == null) return [];
        if (typeof item === 'string') return [item];
        if (typeof item === 'object') return [extractText(item)];
        return [String(item)];
      }).filter(Boolean);
    }
    if (typeof field === 'object') {
      // If object with keys -> values that are strings or arrays
      const vals = Object.values(field);
      return vals.flatMap(v => parsePolicyField(v));
    }
    return [String(field)];
  } catch {
    return [];
  }
};

const extractText = (obj: any): string => {
  if (!obj) return '';
  for (const k of ['text', 'value', 'description', 'label', 'name']) {
    if (obj[k]) return String(obj[k]);
  }
  return String(obj);
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
    switch (title) {
      case "Inclusions": return <CheckCircleIcon className="h-7 w-7" />;
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
  const selectedOption = searchParams.get('search') || 'AH';

  const fallbackCompany = companyInfo.AH;
  const selectedCompany = companyInfo[selectedOption] ?? companyInfo.Empty;
  const currentCompany = {
    ...fallbackCompany,
    ...selectedCompany,
  };

  const [preparedBy, setPreparedBy] = useState<{ name: string; email: string } | null>(null);
  useEffect(() => {
    if (initialData?.id) {
      (async () => {
        try {
          const res = await fetch(`/api/audit-logs?entityId=${initialData.id}&entityType=TourPackageQuery&action=CREATE&limit=1`);
          if (res.ok) {
            const data = await res.json();
            const log = data.auditLogs?.[0];
            if (log) setPreparedBy({ name: log.userName, email: log.userEmail });
          }
        } catch { }
      })();
    }
  }, [initialData?.id]);


  if (!initialData) return <div>No data available</div>;

  return (
    <div className="flex flex-col space-y-2 md:space-y-4 px-4 sm:px-2 md:px-8 lg:px-40">
      <Card className="break-inside-avoid font-bold avoid-break-inside">
        <CardHeader className="bg-gray-50 rounded-t-lg flex justify-between items-center p-6">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-red-500 to-orange-500 text-transparent bg-clip-text print-gradient-fallback">
            {initialData.tourPackageQueryName}
          </CardTitle>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-red-500 to-orange-500 text-transparent bg-clip-text print-gradient-fallback">
            {initialData.tourPackageQueryType + " Package"}
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
            <div className="flex items-center justify-between mb-2">
              {preparedBy && (
                <div className="text-sm text-gray-600">Prepared by: <span className="font-semibold">{preparedBy.name}</span> <span className="ml-2">({preparedBy.email})</span></div>
              )}
              <Link href={`/tourPackageQueryPDFGenerator/${initialData.id}?search=${selectedOption}`} className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium bg-orange-500 text-white hover:bg-orange-600">Download PDF</Link>
            </div>

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


      {/* Tour Package Details (Condensed) */}
      <Card className="break-inside-avoid border border-orange-200 shadow-md rounded-xl avoid-break-inside">
        <CardHeader className="px-5 py-4 bg-gray-50 border-b border-orange-100">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-transparent bg-clip-text print-gradient-fallback">Tour Information</h2>
        </CardHeader>
        <CardContent className="px-5 py-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-sm leading-snug">
            <div><span className="font-semibold text-gray-600">Location:</span> <span className="font-medium text-gray-900">{locations.find(l => l.id === initialData.locationId)?.label}</span></div>
            {initialData.numDaysNight && (
              <div><span className="font-semibold text-gray-600">Duration:</span> <span className="font-medium text-gray-900">{initialData.numDaysNight}</span></div>
            )}
            {(initialData.tourStartsFrom || initialData.tourEndsOn) && (
              <div className="col-span-full lg:col-span-1"><span className="font-semibold text-gray-600">Period:</span> <span className="font-medium text-gray-900">{initialData.tourStartsFrom ? formatLocalDate(initialData.tourStartsFrom, 'dd-MM-yyyy') : ''}{initialData.tourStartsFrom && initialData.tourEndsOn && ' → '}{initialData.tourEndsOn ? formatLocalDate(initialData.tourEndsOn, 'dd-MM-yyyy') : ''}</span></div>
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
            {(initialData.numAdults || initialData.numChild5to12 || initialData.numChild0to5) && (
              <div className="col-span-full lg:col-span-2 flex flex-wrap gap-x-8 gap-y-1">
                {initialData.numAdults && <span><span className="font-semibold text-gray-600">Adults:</span> <span className="font-medium text-gray-900">{initialData.numAdults}</span></span>}
                {initialData.numChild5to12 && <span><span className="font-semibold text-gray-600">Children 5-12:</span> <span className="font-medium text-gray-900">{initialData.numChild5to12}</span></span>}
                {initialData.numChild0to5 && <span><span className="font-semibold text-gray-600">Children 0-5:</span> <span className="font-medium text-gray-900">{initialData.numChild0to5}</span></span>}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Flight Details Section */}
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
                      {flight.flightName && (
                        <div>
                          <span className="text-sm font-semibold text-gray-600">Airline:</span>
                          <span className="ml-2 text-sm text-gray-900 font-medium">{flight.flightName}</span>
                        </div>
                      )}
                      {flight.flightNumber && (
                        <div>
                          <span className="text-sm font-semibold text-gray-600">Flight Number:</span>
                          <span className="ml-2 text-sm text-gray-900 font-medium">{flight.flightNumber}</span>
                        </div>
                      )}
                      {flight.date && (
                        <div>
                          <span className="text-sm font-semibold text-gray-600">Date:</span>
                          <span className="ml-2 text-sm text-gray-900 font-medium">{flight.date}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          {flight.from && (
                            <div>
                              <span className="text-sm font-semibold text-gray-600">From:</span>
                              <span className="ml-2 text-sm text-gray-900 font-medium">{flight.from}</span>
                            </div>
                          )}
                          {flight.departureTime && (
                            <div className="text-xs text-gray-500 mt-1">Departure: {flight.departureTime}</div>
                          )}
                        </div>
                        <div className="text-blue-600 font-bold">→</div>
                        <div>
                          {flight.to && (
                            <div>
                              <span className="text-sm font-semibold text-gray-600">To:</span>
                              <span className="ml-2 text-sm text-gray-900 font-medium">{flight.to}</span>
                            </div>
                          )}
                          {flight.arrivalTime && (
                            <div className="text-xs text-gray-500 mt-1">Arrival: {flight.arrivalTime}</div>
                          )}
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
                          <Image
                            src={image.url}
                            alt={`Flight ${index + 1} Image ${imgIndex + 1}`}
                            fill
                            className="object-cover"
                          />
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
      {/* Variant Comparison Section */}
      {initialData.queryVariantSnapshots && initialData.queryVariantSnapshots.length > 0 && (
        <Card className="break-inside-avoid border border-blue-200 shadow-md rounded-xl avoid-break-inside">
          <CardHeader className="px-5 py-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-blue-100">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-transparent bg-clip-text">
              Package Variants
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Compare different package options with varying accommodations and pricing
            </p>
          </CardHeader>
          <CardContent className="px-5 py-6">
            <VariantComparisonSection variants={initialData.queryVariantSnapshots} />
          </CardContent>
        </Card>
      )}

      {/* Enhanced Pricing Options Table */}
      {initialData.pricingSection && selectedOption !== 'Empty' && selectedOption !== 'SupplierA' && selectedOption !== 'SupplierB' && parsePricingSection(initialData.pricingSection).length > 0 && (
        <div className="mt-4 border border-orange-200 rounded-lg overflow-hidden shadow-sm">
          <div className="bg-gray-50 px-4 py-3 border-b border-orange-100 flex items-center justify-between">
            <h3 className="text-xl font-semibold bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-transparent bg-clip-text print-gradient-fallback flex items-center gap-2"><span className="text-base">💰</span>Pricing Options</h3>
            <span className="text-xs text-gray-500">INR</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm bg-white">
              <colgroup>
                <col style={{ width: '55%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '25%' }} />
              </colgroup>
              <thead className="bg-gray-50 text-[11px] uppercase text-gray-600">
                <tr className="divide-x divide-gray-200">
                  <th className="px-3 py-2 text-left font-semibold">Item</th>
                  <th className="px-3 py-2 text-left font-semibold text-center">Base</th>
                  <th className="px-3 py-2 text-left font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {parsePricingSection(initialData.pricingSection).map((item, index) => (
                  <tr key={index} className="hover:bg-orange-50/60">
                    <td className="px-3 py-2 font-medium text-gray-900 truncate max-w-[200px]">{item.name}</td>
                    <td className="px-3 py-2 text-green-600 font-semibold whitespace-nowrap">{item.price ? `₹ ${parseFloat(item.price).toLocaleString('en-IN')}` : '-'}</td>
                    <td className="px-3 py-2 text-gray-700 leading-snug">{item.description || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 bg-orange-50 border-t border-orange-100">
            <p className="text-[11px] text-orange-600 italic">* Subject to availability & taxes including GST </p>
          </div>
        </div>
      )}
      {/* Enhanced Total Price Display */}
      {(() => {
        const isPriceVisible = initialData.totalPrice && selectedOption !== 'Empty' && selectedOption !== 'SupplierA' && selectedOption !== 'SupplierB' && initialData.totalPrice !== ' ';

        return (
          <>
            {isPriceVisible && (
              <div className="mt-6 page-break-before avoid-break-inside">
                <Card className="border-2 border-orange-200 rounded-lg shadow-xl overflow-hidden">
                  <div className="bg-gray-50 px-6 py-5">
                    <h3 className="text-3xl font-bold bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 text-transparent bg-clip-text print-gradient-fallback flex items-center">
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
                            (initialData.totalPrice || '')
                        }} />
                      </div>
                      <div className="text-lg text-gray-600 bg-orange-50 px-6 py-3 rounded-full inline-block mb-4">
                        <span className="font-semibold">Final Tour Package Cost</span>
                      </div>
                      <div className="block mt-2">
                        <div className="text-sm text-orange-600 bg-orange-100 px-4 py-2 rounded-lg inline-block border border-orange-200">
                          <span className="font-semibold">including GST </span>
                        </div>
                      </div>
                    </div>
                    {initialData.remarks && initialData.remarks !== '' && (
                      <div className="mt-8 pt-6 border-t border-gray-100 text-left">
                        <h4 className="text-lg font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <InfoIcon className="w-5 h-5 text-orange-500" />
                          Remarks
                        </h4>
                        <div className="text-gray-600 bg-gray-50 p-4 rounded-lg border border-gray-100" dangerouslySetInnerHTML={{ __html: initialData.remarks || '' }}></div>
                      </div>
                    )}
                    {initialData.disclaimer && initialData.disclaimer !== '' && (
                      <div className="mt-4 pt-4 border-t border-gray-100 text-left">
                        <h4 className="text-lg font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <InfoIcon className="w-5 h-5 text-orange-500" />
                          Disclaimer
                        </h4>
                        <div className="text-gray-600 bg-gray-50 p-4 rounded-lg border border-gray-100" dangerouslySetInnerHTML={{ __html: initialData.disclaimer || '' }}></div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {!isPriceVisible && (
              <div className="flex flex-col space-y-4">
                {initialData.remarks && initialData.remarks !== '' && (
                  <Card className="break-inside-avoid text-2xl mt-6">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xl font-bold text-gray-800">Remarks</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div>
                        <div dangerouslySetInnerHTML={{ __html: initialData.remarks || '' }}></div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {initialData.disclaimer && initialData.disclaimer !== '' && (
                  <Card className="break-inside-avoid text-2xl mt-4">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xl font-bold text-gray-800">Disclaimer</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div>
                        <div dangerouslySetInnerHTML={{ __html: initialData.disclaimer || '' }}></div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </>
        );
      })()}




      {/* Hotel, Room Allocation and Transport Details Day-wise */}
      {selectedOption !== 'SupplierA' && initialData.itineraries && initialData.itineraries.length > 0 && (
        <Card className="mb-8 break-inside-avoid bg-white shadow-xl rounded-xl overflow-hidden border-2 border-gray-100 avoid-break-inside page-break-before">
          {/* Enhanced Header */}
          <div className="bg-gray-50 p-8 border-b">
            <CardTitle className="text-4xl font-bold text-center flex items-center justify-center gap-4 bg-gradient-to-r from-red-500 to-orange-500 text-transparent bg-clip-text print-gradient-fallback">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 3a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
              <span>
                Hotel, Room Allocation & Transport Details
              </span>
            </CardTitle>
            <p className="text-center text-gray-500 mt-2 text-lg">Comprehensive day-wise accommodation and transport overview</p>
          </div>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <colgroup>
                  <col style={{ width: '40%' }} />
                  <col style={{ width: '60%' }} />
                </colgroup>

                {/* table header intentionally removed to reduce visual clutter */}

                <tbody className="bg-white">
                  {initialData.itineraries.map((itinerary) => (
                    <React.Fragment key={itinerary.id}>
                      {/* Header row: Day and title spanning full width */}
                      <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-6 align-top" colSpan={2}>
                          <div className="flex items-start gap-4">
                            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-bold text-lg">
                              {itinerary.dayNumber}
                            </div>
                            <div>
                              <div className="text-xl font-bold text-gray-900">
                                Day {itinerary.dayNumber}: {itinerary.days}
                              </div>
                              {(() => {
                                const t = itinerary.itineraryTitle?.replace(/^<p>/, '').replace(/<\/p>$/, '');
                                return t ? <div className="text-base text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: t }} /> : null;
                              })()}
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Details row: table below header, full width */}
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 pb-6 pt-0" colSpan={2}>
                          <div className="bg-white ring-1 ring-gray-200 rounded-lg p-4 shadow-sm text-sm">
                            {itinerary.hotelId && hotels.find(h => h.id === itinerary.hotelId) && (
                              <div className="md:flex md:items-start md:gap-6 mb-2">
                                {/* Left: hotel image only */}
                                <div className="md:w-48 w-36 flex-shrink-0">
                                  <div className="w-36 h-24 md:w-48 md:h-32 relative rounded overflow-hidden bg-gray-100">
                                    <Image
                                      src={hotels.find(h => h.id === itinerary.hotelId)?.images?.[0]?.url || '/placeholder-hotel.png'}
                                      alt={hotels.find(h => h.id === itinerary.hotelId)?.name || 'Hotel'}
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                </div>

                                {/* Right: hotel name above allocations table */}
                                <div className="flex-1">
                                  <div className="mb-2">
                                    <div>
                                      <Link href={hotels.find(h => h.id === itinerary.hotelId)?.link || '#'} target="_blank" rel="noopener noreferrer" className="text-lg md:text-xl font-semibold text-gray-900 underline">
                                        {hotels.find(h => h.id === itinerary.hotelId)?.name}
                                      </Link>
                                      <div className="text-sm text-gray-600">{hotels.find(h => h.id === itinerary.hotelId)?.destination?.name || ''}</div>
                                    </div>
                                  </div>
                                  <div className="overflow-x-auto">
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
                                        {itinerary.roomAllocations?.map((room: any, idx: number) => (
                                          <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50">
                                            <td className="px-2 py-1 whitespace-nowrap">
                                              <div>
                                                {(() => {
                                                  const customText = typeof room?.customRoomType === 'string' ? room.customRoomType.trim() : '';
                                                  const isCustom = customText.length > 0;
                                                  const label = isCustom ? customText : (room?.roomType?.name || room.roomType || 'Standard');
                                                  return (<span>{label}</span>);
                                                })()}
                                              </div>
                                            </td>
                                            <td className="px-2 py-1 whitespace-nowrap">
                                              <span>{room?.occupancyType?.name || room.occupancyType || room.occupancyTypeId || '-'}</span>
                                            </td>
                                            <td className="px-2 py-1 text-center whitespace-nowrap">
                                              <span className="font-medium">{room.quantity || 1}</span>
                                            </td>
                                            <td className="px-2 py-1 whitespace-nowrap">
                                              <span className="text-sm text-gray-600">{room.voucherNumber || '-'}</span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>

                                  {/* Unique Meal Plan display (below table) */}
                                  {(() => {
                                    const plans = Array.from(new Set((itinerary.roomAllocations || []).map((r: any) => r?.mealPlan?.name || r.mealPlan).filter(Boolean)));
                                    if (plans.length === 0) return null;
                                    return (
                                      <div className="mt-3 text-sm text-gray-700 italic">
                                        <span className="font-semibold">Meal Plan:</span> {plans.join(' / ')}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            )}

                            {/* Transport details separate block (full width below) */}
                            {itinerary.transportDetails && itinerary.transportDetails.length > 0 && (
                              <div className="mt-3 border-t pt-3">
                                <h4 className="text-sm font-semibold text-orange-700 mb-2">Transport Details</h4>
                                <div className="space-y-2">
                                  {itinerary.transportDetails.map((t: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between bg-orange-50 p-2 rounded gap-3">
                                      <div className="flex items-center gap-2">
                                        <CarIcon className="w-5 h-5 text-orange-700" />
                                        <div>
                                          <div className="font-semibold text-orange-800">{t.vehicleType?.name || 'Vehicle'}</div>
                                          {t.capacity && <div className="text-xs text-gray-600">Capacity: {t.capacity}</div>}
                                        </div>
                                      </div>
                                      <div className="text-sm font-medium text-orange-800">Qty: {t.quantity || 1}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Enhanced Footer */}
            <div className="bg-gradient-to-r from-orange-50 to-red-50 px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <p className="text-sm text-gray-600 font-medium">
                  This summary provides a comprehensive day-wise overview of accommodation and transport arrangements
                </p>
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Itineraries */}
      {
        selectedOption !== 'SupplierA' && initialData.itineraries && initialData.itineraries.map((itinerary, index) => (
          <Card key={index} className="mb-6 break-inside-avoid bg-white shadow-lg rounded-lg overflow-hidden avoid-break-inside page-break-before">
            {index === 0 &&
              <Card className="border rounded-lg shadow-lg p-6 bg-gray-50 text-center break-before-always">
                <CardTitle className="text-5xl font-bold bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 text-transparent bg-clip-text print-gradient-fallback">Itinerary</CardTitle>
              </Card>}
            <div className="flex items-center justify-between bg-gray-50 p-6 rounded-t-lg">
              {/* Day and Title grouped */}
              <div>
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 text-transparent bg-clip-text print-gradient-fallback"
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
              <div className="text-2xl text-justify mb-6" dangerouslySetInnerHTML={{ __html: itinerary.itineraryDescription || '' }}></div>
            </div>

            <CardContent className="p-8">
              {/* Activities Section */}
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



      {/* Footer Section with Company Details */}

      {/* Policies & Terms Section (moved to bottom with fallbacks) */}
      {(() => {
        const loc = locations.find(l => l.id === initialData.locationId) as any;
        const withFallback = (primary: any, fallback: any) => {
          const primaryParsed = parsePolicyField(primary);
          if (primaryParsed.length > 0) return primaryParsed;
          return parsePolicyField(fallback);
        };
        const sections = [
          { key: 'inclusions', title: 'Inclusions', data: withFallback(initialData.inclusions, loc?.inclusions) },
          { key: 'exclusions', title: 'Exclusions', data: withFallback(initialData.exclusions, loc?.exclusions) },
          { key: 'importantNotes', title: 'Important Notes', data: withFallback(initialData.importantNotes, loc?.importantNotes) },
          { key: 'paymentPolicy', title: 'Payment Policy', data: withFallback(initialData.paymentPolicy, loc?.paymentPolicy) },
          { key: 'cancellationPolicy', title: 'Cancellation Policy', data: withFallback(initialData.cancellationPolicy, loc?.cancellationPolicy) },
          { key: 'airlineCancellationPolicy', title: 'Airline Cancellation Policy', data: withFallback(initialData.airlineCancellationPolicy, loc?.airlineCancellationPolicy) },
          { key: 'kitchenGroupPolicy', title: 'Kitchen Group Policy', data: withFallback(initialData.kitchenGroupPolicy, loc?.kitchenGroupPolicy) },
          { key: 'usefulTip', title: 'Useful Tips', data: withFallback(initialData.usefulTip, loc?.usefulTip) },
          { key: 'termsconditions', title: 'Terms and Conditions', data: withFallback(initialData.termsconditions, loc?.termsconditions) },
        ];
        const filtered = sections.filter(s => s.data.length > 0);
        if (filtered.length === 0) return null;
        return (
          <Card className="break-inside-avoid border border-orange-200 shadow-md rounded-xl overflow-hidden avoid-break-inside page-break-before">
            <CardHeader className="p-6 bg-gray-50 border-b border-orange-100">
              <h2 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-transparent bg-clip-text print-gradient-fallback">Policies & Terms</h2>
              <p className="text-sm text-gray-500 mt-1">Comprehensive overview of inclusions, exclusions and important travel policies</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid md:grid-cols-2 gap-6 p-6">
                {filtered.map(section => (
                  <div key={section.key} className="group rounded-xl border border-orange-100 hover:border-orange-300 transition-colors bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md">
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-orange-100 bg-gradient-to-r from-orange-50 via-rose-50 to-pink-50">
                      <span className="text-lg font-semibold bg-gradient-to-r from-orange-500 to-red-500 text-transparent bg-clip-text print-gradient-fallback">{section.title}</span>
                    </div>
                    <ul className="list-disc pl-6 pr-4 py-4 space-y-2 text-sm leading-relaxed text-gray-700">
                      {section.data.map((item, idx) => (
                        <li key={idx} className="marker:text-orange-400">
                          <span dangerouslySetInnerHTML={{ __html: item }} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="px-6 py-4 bg-gradient-to-r from-orange-50 via-red-50 to-pink-50 border-t border-orange-200">
                <p className="text-xs text-orange-700 font-medium text-center">Policies are subject to change based on supplier terms & prevailing conditions at the time of booking.</p>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Company Details moved to very end */}
      {selectedOption !== 'Empty' && selectedOption !== 'SupplierA' && selectedOption !== 'SupplierB' && (
        <Card className="mt-8 border border-orange-200 break-inside-avoid shadow-md rounded-xl overflow-hidden avoid-break-inside page-break-before">
          <CardDescription className="flex flex-col md:flex-row justify-between items-center px-6 py-6 gap-6 bg-gray-50">
            <div className="inline-block relative w-40 h-40 md:w-48 md:h-48">
              <Image src={currentCompany.logo} alt={`${currentCompany.name} Logo`} fill className="object-contain" />
            </div>
            <ul className='font-semibold text-base md:text-lg space-y-2 text-center md:text-left'>
              <li className="bg-gradient-to-r from-orange-500 to-red-500 text-transparent bg-clip-text print-gradient-fallback font-bold text-lg">{currentCompany.name}</li>
              <li>{currentCompany.address}</li>
              <li>Phone: {currentCompany.phone}</li>
              <li>Email: <Link href={`mailto:${currentCompany.email}`} className="text-blue-600 underline">{currentCompany.email}</Link></li>
              <li>Website: <Link href={currentCompany.website || '#'} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{currentCompany.website}</Link></li>
            </ul>
          </CardDescription>
        </Card>
      )}

      {(selectedOption === 'SupplierA' || selectedOption === 'SupplierB') && (
        <Card className="mt-8 border border-orange-200 break-inside-avoid shadow-md rounded-xl overflow-hidden avoid-break-inside page-break-before">
          <CardDescription className="flex flex-col md:flex-row justify-between items-center px-6 py-6 gap-6 bg-gray-50">
            <div className="inline-block relative w-40 h-40 md:w-48 md:h-48">
              <Image src={companyInfo.AH.logo} alt={`${companyInfo.AH.name} Logo`} fill className="object-contain" />
            </div>
            <ul className="font-semibold text-base md:text-lg space-y-2 text-center md:text-left">
              <li className="bg-gradient-to-r from-orange-500 to-red-500 text-transparent bg-clip-text print-gradient-fallback font-bold text-lg">{companyInfo.AH.name}</li>
              <li>{companyInfo.AH.address}</li>
              <li>Phone: {companyInfo.AH.phone}</li>
              <li>Email: <Link href={`mailto:${companyInfo.AH.email}`} className="text-blue-600 underline">{companyInfo.AH.email}</Link></li>
              <li>Website: <Link href={companyInfo.AH.website || '#'} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{companyInfo.AH.website}</Link></li>
            </ul>
          </CardDescription>
        </Card>
      )}


    </div >
  );
};