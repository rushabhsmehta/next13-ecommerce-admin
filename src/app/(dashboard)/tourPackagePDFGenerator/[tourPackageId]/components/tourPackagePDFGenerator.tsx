"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  FlightDetails,
  Hotel,
  Images,
  Location,
  Itinerary,
  TourPackage,
} from "@prisma/client";

interface TourPackagePDFGeneratorProps {
  initialData: (TourPackage & {
    images: Images[];
    itineraries: (Itinerary & {
      itineraryImages: Images[];
      activities: (Activity & {
        activityImages: Images[];
      })[];
    })[];
    flightDetails: FlightDetails[];
  }) | null;
  locations: Location[];
  hotels: (Hotel & { images: Images[] })[];
}

type CompanyProfile = {
  logo?: string;
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

const COMPANY_PROFILES: Record<string, CompanyProfile> = {
  Empty: {},
  AH: {
    logo: "https://admin.aagamholidays.com/aagamholidays.png",
    name: "Aagam Holidays",
    address:
      "B - 1203, PNTC, Times of India Press Road, Satellite, Ahmedabad - 380015, Gujarat, India",
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
const TourPackagePDFGenerator: React.FC<TourPackagePDFGeneratorProps> = ({
  initialData,
  locations,
  hotels,
}) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedParam = searchParams.get("search");
  const selectedOption = useMemo(() => {
    if (!selectedParam) return "AH";
    if (selectedParam === "Empty") return "Empty";
    return COMPANY_PROFILES[selectedParam] ? selectedParam : "AH";
  }, [selectedParam]);
  const [loading, setLoading] = useState(false);

  const companyProfile = useMemo(() => {
    const fallbackProfile = COMPANY_PROFILES.AH;
    const selectedProfile = COMPANY_PROFILES[selectedOption] ?? COMPANY_PROFILES.Empty;

    return {
      ...fallbackProfile,
      ...selectedProfile,
      social: {
        ...(fallbackProfile.social ?? {}),
        ...(selectedProfile.social ?? {}),
      },
    };
  }, [selectedOption]);

  const brandColors = useMemo(
    () => ({
      primary: "#DC2626",
      secondary: "#EA580C",
      accent: "#F97316",
      text: "#1F2937",
      muted: "#6B7280",
      border: "#E5E7EB",
      white: "#FFFFFF",
      light: "#FEF2F2",
      lightOrange: "#FFF7ED",
      panelBg: "#FFF8F5",
      tableHeaderBg: "#FFF3EC",
      success: "#059669",
    }),
    []
  );

  const brandGradients = useMemo(
    () => ({
      primary: `linear-gradient(135deg, ${brandColors.primary} 0%, ${brandColors.secondary} 100%)`,
      subtle: `linear-gradient(135deg, ${brandColors.light} 0%, ${brandColors.lightOrange} 100%)`,
    }),
    [brandColors]
  );

  const containerStyle = useMemo(
    () => `
      max-width: 820px;
      margin: 0 auto;
      font-family: 'Segoe UI', Arial, sans-serif;
      color: ${brandColors.text};
      font-size: 14px;
    `,
    [brandColors.text]
  );

  const cardStyle = useMemo(
    () => `
      background: ${brandColors.white};
      border: 1px solid ${brandColors.border};
      border-radius: 12px;
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
      overflow: hidden;
      margin-bottom: 20px;
    `,
    [brandColors.white, brandColors.border]
  );

  const sectionHeaderStyle = useMemo(
    () => `
      background: ${brandColors.tableHeaderBg};
      border-bottom: 1px solid ${brandColors.border};
      padding: 16px 22px;
    `,
    [brandColors.tableHeaderBg, brandColors.border]
  );

  const sectionBodyStyle = useMemo(
    () => `
      padding: 20px 22px;
    `,
    []
  );

  const tableStyle = useMemo(
    () => `
      width: 100%;
      border-collapse: collapse;
      border: 1px solid ${brandColors.border};
      border-radius: 8px;
      overflow: hidden;
      margin-top: 8px;
    `,
    [brandColors.border]
  );

  const tableHeaderCellStyle = useMemo(
    () => `
      background: ${brandColors.light};
      color: ${brandColors.text};
      padding: 10px 12px;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      font-size: 11px;
      font-weight: 600;
      border-bottom: 1px solid ${brandColors.border};
      text-align: left;
    `,
    [brandColors.border, brandColors.light, brandColors.text]
  );

  const tableCellStyle = useMemo(
    () => `
      padding: 12px;
      border-bottom: 1px solid ${brandColors.border};
      font-size: 13px;
      color: ${brandColors.text};
      vertical-align: top;
    `,
    [brandColors.border, brandColors.text]
  );

  const pageBreakBefore = useMemo(
    () => `
      page-break-before: always;
      break-before: page;
    `,
    []
  );

  const avoidPageBreakStyle = useMemo(
    () => `
      page-break-inside: avoid;
      break-inside: avoid-page;
    `,
    []
  );

  const pageStyle = `
    @media print {
      @page {
        size: A4;
        margin: 60px 20px 120px 20px;
      }
    }
  `;

  const sanitizeText = useCallback((value: any, fallback = "") => {
    if (value === null || value === undefined) return fallback;
    const text = String(value).trim();
    if (!text || text.toLowerCase() === "null" || text.toLowerCase() === "undefined" || text === "NaN") {
      return fallback;
    }
    return text;
  }, []);

  const parsePolicyField = useCallback(
    (field: any): string[] => {
      const items: string[] = [];
      const pushValue = (val: any) => {
        const text = sanitizeText(val);
        if (text) {
          items.push(text);
        }
      };
      const walk = (input: any) => {
        if (Array.isArray(input)) {
          input.forEach(walk);
          return;
        }
        if (input && typeof input === "object") {
          Object.values(input).forEach(walk);
          return;
        }
        if (typeof input === "string") {
          input
            .split(/\n|•|-|\u2022/)
            .map((piece) => piece.trim())
            .filter(Boolean)
            .forEach(pushValue);
          return;
        }
        if (input !== null && input !== undefined) {
          pushValue(input);
        }
      };
      if (!field) {
        return items;
      }
      try {
        if (typeof field === "string") {
          try {
            const parsed = JSON.parse(field);
            walk(parsed);
          } catch {
            walk(field);
          }
        } else {
          walk(field);
        }
      } catch (error) {
        console.error("Failed to parse policy field", error);
      }
      return items;
    },
    [sanitizeText]
  );

  const renderBulletList = useCallback(
    (items: string[]) =>
      items
        .map(
          (item) => `
        <div style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px;">
          <span style="color: ${brandColors.secondary}; font-size: 14px; line-height: 1;">•</span>
          <span style="color: ${brandColors.text}; font-size: 13px; line-height: 1.5;">${item}</span>
        </div>
      `
        )
        .join(""),
    [brandColors.secondary, brandColors.text]
  );

  const buildFooterHtml = useCallback((): string => {
    const safeValue = (value: any, fallback = "") => sanitizeText(value, fallback);
    const company = companyProfile;

    const isAagam = selectedOption === "AH";
    const logo = safeValue(company.logo);
    const name = safeValue(company.name, "Aagam Holidays");
    const tagline = isAagam ? "Your Trusted Travel Partner" : "";
    const address = safeValue(company.address);
    const phone = safeValue(company.phone);
    const email = safeValue(company.email);
    const websiteUrl = safeValue(company.website, "https://aagamholidays.com");
    const websiteLabel = websiteUrl
      ? websiteUrl.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "")
      : "";

    const social = {
      facebook: safeValue(company.social?.facebook),
      instagram: safeValue(company.social?.instagram),
    };

    return `
      <div style="width:100%; font-family: Arial, sans-serif;">
        <div style="padding: 12px 20px; box-sizing: border-box; background: linear-gradient(135deg, #fefaf6 0%, #fff5eb 100%); border-top: 2px solid #ea580c;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              ${logo ? `<img src="${logo}" style="height: 22px; width: auto; object-fit: contain;"/>` : ""}
              <div>
                <div style="font-size: 14px; font-weight: 700; color: #dc2626; line-height: 1.1;">${name}</div>
                ${tagline ? `<div style="font-size: 8px; color: #7c2d12; font-weight: 500; margin-top: 2px;">${tagline}</div>` : ""}
              </div>
            </div>
            <div style="background: #fff; padding: 3px 8px; border-radius: 10px; border: 1px solid #fed7aa; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
              <span style="font-size: 9px; color: #7c2d12; font-weight: 600;">Page <span class="pageNumber"></span> / <span class="totalPages"></span></span>
            </div>
          </div>

          <div style="background: #ffffff; padding: 6px 12px; border-radius: 6px; border: 1px solid #fed7aa; margin-bottom: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="display: flex; flex-wrap: wrap; gap: 15px; align-items: center; justify-content: center; text-align: center;">
              ${address ? `
                <div style="font-size: 8px; color: #7c2d12; display: flex; align-items: center; gap: 3px;">
                  <span style="color: #ea580c; font-size: 10px;">📍</span>
                  <span style="font-weight: 500;">${address}</span>
                </div>
              ` : ""}
              ${phone ? `
                <div style="font-size: 8px; color: #7c2d12; display: flex; align-items: center; gap: 3px;">
                  <span style="color: #ea580c; font-size: 10px;">📞</span>
                  <span style="font-weight: 500;">${phone}</span>
                </div>
              ` : ""}
              ${email ? `
                <div style="font-size: 8px; color: #7c2d12; display: flex; align-items: center; gap: 3px;">
                  <span style="color: #ea580c; font-size: 10px;">✉️</span>
                  <span style="font-weight: 500;">${email}</span>
                </div>
              ` : ""}
            </div>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 5px; flex-wrap: wrap;">
              ${websiteLabel ? `
                <a href="${websiteUrl}" target="_blank" style="font-size: 8px; text-decoration: none; display: flex; align-items: center; gap: 2px; padding: 2px 5px; background: #fff; border-radius: 4px; border: 1px solid #fed7aa;">
                  <span style="color: #ea580c; font-size: 9px;">🌐</span>
                  <span style="font-weight: 600; color: #7c2d12;">${websiteLabel}</span>
                </a>
              ` : ""}
              ${social.facebook ? `
                <a href="${social.facebook}" target="_blank" style="display: flex; align-items: center; gap: 3px; text-decoration: none; padding: 2px 5px; background: #fff; border-radius: 4px; border: 1px solid #fed7aa;">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  <span style="font-size: 8px; color: #3b5998; font-weight: 600;">Facebook</span>
                </a>
              ` : ""}
              ${social.instagram ? `
                <a href="${social.instagram}" target="_blank" style="display: flex; align-items: center; gap: 3px; text-decoration: none; padding: 2px 5px; background: #fff; border-radius: 4px; border: 1px solid #fed7aa;">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="url(#insta-gradient)"><defs><radialGradient id="insta-gradient" cx="0.3" cy="1" r="1"><stop offset="0" stop-color="#FFD600"/><stop offset="0.5" stop-color="#FF7A00"/><stop offset="1" stop-color="#D62976"/></radialGradient></defs><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919C8.416 2.175 8.796 2.163 12 2.163m0-2.163C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12s.014 3.667.072 4.947c.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072s3.667-.014 4.947-.072c4.358-.2 6.78-2.618 6.98-6.98.058-1.28.072-1.689.072-4.947s-.014-3.667-.072-4.947c-.2-4.358-2.618-6.78-6.98-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zm0 10.162a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.88 1.44 1.44 0 000-2.88z"/></svg>
                  <span style="font-size: 8px; color: #7c2d12; font-weight: 600;">Instagram</span>
                </a>
              ` : ""}
            </div>
            <div style="text-align: right; flex-shrink: 0;">
              <div style="font-size: 7px; color: #7c2d12; font-style: italic; font-weight: 500;">Crafting journeys with care and expertise.</div>
            </div>
          </div>
        </div>
      </div>`;
  }, [companyProfile, sanitizeText, selectedOption]);

  const buildHtmlContent = useCallback((): string => {
    if (!initialData) return "";

    const safe = (value: any, fallback = "") => sanitizeText(value, fallback);

    const heroImage = initialData.images?.[0]?.url;
    const destinationLabel = safe(
      locations.find((location) => location.id === initialData.locationId)?.label,
      "Not specified"
    );

    const travellerBadges = [
      // initialData.numAdults ? `${safe(initialData.numAdults)} Adults` : "",
      // initialData.numChild5to12 ? `${safe(initialData.numChild5to12)} Children (5-12)` : "",
      // initialData.numChild0to5 ? `${safe(initialData.numChild0to5)} Children (0-5)` : "",
    ].filter(Boolean);

    const headerSection = `
      <div style="${cardStyle}">
        ${heroImage ? `
          <div style="height: 240px; overflow: hidden; position: relative;">
            <img src="${heroImage}" alt="Tour hero" style="width: 100%; height: 100%; object-fit: cover;" />
            ${companyProfile.logo ? `<div style="position: absolute; top: 16px; left: 16px; background: rgba(255,255,255,0.92); border-radius: 8px; padding: 8px 12px; box-shadow: 0 12px 24px rgba(15, 23, 42, 0.12);">
              <img src="${companyProfile.logo}" alt="${safe(companyProfile.name)} Logo" style="height: 40px; object-fit: contain;" />
            </div>` : ""}
          </div>
        ` : ""}
        <div style="padding: 26px 28px 30px;">
          ${initialData.tourPackageType ? `<span style="display: inline-block; background: ${brandGradients.subtle}; color: ${brandColors.primary}; padding: 6px 16px; border-radius: 999px; font-size: 12px; font-weight: 600; letter-spacing: 0.6px; text-transform: uppercase;">
            ${safe(initialData.tourPackageType)} Package
          </span>` : ""}
          <h1 style="margin: 16px 0 8px; font-size: 30px; line-height: 1.2; font-weight: 800; color: ${brandColors.text}; letter-spacing: 0.6px;">
            ${safe(initialData.tourPackageName, "Custom Tour Package")}
          </h1>
          ${companyProfile.name ? `<div style="font-size: 13px; color: ${brandColors.muted}; text-transform: uppercase; letter-spacing: 0.8px;">
            Curated by ${safe(companyProfile.name)}
          </div>` : ""}
        </div>
      </div>
    `;

    const overviewSection = `
      <div style="${cardStyle}">
        <div style="${sectionHeaderStyle}">
          <h2 style="margin: 0; font-size: 18px; font-weight: 700; color: ${brandColors.text};">Package Overview</h2>
        </div>
        <div style="${sectionBodyStyle}">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px;">
            <div style="background: ${brandColors.panelBg}; border-radius: 8px; padding: 14px; border: 1px solid ${brandColors.border};">
              <div style="font-size: 12px; color: ${brandColors.muted}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.7px;">Package Reference</div>
              <div style="margin-top: 6px; font-size: 15px; font-weight: 700; color: ${brandColors.text};">${safe(initialData.id, "N/A")}</div>
            </div>
            {/* Prepared For section removed as TourPackage doesn't have customer details */}
          </div>
        </div>
      </div>
    `;

    const tourInfoHighlights = `
      <div style="${cardStyle}">
        <div style="${sectionHeaderStyle}">
          <h2 style="margin: 0; font-size: 18px; font-weight: 700; color: ${brandColors.text};">Tour Information</h2>
        </div>
        <div style="${sectionBodyStyle}">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px;">
            <div style="border-left: 4px solid ${brandColors.primary}; background: ${brandColors.light}; border-radius: 10px; padding: 14px;">
              <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.7px; color: ${brandColors.muted};">Destination</div>
              <div style="margin-top: 6px; font-size: 15px; font-weight: 700; color: ${brandColors.text};">${destinationLabel}</div>
            </div>
            ${initialData.numDaysNight ? `
              <div style="border-left: 4px solid ${brandColors.primary}; background: ${brandColors.light}; border-radius: 10px; padding: 14px;">
                <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.7px; color: ${brandColors.muted};">Duration</div>
                <div style="margin-top: 6px; font-size: 15px; font-weight: 700; color: ${brandColors.text};">${safe(initialData.numDaysNight)}</div>
              </div>
            ` : ""}
            ${initialData.transport ? `
              <div style="border-left: 4px solid ${brandColors.primary}; background: ${brandColors.light}; border-radius: 10px; padding: 14px;">
                <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.7px; color: ${brandColors.muted};">Transport</div>
                <div style="margin-top: 6px; font-size: 15px; font-weight: 700; color: ${brandColors.text};">${safe(initialData.transport)}</div>
              </div>
            ` : ""}
          </div>
          ${(initialData.pickup_location || initialData.drop_location || travellerBadges.length) ? `
            <div style="margin-top: 16px; display: flex; flex-wrap: wrap; gap: 12px;">
              ${initialData.pickup_location ? `<div style="border: 1px dashed ${brandColors.border}; border-radius: 999px; padding: 8px 14px; font-size: 12px; color: ${brandColors.muted};"><strong style="color: ${brandColors.text};">Pickup:</strong> ${safe(initialData.pickup_location)}</div>` : ""}
              ${initialData.drop_location ? `<div style="border: 1px dashed ${brandColors.border}; border-radius: 999px; padding: 8px 14px; font-size: 12px; color: ${brandColors.muted};"><strong style="color: ${brandColors.text};">Drop:</strong> ${safe(initialData.drop_location)}</div>` : ""}
              ${travellerBadges
          .map(
            (badge) => `<div style="background: ${brandColors.panelBg}; border-radius: 999px; padding: 8px 14px; font-size: 12px; font-weight: 600; color: ${brandColors.text};">${badge}</div>`
          )
          .join("")}
            </div>
          ` : ""}
        </div>
      </div>
    `;


    const flightSection =
      initialData.flightDetails && initialData.flightDetails.length
        ? `
          <div style="${cardStyle}">
            <div style="${sectionHeaderStyle}">
              <h2 style="margin: 0; font-size: 18px; font-weight: 700; color: ${brandColors.text};">Flight Details</h2>
            </div>
            <div style="${sectionBodyStyle}">
              <table style="${tableStyle}">
                <thead>
                  <tr>
                    <th style="${tableHeaderCellStyle}">Date</th>
                    <th style="${tableHeaderCellStyle}">Flight</th>
                    <th style="${tableHeaderCellStyle}">Route</th>
                    <th style="${tableHeaderCellStyle}">Departure</th>
                    <th style="${tableHeaderCellStyle}">Arrival</th>
                    <th style="${tableHeaderCellStyle}">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  ${initialData.flightDetails
          .map(
            (flight) => `
                      <tr>
                        <td style="${tableCellStyle}; font-weight: 600;">${safe(flight.date, "N/A")}</td>
                        <td style="${tableCellStyle};">
                          <div style="font-weight: 600; color: ${brandColors.text};">${safe(flight.flightName, "N/A")}</div>
                          ${flight.flightNumber ? `<div style="margin-top: 4px; font-size: 11px; color: ${brandColors.muted};">${safe(flight.flightNumber)}</div>` : ""}
                        </td>
                        <td style="${tableCellStyle};">${safe(flight.from, "-")} → ${safe(flight.to, "-")}</td>
                        <td style="${tableCellStyle};">${safe(flight.departureTime, "-")}</td>
                        <td style="${tableCellStyle};">${safe(flight.arrivalTime, "-")}</td>
                        <td style="${tableCellStyle};">${safe(flight.flightDuration, "-")}</td>
                      </tr>
                    `
          )
          .join("")}
                </tbody>
              </table>
            </div>
          </div>
        `
        : "";

    const hotelsLinkedToItinerary = hotels.filter((hotel) =>
      initialData.itineraries?.some((itinerary) => itinerary.hotelId === hotel.id)
    );

    const sortedHotelsLinkedToItinerary = hotelsLinkedToItinerary
      .map((hotel) => {
        const associatedItineraries = initialData.itineraries?.filter((itinerary) => itinerary.hotelId === hotel.id) ?? [];
        const dayNumbers = associatedItineraries
          .map((itinerary) => itinerary.dayNumber)
          .filter((dayNumber): dayNumber is number => typeof dayNumber === "number");
        const earliestDay = dayNumbers.length ? Math.min(...dayNumbers) : Number.POSITIVE_INFINITY;
        return { hotel, earliestDay };
      })
      .sort((a, b) => a.earliestDay - b.earliestDay)
      .map(({ hotel }) => hotel);

    const hotelsSection =
      sortedHotelsLinkedToItinerary.length > 0
        ? `
          <div style="${cardStyle}; ${pageBreakBefore}">
            <div style="${sectionHeaderStyle}">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
                <h2 style="margin: 0; font-size: 18px; font-weight: 700; color: ${brandColors.text};">Featured Stays</h2>
                <span style="font-size: 11px; color: ${brandColors.muted}; text-transform: uppercase; letter-spacing: 0.6px;">
                  Handpicked accommodations aligned with your itinerary
                </span>
              </div>
            </div>
            <div style="${sectionBodyStyle}">
              <div style="display: flex; flex-direction: column; gap: 18px;">
                ${sortedHotelsLinkedToItinerary
          .map((hotel) => {
            const associatedItineraries = initialData.itineraries?.filter((itinerary) => itinerary.hotelId === hotel.id) ?? [];
            const nightsCount = associatedItineraries.length;
            const nightsLabel = nightsCount ? `${nightsCount} ${nightsCount > 1 ? "Nights" : "Night"} Stay` : "";
            const dayBadges = associatedItineraries
              .map((itinerary) => (itinerary.dayNumber || itinerary.dayNumber === 0 ? `Day ${sanitizeText(itinerary.dayNumber)}` : ""))
              .filter(Boolean);
            const roomCategories = Array.from(
              new Set(
                associatedItineraries
                  .map((itinerary) => sanitizeText(itinerary.roomCategory))
                  .filter(Boolean)
              )
            );
            const mealPlans = Array.from(
              new Set(
                associatedItineraries
                  .map((itinerary) => sanitizeText(itinerary.mealsIncluded))
                  .filter(Boolean)
              )
            );
            const highlightTitles = associatedItineraries
              .map((itinerary) => sanitizeText(itinerary.itineraryTitle))
              .filter(Boolean);
            const heroImage = sanitizeText(hotel.images?.[0]?.url);
            const galleryImages = (hotel.images ?? [])
              .slice(1, 3)
              .map((image) => sanitizeText(image?.url))
              .filter(Boolean);
            const hotelLocation = locations.find((loc) => loc.id === hotel.locationId);
            const hotelLocationLabel = sanitizeText(hotelLocation?.label);
            const hotelLink = sanitizeText(hotel.link);

            return `
                      <div style="border: 1px solid ${brandColors.border}; border-radius: 16px; overflow: hidden; box-shadow: 0 18px 34px rgba(15, 23, 42, 0.08); background: ${brandColors.white}; ${avoidPageBreakStyle}">
                        <div style="background: ${brandGradients.primary}; padding: 18px 22px; color: ${brandColors.white}; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
                          <div>
                            <div style="font-size: 18px; font-weight: 700; letter-spacing: 0.4px;">${safe(hotel.name, "Featured Hotel")}</div>
                            ${hotelLocationLabel ? `<div style="margin-top: 4px; font-size: 12px; opacity: 0.82;">${hotelLocationLabel}</div>` : ""}
                          </div>
                          <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center; justify-content: flex-end;">
                            ${nightsLabel ? `<span style="background: rgba(255,255,255,0.18); padding: 6px 12px; border-radius: 999px; font-size: 11px; font-weight: 600; letter-spacing: 0.6px;">${nightsLabel}</span>` : ""}
                            ${dayBadges
                .map(
                  (badge) => `<span style="background: rgba(255,255,255,0.12); padding: 5px 10px; border-radius: 999px; font-size: 10px; font-weight: 600; letter-spacing: 0.6px;">${badge}</span>`
                )
                .join("")}
                          </div>
                        </div>
                        <div style="display: flex; flex-wrap: wrap;">
                          <div style="flex: 1 1 320px; padding: 20px 22px; background: ${brandColors.white};">
                            ${roomCategories.length
                ? `<div style="font-size: 12px; font-weight: 700; color: ${brandColors.text}; text-transform: uppercase; letter-spacing: 0.6px;">Room Plan</div>
                                <div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 8px;">
                                  ${roomCategories
                  .map(
                    (category) => `<span style="background: ${brandColors.lightOrange}; color: ${brandColors.secondary}; padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 600;">${category}</span>`
                  )
                  .join("")}
                                </div>`
                : ""}
                            ${mealPlans.length
                ? `<div style="margin-top: 14px; font-size: 12px; font-weight: 700; color: ${brandColors.text}; text-transform: uppercase; letter-spacing: 0.6px;">Meal Plan</div>
                                <div style="margin-top: 6px; color: ${brandColors.muted}; font-size: 12px;">${mealPlans.join(" • ")}</div>`
                : ""}
                            ${highlightTitles.length
                ? `<div style="margin-top: 16px; font-size: 12px; font-weight: 700; color: ${brandColors.text}; text-transform: uppercase; letter-spacing: 0.6px;">Itinerary Highlights</div>
                                <ul style="margin: 8px 0 0; padding-left: 18px; font-size: 12px; color: ${brandColors.muted}; line-height: 1.5;">
                                  ${highlightTitles.map((title) => `<li>${title}</li>`).join("")}
                                </ul>`
                : ""}
                            ${hotelLink
                ? `<div style="margin-top: 18px;">
                                  <a href="${hotelLink}" style="display: inline-flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; color: ${brandColors.secondary}; text-decoration: none; border: 1px solid ${brandColors.secondary}; border-radius: 999px; padding: 8px 14px;">Visit Website →</a>
                                </div>`
                : ""}
                          </div>
                          ${heroImage
                ? `<div style="flex: 1 1 220px; min-width: 220px; background: ${brandColors.white}; border-left: 1px solid ${brandColors.border}; display: flex; flex-direction: column;">
                                  <div style="flex: 1 1 auto; height: 160px; overflow: hidden;">
                                    <img src="${heroImage}" alt="${safe(hotel.name, "Hotel Image")}" style="width: 100%; height: 100%; object-fit: cover;" />
                                  </div>
                                  ${galleryImages.length
                  ? `<div style="display: flex; gap: 6px; padding: 10px; border-top: 1px solid ${brandColors.border}; background: ${brandColors.lightOrange};">
                                        ${galleryImages
                    .map(
                      (url) => `<div style="flex: 1 1 50%; height: 60px; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 18px rgba(15, 23, 42, 0.12);">
                                              <img src="${url}" alt="${safe(hotel.name, "Hotel Gallery")}" style="width: 100%; height: 100%; object-fit: cover;" />
                                            </div>`
                    )
                    .join("")}
                                      </div>`
                  : ""}
                                </div>`
                : ""}
                        </div>
                      </div>
                    `;
          })
          .join("")}
              </div>
            </div>
          </div>
        `
        : "";

    const itinerariesSection =
      initialData.itineraries && initialData.itineraries.length
        ? `
          <div style="${cardStyle}; ${pageBreakBefore}">
            <div style="${sectionHeaderStyle}">
              <h2 style="margin: 0; font-size: 18px; font-weight: 700; color: ${brandColors.text};">Day-wise Itinerary</h2>
            </div>
            <div style="${sectionBodyStyle}">
              ${initialData.itineraries
          .slice()
          .sort((a, b) => (a.dayNumber || 0) - (b.dayNumber || 0))
          .map((itinerary, index) => {
            const linkedHotel = hotels.find((hotel) => hotel.id === itinerary.hotelId);
            const linkedHotelName = linkedHotel ? safe(linkedHotel.name) : "";
            const mealPlanLabel = safe(itinerary.mealsIncluded);
            const daySummary = safe(itinerary.days);
            const roomInfo = [
              itinerary.roomCategory ? `Room: ${safe(itinerary.roomCategory)}` : "",
              itinerary.numberofRooms ? `Rooms: ${safe(itinerary.numberofRooms)}` : "",
            ]
              .filter(Boolean)
              .join(" • ");
            return `
                    <div style="border: 1px solid ${brandColors.border}; border-radius: 10px; margin-bottom: 16px; overflow: hidden; ${avoidPageBreakStyle}">
                      <div style="background: ${index % 2 === 0 ? brandColors.panelBg : brandColors.white}; padding: 16px 18px; display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 14px;">
                          <div style="width: 44px; height: 44px; border-radius: 12px; background: ${brandGradients.primary}; color: ${brandColors.white}; display: flex; align-items: center; justify-content: center; font-weight: 700;">
                            D${itinerary.dayNumber || index + 1}
                          </div>
                          <div>
                            <div style="font-size: 15px; font-weight: 700; color: ${brandColors.text};">${safe(itinerary.itineraryTitle, "Daily Highlights")}</div>
                            ${daySummary ? `<div style="margin-top: 2px; font-size: 12px; color: ${brandColors.muted};">${daySummary}</div>` : ""}
                          </div>
                        </div>
                        ${mealPlanLabel ? `<div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: ${brandColors.secondary};">${mealPlanLabel}</div>` : ""}
                      </div>
                      <div style="padding: 18px;">
                        ${itinerary.itineraryDescription ? `<div style="font-size: 13px; color: ${brandColors.text}; line-height: 1.7;">${safe(itinerary.itineraryDescription)}</div>` : ""}
                        ${linkedHotelName ? `<div style="margin-top: 12px; font-size: 13px; color: ${brandColors.text};"><strong>Suggested Hotel:</strong> ${linkedHotelName}</div>` : ""}
                        ${(roomInfo || mealPlanLabel) ? `<div style="margin-top: 10px; font-size: 12px; color: ${brandColors.muted};">${[roomInfo, mealPlanLabel ? `Meals: ${mealPlanLabel}` : ""].filter(Boolean).join(" • ")}</div>` : ""}
                        ${itinerary.activities && itinerary.activities.length
                ? `
                              <div style="margin-top: 14px;">
                                <div style="font-size: 12px; font-weight: 700; color: ${brandColors.text}; text-transform: uppercase; letter-spacing: 0.5px;">
                                  Included Experiences
                                </div>
                                <div style="margin-top: 8px; display: grid; gap: 12px;">
                                  ${itinerary.activities
                  .map(
                    (activity) => `
                                        <div style="border: 1px solid ${brandColors.border}; border-radius: 10px; padding: 12px 14px; background: ${brandColors.white};">
                                          <div style="font-size: 13px; font-weight: 600; color: ${brandColors.text};">${safe(activity.activityTitle, "Activity")}</div>
                                          ${activity.activityDescription ? `<div style="margin-top: 4px; font-size: 12px; color: ${brandColors.muted}; line-height: 1.5;">${safe(activity.activityDescription)}</div>` : ""}
                                        </div>
                                      `
                  )
                  .join("")}
                                </div>
                              </div>
                            `
                : ""
              }
                      </div>
                    </div>
                  `;
          })
          .join("")}
            </div>
          </div>
        `
        : "";

    const policySection = (field: any, title: string, icon?: string) => {
      const entries = parsePolicyField(field);
      if (!entries.length) return "";
      return `
        <div style="${cardStyle}; ${avoidPageBreakStyle}">
          <div style="${sectionHeaderStyle}; display: flex; align-items: center; gap: 10px;">
            ${icon ? `<span style="font-size: 18px;">${icon}</span>` : ""}
            <h2 style="margin: 0; font-size: 18px; font-weight: 700; color: ${brandColors.text};">${title}</h2>
          </div>
          <div style="${sectionBodyStyle}">
            ${renderBulletList(entries)}
          </div>
        </div>
      `;
    };

    const companySection = `
          <div style="${cardStyle}; ${pageBreakBefore}; overflow: hidden; padding: 0;">
            <div style="background: ${brandGradients.primary}; color: ${brandColors.white}; padding: 32px 30px; display: flex; flex-wrap: wrap; gap: 20px; align-items: center; justify-content: space-between;">
              <div style="display: flex; gap: 16px; align-items: center;">
                ${companyProfile.logo ? `<div style="background: rgba(255,255,255,0.95); padding: 8px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); backdrop-filter: blur(8px);">
                  <img src="${companyProfile.logo}" alt="${safe(companyProfile.name)}" style="height: 60px; width: auto; object-fit: contain;" />
                </div>` : ""}
                <div>
                  <div style="font-size: 22px; font-weight: 800; letter-spacing: 0.6px;">${safe(companyProfile.name, "Aagam Holidays")}</div>
                  <div style="margin-top: 6px; font-size: 13px; opacity: 0.85; letter-spacing: 0.4px; text-transform: uppercase;">Your Trusted Travel Partner</div>
                </div>
              </div>
              <div style="max-width: 260px; text-align: right;">
                <div style="font-size: 16px; font-weight: 700;">Thank you for choosing us.</div>
                <div style="margin-top: 6px; font-size: 12px; line-height: 1.6; opacity: 0.85;">Our travel specialists are available for any refinements you would like to explore.</div>
              </div>
            </div>
            <div style="padding: 28px 30px; background: ${brandColors.white};">
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px;">
                <div style="${avoidPageBreakStyle}">
                  <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.6px; color: ${brandColors.muted}; font-weight: 700;">Head Office</div>
                  ${companyProfile.address ? `<div style="margin-top: 8px; font-size: 13px; color: ${brandColors.text}; line-height: 1.7;">${companyProfile.address}</div>` : `<div style="margin-top: 8px; font-size: 13px; color: ${brandColors.text};">Reach out to our concierge team for personalised assistance.</div>`}
                </div>
                <div style="${avoidPageBreakStyle}">
                  <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.6px; color: ${brandColors.muted}; font-weight: 700;">Contact</div>
                  <div style="margin-top: 8px; display: grid; gap: 6px; font-size: 13px; color: ${brandColors.text};">
                    ${companyProfile.phone ? `<span>📞 ${companyProfile.phone}</span>` : ""}
                    ${companyProfile.email ? `<span>✉️ ${companyProfile.email}</span>` : ""}
                    ${companyProfile.website ? `<span>🌐 ${companyProfile.website}</span>` : ""}
                  </div>
                </div>
                <div style="${avoidPageBreakStyle}">
                  <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.6px; color: ${brandColors.muted}; font-weight: 700;">Connect With Us</div>
                  <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 8px;">
                    ${companyProfile.social?.facebook ? `<a href="${sanitizeText(companyProfile.social.facebook)}" target="_blank" style="font-size: 13px; color: #1877F2; text-decoration: none; font-weight: 600; display: inline-flex; gap: 8px; align-items: center;">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                      <span>Facebook</span>
                    </a>` : ""}
                    ${companyProfile.social?.instagram ? `<a href="${sanitizeText(companyProfile.social.instagram)}" target="_blank" style="font-size: 13px; background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-decoration: none; font-weight: 600; display: inline-flex; gap: 8px; align-items: center;">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="url(#insta-gradient)"><defs><radialGradient id="insta-gradient" cx="0.3" cy="1" r="1"><stop offset="0" stop-color="#FFD600"/><stop offset="0.5" stop-color="#FF7A00"/><stop offset="1" stop-color="#D62976"/></radialGradient></defs><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919C8.416 2.175 8.796 2.163 12 2.163m0-2.163C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12s.014 3.667.072 4.947c.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072s3.667-.014 4.947-.072c4.358-.2 6.78-2.618 6.98-6.98.058-1.28.072-1.689.072-4.947s-.014-3.667-.072-4.947c-.2-4.358-2.618-6.78-6.98-6.98C15.668.014 15.259 0 12 0z"/></svg>
                      <span>Instagram</span>
                    </a>` : ""}
                  </div>
                </div>
              </div>

              <!-- Branch Offices Section -->
              <div style="margin-top: 20px; padding: 20px; background: #fafafa; border-radius: 12px; border: 1px solid #efefef;">
                <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.6px; color: ${brandColors.muted}; font-weight: 700; margin-bottom: 16px;">Our Branches</div>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
                  <div style="${avoidPageBreakStyle}">
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: ${brandColors.secondary}; font-weight: 700; margin-bottom: 8px;">Surat Branch</div>
                    <div style="font-size: 12px; color: ${brandColors.text}; line-height: 1.6;">
                      <div style="margin-bottom: 6px;">📍 1101, Siddhi Vinayak Paradise, Adajan, Surat - 395005, Gujarat</div>
                      <div style="margin-bottom: 6px;">📞 +91-94092 64480</div>
                      <div>✉️ kinjal@aagamholidays.com</div>
                    </div>
                  </div>
                  <div style="${avoidPageBreakStyle}">
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: ${brandColors.secondary}; font-weight: 700; margin-bottom: 8px;">Rajkot Branch</div>
                    <div style="font-size: 12px; color: ${brandColors.text}; line-height: 1.6;">
                      <div style="margin-bottom: 6px;">📍 305, Mahalaxmi Complex, Opp. Saint Marry School, Kalavad Road, Rajkot - 360005, Gujarat</div>
                      <div style="margin-bottom: 6px;">📞 +91-76989 80007</div>
                      <div>✉️ khushbu@aagamholidays.com</div>
                    </div>
                  </div>
                </div>
              </div>

              <div style="margin-top: 28px; padding: 18px 20px; border: 1px dashed ${brandColors.border}; border-radius: 12px; background: ${brandColors.panelBg}; ${avoidPageBreakStyle}">
                <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.6px; color: ${brandColors.muted}; font-weight: 700;">Next Steps</div>
                <div style="margin-top: 8px; font-size: 13px; color: ${brandColors.text}; line-height: 1.7;">Share your thoughts with us and we will tailor the itinerary, upgrade stays, or add curated experiences to match your travel style.</div>
              </div>
            </div>
          </div>
        `;

    return `
      <html>
        <head>
          <style>${pageStyle}</style>
        </head>
        <body>
          <div style="${containerStyle}">
            ${headerSection}
            ${overviewSection}
            ${tourInfoHighlights}
            ${flightSection}
            ${hotelsSection}
            ${itinerariesSection}
            ${policySection(initialData.inclusions, "Inclusions", "✅")}
            ${policySection(initialData.exclusions, "Exclusions", "⚠️")}
            ${policySection(initialData.importantNotes, "Important Notes", "📝")}
            ${policySection(initialData.paymentPolicy, "Payment Policy", "💳")}
            ${policySection(initialData.kitchenGroupPolicy, "Kitchen & Group Policy", "👨‍🍳")}
            ${policySection(initialData.termsconditions, "Terms & Conditions", "📄")}
            ${policySection(initialData.cancellationPolicy, "Cancellation Policy", "❌")}
            ${policySection(initialData.airlineCancellationPolicy, "Airline Cancellation Policy", "✈️")}
            ${policySection(initialData.usefulTip, "Useful Tips", "💡")}
            ${companySection}
          </div>
        </body>
      </html>
    `;
  }, [
    brandColors,
    brandGradients,
    cardStyle,
    companyProfile,
    containerStyle,
    hotels,
    initialData,
    locations,
    parsePolicyField,
    renderBulletList,
    sanitizeText,
    sectionBodyStyle,
    sectionHeaderStyle,
    tableCellStyle,
    tableHeaderCellStyle,
    tableStyle,
    pageStyle,
    pageBreakBefore,
    avoidPageBreakStyle,
  ]);

  const generatePDF = useCallback(async () => {
    if (!initialData) return;
    setLoading(true);

    const htmlContent = buildHtmlContent();
    const footerHtml = buildFooterHtml();

    const bottomMargin = "140px";

    try {
      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          htmlContent,
          footerHtml,
          margin: {
            top: "72px",
            bottom: bottomMargin,
            left: "18px",
            right: "18px",
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
      const safeName = sanitizeText(initialData.tourPackageName, "Tour_Package").replace(/[^a-zA-Z0-9-_]/g, "_");
      link.download = `${safeName}_Proposal.pdf`;
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
  }, [buildFooterHtml, buildHtmlContent, initialData, router, sanitizeText]);

  useEffect(() => {
    if (initialData) {
      generatePDF();
    }
  }, [generatePDF, initialData]);

  if (!initialData) {
    return <div>No data available</div>;
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
