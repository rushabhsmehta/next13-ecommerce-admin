"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Activity,
  FlightDetails,
  Hotel,
  Images,
  Location,
  Itinerary,
  TourPackageQuery,
  AssociatePartner,
  RoomAllocation,
  TransportDetail,
  TourDestination,
} from "@prisma/client";
import { format } from "date-fns";

// Define the props interface.
interface TourPackageQueryPDFGeneratorProps {
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
    destination: TourDestination | null;
    location: Location;
  })[];
  selectedOption?: string;
  associatePartners: AssociatePartner[];
};

// Define a type for company information.
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
    }
  };
};

// Company info object.
const companyInfo: CompanyInfo = {
  Empty: { logo: "", name: "", address: "", phone: "", email: "", website: "" },
  AH: {
    logo: "https://next13-ecommerce-admin-zeta.vercel.app/aagamholidays.png",
    name: "Aagam Holidays",
    address:
      "B - 1203, PNTC, Times of India Press Road, Satellite, Ahmedabad - 380015, Gujarat, India",
    phone: "+91-97244 44701",
    email: "info@aagamholidays.com",
    website: "https://aagamholidays.com",
    social: {
      facebook: "https://www.facebook.com/aagamholidays",
      instagram: "https://www.instagram.com/aagamholidays",
      twitter: "https://twitter.com/aagamholidays",
      linkedin: "https://www.linkedin.com/company/aagamholidays",
      youtube: "https://www.youtube.com/@aagamholidays",
      whatsapp: "https://wa.me/919724444701"
    }
  },
  KH: {
    logo: "https://next13-ecommerce-admin-zeta.vercel.app/kobawala.png",
    name: "Kobawala Holidays",
    address:
      "Kobawala holidays, 25 Sarthak Shri Ganesh, K-Raheja road, Koba, Gandhinagar-382007",
    phone: "+91-99040 35277",
    email: "kobawala.holiday@gmail.com",
    website: "http://kobawalaholidays.com",
    social: {
      facebook: "https://www.facebook.com/kobawalaholidays",
      instagram: "https://www.instagram.com/kobawalaholidays",
      twitter: "https://twitter.com/kobawalaholidays"
    }
  },
  MT: {
    logo: "https://next13-ecommerce-admin-zeta.vercel.app/mahavirtravels.png",
    name: "Mahavir Tour and Travels",
    address: "Mahavir Travels, Ahmedabad",
    phone: "+91-97244 44701",
    email: "info@aagamholidays.com",
    website: "https://mahavirtravels.com",
    social: {
      facebook: "https://www.facebook.com/mahavirtravels",
      instagram: "https://www.instagram.com/mahavirtravels"
    }
  },
};

