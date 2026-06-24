'use client'
import React from 'react';
import Image from 'next/image';
import { VoucherActions } from "@/components/voucher-actions";
import type { Location, Images, Hotel, TourPackageQuery, Itinerary, FlightDetails, Activity, RoomAllocation, TransportDetail, RoomType, OccupancyType, MealPlan, VehicleType } from "@prisma/client";
import { useSearchParams } from 'next/navigation';
import { formatLocalDate } from '@/lib/timezone-utils';
import { normalizeItineraryDays } from '@/lib/utils';

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
      transportDetails?: (TransportDetail & {
        vehicleType: VehicleType | null;
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
  vehicleTypes?: { id: string; name: string }[];
  selectedOption?: string;
  confirmedVariantHotelsByDay?: Record<number, string>;
  confirmedVariantName?: string | null;
  /** Passed from the server page when `?search=` is set (mobile PDF pipeline). */
  initialSearchOption?: string;
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
  vehicleTypes = [],
  confirmedVariantHotelsByDay = {},
  confirmedVariantName,
  initialSearchOption,
}) => {
  const searchParams = useSearchParams();
  const selectedOption =
    initialSearchOption ?? searchParams?.get("search") ?? "Empty";
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

  const variantTransportDetailsRaw = (initialData as any)?.variantTransportDetails;
  const variantTransportDetails: Record<string, Record<string, any[]>> = (() => {
    if (!variantTransportDetailsRaw) return {};
    try {
      return typeof variantTransportDetailsRaw === 'string'
        ? JSON.parse(variantTransportDetailsRaw)
        : variantTransportDetailsRaw;
    } catch { return {}; }
  })();
  const confirmedTransport = confirmedVariantId ? variantTransportDetails[confirmedVariantId] : null;

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
  ].filter(Boolean).join(' - ');

  const heroImage = initialData?.images?.[0]?.url;

  const footerLabel = [currentCompany.name || initialData?.tourPackageQueryName, 'Booking Voucher']
    .filter(Boolean).join(' | ');
  const footerPrimaryLine = currentCompany.name
    ? [currentCompany.name, currentCompany.address].filter(Boolean).join(' | ')
    : initialData?.tourPackageQueryName || '';
  const footerSecondaryLine = [
    currentCompany.phone ? `Phone: ${currentCompany.phone}` : null,
    currentCompany.email ? `Email: ${currentCompany.email}` : null,
  ].filter(Boolean).join(' | ');

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
      <style data-pdf-inline-style="tour-package-query-voucher">{`
        .vchr {
          --vchr-ink: #1f2933;
          --vchr-strong: #111827;
          --vchr-mute: #667085;
          --vchr-faint: #98a2b3;
          --vchr-line: #eadfce;
          --vchr-cream: #fff9f0;
          --vchr-accent: #b45309;
          --vchr-accent-deep: #7c2d12;
          --vchr-gold: #d6a85d;
          color: var(--vchr-ink);
          font-family: "Aptos", "Segoe UI", "Inter", system-ui, sans-serif;
          font-size: 11.5px;
          line-height: 1.58;
          background:
            radial-gradient(circle at top left, rgba(214, 168, 93, 0.16), transparent 260px),
            linear-gradient(180deg, #fffdf8 0%, #ffffff 34%, #fffaf3 100%);
          border: 1px solid rgba(180, 83, 9, 0.16);
          box-shadow: 0 24px 70px rgba(80, 44, 18, 0.12);
          overflow: hidden;
        }
        .vchr-serif { font-family: "Georgia", "Times New Roman", serif; font-weight: 500; letter-spacing: -0.015em; }
        .vchr-eyebrow { font-size: 9px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: var(--vchr-accent); }
        .vchr-muted { color: var(--vchr-mute); }
        .vchr-section { padding: 26px 36px 24px; background: rgba(255, 255, 255, 0.84); }
        .vchr-section + .vchr-section { border-top: 1px solid rgba(234, 223, 206, 0.85); }
        .vchr-section-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; margin-bottom: 16px; }
        .vchr-section-kicker { font-size: 8.5px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: var(--vchr-gold); margin-bottom: 3px; }
        .vchr-section-title { color: var(--vchr-strong); font-size: 21px; line-height: 1.1; margin: 0; }
        .vchr-section-rule { width: 42px; height: 2px; background: linear-gradient(90deg, var(--vchr-accent), var(--vchr-gold)); border-radius: 999px; }
        .vchr-cover { position: relative; min-height: 520px; background: #1d1712; color: #ffffff; padding: 0; }
        .vchr-cover::after { content: ""; position: absolute; inset: auto 32px 28px; height: 1px; background: rgba(255,255,255,0.28); }
        .vchr-cover-media { position: absolute; inset: 0; overflow: hidden; }
        .vchr-cover-media img { width: 100%; height: 100%; object-fit: cover; display: block; filter: saturate(1.06) contrast(1.02); }
        .vchr-cover-fallback { position: absolute; inset: 0; background: radial-gradient(circle at 20% 18%, rgba(214,168,93,0.42), transparent 210px), radial-gradient(circle at 84% 22%, rgba(251,191,36,0.22), transparent 250px), linear-gradient(135deg, #2b170f 0%, #713f12 44%, #111827 100%); }
        .vchr-cover-shade { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(17,24,39,0.90) 0%, rgba(17,24,39,0.64) 48%, rgba(17,24,39,0.22) 100%), linear-gradient(0deg, rgba(17,24,39,0.64), rgba(17,24,39,0.08)); }
        .vchr-cover-content { position: relative; z-index: 1; min-height: 520px; display: flex; flex-direction: column; justify-content: space-between; padding: 34px 38px 36px; }
        .vchr-cover-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }
        .vchr-cover-logo { max-height: 46px; max-width: 154px; width: auto; object-fit: contain; object-position: left; display: block; padding: 8px 10px; border-radius: 14px; background: rgba(255,255,255,0.92); box-shadow: 0 12px 30px rgba(0,0,0,0.18); }
        .vchr-cover-pill { border: 1px solid rgba(255,255,255,0.28); border-radius: 999px; color: rgba(255,255,255,0.84); font-size: 9px; font-weight: 700; letter-spacing: 0.18em; padding: 7px 12px; text-transform: uppercase; }
        .vchr-cover-main { max-width: 560px; }
        .vchr-cover-wordmark { color: rgba(255,255,255,0.78); font-size: 9px; font-weight: 700; letter-spacing: 0.28em; text-transform: uppercase; }
        .vchr-cover-title { color: #fff; font-size: 42px; line-height: 1.02; margin: 16px 0 12px; text-wrap: balance; }
        .vchr-cover-subtitle { color: rgba(255,255,255,0.82); font-size: 12px; letter-spacing: 0.04em; }
        .vchr-cover-rule { width: 58px; height: 2px; background: linear-gradient(90deg, #facc15, rgba(255,255,255,0.58)); border-radius: 999px; margin: 18px 0; }
        .vchr-cover-meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 18px; max-width: 510px; }
        .vchr-cover-meta-item { border: 1px solid rgba(255,255,255,0.18); background: rgba(255,255,255,0.10); border-radius: 15px; padding: 10px 12px; backdrop-filter: blur(8px); }
        .vchr-cover-meta-label { color: rgba(255,255,255,0.58); display: block; font-size: 8px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; }
        .vchr-cover-meta-value { color: #fff; display: block; font-size: 12px; font-weight: 650; margin-top: 2px; }
        .vchr-overview-panel { background: linear-gradient(135deg, #fff7ed, #fffdf7); border: 1px solid var(--vchr-line); border-radius: 22px; padding: 18px; box-shadow: 0 14px 34px rgba(124, 45, 18, 0.06); }
        .vchr-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .vchr-field-card { background: rgba(255,255,255,0.82); border: 1px solid rgba(234, 223, 206, 0.82); border-radius: 16px; padding: 12px 13px; }
        .vchr-field-label { font-size: 8.5px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: var(--vchr-faint); margin-bottom: 4px; }
        .vchr-field-value { color: var(--vchr-strong); font-size: 12px; font-weight: 560; overflow-wrap: anywhere; }
        .vchr-remarks { margin-top: 14px; border-top: 1px dashed var(--vchr-line); padding-top: 13px; font-size: 11px; color: var(--vchr-ink); line-height: 1.62; }
        .vchr-remarks-label { font-size: 8.5px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: var(--vchr-accent); margin-bottom: 5px; }
        .vchr-timeline { position: relative; display: grid; gap: 12px; }
        .vchr-timeline::before { content: ""; position: absolute; left: 30px; top: 16px; bottom: 16px; width: 1px; background: linear-gradient(180deg, rgba(180,83,9,0.08), rgba(180,83,9,0.42), rgba(180,83,9,0.08)); }
        .vchr-day-row { position: relative; display: grid; grid-template-columns: 72px 1fr; gap: 18px; align-items: stretch; break-inside: avoid; page-break-inside: avoid; }
        .vchr-day-marker { position: relative; z-index: 1; width: 60px; height: 60px; border: 1px solid rgba(214,168,93,0.58); border-radius: 999px; background: radial-gradient(circle at 30% 22%, #fffaf0 0%, #fff7ed 42%, #f7e7ce 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 10px 22px rgba(124,45,18,0.10), inset 0 0 0 5px rgba(255,255,255,0.66); }
        .vchr-day-marker::after { content: ""; position: absolute; right: -13px; top: 50%; width: 13px; height: 1px; background: rgba(214,168,93,0.58); }
        .vchr-day-num { color: var(--vchr-accent-deep); font-size: 24px; line-height: 0.95; }
        .vchr-day-num-label { color: var(--vchr-mute); font-size: 7.5px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; margin-top: 4px; }
        .vchr-day-card { position: relative; border: 1px solid rgba(234,223,206,0.96); border-radius: 18px; background: linear-gradient(135deg, rgba(255,255,255,0.98), rgba(255,250,243,0.92)); padding: 13px 16px 14px; box-shadow: 0 12px 28px rgba(124,45,18,0.055); overflow: hidden; }
        .vchr-day-card::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: linear-gradient(180deg, var(--vchr-gold), var(--vchr-accent)); }
        .vchr-day-card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 7px; }
        .vchr-day-card-label { color: var(--vchr-gold); font-size: 8px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; }
        .vchr-day-date { color: var(--vchr-accent-deep); background: #fff7ed; border: 1px solid #f0d9b5; border-radius: 999px; display: inline-block; font-size: 9px; font-weight: 800; letter-spacing: 0.08em; padding: 4px 9px; text-transform: uppercase; white-space: nowrap; }
        .vchr-day-text { color: var(--vchr-ink); font-size: 12.4px; line-height: 1.55; }
        .vchr-day-text strong { color: var(--vchr-strong); font-weight: 750; }
        .vchr-table-wrap { border: 1px solid var(--vchr-line); border-radius: 18px; overflow: hidden; background: #ffffff; box-shadow: 0 12px 30px rgba(124,45,18,0.045); }
        .vchr-table { width: 100%; border-collapse: collapse; font-size: 10.8px; }
        .vchr-table th { background: #fff7ed; color: var(--vchr-accent-deep); text-align: left; font-weight: 800; font-size: 8.3px; letter-spacing: 0.13em; text-transform: uppercase; padding: 10px 11px; border-bottom: 1px solid var(--vchr-line); }
        .vchr-table td { padding: 10px 11px; border-bottom: 1px solid rgba(234, 223, 206, 0.74); vertical-align: top; color: var(--vchr-ink); }
        .vchr-table tr:last-child td { border-bottom: none; }
        .vchr-table .num { text-align: right; }
        .vchr-stay { margin-bottom: 16px; border: 1px solid var(--vchr-line); border-radius: 20px; overflow: hidden; background: #ffffff; break-inside: avoid; page-break-inside: avoid; }
        .vchr-stay-head { background: linear-gradient(135deg, #fff7ed, #fffdf8); padding: 13px 15px 11px; border-bottom: 1px solid var(--vchr-line); }
        .vchr-stay-title { color: var(--vchr-strong); font-size: 17px; margin: 4px 0 0; }
        .vchr-stay-badge { display: inline-block; font-size: 8.5px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: var(--vchr-accent-deep); }
        .vchr-extra-bed { color: var(--vchr-mute); font-style: italic; }
        .vchr-empty { color: var(--vchr-mute); font-size: 10.5px; font-style: italic; padding: 14px 15px; }
        .vchr-policy-grid { column-count: 2; column-gap: 30px; column-rule: 1px solid var(--vchr-line); }
        .vchr-policy-block { break-inside: avoid; page-break-inside: avoid; margin: 0 0 18px; }
        .vchr-policy-title { color: var(--vchr-strong); font-size: 14px; margin: 0 0 7px; }
        .vchr-policy-list { margin: 0; padding-left: 15px; font-size: 10.5px; color: var(--vchr-ink); line-height: 1.65; }
        .vchr-policy-list li { margin-bottom: 4px; }
        .vchr-signoff { background: linear-gradient(135deg, #24140f, #7c2d12); color: #fff; padding: 24px 36px 28px; text-align: center; }
        .vchr-signoff-mark { font-size: 9.5px; font-weight: 800; letter-spacing: 0.24em; text-transform: uppercase; color: #facc15; }
        .vchr-signoff-line { color: rgba(255,255,255,0.78); font-size: 11px; margin-top: 7px; }
        @media print {
          .vchr-screen-only { display: none; }
          .vchr { border: 0; box-shadow: none; }
          .vchr-section { padding-left: 30px; padding-right: 30px; }
          .vchr-cover { min-height: 500px; }
          .vchr-cover-content { min-height: 500px; }
        }
      `}</style>

      <div className="space-y-4 px-3 sm:px-4 md:px-6 lg:px-10 xl:px-16">
        <div className="vchr-screen-only flex justify-center print:hidden sm:justify-end">
          <VoucherActions id={initialData.id} type="tour-package-query" />
        </div>

        <div
          id="voucher-content"
          data-pdf-ready="1"
          data-pdf-footer-label={footerLabel}
          data-pdf-footer-primary={footerPrimaryLine}
          data-pdf-footer-secondary={footerSecondaryLine}
          data-pdf-footer-website={currentCompany.website || ''}
          data-pdf-footer-logo={currentCompany.logo || ''}
          data-pdf-footer-tagline={selectedOption === 'AH' ? 'Crafted journeys, delivered with care.' : ''}
          className="vchr"
          style={{ maxWidth: 780, margin: '0 auto' }}
        >
          <section data-pdf-section="true" className="vchr-cover">
            {heroImage ? (
              <div className="vchr-cover-media">
                <Image
                  src={heroImage}
                  alt={initialData.tourPackageQueryName || 'Tour'}
                  width={1400}
                  height={900}
                  priority
                />
              </div>
            ) : (
              <div className="vchr-cover-fallback" />
            )}
            <div className="vchr-cover-shade" />
            <div className="vchr-cover-content">
              <div className="vchr-cover-top">
                {currentCompany.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentCompany.logo} alt={currentCompany.name || ''} className="vchr-cover-logo" />
                ) : (
                  <div className="vchr-cover-wordmark">{currentCompany.name || 'Booking Voucher'}</div>
                )}
                <div className="vchr-cover-pill">Booking Voucher</div>
              </div>

              <div className="vchr-cover-main">
                <div className="vchr-cover-wordmark">{currentCompany.name || 'Curated Travel'}</div>
                <h1 className="vchr-serif vchr-cover-title">{initialData.tourPackageQueryName}</h1>
                <div className="vchr-cover-subtitle">
                  Ref {initialData.tourPackageQueryNumber || initialData.id.substring(0, 8).toUpperCase()}
                  {confirmedVariantName ? ` | ${confirmedVariantName}` : ''}
                </div>
                <div className="vchr-cover-rule" />
                <div className="vchr-cover-meta">
                  {locationLabel && (
                    <div className="vchr-cover-meta-item">
                      <span className="vchr-cover-meta-label">Destination</span>
                      <span className="vchr-cover-meta-value">{locationLabel}</span>
                    </div>
                  )}
                  {initialData.numDaysNight && (
                    <div className="vchr-cover-meta-item">
                      <span className="vchr-cover-meta-label">Duration</span>
                      <span className="vchr-cover-meta-value">{initialData.numDaysNight}</span>
                    </div>
                  )}
                  {periodLabel && (
                    <div className="vchr-cover-meta-item">
                      <span className="vchr-cover-meta-label">Travel Period</span>
                      <span className="vchr-cover-meta-value">{periodLabel}</span>
                    </div>
                  )}
                  {initialData.tourPackageQueryType && (
                    <div className="vchr-cover-meta-item">
                      <span className="vchr-cover-meta-label">Package Type</span>
                      <span className="vchr-cover-meta-value">{initialData.tourPackageQueryType}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section data-pdf-section="true" className="vchr-section">
            <div className="vchr-section-head">
              <div>
                <div className="vchr-section-kicker">Reservation Summary</div>
                <h2 className="vchr-serif vchr-section-title">Trip Overview</h2>
              </div>
              <div className="vchr-section-rule" />
            </div>
            <div className="vchr-overview-panel">
            <div className="vchr-grid-2">
              {!supplierView && initialData.customerName && (
                <div className="vchr-field-card">
                  <div className="vchr-field-label">Guest</div>
                  <div className="vchr-field-value">
                    {initialData.customerName}
                    {initialData.customerNumber ? ` | ${initialData.customerNumber}` : ''}
                  </div>
                </div>
              )}
              {!supplierView && initialData.assignedTo && (
                <div className="vchr-field-card">
                  <div className="vchr-field-label">Assigned To</div>
                  <div className="vchr-field-value">
                    {initialData.assignedTo}
                    {initialData.assignedToMobileNumber ? ` | ${initialData.assignedToMobileNumber}` : ''}
                  </div>
                </div>
              )}
              {locationLabel && (
                <div className="vchr-field-card">
                  <div className="vchr-field-label">Destination</div>
                  <div className="vchr-field-value">{locationLabel}</div>
                </div>
              )}
              {initialData.numDaysNight && (
                <div className="vchr-field-card">
                  <div className="vchr-field-label">Duration</div>
                  <div className="vchr-field-value">{initialData.numDaysNight}</div>
                </div>
              )}
              {periodLabel && (
                <div className="vchr-field-card">
                  <div className="vchr-field-label">Travel Period</div>
                  <div className="vchr-field-value">{periodLabel}</div>
                </div>
              )}
              {(initialData.numAdults || initialData.numChild5to12 || initialData.numChild0to5) && (
                <div className="vchr-field-card">
                  <div className="vchr-field-label">Travellers</div>
                  <div className="vchr-field-value">
                    {[
                      initialData.numAdults ? `${initialData.numAdults} Adults` : '',
                      initialData.numChild5to12 ? `${initialData.numChild5to12} Child (5-12)` : '',
                      initialData.numChild0to5 ? `${initialData.numChild0to5} Child (0-5)` : '',
                    ].filter(Boolean).join(' | ')}
                  </div>
                </div>
              )}
              {initialData.transport && (
                <div className="vchr-field-card">
                  <div className="vchr-field-label">Transport</div>
                  <div className="vchr-field-value">{initialData.transport}</div>
                </div>
              )}
              {initialData.pickup_location && (
                <div className="vchr-field-card">
                  <div className="vchr-field-label">Pickup</div>
                  <div className="vchr-field-value">{initialData.pickup_location}</div>
                </div>
              )}
              {initialData.drop_location && (
                <div className="vchr-field-card">
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

          {initialData.itineraries && initialData.itineraries.length > 0 && (
            <section data-pdf-section="true" className="vchr-section">
              <div className="vchr-section-head">
                <div>
                  <div className="vchr-section-kicker">Journey Flow</div>
                  <h2 className="vchr-serif vchr-section-title">Day-by-Day</h2>
                </div>
                <div className="vchr-section-rule" />
              </div>
              <div className="vchr-timeline">
                {initialData.itineraries.map((itinerary, index) => {
                  const cleanedTitle = stripHtml(itinerary.itineraryTitle || '');
                  return (
                    <div key={index} className="vchr-day-row">
                      <div className="vchr-day-marker">
                        <div className="vchr-serif vchr-day-num">{String(itinerary.dayNumber).padStart(2, '0')}</div>
                        <div className="vchr-day-num-label">Day</div>
                      </div>
                      <div className="vchr-day-card">
                        <div className="vchr-day-card-head">
                          <span className="vchr-day-card-label">Curated Itinerary</span>
                          {itinerary.days && <span className="vchr-day-date">{itinerary.days}</span>}
                        </div>
                        <div className="vchr-day-text">
                          <strong>{cleanedTitle || '-'}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {!supplierView && initialData.flightDetails && initialData.flightDetails.length > 0 && (
            <section data-pdf-section="true" className="vchr-section">
              <div className="vchr-section-head">
                <div>
                  <div className="vchr-section-kicker">Air Travel</div>
                  <h2 className="vchr-serif vchr-section-title">Flights</h2>
                </div>
                <div className="vchr-section-rule" />
              </div>
              <div className="vchr-table-wrap">
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
                        {flight.flightNumber ? <span style={{ color: 'var(--vchr-mute)' }}> | {flight.flightNumber}</span> : null}
                      </td>
                      <td>
                        <strong>{flight.from}</strong>
                        <span style={{ color: 'var(--vchr-mute)' }}> to </span>
                        <strong>{flight.to}</strong>
                      </td>
                      <td>
                        {flight.departureTime}
                        <span style={{ color: 'var(--vchr-mute)' }}> - </span>
                        {flight.arrivalTime}
                      </td>
                      <td>{flight.flightDuration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </section>
          )}

          {initialData.itineraries && initialData.itineraries.length > 0 && (
            <section data-pdf-section="true" className="vchr-section">
              <div className="vchr-section-head">
                <div>
                  <div className="vchr-section-kicker">Stays & Rooms</div>
                  <h2 className="vchr-serif vchr-section-title">Accommodation</h2>
                </div>
                <div className="vchr-section-rule" />
              </div>
              {initialData.itineraries.map((itinerary, itineraryIdx) => {
                // Prefer confirmed-variant hotels, then query overrides, then itinerary defaults.
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
                    <div className="vchr-stay-head">
                      <div className="vchr-stay-badge">
                        Day {itinerary.dayNumber}
                        {normalizeItineraryDays(itinerary.days) ? ` | ${normalizeItineraryDays(itinerary.days)}` : ""}
                      </div>
                      <h3 className="vchr-serif vchr-stay-title">{hotelDetails?.name || 'Hotel'}</h3>
                    </div>
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
                            const roomTypeName = useCustom ? customText : (room.roomType?.name || roomTypes.find((r: any) => r.id === room.roomTypeId)?.name || '-');
                            const occupancyName = room.occupancyType?.name || occupancyTypes.find((o: any) => o.id === room.occupancyTypeId)?.name || '-';
                            const mealPlanName = room.mealPlan?.name || mealPlans.find((m: any) => m.id === room.mealPlanId)?.name || '-';
                            return (
                              <React.Fragment key={roomIdx}>
                                <tr>
                                  <td style={{ fontWeight: 500 }}>{roomTypeName}</td>
                                  <td>{occupancyName}</td>
                                  <td>{mealPlanName}</td>
                                  <td>{room.quantity || '-'}</td>
                                  <td style={{ color: 'var(--vchr-mute)' }}>{room.guestNames || '-'}</td>
                                  <td style={{ color: 'var(--vchr-mute)' }}>{room.voucherNumber || '-'}</td>
                                </tr>
                                {(room.extraBeds || []).map((eb: any, ebIdx: number) => (
                                  <tr key={`eb-${ebIdx}`}>
                                    <td className="vchr-extra-bed" style={{ paddingLeft: 16 }}>
                                      + Extra bed | {eb.occupancyType?.name || '-'}
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

          {initialData.itineraries && initialData.itineraries.some((itinerary) => {
            const fromVariant = confirmedTransport?.[itinerary.id];
            const effective =
              fromVariant !== undefined ? fromVariant : (itinerary.transportDetails || []);
            return effective.length > 0;
          }) && (
            <section data-pdf-section="true" className="vchr-section">
              <div className="vchr-section-head">
                <div>
                  <div className="vchr-section-kicker">Ground Transfers</div>
                  <h2 className="vchr-serif vchr-section-title">Transportation</h2>
                </div>
                <div className="vchr-section-rule" />
              </div>
              {initialData.itineraries.map((itinerary, itineraryIdx) => {
                const fromVariant = confirmedTransport?.[itinerary.id];
                const effectiveTransport: any[] =
                  fromVariant !== undefined
                    ? fromVariant
                    : (itinerary.transportDetails || []);

                if (effectiveTransport.length === 0) return null;

                return (
                  <div key={itineraryIdx} className="vchr-stay" data-pdf-section="true">
                    <div className="vchr-stay-head">
                      <div className="vchr-stay-badge">
                        Day {itinerary.dayNumber}
                        {normalizeItineraryDays(itinerary.days) ? ` | ${normalizeItineraryDays(itinerary.days)}` : ""}
                      </div>
                      <h3 className="vchr-serif vchr-stay-title">Transport</h3>
                    </div>
                    <table className="vchr-table">
                      <thead>
                        <tr>
                          <th>Vehicle</th>
                          <th>Qty</th>
                          <th>Capacity</th>
                          <th>Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {effectiveTransport.map((transport: any, transportIdx: number) => {
                          const vehicleName =
                            transport.vehicleType?.name ||
                            vehicleTypes.find((v) => v.id === transport.vehicleTypeId)?.name ||
                            '-';
                          return (
                            <tr key={transportIdx}>
                              <td style={{ fontWeight: 500 }}>{vehicleName}</td>
                              <td>{transport.quantity ?? 1}</td>
                              <td style={{ color: 'var(--vchr-mute)' }}>{transport.capacity || '-'}</td>
                              <td style={{ color: 'var(--vchr-mute)' }}>{transport.description || '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </section>
          )}

          {policies.length > 0 && (
            <section data-pdf-section="true" data-pdf-break-before="true" className="vchr-section">
              <div className="vchr-section-head">
                <div>
                  <div className="vchr-section-kicker">Useful Details</div>
                  <h2 className="vchr-serif vchr-section-title">Policies &amp; Terms</h2>
                </div>
                <div className="vchr-section-rule" />
              </div>
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

          {selectedOption !== 'Empty' && currentCompany.name && (
            <section data-pdf-section="true" className="vchr-signoff">
              <div className="vchr-signoff-mark">{currentCompany.name}</div>
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
