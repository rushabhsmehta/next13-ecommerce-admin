"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  FlightDetails,
  Hotel,
  Images,
  Itinerary,
  Location,
  TourDestination,
  TourPackage,
} from "@prisma/client";
import { escapeAttr } from "@/lib/html-escape";
import { renderActivityImages, resolvePdfImageUrl } from "@/lib/itinerary-image-html";
import {
  brandColors,
  brandGradients,
  companyInfo,
  parsePolicyField,
  renderBulletList,
  sanitizeText,
} from "@/lib/pdf";
import { formatItineraryDayHeader } from "@/lib/utils";

type FormattedPackageTitle = {
  primary: string;
  secondary: string;
  duration: string;
  meta: string[];
};

type PricingRow = {
  name?: string;
  price?: string;
  description?: string;
};

type ItineraryForPdf = Itinerary & {
  itineraryImages: Images[];
  transportDetails?: any[];
  activities: (Activity & {
    activityImages: Images[];
  })[];
};

type HotelForPdf = Hotel & {
  images: Images[];
  location?: Location | null;
  destination?: TourDestination | null;
};

interface TourPackagePDFGeneratorProps {
  initialData: (TourPackage & {
    images: Images[];
    itineraries: ItineraryForPdf[];
    flightDetails: (FlightDetails & {
      images?: Images[];
    })[];
  }) | null;
  locations: Location[];
  hotels: HotelForPdf[];
  printMode?: boolean;
  initialSearchOption?: string;
}

const containerStyle = `
  max-width: 820px;
  margin: 0 auto;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  color: ${brandColors.text};
  font-size: 14px;
  line-height: 1.5;
`;

const cardStyle = `
  background: ${brandColors.white};
  border: 1px solid ${brandColors.border};
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  margin-bottom: 20px;
`;

const headerStyleAlt = `
  background: ${brandColors.tableHeaderBg};
  border-bottom: 1px solid ${brandColors.border};
  padding: 14px 18px;
`;

const contentStyle = "padding: 18px;";

const sectionTitleStyle = `
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: ${brandColors.text};
  letter-spacing: 0.2px;
`;

const tableStyle = `
  width: 100%;
  border-collapse: collapse;
  margin: 4px 0;
  background: ${brandColors.white};
  border: 1px solid ${brandColors.border};
  border-radius: 8px;
  overflow: hidden;
`;

const tableHeaderStyle = `
  background: ${brandColors.tableHeaderBg};
  color: ${brandColors.slateText};
  padding: 11px 14px;
  text-align: left;
  font-weight: 700;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  border-bottom: 1px solid ${brandColors.border};
`;

const tableCellStyle = `
  padding: 12px 14px;
  border-bottom: 1px solid ${brandColors.softDivider};
  color: ${brandColors.text};
  font-size: 13px;
  vertical-align: top;
`;

const pageBreakBefore = `
  page-break-before: always;
  break-before: page;
`;

const avoidBreak = `
  page-break-inside: avoid;
  break-inside: avoid-page;
`;

const pageStyle = `
  @media print {
    @page {
      size: A4;
      margin: 72px 14px 140px 14px;
    }
  }
`;

function safe(value: any, fallback = ""): string {
  return sanitizeText(value, fallback);
}

function attr(value: any, fallback = ""): string {
  return escapeAttr(safe(value, fallback));
}

function imageUrl(value: any): string {
  return escapeAttr(resolvePdfImageUrl(safe(value)));
}

function cleanHtml(value: any): string {
  return safe(value)
    .replace(/<\/?(html|body)>/gi, "")
    .replace(/<!--StartFragment-->/gi, "")
    .replace(/<!--EndFragment-->/gi, "")
    .trim();
}

function parsePricingSection(pricingData: any): PricingRow[] {
  if (!pricingData) return [];

  try {
    if (Array.isArray(pricingData)) return pricingData;

    if (typeof pricingData === "string") {
      const parsed = JSON.parse(pricingData);
      return Array.isArray(parsed) ? parsed : [];
    }

    if (typeof pricingData === "object") {
      return Object.values(pricingData).filter(
        (item: any) => item && typeof item === "object" && (item.name || item.price),
      ) as PricingRow[];
    }
  } catch (error) {
    console.error("Error parsing pricing section:", error);
  }

  return [];
}

function buildPricingRows(data: TourPackage): PricingRow[] {
  const parsedRows = parsePricingSection(data.pricingSection);
  if (parsedRows.length > 0) return parsedRows;

  return [
    { name: "Package Price", price: data.price || undefined },
    { name: "Price per Adult", price: data.pricePerAdult || undefined },
    { name: "Triple Occupancy / Extra Bed", price: data.pricePerChildOrExtraBed || undefined },
    { name: "Child 5-12 Years (No Bed)", price: data.pricePerChild5to12YearsNoBed || undefined },
    { name: "Child Below 5 Years With Seat", price: data.pricePerChildwithSeatBelow5Years || undefined },
  ].filter((row) => safe(row.price));
}

