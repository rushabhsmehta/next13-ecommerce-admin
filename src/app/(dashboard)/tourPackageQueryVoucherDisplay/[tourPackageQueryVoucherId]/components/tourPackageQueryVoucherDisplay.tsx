'use client'
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircleIcon, ChefHatIcon, CreditCardIcon, InfoIcon, PlaneIcon, PlaneTakeoffIcon, Shield, XCircleIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { VoucherActions } from "@/components/voucher-actions";
import type { Location, Images, Hotel, TourPackageQuery, Itinerary, FlightDetails, Activity, RoomAllocation, TransportDetail, RoomType, OccupancyType, MealPlan, VehicleType } from "@prisma/client";
import { useSearchParams } from 'next/navigation';
import { formatLocalDate } from '@/lib/timezone-utils';

interface TourPackageQueryVoucherDisplayProps {
  initialData: TourPackageQuery & {
    images: Images[];
    itineraries: (Itinerary & {
      itineraryImages: Images[];
      activities: (Activity & {
        activityImages: Images[];
      })[];
      roomAllocations: (RoomAllocation & {
        roomType: RoomType | null;
        occupancyType: OccupancyType | null;
        mealPlan: MealPlan | null;
        quantity?: number | null;
        voucherNumber?: string | null;
        customRoomType?: string | null;
      })[];
    })[];
    flightDetails: FlightDetails[];
  } | null;
  locations: Location[];
  hotels: (Hotel & {
    images: Images[];
  })[];
  roomTypes?: { id: string; name: string }[];
  occupancyTypes?: { id: string; name: string }[];
  mealPlans?: { id: string; name: string }[];
  selectedOption?: string;
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
    <div className="rounded-xl border border-orange-100 bg-white/90 p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center gap-3 text-gray-800">
        {getIcon()}
        <h3 className="text-base font-semibold sm:text-lg">{title}</h3>
      </div>
      <ul className="list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-gray-700 sm:pl-6">
        {items.map((item, index) => (
          <li key={index} className="leading-relaxed">{item}</li>
        ))}
      </ul>
    </div>
  );
};