const TourPackageQueryPDFGenerator: React.FC<TourPackageQueryPDFGeneratorProps> = ({
  initialData,
  locations,
  hotels,
}) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedOption = searchParams.get("search") || "Empty";
  const [loading, setLoading] = useState(false);
  const [preparedBy, setPreparedBy] = useState<{ name: string; email: string } | null>(null);

  // Determine the company info based on the selected option.
  const currentCompany =
    companyInfo[selectedOption] ?? companyInfo["Empty"];

  // Aagam Holidays Brand Colors (based on their logo)
  const brandColors = useMemo(() => ({
    primary: "#DC2626", // Red from logo
    secondary: "#EA580C", // Orange from logo  
    accent: "#F97316", // Bright orange
    light: "#FEF2F2", // Light red background
    lightOrange: "#FFF7ED", // Light orange background
    text: "#1F2937", // Dark gray text
    muted: "#6B7280", // Muted gray
    white: "#FFFFFF",
    border: "#E5E7EB", // Light gray border
  success: "#059669", // Green for pricing
  // Additional unified neutrals / semantic aliases
  panelBg: "#FFF8F5", // unified soft panel background
  subtlePanel: "#FFFDFB", // extra subtle background
  tableHeaderBg: "#FFF3EC", // table header background aligned with warm palette
  slateText: "#374151", // darker text variant
  softDivider: "#F5E8E5" // soft divider line
  }), []);

  // Brand Gradients for cleaner look
  const brandGradients = useMemo(() => ({
    primary: `linear-gradient(135deg, ${brandColors.primary} 0%, ${brandColors.secondary} 100%)`,
    secondary: `linear-gradient(135deg, ${brandColors.secondary} 0%, ${brandColors.accent} 100%)`,
    light: `linear-gradient(135deg, ${brandColors.light} 0%, ${brandColors.lightOrange} 100%)`,
    subtle: `linear-gradient(135deg, ${brandColors.white} 0%, ${brandColors.lightOrange} 100%)`,
    accent: `linear-gradient(135deg, ${brandColors.lightOrange} 0%, ${brandColors.light} 100%)`
  }), [brandColors]);

  // Shared building-block styles (kept as strings for HTML templates)
  const containerStyle = useMemo(() => `
    max-width: 820px;
    margin: 0 auto;
    font-family: Arial, sans-serif;
    color: ${brandColors.text};
    font-size: 14px;
  `, [brandColors.text]);

  const cardStyle = useMemo(() => `
    background: ${brandColors.white};
    border: 1px solid ${brandColors.border};
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  `, [brandColors.white, brandColors.border]);

  const headerStyleAlt = useMemo(() => `
    background: ${brandColors.tableHeaderBg};
    border-bottom: 1px solid ${brandColors.border};
    padding: 12px 16px;
  `, [brandColors.tableHeaderBg, brandColors.border]);

  const contentStyle = useMemo(() => `
    padding: 16px;
  `, []);

  const sectionTitleStyle = useMemo(() => `
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: ${brandColors.text};
  `, [brandColors.text]);

  const priceCardStyle = useMemo(() => `
    background: ${brandColors.subtlePanel};
    border: 1px solid ${brandColors.border};
    border-radius: 8px;
    padding: 12px;
    margin-top: 8px;
  `, [brandColors.subtlePanel, brandColors.border]);

  // --- Clean, Professional Styles with Aagam Holidays Branding ---
  const pageStyle = `
    @media print {
      @page {
        size: A4;
        margin: 64px 14px;
      }
    }
  `;

  // Itinerary header CSS as a normal block (not fixed) so it doesn't repeat on every printed page
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

  const badgeStyle = `
    background: ${brandColors.secondary};
    color: ${brandColors.white};
    padding: 3px 8px;
    border-radius: 12px;
    font-size: 10px;
    font-weight: 600;
    margin-left: 8px;
    display: inline-block;
    text-transform: uppercase;
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

  // Policy parsing helpers aligned with display component
  const extractText = useCallback((obj: any): string => {
    if (!obj) return '';
    for (const k of ['text','value','description','label','name']) {
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

  // --- Build HTML content ---
  const buildHtmlContent = useCallback((): string => {
    if (!initialData) return "";

    // 1. Clean Header Section (Tour Name, Type and Images)
    const headerSection = `
      <div style="${cardStyle}; margin-bottom: 16px; text-align: center; position:relative;">
        ${initialData.images && initialData.images.length > 0 ? `
          <div style="width: 100%; height: 240px; overflow: hidden; border-top-left-radius: 6px; border-top-right-radius: 6px; position:relative;">
            <img src="${initialData.images[0].url}" alt="Tour Image" style="width: 100%; height: 100%; object-fit: cover; filter: brightness(0.9);" />
            ${currentCompany.logo ? `<div style=\"position:absolute; top:12px; left:12px; background:rgba(255,255,255,0.85); backdrop-filter: blur(4px); padding:6px 10px; border-radius:6px; display:flex; align-items:center; gap:8px; box-shadow:0 2px 4px rgba(0,0,0,0.08);\"><img src='${currentCompany.logo}' alt='${currentCompany.name} Logo' style=\"height:34px; width:auto; object-fit:contain;\"/></div>` : ''}
          </div>
        ` : currentCompany.logo ? `
          <div style=\"padding-top:24px; display:flex; justify-content:center;\"><img src='${currentCompany.logo}' alt='${currentCompany.name} Logo' style=\"height:56px; width:auto; object-fit:contain;\"/></div>
        ` : ''}
        <div style="padding: 24px 24px 28px;">
          <span style="background: ${brandColors.light}; color: ${brandColors.primary}; padding: 6px 16px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.65px;">
            ${initialData.tourPackageQueryType} Package
          </span>
          <h1 style="font-size: 30px; margin: 14px 0 0 0; font-weight: 800; line-height: 1.18; background:${brandGradients.primary}; -webkit-background-clip:text; color:transparent; letter-spacing:0.75px;">
            ${initialData.tourPackageQueryName}
          </h1>
          ${currentCompany.name ? `<div style=\"margin-top:10px; font-size:12px; font-weight:600; color:${brandColors.muted}; letter-spacing:1px; text-transform:uppercase;\">Prepared by ${currentCompany.name}</div>` : ''}
        </div>
      </div>
    `;

    // 2. Clean Customer Details Section
    const customerSection = `
      <div style="${cardStyle};">
        <div style="${headerStyleAlt};">
          <h3 style="${sectionTitleStyle}">
            Query Details
          </h3>
        </div>
        <div style="${contentStyle};">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <!-- Query Info -->
            <div style="background: ${brandColors.panelBg}; padding: 12px; border-radius: 4px;">
              <div style="font-size: 12px; color: #6b7280; font-weight: 500; margin-bottom: 4px;">Query Number</div>
              <div style="font-size: 14px; font-weight: 600; color: #1e293b;">#${initialData.tourPackageQueryNumber}</div>
            </div>
            
            <!-- Prepared By -->
            ${preparedBy ? `
              <div style="background: ${brandColors.panelBg}; padding: 12px; border-radius: 4px;">
                <div style="font-size: 12px; color: #6b7280; font-weight: 500; margin-bottom: 4px;">Prepared By</div>
                <div style="font-size: 14px; font-weight: 600; color: #1e293b;">${preparedBy.name}</div>
                <div style="font-size: 12px; color: #4b5563; margin-top: 2px;">${preparedBy.email}</div>
              </div>
            ` : ''}
          </div>

          ${selectedOption !== "SupplierA" && selectedOption !== "SupplierB" ? `
            <div style="border-top: 1px solid ${brandColors.border}; margin-top: 16px; padding-top: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <!-- Customer -->
              <div style="background: ${brandColors.panelBg}; padding: 12px; border-radius: 4px;">
                <div style="font-size: 12px; color: #6b7280; font-weight: 500; margin-bottom: 4px;">Customer</div>
                <div style="font-size: 14px; font-weight: 600; color: #1e293b;">${initialData.customerName}</div>
                <div style="font-size: 12px; color: #4b5563; margin-top: 2px;">${initialData.customerNumber}</div>
              </div>
              <!-- Associate Partner -->
              <div style="background: ${brandColors.panelBg}; padding: 12px; border-radius: 4px;">
                <div style="font-size: 12px; color: #6b7280; font-weight: 500; margin-bottom: 4px;">Associate Partner</div>
                <div style="font-size: 14px; font-weight: 600; color: #1e293b;">${initialData.associatePartner?.name || 'N/A'}</div>
                <div style="font-size: 12px; color: #4b5563; margin-top: 2px;">
                  ${initialData.associatePartner?.mobileNumber || 'N/A'}
                </div>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    // 3. Clean Tour Information Section
    const tourInfoSection = `
      <div style="${cardStyle};">
        <div style="${headerStyleAlt}">
          <h2 style="${sectionTitleStyle};">
            Tour Information
          </h2>
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

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px;">
            ${initialData.transport ? `
              <div style="background: ${brandColors.panelBg}; padding: 10px; border-radius: 4px; border-left: 4px solid ${brandColors.primary};">
                <div style="font-size: 10px; color: #6b7280; font-weight: 600; margin-bottom: 2px;">TRANSPORT</div>
                <div style="font-size: 12px; color: #1f2937; font-weight: 500;">${initialData.transport}</div>
              </div>
            ` : ''}
            
            ${initialData.pickup_location ? `
              <div style="background: ${brandColors.panelBg}; padding: 10px; border-radius: 4px; border-left: 4px solid ${brandColors.primary};">
                <div style="font-size: 10px; color: #6b7280; font-weight: 600; margin-bottom: 2px;">PICKUP</div>
                <div style="font-size: 12px; color: #1f2937; font-weight: 500;">${initialData.pickup_location}</div>
              </div>
            ` : ''}
            
            ${initialData.drop_location ? `
              <div style="background: ${brandColors.panelBg}; padding: 10px; border-radius: 4px; border-left: 4px solid ${brandColors.primary};">
                <div style="font-size: 10px; color: #6b7280; font-weight: 600; margin-bottom: 2px;">DROP</div>
                <div style="font-size: 12px; color: #1f2937; font-weight: 500;">${initialData.drop_location}</div>
              </div>
            ` : ''}
          </div>

          ${(initialData.numAdults || initialData.numChild5to12 || initialData.numChild0to5) ? `
            <div style="background: ${brandColors.panelBg}; padding: 12px; border-radius: 4px; margin-top: 12px; border-left: 4px solid ${brandColors.primary};">
              <div style="font-size: 12px; color: #6b7280; font-weight: 600; margin-bottom: 8px;">TRAVELLERS</div>
              <div style="display: flex; gap: 16px; flex-wrap: wrap;">
                ${initialData.numAdults ? `
                  <div style="text-align: center;">
                    <div style="font-size: 16px; font-weight: 600; color: #1f2937;">${initialData.numAdults}</div>
                    <div style="font-size: 10px; color: #6b7280; font-weight: 500;">Adults</div>
                  </div>
                ` : ''}
                ${initialData.numChild5to12 ? `
                  <div style="text-align: center;">
                    <div style="font-size: 16px; font-weight: 600; color: #1f2937;">${initialData.numChild5to12}</div>
                    <div style="font-size: 10px; color: #6b7280; font-weight: 500;">Children (5-12)</div>
                  </div>
                ` : ''}
                ${initialData.numChild0to5 ? `
                  <div style="text-align: center;">
                    <div style="font-size: 16px; font-weight: 600; color: #1f2937;">${initialData.numChild0to5}</div>
                    <div style="font-size: 10px; color: #6b7280; font-weight: 500;">Children (0-5)</div>
                  </div>
                ` : ''}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;

  // Legacy Tour Pricing section removed to match display page.

  // Function to parse pricing section JSON data
  const parsePricingSection = (pricingData: any): Array<{name?: string, price?: string, description?: string}> => {
    console.log('🔍 PDF Generator - Parsing pricing data:', pricingData);
    if (!pricingData) return [];
    try {
      // If it's already an array, return it
      if (Array.isArray(pricingData)) {
        console.log('✅ Pricing data is array:', pricingData);
        return pricingData;
      }
      // If it's a JSON string, parse it
      if (typeof pricingData === 'string') {
        const parsed = JSON.parse(pricingData);
        console.log('✅ Parsed pricing data from string:', parsed);
        return parsed;
      }
      // If it's an object, try to extract pricing items
      if (typeof pricingData === 'object') {
        const values = Object.values(pricingData).filter((item: any) => 
          item && typeof item === 'object' && (item.name || item.price)
        ) as Array<{name?: string, price?: string, description?: string}>;
        console.log('✅ Extracted pricing data from object:', values);
        return values;
      }
    } catch (error) {
      console.error('❌ Error parsing pricing section:', error);
    }
    return [];
  };

    // 5. Enhanced Total Price Section
    const formatINR = (val: string) => {
      try {
        const n = parseFloat(String(val).replace(/[^\d.-]/g, ''));
        if (isNaN(n)) return String(val);
        return n.toLocaleString('en-IN');
      } catch { return String(val); }
    };

    const totalPriceSection =
      initialData.totalPrice && initialData.totalPrice.trim() !== ""
        ? `
      <div style="${priceCardStyle}; text-align: center;">        
        <div style="margin-bottom: 8px;">
          <h3 style="font-size: 16px; font-weight: 600; color: #374151; margin: 0;">
            Total Package Cost
          </h3>
        </div>
        
        <div style="background: white; border-radius: 6px; padding: 20px 16px; margin: 8px 0; border: 1px solid #e5e7eb; position:relative;">
          <div style="position:absolute; top:0; left:0; right:0; height:3px; background:${brandGradients.primary};"></div>
          <div style="font-size: 26px; font-weight: 700; color: ${brandColors.primary}; margin-bottom: 4px; letter-spacing:0.5px;">
            ₹ ${formatINR(initialData.totalPrice)}
          </div>
          <div style="font-size: 12px; color: #6b7280; font-weight: 500; text-transform:uppercase; letter-spacing:0.75px;">
            Complete Tour Package Cost
          </div>
          <div style="font-size: 11px; color: ${brandColors.muted}; font-weight: 500; margin-top: 6px; padding: 4px 8px; background: ${brandColors.lightOrange}; border-radius: 4px; display: inline-block;">
            + 5% GST
          </div>
        </div>
      </div>
    `
        : "";

    // 5.5. Enhanced Dynamic Pricing Section
    console.log("PDF Generator - initialData pricingSection:", {
      pricingSection: initialData.pricingSection
    });

    let dynamicPricingSection = "";
    
    // Get pricing data from the pricingSection field
    const pricingData = initialData.pricingSection;

    if (pricingData) {
      const parsedPricing = parsePricingSection(pricingData);
      console.log("PDF Generator - parsed pricing:", parsedPricing);
      
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
          <div style="${cardStyle};">
            <div style="${headerStyleAlt};">
              <h3 style="${sectionTitleStyle};">
                Detailed Pricing Breakdown
              </h3>
            </div>
            <div style="${contentStyle};">
              ${pricingItems}
              <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 4px; padding: 12px; margin-top: 12px; text-align: center;">
                <div style="font-size: 12px; color: #ea580c; font-weight: 600;">
                  * All prices are subject to availability & taxes. + 5% GST applicable.
                </div>
              </div>
            </div>
          </div>
        `;
      }
    }

    // 6. Clean Remarks Section
    const remarksSection =
      initialData.remarks && initialData.remarks.trim() !== ""
        ? `
      <div style="${cardStyle};">
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
      </div>
    `
        : "";

  // Remove Tour Highlights section to match display
  const highlightsSection = "";

    // 8. Flight Details Section (if applicable)
  // Flight details not shown on display page; omit to match.
  const flightSection = "";

    // 9. Hotel, Room Allocation & Transport Summary (matches display order)
    const hotelSummarySection = (selectedOption !== "SupplierA" && initialData.itineraries && initialData.itineraries.length > 0)
      ? `
      <div style="${cardStyle}; ${pageBreakBefore}">
        <div style="${headerStyleAlt}">
          <h2 style="${sectionTitleStyle}">
            Hotel, Room Allocation & Transport Details
          </h2>
        </div>
        <div style="${contentStyle}">
          ${initialData.itineraries.map((it, index) => {
            const hotel = hotels.find(h => h.id === it.hotelId);
            return `
            <div style="padding: 16px 0; ${index < initialData.itineraries.length - 1 ? `border-bottom: 1px solid ${brandColors.border};` : ''} break-inside: avoid;">
              <div style="display:flex; align-items:flex-start; gap:12px; margin-bottom: 12px;">
                <div style="width:32px; height:32px; background: #f1f5f9; color: #475569; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:600; font-size:14px; flex-shrink: 0;">
                  ${it.dayNumber}
                </div>
                <div>
                    <div style="display:flex; align-items:center; gap:12px;">
                      <span style="display:inline-flex; align-items:center; justify-content:center; background:${brandColors.primary}; color:${brandColors.white}; padding:6px 10px; border-radius:8px; font-weight:700; font-size:12px;">DAY ${it.dayNumber}</span>
                      <div style="flex:1;">
                        <h3 style="margin:0; font-size:16px; font-weight:800; line-height:1.1; background: ${brandGradients.secondary}; -webkit-background-clip:text; -webkit-text-fill-color:transparent; letter-spacing:0.15px; text-shadow: 0 1px 0 rgba(0,0,0,0.03);">${it.days}</h3>
                        <div style="height:6px; width:84px; max-width:84px; display:inline-block; background: ${brandGradients.primary}; border-radius:4px; margin-top:8px;"></div>
                      </div>
                    </div>
                    ${(() => { const t = it.itineraryTitle ? String(it.itineraryTitle) : ''; const cleaned = t.replace(/^<p>/i, '').replace(/<\/p>$/i, ''); return it.itineraryTitle ? `<div style="font-size:13px; color:${brandColors.slateText}; margin-top:8px;">${cleaned}</div>` : ''; })()}
                  </div>
              </div>
              ${hotel ? `
                <div style="margin-left: 44px; margin-top: 12px; display: grid; grid-template-columns: 100px 1fr; gap: 16px; align-items: center;">
                  <!-- Hotel Image -->
                  <div style="width: 100px; height: 75px; border-radius: 4px; overflow: hidden; background: #f3f4f6;">
                    ${hotel.images && hotel.images.length > 0 ? `
                      <img src="${hotel.images[0].url}" alt="${hotel.name}" style="width: 100%; height: 100%; object-fit: cover;" />
                    ` : `
                      <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 12px;">No Image</div>
                    `}
                  </div>
                  
                  <!-- Hotel Details -->
                  <div>
                    <a href="${hotel.link || '#'}" target="_blank" rel="noopener noreferrer" style="font-size:14px; font-weight:600; color:#1e293b; text-decoration:none;">
                      ${hotel.name || ''}
                    </a>
                    ${hotel.destination ? `
                      <div style="font-size:12px; color:${brandColors.muted}; margin-top:2px; font-weight:500;">
                        📍 ${hotel.destination.name}
                      </div>
                    ` : hotel.location ? `
                      <div style="font-size:12px; color:${brandColors.muted}; margin-top:2px; font-weight:500;">
                        📍 ${hotel.location.label}
                      </div>
                    ` : ''}
                  </div>
                </div>

                ${(it.roomAllocations && it.roomAllocations.length > 0) ? `
                  <div style="margin-left: 44px; margin-top: 16px;">
                    <div style="font-size:13px; font-weight:600; color:#374151; margin-bottom:8px;">Room Allocations</div>
                    <table style="${tableStyle}">
                      <thead>
                        <tr>
                          <th style="${tableHeaderStyle}">Room Type</th>
                          <th style="${tableHeaderStyle}">Occupancy</th>
                          <th style="${tableHeaderStyle}; text-align: center;">Qty</th>
                          <th style="${tableHeaderStyle}">Voucher No.</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${(() => {
                          // Sort room allocations by occupancy type display order
                          const sortedRoomAllocations = [...it.roomAllocations].sort((a: any, b: any) => {
                            const aOrder = a?.occupancyType?.displayOrder ?? a?.occupancyType?.display_order ?? 999;
                            const bOrder = b?.occupancyType?.displayOrder ?? b?.occupancyType?.display_order ?? 999;
                            return aOrder - bOrder;
                          });
                          
                          return sortedRoomAllocations.map((room: any, r_index: number) => `
                            <tr style="${r_index % 2 === 0 ? 'background: #fdfdfe;' : 'background: white;'}">
                              <td style="${tableCellStyle}">
                                <div style="font-weight: 600;">
                                  ${(() => {
                                    const customText = typeof room?.customRoomType === 'string' ? room.customRoomType.trim() : '';
                                    return customText.length > 0 ? customText : (room?.roomType?.name || room.roomType || 'Standard');
                                  })()}
                                </div>
                              </td>
                              <td style="${tableCellStyle}">
                                ${room?.occupancyType?.name || room.occupancyType || room.occupancyTypeId || '-'}
                              </td>
                              <td style="${tableCellStyle}; text-align: center;">
                                <span style="background: #e2e8f0; color: #334155; padding: 2px 8px; border-radius: 99px; font-weight: 600; font-size: 12px;">
                                  ${room.quantity || 1}
                                </span>
                              </td>
                              <td style="${tableCellStyle}">
                                ${room.voucherNumber || '-'}
                              </td>
                            </tr>
                          `).join('');
                        })()}
                      </tbody>
                    </table>
                    ${(() => {
                      const plans = Array.from(new Set((it.roomAllocations || []).map((r: any) => r?.mealPlan?.name || r.mealPlan).filter(Boolean)));
                      return plans.length ? `
                        <div style="margin-top: 12px; background: #f9fafb; padding: 10px 12px; border-radius: 4px;">
                          <span style="font-weight: 600; color: #374151; font-size: 12px;">Meal Plan:</span> 
                          <span style="color: #1f2937; font-weight: 500; font-size: 12px;">${plans.join(' / ')}</span>
                        </div>
                      ` : '';
                    })()}
                  </div>
                ` : ''}
              ` : `
                <div style="margin-left: 44px; margin-top: 12px; background: ${brandColors.panelBg}; padding: 12px; border-radius: 4px;">
                  <span style="color: #6b7280; font-size: 13px;">No hotel assigned for this day.</span>
                </div>
              `}
              
              ${(it.transportDetails && it.transportDetails.length > 0) ? `
                <div style="margin-left: 44px; margin-top: 16px;">
                  <div style="font-size:13px; font-weight:600; color:#374151; margin-bottom:8px;">Transport Details</div>
                  ${it.transportDetails.map((t: any) => `
          <div style="display:flex; align-items:center; justify-content:space-between; background:${brandColors.lightOrange}; padding:10px 12px; border-radius:4px; margin-bottom:8px; border-left: 4px solid ${brandColors.secondary};">
                      <div>
            <div style="font-weight:600; color:${brandColors.secondary};">${t?.vehicleType?.name || 'Vehicle'}</div>
            ${t.description ? `<div style="font-size:12px; color:${brandColors.muted}; margin-top: 2px;">${t.description}</div>` : ''}
                      </div>
                      <div style="text-align: right;">
            <span style="background: ${brandColors.accent}; color: ${brandColors.white}; padding: 2px 8px; border-radius: 99px; font-weight: 600; font-size: 12px;">
                          Qty: ${t.quantity || 1}
                        </span>
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          `}).join('')}
        </div>
      </div>
      ` : "";

    // 10. Itineraries Section (content-only, no hotel/room/transport inside)
    let itinerariesSection = "";

    if (
      selectedOption !== "SupplierA" &&
      initialData.itineraries &&
      initialData.itineraries.length > 0
    ) {
  // Clean Itinerary header
      itinerariesSection += `
    <div style="${cardStyle};">
      <div style="${headerStyleAlt}; text-align: center;">
        <h2 style="${sectionTitleStyle}">
          Travel Itinerary
        </h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: ${brandColors.muted};">Your day-by-day adventure guide</p>
      </div>
    </div>
  `;
      // Clean individual itinerary day cards
      itinerariesSection += initialData.itineraries
        .map((itinerary, dayIndex) => `
      <div style="${cardStyle}; margin-bottom: 24px; ${dayIndex > 0 ? pageBreakBefore : ''} page-break-inside: avoid; break-inside: avoid-page;">
        <!-- Clean Itinerary Header -->
        <div style="display: flex; align-items: center; background: #f9fafb; padding: 16px; border-bottom: 1px solid ${brandColors.border};">
          <div style="background: ${brandColors.primary}; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1;">
            <span style="font-size: 10px; font-weight: 500;">DAY</span>
            <span style="font-size: 16px; font-weight: 700;">${itinerary.dayNumber}</span>
          </div>
          <div style="margin-left: 16px;">
            <h3 style="font-size: 20px; font-weight: 800; margin: 0; line-height:1.05; background: ${brandGradients.primary}; -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing:0.3px; text-shadow: 0 1px 0 rgba(0,0,0,0.04);">
              ${itinerary.days}
            </h3>
            <div style="height:6px; width:96px; max-width:96px; display:inline-block; background: ${brandGradients.secondary}; border-radius:4px; margin-top:8px;"></div>
            <p style="font-size: 14px; margin: 8px 0 0 0; color: ${brandColors.muted};">
              ${itinerary.itineraryTitle?.replace(/^<p>/, "").replace(/<\/p>$/, "") || `Day ${itinerary.dayNumber} Activities`}
            </p>
          </div>
        </div>

        <!-- Enhanced Itinerary Content -->
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
                  .trim().replace(/<\/?(html|body)>/gi, '')
                  .replace(/<!--StartFragment-->/gi, '')
                  .replace(/<!--EndFragment-->/gi, '')
                  .replace(/<p>/gi, '<br>')
                  .replace(/<\/p>/gi, '')
                  .replace(/<br\s*[^>]*>/gi, '<br>')
                  .replace(/(<br>\s*){2,}/gi, '<br>')
                  .replace(/\s+/g, ' ')
                  .trim()
                }
              </div>
            </div>
          ` : ''}

          ${itinerary.itineraryImages && itinerary.itineraryImages.length > 0 ? `
            <div style="margin-bottom: 24px;">
           
              <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px;">
                ${itinerary.itineraryImages.slice(0, 3).map((img, idx) => `
                  <div style="position: relative; border-radius: 6px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <div style="width: 100%; padding-bottom: 75%; /* 4:3 aspect ratio */ height: 0; position: relative;">
                      <img src="${img.url}" alt="Itinerary Image ${idx + 1}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;" />
                    </div>                  
                  </div>
                `).join("")}
              </div>
            </div>
          ` : ''}

          <!-- Enhanced Activities Section -->
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
      </div>`)
        .join("");
    } else if (
      (selectedOption === "SupplierA" || selectedOption === "SupplierB") &&
      initialData.itineraries &&
      initialData.itineraries.length > 0
    ) {
      // For SupplierA/B, render a simpler itinerary section.
      itinerariesSection = `
     <div style="${cardStyle}; page-break-before: always; padding: 16px; background: ${brandColors.white};">
            <!-- Section Header -->
            <h2 style="background: ${brandGradients.primary}; color: ${brandColors.white}; font-size: 28px; font-weight: bold; text-align: center;">
              Tour Highlights
            </h2>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: ${brandGradients.primary}; color: ${brandColors.white};">
                  <th style="width: 10%; padding: 12px; font-size: 16px; font-weight: bold; text-align: left; border-bottom: 2px solid rgba(255,255,255,0.7);">
                    Day
                  </th>
                  <th style="width: 90%; padding: 12px; font-size: 16px; font-weight: bold; text-align: left; border-bottom: 2px solid rgba(255,255,255,0.7);">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody>
                ${initialData.itineraries
          .map(
            (itinerary) => `
                  <tr style="border-bottom: 1px solid ${brandColors.border}; background: ${brandColors.white}; color: ${brandColors.text};">
                    <td style="width: 10%; padding: 12px; vertical-align: middle; text-align: left; font-size: 16px; font-weight: bold;">
                      Day ${itinerary.dayNumber}: ${itinerary.days}
                    </td>
                    <td style="width: 90%; padding: 12px; vertical-align: middle; font-size: 16px; font-weight: bold;">
                      ${itinerary.itineraryTitle?.replace(/^<p>/, "").replace(/<\/p>$/, "")}
                    </td>
                  </tr>
                `
          )
          .join("")}
              </tbody>
            </table>
          </div>
  `;
    }

  // 10. Inclusions, Exclusions, Important Notes, Payment Policy, Terms, Cancellation Policies
    const renderPolicyContent = (policyData: any): string => {
      if (!policyData) return "";
      
      try {
        // If policyData is already a string (legacy data), use it directly
        if (typeof policyData === 'string') {
          return policyData            
        }
        
        // If it's JSON, parse it and render as HTML
        const parsedData = typeof policyData === 'object' ? policyData : JSON.parse(policyData);
        
        if (Array.isArray(parsedData)) {
          return parsedData.map(item => {
            if (typeof item === 'string') {
              return `<div style="margin-bottom: 8px;">• ${item}</div>`;
            } else if (item.type === 'bullet' && item.text) {
              return `<div style="margin-bottom: 8px;">• ${item.text}</div>`;
            } else if (item.type === 'paragraph' && item.text) {
              return `<div style="margin-bottom: 12px;">${item.text}</div>`;
            } else if (item.text) {
              return `<div style="margin-bottom: 8px;">${item.text}</div>`;
            }
            return '';
          }).join('');
        } else if (typeof parsedData === 'object' && parsedData !== null) {
          // Handle object format if needed
          return Object.values(parsedData).map(item => 
            typeof item === 'string' ? `<div style="margin-bottom: 8px;">• ${item}</div>` : ''
          ).join('');
        }
        
        return JSON.stringify(parsedData);
      } catch (e) {
        // If JSON parsing fails, treat it as a string
        console.error("Policy parsing error:", e);
        return String(policyData)
       
      }
    };

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

    const renderBulletList = (items: string[]) => items.map(i => `
      <div style="display: flex; align-items: flex-start; margin-bottom: 8px; line-height: 1.5;">
        <span style="color: #ea580c; margin-right: 8px; font-weight: bold; flex-shrink: 0;">•</span>
        <span style="color: #374151; font-size: 13px;">${i}</span>
      </div>
    `).join('');

    // Create a comprehensive policies section
    const policiesAndTermsSection = (inclusionsArr.length || exclusionsArr.length || importantArr.length || paymentArr.length || kitchenArr.length || termsArr.length || cancelArr.length || airlineCancelArr.length || usefulTipsArr.length) ? `
      <div style="${cardStyle}; ${pageBreakBefore}">
        <div style="background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%); padding: 20px; text-align: center; margin-bottom: 0;">
          <h2 style="color: white; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: 0.5px;">Policies & Terms</h2>
          <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 6px 0 0 0;">Comprehensive overview of inclusions, exclusions and important travel policies</p>
        </div>
        
        <div style="padding: 24px; background: #fefefe;">
          <!-- First Row: Inclusions and Exclusions -->
          ${(inclusionsArr.length || exclusionsArr.length) ? `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
              ${inclusionsArr.length ? `
                <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; overflow: hidden;">
                  <div style="background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); padding: 12px; border-bottom: 1px solid #fed7aa;">
                    <h3 style="color: white; font-size: 16px; font-weight: 600; margin: 0; display: flex; align-items: center;">
                      <span style="margin-right: 8px;">✓</span>
                      Inclusions
                    </h3>
                  </div>
                  <div style="padding: 16px;">
                    ${renderBulletList(inclusionsArr)}
                  </div>
                </div>
              ` : ''}
              
              ${exclusionsArr.length ? `
                <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; overflow: hidden;">
                  <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 12px; border-bottom: 1px solid #fecaca;">
                    <h3 style="color: white; font-size: 16px; font-weight: 600; margin: 0; display: flex; align-items: center;">
                      <span style="margin-right: 8px;">✗</span>
                      Exclusions
                    </h3>
                  </div>
                  <div style="padding: 16px;">
                    ${renderBulletList(exclusionsArr)}
                  </div>
                </div>
              ` : ''}
            </div>
          ` : ''}
          <!-- Second Row: Kitchen Group Policy and Useful Tips (moved right after Inclusions/Exclusions) -->
          ${(kitchenArr.length || usefulTipsArr.length) ? `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
              ${kitchenArr.length ? `
                <div style="background: #f5f3ff; border: 1px solid #c4b5fd; border-radius: 8px; overflow: hidden;">
                  <div style="background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); padding: 12px; border-bottom: 1px solid #c4b5fd;">
                    <h3 style="color: white; font-size: 16px; font-weight: 600; margin: 0; display: flex; align-items: center;">
                      <span style="margin-right: 8px;">🍽️</span>
                      Kitchen Group Policy
                    </h3>
                  </div>
                  <div style="padding: 16px;">
                    ${renderBulletList(kitchenArr)}
                  </div>
                </div>
              ` : ''}
              
              ${usefulTipsArr.length ? `
                <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; overflow: hidden;">
                  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 12px; border-bottom: 1px solid #a7f3d0;">
                    <h3 style="color: white; font-size: 16px; font-weight: 600; margin: 0; display: flex; align-items: center;">
                      <span style="margin-right: 8px;">�</span>
                      Useful Tips
                    </h3>
                  </div>
                  <div style="padding: 16px;">
                    ${renderBulletList(usefulTipsArr)}
                  </div>
                </div>
              ` : ''}
            </div>
          ` : ''}

          <!-- Third Row: Important Notes and Payment Policy -->
          ${(importantArr.length || paymentArr.length) ? `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
              ${importantArr.length ? `
                <div style="background: #fefdf8; border: 1px solid #fde68a; border-radius: 8px; overflow: hidden;">
                  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 12px; border-bottom: 1px solid #fde68a;">
                    <h3 style="color: white; font-size: 16px; font-weight: 600; margin: 0; display: flex; align-items: center;">
                      <span style="margin-right: 8px;">⚠</span>
                      Important Notes
                    </h3>
                  </div>
                  <div style="padding: 16px;">
                    ${renderBulletList(importantArr)}
                  </div>
                </div>
              ` : ''}
              
              ${paymentArr.length ? `
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; overflow: hidden;">
                  <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 12px; border-bottom: 1px solid #bbf7d0;">
                    <h3 style="color: white; font-size: 16px; font-weight: 600; margin: 0; display: flex; align-items: center;">
                      <span style="margin-right: 8px;">💳</span>
                      Payment Policy
                    </h3>
                  </div>
                  <div style="padding: 16px;">
                    ${renderBulletList(paymentArr)}
                  </div>
                </div>
              ` : ''}
            </div>
          ` : ''}

          <!-- Fourth Row: Cancellation and Airline Cancellation -->
          ${(cancelArr.length || airlineCancelArr.length) ? `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
              ${cancelArr.length ? `
                <div style="background: #fdf2f8; border: 1px solid #f9a8d4; border-radius: 8px; overflow: hidden;">
                  <div style="background: linear-gradient(135deg, #be185d 0%, #9d174d 100%); padding: 12px; border-bottom: 1px solid #f9a8d4;">
                    <h3 style="color: white; font-size: 16px; font-weight: 600; margin: 0; display: flex; align-items: center;">
                      <span style="margin-right: 8px;">📅</span>
                      Cancellation Policy
                    </h3>
                  </div>
                  <div style="padding: 16px;">
                    ${renderBulletList(cancelArr)}
                  </div>
                </div>
              ` : ''}
              
              ${airlineCancelArr.length ? `
                <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; overflow: hidden;">
                  <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 12px; border-bottom: 1px solid #bae6fd;">
                    <h3 style="color: white; font-size: 16px; font-weight: 600; margin: 0; display: flex; align-items: center;">
                      <span style="margin-right: 8px;">✈️</span>
                      Airline Cancellation Policy
                    </h3>
                  </div>
                  <div style="padding: 16px;">
                    ${renderBulletList(airlineCancelArr)}
                  </div>
                </div>
              ` : ''}
            </div>
          ` : ''}

          <!-- Fifth Row: Terms and Conditions (Full Width) -->
          ${termsArr.length ? `
            <div style="margin-bottom: 20px;">
              <div style="background: #fafafa; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #374151 0%, #1f2937 100%); padding: 12px; border-bottom: 1px solid #e5e7eb;">
                  <h3 style="color: white; font-size: 16px; font-weight: 600; margin: 0; display: flex; align-items: center;">
                    <span style="margin-right: 8px;">📋</span>
                    Terms and Conditions
                  </h3>
                </div>
                <div style="padding: 16px;">
                  ${renderBulletList(termsArr)}
                </div>
              </div>
            </div>
          ` : ''}

          <!-- Footer Note -->
          <div style="background: #fef7f0; border: 1px solid #fed7aa; border-radius: 6px; padding: 12px; text-align: center; margin-top: 20px;">
            <p style="color: #ea580c; font-size: 12px; font-weight: 500; margin: 0; font-style: italic;">
              Policies are subject to change based on supplier terms & prevailing conditions at the time of booking.
            </p>
          </div>
        </div>
      </div>
    ` : "";

    
    // Assemble all sections.
    const fullHtml = `
      <html>
        <head>
          <style>${pageStyle}\n${itineraryHeaderStyle}</style>
        </head>
        <body>
          <div style="${containerStyle}">
            ${headerSection}
            ${customerSection}
            ${tourInfoSection}
            ${dynamicPricingSection}
            ${totalPriceSection}
            ${remarksSection}
            ${hotelSummarySection}
            
            ${itinerariesSection}
            ${policiesAndTermsSection}
          </div>
        </body>
      </html>
    `;
    return fullHtml;
  }, [initialData, currentCompany, locations, hotels, selectedOption, preparedBy, brandColors, brandGradients, cardStyle, containerStyle, contentStyle, headerStyleAlt, iconStyle, itineraryHeaderStyle, pageBreakBefore, pageStyle, parsePolicyField, priceCardStyle, sectionTitleStyle, tableCellStyle, tableHeaderStyle, tableStyle]);
  // --- Function to generate the PDF via the API ---
  const generatePDF = useCallback(async () => {
    setLoading(true);
    const htmlContent = buildHtmlContent();

    // Build footer HTML with company info and social links
  const footerHtml = (() => {
      const c = currentCompany;
      const showBrand = selectedOption !== "Empty";
      const isAagam = selectedOption === "AH";
      
      // Only allow socials for Aagam Holidays (AH)
      const social = isAagam ? {
        facebook: c.social?.facebook,
        instagram: c.social?.instagram,
        twitter: c.social?.twitter,
      } as const : {
        facebook: undefined,
        instagram: undefined,
        twitter: undefined,
      } as const;

      const websiteUrl = c.website || "https://aagamholidays.com";
      const websiteLabel = websiteUrl.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");

      // Enhanced footer with proper Aagam Holidays branding
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

            <!-- Top Row: Company Info & Page Number -->
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

            <!-- Middle Row: Contact Information Card -->
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

            <!-- Bottom Row: Social Media & Tagline -->
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
                ${social.twitter ? `
                  <a href="${social.twitter}" target="_blank" style="display: flex; align-items: center; gap: 3px; text-decoration: none; padding: 2px 5px; background: #fff; border-radius: 4px; border: 1px solid #fed7aa;">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="#1DA1F2"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                    <span style="font-size: 8px; color: #1da1f2; font-weight: 600;">Twitter</span>
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          htmlContent,
          footerHtml,
          margin: { top: "72px", bottom: "110px", left: "14px", right: "14px" },
          scale: 0.88,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const fileName =
          initialData?.tourPackageQueryName && initialData?.tourPackageQueryType
            ? `${initialData.tourPackageQueryName.replace(/[^a-zA-Z0-9-_]/g, "_")}_${initialData.tourPackageQueryType.replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`
            : "Tour_Package.pdf";

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
    } finally {      setLoading(false);
    }
  }, [initialData, buildHtmlContent, currentCompany, selectedOption]);

  useEffect(() => {
    if (!initialData) return;
    // Fetch latest CREATE audit log for prepared by
    (async () => {
      try {
        const res = await fetch(`/api/audit-logs?entityId=${initialData.id}&entityType=TourPackageQuery&action=CREATE&limit=1`);
        if (res.ok) {
          const data = await res.json();
          const log = data.auditLogs?.[0];
          if (log) setPreparedBy({ name: log.userName, email: log.userEmail });
        }
      } catch {}
    })();

    // Generate and download PDF automatically
    generatePDF();
  }, [initialData, generatePDF]);

  if (!initialData) return <div>No data available</div>;
  
  return (
    <div style={{ padding: "40px", textAlign: "center", fontFamily: "sans-serif", color: "#333" }}>
      <div style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "16px" }}>
        {loading ? "Generating PDF..." : "Preparing Your Tour Package PDF"}
      </div>
      <div style={{ fontSize: "16px", color: "#666", marginBottom: "24px" }}>
        {loading ? "Please wait while we generate your PDF document." : "Your PDF will download automatically."}
      </div>
      
      {loading && (
        <div style={{ marginTop: "24px" }}>
          <svg width="48" height="48" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ margin: "auto" }}>
            <circle cx="12" cy="12" r="10" stroke="#ea580c" strokeWidth="2" fill="none" strokeDasharray="15 60" transform="rotate(0 12 12)">
              <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
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
              marginRight: "12px"
            }}
          >
            Download PDF Again
          </button>
          <button 
            onClick={() => router.push(`/tourPackageQueryDisplay/${initialData.id}${selectedOption !== "Empty" ? `?search=${selectedOption}` : ''}`)}
            style={{
              padding: "12px 24px",
              backgroundColor: "#6b7280",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            Back to Display
          </button>
        </div>
      )}
    </div>
  );
};

export default TourPackageQueryPDFGenerator;