function formatMoney(value: any): string {
  const text = safe(value, "On Request");
  const numeric = Number.parseFloat(text.replace(/[^\d.-]/g, ""));
  if (Number.isNaN(numeric)) return text;
  return `INR ${numeric.toLocaleString("en-IN")}`;
}

/** Split pipe-heavy package names into a cleaner title hierarchy for PDF covers. */
function formatPackageTitle(name: string): FormattedPackageTitle {
  const parts = safe(name, "Tour Package")
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    return { primary: parts[0] || "Tour Package", secondary: "", duration: "", meta: [] };
  }

  const durationIdx = parts.findIndex((part) => /night|day/i.test(part));
  const duration = durationIdx >= 0 ? parts[durationIdx] : "";
  const rest = parts.filter((_, index) => index !== durationIdx);
  const primary = rest[0] || parts[0];
  const secondary = rest[1] || "";
  const meta = rest.slice(2);

  return { primary, secondary, duration, meta };
}

function activityDisplayTitle(activity: { activityTitle?: string | null; activityDescription?: string | null }, index: number): string {
  const titled = cleanHtml(activity.activityTitle);
  if (titled && !/^activity\s*\d+$/i.test(titled)) return titled;

  const fromDescription = cleanHtml(activity.activityDescription)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (fromDescription) {
    // Split roman / numbered list items: "i. Foo ii. Bar" → "Foo"
    const items = fromDescription
      .split(/(?:^|\s+)(?:[ivxlcdm]+|[0-9]+)[.)]\s+/i)
      .map((part) => part.trim())
      .filter((part) => part && !/^(i|ii|iii|iv|v|vi|vii|viii|ix|x|\d+)$/i.test(part));

    const candidate = (items[0] || fromDescription).replace(/[.;,\s]+$/g, "").trim();
    if (candidate) {
      return candidate.length > 72 ? `${candidate.slice(0, 69)}…` : candidate;
    }
  }

  return `Highlight ${index + 1}`;
}

function resolveCompany(selectedOption: string) {
  const fallback = companyInfo.AH;
  const selected = companyInfo[selectedOption] ?? companyInfo.Empty;

  return {
    ...fallback,
    ...selected,
    social: {
      ...(fallback.social ?? {}),
      ...(selected.social ?? {}),
    },
  };
}