export const TourPackageQueryVoucherDisplay: React.FC<TourPackageQueryVoucherDisplayProps> = ({
  initialData,
  locations,
  hotels,
  roomTypes = [],
  occupancyTypes = [],
  mealPlans = [],
}) => {

  const searchParams = useSearchParams();
  const selectedOption = searchParams?.get('search') || 'Empty'; // 'option' is the name of your query parameter

  // Now you can use selectedOption to get data from your companyInfo object
  const currentCompany = companyInfo[selectedOption] ?? companyInfo['Empty'];

  // Confirmed variant room allocations (Issue 6)
  const confirmedVariantId = (initialData as any)?.confirmedVariantId as string | null | undefined;
  const variantRoomAllocationsRaw = (initialData as any)?.variantRoomAllocations;
  const variantRoomAllocations: Record<string, Record<string, any[]>> = (() => {
    if (!variantRoomAllocationsRaw) return {};
    try {
      return typeof variantRoomAllocationsRaw === 'string'
        ? JSON.parse(variantRoomAllocationsRaw)
        : variantRoomAllocationsRaw;
    } catch { return {}; }
  })();
  // When a variant is confirmed, use its room allocations for the voucher
  const confirmedAllocations = confirmedVariantId ? variantRoomAllocations[confirmedVariantId] : null;

  const supplierView = selectedOption === 'SupplierA' || selectedOption === 'SupplierB';
  const customerSummary = [initialData?.customerName, initialData?.customerNumber].filter(Boolean).join(' | ') || 'Details unavailable';
  const assignedSummary = [initialData?.assignedTo, initialData?.assignedToMobileNumber, initialData?.assignedToEmail].filter(Boolean).join(' | ') || 'Not assigned';
  const totalPriceClean = initialData?.totalPrice ? String(initialData.totalPrice).trim() : '';
  const totalPriceParsed = totalPriceClean ? Number(totalPriceClean.replace(/[^0-9.-]/g, '')) : NaN;
  const formattedTotalPrice = totalPriceClean
    ? (Number.isNaN(totalPriceParsed) ? totalPriceClean : `₹ ${totalPriceParsed.toLocaleString('en-IN')}`)
    : '';
  const pricingItems = parsePricingSection(initialData?.pricingSection);
  const hasPricing = !supplierView && selectedOption !== 'Empty' && pricingItems.length > 0;

  const footerLabel = [currentCompany.name || initialData?.tourPackageQueryName, 'Booking Voucher']
    .filter(Boolean)
    .join(' • ');
  const footerPrimaryLine = currentCompany.name
    ? [currentCompany.name, currentCompany.address].filter(Boolean).join(' • ')
    : initialData?.tourPackageQueryName || '';
  const footerSecondaryLine = [
    currentCompany.phone ? `Phone: ${currentCompany.phone}` : null,
    currentCompany.email ? `Email: ${currentCompany.email}` : null,
  ]
    .filter(Boolean)
    .join(' • ');
  const footerWebsite = currentCompany.website || '';
  const footerLogo = currentCompany.logo || '';
  const footerTagline = selectedOption === 'AH' ? 'Your Trusted Travel Partner' : '';

  const sectionTitleGradient = "bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-transparent bg-clip-text print-gradient-fallback";

  // Update the PolicySection component with larger font sizes


  if (!initialData || !initialData.isFeatured) return <div>No data available</div>;

  return (
    <div className="space-y-4 px-3 sm:px-4 md:px-6 lg:px-10 xl:px-16">
      <div className="flex justify-center print:hidden sm:justify-end">
        <VoucherActions id={initialData.id} type="tour-package-query" />
      </div>

      <div
        id="voucher-content"
        data-pdf-footer-label={footerLabel}
        data-pdf-footer-primary={footerPrimaryLine}
        data-pdf-footer-secondary={footerSecondaryLine}
        data-pdf-footer-website={footerWebsite}
        data-pdf-footer-logo={footerLogo}
        data-pdf-footer-tagline={footerTagline}
        className="mx-auto flex w-full max-w-3xl flex-col space-y-3 rounded-2xl border border-orange-100 bg-white/95 p-4 pb-28 shadow-lg sm:space-y-4 sm:p-6 sm:pb-32"
      >
        <Card data-pdf-section="true" className="break-inside-avoid font-bold avoid-break-inside">
          <CardHeader className="bg-gray-50 rounded-t-lg flex flex-col gap-4 p-6">
            <div className="flex flex-col items-center gap-3 text-center">
              {selectedOption !== 'Empty' && currentCompany.logo ? (
                <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-orange-200 bg-white shadow-sm">
                  <Image src={currentCompany.logo} alt={`${currentCompany.name || 'Company'} Logo`} width={56} height={56} className="max-h-12 max-w-12 object-contain" />
                </div>
              ) : null}
              <div className="flex flex-col items-center gap-1">
                {currentCompany.name ? (
                  <span className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-500">
                    {currentCompany.name}
                  </span>
                ) : null}
                <CardTitle className={`text-2xl font-bold ${sectionTitleGradient} text-center leading-snug`}>
                  {initialData.tourPackageQueryName}
                </CardTitle>
                <CardDescription className="text-sm font-medium text-gray-500">
                  Voucher Reference: {initialData.tourPackageQueryNumber}
                </CardDescription>
                <span className="mt-1 h-1 w-16 rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-pink-500" />
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-orange-700">
                  Booking Voucher
                </span>
                <span className="text-sm font-semibold text-gray-600">
                  {initialData.tourPackageQueryType} Package
                </span>
              </div>
            </div>
          </CardHeader>
          {initialData.images.map((image, index) => (
            <div key={index} className="h-[220px] w-full overflow-hidden rounded-b-2xl sm:h-[300px] md:h-[380px]">
              <Image
                src={image.url}
                alt={`${initialData.tourPackageQueryName || 'Tour'} Image ${index + 1}`}
                width={1200}
                height={400}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </Card>

        <Card data-pdf-section="true" data-pdf-break-before="true" className="rounded-xl border border-orange-200 shadow-sm">
          <CardHeader className="border-b border-orange-100 bg-gradient-to-r from-orange-50 via-white to-orange-50 px-5 py-5">
            <div className="flex flex-col gap-1">
              <h2 className={`text-lg font-semibold ${sectionTitleGradient}`}>Guest & Assignment Details</h2>
              <CardDescription className="text-sm text-gray-500">
                Matches the styling used in the Tour Package Query download PDF.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-5 py-5 text-[15px] text-gray-700 md:text-sm">
            {!supplierView && (
              <>
                <div className="space-y-1">
                  <span className="font-semibold text-gray-600">Customer</span>
                  <span className="font-medium text-gray-900">{customerSummary}</span>
                </div>
                <div className="space-y-1">
                  <span className="font-semibold text-gray-600">Assigned To</span>
                  <span className="font-medium text-gray-900">{assignedSummary}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        {/* Tour Package Details */}
        <Card data-pdf-section="true" className="break-inside-avoid border border-orange-200 shadow-md rounded-xl">
          <CardHeader className="px-5 py-5 bg-gradient-to-r from-orange-50 via-white to-orange-50 border-b border-orange-100">
            <div className="flex items-center justify-between gap-3">
              <h2 className={`text-2xl font-bold ${sectionTitleGradient}`}>Tour Information</h2>
              <span className="hidden rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-orange-700 sm:inline-flex">
                Overview
              </span>
            </div>
          </CardHeader>

          <CardContent className="px-5 py-5">
            <div className="grid gap-x-6 gap-y-4 text-[15px] leading-relaxed sm:grid-cols-2 md:text-sm lg:grid-cols-3">
              <div>
                <span className="font-semibold text-gray-600">Location:</span> <span className="font-medium text-gray-900">{locations.find(location => location.id === initialData.locationId)?.label}</span>
              </div>
              {initialData.numDaysNight && (
                <div>
                  <span className="font-semibold text-gray-600">Duration:</span> <span className="font-medium text-gray-900">{initialData.numDaysNight}</span>
                </div>
              )}
              {(initialData.tourStartsFrom || initialData.tourEndsOn) && (
                <div className="col-span-full lg:col-span-1">
                  <span className="font-semibold text-gray-600">Period:</span> <span className="font-medium text-gray-900">{initialData.tourStartsFrom ? formatLocalDate(initialData.tourStartsFrom, 'dd-MM-yyyy') : ''}{initialData.tourStartsFrom && initialData.tourEndsOn && ' → '}{initialData.tourEndsOn ? formatLocalDate(initialData.tourEndsOn, 'dd-MM-yyyy') : ''}</span>
                </div>
              )}
              {initialData.transport && (
                <div>
                  <span className="font-semibold text-gray-600">Transport:</span> <span className="font-medium text-gray-900">{initialData.transport}</span>
                </div>
              )}
              {initialData.pickup_location && (
                <div>
                  <span className="font-semibold text-gray-600">Pickup:</span> <span className="font-medium text-gray-900">{initialData.pickup_location}</span>
                </div>
              )}
              {initialData.drop_location && (
                <div>
                  <span className="font-semibold text-gray-600">Drop:</span> <span className="font-medium text-gray-900">{initialData.drop_location}</span>
                </div>
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


        {hasPricing && (
          <div data-pdf-section="true" className="mt-4 overflow-hidden rounded-xl border border-orange-200 shadow-sm">
            <div className="flex items-center justify-between border-b border-orange-100 bg-gradient-to-r from-orange-50 via-white to-orange-50 px-4 py-3">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 sm:text-xl">
                <span className="text-base">💰</span>
                <span className={sectionTitleGradient}>Pricing Options</span>
              </h3>
              <span className="text-xs uppercase tracking-wide text-gray-500">INR</span>
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full bg-white text-sm">
                <colgroup>
                  <col style={{ width: '55%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '25%' }} />
                </colgroup>
                <thead className="bg-gray-50 text-[11px] uppercase text-gray-600">
                  <tr className="divide-x divide-gray-200">
                    <th className="px-3 py-2 text-left font-semibold">Item</th>
                    <th className="px-3 py-2 text-center font-semibold">Base</th>
                    <th className="px-3 py-2 text-left font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pricingItems.map((item, index) => {
                    const normalizedPrice = item.price?.toString().replace(/[^0-9.-]/g, '') ?? '';
                    const parsed = normalizedPrice ? Number(normalizedPrice) : NaN;
                    const formattedPrice = Number.isNaN(parsed) ? item.price || '-' : `₹ ${parsed.toLocaleString('en-IN')}`;

                    return (
                      <tr key={index} className="hover:bg-orange-50/60">
                        <td className="max-w-[220px] truncate px-3 py-2 font-medium text-gray-900">{item.name}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-center font-semibold text-green-600">{formattedPrice}</td>
                        <td className="px-3 py-2 text-gray-700 leading-snug">{item.description || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 bg-white px-4 py-4 md:hidden">
              {pricingItems.map((item, index) => {
                const normalizedPrice = item.price?.toString().replace(/[^0-9.-]/g, '') ?? '';
                const parsed = normalizedPrice ? Number(normalizedPrice) : NaN;
                const formattedPrice = Number.isNaN(parsed) ? item.price || '-' : `₹ ${parsed.toLocaleString('en-IN')}`;

                return (
                  <div key={index} className="rounded-lg border border-orange-100 bg-white/90 p-4 shadow-sm">
                    <div className="text-base font-semibold text-gray-900">{item.name}</div>
                    <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
                      <span className="font-medium text-gray-700">Base Price</span>
                      <span className="text-lg font-semibold text-green-600">{formattedPrice}</span>
                    </div>
                    {item.description && (
                      <p className="mt-2 text-[15px] leading-relaxed text-gray-600">{item.description}</p>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between border-t border-orange-100 bg-gray-50 px-4 py-2 text-xs text-gray-500">
              <span>Prices are indicative until confirmed.</span>
              <span className="font-medium text-orange-600">{initialData.isFeatured ? 'Confirmed' : 'Indicative'}</span>
            </div>
          </div>
        )}

        {(() => {
          const isPriceVisible = formattedTotalPrice && !supplierView && selectedOption !== 'Empty';

          return (
            <>
              {isPriceVisible && (
                <Card data-pdf-section="true" className="border border-orange-200 shadow-sm rounded-xl">
                  <CardHeader className="px-5 py-5 bg-gradient-to-r from-orange-50 via-white to-orange-50 border-b border-orange-100">
                    <CardTitle className={`text-lg font-semibold ${sectionTitleGradient}`}>Total Package Price</CardTitle>
                    <CardDescription className="text-sm text-gray-500">Quoted value in INR</CardDescription>
                  </CardHeader>
                  <CardContent className="px-5 py-5">
                    <div className="text-2xl font-semibold text-orange-600">{formattedTotalPrice}</div>

                    {initialData.remarks && initialData.remarks !== '' && (
                      <div className="mt-6 pt-5 border-t border-orange-100">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <InfoIcon className="w-4 h-4 text-orange-500" />
                          Remarks
                        </h4>
                        <div className="text-[15px] leading-relaxed text-gray-700 bg-orange-50/50 p-4 rounded-lg border border-orange-100">
                          <div dangerouslySetInnerHTML={{ __html: initialData.remarks || '' }} />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {!isPriceVisible && initialData.remarks !== '' && (
                <Card data-pdf-section="true" className="break-inside-avoid border border-orange-200 shadow-sm rounded-xl">
                  <CardHeader className="px-5 py-5 bg-gradient-to-r from-orange-50 via-white to-orange-50 border-b border-orange-100">
                    <CardTitle className={`text-lg font-semibold ${sectionTitleGradient}`}>Additional Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 py-5 text-base leading-relaxed text-gray-700">
                    <div dangerouslySetInnerHTML={{ __html: initialData.remarks || '' }} />
                  </CardContent>
                </Card>
              )}
            </>
          );
        })()}


        {/* Itineraries */}
        <Card data-pdf-section="true" className="break-inside-avoid border border-orange-200 shadow-sm rounded-xl">
          <CardHeader className="px-5 py-5 bg-gradient-to-r from-orange-50 via-white to-orange-50 border-b border-orange-100">
            <h2 className={`text-2xl font-semibold ${sectionTitleGradient}`}>Short Itinerary</h2>
          </CardHeader>

          {initialData.itineraries?.map((itinerary, index) => {
            const cleanedTitle = itinerary.itineraryTitle?.replace(/^<p>/, '').replace(/<\/p>$/, '');
            return (
              <div key={index} className="border-b border-orange-100 px-5 py-3 text-[15px] font-medium text-gray-700 last:border-b-0 md:text-sm">
                <div dangerouslySetInnerHTML={{ __html: `Day ${itinerary.dayNumber} : ${itinerary.days} - ${cleanedTitle || ''}` }} />
              </div>
            );
          })}
        </Card>

        {/* Flight Details */}
        {initialData.flightDetails && !supplierView && initialData.flightDetails.length > 0 && (
          <Card data-pdf-section="true" className="break-inside-avoid border border-orange-200 shadow-sm rounded-xl">
            <CardHeader className="px-5 py-5 bg-gradient-to-r from-orange-50 via-white to-orange-50 border-b border-orange-100">
              <CardTitle className={`text-2xl font-semibold ${sectionTitleGradient}`}>Flight Details</CardTitle>
            </CardHeader>
            <CardContent className="px-5 py-5 space-y-4">
              {initialData.flightDetails.map((flight: FlightDetails, index: number) => (
                <div key={index} className="rounded-lg border border-orange-100 bg-white px-4 py-3 shadow-sm">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-4 border-b border-orange-100 pb-2">
                    <span className="text-[15px] font-semibold text-gray-900 md:text-sm">{flight.date}</span>
                    <div className="text-[15px] font-medium text-gray-700 md:text-sm">
                      <span>{flight.flightName}</span>
                      {flight.flightNumber && <span className="ml-2 text-gray-500">({flight.flightNumber})</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-4 text-[15px] text-gray-700 md:text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{flight.from}</span>
                      <span className="text-gray-500">{flight.departureTime}</span>
                    </div>
                    <div className="flex flex-col items-center text-gray-500">
                      <PlaneTakeoffIcon className="h-4 w-4" />
                      <span className="text-xs">{flight.flightDuration}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{flight.to}</span>
                      <span className="text-gray-500">{flight.arrivalTime}</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        {/* Itineraries and Hotel Details */}
        {initialData.itineraries && initialData.itineraries.length > 0 && (
          <Card data-pdf-section="true" className="break-inside-avoid border border-orange-200 shadow-sm rounded-xl">
            <CardHeader className="px-5 py-5 bg-gradient-to-r from-orange-50 via-white to-orange-50 border-b border-orange-100">
              <h2 className={`text-2xl font-semibold ${sectionTitleGradient}`}>Accommodation Details</h2>
            </CardHeader>
            <CardContent className="px-5 py-5 space-y-6">
              {initialData.itineraries.map((itinerary: Itinerary & { roomAllocations: (RoomAllocation & { roomType: RoomType | null; occupancyType: OccupancyType | null; mealPlan: MealPlan | null; quantity?: number | null; voucherNumber?: string | null; customRoomType?: string | null; })[] }, itineraryIdx: number) => {
                const hotelDetails = hotels.find(hotel => hotel.id === itinerary.hotelId);

                // Use confirmed variant room allocations if available, otherwise fall back to standard allocations
                const effectiveRoomAllocations: any[] = confirmedAllocations
                  ? (confirmedAllocations[itinerary.id] || [])
                  : itinerary.roomAllocations;

                return (
                  <div key={itineraryIdx} data-pdf-section="true" className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Day {itinerary.dayNumber}: {itinerary.days} - {hotelDetails?.name || 'Hotel'}
                    </h3>

                    {effectiveRoomAllocations.length > 0 ? (
                      <>
                        <div className="hidden overflow-x-auto md:block">
                          <table className="min-w-full divide-y divide-orange-100 overflow-hidden rounded-lg border border-orange-100">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                              <tr>
                                <th scope="col" className="px-3 py-2 text-left font-semibold">Room Type</th>
                                <th scope="col" className="px-3 py-2 text-left font-semibold">Occupancy</th>
                                <th scope="col" className="px-3 py-2 text-left font-semibold">Meal Plan</th>
                                <th scope="col" className="px-3 py-2 text-left font-semibold">Quantity</th>
                                <th scope="col" className="px-3 py-2 text-left font-semibold">Guests</th>
                                <th scope="col" className="px-3 py-2 text-left font-semibold">Voucher No.</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-orange-100 text-sm text-gray-700">
                              {effectiveRoomAllocations.map((room: any, roomIdx: number) => {
                                const customText = typeof room?.customRoomType === 'string' ? (room.customRoomType as string).trim() : '';
                                const useCustom = room?.useCustomRoomType || customText.length > 0;
                                const roomTypeName = useCustom ? customText : (room.roomType?.name || roomTypes.find((r: any) => r.id === room.roomTypeId)?.name || '-');
                                const occupancyName = room.occupancyType?.name || occupancyTypes.find((o: any) => o.id === room.occupancyTypeId)?.name || '-';
                                const mealPlanName = room.mealPlan?.name || mealPlans.find((m: any) => m.id === room.mealPlanId)?.name || '-';
                                return (
                                  <tr key={roomIdx} className="bg-white transition-colors hover:bg-orange-50/60">
                                    <td className="px-3 py-2 font-medium text-gray-900">{roomTypeName}</td>
                                    <td className="px-3 py-2">{occupancyName}</td>
                                    <td className="px-3 py-2">{mealPlanName}</td>
                                    <td className="px-3 py-2">{room.quantity || '-'}</td>
                                    <td className="px-3 py-2 text-gray-600">{room.guestNames || '-'}</td>
                                    <td className="px-3 py-2 text-gray-600">{room.voucherNumber || '-'}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        <div className="flex flex-col gap-3 md:hidden">
                          {effectiveRoomAllocations.map((room: any, roomIdx: number) => {
                            const customText = typeof room?.customRoomType === 'string' ? (room.customRoomType as string).trim() : '';
                            const useCustom = room?.useCustomRoomType || customText.length > 0;
                            const roomTypeName = useCustom ? customText : (room.roomType?.name || roomTypes.find((r: any) => r.id === room.roomTypeId)?.name || '-');
                            const occupancyName = room.occupancyType?.name || occupancyTypes.find((o: any) => o.id === room.occupancyTypeId)?.name || '-';
                            const mealPlanName = room.mealPlan?.name || mealPlans.find((m: any) => m.id === room.mealPlanId)?.name || '-';
                            return (
                              <div key={roomIdx} className="rounded-lg border border-orange-100 bg-white/90 p-4 shadow-sm">
                                <div className="text-base font-semibold text-gray-900">{roomTypeName}</div>
                                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-600">
                                  <div>
                                    <dt className="font-medium text-gray-700">Occupancy</dt>
                                    <dd>{occupancyName}</dd>
                                  </div>
                                  <div>
                                    <dt className="font-medium text-gray-700">Meal Plan</dt>
                                    <dd>{mealPlanName}</dd>
                                  </div>
                                  <div>
                                    <dt className="font-medium text-gray-700">Quantity</dt>
                                    <dd>{room.quantity || '-'}</dd>
                                  </div>
                                  <div>
                                    <dt className="font-medium text-gray-700">Guests</dt>
                                    <dd>{room.guestNames || '-'}</dd>
                                  </div>
                                  <div>
                                    <dt className="font-medium text-gray-700">Voucher No.</dt>
                                    <dd>{room.voucherNumber || '-'}</dd>
                                  </div>
                                </dl>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div className="rounded-lg border border-dashed border-orange-200 bg-gray-50 py-4 text-center text-sm text-gray-500">
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
        <Card data-pdf-section="true" data-pdf-break-before="true" className="break-before-all border border-orange-200 shadow-sm rounded-xl overflow-hidden mb-8">
          <CardHeader className="px-5 py-5 bg-gradient-to-r from-orange-50 via-white to-orange-50 border-b border-orange-100 text-center">
            <CardTitle className={`text-3xl font-semibold ${sectionTitleGradient}`}>Policies & Terms</CardTitle>
            <CardDescription className="text-sm text-gray-500 mt-1">Key inclusions, exclusions, and travel guidelines for this voucher.</CardDescription>
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

        {selectedOption !== 'Empty' && (
          <Card data-pdf-section="true" data-pdf-break-before="true" className="border border-orange-200 shadow-sm rounded-xl overflow-hidden">
            <CardContent className="flex flex-col gap-6 bg-gradient-to-r from-orange-50 via-white to-orange-50 px-6 py-6 md:flex-row md:items-center md:justify-between">
              <div className="relative mx-auto h-32 w-32 md:mx-0 md:h-40 md:w-40">
                <Image src={currentCompany.logo || '/aagamholidays.png'} alt={`${currentCompany.name || 'Company'} Logo`} fill className="object-contain" />
              </div>
              <ul className="space-y-1 text-center text-[15px] font-medium text-gray-700 md:text-left md:text-sm">
                {currentCompany.name && (
                  <li className="text-lg font-semibold text-gray-900">{currentCompany.name}</li>
                )}
                {currentCompany.address && <li>{currentCompany.address}</li>}
                {currentCompany.phone && <li>Phone: {currentCompany.phone}</li>}
                {currentCompany.email && (
                  <li>
                    Email: <Link href={`mailto:${currentCompany.email}`} className="text-orange-600 hover:text-orange-700">{currentCompany.email}</Link>
                  </li>
                )}
                {currentCompany.website && (
                  <li>
                    Website: <Link href={currentCompany.website} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-700">{currentCompany.website}</Link>
                  </li>
                )}
              </ul>
            </CardContent>
            <div className="bg-white px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-orange-600">
              Thank you for choosing {currentCompany.name || 'our services'} – wishing you a memorable journey!
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
