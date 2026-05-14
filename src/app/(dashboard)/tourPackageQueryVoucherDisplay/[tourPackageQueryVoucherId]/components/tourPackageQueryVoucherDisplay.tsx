'use client'
import React from 'react';
import Image from 'next/image';
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
  confirmedVariantHotelsByDay?: Record<number, string>;
  confirmedVariantName?: string | null;
};

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
};

const parsePolicyField = (field: any): string[] => {
  if (!field) return [];
  try {
    if (typeof field === 'string') return JSON.parse(field);
    if (Array.isArray(field)) return field.map(item => String(item));
    return [String(field)];
  } catch {
    return [String(field)];
  }
};

const stripHtml = (input: string): string => {
  if (!input) return '';
  return input
    .replace(/<\/?(p|div)[^>]*>/gi, ' ')
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const TourPackageQueryVoucherDisplay: React.FC<TourPackageQueryVoucherDisplayProps> = ({
  initialData,
  locations,
  hotels,
  roomTypes = [],
  occupancyTypes = [],
  mealPlans = [],
  confirmedVariantHotelsByDay = {},
  confirmedVariantName,
}) => {
  const searchParams = useSearchParams();
  const selectedOption = searchParams?.get('search') || 'Empty';
  const currentCompany = companyInfo[selectedOption] ?? companyInfo['Empty'];

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
  const confirmedAllocations = confirmedVariantId ? variantRoomAllocations[confirmedVariantId] : null;

  // Parse query-level hotel overrides as fallback when snapshot hotels are unavailable
  const variantHotelOverridesRaw = (initialData as any)?.variantHotelOverrides;
  const variantHotelOverrides: Record<string, Record<string, string>> = (() => {
    if (!variantHotelOverridesRaw) return {};
    try {
      return typeof variantHotelOverridesRaw === 'string'
        ? JSON.parse(variantHotelOverridesRaw)
        : variantHotelOverridesRaw;
    } catch { return {}; }
  })();
  const confirmedHotelOverrides: Record<string, string> = confirmedVariantId
    ? (variantHotelOverrides[confirmedVariantId] ?? {})
    : {};

  const supplierView = selectedOption === 'SupplierA' || selectedOption === 'SupplierB';

  const locationLabel = locations.find(l => l.id === initialData?.locationId)?.label || '';
  const periodLabel = [
    initialData?.tourStartsFrom ? formatLocalDate(initialData.tourStartsFrom, 'dd MMM yyyy') : '',
    initialData?.tourEndsOn ? formatLocalDate(initialData.tourEndsOn, 'dd MMM yyyy') : '',
  ].filter(Boolean).join(' — ');

  const heroImage = initialData?.images?.[0]?.url;

  const footerLabel = [currentCompany.name || initialData?.tourPackageQueryName, 'Booking Voucher']
    .filter(Boolean).join(' • ');
  const footerPrimaryLine = currentCompany.name
    ? [currentCompany.name, currentCompany.address].filter(Boolean).join(' • ')
    : initialData?.tourPackageQueryName || '';
  const footerSecondaryLine = [
    currentCompany.phone ? `Phone: ${currentCompany.phone}` : null,
    currentCompany.email ? `Email: ${currentCompany.email}` : null,
  ].filter(Boolean).join(' • ');

  if (!initialData || !initialData.isFeatured) return <div>No data available</div>;

  const policies: { title: string; items: string[] }[] = [
    { title: 'Inclusions', items: parsePolicyField(initialData.inclusions) },
    { title: 'Exclusions', items: parsePolicyField(initialData.exclusions) },
    { title: 'Important Notes', items: parsePolicyField(initialData.importantNotes) },
    { title: 'Payment Policy', items: parsePolicyField(initialData.paymentPolicy) },
    { title: 'Kitchen Group Policy', items: parsePolicyField(initialData.kitchenGroupPolicy) },
    { title: 'Useful Tips', items: parsePolicyField(initialData.usefulTip) },
    { title: 'Cancellation Policy', items: parsePolicyField(initialData.cancellationPolicy) },
    { title: 'Airline Cancellation Policy', items: parsePolicyField(initialData.airlineCancellationPolicy) },
    { title: 'Terms and Conditions', items: parsePolicyField(initialData.termsconditions) },
  ].filter(p => p.items.length > 0);

  return (
    <>
      <style>{`
        .vchr {
          --vchr-ink: #111827;
          --vchr-mute: #6B7280;
          --vchr-faint: #9CA3AF;
          --vchr-line: #E5E7EB;
          --vchr-cream: #FAF7F2;
          --vchr-accent: #C2410C;
          color: var(--vchr-ink);
          font-family: var(--font-sans), 'Inter', system-ui, sans-serif;
          font-size: 11.5px;
          line-height: 1.55;
          background: #ffffff;
        }
        .vchr-serif { font-family: var(--font-serif), 'Cormorant Garamond', Georgia, serif; font-weight: 500; letter-spacing: 0.005em; }
        .vchr-eyebrow { font-size: 9.5px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase; color: var(--vchr-mute); }
        .vchr-section { padding: 22px 0 18px; }
        .vchr-section + .vchr-section { border-top: 1px solid var(--vchr-line); }
        .vchr-section-title { font-size: 18px; font-weight: 500; margin: 0 0 4px; }
        .vchr-section-rule { width: 28px; height: 1px; background: var(--vchr-accent); margin: 0 0 14px; }
        .vchr-cover { background: var(--vchr-cream); padding: 36px 38px 32px; }
        .vchr-cover-wordmark { font-size: 10px; font-weight: 600; letter-spacing: 0.28em; text-transform: uppercase; color: var(--vchr-accent); }
        .vchr-cover-title { font-size: 30px; line-height: 1.15; margin: 14px 0 8px; }
        .vchr-cover-meta { display: flex; gap: 18px; flex-wrap: wrap; font-size: 10.5px; color: var(--vchr-mute); margin-top: 10px; }
        .vchr-cover-meta span strong { color: var(--vchr-ink); font-weight: 600; }
        .vchr-cover-rule { width: 36px; height: 1px; background: var(--vchr-accent); margin: 18px 0; }
        .vchr-hero { width: 100%; height: 280px; overflow: hidden; margin-top: 10px; }
        .vchr-hero img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .vchr-grid-2 { display: grid; grid-template-columns: 1fr 1fr; column-gap: 28px; row-gap: 14px; }
        .vchr-field-label { font-size: 9px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: var(--vchr-faint); margin-bottom: 3px; }
        .vchr-field-value { font-size: 12px; color: var(--vchr-ink); }
        .vchr-day-row { display: grid; grid-template-columns: 64px 1fr; gap: 18px; padding: 12px 0; border-top: 1px solid var(--vchr-line); }
        .vchr-day-row:first-child { border-top: none; }
        .vchr-day-num { font-size: 22px; color: var(--vchr-accent); line-height: 1; }
        .vchr-day-num-label { font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--vchr-mute); margin-top: 2px; }
        .vchr-day-text { font-size: 12px; color: var(--vchr-ink); line-height: 1.5; }
        .vchr-day-text strong { font-weight: 600; }
        .vchr-table { width: 100%; border-collapse: collapse; font-size: 11px; }
        .vchr-table th { text-align: left; font-weight: 600; font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--vchr-mute); padding: 8px 10px 8px 0; border-bottom: 1px solid var(--vchr-line); }
        .vchr-table td { padding: 8px 10px 8px 0; border-bottom: 1px solid var(--vchr-line); vertical-align: top; color: var(--vchr-ink); }
        .vchr-table tr:last-child td { border-bottom: none; }
        .vchr-table .num { text-align: right; padding-right: 0; }
        .vchr-stay { margin-bottom: 18px; }
        .vchr-stay-title { font-size: 16px; margin: 0 0 2px; }
        .vchr-stay-badge { display: inline-block; font-size: 9px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--vchr-accent); background: #FFF3EC; border: 1px solid #FEDDCC; padding: 2px 7px; border-radius: 20px; margin-bottom: 8px; }
        .vchr-extra-bed { color: var(--vchr-mute); font-style: italic; }
        .vchr-empty { font-size: 10.5px; color: var(--vchr-mute); padding: 8px 0; font-style: italic; }
        .vchr-policy-grid { column-count: 2; column-gap: 32px; column-rule: 1px solid var(--vchr-line); }
        .vchr-policy-block { break-inside: avoid; page-break-inside: avoid; margin: 0 0 18px; }
        .vchr-policy-title { font-size: 13px; margin: 0 0 6px; }
        .vchr-policy-list { margin: 0; padding-left: 14px; font-size: 10.5px; color: var(--vchr-ink); line-height: 1.6; }
        .vchr-policy-list li { margin-bottom: 3px; }
        .vchr-remarks { margin-top: 14px; font-size: 11px; color: var(--vchr-ink); line-height: 1.6; }
        .vchr-remarks-label { font-size: 9px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: var(--vchr-faint); margin-bottom: 4px; }
        .vchr-signoff { padding: 18px 0 8px; text-align: center; }
        .vchr-signoff-mark { font-size: 9.5px; letter-spacing: 0.24em; text-transform: uppercase; color: var(--vchr-accent); }
        .vchr-signoff-line { font-size: 11px; color: var(--vchr-mute); margin-top: 6px; }
        .vchr-cover-logo { height: 38px; width: auto; object-fit: contain; object-position: left; display: block; margin-bottom: 14px; }
        .vchr-cover-hero-wrap { position: relative; overflow: hidden; margin: 0; padding: 0; }
        .vchr-cover-hero-wrap img { width: 100%; height: 320px; object-fit: cover; display: block; }
        .vchr-cover-hero-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(10,10,10,0.72) 0%, rgba(10,10,10,0.25) 50%, rgba(10,10,10,0.10) 100%); }
        .vchr-cover-hero-caption { position: absolute; bottom: 0; left: 0; right: 0; padding: 28px 38px; }
        .vchr-cover-hero-caption .vchr-cover-title { color: #fff; margin: 8px 0 6px; }
        .vchr-cover-hero-caption .vchr-eyebrow { color: rgba(255,255,255,0.75); }
        .vchr-cover-hero-caption .vchr-cover-meta { color: rgba(255,255,255,0.82); }
        .vchr-cover-hero-caption .vchr-cover-wordmark { color: rgba(255,255,255,0.9); letter-spacing: 0.28em; }
        .vchr-cover-rule-white { width: 36px; height: 1px; background: rgba(255,255,255,0.45); margin: 12px 0; }
        .vchr-overview-panel { background: var(--vchr-cream); border-left: 3px solid var(--vchr-accent); padding: 18px 20px; border-radius: 2px; }
        @media print { .vchr-screen-only { display: none; } }
      `}</style>

      <div className="space-y-4 px-3 sm:px-4 md:px-6 lg:px-10 xl:px-16">
        <div className="vchr-screen-only flex justify-center print:hidden sm:justify-end">
          <VoucherActions id={initialData.id} type="tour-package-query" />
        </div>

        <div
          id="voucher-content"
          data-pdf-footer-label={footerLabel}
          data-pdf-footer-primary={footerPrimaryLine}
          data-pdf-footer-secondary={footerSecondaryLine}
          data-pdf-footer-website={currentCompany.website || ''}
          data-pdf-footer-logo={currentCompany.logo || ''}
          data-pdf-footer-tagline={selectedOption === 'AH' ? 'Crafted journeys, delivered with care.' : ''}
          className="vchr"
          style={{ maxWidth: 780, margin: '0 auto' }}
        >
          {/* ── Cover ── */}
          <section data-pdf-section="true" className="vchr-cover">
            {/* Company logo */}
            {currentCompany.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={currentCompany.logo} alt={currentCompany.name || ''} className="vchr-cover-logo" />
            )}

            {heroImage ? (
              <>
                {/* Wordmark above image */}
                <div className="vchr-cover-wordmark">{currentCompany.name || 'Booking Voucher'}</div>

                {/* Hero image with gradient overlay */}
                <div className="vchr-cover-hero-wrap" style={{ marginTop: 14 }}>
                  <Image
                    src={heroImage}
                    alt={initialData.tourPackageQueryName || 'Tour'}
                    width={1400}
                    height={640}
                    priority
                  />
                  <div className="vchr-cover-hero-overlay" />
                  <div className="vchr-cover-hero-caption">
                    <h1 className="vchr-serif vchr-cover-title">{initialData.tourPackageQueryName}</h1>
                    <div className="vchr-eyebrow">
                      Booking Voucher · Ref {initialData.tourPackageQueryNumber}
                    </div>
                    {confirmedVariantName && (
                      <div className="vchr-eyebrow" style={{ color: 'rgba(255,194,140,0.95)', marginTop: 4 }}>
                        Package: {confirmedVariantName}
                      </div>
                    )}
                    <div className="vchr-cover-rule-white" />
                    <div className="vchr-cover-meta">
                      {locationLabel && <span><strong style={{ color: '#fff' }}>{locationLabel}</strong></span>}
                      {initialData.numDaysNight && <span>{initialData.numDaysNight}</span>}
                      {periodLabel && <span>{periodLabel}</span>}
                      {initialData.tourPackageQueryType && <span>{initialData.tourPackageQueryType} Package</span>}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* No hero — original cream layout */
              <>
                <div className="vchr-cover-wordmark">{currentCompany.name || 'Booking Voucher'}</div>
                <h1 className="vchr-serif vchr-cover-title">{initialData.tourPackageQueryName}</h1>
                <div className="vchr-eyebrow" style={{ color: 'var(--vchr-mute)' }}>
                  Booking Voucher · Ref {initialData.tourPackageQueryNumber}
                </div>
                {confirmedVariantName && (
                  <div className="vchr-eyebrow" style={{ color: 'var(--vchr-accent)', marginTop: 4 }}>
                    Package: {confirmedVariantName}
                  </div>
                )}
                <div className="vchr-cover-rule" />
                <div className="vchr-cover-meta">
                  {locationLabel && <span><strong>{locationLabel}</strong></span>}
                  {initialData.numDaysNight && <span>{initialData.numDaysNight}</span>}
                  {periodLabel && <span>{periodLabel}</span>}
                  {initialData.tourPackageQueryType && <span>{initialData.tourPackageQueryType} Package</span>}
                </div>
              </>
            )}
          </section>

          {/* ── Trip Overview ── */}
          <section data-pdf-section="true" className="vchr-section">
            <h2 className="vchr-serif vchr-section-title">Trip Overview</h2>
            <div className="vchr-section-rule" />
            <div className="vchr-overview-panel">
            <div className="vchr-grid-2">
              {!supplierView && initialData.customerName && (
                <div>
                  <div className="vchr-field-label">Guest</div>
                  <div className="vchr-field-value">
                    {initialData.customerName}
                    {initialData.customerNumber ? ` · ${initialData.customerNumber}` : ''}
                  </div>
                </div>
              )}
              {!supplierView && initialData.assignedTo && (
                <div>
                  <div className="vchr-field-label">Assigned To</div>
                  <div className="vchr-field-value">
                    {initialData.assignedTo}
                    {initialData.assignedToMobileNumber ? ` · ${initialData.assignedToMobileNumber}` : ''}
                  </div>
                </div>
              )}
              {locationLabel && (
                <div>
                  <div className="vchr-field-label">Destination</div>
                  <div className="vchr-field-value">{locationLabel}</div>
                </div>
              )}
              {initialData.numDaysNight && (
                <div>
                  <div className="vchr-field-label">Duration</div>
                  <div className="vchr-field-value">{initialData.numDaysNight}</div>
                </div>
              )}
              {periodLabel && (
                <div>
                  <div className="vchr-field-label">Travel Period</div>
                  <div className="vchr-field-value">{periodLabel}</div>
                </div>
              )}
              {(initialData.numAdults || initialData.numChild5to12 || initialData.numChild0to5) && (
                <div>
                  <div className="vchr-field-label">Travellers</div>
                  <div className="vchr-field-value">
                    {[
                      initialData.numAdults ? `${initialData.numAdults} Adults` : '',
                      initialData.numChild5to12 ? `${initialData.numChild5to12} Child (5–12)` : '',
                      initialData.numChild0to5 ? `${initialData.numChild0to5} Child (0–5)` : '',
                    ].filter(Boolean).join(' · ')}
                  </div>
                </div>
              )}
              {initialData.transport && (
                <div>
                  <div className="vchr-field-label">Transport</div>
                  <div className="vchr-field-value">{initialData.transport}</div>
                </div>
              )}
              {initialData.pickup_location && (
                <div>
                  <div className="vchr-field-label">Pickup</div>
                  <div className="vchr-field-value">{initialData.pickup_location}</div>
                </div>
              )}
              {initialData.drop_location && (
                <div>
                  <div className="vchr-field-label">Drop</div>
                  <div className="vchr-field-value">{initialData.drop_location}</div>
                </div>
              )}
            </div>
            {initialData.remarks && stripHtml(initialData.remarks) && (
              <div className="vchr-remarks">
                <div className="vchr-remarks-label">Remarks</div>
                <div dangerouslySetInnerHTML={{ __html: initialData.remarks }} />
              </div>
            )}
            </div>{/* end vchr-overview-panel */}
          </section>

          {/* ── Day-by-Day ── */}
          {initialData.itineraries && initialData.itineraries.length > 0 && (
            <section data-pdf-section="true" className="vchr-section">
              <h2 className="vchr-serif vchr-section-title">Day-by-Day</h2>
              <div className="vchr-section-rule" />
              <div>
                {initialData.itineraries.map((itinerary, index) => {
                  const cleanedTitle = stripHtml(itinerary.itineraryTitle || '');
                  return (
                    <div key={index} className="vchr-day-row">
                      <div>
                        <div className="vchr-serif vchr-day-num">{String(itinerary.dayNumber).padStart(2, '0')}</div>
                        <div className="vchr-day-num-label">{itinerary.days || 'Day'}</div>
                      </div>
                      <div className="vchr-day-text">
                        <strong>{cleanedTitle || '—'}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Flights ── */}
          {!supplierView && initialData.flightDetails && initialData.flightDetails.length > 0 && (
            <section data-pdf-section="true" className="vchr-section">
              <h2 className="vchr-serif vchr-section-title">Flights</h2>
              <div className="vchr-section-rule" />
              <table className="vchr-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Carrier</th>
                    <th>Route</th>
                    <th>Times</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {initialData.flightDetails.map((flight, idx) => (
                    <tr key={idx}>
                      <td>{flight.date}</td>
                      <td>
                        {flight.flightName}
                        {flight.flightNumber ? <span style={{ color: 'var(--vchr-mute)' }}> · {flight.flightNumber}</span> : null}
                      </td>
                      <td>
                        <strong>{flight.from}</strong>
                        <span style={{ color: 'var(--vchr-mute)' }}> → </span>
                        <strong>{flight.to}</strong>
                      </td>
                      <td>
                        {flight.departureTime}
                        <span style={{ color: 'var(--vchr-mute)' }}> – </span>
                        {flight.arrivalTime}
                      </td>
                      <td>{flight.flightDuration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* ── Accommodation ── */}
          {initialData.itineraries && initialData.itineraries.length > 0 && (
            <section data-pdf-section="true" className="vchr-section">
              <h2 className="vchr-serif vchr-section-title">Accommodation</h2>
              <div className="vchr-section-rule" />
              {initialData.itineraries.map((itinerary, itineraryIdx) => {
                // Resolve hotel: snapshot hotel → query override → itinerary default
                const effectiveHotelId =
                  confirmedVariantHotelsByDay[itinerary.dayNumber as number] ??
                  confirmedHotelOverrides[itinerary.id] ??
                  itinerary.hotelId;
                const hotelDetails = hotels.find(h => h.id === effectiveHotelId);
                const effectiveRoomAllocations: any[] = confirmedAllocations
                  ? (confirmedAllocations[itinerary.id] || [])
                  : itinerary.roomAllocations;

                if (!hotelDetails && effectiveRoomAllocations.length === 0) return null;

                return (
                  <div key={itineraryIdx} className="vchr-stay" data-pdf-section="true">
                    <div className="vchr-stay-badge">Day {itinerary.dayNumber} · {itinerary.days}</div>
                    <h3 className="vchr-serif vchr-stay-title">{hotelDetails?.name || 'Hotel'}</h3>
                    {effectiveRoomAllocations.length > 0 ? (
                      <table className="vchr-table">
                        <thead>
                          <tr>
                            <th>Room</th>
                            <th>Occupancy</th>
                            <th>Meal</th>
                            <th>Qty</th>
                            <th>Guests</th>
                            <th>Voucher</th>
                          </tr>
                        </thead>
                        <tbody>
                          {effectiveRoomAllocations.map((room: any, roomIdx: number) => {
                            const customText = typeof room?.customRoomType === 'string' ? room.customRoomType.trim() : '';
                            const useCustom = room?.useCustomRoomType || customText.length > 0;
                            const roomTypeName = useCustom ? customText : (room.roomType?.name || roomTypes.find((r: any) => r.id === room.roomTypeId)?.name || '—');
                            const occupancyName = room.occupancyType?.name || occupancyTypes.find((o: any) => o.id === room.occupancyTypeId)?.name || '—';
                            const mealPlanName = room.mealPlan?.name || mealPlans.find((m: any) => m.id === room.mealPlanId)?.name || '—';
                            return (
                              <React.Fragment key={roomIdx}>
                                <tr>
                                  <td style={{ fontWeight: 500 }}>{roomTypeName}</td>
                                  <td>{occupancyName}</td>
                                  <td>{mealPlanName}</td>
                                  <td>{room.quantity || '—'}</td>
                                  <td style={{ color: 'var(--vchr-mute)' }}>{room.guestNames || '—'}</td>
                                  <td style={{ color: 'var(--vchr-mute)' }}>{room.voucherNumber || '—'}</td>
                                </tr>
                                {(room.extraBeds || []).map((eb: any, ebIdx: number) => (
                                  <tr key={`eb-${ebIdx}`}>
                                    <td className="vchr-extra-bed" style={{ paddingLeft: 16 }}>
                                      + Extra bed · {eb.occupancyType?.name || '—'}
                                    </td>
                                    <td colSpan={5} className="vchr-extra-bed">
                                      Qty {eb.quantity || 1}
                                    </td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div className="vchr-empty">No room allocation recorded.</div>
                    )}
                  </div>
                );
              })}
            </section>
          )}

          {/* ── Policies & Terms ── */}
          {policies.length > 0 && (
            <section data-pdf-section="true" data-pdf-break-before="true" className="vchr-section">
              <h2 className="vchr-serif vchr-section-title">Policies &amp; Terms</h2>
              <div className="vchr-section-rule" />
              <div className="vchr-policy-grid">
                {policies.map((policy, idx) => (
                  <div key={idx} className="vchr-policy-block">
                    <h3 className="vchr-serif vchr-policy-title">{policy.title}</h3>
                    <ul className="vchr-policy-list">
                      {policy.items.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Sign-off ── */}
          {selectedOption !== 'Empty' && currentCompany.name && (
            <section data-pdf-section="true" className="vchr-signoff">
              <div className="vchr-signoff-mark">— {currentCompany.name} —</div>
              <div className="vchr-signoff-line">
                Thank you for travelling with us. Wishing you a memorable journey.
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
};
