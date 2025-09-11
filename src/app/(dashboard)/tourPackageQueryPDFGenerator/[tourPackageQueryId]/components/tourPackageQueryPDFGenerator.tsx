"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
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
  },
  KH: {
    logo: "https://next13-ecommerce-admin-zeta.vercel.app/kobawala.png",
    name: "Kobawala Holidays",
    address:
      "Kobawala holidays, 25 Sarthak Shri Ganesh, K-Raheja road, Koba, Gandhinagar-382007",
    phone: "+91-99040 35277",
    email: "kobawala.holiday@gmail.com",
    website: "http://kobawalaholidays.com",
  },
  MT: {
    logo: "https://next13-ecommerce-admin-zeta.vercel.app/mahavirtravels.png",
    name: "Mahavir Tour and Travels",
    address: "Mahavir Travels, Ahmedabad",
    phone: "+91-97244 44701",
    email: "info@aagamholidays.com",
    website: "https://mahavirtravels.com",
  },
};

const TourPackageQueryPDFGenerator: React.FC<TourPackageQueryPDFGeneratorProps> = ({
  initialData,
  locations,
  hotels,
}) => {
  const searchParams = useSearchParams();
  const selectedOption = searchParams.get("search") || "Empty";
  const [loading, setLoading] = useState(false);
  const [preparedBy, setPreparedBy] = useState<{ name: string; email: string } | null>(null);

  // Determine the company info based on the selected option.
  const currentCompany =
    companyInfo[selectedOption] ?? companyInfo["Empty"];

  // Aagam Holidays Brand Colors (based on their logo)
  const brandColors = {
    primary: "#DC2626", // Red from logo
    secondary: "#EA580C", // Orange from logo  
    accent: "#F97316", // Bright orange
    light: "#FEF2F2", // Light red background
    lightOrange: "#FFF7ED", // Light orange background
    text: "#1F2937", // Dark gray text
    muted: "#6B7280", // Muted gray
    white: "#FFFFFF",
    border: "#E5E7EB", // Light gray border
    success: "#059669" // Green for pricing
  };

  // Brand Gradients for cleaner look
  const brandGradients = {
    primary: `linear-gradient(135deg, ${brandColors.primary} 0%, ${brandColors.secondary} 100%)`,
    secondary: `linear-gradient(135deg, ${brandColors.secondary} 0%, ${brandColors.accent} 100%)`,
    light: `linear-gradient(135deg, ${brandColors.light} 0%, ${brandColors.lightOrange} 100%)`,
    subtle: `linear-gradient(135deg, ${brandColors.white} 0%, ${brandColors.lightOrange} 100%)`,
    accent: `linear-gradient(135deg, ${brandColors.lightOrange} 0%, ${brandColors.light} 100%)`
  };

  // --- Clean, Professional Styles with Aagam Holidays Branding ---
  const containerStyle = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
    background: ${brandColors.white};
    padding: 16px; 
    max-width: 1200px; 
    margin: auto;
    line-height: 1.5;
    color: ${brandColors.text};
  `;
  
  const cardStyle = `
    background: ${brandColors.white};
    border: 1px solid ${brandColors.border}; 
    border-left: 4px solid ${brandColors.primary};
    border-radius: 4px; 
    margin-bottom: 12px; 
    overflow: hidden; 
    page-break-inside: avoid; 
    break-inside: avoid;
  `;
  
  const headerStyle = `
    padding: 16px; 
    text-align: center;
    border-bottom: 1px solid ${brandColors.border};
  `;
  
  const headerStyleAlt = `
    padding: 10px; 
    text-align: center;
    border-bottom: 1px solid ${brandColors.border};
  `;
  
  const contentStyle = `
    padding: 12px; 
    background: ${brandColors.white}; 
    color: ${brandColors.text}; 
    font-size: 13px;
    line-height: 1.4;
  `;
  
  const sectionTitleStyle = `
    font-size: 18px; 
    font-weight: 600; 
    margin: 0;
    color: ${brandColors.text};
  `;
  
  const subTitleStyle = `
    font-size: 14px; 
    font-weight: 600; 
    margin-right: 8px;
    color: ${brandColors.text};
    display: inline-block;
  `;
  
  const textStyle = `
    font-size: 14px; 
    color: ${brandColors.muted};
    font-weight: 400;
  `;

  const accentCardStyle = `
    background: ${brandColors.lightOrange};
    border: 1px solid ${brandColors.accent};
    border-left: 4px solid ${brandColors.accent};
    border-radius: 4px;
    padding: 12px;
    margin: 8px 0;
  `;

  const priceCardStyle = `
    background: ${brandColors.light};
    border: 1px solid ${brandColors.secondary};
    border-left: 4px solid ${brandColors.secondary};
    border-radius: 4px;
    padding: 12px;
    margin: 12px 0;
  `;

  const tableStyle = `
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    background: ${brandColors.white};
    border: 1px solid ${brandColors.border};
  `;

  const tableHeaderStyle = `
    background: ${brandGradients.primary};
    color: ${brandColors.white};
    padding: 10px 8px;
    text-align: left;
    font-weight: 600;
    font-size: 13px;
  `;

  const tableCellStyle = `
    padding: 8px;
    border-bottom: 1px solid ${brandColors.border};
    color: ${brandColors.text};
    font-size: 12px;
  `;

  const badgeStyle = `
    background: ${brandGradients.secondary};
    color: ${brandColors.white};
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 500;
    margin-left: 4px;
    display: inline-block;
  `;

  const iconStyle = `
    display: inline-block;
    margin-right: 6px;
    font-size: 14px;
  `;

  // Add this helper function
  const parsePricingSection = (pricingData: any): Array<{name: string, price?: string, description?: string}> => {
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

  // Policy parsing helpers aligned with display component
  const extractText = (obj: any): string => {
    if (!obj) return '';
    for (const k of ['text','value','description','label','name']) {
      if (obj[k]) return String(obj[k]);
    }
    return String(obj);
  };

  const parsePolicyField = (field: any): string[] => {
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
  };

  // --- Build HTML content ---
  const buildHtmlContent = useCallback((): string => {
    if (!initialData) return "";

    // 1. Clean Header Section (Tour Name, Type and Images)
    const headerSection = `
      <div style="${cardStyle}; margin-bottom: 16px;">
        <div style="${headerStyle};">
          <h1 style="font-size: 22px; margin: 0; font-weight: 600; text-align: center; line-height: 1.2; color: ${brandColors.primary};">
            ${initialData.tourPackageQueryName}
          </h1>
          <div style="text-align: center; margin-top: 8px;">
            <span style="background: ${brandColors.light}; color: ${brandColors.primary}; padding: 4px 12px; border-radius: 12px; font-size: 14px; font-weight: 500;">
              ${initialData.tourPackageQueryType} Package
            </span>
          </div>
        </div>
        
        ${initialData.images && initialData.images.length > 0 ? `
          <div style="margin-top: 12px;">
            ${initialData.images.slice(0, 1).map((image, index) => `
              <div style="width: 100%; height: 200px; overflow: hidden;">
                <img src="${image.url}" alt="Tour Image ${index + 1}" style="width: 100%; height: 100%; object-fit: cover;" />
              </div>
            `).join("")}
          </div>
        ` : ''}
      </div>
    `;

    // 2. Clean Customer Details Section
    const customerSection = `
      <div style="${cardStyle};">
        <div style="${headerStyleAlt};">
          <h3 style="margin: 0; font-size: 16px; font-weight: 600;">
            Query Details - ${initialData.tourPackageQueryNumber}
          </h3>
        </div>
        <div style="${contentStyle};">
          ${selectedOption !== "SupplierA" && selectedOption !== "SupplierB" ? `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
              <div style="background: #f9fafb; padding: 12px; border-radius: 4px; border-left: 3px solid #6b7280;">
                <div style="font-size: 12px; color: #6b7280; font-weight: 600; margin-bottom: 4px;">CUSTOMER</div>
                <div style="font-size: 14px; font-weight: 600; color: #1e293b;">${initialData.customerName}</div>
                <div style="font-size: 12px; color: #4b5563; margin-top: 2px;">${initialData.customerNumber}</div>
              </div>
              <div style="background: #f9fafb; padding: 12px; border-radius: 4px; border-left: 3px solid #6b7280;">
                <div style="font-size: 12px; color: #6b7280; font-weight: 600; margin-bottom: 4px;">ASSOCIATE PARTNER</div>
                <div style="font-size: 14px; font-weight: 600; color: #1e293b;">${initialData.associatePartner?.name || 'N/A'}</div>
                <div style="font-size: 12px; color: #4b5563; margin-top: 2px;">
                  ${initialData.associatePartner?.mobileNumber || 'N/A'} | 
                  ${initialData.associatePartner?.email || 'N/A'}
                </div>
              </div>
            </div>
          ` : ''}
          
          ${preparedBy ? `
            <div style="background: #f9fafb; padding: 12px; border-radius: 4px; border-left: 3px solid #6b7280;">
              <div style="font-size: 12px; color: #6b7280; font-weight: 600; margin-bottom: 4px;">PREPARED BY</div>
              <div style="font-size: 14px; font-weight: 600; color: #1e293b;">${preparedBy.name}</div>
              <div style="font-size: 12px; color: #4b5563; margin-top: 2px;">${preparedBy.email}</div>
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
            <div style="background: #f9fafb; padding: 12px; border-radius: 4px; border-left: 3px solid #6b7280;">
              <div style="font-size: 12px; color: #6b7280; font-weight: 600; margin-bottom: 4px;">DESTINATION</div>
              <div style="font-size: 14px; font-weight: 600; color: #1f2937;">
                ${locations.find((loc) => loc.id === initialData.locationId)?.label || "Not specified"}
              </div>
            </div>
            
            ${initialData.numDaysNight ? `
              <div style="background: #f9fafb; padding: 12px; border-radius: 4px; border-left: 3px solid #6b7280;">
                <div style="font-size: 12px; color: #6b7280; font-weight: 600; margin-bottom: 4px;">DURATION</div>
                <div style="font-size: 14px; font-weight: 600; color: #1f2937;">${initialData.numDaysNight}</div>
              </div>
            ` : ''}
          </div>

          ${(initialData.tourStartsFrom || initialData.tourEndsOn) ? `
            <div style="background: #f9fafb; padding: 12px; border-radius: 4px; margin-bottom: 12px; border-left: 3px solid #6b7280;">
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
              <div style="background: #f9fafb; padding: 10px; border-radius: 4px; border-left: 3px solid #6b7280;">
                <div style="font-size: 10px; color: #6b7280; font-weight: 600; margin-bottom: 2px;">TRANSPORT</div>
                <div style="font-size: 12px; color: #1f2937; font-weight: 500;">${initialData.transport}</div>
              </div>
            ` : ''}
            
            ${initialData.pickup_location ? `
              <div style="background: #f9fafb; padding: 10px; border-radius: 4px; border-left: 3px solid #6b7280;">
                <div style="font-size: 10px; color: #6b7280; font-weight: 600; margin-bottom: 2px;">PICKUP</div>
                <div style="font-size: 12px; color: #1f2937; font-weight: 500;">${initialData.pickup_location}</div>
              </div>
            ` : ''}
            
            ${initialData.drop_location ? `
              <div style="background: #f9fafb; padding: 10px; border-radius: 4px; border-left: 3px solid #6b7280;">
                <div style="font-size: 10px; color: #6b7280; font-weight: 600; margin-bottom: 2px;">DROP</div>
                <div style="font-size: 12px; color: #1f2937; font-weight: 500;">${initialData.drop_location}</div>
              </div>
            ` : ''}
          </div>

          ${(initialData.numAdults || initialData.numChild5to12 || initialData.numChild0to5) ? `
            <div style="background: #f9fafb; padding: 12px; border-radius: 4px; margin-top: 12px; border-left: 3px solid #6b7280;">
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
  const pricingSection = "";

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
        
        <div style="background: white; border-radius: 4px; padding: 16px; margin: 8px 0; border: 1px solid #e5e7eb;">
          <div style="font-size: 24px; font-weight: 700; color: #1f2937; margin-bottom: 4px;">
            ₹ ${formatINR(initialData.totalPrice)}
          </div>
          <div style="font-size: 12px; color: #6b7280; font-weight: 500;">
            Complete Tour Package Cost
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
          <div style="background: ${index % 2 === 0 ? '#f9fafb' : 'white'}; padding: 12px; border-radius: 4px; margin-bottom: 8px; border-left: 3px solid #6b7280; border: 1px solid #e5e7eb;">
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
          <div style="font-size: 14px; line-height: 1.5; color: #1f2937; background: #f9fafb; padding: 12px; border-radius: 4px; border-left: 3px solid #6b7280;">
            ${initialData.remarks}
          </div>
        </div>
      </div>
    `
        : "";

  // Remove Tour Highlights section to match display
  const highlightsSection = "";




    // 7. Tour Highlights Section
    // const highlightsSection2 =
    //   initialData.tour_highlights && initialData.tour_highlights.trim() !== ""
    //     ? `
    //   <div style="${cardStyle}">
    //     <div style="${headerStyle}">
    //       <h2 style="${sectionTitleStyle}">Tour Highlights</h2>
    //     </div>
    //     <div style="${contentStyle}; font-size: 18px;">
    //       ${initialData.tour_highlights}
    //     </div>
    //   </div>
    // `
    //     : "";

    // 8. Flight Details Section (if applicable)
  // Flight details not shown on display page; omit to match.
  const flightSection = "";

    // 9. Hotel, Room Allocation & Transport Summary (matches display order)
    const hotelSummarySection = (selectedOption !== "SupplierA" && initialData.itineraries && initialData.itineraries.length > 0)
      ? `
      <div style="${cardStyle}; page-break-before: always;">
        <div style="${headerStyleAlt}">
          <h2 style="${sectionTitleStyle};">
            Hotel, Room Allocation & Transport Details
          </h2>
        </div>
        <div style="${contentStyle}">
          ${initialData.itineraries.map((it) => {
            const hotel = hotels.find(h => h.id === it.hotelId);
            return `
            <div style="border-bottom: 1px solid #e5e7eb; padding: 12px 0; margin-bottom: 12px; break-inside: avoid;">
              <div style="display:flex; align-items:flex-start; gap:12px; margin-bottom: 8px;">
                <div style="width:24px; height:24px; background: #6b7280; color:white; border-radius:4px; display:flex; align-items:center; justify-content:center; font-weight:600; font-size:12px;">
                  ${it.dayNumber}
                </div>
                <div>
                  <div style="font-size:14px; font-weight:600; color:#111827;">Day ${it.dayNumber}: ${it.days}</div>
                  ${(() => { const t = it.itineraryTitle ? String(it.itineraryTitle) : ''; const cleaned = t.replace(/^<p>/i, '').replace(/<\/p>$/i, ''); return it.itineraryTitle ? '<div style="font-size:12px; color:#374151; margin-top:2px;">' + cleaned + '</div>' : ''; })()}
                </div>
              </div>
              ${hotel ? `
                <div style="margin-left: 36px; margin-top: 12px; display: grid; grid-template-columns: 120px 1fr; gap: 16px;">
                  <!-- Hotel Image -->
                  <div style="width: 120px; height: 90px; border-radius: 4px; overflow: hidden; background: #f3f4f6;">
                    ${hotel.images && hotel.images.length > 0 ? `
                      <img src="${hotel.images[0].url}" alt="${hotel.name}" style="width: 100%; height: 100%; object-fit: cover;" />
                    ` : `
                      <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 12px;">No Image</div>
                    `}
                  </div>
                  
                  <!-- Hotel Details -->
                  <div>
                    <a href="${hotel.link || '#'}" target="_blank" rel="noopener noreferrer" style="font-size:14px; font-weight:600; color:#111827; text-decoration:underline;">
                      ${hotel.name || ''}
                    </a>
                   
                  </div>
                </div>

                ${(it.roomAllocations && it.roomAllocations.length > 0) ? `
                  <div style="margin-left: 36px; margin-top: 12px;">
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
                        ${it.roomAllocations.map((room: any, index: number) => `
                          <tr style="background: ${index % 2 === 0 ? '#f8fafc' : 'white'};">
                            <td style="${tableCellStyle}">
                              <div style="display: flex; align-items: center;">
                                <span style="font-weight: 600;">
                                  ${(() => {
                                    const customText = typeof room?.customRoomType === 'string' ? room.customRoomType.trim() : '';
                                    const isCustom = customText.length > 0;
                                    const label = isCustom ? customText : (room?.roomType?.name || room.roomType || 'Standard');
                                    return label;
                                  })()}
                                </span>
                                ${(() => {
                                  const customText = typeof room?.customRoomType === 'string' ? room.customRoomType.trim() : '';
                                  const isCustom = customText.length > 0;
                                  return isCustom ? `<span style="${badgeStyle}">Custom</span>` : '';
                                })()}
                              </div>
                            </td>
                            <td style="${tableCellStyle}">
                              <span style="background: #f1f5f9; padding: 4px 8px; border-radius: 6px; font-weight: 500;">
                                ${room?.occupancyType?.name || room.occupancyType || room.occupancyTypeId || '-'}
                              </span>
                            </td>
                            <td style="${tableCellStyle}; text-align: center;">
                              <span style="background: #374151; color: white; padding: 2px 6px; border-radius: 3px; font-weight: 500; font-size: 11px;">
                                ${room.quantity || 1}
                              </span>
                            </td>
                            <td style="${tableCellStyle}">
                              <span style="font-family: monospace; background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                                ${room.voucherNumber || '-'}
                              </span>
                            </td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                    ${(() => {
                      const plans = Array.from(new Set((it.roomAllocations || []).map((r: any) => r?.mealPlan?.name || r.mealPlan).filter(Boolean)));
                      return plans.length ? `
                        <div style="margin-top: 8px; background: #f9fafb; padding: 8px 12px; border-radius: 4px; border-left: 3px solid #6b7280;">
                          <span style="font-weight: 600; color: #374151; font-size: 12px;">Meal Plan:</span> 
                          <span style="color: #1f2937; font-weight: 500; font-size: 12px;">${plans.join(' / ')}</span>
                        </div>
                      ` : '';
                    })()}
                  </div>
                ` : ''}
              ` : `
                <div style="margin-left: 36px; margin-top: 12px; background: #f9fafb; padding: 12px; border-radius: 4px; border-left: 3px solid #6b7280;">
                  <span style="color: #6b7280; font-size: 13px;">No hotel assigned for this day.</span>
                </div>
              `}
              
              ${(it.transportDetails && it.transportDetails.length > 0) ? `
                <div style="margin-left: 36px; margin-top: 16px;">
                  <div style="font-size:13px; font-weight:600; color:#374151; margin-bottom:8px;">Transport Details</div>
                  ${it.transportDetails.map((t: any) => `
                    <div style="display:flex; align-items:center; justify-content:space-between; background:#fff7ed; padding:8px 12px; border-radius:4px; margin-bottom:8px; border-left: 3px solid #fb923c;">
                      <div>
                        <div style="font-weight:600; color:#7c2d12;">${t?.vehicleType?.name || 'Vehicle'}</div>
                        ${t.description ? `<div style="font-size:11px; color:#9a3412; margin-top: 2px;">${t.description}</div>` : ''}
                      </div>
                      <div style="font-size:13px; color:#7c2d12; text-align: right;">
                        <div>Qty: ${t.quantity || 1}</div>
                        ${t.capacity ? `<div>Cap: ${t.capacity}</div>` : ''}
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
    <div style="${cardStyle}; page-break-before: always;">
      <div style="${headerStyleAlt}; text-align: center;">
        <h2 style="${sectionTitleStyle};">
          Travel Itinerary
        </h2>
        <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9; font-weight: 400;">Your day-by-day adventure guide</p>
      </div>
    </div>
  `;
      // Clean individual itinerary day cards
      itinerariesSection += initialData.itineraries
        .map((itinerary, dayIndex) => `
      <div style="${cardStyle};">
        <!-- Clean Itinerary Header -->
        <div style="display: flex; margin-bottom: 0; overflow: hidden;">
          <!-- Left Box: Day and Days -->
          <div style="flex: 0 0 25%; background: ${brandGradients.primary}; color: white; padding: 16px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
            <div>
              <p style="font-size: 14px; font-weight: 600; margin: 0;">Day</p>
              <p style="font-size: 24px; font-weight: 700; margin: 4px 0;">${itinerary.dayNumber}</p>
              <p style="font-size: 12px; font-weight: 500; margin: 0; opacity: 0.9;">${itinerary.days}</p>
            </div>
          </div>

          <!-- Right Box: Description -->
          <div style="flex: 1; background: ${brandColors.white}; color: ${brandColors.text}; padding: 24px; display: flex; align-items: center; position: relative; overflow: hidden; border-left: 1px solid ${brandColors.border};">
            <div style="position: absolute; top: -20px; right: -20px; width: 80px; height: 80px; background: ${brandColors.light}; border-radius: 50%; opacity: 0.5;"></div>
            <div style="position: relative; z-index: 1; width: 100%;">
              <h3 style="font-size: 24px; font-weight: 800; margin: 0; color: ${brandColors.secondary}; line-height: 1.2;">
                ${itinerary.itineraryTitle?.replace(/^<p>/, "").replace(/<\/p>$/, "") || `Day ${itinerary.dayNumber} Activities`}
              </h3>
            </div>
          </div>
        </div>

        <!-- Enhanced Itinerary Content -->
        <div style="padding: 28px;">
          ${(itinerary.itineraryDescription && itinerary.itineraryDescription.trim()) ? `
            <div style="background: ${brandGradients.subtle}; padding: 20px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid ${brandColors.secondary};">
              <h4 style="font-size: 18px; font-weight: 700; color: ${brandColors.text}; margin: 0 0 12px 0; display: flex; align-items: center;">
                <span style="${iconStyle}">📋</span>
                Day Overview
              </h4>
              <div style="font-size: 16px; line-height: 1.7; color: ${brandColors.muted}; text-align: justify;">${(itinerary.itineraryDescription || "")
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
              <h4 style="font-size: 18px; font-weight: 700; color: ${brandColors.text}; margin: 0 0 16px 0; display: flex; align-items: center;">
                <span style="${iconStyle}">📸</span>
                Gallery
              </h4>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px;">
                ${itinerary.itineraryImages.slice(0, 3).map((img, idx) => `
                  <div style="position: relative; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="width: 100%; height: 200px; overflow: hidden;">
                      <img src="${img.url}" alt="Itinerary Image ${idx + 1}" style="width: 100%; height: 100%; object-fit: cover;" />
                    </div>
                    <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%); padding: 12px;">
                      <p style="color: white; margin: 0; font-size: 14px; font-weight: 500;">Day ${itinerary.dayNumber} - Photo ${idx + 1}</p>
                    </div>
                  </div>
                `).join("")}
              </div>
            </div>
          ` : ''}

          <!-- Enhanced Activities Section -->
          ${itinerary.activities && itinerary.activities.length > 0 ? `
            <div style="background: ${brandGradients.accent}; padding: 24px; border-radius: 12px; border-left: 4px solid ${brandColors.accent};">
              <h4 style="font-size: 20px; font-weight: 700; color: ${brandColors.text}; margin: 0 0 20px 0; display: flex; align-items: center;">
                <span style="${iconStyle}">🎯</span>
                Planned Activities
              </h4>
              <div style="display: grid; gap: 16px;">
                ${itinerary.activities.map((activity, actIdx) => `
                  <div style="background: ${brandColors.white}; padding: 16px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border-left: 4px solid ${brandColors.secondary};">
                    <div style="display: flex; align-items: center; margin-bottom: 8px;">
                      <div style="background: ${brandGradients.secondary}; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; margin-right: 12px;">
                        ${actIdx + 1}
                      </div>
                      <h5 style="font-size: 16px; font-weight: 700; color: ${brandColors.text}; margin: 0;">
                        ${activity.activityTitle || `Activity ${actIdx + 1}`}
                      </h5>
                    </div>
                    ${activity.activityDescription ? `
                      <p style="font-size: 14px; color: ${brandColors.muted}; margin: 8px 0 0 36px; line-height: 1.5;">
                        ${activity.activityDescription}
                      </p>
                    ` : ''}
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
     <div style="${cardStyle}; page-break-before: always; padding: 16px; background: #fff;">
            <!-- Section Header -->
            <h2 style="background: linear-gradient(to right, #ef4444, #f97316, #facc15); color: white; font-size: 28px; font-weight: bold; text-align: center;">
              Tour Highlights
            </h2>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: linear-gradient(to right, #ef4444, #f97316, #facc15); color: white;">
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
                  <tr style="border-bottom: 1px solid #ddd; background: #fff; color: #333;">
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

    const renderBulletList = (items: string[]) => items.map(i => `<div style="margin-bottom: 8px;">• ${i}</div>`).join('');

    const inclusionsSection = inclusionsArr.length
      ? `
  <div style="${cardStyle}; page-break-before: always;">
        <div style="${headerStyle};">
          <div style="font-size: 24px; font-weight: bold; color: ${brandColors.text};">Inclusions</div>
        </div>
        <div style="${contentStyle}; font-size: 16px;">
      ${renderBulletList(inclusionsArr)}
        </div>
      </div>
      `
      : "";
    const exclusionsSection = exclusionsArr.length
      ? `
  <div style="${cardStyle}; page-break-before: always;">
        <div style="${headerStyle};">
          <div style="font-size: 24px; font-weight: bold; color: ${brandColors.text};">Exclusions</div>
        </div>
        <div style="${contentStyle}; font-size: 16px;">
      ${renderBulletList(exclusionsArr)}
        </div>
      </div>
      `
      : "";
    const importantNotesSection = importantArr.length
      ? `
  <div style="${cardStyle}; page-break-before: always;">
        <div style="${headerStyle};">
          <div style="font-size: 24px; font-weight: bold; color: ${brandColors.text};">Important Notes</div>
        </div>
        <div style="${contentStyle}; font-size: 16px;">
      ${renderBulletList(importantArr)}
        </div>
      </div>
      `
      : "";
    const paymentPolicySection = paymentArr.length
      ? `
  <div style="${cardStyle}; page-break-before: always;">
        <div style="${headerStyle};">
          <div style="font-size: 24px; font-weight: bold; color: ${brandColors.text};">Payment Policy</div>
        </div>
        <div style="${contentStyle}; font-size: 16px;">
      ${renderBulletList(paymentArr)}
        </div>
      </div>
      `
      : "";
    const kitchenGroupPolicySection = kitchenArr.length
      ? `
  <div style="${cardStyle}; page-break-before: always;">
        <div style="${headerStyle};">
          <div style="font-size: 24px; font-weight: bold; color: ${brandColors.text};">Kitchen Group Policy</div>
        </div>
        <div style="${contentStyle}; font-size: 16px;">
      ${renderBulletList(kitchenArr)}
        </div>
      </div>
      `
      : "";
    const termsConditionsSection = termsArr.length
      ? `
  <div style="${cardStyle}; page-break-before: always;">
        <div style="${headerStyle};">
          <div style="font-size: 24px; font-weight: bold; color: ${brandColors.text};">Terms and Conditions</div>
        </div>
        <div style="${contentStyle}; font-size: 16px;">
      ${renderBulletList(termsArr)}
        </div>
      </div>
      `
      : "";
    const cancellationPolicySection = cancelArr.length
      ? `
      <div style="${cardStyle}; page-break-before: always;">
        <div style="${headerStyle};">
          <div style="font-size: 24px; font-weight: bold; color: ${brandColors.text};">Cancellation Policy</div>
        </div>
        <div style="${contentStyle}; font-size: 16px;">
      ${renderBulletList(cancelArr)}
        </div>
      </div>
      `
      : "";
    const airlineCancellationSection = airlineCancelArr.length
      ? `
      <div style="${cardStyle}; page-break-before: always;">
        <div style="${headerStyle};">
          <div style="font-size: 24px; font-weight: bold; color: ${brandColors.text};">Airline Cancellation Policy</div>
        </div>
        <div style="${contentStyle}; font-size: 16px;">
      ${renderBulletList(airlineCancelArr)}
        </div>
      </div>
      `
      : "";

    const usefulTipsSection = usefulTipsArr.length
      ? `
      <div style="${cardStyle}; page-break-before: always;">
        <div style="${headerStyle};">
          <div style="font-size: 24px; font-weight: bold; color: ${brandColors.text};">Useful Tips</div>
        </div>
        <div style="${contentStyle}; font-size: 16px;">
      ${renderBulletList(usefulTipsArr)}
        </div>
      </div>
      `
      : "";

    // 11. Footer / Company Details
  let companySection = "";
    if (
      selectedOption !== "Empty" &&
      selectedOption !== "SupplierA" &&
      selectedOption !== "SupplierB"
    ) {
      companySection = `
      <div style="border: 1px solid #ddd; margin: 16px 0; padding: 16px; display: flex; align-items: center;">
      <div style="width: 120px; height: 120px; margin-right: 16px;">
        <img src="${currentCompany.logo}" alt="${currentCompany.name} Logo" style="width: 100%; height: 100%; object-fit: contain;" />
      </div>
      <div style="font-weight: bold; font-size: 16px; color: #1a202c;">
      <div style="font-size:18px; background: linear-gradient(to right, #fb923c, #ef4444); -webkit-background-clip: text; color: transparent;">${currentCompany.name || ''}</div>
        <div>${currentCompany.address}</div>
        <div>Phone: ${currentCompany.phone}</div>
        <div>Email: <a href="mailto:${currentCompany.email}" style="color: #2563eb; text-decoration: underline;">${currentCompany.email}</a></div>
        <div>Website: <a href="${currentCompany.website || "#"}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">${currentCompany.website}</a></div>
      </div>
      </div>
      `;
    } else if (selectedOption === "SupplierA" || selectedOption === "SupplierB") {
      companySection = `
      <div style="border: 1px solid #ddd; margin: 16px 0; padding: 16px; display: flex; align-items: center;">
      <div style="width: 120px; height: 120px; margin-right: 16px;">
        <img src="${companyInfo.AH.logo}" alt="${companyInfo.AH.name} Logo" style="width: 100%; height: 100%; object-fit: contain;" />
      </div>
      <div style="font-weight: bold; font-size: 16px; color: #1a202c;">
      <div style="font-size:18px; background: linear-gradient(to right, #fb923c, #ef4444); -webkit-background-clip: text; color: transparent;">${companyInfo.AH.name}</div>
        <div>${companyInfo.AH.address}</div>
        <div>Phone: ${companyInfo.AH.phone}</div>
        <div>Email: <a href="mailto:${companyInfo.AH.email}" style="color: #2563eb; text-decoration: underline;">${companyInfo.AH.email}</a></div>
        <div>Website: <a href="${companyInfo.AH.website || "#"}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">${companyInfo.AH.website}</a></div>
      </div>
      </div>
      `;
    }

    // Assemble all sections.
    const fullHtml = `
      <div style="${containerStyle}">
        ${headerSection}
        ${customerSection}
        ${tourInfoSection}
  ${dynamicPricingSection}
        ${totalPriceSection}
        ${remarksSection}
  ${hotelSummarySection}
        ${itinerariesSection}
        ${inclusionsSection}
        ${exclusionsSection}
        ${importantNotesSection}
        ${paymentPolicySection}
        ${kitchenGroupPolicySection}
        ${termsConditionsSection}
        ${cancellationPolicySection}
        ${airlineCancellationSection}
  ${usefulTipsSection}
        ${companySection}    </div>
    `;    return fullHtml;
  }, [initialData, currentCompany, locations, hotels, selectedOption]);
  // --- Function to generate the PDF via the API ---
  const generatePDF = useCallback(async () => {
    setLoading(true);
    const htmlContent = buildHtmlContent();

    // Build footer HTML with company info and social links
  const footerHtml = (() => {
      const c = currentCompany;
      const showBrand = selectedOption !== "Empty";
      // Social links for Aagam Holidays
      const social = {
        facebook: "https://www.facebook.com/aagamholidays",
        instagram: "https://www.instagram.com/aagamholidays",
        twitter: "https://twitter.com/aagamholidays",
      };
  const brandBlock = showBrand ? `
        <div style="display:flex; align-items:center; gap:8px;">
          ${c.logo ? `<img src="${c.logo}" style="height:18px; width:auto; object-fit:contain;"/>` : ''}
          <span style="font-size:10px; font-weight:700; color:#111827;">${c.name ?? ''}</span>
        </div>
      ` : '';
  const addressLine = showBrand && c.address ? `<span style=\"font-size:9px; color:#6b7280;\">${c.address}</span>` : '';
      // Separate lines for phone and email
      const phoneLine = showBrand && c.phone ? `<span style=\"font-size:9px; color:#6b7280;\">${c.phone}</span>` : '';
      const emailLine = showBrand && c.email ? `<span style=\"font-size:9px; color:#6b7280;\">${c.email}</span>` : '';
      // Social icons with labels
      const socialLine = showBrand ? `
        <div style=\"display:flex; align-items:center; gap:14px; justify-content:flex-end; flex-wrap:wrap;\">
          ${c.website ? `<a href=\"${c.website}\" target=\"_blank\" style=\"font-size:9px; color:#2563eb; text-decoration:none; display:inline-flex; align-items:center; gap:4px;\">🔗 <span>${new URL(c.website).hostname.replace('www.','')}</span></a>` : ''}
          <a href=\"${social.facebook}\" target=\"_blank\" style=\"display:inline-flex; align-items:center; gap:4px; text-decoration:none;\">
            <svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"#1877F2\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M22.675 0H1.325C.594 0 0 .593 0 1.325v21.351C0 23.406.594 24 1.325 24h11.495v-9.294H9.847v-3.622h2.973V8.413c0-2.939 1.796-4.543 4.418-4.543 1.256 0 2.336.093 2.651.135v3.073l-1.82.001c-1.428 0-1.704.679-1.704 1.675v2.197h3.406l-.444 3.622h-2.962V24h5.807C23.406 24 24 23.406 24 22.676V1.325C24 .593 23.406 0 22.675 0z\"/></svg>
            <span style=\"font-size:9px; color:#374151;\">Facebook</span>
          </a>
          <a href=\"${social.instagram}\" target=\"_blank\" style=\"display:inline-flex; align-items:center; gap:4px; text-decoration:none;\">
            <svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"#E1306C\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M12 2.163c3.204 0 3.584.012 4.85.07 1.17.056 1.97.24 2.428.403a4.92 4.92 0 0 1 1.78 1.153 4.92 4.92 0 0 1 1.153 1.78c.163.458.347 1.258.403 2.428.058 1.266.07 1.646.07 4.851s-.012 3.584-.07 4.85c-.056 1.17-.24 1.97-.403 2.428a4.92 4.92 0 0 1-1.153 1.78 4.92 4.92 0 0 1-1.78 1.153c-.458.163-1.258.347-2.428.403-1.266.058-1.646.07-4.85.07s-3.584-.012-4.851-.07c-1.17-.056-1.97-.24-2.428-.403a4.92 4.92 0 0 1-1.78-1.153 4.92 4.92 0 0 1-1.153-1.78c-.163-.458-.347-1.258-.403-2.428C2.175 15.584 2.163 15.204 2.163 12s.012-3.584.07-4.851c.056-1.17.24-1.97.403-2.428A4.92 4.92 0 0 1 3.789 2.94a4.92 4.92 0 0 1 1.78-1.153c.458-.163 1.258-.347 2.428-.403C8.264 2.175 8.644 2.163 11.849 2.163H12zm0 1.837c-3.17 0-3.548.012-4.795.07-.998.046-1.54.213-1.897.355-.478.185-.82.407-1.178.765-.358.358-.58.7-.765 1.178-.142.357-.309.899-.355 1.897-.058 1.247-.07 1.625-.07 4.795s.012 3.548.07 4.795c.046.998.213 1.54.355 1.897.185.478.407.82.765 1.178.358.358.58.7.765 1.178.142.357.309.899.355 1.897.058 1.247.07 1.625.07 4.795s-.012 3.548-.07 4.795c-.046.998-.213 1.54-.355 1.897a3.079 3.079 0 0 0-.765 1.178 3.079 3.079 0 0 0-1.178.765c-.357.142-.899.309-1.897.355-1.247.058-1.625.07-4.795.07zm0 3.89a4.11 4.11 0 1 1 0 8.22 4.11 4.11 0 0 1 0-8.22zm0 1.837a2.273 2.273 0 1 0 0 4.546 2.273 2.273 0 0 0 0-4.546zm5.2-2.905a1.02 1.02 0 1 1 0 2.04 1.02 1.02 0 0 1 0-2.04z\"/></svg>
            <span style=\"font-size:9px; color:#374151;\">Instagram</span>
          </a>
          <a href=\"${social.twitter}\" target=\"_blank\" style=\"display:inline-flex; align-items:center; gap:4px; text-decoration:none;\">
            <svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"#1DA1F2\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M23.954 4.569c-.885.392-1.83.657-2.825.775a4.932 4.932 0 0 0 2.163-2.724 9.864 9.864 0 0 1-3.127 1.195 4.916 4.916 0 0 0-8.384 4.482A13.95 13.95 0 0 1 1.671 3.149a4.916 4.916 0 0 0 1.523 6.559 4.897 4.897 0 0 1-2.229-.616c-.054 2.281 1.581 4.415 3.949 4.89a4.904 4.904 0 0 1-2.224.085 4.918 4.918 0 0 0 4.588 3.417A9.867 9.867 0 0 1 0 19.54a13.94 13.94 0 0 0 7.548 2.212c9.057 0 14.01-7.513 13.995-14.262.009-.206.014-.412.014-.617z\"/></svg>
            <span style=\"font-size:9px; color:#374151;\">Twitter</span>
          </a>
        </div>
      ` : '';

      return `
        <div style=\"width:100%; font-family: Arial, sans-serif;\">
          <div style=\"height:56px; padding:8px 16px; box-sizing:border-box; display:flex; align-items:center; justify-content:space-between; border-top:1px solid #e5e7eb;\">
            <div style=\"display:flex; flex-direction:column; gap:2px;\">
              ${brandBlock}
              ${addressLine}
              ${phoneLine}
              ${emailLine}
            </div>
            <div style=\"text-align:right; display:flex; flex-direction:column; gap:2px; align-items:flex-end;\">
              ${socialLine}
              <span style=\"font-size:10px; color:#6b7280;\">Page <span class=\"pageNumber\"></span> / <span class=\"totalPages\"></span></span>
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
          margin: { top: "64px", bottom: "64px", left: "14px", right: "14px" },
          scale: 0.9,
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
  }, [initialData, buildHtmlContent]);

    useEffect(() => {
    if (initialData) {
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
      generatePDF();
    }
  }, [initialData, generatePDF]);

  if (!initialData) return <div>No data available</div>;
  return <div>{loading ? <p>Generating PDF...</p> : <p>PDF Generated Successfully</p>}</div>;
};

export default TourPackageQueryPDFGenerator;