const TourPackagePDFGenerator: React.FC<TourPackagePDFGeneratorProps> = ({
  initialData,
  locations,
  hotels,
  printMode: printModeProp,
  initialSearchOption,
}) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedParam = initialSearchOption ?? searchParams?.get("search");
  const selectedOption = selectedParam && selectedParam.length ? selectedParam : "AH";
  const printMode = printModeProp ?? searchParams?.get("print") === "1";
  const [loading, setLoading] = useState(false);

  const currentCompany = useMemo(() => resolveCompany(selectedOption), [selectedOption]);

  const buildFooterHtml = useCallback((): string => {
    const showBrand = Boolean(currentCompany.name && selectedOption !== "Empty");
    const websiteUrl = safe(currentCompany.website, "https://aagamholidays.com");
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
              ${currentCompany.logo ? `<img src="${attr(currentCompany.logo)}" style="height: 22px; width: auto; object-fit: contain;"/>` : ""}
              <div>
                <div style="font-size: 14px; font-weight: 700; color: #dc2626; line-height: 1.1;">${safe(currentCompany.name, "Aagam Holidays")}</div>
                <div style="font-size: 8px; color: #7c2d12; font-weight: 500; margin-top: 2px;">Your Trusted Travel Partner</div>
              </div>
            </div>
            <div style="background: #fff; padding: 3px 8px; border-radius: 10px; border: 1px solid #fed7aa; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
              <span style="font-size: 9px; color: #7c2d12; font-weight: 600;">Page <span class="pageNumber"></span> / <span class="totalPages"></span></span>
            </div>
          </div>

          <div style="background: #ffffff; padding: 6px 12px; border-radius: 6px; border: 1px solid #fed7aa; margin-bottom: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="display: flex; flex-wrap: wrap; gap: 15px; align-items: center; justify-content: center; text-align: center;">
              ${currentCompany.address ? `<div style="font-size: 8px; color: #7c2d12;"><span style="font-weight: 500;">${safe(currentCompany.address)}</span></div>` : ""}
              ${currentCompany.phone ? `<div style="font-size: 8px; color: #7c2d12;"><span style="font-weight: 500;">Phone: ${safe(currentCompany.phone)}</span></div>` : ""}
              ${currentCompany.email ? `<div style="font-size: 8px; color: #7c2d12;"><span style="font-weight: 500;">Email: ${safe(currentCompany.email)}</span></div>` : ""}
            </div>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 5px; flex-wrap: wrap;">
              ${websiteUrl ? `<a href="${attr(websiteUrl)}" target="_blank" style="font-size: 8px; text-decoration: none; padding: 2px 5px; background: #fff; border-radius: 4px; border: 1px solid #fed7aa;"><span style="font-weight: 600; color: #7c2d12;">${safe(websiteLabel)}</span></a>` : ""}
              ${currentCompany.social?.facebook ? `<a href="${attr(currentCompany.social.facebook)}" target="_blank" style="font-size: 8px; color: #3b5998; text-decoration: none; padding: 2px 5px; background: #fff; border-radius: 4px; border: 1px solid #fed7aa;">Facebook</a>` : ""}
              ${currentCompany.social?.instagram ? `<a href="${attr(currentCompany.social.instagram)}" target="_blank" style="font-size: 8px; color: #7c2d12; text-decoration: none; padding: 2px 5px; background: #fff; border-radius: 4px; border: 1px solid #fed7aa;">Instagram</a>` : ""}
            </div>
            <div style="font-size: 7px; color: #7c2d12; font-style: italic; font-weight: 500;">Crafting journeys with care and expertise.</div>
          </div>
        </div>
      </div>`;
  }, [currentCompany, selectedOption]);

  const buildHtmlContent = useCallback((): string => {
    if (!initialData) return "";

    const location = locations.find((item) => item.id === initialData.locationId) as any;
    const heroImage = imageUrl(initialData.images?.[0]?.url);
    const sortedItineraries = [...(initialData.itineraries ?? [])].sort(
      (a, b) => (a.dayNumber ?? 0) - (b.dayNumber ?? 0),
    );
    const pricingRows = buildPricingRows(initialData);
    const showCommercials = selectedOption !== "Empty" && selectedOption !== "SupplierA" && selectedOption !== "SupplierB";
    const packageTitle = formatPackageTitle(safe(initialData.tourPackageName, "Tour Package"));
    const daysWithStayOrTransport = sortedItineraries.filter((itinerary) => {
      const hotel = hotels.find((item) => item.id === itinerary.hotelId);
      const transportDetails = itinerary.transportDetails ?? [];
      return Boolean(hotel) || transportDetails.length > 0;
    });

    const headerSection = `
      <div style="${cardStyle}; margin-bottom: 16px; text-align: center; position: relative;">
        ${heroImage ? `
          <div style="width: 100%; height: 260px; overflow: hidden; border-top-left-radius: 10px; border-top-right-radius: 10px; position: relative;">
            <img src="${heroImage}" alt="Tour Image" style="width: 100%; height: 100%; object-fit: cover; object-position: center;" />
            <div style="position:absolute; inset:0; background: linear-gradient(180deg, rgba(15,23,42,0.18) 0%, rgba(15,23,42,0.05) 42%, rgba(15,23,42,0.45) 100%);"></div>
            ${currentCompany.logo ? `<div style="position:absolute; top:14px; left:14px; background:rgba(255,255,255,0.92); padding:7px 12px; border-radius:8px; display:flex; align-items:center; box-shadow:0 2px 8px rgba(0,0,0,0.12);"><img src="${attr(currentCompany.logo)}" alt="${attr(currentCompany.name)} Logo" style="height:32px; width:auto; object-fit:contain;"/></div>` : ""}
          </div>
        ` : currentCompany.logo ? `
          <div style="padding-top:28px; display:flex; justify-content:center;"><img src="${attr(currentCompany.logo)}" alt="${attr(currentCompany.name)} Logo" style="height:56px; width:auto; object-fit:contain;"/></div>
        ` : ""}
        <div style="padding: 22px 28px 26px;">
          <span style="display:inline-block; background: ${brandColors.light}; color: ${brandColors.primary}; padding: 5px 14px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px;">
            ${safe(initialData.tourPackageType, "Tour")} Package
          </span>
          <h1 style="font-size: 28px; margin: 12px 0 0 0; font-weight: 800; line-height: 1.2; color:${brandColors.primary}; letter-spacing:0.3px;">
            ${packageTitle.primary}
          </h1>
          ${packageTitle.secondary ? `<div style="margin-top:8px; font-size:15px; font-weight:600; color:${brandColors.slateText}; letter-spacing:0.4px;">${packageTitle.secondary}</div>` : ""}
          ${(packageTitle.duration || packageTitle.meta.length) ? `
            <div style="margin-top:12px; display:flex; flex-wrap:wrap; gap:8px; justify-content:center;">
              ${packageTitle.duration ? `<span style="background:${brandColors.lightOrange}; color:${brandColors.secondary}; border:1px solid #fed7aa; padding:4px 10px; border-radius:9999px; font-size:11px; font-weight:700;">${packageTitle.duration}</span>` : ""}
              ${packageTitle.meta.map((item) => `<span style="background:${brandColors.panelBg}; color:${brandColors.muted}; border:1px solid ${brandColors.border}; padding:4px 10px; border-radius:9999px; font-size:11px; font-weight:600;">${item}</span>`).join("")}
            </div>
          ` : ""}
          ${currentCompany.name ? `<div style="margin-top:14px; font-size:11px; font-weight:600; color:${brandColors.muted}; letter-spacing:1.1px; text-transform:uppercase;">Prepared by ${safe(currentCompany.name)}</div>` : ""}
        </div>
      </div>
    `;

    const tourInfoSection = `
      <div style="${cardStyle}">
        <div style="${headerStyleAlt}">
          <h2 style="${sectionTitleStyle}">Tour Overview</h2>
        </div>
        <div style="${contentStyle}">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
            <div style="background: ${brandColors.panelBg}; padding: 14px; border-radius: 8px; border-left: 3px solid ${brandColors.primary};">
              <div style="font-size: 10px; color: ${brandColors.muted}; font-weight: 700; margin-bottom: 4px; letter-spacing:0.5px;">DESTINATION</div>
              <div style="font-size: 14px; font-weight: 700; color: ${brandColors.text};">${safe(location?.label, "Not specified")}</div>
            </div>
            ${initialData.numDaysNight ? `
              <div style="background: ${brandColors.panelBg}; padding: 14px; border-radius: 8px; border-left: 3px solid ${brandColors.primary};">
                <div style="font-size: 10px; color: ${brandColors.muted}; font-weight: 700; margin-bottom: 4px; letter-spacing:0.5px;">DURATION</div>
                <div style="font-size: 14px; font-weight: 700; color: ${brandColors.text};">${safe(initialData.numDaysNight)}</div>
              </div>
            ` : ""}
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px;">
            ${initialData.tourCategory ? `<div style="background: ${brandColors.subtlePanel}; padding: 12px; border-radius: 8px; border: 1px solid ${brandColors.border};"><div style="font-size: 10px; color: ${brandColors.muted}; font-weight: 700; margin-bottom: 3px; letter-spacing:0.4px;">CATEGORY</div><div style="font-size: 12px; color: ${brandColors.text}; font-weight: 600;">${safe(initialData.tourCategory)}</div></div>` : ""}
            ${initialData.transport ? `<div style="background: ${brandColors.subtlePanel}; padding: 12px; border-radius: 8px; border: 1px solid ${brandColors.border};"><div style="font-size: 10px; color: ${brandColors.muted}; font-weight: 700; margin-bottom: 3px; letter-spacing:0.4px;">TRANSPORT</div><div style="font-size: 12px; color: ${brandColors.text}; font-weight: 600;">${safe(initialData.transport)}</div></div>` : ""}
            ${initialData.pickup_location ? `<div style="background: ${brandColors.subtlePanel}; padding: 12px; border-radius: 8px; border: 1px solid ${brandColors.border};"><div style="font-size: 10px; color: ${brandColors.muted}; font-weight: 700; margin-bottom: 3px; letter-spacing:0.4px;">PICKUP</div><div style="font-size: 12px; color: ${brandColors.text}; font-weight: 600;">${safe(initialData.pickup_location)}</div></div>` : ""}
            ${initialData.drop_location ? `<div style="background: ${brandColors.subtlePanel}; padding: 12px; border-radius: 8px; border: 1px solid ${brandColors.border};"><div style="font-size: 10px; color: ${brandColors.muted}; font-weight: 700; margin-bottom: 3px; letter-spacing:0.4px;">DROP</div><div style="font-size: 12px; color: ${brandColors.text}; font-weight: 600;">${safe(initialData.drop_location)}</div></div>` : ""}
          </div>
        </div>
      </div>
    `;

    const flightSection = selectedOption !== "SupplierA" && selectedOption !== "SupplierB" && initialData.flightDetails?.length
      ? `
        <div style="${cardStyle}">
          <div style="${headerStyleAlt}">
            <h2 style="${sectionTitleStyle}">Flight Details</h2>
          </div>
          <div style="${contentStyle}">
            ${initialData.flightDetails.map((flight, index) => {
              const flightImages = (flight.images ?? []).map((image) => imageUrl(image.url)).filter(Boolean).slice(0, 3);

              return `
                <div style="background: #f9fafb; border: 1px solid ${brandColors.border}; border-radius: 4px; padding: 12px; margin-bottom: 10px; ${avoidBreak}">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                    <div>
                      <span style="font-size: 14px; font-weight: 600; color: ${brandColors.slateText};">Flight ${index + 1}</span>
                      ${flight.flightName ? `<div style="font-size: 12px; color: #6b7280; margin-top: 3px;">${safe(flight.flightName)}${flight.flightNumber ? ` (${safe(flight.flightNumber)})` : ""}</div>` : ""}
                    </div>
                    ${flight.date ? `<span style="background: ${brandColors.light}; color: ${brandColors.primary}; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">${safe(flight.date)}</span>` : ""}
                  </div>
                  <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 16px; align-items: center;">
                    <div>
                      ${flight.from ? `<div><span style="font-size: 12px; font-weight: 600; color: #6b7280;">From:</span><span style="margin-left: 8px; font-size: 12px; color: #1f2937; font-weight: 500;">${safe(flight.from)}</span></div>` : ""}
                      ${flight.departureTime ? `<div style="font-size: 10px; color: #6b7280; margin-top: 4px;">Departure: ${safe(flight.departureTime)}</div>` : ""}
                    </div>
                    <div style="color: ${brandColors.primary}; font-weight: 700;">-&gt;</div>
                    <div>
                      ${flight.to ? `<div><span style="font-size: 12px; font-weight: 600; color: #6b7280;">To:</span><span style="margin-left: 8px; font-size: 12px; color: #1f2937; font-weight: 500;">${safe(flight.to)}</span></div>` : ""}
                      ${flight.arrivalTime ? `<div style="font-size: 10px; color: #6b7280; margin-top: 4px;">Arrival: ${safe(flight.arrivalTime)}</div>` : ""}
                    </div>
                  </div>
                  ${flight.flightDuration ? `<div style="text-align: center; margin-top: 8px; font-size: 11px; color: #1f2937;"><strong>Duration:</strong> ${safe(flight.flightDuration)}</div>` : ""}
                  ${flightImages.length ? `
                    <div style="display: grid; grid-template-columns: repeat(${flightImages.length}, 1fr); gap: 6px; margin-top: 10px;">
                      ${flightImages.map((url) => `<div style="height: 86px; overflow: hidden; border-radius: 4px; background: #f3f4f6;"><img src="${url}" alt="Flight image" style="width: 100%; height: 100%; object-fit: cover;" /></div>`).join("")}
                    </div>
                  ` : ""}
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `
      : "";

    const pricingSection = showCommercials && pricingRows.length > 0
      ? `
        <div style="${cardStyle}; ${avoidBreak}">
          <div style="${headerStyleAlt}">
            <h3 style="${sectionTitleStyle}">Pricing</h3>
          </div>
          <div style="${contentStyle}">
            <table style="${tableStyle}">
              <thead>
                <tr>
                  <th style="${tableHeaderStyle}">Component</th>
                  <th style="${tableHeaderStyle}; text-align:right; width:140px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${pricingRows.map((item, index) => `
                  <tr style="background: ${index % 2 === 0 ? brandColors.subtlePanel : brandColors.white};">
                    <td style="${tableCellStyle}">
                      <div style="font-weight: 700; color: ${brandColors.text};">${safe(item.name, "Pricing Component")}</div>
                      ${item.description ? `<div style="font-size: 12px; color: ${brandColors.muted}; margin-top: 3px; line-height: 1.4;">${safe(item.description)}</div>` : ""}
                    </td>
                    <td style="${tableCellStyle}; text-align:right; font-weight:700; white-space:nowrap; color:${brandColors.slateText};">${formatMoney(item.price)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
            <div style="background: ${brandColors.lightOrange}; border: 1px solid #fed7aa; border-radius: 8px; padding: 11px 14px; margin-top: 14px; text-align: center;">
              <div style="font-size: 12px; color: ${brandColors.secondary}; font-weight: 600;">* Prices are subject to availability and applicable taxes including GST.</div>
            </div>
          </div>
        </div>
      `
      : "";

    const hotelSummarySection = selectedOption !== "SupplierA" && sortedItineraries.length > 0
      ? daysWithStayOrTransport.length > 0
        ? `
        <div style="${cardStyle}; ${pageBreakBefore}">
          <div style="${headerStyleAlt}">
            <h2 style="${sectionTitleStyle}">Hotel & Transport Details</h2>
          </div>
          <div style="${contentStyle}">
            ${daysWithStayOrTransport.map((itinerary, index) => {
              const hotel = hotels.find((item) => item.id === itinerary.hotelId);
              const hotelImage = imageUrl(hotel?.images?.[0]?.url);
              const hotelLocation = safe(hotel?.destination?.name || hotel?.location?.label || location?.label);
              const transportDetails = itinerary.transportDetails ?? [];

              return `
                <div style="padding: 14px 0; ${index < daysWithStayOrTransport.length - 1 ? `border-bottom: 1px solid ${brandColors.border};` : ""} ${avoidBreak}">
                  <div style="display:flex; align-items:flex-start; gap:12px; margin-bottom: 10px;">
                    <div style="width:30px; height:30px; background: ${brandColors.primary}; color: ${brandColors.white}; border-radius:8px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:13px; flex-shrink: 0;">
                      ${safe(itinerary.dayNumber ?? index + 1)}
                    </div>
                    <div>
                      <h3 style="margin:0; font-size:15px; font-weight:700; line-height:1.25; color:${brandColors.slateText};">${formatItineraryDayHeader(itinerary)}</h3>
                    </div>
                  </div>

                  ${hotel ? `
                    <div style="margin-left: 42px; margin-top: 10px; display: grid; grid-template-columns: 96px 1fr; gap: 14px; align-items: center;">
                      <div style="width: 96px; height: 72px; border-radius: 8px; overflow: hidden; background: #f3f4f6;">
                        ${hotelImage ? `<img src="${hotelImage}" alt="${attr(hotel.name, "Hotel")}" style="width: 100%; height: 100%; object-fit: cover;" />` : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 11px;">No Image</div>`}
                      </div>
                      <div>
                        <a href="${attr(hotel.link || "#")}" target="_blank" rel="noopener noreferrer" style="font-size:14px; font-weight:700; color:${brandColors.text}; text-decoration:none;">${safe(hotel.name, "Hotel")}</a>
                        ${hotelLocation ? `<div style="font-size:12px; color:${brandColors.muted}; margin-top:2px; font-weight:500;">${hotelLocation}</div>` : ""}
                      </div>
                    </div>

                    <div style="margin-left: 42px; margin-top: 12px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                      ${itinerary.roomCategory ? `<div style="background: ${brandColors.panelBg}; padding: 10px; border-radius: 8px;"><div style="font-size:10px; color:${brandColors.muted}; font-weight:700;">ROOM</div><div style="font-size:12px; color:${brandColors.text}; font-weight:600; margin-top:3px;">${safe(itinerary.roomCategory)}</div></div>` : ""}
                      ${itinerary.numberofRooms ? `<div style="background: ${brandColors.panelBg}; padding: 10px; border-radius: 8px;"><div style="font-size:10px; color:${brandColors.muted}; font-weight:700;">ROOMS</div><div style="font-size:12px; color:${brandColors.text}; font-weight:600; margin-top:3px;">${safe(itinerary.numberofRooms)}</div></div>` : ""}
                      ${itinerary.mealsIncluded ? `<div style="background: ${brandColors.panelBg}; padding: 10px; border-radius: 8px;"><div style="font-size:10px; color:${brandColors.muted}; font-weight:700;">MEAL PLAN</div><div style="font-size:12px; color:${brandColors.text}; font-weight:600; margin-top:3px;">${safe(itinerary.mealsIncluded)}</div></div>` : ""}
                    </div>
                  ` : ""}

                  ${transportDetails.length > 0 ? `
                    <div style="margin-left: 42px; margin-top: 12px;">
                      <div style="font-size:12px; font-weight:700; color:${brandColors.slateText}; margin-bottom:8px;">Transport</div>
                      ${transportDetails.map((transport: any) => `
                        <div style="display:flex; align-items:center; justify-content:space-between; background:${brandColors.lightOrange}; padding:10px 12px; border-radius:8px; margin-bottom:8px; border-left: 3px solid ${brandColors.secondary};">
                          <div>
                            <div style="font-weight:700; color:${brandColors.secondary};">${safe(transport?.vehicleType?.name, "Vehicle")}</div>
                            ${transport.capacity ? `<div style="font-size:12px; color:${brandColors.muted}; margin-top:2px;">Capacity: ${safe(transport.capacity)}</div>` : ""}
                            ${transport.description ? `<div style="font-size:12px; color:${brandColors.muted}; margin-top:2px;">${safe(transport.description)}</div>` : ""}
                          </div>
                          <span style="background: ${brandColors.accent}; color: ${brandColors.white}; padding: 2px 8px; border-radius: 99px; font-weight: 700; font-size: 11px;">Qty: ${safe(transport.quantity, "1")}</span>
                        </div>
                      `).join("")}
                    </div>
                  ` : ""}
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `
        : `
        <div style="${cardStyle}">
          <div style="${headerStyleAlt}">
            <h2 style="${sectionTitleStyle}">Accommodation</h2>
          </div>
          <div style="${contentStyle}">
            <div style="background: ${brandColors.panelBg}; border: 1px solid ${brandColors.border}; border-radius: 8px; padding: 14px 16px;">
              <div style="font-size: 13px; color: ${brandColors.slateText}; font-weight: 600;">Hotel stays will be confirmed at the time of booking.</div>
              <div style="font-size: 12px; color: ${brandColors.muted}; margin-top: 4px;">Equivalent category properties will be arranged as per package inclusions.</div>
            </div>
          </div>
        </div>
      `
      : "";

    const itinerariesSection = sortedItineraries.length
      ? `
        <div style="${cardStyle}; ${pageBreakBefore}">
          <div style="${headerStyleAlt}; text-align: center;">
            <h2 style="${sectionTitleStyle}">Travel Itinerary</h2>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: ${brandColors.muted};">Day-by-day plan</p>
          </div>
        </div>
        ${sortedItineraries.map((itinerary, dayIndex) => `
          <div style="${cardStyle}; margin-bottom: 18px; ${dayIndex > 0 ? pageBreakBefore : ""}">
            <div style="display: flex; align-items: center; background: ${brandColors.subtlePanel}; padding: 16px 18px; border-bottom: 1px solid ${brandColors.border}; ${avoidBreak}">
              <div style="background: ${brandColors.primary}; color: white; width: 42px; height: 42px; border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1; flex-shrink: 0;">
                <span style="font-size: 9px; font-weight: 600; letter-spacing:0.4px;">DAY</span>
                <span style="font-size: 16px; font-weight: 800;">${safe(itinerary.dayNumber ?? dayIndex + 1)}</span>
              </div>
              <div style="margin-left: 14px;">
                <h3 style="font-size: 17px; font-weight: 800; margin: 0; line-height:1.25; color: ${brandColors.text}; letter-spacing:0.2px;">
                  ${formatItineraryDayHeader(itinerary)}
                </h3>
                <div style="height:3px; width:72px; max-width:72px; display:inline-block; background: ${brandGradients.secondary}; border-radius:4px; margin-top:8px;"></div>
              </div>
            </div>

            <div style="padding: 16px 18px;">
              ${safe(itinerary.itineraryDescription) ? `
                <div style="margin-bottom: 18px;">
                  <h4 style="font-size: 13px; font-weight: 700; color: ${brandColors.slateText}; margin: 0 0 10px 0; text-transform:uppercase; letter-spacing:0.4px;">Day Overview</h4>
                  <div style="font-size: 13px; line-height: 1.65; color: ${brandColors.muted};">${cleanHtml(itinerary.itineraryDescription)}</div>
                </div>
              ` : ""}

              ${itinerary.activities?.length ? `
                <div>
                  <h4 style="font-size: 13px; font-weight: 700; color: ${brandColors.slateText}; margin: 0 0 10px 0; text-transform:uppercase; letter-spacing:0.4px;">Planned Activities</h4>
                  <div style="display: grid; gap: 10px;">
                    ${itinerary.activities.map((activity, activityIndex) => `
                      <div style="background: ${brandColors.panelBg}; padding: 12px 14px; border-radius: 8px; border: 1px solid ${brandColors.softDivider}; ${avoidBreak}">
                        <div style="display: flex; align-items: flex-start; gap: 12px;">
                          <div style="background: ${brandColors.secondary}; color: ${brandColors.white}; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; margin-top: 2px;">${activityIndex + 1}</div>
                          <div style="flex: 1;">
                            <h5 style="font-size: 14px; font-weight: 700; color: ${brandColors.text}; margin: 0 0 4px 0;">${activityDisplayTitle(activity, activityIndex)}</h5>
                            ${renderActivityImages(activity.activityImages, activity.activityTitle)}
                            ${activity.activityDescription ? `<div style="font-size: 13px; color: ${brandColors.muted}; margin: 4px 0 0 0; line-height: 1.55;">${cleanHtml(activity.activityDescription)}</div>` : ""}
                          </div>
                        </div>
                      </div>
                    `).join("")}
                  </div>
                </div>
              ` : ""}
            </div>
          </div>
        `).join("")}
      `
      : "";

    const withFallback = (primary: any, fallback: any) => {
      const primaryParsed = parsePolicyField(primary);
      return primaryParsed.length > 0 ? primaryParsed : parsePolicyField(fallback);
    };

    const policyRows = [
      { title: "Inclusions", items: withFallback(initialData.inclusions, location?.inclusions), tone: [brandColors.lightOrange, "#fed7aa", brandGradients.secondary] },
      { title: "Exclusions", items: withFallback(initialData.exclusions, location?.exclusions), tone: [brandColors.light, "#fecaca", brandGradients.primary] },
      { title: "Kitchen Group Policy", items: withFallback(initialData.kitchenGroupPolicy, location?.kitchenGroupPolicy), tone: [brandColors.subtlePanel, brandColors.border, `linear-gradient(135deg, ${brandColors.slateText} 0%, ${brandColors.text} 100%)`] },
      { title: "Useful Tips", items: withFallback(initialData.usefulTip, location?.usefulTip), tone: [brandColors.panelBg, "#fed7aa", brandGradients.secondary] },
      { title: "Important Notes", items: withFallback(initialData.importantNotes, location?.importantNotes), tone: [brandColors.lightOrange, "#fde68a", `linear-gradient(135deg, ${brandColors.secondary} 0%, ${brandColors.accent} 100%)`] },
      { title: "Payment Policy", items: withFallback(initialData.paymentPolicy, location?.paymentPolicy), tone: [brandColors.subtlePanel, brandColors.border, brandGradients.primary] },
      { title: "Cancellation Policy", items: withFallback(initialData.cancellationPolicy, location?.cancellationPolicy), tone: [brandColors.light, "#fecaca", brandGradients.primary] },
      { title: "Airline Cancellation Policy", items: withFallback(initialData.airlineCancellationPolicy, location?.airlineCancellationPolicy), tone: [brandColors.panelBg, brandColors.border, `linear-gradient(135deg, ${brandColors.slateText} 0%, ${brandColors.text} 100%)`] },
      { title: "Terms and Conditions", items: withFallback(initialData.termsconditions, location?.termsconditions), tone: [brandColors.subtlePanel, brandColors.border, `linear-gradient(135deg, ${brandColors.slateText} 0%, ${brandColors.text} 100%)`] },
    ].filter((section) => section.items.length > 0);

    const policiesAndTermsSection = policyRows.length
      ? `
        <div style="${cardStyle}; ${pageBreakBefore}">
          <div style="background: ${brandGradients.primary}; padding: 18px 20px; text-align: center;">
            <h2 style="color: white; font-size: 20px; font-weight: 700; margin: 0; letter-spacing: 0.3px;">Policies & Terms</h2>
            <p style="color: rgba(255,255,255,0.9); font-size: 12px; margin: 6px 0 0 0;">Inclusions, exclusions and booking policies</p>
          </div>
          <div style="padding: 18px; background: #fefefe;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
              ${policyRows.map((section) => `
                <div style="background: ${section.tone[0]}; border: 1px solid ${section.tone[1]}; border-radius: 10px; overflow: hidden; ${avoidBreak}">
                  <div style="background: ${section.tone[2]}; padding: 11px 14px;">
                    <h3 style="color: white; font-size: 14px; font-weight: 700; margin: 0;">${section.title}</h3>
                  </div>
                  <div style="padding: 14px;">${renderBulletList(section.items, brandColors.secondary, brandColors.slateText)}</div>
                </div>
              `).join("")}
            </div>
            <div style="background: ${brandColors.lightOrange}; border: 1px solid #fed7aa; border-radius: 8px; padding: 12px; text-align: center; margin-top: 16px;">
              <p style="color: ${brandColors.secondary}; font-size: 11px; font-weight: 500; margin: 0;">Policies may change based on supplier terms and conditions at the time of booking.</p>
            </div>
          </div>
        </div>
      `
      : "";

    return `
      <html>
        <head>
          <style>${pageStyle}</style>
        </head>
        <body>
          <div style="${containerStyle}">
            ${headerSection}
            ${tourInfoSection}
            ${flightSection}
            ${pricingSection}
            ${hotelSummarySection}
            ${itinerariesSection}
            ${policiesAndTermsSection}
          </div>
        </body>
      </html>
    `;
  }, [currentCompany, hotels, initialData, locations, selectedOption]);

  const generatePDF = useCallback(async () => {
    if (!initialData) return;
    setLoading(true);

    try {
      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          htmlContent: buildHtmlContent(),
          footerHtml: buildFooterHtml(),
          margin: {
            top: "72px",
            bottom: "140px",
            left: "14px",
            right: "14px",
          },
          scale: 0.88,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate PDF: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const fileName = safe(initialData.tourPackageName, "Tour_Package").replace(/[^a-zA-Z0-9-_]/g, "_");
      link.download = `${fileName}_Proposal.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      router.back();
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [buildFooterHtml, buildHtmlContent, initialData, router]);

  useEffect(() => {
    if (initialData && !printMode) {
      generatePDF();
    }
  }, [generatePDF, initialData, printMode]);

  if (!initialData) {
    return <div>No data available</div>;
  }

  if (printMode) {
    return (
      <div
        data-pdf-ready="1"
        dangerouslySetInnerHTML={{ __html: buildHtmlContent() }}
      />
    );
  }

  return (
    <div style={{ textAlign: "center", padding: "40px 0" }}>
      <p style={{ fontSize: "16px", fontWeight: 500, color: "#4b5563" }}>Preparing your travel experience...</p>
      <p style={{ fontSize: "13px", color: "#6b7280", marginTop: 8 }}>
        The download should start automatically. If it does not, please refresh this page.
      </p>
      {loading && (
        <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: 24 }}>Generating high-quality PDF...</p>
      )}
    </div>
  );
};

export default TourPackagePDFGenerator;
