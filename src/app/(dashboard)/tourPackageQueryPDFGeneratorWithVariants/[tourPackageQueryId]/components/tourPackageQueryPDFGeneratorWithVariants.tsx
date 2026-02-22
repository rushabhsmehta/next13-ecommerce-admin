"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Activity,
  FlightDetails,
  Hotel,
  VariantHotelMapping,
  Images,
  Location,
  Itinerary,
  TourPackageQuery,
  PackageVariant,
  TourDestination,
  AssociatePartner,
  RoomAllocation,
  TransportDetail,
} from "@prisma/client";

interface TourPackageQueryPDFGeneratorWithVariantsProps {
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
      sourceVariantId: string;
      name: string;
      description: string | null;
      priceModifier: number | null;
      isDefault: boolean;
      sortOrder: number;
      hotelSnapshots: {
        id: string;
        dayNumber: number;
        hotelId: string;
        hotelName: string;
        locationLabel: string;
        imageUrl: string | null;
        roomCategory: string | null;
      }[];
      pricingSnapshots: {
        id: string;
        mealPlanId: string | null;
        mealPlanName: string;
        numberOfRooms: number;
        vehicleTypeId: string | null;
        vehicleTypeName: string | null;
        totalPrice: any; // Decimal
        description: string | null;
        pricingComponentSnapshots: {
          id: string;
          attributeName: string;
          price: any; // Decimal
          description: string | null;
        }[];
      }[];
    }[];
  } | null;
  locations: Location[];
  hotels: (Hotel & {
    images: Images[];
    destination: TourDestination | null;
    location: Location;
  })[];
  associatePartners: AssociatePartner[];
}

type CompanyInfo = {
  [key: string]: {
    logo: string;
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    social?: {
      facebook?: string;
      instagram?: string;
      twitter?: string;
      linkedin?: string;
      youtube?: string;
      whatsapp?: string;
    };
  };
};

const companyInfo: CompanyInfo = {
  Empty: { logo: "", name: "", address: "", phone: "", email: "", website: "" },
  AH: {
    logo: "https://admin.aagamholidays.com/aagamholidays.png",
    name: "Aagam Holidays",
    address: "B - 1203, PNTC, Times of India Press Road, Satellite, Ahmedabad - 380015, Gujarat, India",
    phone: "+91-97244 44701",
    email: "info@aagamholidays.com",
    website: "https://aagamholidays.com",
    social: {
      facebook: "https://www.facebook.com/aagamholidays2021",
      instagram: "https://www.instagram.com/aagamholidays/",
      twitter: "https://twitter.com/aagamholidays",
      linkedin: "https://www.linkedin.com/in/deep-doshi-1265802b9",
      whatsapp: "https://wa.me/919724444701",
    },
  },
};

const TourPackageQueryPDFGeneratorWithVariants: React.FC<TourPackageQueryPDFGeneratorWithVariantsProps> = ({
  initialData,
  locations,
  hotels,
  associatePartners,
}) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedOption = searchParams?.get("search") || "Empty";
  const [loading, setLoading] = useState(false);

  const currentCompany = companyInfo[selectedOption] ?? companyInfo["Empty"];

  // Brand Colors
  const brandColors = useMemo(() => ({
    primary: "#DC2626",
    secondary: "#EA580C",
    accent: "#F97316",
    light: "#FEF2F2",
    lightOrange: "#FFF7ED",
    text: "#1F2937",
    muted: "#6B7280",
    white: "#FFFFFF",
    border: "#E5E7EB",
    success: "#059669",
    panelBg: "#FFF8F5",
    subtlePanel: "#FFFDFB",
    tableHeaderBg: "#FFF3EC",
    slateText: "#374151",
    softDivider: "#F5E8E5",
  }), []);

  const brandGradients = useMemo(() => ({
    primary: "linear-gradient(135deg, #DC2626 0%, #EA580C 100%)",
    secondary: "linear-gradient(135deg, #EA580C 0%, #F97316 100%)",
    accent: "linear-gradient(135deg, #F97316 0%, #FB923C 100%)",
    light: "linear-gradient(135deg, #FEF2F2 0%, #FFF7ED 100%)",
    subtle: "linear-gradient(135deg, #FFFFFF 0%, #FFF7ED 100%)",
  }), []);

  // Shared Styles
  const containerStyle = useMemo(() => `
    max-width: 820px;
    margin: 0 auto;
    font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    color: ${brandColors.text};
    font-size: 13px;
    line-height: 1.55;
  `, [brandColors.text]);

  const cardStyle = useMemo(() => `
    background: ${brandColors.white};
    border: 1px solid ${brandColors.border};
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    margin-bottom: 20px;
  `, [brandColors.white, brandColors.border]);

  const headerStyleAlt = useMemo(() => `
    background: ${brandColors.tableHeaderBg};
    border-bottom: 1px solid ${brandColors.border};
    padding: 12px 16px;
  `, [brandColors.tableHeaderBg, brandColors.border]);

  const contentStyle = useMemo(() => `padding: 16px;`, []);

  const sectionTitleStyle = useMemo(() => `
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: ${brandColors.text};
    letter-spacing: 0.2px;
  `, [brandColors.text]);

  const priceCardStyle = useMemo(() => `
    background: ${brandColors.subtlePanel};
    border: 1px solid ${brandColors.border};
    border-radius: 8px;
    padding: 12px;
    margin-top: 8px;
  `, [brandColors.subtlePanel, brandColors.border]);

  const pageStyle = `
    @media print {
      @page {
        size: A4;
        margin: 72px 14px 140px 14px;
      }
    }
  `;

  const itineraryHeaderStyle = `
    .itinerary-static-header {
      display: block;
      margin: 0 0 12px 0;
    }
  `;

  const tableStyle = `
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    background: ${brandColors.white};
    border: 1px solid ${brandColors.border};
    border-radius: 4px;
    overflow: hidden;
  `;

  const tableHeaderStyle = `
    background: ${brandColors.tableHeaderBg};
    color: ${brandColors.text};
    padding: 10px 12px;
    text-align: left;
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  `;

  const tableCellStyle = `
    padding: 10px 12px;
    border-bottom: 1px solid ${brandColors.border};
    color: ${brandColors.text};
    font-size: 13px;
  `;

  const iconStyle = `
    display: inline-block;
    margin-right: 8px;
    font-size: 16px;
    vertical-align: middle;
  `;

  const pageBreakBefore = `
    page-break-before: always;
    break-before: page;
  `;

  // Policy parsing helpers
  const extractText = useCallback((obj: any): string => {
    if (!obj) return '';
    for (const k of ['text', 'value', 'description', 'label', 'name']) {
      if (obj[k]) return String(obj[k]);
    }
    return String(obj);
  }, []);

  const parsePolicyField = useCallback((field: any): string[] => {
    if (!field) return [];
    try {
      if (typeof field === 'string') {
        try {
          const parsed = JSON.parse(field);
          if (Array.isArray(parsed)) return parsed.map(i => typeof i === 'string' ? i : extractText(i));
        } catch {
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
        const vals = Object.values(field);
        return vals.flatMap(v => parsePolicyField(v));
      }
      return [String(field)];
    } catch {
      return [];
    }
  }, [extractText]);

  const formatINR = useCallback((val: string | number): string => {
    try {
      const n = parseFloat(String(val).replace(/[^\d.-]/g, ''));
      if (isNaN(n)) return String(val);
      return n.toLocaleString('en-IN');
    } catch {
      return String(val);
    }
  }, []);

  const parsePricingSection = useCallback((pricingData: any): Array<{ name?: string; price?: string; description?: string }> => {
    if (!pricingData) return [];
    try {
      if (Array.isArray(pricingData)) return pricingData;
      if (typeof pricingData === 'string') {
        const parsed = JSON.parse(pricingData);
        return parsed;
      }
      if (typeof pricingData === 'object') {
        const values = Object.values(pricingData).filter((item: any) =>
          item && typeof item === 'object' && (item.name || item.price)
        ) as Array<{ name?: string; price?: string; description?: string }>;
        return values;
      }
    } catch (error) {
      console.error('Error parsing pricing section:', error);
    }
    return [];
  }, []);

  const renderBulletList = useCallback((items: string[]) => items.map(i => `
    <div style="display: flex; align-items: flex-start; margin-bottom: 8px; line-height: 1.5;">
      <span style="color: #ea580c; margin-right: 8px; font-weight: bold; flex-shrink: 0;">•</span>
      <span style="color: #374151; font-size: 13px;">${i}</span>
    </div>
  `).join(''), []);

  // BUILD SECTIONS

  // Build Variant Comparison Table (hotel + pricing side-by-side)
  const buildVariantComparisonTable = useCallback((): string => {
    const variants = initialData?.queryVariantSnapshots;
    if (!variants || variants.length < 2) return "";

    const variantPricingData = (initialData as any)?.variantPricingData as Record<string, any> | null | undefined;
    const getVpd = (v: typeof variants[0]) =>
      variantPricingData?.[v.sourceVariantId] as { components?: { name: string; price: string; description?: string }[]; totalCost?: number; remarks?: string } | undefined;

    const allDays = Array.from(new Set(
      variants.flatMap(v => v.hotelSnapshots.map(h => h.dayNumber))
    )).sort((a, b) => a - b);

    const allComponents = Array.from(new Set([
      ...variants.flatMap(v =>
        v.pricingSnapshots.flatMap(p =>
          p.pricingComponentSnapshots.map(c => c.attributeName)
        )
      ),
      ...variants.flatMap(v => (getVpd(v)?.components || []).map((c: any) => c.name as string).filter(Boolean)),
    ]));

    const variantCount = variants.length;
    const labelColPct = Math.max(18, Math.round(100 / (variantCount + 1)));
    const dataColPct = Math.round((100 - labelColPct) / variantCount);

    const thBase = `padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid ${brandColors.border};`;
    const tdBase = `padding: 10px 12px; font-size: 13px; border: 1px solid ${brandColors.border}; vertical-align: top;`;
    const tdLabel = `${tdBase} background: ${brandColors.tableHeaderBg}; font-weight: 600; white-space: nowrap; color: ${brandColors.slateText};`;

    // Hotel comparison rows
    const hotelRows = allDays.map((day, i) => {
      const cells = variants.map(v => {
        const h = v.hotelSnapshots.find(hs => hs.dayNumber === day);
        return `<td style="${tdBase} background: ${i % 2 === 0 ? brandColors.white : brandColors.subtlePanel};">
          ${h ? `
            <div style="display: flex; align-items: center; gap: 10px;">
              ${h.imageUrl ? `
                <div style="flex-shrink: 0; width: 60px; height: 44px; border-radius: 4px; overflow: hidden; background: #f3f4f6;">
                  <img src="${h.imageUrl}" alt="${h.hotelName}" style="width: 100%; height: 100%; object-fit: cover;" />
                </div>
              ` : `
                <div style="flex-shrink: 0; width: 60px; height: 44px; border-radius: 4px; background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); display: flex; align-items: center; justify-content: center;">
                  <span style="font-size: 18px;">🏨</span>
                </div>
              `}
              <div>
                <div style="font-size: 12px; font-weight: 600; color: ${brandColors.text}; line-height: 1.3;">${h.hotelName}</div>
                <div style="font-size: 10px; color: ${brandColors.muted}; margin-top: 2px;">📍 ${h.locationLabel}</div>
                ${h.roomCategory ? `<div style="font-size: 10px; color: ${brandColors.secondary}; margin-top: 1px; font-weight: 500;">${h.roomCategory}</div>` : ''}
              </div>
            </div>
          ` : `<span style="color: ${brandColors.muted}; font-size: 11px; font-style: italic;">Not specified</span>`}
        </td>`;
      }).join('');
      return `<tr><td style="${tdLabel}">Day ${day}</td>${cells}</tr>`;
    }).join('');

    // Pricing comparison rows
    const metaRows = [
      {
        label: '🍽️ Meal Plan',
        fn: (v: typeof variants[0]) => v.pricingSnapshots[0]?.mealPlanName || (getVpd(v) ? 'See breakdown' : '—'),
      },
      {
        label: '🛏️ Rooms',
        fn: (v: typeof variants[0]) => {
          const ps = v.pricingSnapshots[0];
          if (ps) return `${ps.numberOfRooms} Room(s)${ps.vehicleTypeName ? ` · ${ps.vehicleTypeName}` : ''}`;
          const vpd = getVpd(v);
          return vpd ? 'See breakdown' : '—';
        },
      },
    ].map(({ label, fn }, i) => {
      const cells = variants.map(v => `<td style="${tdBase} background: ${i % 2 === 0 ? brandColors.white : brandColors.subtlePanel};">${fn(v)}</td>`).join('');
      return `<tr><td style="${tdLabel}">${label}</td>${cells}</tr>`;
    }).join('');

    const compRows = allComponents.map((compName, i) => {
      const cells = variants.map(v => {
        const bg = (i + 2) % 2 === 0 ? brandColors.white : brandColors.subtlePanel;
        const vpd = getVpd(v);
        const vpdComp = (vpd?.components || []).find((c: any) => c.name === compName);
        if (vpdComp) {
          return `<td style="${tdBase} background: ${bg};">₹ ${formatINR(String(vpdComp.price || 0))}</td>`;
        }
        const ps = v.pricingSnapshots[0];
        const comp = ps?.pricingComponentSnapshots.find(c => c.attributeName === compName);
        if (comp) {
          return `<td style="${tdBase} background: ${bg};">₹ ${formatINR(comp.price.toString())}</td>`;
        }
        return `<td style="${tdBase} background: ${bg};">—</td>`;
      }).join('');
      return `<tr><td style="${tdLabel}">${compName}</td>${cells}</tr>`;
    }).join('');

    const totalRow = (() => {
      const cells = variants.map(v => {
        let totalStr = '—';
        const vpd = getVpd(v);
        if (vpd?.totalCost) {
          const n = parseFloat(String(vpd.totalCost));
          if (!isNaN(n) && n > 0) totalStr = `₹ ${formatINR(n.toString())}`;
        } else {
          const ps = v.pricingSnapshots[0];
          if (ps) {
            try {
              const val = ps.totalPrice?.toString();
              if (val) {
                const n = parseFloat(val);
                if (!isNaN(n) && n > 0) totalStr = `₹ ${formatINR(val)}`;
              }
            } catch { /* fall through */ }
          }
        }
        return `<td style="${tdBase} background: ${brandColors.light}; font-weight: 700; font-size: 15px; color: ${brandColors.primary};">
          ${totalStr}
        </td>`;
      }).join('');
      return `<tr><td style="${tdLabel} background: ${brandColors.light}; color: ${brandColors.primary}; font-size: 13px;">💰 Total Price</td>${cells}</tr>`;
    })();

    const variantHeaders = variants.map(v => `
      <th style="${thBase} background: ${brandColors.primary}; color: white; width: ${dataColPct}%;">
        ${v.name}
        ${v.priceModifier && v.priceModifier !== 0 ? `
          <span style="display: block; font-size: 10px; font-weight: 500; opacity: 0.9; margin-top: 2px;">
            ${v.priceModifier > 0 ? '+' : ''}${v.priceModifier}% adjustment
          </span>
        ` : ''}
      </th>
    `).join('');

    return `
      <div style="${cardStyle} page-break-inside: avoid; break-inside: avoid-page; margin-bottom: 24px;">
        <div style="background: ${brandGradients.primary}; padding: 16px 20px;">
          <h3 style="color: white; font-size: 18px; font-weight: 700; margin: 0; letter-spacing: 0.3px;">
            📊 Variant Comparison at a Glance
          </h3>
          <p style="color: rgba(255,255,255,0.88); font-size: 12px; margin: 4px 0 0 0;">
            Side-by-side comparison of all package variants — hotels &amp; pricing
          </p>
        </div>

        <div style="${contentStyle}">
          ${allDays.length > 0 ? `
            <div style="margin-bottom: 24px;">
              <div style="font-size: 13px; font-weight: 700; color: ${brandColors.text}; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
                <span>🏨</span> Hotel Comparison by Day
              </div>
              <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif;">
                  <thead>
                    <tr>
                      <th style="${thBase} background: ${brandColors.tableHeaderBg}; color: ${brandColors.text}; width: ${labelColPct}%;">Day</th>
                      ${variantHeaders}
                    </tr>
                  </thead>
                  <tbody>${hotelRows}</tbody>
                </table>
              </div>
            </div>
          ` : ''}

          ${variants.some(v => v.pricingSnapshots.length > 0) ? `
            <div>
              <div style="font-size: 13px; font-weight: 700; color: ${brandColors.text}; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
                <span>💰</span> Pricing Comparison
              </div>
              <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif;">
                  <thead>
                    <tr>
                      <th style="${thBase} background: ${brandColors.tableHeaderBg}; color: ${brandColors.text}; width: ${labelColPct}%;">Component</th>
                      ${variantHeaders}
                    </tr>
                  </thead>
                  <tbody>
                    ${metaRows}
                    ${compRows}
                    ${totalRow}
                  </tbody>
                </table>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }, [initialData, brandColors, brandGradients, cardStyle, contentStyle, formatINR]);

  // Build Hotel Comparison Section — 4 days per page, compact day column, larger hotel images
  const buildHotelComparisonSection = useCallback((): string => {
    const variants = initialData?.queryVariantSnapshots;
    if (!variants || variants.length < 2) return "";

    const allDays = Array.from(new Set(
      variants.flatMap(v => v.hotelSnapshots.map(h => h.dayNumber))
    )).sort((a, b) => a - b);

    if (allDays.length === 0) return "";

    const variantCount = variants.length;
    // Compact day column — just a numbered badge, no wasted space
    const labelColPct = Math.max(6, Math.round(60 / (variantCount + 2)));
    const dataColPct = Math.round((100 - labelColPct) / variantCount);

    const variantAccents = [brandColors.primary, brandColors.secondary, '#D97706', '#92400E'];

    const thBase = `padding: 10px 8px; text-align: center; font-size: 11px; font-weight: 700; border: 1px solid ${brandColors.border};`;
    const tdBase = `padding: 8px 6px; border: 1px solid ${brandColors.border}; vertical-align: top;`;
    const tdDayBase = `${tdBase} text-align: center; border-right: 2px solid #FDBA74; width: ${labelColPct}%;`;

    const variantHeaders = variants.map((v, idx) => `
      <th style="padding: 10px 8px; text-align: center; font-size: 11px; font-weight: 700; border: 1px solid ${brandColors.border}; background: ${brandColors.lightOrange}; color: ${brandColors.text}; width: ${dataColPct}%;">
        <div style="font-size: 12px; font-weight: 800; color: ${brandColors.primary};">${v.name}</div>
        ${v.priceModifier && v.priceModifier !== 0 ? `
          <div style="font-size: 9px; font-weight: 500; opacity: 0.75; margin-top: 2px;">
            ${v.priceModifier > 0 ? '+' : ''}${v.priceModifier}% adjustment
          </div>
        ` : ''}
      </th>
    `).join('');

    const buildChunkRows = (days: number[]) => days.map((day, i) => {
      const isEven = i % 2 === 0;
      // Hotel data cells
      const cells = variants.map((v, vidx) => {
        const h = v.hotelSnapshots.find(hs => hs.dayNumber === day);
        const accent = variantAccents[vidx % variantAccents.length];
        return `<td style="${tdBase} background: ${isEven ? brandColors.white : brandColors.subtlePanel}; padding: 8px 6px;">
          ${h ? `
            <div style="border: 1px solid ${brandColors.border}; border-radius: 6px; overflow: hidden;">
              ${h.imageUrl ? `
                <div style="height: 130px; overflow: hidden; background: #F3F4F6;">
                  <img src="${h.imageUrl}" alt="${h.hotelName}" style="width: 100%; height: 100%; object-fit: cover;" />
                </div>
              ` : `
                <div style="height: 100px; background: linear-gradient(135deg, ${brandColors.light} 0%, ${brandColors.lightOrange} 100%); display: flex; align-items: center; justify-content: center;">
                  <span style="font-size: 36px;">🏨</span>
                </div>
              `}
              <div style="padding: 9px 10px; border-top: 2.5px solid ${accent};">
                <div style="font-size: 12px; font-weight: 700; color: ${brandColors.text}; line-height: 1.35; margin-bottom: 4px;">${h.hotelName}</div>
                <div style="font-size: 10px; color: ${brandColors.muted}; margin-bottom: 4px;">📍 ${h.locationLabel}</div>
                ${h.roomCategory ? `
                  <span style="font-size: 9px; color: white; background: ${accent}; padding: 2px 7px; border-radius: 999px; font-weight: 600; display: inline-block;">${h.roomCategory}</span>
                ` : ''}
              </div>
            </div>
          ` : `
            <div style="height: 120px; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1.5px dashed ${brandColors.border}; border-radius: 8px; background: ${brandColors.subtlePanel};">
              <span style="font-size: 22px; margin-bottom: 4px; opacity: 0.4;">🏷️</span>
              <span style="color: ${brandColors.muted}; font-size: 9px; font-style: italic;">Not specified</span>
            </div>
          `}
        </td>`;
      }).join('');

      return `<tr style="page-break-inside: avoid; break-inside: avoid;">
        <td style="${tdDayBase} background: ${isEven ? brandColors.lightOrange : '#FEF2F2'}; padding: 6px 4px;">
          <div style="width: 26px; height: 26px; background: ${brandColors.primary}; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; margin: auto;">${day}</div>
        </td>
        ${cells}
      </tr>`;
    }).join('');

    // Split days into pages of 4
    const CHUNK_SIZE = 4;
    const dayChunks: number[][] = [];
    for (let i = 0; i < allDays.length; i += CHUNK_SIZE) {
      dayChunks.push(allDays.slice(i, i + CHUNK_SIZE));
    }

    const chunkedTables = dayChunks.map((chunk, chunkIndex) => `
      <div style="${chunkIndex > 0 ? 'page-break-before: always; break-before: page; padding-top: 4px;' : ''}">
        ${chunkIndex > 0 ? `
          <div style="background: ${brandColors.lightOrange}; border-left: 6px solid ${brandColors.primary}; padding: 14px 20px; margin-bottom: 14px; display: flex; align-items: center; gap: 12px; border-radius: 8px;">
            <div style="width: 36px; height: 36px; background: ${brandColors.primary}; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;">🏨</div>
            <div>
              <div style="color: ${brandColors.primary}; font-size: 16px; font-weight: 800; margin: 0;">Hotel Comparison <span style="font-size: 13px; font-weight: 600; opacity: 0.8;">(continued)</span></div>
              <div style="color: #7C2D12; font-size: 11px; margin-top: 2px; font-weight: 500;">Nights ${chunk[0]} – ${chunk[chunk.length - 1]}</div>
            </div>
          </div>
        ` : ''}
        <div style="border-radius: 8px; overflow: hidden; box-shadow: 0 1px 6px rgba(0,0,0,0.06); border: 1px solid ${brandColors.border}; margin-bottom: 0;">
          <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif;">
            <thead style="display: table-header-group;">
              <tr style="page-break-inside: avoid; break-inside: avoid;">
                <th style="padding: 10px 6px; background: ${brandColors.primary}; color: white; width: ${labelColPct}%; text-align: center; border: none; font-size: 9px; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700;">
                  Night
                </th>
                ${variantHeaders}
              </tr>
            </thead>
            <tbody>${buildChunkRows(chunk)}</tbody>
          </table>
        </div>
      </div>
    `).join('');

    return `
      <div style="page-break-before: always; break-before: page; margin-bottom: 28px;">
        <div style="background: ${brandColors.lightOrange}; border-left: 6px solid ${brandColors.primary}; border-bottom: 1px solid #FDBA74; padding: 18px 22px; page-break-after: avoid; break-after: avoid; page-break-inside: avoid; break-inside: avoid; border-radius: 8px 8px 0 0;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div style="width: 46px; height: 46px; background: ${brandColors.primary}; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0;">🏨</div>
            <div>
              <h3 style="color: ${brandColors.primary}; font-size: 20px; font-weight: 800; margin: 0;">Hotel Comparison</h3>
              <p style="color: #7C2D12; font-size: 12px; margin: 4px 0 0 0; font-weight: 400;">Accommodations across all ${variants.length} variants — night by night</p>
            </div>
          </div>
        </div>
        <div style="padding: 16px 0 14px;">
          ${chunkedTables}
          <div style="margin-top: 14px; background: ${brandColors.lightOrange}; border-left: 4px solid ${brandColors.accent}; border-radius: 0 4px 4px 0; padding: 8px 12px;">
            <span style="font-size: 11px; color: #7C2D12; font-weight: 400; font-style: italic;">💡 Hotel availability may vary. Final accommodation is confirmed at the time of booking.</span>
          </div>
        </div>
      </div>
    `;
  }, [initialData, brandColors]);

  // Build Price Comparison Section — brand colors (Section 2)
  const buildPriceComparisonSection = useCallback((): string => {
    const variants = initialData?.queryVariantSnapshots;
    if (!variants || variants.length < 2) return "";
    const variantPricingData = (initialData as any)?.variantPricingData as Record<string, any> | null | undefined;

    // Helper: get variantPricingData entry for a snapshot (keyed by sourceVariantId)
    const getVpd = (v: typeof variants[0]) =>
      variantPricingData?.[v.sourceVariantId] as { components?: { name: string; price: string; description?: string }[]; totalCost?: number; remarks?: string } | undefined;

    // Show section whenever we have variant data; show '—' if pricing not configured
    const hasPricing = variants.some(v => v.pricingSnapshots.length > 0 || !!getVpd(v)?.totalCost);

    // Collect component names from both pricingSnapshots AND variantPricingData
    const allComponents = Array.from(new Set([
      ...variants.flatMap(v =>
        v.pricingSnapshots.flatMap(p =>
          p.pricingComponentSnapshots.map(c => c.attributeName)
        )
      ),
      ...variants.flatMap(v => (getVpd(v)?.components || []).map((c: any) => c.name as string).filter(Boolean)),
    ]));

    const variantCount = variants.length;
    const labelColPct = Math.max(18, Math.round(100 / (variantCount + 1.6)));
    const dataColPct = Math.round((100 - labelColPct) / variantCount);

    const thBase = `padding: 10px 8px; text-align: center; font-size: 11px; font-weight: 700; border: 1px solid ${brandColors.border};`;
    const tdBase = `padding: 9px 12px; border: 1px solid ${brandColors.border}; vertical-align: middle;`;
    const tdLabel = `${tdBase} background: #FAFAFA; font-weight: 600; color: ${brandColors.slateText}; font-size: 12px;`;

    const variantHeaders = variants.map((v, idx) => `
      <th style="${thBase} background: ${brandColors.lightOrange}; color: ${brandColors.primary}; width: ${dataColPct}%;">
        <div style="font-size: 12px; font-weight: 800;">${v.name}</div>
        ${v.priceModifier && v.priceModifier !== 0 ? `
          <div style="font-size: 9px; font-weight: 500; color: ${brandColors.muted}; margin-top: 2px;">${v.priceModifier > 0 ? '+' : ''}${v.priceModifier}%</div>
        ` : ''}
      </th>
    `).join('');

    // Safely parse total price — prefers variantPricingData, falls back to pricingSnapshot
    const safeTotal = (v: typeof variants[0]): string => {
      const vpd = getVpd(v);
      if (vpd?.totalCost) {
        const n = parseFloat(String(vpd.totalCost));
        if (!isNaN(n) && n > 0) return `₹ ${formatINR(n.toString())}`;
      }
      const ps = v.pricingSnapshots[0];
      if (ps) {
        try {
          const val = ps.totalPrice?.toString();
          if (val) {
            const n = parseFloat(val);
            if (!isNaN(n) && n > 0) return `₹ ${formatINR(val)}`;
          }
        } catch { /* fall through */ }
      }
      return '—';
    };

    // Identify cheapest variant for "Best Value" badge
    const variantTotals = variants.map(v => {
      const vpd = getVpd(v);
      if (vpd?.totalCost) {
        const n = parseFloat(String(vpd.totalCost));
        if (!isNaN(n) && n > 0) return n;
      }
      try {
        const ps = v.pricingSnapshots[0];
        if (ps?.totalPrice) {
          const n = parseFloat(ps.totalPrice.toString());
          if (!isNaN(n) && n > 0) return n;
        }
      } catch { /* fall through */ }
      return Infinity;
    });
    const minPrice = Math.min(...variantTotals.filter(t => t !== Infinity));



    const compRows = allComponents.map((compName, i) => {
      const cells = variants.map(v => {
        const bg = (i + 2) % 2 === 0 ? brandColors.white : '#FAFAFA';

        // Prefer variantPricingData components
        const vpd = getVpd(v);
        const vpdComp = (vpd?.components || []).find((c: any) => c.name === compName);
        if (vpdComp) {
          return `<td style="${tdBase} background: ${bg}; text-align: right;">
            <span style="font-weight: 600; color: ${brandColors.text};">₹ ${formatINR(String(vpdComp.price || 0))}</span>
          </td>`;
        }

        // Fallback to pricingSnapshots
        const ps = v.pricingSnapshots[0];
        const comp = ps?.pricingComponentSnapshots.find(c => c.attributeName === compName);
        if (comp) {
          return `<td style="${tdBase} background: ${bg}; text-align: right;">
            <span style="font-weight: 600; color: ${brandColors.text};">₹ ${formatINR(comp.price.toString())}</span>
          </td>`;
        }

        return `<td style="${tdBase} background: ${bg}; text-align: center;"><span style="color: #D1D5DB;">—</span></td>`;
      }).join('');
      return `<tr style="page-break-inside: avoid; break-inside: avoid;"><td style="${tdLabel}">${compName}</td>${cells}</tr>`;
    }).join('');

    const totalRow = (() => {
      const cells = variants.map((v, idx) => {
        const totalStr = safeTotal(v);
        const isBest = variantTotals[idx] === minPrice && minPrice !== Infinity;
        return `<td style="${tdBase} background: ${brandColors.lightOrange}; text-align: center; padding: 14px 12px; border-top: 2px solid ${brandColors.primary};">
          <div style="font-size: 16px; font-weight: 800; color: ${brandColors.primary}; line-height: 1.2; margin-bottom: 3px;">${totalStr}</div>
          ${isBest && totalStr !== '—' ? `<div style="display: inline-block; background: #059669; color: white; font-size: 8px; padding: 2px 7px; border-radius: 999px; font-weight: 600;">Best Value</div>` : ''}
        </td>`;
      }).join('');
      return `<tr style="page-break-inside: avoid; break-inside: avoid;">
        <td style="${tdLabel} background: ${brandColors.lightOrange}; color: ${brandColors.primary}; font-weight: 700; border-top: 2px solid ${brandColors.primary};">Total Price</td>
        ${cells}
      </tr>`;
    })();

    const noPricingNote = !hasPricing ? `
      <div style="margin-top: 10px; padding: 6px 10px; background: #FEF9C3; border-radius: 4px;">
        <span style="font-size: 10px; color: #713F12; font-style: italic;">⚠ No pricing data found. Please enter pricing in the Variants Pricing Tab and save.</span>
      </div>
    ` : `
      <div style="margin-top: 10px; padding: 6px 10px; background: ${brandColors.lightOrange}; border-radius: 4px;">
        <span style="font-size: 10px; color: ${brandColors.muted}; font-style: italic;">All prices include GST. Subject to availability.</span>
      </div>
    `;

    return `
      <div style="${cardStyle} margin-bottom: 28px; page-break-before: always; break-before: page;">
        <div style="background: ${brandColors.lightOrange}; border-left: 6px solid ${brandColors.secondary}; border-bottom: 1px solid #FDBA74; padding: 18px 22px; page-break-inside: avoid; break-inside: avoid;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div style="width: 46px; height: 46px; background: ${brandColors.secondary}; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0;">💰</div>
            <div>
              <h3 style="color: ${brandColors.secondary}; font-size: 20px; font-weight: 800; margin: 0;">Price Comparison</h3>
              <p style="color: #7C2D12; font-size: 12px; margin: 4px 0 0 0; font-weight: 400;">Detailed pricing breakdown across all ${variants.length} package variants</p>
            </div>
          </div>
        </div>
        <div style="padding: 16px 16px 14px;">
          <div style="border-radius: 8px; overflow: hidden; box-shadow: 0 1px 6px rgba(0,0,0,0.06); border: 1px solid ${brandColors.border};">
            <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif;">
              <thead style="display: table-header-group;">
                <tr style="page-break-inside: avoid; break-inside: avoid;">
                  <th style="padding: 11px 12px; background: ${brandColors.secondary}; color: white; width: ${labelColPct}%; text-align: left; border: none; font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700;">
                    Component
                  </th>
                  ${variantHeaders}
                </tr>
              </thead>
              <tbody>
                ${compRows}
                ${totalRow}
              </tbody>
            </table>
          </div>
          ${noPricingNote}
        </div>
      </div>
    `;
  }, [initialData, brandColors, cardStyle, formatINR]);

  // Build Package Variants Section (individual variant cards)
  const buildVariantsSection = useCallback((): string => {
    if (!initialData?.queryVariantSnapshots || initialData.queryVariantSnapshots.length === 0) {
      return "";
    }

    const formatPriceModifier = (modifier: number | null): string => {
      if (!modifier || modifier === 0) return "Base Price";
      const sign = modifier > 0 ? "+" : "";
      return `${sign}${modifier}%`;
    };

    const getPriceModifierColor = (modifier: number | null): string => {
      if (!modifier || modifier === 0) return brandColors.muted;
      return modifier > 0 ? brandColors.secondary : brandColors.success;
    };

    return `
      <div style="${cardStyle}; ${pageBreakBefore}">
        <div style="border-bottom: 2px solid ${brandColors.primary}; padding: 14px 18px;">
          <h2 style="color: ${brandColors.primary}; font-size: 17px; font-weight: 800; margin: 0; display: flex; align-items: center; gap: 8px;">
            ✨ Package Variants & Hotel Options
          </h2>
          <p style="color: ${brandColors.muted}; font-size: 11px; margin: 3px 0 0 0;">Detailed view of each accommodation option</p>
        </div>

        <div style="${contentStyle}">
          ${initialData.queryVariantSnapshots.map((variant, variantIndex) => {
      const hotelsByDay = variant.hotelSnapshots.sort((a, b) => a.dayNumber - b.dayNumber);

      return `
              <div style="margin-bottom: ${variantIndex < initialData.queryVariantSnapshots!.length - 1 ? '32px' : '0'}; page-break-inside: avoid; break-inside: avoid-page;">
                <div style="border-left: 4px solid ${brandColors.secondary}; padding: 12px 16px; border-radius: 0 6px 0 0; background: ${brandColors.lightOrange}; display: flex; align-items: center; justify-content: space-between;">
                  <div style="flex: 1;">
                    <h3 style="margin: 0; font-size: 15px; font-weight: 700; color: ${brandColors.text}; display: flex; align-items: center; gap: 8px;">
                      <span style="background: ${brandColors.primary}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700;">
                        ${variantIndex + 1}
                      </span>
                      ${variant.name}
                    </h3>
                    ${variant.description ? `
                      <p style="margin: 4px 0 0 0; font-size: 12px; color: ${brandColors.muted}; line-height: 1.4;">
                        ${variant.description}
                      </p>
                    ` : ''}
                  </div>
                  <div style="text-align: right; margin-left: 12px;">
                    <div style="padding: 4px 10px; border-radius: 4px; border: 1px solid ${brandColors.border}; background: white;">
                      <div style="font-size: 13px; font-weight: 700; color: ${getPriceModifierColor(variant.priceModifier)};">
                        ${formatPriceModifier(variant.priceModifier)}
                      </div>
                    </div>
                  </div>
                </div>

                ${hotelsByDay.length > 0 ? `
                  <div style="background: ${brandColors.subtlePanel}; border: 1px solid ${brandColors.border}; border-top: none; border-radius: 0 0 8px 8px; padding: 16px 20px;">
                    <div style="font-size: 13px; font-weight: 600; color: ${brandColors.text}; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                      <span style="color: ${brandColors.secondary};">🏨</span>
                      Hotel Accommodations
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 10px;">
                      ${hotelsByDay.map((hotelSnapshot) => `
                        <div style="background: ${brandColors.white}; border: 1px solid ${brandColors.border}; border-radius: 6px; overflow: hidden; display: flex; align-items: center; gap: 0; page-break-inside: avoid; break-inside: avoid-page;">
                          <div style="background: ${brandGradients.primary}; padding: 8px 12px; writing-mode: initial; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 56px; align-self: stretch;">
                            <div style="font-size: 9px; font-weight: 600; color: rgba(255,255,255,0.85); text-transform: uppercase; letter-spacing: 0.5px;">DAY</div>
                            <div style="font-size: 18px; font-weight: 800; color: white; line-height: 1;">${hotelSnapshot.dayNumber}</div>
                          </div>
                          ${hotelSnapshot.imageUrl ? `
                            <div style="flex-shrink: 0; width: 80px; height: 60px; overflow: hidden; background: #f3f4f6;">
                              <img src="${hotelSnapshot.imageUrl}" alt="${hotelSnapshot.hotelName}" style="width: 100%; height: 100%; object-fit: cover;" />
                            </div>
                          ` : `
                            <div style="flex-shrink: 0; width: 80px; height: 60px; background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); display: flex; align-items: center; justify-content: center;">
                              <span style="font-size: 22px;">🏨</span>
                            </div>
                          `}
                          <div style="padding: 10px 14px; flex: 1;">
                            <div style="font-size: 13px; font-weight: 600; color: ${brandColors.text}; line-height: 1.3;">${hotelSnapshot.hotelName}</div>
                            <div style="font-size: 11px; color: ${brandColors.muted}; margin-top: 3px;">📍 ${hotelSnapshot.locationLabel}</div>
                            ${hotelSnapshot.roomCategory ? `<div style="margin-top: 3px; font-size: 10px; color: ${brandColors.secondary}; font-weight: 500;">${hotelSnapshot.roomCategory}</div>` : ''}
                          </div>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                ` : `
                  <div style="background: ${brandColors.light}; border: 1px solid ${brandColors.border}; border-top: none; border-radius: 0 0 8px 8px; padding: 16px; text-align: center;">
                    <p style="margin: 0; font-size: 13px; color: ${brandColors.muted};">
                      No specific hotel mappings for this variant
                    </p>
                  </div>
                `}

${(() => {
          // Prefer pricingSnapshots (snapshot system); fall back to variantPricingData (Pricing Tab)
          if (variant.pricingSnapshots && variant.pricingSnapshots.length > 0) {
            return `
                      <div style="background: ${brandColors.white}; border: 1px solid ${brandColors.border}; border-top: none; padding: 20px; margin-top: -1px;">
                        <div style="font-size: 14px; font-weight: 600; color: ${brandColors.text}; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                          <span style="color: ${brandColors.secondary};">💰</span>
                          Variant Pricing
                        </div>
                        ${variant.pricingSnapshots.map((pricing, idx) => `
                          <div style="background: ${brandColors.subtlePanel}; border: 1px solid ${brandColors.border}; border-radius: 6px; padding: 16px; margin-bottom: ${idx < variant.pricingSnapshots.length - 1 ? '12px' : '0'};">
                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                              <div>
                                ${pricing.mealPlanName ? `
                                  <div style="font-size: 13px; font-weight: 600; color: ${brandColors.text}; margin-bottom: 4px;">🍽️ ${pricing.mealPlanName}</div>
                                ` : ''}
                                <div style="font-size: 11px; color: ${brandColors.muted};">${pricing.numberOfRooms} Room(s) ${pricing.vehicleTypeName ? `• 🚗 ${pricing.vehicleTypeName}` : ''}</div>
                              </div>
                              <div style="text-align: right;">
                                <div style="font-size: 18px; font-weight: 700; color: ${brandColors.primary};">₹ ${formatINR(pricing.totalPrice.toString())}</div>
                              </div>
                            </div>
                            ${pricing.pricingComponentSnapshots.length > 0 ? `
                              <div style="border-top: 1px solid ${brandColors.border}; padding-top: 12px; margin-top: 8px;">
                                <div style="font-size: 11px; font-weight: 600; color: ${brandColors.muted}; margin-bottom: 8px; text-transform: uppercase;">Price Breakdown</div>
                                ${pricing.pricingComponentSnapshots.map(comp => `
                                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; margin-bottom: 4px;">
                                    <span style="color: ${brandColors.text};">${comp.attributeName}</span>
                                    <span style="color: ${brandColors.muted}; font-weight: 500;">₹ ${formatINR(comp.price.toString())}</span>
                                  </div>
                                `).join('')}
                              </div>
                            ` : ''}
                            ${pricing.description ? `
                              <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid ${brandColors.border};">
                                <div style="font-size: 11px; color: ${brandColors.muted}; line-height: 1.4;">${pricing.description}</div>
                              </div>
                            ` : ''}
                          </div>
                        `).join('')}
                      </div>
                    `;
          }
          // Fallback: read from variantPricingData (Pricing Tab)
          const vpd = ((initialData as any)?.variantPricingData as Record<string, any> | null | undefined)?.[variant.sourceVariantId];
          if (!vpd || (!vpd.totalCost && !(vpd.components?.length))) return '';
          const vpdComponents: { name: string; price: string; description?: string }[] = vpd.components || [];
          const vpdTotal = vpd.totalCost || 0;
          const vpdRemarks = vpd.remarks || '';
          return `
                    <div style="background: ${brandColors.white}; border: 1px solid ${brandColors.border}; border-top: none; padding: 20px; margin-top: -1px;">
                      <div style="font-size: 14px; font-weight: 600; color: ${brandColors.text}; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                        <span style="color: ${brandColors.secondary};">💰</span>
                        Variant Pricing
                      </div>
                      <div style="background: ${brandColors.subtlePanel}; border: 1px solid ${brandColors.border}; border-radius: 6px; padding: 16px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: ${vpdComponents.length > 0 ? '12px' : '0'};">
                          <div style="font-size: 12px; color: ${brandColors.muted};">Package Price</div>
                          <div style="font-size: 18px; font-weight: 700; color: ${brandColors.primary};">₹ ${formatINR(String(vpdTotal))}</div>
                        </div>
                        ${vpdComponents.length > 0 ? `
                          <div style="border-top: 1px solid ${brandColors.border}; padding-top: 12px; margin-top: 8px;">
                            <div style="font-size: 11px; font-weight: 600; color: ${brandColors.muted}; margin-bottom: 8px; text-transform: uppercase;">Price Breakdown</div>
                            ${vpdComponents.map(comp => `
                              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; margin-bottom: 4px;">
                                <span style="color: ${brandColors.text};">${comp.name}</span>
                                <span style="color: ${brandColors.muted}; font-weight: 500;">₹ ${formatINR(String(comp.price || 0))}</span>
                              </div>
                            `).join('')}
                          </div>
                        ` : ''}
                        ${vpdRemarks ? `
                          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid ${brandColors.border};">
                            <div style="font-size: 11px; color: ${brandColors.muted}; line-height: 1.4;">${vpdRemarks}</div>
                          </div>
                        ` : ''}
                      </div>
                    </div>
                  `;
        })()}
              </div>
            `;
    }).join('')}

          <div style="background: ${brandColors.lightOrange}; border: 1px solid #fed7aa; border-radius: 6px; padding: 12px; margin-top: 20px; text-align: center;">
            <p style="margin: 0; font-size: 12px; color: ${brandColors.secondary}; font-weight: 500; font-style: italic;">
              💡 Select your preferred variant when booking. Prices and hotels may vary based on availability.
            </p>
          </div>
        </div>
      </div>
    `;
  }, [initialData, brandColors, brandGradients, cardStyle, contentStyle, pageBreakBefore, formatINR]);

  // Build HTML Content
  const buildHtmlContent = useCallback((): string => {
    if (!initialData) return "";

    // 1. Header Section
    const headerSection = `
      <div style="${cardStyle}; text-align: center; position: relative;">
        ${initialData.images && initialData.images.length > 0 ? `
          <div style="width: 100%; height: 240px; overflow: hidden; border-top-left-radius: 6px; border-top-right-radius: 6px; position: relative;">
            <img src="${initialData.images[0].url}" alt="Tour Image" style="width: 100%; height: 100%; object-fit: cover; filter: brightness(0.9);" />
            ${currentCompany.logo ? `
              <div style="position: absolute; top: 12px; left: 12px; background: rgba(255,255,255,0.85); backdrop-filter: blur(4px); padding: 6px 10px; border-radius: 6px; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                <img src="${currentCompany.logo}" alt="${currentCompany.name} Logo" style="height: 34px; width: auto; object-fit: contain;" />
              </div>
            ` : ''}
          </div>
        ` : currentCompany.logo ? `
          <div style="padding-top: 24px; display: flex; justify-content: center;">
            <img src="${currentCompany.logo}" alt="${currentCompany.name} Logo" style="height: 56px; width: auto; object-fit: contain;" />
          </div>
        ` : ''}
        <div style="padding: 24px 24px 28px;">
          <span style="background: ${brandColors.light}; color: ${brandColors.primary}; padding: 6px 16px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.65px;">
            ${initialData.tourPackageQueryType} Package
          </span>
          <h1 style="font-size: 30px; margin: 14px 0 0 0; font-weight: 800; line-height: 1.18; background: ${brandGradients.primary}; -webkit-background-clip: text; color: transparent; letter-spacing: 0.75px;">
            ${initialData.tourPackageQueryName}
          </h1>
          ${currentCompany.name ? `
            <div style="margin-top: 10px; font-size: 12px; font-weight: 600; color: ${brandColors.muted}; letter-spacing: 1px; text-transform: uppercase;">
              Prepared by ${currentCompany.name}
            </div>
          ` : ''}
        </div>
      </div>
    `;

    // 2. Tour Information
    const tourInfoSection = `
      <div style="${cardStyle}">
        <div style="${headerStyleAlt}">
          <h2 style="${sectionTitleStyle}">Tour Information</h2>
        </div>
        <div style="${contentStyle}">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
            <div style="background: #f9fafb; padding: 12px; border-radius: 4px; border-left: 4px solid ${brandColors.primary};">
              <div style="font-size: 12px; color: #6b7280; font-weight: 600; margin-bottom: 4px;">DESTINATION</div>
              <div style="font-size: 14px; font-weight: 600; color: #1f2937;">
                ${locations.find((loc) => loc.id === initialData.locationId)?.label || "Not specified"}
              </div>
            </div>
            
            ${initialData.numDaysNight ? `
              <div style="background: #f9fafb; padding: 12px; border-radius: 4px; border-left: 4px solid ${brandColors.primary};">
                <div style="font-size: 12px; color: #6b7280; font-weight: 600; margin-bottom: 4px;">DURATION</div>
                <div style="font-size: 14px; font-weight: 600; color: #1f2937;">${initialData.numDaysNight}</div>
              </div>
            ` : ''}
          </div>

          ${(initialData.tourStartsFrom || initialData.tourEndsOn) ? `
            <div style="background: ${brandColors.panelBg}; padding: 12px; border-radius: 4px; margin-bottom: 12px; border-left: 4px solid ${brandColors.primary};">
              <div style="font-size: 12px; color: #6b7280; font-weight: 600; margin-bottom: 8px;">TRAVEL DATES</div>
              <div style="display: flex; gap: 16px; align-items: center;">
                ${initialData.tourStartsFrom ? `
                  <div>
                    <div style="font-size: 10px; color: #6b7280; font-weight: 600;">FROM</div>
                    <div style="font-size: 12px; font-weight: 600; color: #1f2937;">${format(initialData.tourStartsFrom, "dd MMM, yyyy")}</div>
                  </div>
                ` : ''}
                ${(initialData.tourStartsFrom && initialData.tourEndsOn) ? `
                  <div style="font-size: 14px; color: #6b7280;">→</div>
                ` : ''}
                ${initialData.tourEndsOn ? `
                  <div>
                    <div style="font-size: 10px; color: #6b7280; font-weight: 600;">TO</div>
                    <div style="font-size: 12px; font-weight: 600; color: #1f2937;">${format(initialData.tourEndsOn, "dd MMM, yyyy")}</div>
                  </div>
                ` : ''}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    // 3. Pricing Section
    const pricingData = initialData.pricingSection;
    let dynamicPricingSection = "";

    if (pricingData) {
      const parsedPricing = parsePricingSection(pricingData);

      if (parsedPricing && parsedPricing.length > 0) {
        const pricingItems = parsedPricing.map((item, index) => `
          <div style="background: ${index % 2 === 0 ? '#f9fafb' : 'white'}; padding: 12px; border-radius: 4px; margin-bottom: 8px; border-left: 4px solid ${brandColors.primary}; border: 1px solid #e5e7eb;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="flex: 1;">
                <div style="font-size: 14px; font-weight: 600; color: #1f2937; margin-bottom: 2px;">
                  ${item.name || 'Pricing Component'}
                </div>
                ${item.description ? `
                  <div style="font-size: 12px; color: #6b7280; line-height: 1.4;">
                    ${item.description}
                  </div>
                ` : ''}
              </div>
              <div style="text-align: right; margin-left: 12px;">
                <div style="font-size: 14px; font-weight: 600; color: #374151;">
                  ${item.price || 'On Request'}
                </div>
              </div>
            </div>
          </div>
        `).join('');

        dynamicPricingSection = `
          <div style="${cardStyle}; page-break-inside: avoid; break-inside: avoid-page;">
            <div style="${headerStyleAlt}">
              <h3 style="${sectionTitleStyle}">Detailed Pricing Breakdown</h3>
            </div>
            <div style="${contentStyle}; page-break-inside: avoid; break-inside: avoid-page;">
              ${pricingItems}
              <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 4px; padding: 12px; margin-top: 12px; text-align: center;">
                <div style="font-size: 12px; color: #ea580c; font-weight: 600;">
                  * All prices are subject to availability & taxes includinng GST
                                </div>
              </div>
            </div>
          </div>
        `;
      }
    }

    // 4. Total Price
    const totalPriceSection = initialData.totalPrice && initialData.totalPrice.trim() !== "" ? `
      <div style="${priceCardStyle}; text-align: center;">
        <div style="margin-bottom: 8px;">
          <h3 style="font-size: 16px; font-weight: 600; color: #374151; margin: 0;">Total Package Cost</h3>
        </div>
        
        <div style="background: white; border-radius: 6px; padding: 20px 16px; margin: 8px 0; border: 1px solid #e5e7eb; position: relative;">
          <div style="position: absolute; top: 0; left: 0; right: 0; height: 3px; background: ${brandGradients.primary};"></div>
          <div style="font-size: 26px; font-weight: 700; color: ${brandColors.primary}; margin-bottom: 4px; letter-spacing: 0.5px;">
            ₹ ${formatINR(initialData.totalPrice)}
          </div>
          <div style="font-size: 12px; color: #6b7280; font-weight: 500; text-transform: uppercase; letter-spacing: 0.75px;">
            Complete Tour Package Cost
          </div>
          <div style="font-size: 11px; color: ${brandColors.muted}; font-weight: 500; margin-top: 6px; padding: 4px 8px; background: ${brandColors.lightOrange}; border-radius: 4px; display: inline-block;">
            including GST
          </div>
        </div>

        ${initialData.remarks && initialData.remarks.trim() !== "" ? `
          <div style="text-align: left; margin-top: 16px; padding-top: 16px; border-top: 1px solid ${brandColors.border};">
            <h4 style="font-size: 14px; font-weight: 600; color: ${brandColors.slateText}; margin: 0 0 8px 0; display:flex; align-items:center;">
              <span style="display:inline-block; margin-right:6px; color:${brandColors.primary};">ℹ</span> Remarks
            </h4>
            <div style="font-size: 13px; line-height: 1.5; color: ${brandColors.text}; background: white; padding: 12px; border-radius: 4px; border: 1px solid ${brandColors.border};">
               ${initialData.remarks}
            </div>
          </div>
        ` : ''}

        ${initialData.disclaimer && initialData.disclaimer.trim() !== "" ? `
          <div style="text-align: left; margin-top: 12px; padding-top: 12px; border-top: 1px solid ${brandColors.border};">
            <h4 style="font-size: 14px; font-weight: 600; color: ${brandColors.slateText}; margin: 0 0 8px 0; display:flex; align-items:center;">
              <span style="display:inline-block; margin-right:6px; color:${brandColors.primary};">ℹ</span> Disclaimer
            </h4>
            <div style="font-size: 13px; line-height: 1.5; color: ${brandColors.text}; background: white; padding: 12px; border-radius: 4px; border: 1px solid ${brandColors.border};">
               ${initialData.disclaimer}
            </div>
          </div>
        ` : ''}
      </div>
    ` : "";

    // 5. Standalone Remarks & Disclaimer Section (Render only if NOT visible in price section)
    const isPriceVisible = initialData.totalPrice && initialData.totalPrice.trim() !== "";
    const remarksSection =
      (!isPriceVisible && ((initialData.remarks && initialData.remarks.trim() !== "") || (initialData.disclaimer && initialData.disclaimer.trim() !== "")))
        ? `
      <div style="${cardStyle};">
        ${initialData.remarks && initialData.remarks.trim() !== "" ? `
          <div style="${headerStyleAlt};">
            <h3 style="${sectionTitleStyle};">
              Important Notes & Remarks
            </h3>
          </div>
          <div style="${contentStyle};">
            <div style="font-size: 14px; line-height: 1.5; color: ${brandColors.text}; background: ${brandColors.panelBg}; padding: 12px; border-radius: 4px; border-left: 4px solid ${brandColors.primary};">
              ${initialData.remarks}
            </div>
          </div>
        ` : ''}
        ${initialData.disclaimer && initialData.disclaimer.trim() !== "" ? `
          <div style="${headerStyleAlt}; border-top: 1px solid ${brandColors.border};">
            <h3 style="${sectionTitleStyle};">
              Disclaimer
            </h3>
          </div>
          <div style="${contentStyle};">
            <div style="font-size: 14px; line-height: 1.5; color: ${brandColors.text}; background: ${brandColors.panelBg}; padding: 12px; border-radius: 4px; border-left: 4px solid ${brandColors.primary};">
              ${initialData.disclaimer}
            </div>
          </div>
        ` : ''}
      </div>
    `
        : "";

    // 5. Itinerary Section
    let itinerariesSection = "";
    if (initialData.itineraries && initialData.itineraries.length > 0) {
      itinerariesSection += `
        <div style="${cardStyle}; ${pageBreakBefore}">
          <div style="border-bottom: 2px solid ${brandColors.primary}; padding: 14px 18px; page-break-inside: avoid; break-inside: avoid;">
            <h2 style="color: ${brandColors.primary}; font-size: 17px; font-weight: 800; margin: 0; display: flex; align-items: center; gap: 8px;">
              🗺️ Day-by-Day Itinerary
            </h2>
            <p style="color: ${brandColors.muted}; font-size: 11px; margin: 3px 0 0 0;">Your complete travel journey</p>
          </div>
        </div>
      `;

      itinerariesSection += initialData.itineraries.map((itinerary, dayIndex) => `
        <div style="${cardStyle}; margin-bottom: 20px; ${dayIndex > 0 ? pageBreakBefore : ''} page-break-inside: avoid; break-inside: avoid-page;">
          <div style="display: flex; align-items: center; padding: 12px 16px; border-bottom: 1px solid ${brandColors.border};">
            <div style="background: ${brandColors.primary}; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1; flex-shrink: 0;">
              <span style="font-size: 7px; font-weight: 700; text-transform: uppercase;">DAY</span>
              <span style="font-size: 14px; font-weight: 800; line-height: 1.1;">${itinerary.dayNumber}</span>
            </div>
            <div style="margin-left: 12px;">
              <h3 style="font-size: 18px; font-weight: 800; margin: 0; line-height: 1.25; color: ${brandColors.primary};">
                ${(itinerary.days && itinerary.days !== 'null' && itinerary.days !== 'undefined') ? itinerary.days : 'Tour Day'}
              </h3>
              <p style="font-size: 12px; margin: 4px 0 0 0; color: ${brandColors.muted}; font-weight: 400; line-height: 1.4;">
                ${itinerary.itineraryTitle?.replace(/^<p>/, "").replace(/<\/p>$/, "") || `Day ${itinerary.dayNumber} Activities`}
              </p>
            </div>
          </div>

          <div style="padding: 16px;">
            ${(itinerary.itineraryDescription && itinerary.itineraryDescription.trim()) ? `
              <div style="margin-bottom: 20px;">
                <h4 style="font-size: 15px; font-weight: 600; color: ${brandColors.text}; margin: 0 0 12px 0; display: flex; align-items: center; border-bottom: 2px solid ${brandColors.light}; padding-bottom: 8px;">
                  <span style="${iconStyle}">📋</span>
                  Day Overview
                </h4>
                <div style="font-size: 14px; line-height: 1.6; color: ${brandColors.muted};">
                  ${(itinerary.itineraryDescription || "")
            .replace(/<\/?p>/gi, "<br>")
            .replace(/(<br>\s*)+/gi, "<br>")
            .replace(/\s+/g, " ")
            .trim()
          }
                </div>
              </div>
            ` : ''}

            ${itinerary.activities && itinerary.activities.length > 0 ? `
              <div>
                <h4 style="font-size: 15px; font-weight: 600; color: ${brandColors.text}; margin: 0 0 12px 0; display: flex; align-items: center; border-bottom: 2px solid ${brandColors.light}; padding-bottom: 8px;">
                  <span style="${iconStyle}">🎯</span>
                  Planned Activities
                </h4>
                <div style="display: grid; gap: 12px;">
                  ${itinerary.activities.map((activity, actIdx) => `
                    <div style="background: ${brandColors.panelBg}; padding: 12px; border-radius: 4px; display: flex; align-items: flex-start;">
                      <div style="background: ${brandColors.secondary}; color: ${brandColors.white}; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; margin-right: 12px; flex-shrink: 0;">
                        ${actIdx + 1}
                      </div>
                      <div>
                        <h5 style="font-size: 14px; font-weight: 600; color: ${brandColors.text}; margin: 0;">
                          ${activity.activityTitle || `Activity ${actIdx + 1}`}
                        </h5>
                        ${activity.activityDescription ? `
                          <p style="font-size: 13px; color: ${brandColors.muted}; margin: 4px 0 0 0; line-height: 1.5;">
                            ${activity.activityDescription}
                          </p>
                        ` : ''}
                      </div>
                    </div>
                  `).join("")}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      `).join("");
    }

    // 6. Policies Section
    const loc = locations.find(l => l.id === initialData.locationId) as any;
    const withFallback = (primary: any, fallback: any) => {
      const primaryParsed = parsePolicyField(primary);
      if (primaryParsed.length > 0) return primaryParsed;
      return parsePolicyField(fallback);
    };

    const inclusionsArr = withFallback(initialData.inclusions, loc?.inclusions);
    const exclusionsArr = withFallback(initialData.exclusions, loc?.exclusions);
    const importantArr = withFallback(initialData.importantNotes, loc?.importantNotes);
    const paymentArr = withFallback(initialData.paymentPolicy, loc?.paymentPolicy);
    const kitchenArr = withFallback(initialData.kitchenGroupPolicy, loc?.kitchenGroupPolicy);
    const usefulTipsArr = withFallback((initialData as any).usefulTip, loc?.usefulTip);
    const termsArr = withFallback(initialData.termsconditions, loc?.termsconditions);
    const cancelArr = withFallback(initialData.cancellationPolicy, loc?.cancellationPolicy);
    const airlineCancelArr = withFallback(initialData.airlineCancellationPolicy, loc?.airlineCancellationPolicy);

    const policiesAndTermsSection = (inclusionsArr.length || exclusionsArr.length || importantArr.length || paymentArr.length || kitchenArr.length || termsArr.length || cancelArr.length || airlineCancelArr.length || usefulTipsArr.length) ? `
      <div style="${cardStyle}; ${pageBreakBefore}">
        <div style="border-bottom: 2px solid ${brandColors.primary}; padding: 14px 18px;">
          <h2 style="color: ${brandColors.primary}; font-size: 17px; font-weight: 800; margin: 0; display: flex; align-items: center; gap: 8px;">
            📋 Policies & Terms
          </h2>
          <p style="color: ${brandColors.muted}; font-size: 11px; margin: 3px 0 0 0;">Inclusions, exclusions and important travel policies</p>
        </div>
        
        <div style="padding: 20px;">
          ${(inclusionsArr.length || exclusionsArr.length) ? `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
              ${inclusionsArr.length ? `
                <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; overflow: hidden; page-break-inside: avoid;">
                  <div style="background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); padding: 12px;">
                    <h3 style="color: white; font-size: 16px; font-weight: 600; margin: 0;">✓ Inclusions</h3>
                  </div>
                  <div style="padding: 16px;">${renderBulletList(inclusionsArr)}</div>
                </div>
              ` : ''}
              
              ${exclusionsArr.length ? `
                <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; overflow: hidden; page-break-inside: avoid;">
                  <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 12px;">
                    <h3 style="color: white; font-size: 16px; font-weight: 600; margin: 0;">✗ Exclusions</h3>
                  </div>
                  <div style="padding: 16px;">${renderBulletList(exclusionsArr)}</div>
                </div>
              ` : ''}
            </div>
          ` : ''}
          
          ${(importantArr.length || paymentArr.length) ? `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
              ${importantArr.length ? `
                <div style="background: #fefdf8; border: 1px solid #fde68a; border-radius: 8px; overflow: hidden; page-break-inside: avoid;">
                  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 12px;">
                    <h3 style="color: white; font-size: 16px; font-weight: 600; margin: 0;">⚠ Important Notes</h3>
                  </div>
                  <div style="padding: 16px;">${renderBulletList(importantArr)}</div>
                </div>
              ` : ''}
              
              ${paymentArr.length ? `
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; overflow: hidden; page-break-inside: avoid;">
                  <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 12px;">
                    <h3 style="color: white; font-size: 16px; font-weight: 600; margin: 0;">💳 Payment Policy</h3>
                  </div>
                  <div style="padding: 16px;">${renderBulletList(paymentArr)}</div>
                </div>
              ` : ''}
            </div>
          ` : ''}

          ${termsArr.length ? `
            <div style="margin-bottom: 20px; page-break-inside: avoid;">
              <div style="background: #fafafa; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #374151 0%, #1f2937 100%); padding: 12px;">
                  <h3 style="color: white; font-size: 16px; font-weight: 600; margin: 0;">📋 Terms and Conditions</h3>
                </div>
                <div style="padding: 16px;">${renderBulletList(termsArr)}</div>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    ` : "";

    // Build comparison sections — hotel → price (variants section is removed; covered by hotel comparison)
    const hotelComparisonSection = buildHotelComparisonSection();
    const priceComparisonSection = buildPriceComparisonSection();

    // Assemble Full HTML — strict order: header → tour info → hotel comparison → price comparison → itinerary → policies
    const fullHtml = `
      <html>
        <head>
          <style>${pageStyle}\n${itineraryHeaderStyle}</style>
        </head>
        <body>
          <div style="${containerStyle}">
            ${headerSection}
            ${tourInfoSection}
            ${hotelComparisonSection}
            ${priceComparisonSection}
            ${itinerariesSection}
            ${policiesAndTermsSection}
          </div>
        </body>
      </html>
    `;
    return fullHtml;
  }, [initialData, currentCompany, locations, buildHotelComparisonSection, buildPriceComparisonSection, brandColors, brandGradients, cardStyle, containerStyle, contentStyle, headerStyleAlt, iconStyle, itineraryHeaderStyle, pageBreakBefore, pageStyle, parsePolicyField, priceCardStyle, sectionTitleStyle, formatINR, parsePricingSection, renderBulletList]);

  const generatePDF = useCallback(async () => {
    setLoading(true);
    const htmlContent = buildHtmlContent();

    const footerHtml = (() => {
      const c = currentCompany;
      const showBrand = selectedOption !== "Empty";
      const isAagam = selectedOption === "AH";

      const social = isAagam ? {
        facebook: c.social?.facebook,
        instagram: c.social?.instagram,
        twitter: c.social?.twitter,
      } : {
        facebook: undefined,
        instagram: undefined,
        twitter: undefined,
      };

      const websiteUrl = c.website || "https://aagamholidays.com";
      const websiteLabel = websiteUrl.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");

      if (!showBrand) {
        return `
          <div style="width:100%; font-family: Arial, sans-serif;">
            <div style="height:40px; padding:12px 20px; box-sizing:border-box; display:flex; align-items:center; justify-content:center; border-top:1px solid #e5e7eb; background:#f9fafb;">
              <span style="font-size:10px; color:#6b7280;">Page <span class="pageNumber"></span> / <span class="totalPages"></span></span>
            </div>
          </div>`;
      }

      return `
        <div style="width:100%; font-family: Arial, sans-serif;">
          <div style="padding: 12px 20px; box-sizing: border-box; background: linear-gradient(135deg, #fefaf6 0%, #fff5eb 100%); border-top: 2px solid #ea580c;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                ${c.logo ? `<img src="${c.logo}" style="height: 22px; width: auto; object-fit: contain;"/>` : ''}
                <div>
                  <div style="font-size: 14px; font-weight: 700; color: #dc2626; line-height: 1.1;">${c.name || 'Aagam Holidays'}</div>
                  <div style="font-size: 8px; color: #7c2d12; font-weight: 500; margin-top: 2px;">Your Trusted Travel Partner</div>
                </div>
              </div>
              <div style="background: #fff; padding: 3px 8px; border-radius: 10px; border: 1px solid #fed7aa; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                <span style="font-size: 9px; color: #7c2d12; font-weight: 600;">Page <span class="pageNumber"></span> / <span class="totalPages"></span></span>
              </div>
            </div>

            <div style="background: #ffffff; padding: 6px 12px; border-radius: 6px; border: 1px solid #fed7aa; margin-bottom: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
              <div style="display: flex; flex-wrap: wrap; gap: 15px; align-items: center; justify-content: center; text-align: center;">
                ${c.address ? `
                  <div style="font-size: 8px; color: #7c2d12; display: flex; align-items: center; gap: 3px;">
                    <span style="color: #ea580c; font-size: 10px;">📍</span>
                    <span style="font-weight: 500;">${c.address}</span>
                  </div>
                ` : ''}
                ${c.phone ? `
                  <div style="font-size: 8px; color: #7c2d12; display: flex; align-items: center; gap: 3px;">
                    <span style="color: #ea580c; font-size: 10px;">📞</span>
                    <span style="font-weight: 500;">${c.phone}</span>
                  </div>
                ` : ''}
                ${c.email ? `
                  <div style="font-size: 8px; color: #7c2d12; display: flex; align-items: center; gap: 3px;">
                    <span style="color: #ea580c; font-size: 10px;">✉️</span>
                    <span style="font-weight: 500;">${c.email}</span>
                  </div>
                ` : ''}
              </div>
            </div>

            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
              <div style="display: flex; align-items: center; gap: 5px; flex-wrap: wrap;">
                ${websiteUrl ? `
                  <a href="${websiteUrl}" target="_blank" style="font-size: 8px; text-decoration: none; display: flex; align-items: center; gap: 2px; padding: 2px 5px; background: #fff; border-radius: 4px; border: 1px solid #fed7aa;">
                    <span style="color: #ea580c; font-size: 9px;">🌐</span>
                    <span style="font-weight: 600; color: #7c2d12;">${websiteLabel}</span>
                  </a>
                ` : ''}
                ${social.facebook ? `
                  <a href="${social.facebook}" target="_blank" style="display: flex; align-items: center; gap: 3px; text-decoration: none; padding: 2px 5px; background: #fff; border-radius: 4px; border: 1px solid #fed7aa;">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    <span style="font-size: 8px; color: #3b5998; font-weight: 600;">Facebook</span>
                  </a>
                ` : ''}
                ${social.instagram ? `
                  <a href="${social.instagram}" target="_blank" style="display: flex; align-items: center; gap: 3px; text-decoration: none; padding: 2px 5px; background: #fff; border-radius: 4px; border: 1px solid #fed7aa;">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="url(#insta-gradient)"><defs><radialGradient id="insta-gradient" cx="0.3" cy="1" r="1"><stop offset="0" stop-color="#FFD600"/><stop offset="0.5" stop-color="#FF7A00"/><stop offset="1" stop-color="#D62976"/></radialGradient></defs><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919C8.416 2.175 8.796 2.163 12 2.163m0-2.163C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12s.014 3.667.072 4.947c.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072s3.667-.014 4.947-.072c4.358-.2 6.78-2.618 6.98-6.98.058-1.28.072-1.689.072-4.947s-.014-3.667-.072-4.947c-.2-4.358-2.618-6.78-6.98-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zm0 10.162a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.88 1.44 1.44 0 000-2.88z"/></svg>
                    <span style="font-size: 8px; color: #7c2d12; font-weight: 600;">Instagram</span>
                  </a>
                ` : ''}
              </div>
              <div style="text-align: right; flex-shrink: 0;">
                <div style="font-size: 7px; color: #7c2d12; font-style: italic; font-weight: 500;">Making your dream destinations come true...</div>
              </div>
            </div>
          </div>
        </div>`;
    })();

    try {
      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          htmlContent,
          footerHtml,
          margin: { top: "72px", bottom: "140px", left: "14px", right: "14px" },
          scale: 0.88,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const fileName = initialData?.tourPackageQueryName
          ? `${initialData.tourPackageQueryName.replace(/[^a-zA-Z0-9-_]/g, "_")}_With_Variants.pdf`
          : "Tour_Package_Query_With_Variants.pdf";

        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
      } else {
        alert("Failed to generate PDF");
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("An error occurred while generating the PDF.");
    } finally {
      setLoading(false);
    }
  }, [initialData, buildHtmlContent, currentCompany, selectedOption]);

  useEffect(() => {
    if (!initialData) return;
    generatePDF();
  }, [initialData, generatePDF]);

  if (!initialData) return <div>No data available</div>;

  return (
    <div style={{ padding: "40px", textAlign: "center", fontFamily: "sans-serif", color: "#333" }}>
      <div style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "16px" }}>
        {loading ? "Generating Complete PDF with Variants..." : "Preparing Your Complete Tour Package PDF"}
      </div>
      <div style={{ fontSize: "16px", color: "#666", marginBottom: "24px" }}>
        {loading ? "Please wait while we generate your comprehensive PDF document with all details and variant options." : "Your PDF will download automatically."}
      </div>

      {loading && (
        <div style={{ marginTop: "24px" }}>
          <svg width="48" height="48" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ margin: "auto" }}>
            <circle cx="12" cy="12" r="10" stroke="#ea580c" strokeWidth="2" fill="none" strokeDasharray="15 60" transform="rotate(0 12 12)">
              <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
            </circle>
          </svg>
        </div>
      )}

      {!loading && (
        <div style={{ marginTop: "24px" }}>
          <button
            onClick={generatePDF}
            style={{
              padding: "12px 24px",
              backgroundColor: "#ea580c",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer",
              marginRight: "12px",
            }}
          >
            Download PDF Again
          </button>
          <button
            onClick={() => router.push(`/tourPackages/${initialData.id}`)}
            style={{
              padding: "12px 24px",
              backgroundColor: "#6b7280",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Back to Tour Package
          </button>
        </div>
      )}
    </div>
  );
};

export default TourPackageQueryPDFGeneratorWithVariants;
