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

  // --- Enhanced Beautiful Styles for Aesthetic PDF ---
  const containerStyle = `
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    padding: 20px; 
    max-width: 1200px; 
    margin: auto;
    line-height: 1.6;
  `;
  
  const cardStyle = `
    background: white;
    border-radius: 16px; 
    box-shadow: 0 10px 25px rgba(0,0,0,0.08), 0 4px 10px rgba(0,0,0,0.05); 
    margin-bottom: 24px; 
    overflow: hidden; 
    page-break-inside: avoid; 
    break-inside: avoid;
    border: 1px solid rgba(148, 163, 184, 0.1);
  `;
  
  const headerStyle = `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white; 
    padding: 24px; 
    text-align: center;
    position: relative;
    overflow: hidden;
  `;
  
  const headerStyleAlt = `
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    color: white; 
    padding: 20px; 
    text-align: center;
    border-radius: 12px 12px 0 0;
  `;
  
  const contentStyle = `
    padding: 28px; 
    background: white; 
    color: #374151; 
    font-size: 16px;
    line-height: 1.7;
  `;
  
  const sectionTitleStyle = `
    font-size: 28px; 
    font-weight: 700; 
    margin: 0;
    text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    letter-spacing: -0.025em;
  `;
  
  const subTitleStyle = `
    font-size: 18px; 
    font-weight: 600; 
    margin-right: 12px;
    color: #1f2937;
    display: inline-block;
  `;
  
  const textStyle = `
    font-size: 16px; 
    color: #4b5563;
    font-weight: 400;
  `;

  const accentCardStyle = `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 16px;
    padding: 24px;
    margin: 16px 0;
    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
  `;

  const priceCardStyle = `
    background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%);
    border-radius: 16px;
    padding: 24px;
    margin: 20px 0;
    border: 2px solid rgba(132, 250, 176, 0.3);
    box-shadow: 0 10px 25px rgba(132, 250, 176, 0.2);
  `;

  const tableStyle = `
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  `;

  const tableHeaderStyle = `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 16px 12px;
    text-align: left;
    font-weight: 600;
    font-size: 15px;
    letter-spacing: 0.025em;
  `;

  const tableCellStyle = `
    padding: 12px;
    border-bottom: 1px solid #f3f4f6;
    color: #374151;
    font-size: 14px;
  `;

  const badgeStyle = `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    margin-left: 8px;
    display: inline-block;
  `;

  const iconStyle = `
    display: inline-block;
    margin-right: 8px;
    font-size: 18px;
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

    // 1. Enhanced Beautiful Header Section (Tour Name, Type and Images)
    const headerSection = `
      <div style="${cardStyle}; margin-bottom: 32px; page-break-before: always;">
        <div style="${headerStyle}; position: relative;">
          <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><defs><pattern id=\"grain\" patternUnits=\"userSpaceOnUse\" width=\"100\" height=\"100\"><circle cx=\"20\" cy=\"20\" r=\"1\" fill=\"white\" opacity=\"0.1\"/><circle cx=\"80\" cy=\"80\" r=\"1\" fill=\"white\" opacity=\"0.1\"/></pattern></defs><rect width=\"100\" height=\"100\" fill=\"url(%23grain)\"/></svg>'); opacity: 0.1;"></div>
          <div style="position: relative; z-index: 1;">
            <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
              <div style="width: 6px; height: 40px; background: white; margin-right: 16px; border-radius: 3px;"></div>
              <h1 style="font-size: 36px; margin: 0; font-weight: 800; letter-spacing: -0.05em; text-align: center; line-height: 1.1;">
                ${initialData.tourPackageQueryName}
              </h1>
              <div style="width: 6px; height: 40px; background: white; margin-left: 16px; border-radius: 3px;"></div>
            </div>
            <div style="text-align: center;">
              <span style="background: rgba(255,255,255,0.2); padding: 8px 24px; border-radius: 25px; font-size: 18px; font-weight: 600; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.3);">
                ✨ ${initialData.tourPackageQueryType} Package
              </span>
            </div>
          </div>
        </div>
        
        ${initialData.images && initialData.images.length > 0 ? `
          <div style="position: relative;">
            ${initialData.images.slice(0, 1).map((image, index) => `
              <div style="width: 100%; height: 400px; overflow: hidden; position: relative; border-radius: 0 0 16px 16px;">
                <img src="${image.url}" alt="Tour Image ${index + 1}" style="width: 100%; height: 100%; object-fit: cover;" />
                <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%); padding: 24px;">
                  <p style="color: white; margin: 0; font-size: 16px; font-weight: 500; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">
                    🌟 Experience the Ultimate Journey
                  </p>
                </div>
              </div>
            `).join("")}
          </div>
        ` : ''}
      </div>
    `;

    // 2. Enhanced Customer Details Section
    const customerSection = `
      <div style="${cardStyle}; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border: 2px solid #e2e8f0;">
        <div style="background: linear-gradient(135deg, #475569 0%, #64748b 100%); color: white; padding: 16px; border-radius: 14px 14px 0 0;">
          <h3 style="margin: 0; font-size: 20px; font-weight: 700; display: flex; align-items: center;">
            <span style="${iconStyle}">📋</span>
            Query Details - ${initialData.tourPackageQueryNumber}
          </h3>
        </div>
        <div style="padding: 24px;">
          ${selectedOption !== "SupplierA" && selectedOption !== "SupplierB" ? `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
              <div style="background: white; padding: 16px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border-left: 4px solid #667eea;">
                <div style="font-size: 14px; color: #64748b; font-weight: 600; margin-bottom: 4px;">CUSTOMER</div>
                <div style="font-size: 16px; font-weight: 700; color: #1e293b;">${initialData.customerName}</div>
                <div style="font-size: 14px; color: #475569; margin-top: 4px;">📞 ${initialData.customerNumber}</div>
              </div>
              <div style="background: white; padding: 16px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border-left: 4px solid #10b981;">
                <div style="font-size: 14px; color: #64748b; font-weight: 600; margin-bottom: 4px;">ASSOCIATE PARTNER</div>
                <div style="font-size: 16px; font-weight: 700; color: #1e293b;">${initialData.associatePartner?.name || 'N/A'}</div>
                <div style="font-size: 14px; color: #475569; margin-top: 4px;">
                  📞 ${initialData.associatePartner?.mobileNumber || 'N/A'} | 
                  ✉️ ${initialData.associatePartner?.email || 'N/A'}
                </div>
              </div>
            </div>
          ` : ''}
          
          ${preparedBy ? `
            <div style="background: white; padding: 16px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border-left: 4px solid #f59e0b;">
              <div style="font-size: 14px; color: #64748b; font-weight: 600; margin-bottom: 4px;">PREPARED BY</div>
              <div style="font-size: 16px; font-weight: 700; color: #1e293b;">${preparedBy.name}</div>
              <div style="font-size: 14px; color: #475569; margin-top: 4px;">✉️ ${preparedBy.email}</div>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    // 3. Enhanced Tour Information Section
    const tourInfoSection = `
      <div style="${cardStyle}; page-break-before: always;">
        <div style="${headerStyleAlt}">
          <h2 style="${sectionTitleStyle}; display: flex; align-items: center; justify-content: center;">
            <span style="${iconStyle}">🗺️</span>
            Tour Information
          </h2>
        </div>
        <div style="${contentStyle}">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">
            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 20px; border-radius: 12px; border-left: 4px solid #f59e0b;">
              <div style="font-size: 14px; color: #92400e; font-weight: 600; margin-bottom: 8px;">📍 DESTINATION</div>
              <div style="font-size: 18px; font-weight: 700; color: #1f2937;">
                ${locations.find((loc) => loc.id === initialData.locationId)?.label || "Not specified"}
              </div>
            </div>
            
            ${initialData.numDaysNight ? `
              <div style="background: linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 100%); padding: 20px; border-radius: 12px; border-left: 4px solid #8b5cf6;">
                <div style="font-size: 14px; color: #6b21a8; font-weight: 600; margin-bottom: 8px;">⏱️ DURATION</div>
                <div style="font-size: 18px; font-weight: 700; color: #1f2937;">${initialData.numDaysNight}</div>
              </div>
            ` : ''}
          </div>

          ${(initialData.tourStartsFrom || initialData.tourEndsOn) ? `
            <div style="background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%); padding: 20px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #ec4899;">
              <div style="font-size: 14px; color: #be185d; font-weight: 600; margin-bottom: 12px;">📅 TRAVEL DATES</div>
              <div style="display: flex; gap: 24px; align-items: center;">
                ${initialData.tourStartsFrom ? `
                  <div>
                    <div style="font-size: 12px; color: #9f1239; font-weight: 600;">FROM</div>
                    <div style="font-size: 16px; font-weight: 700; color: #1f2937;">${format(initialData.tourStartsFrom, "dd MMM, yyyy")}</div>
                  </div>
                ` : ''}
                ${(initialData.tourStartsFrom && initialData.tourEndsOn) ? `
                  <div style="font-size: 20px; color: #9f1239;">→</div>
                ` : ''}
                ${initialData.tourEndsOn ? `
                  <div>
                    <div style="font-size: 12px; color: #9f1239; font-weight: 600;">TO</div>
                    <div style="font-size: 16px; font-weight: 700; color: #1f2937;">${format(initialData.tourEndsOn, "dd MMM, yyyy")}</div>
                  </div>
                ` : ''}
              </div>
            </div>
          ` : ''}

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
            ${initialData.transport ? `
              <div style="background: white; padding: 16px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border-left: 4px solid #06b6d4;">
                <div style="font-size: 14px; color: #0e7490; font-weight: 600; margin-bottom: 4px;">🚗 TRANSPORT</div>
                <div style="font-size: 16px; color: #1f2937; font-weight: 500;">${initialData.transport}</div>
              </div>
            ` : ''}
            
            ${initialData.pickup_location ? `
              <div style="background: white; padding: 16px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border-left: 4px solid #10b981;">
                <div style="font-size: 14px; color: #059669; font-weight: 600; margin-bottom: 4px;">📍 PICKUP</div>
                <div style="font-size: 16px; color: #1f2937; font-weight: 500;">${initialData.pickup_location}</div>
              </div>
            ` : ''}
            
            ${initialData.drop_location ? `
              <div style="background: white; padding: 16px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border-left: 4px solid #f59e0b;">
                <div style="font-size: 14px; color: #d97706; font-weight: 600; margin-bottom: 4px;">🏁 DROP</div>
                <div style="font-size: 16px; color: #1f2937; font-weight: 500;">${initialData.drop_location}</div>
              </div>
            ` : ''}
          </div>

          ${(initialData.numAdults || initialData.numChild5to12 || initialData.numChild0to5) ? `
            <div style="background: linear-gradient(135deg, #e0f2fe 0%, #b3e5fc 100%); padding: 20px; border-radius: 12px; margin-top: 20px; border-left: 4px solid #0288d1;">
              <div style="font-size: 14px; color: #01579b; font-weight: 600; margin-bottom: 12px;">👥 TRAVELLERS</div>
              <div style="display: flex; gap: 24px; flex-wrap: wrap;">
                ${initialData.numAdults ? `
                  <div style="text-align: center;">
                    <div style="font-size: 24px; font-weight: 800; color: #1f2937;">${initialData.numAdults}</div>
                    <div style="font-size: 12px; color: #01579b; font-weight: 600;">Adults</div>
                  </div>
                ` : ''}
                ${initialData.numChild5to12 ? `
                  <div style="text-align: center;">
                    <div style="font-size: 24px; font-weight: 800; color: #1f2937;">${initialData.numChild5to12}</div>
                    <div style="font-size: 12px; color: #01579b; font-weight: 600;">Children (5-12)</div>
                  </div>
                ` : ''}
                ${initialData.numChild0to5 ? `
                  <div style="text-align: center;">
                    <div style="font-size: 24px; font-weight: 800; color: #1f2937;">${initialData.numChild0to5}</div>
                    <div style="font-size: 12px; color: #01579b; font-weight: 600;">Children (0-5)</div>
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
      <div style="${priceCardStyle}; text-align: center; position: relative; overflow: hidden;">
        <div style="position: absolute; top: -50px; right: -50px; width: 120px; height: 120px; background: rgba(255,255,255,0.1); border-radius: 50%; opacity: 0.5;"></div>
        <div style="position: absolute; bottom: -30px; left: -30px; width: 80px; height: 80px; background: rgba(255,255,255,0.1); border-radius: 50%; opacity: 0.3;"></div>
        
        <div style="position: relative; z-index: 1;">
          <h3 style="font-size: 24px; font-weight: 800; color: #1f2937; margin: 0 0 16px 0; display: flex; align-items: center; justify-content: center;">
            <span style="${iconStyle}">💎</span>
            Total Package Investment
          </h3>
          
          <div style="background: white; border-radius: 16px; padding: 32px; margin: 16px 0; box-shadow: 0 8px 25px rgba(0,0,0,0.1);">
            <div style="font-size: 56px; font-weight: 900; color: #1f2937; margin-bottom: 8px; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <span style="color: #059669; font-size: 48px;">₹</span> ${formatINR(initialData.totalPrice)}
            </div>
            <div style="font-size: 16px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
              Complete Tour Package Cost
            </div>
          </div>
          
          <div style="background: rgba(255,255,255,0.3); padding: 12px 24px; border-radius: 25px; display: inline-block; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.4);">
            <span style="font-size: 14px; font-weight: 700; color: #1f2937;">🌟 Best Value Guaranteed</span>
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
          <div style="background: ${index % 2 === 0 ? '#f8fafc' : 'white'}; padding: 20px; border-radius: 12px; margin-bottom: 12px; border-left: 4px solid #667eea; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="flex: 1;">
                <div style="font-size: 18px; font-weight: 700; color: #1f2937; margin-bottom: 4px;">
                  ${item.name || 'Pricing Component'}
                </div>
                ${item.description ? `
                  <div style="font-size: 14px; color: #6b7280; line-height: 1.5;">
                    ${item.description}
                  </div>
                ` : ''}
              </div>
              <div style="text-align: right; margin-left: 20px;">
                <div style="font-size: 24px; font-weight: 800; color: #059669; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                  ${item.price || 'On Request'}
                </div>
              </div>
            </div>
          </div>
        `).join('');

        dynamicPricingSection = `
          <div style="${cardStyle}; border: 2px solid #c7d2fe; margin-bottom: 24px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px; position: relative; overflow: hidden;">
              <div style="position: absolute; top: -20px; right: -20px; width: 100px; height: 100px; background: rgba(255,255,255,0.1); border-radius: 50%; opacity: 0.5;"></div>
              <div style="position: relative; z-index: 1;">
                <h3 style="font-size: 28px; font-weight: 800; margin: 0; display: flex; align-items: center;">
                  <span style="${iconStyle}">💰</span>
                  Detailed Pricing Breakdown
                </h3>
                <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Complete cost analysis for your tour package</p>
              </div>
            </div>
            <div style="padding: 28px; background: #ffffff;">
              ${pricingItems}
            </div>
          </div>
        `;
      }
    }

    // 6. Enhanced Remarks Section
    const remarksSection =
      initialData.remarks && initialData.remarks.trim() !== ""
        ? `
      <div style="${cardStyle}; border: 2px solid #fde68a; background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 20px; border-radius: 14px 14px 0 0;">
          <h3 style="font-size: 22px; font-weight: 800; margin: 0; display: flex; align-items: center;">
            <span style="${iconStyle}">📝</span>
            Important Notes & Remarks
          </h3>
        </div>
        <div style="padding: 24px;">
          <div style="font-size: 16px; line-height: 1.7; color: #1f2937; background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
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
        <div style="background: #f9fafb; padding: 24px; border-bottom: 1px solid #fbd3bd;">
          <h2 style="font-size: 32px; font-weight: 800; text-align: center; background: linear-gradient(to right, #ef4444, #f97316); -webkit-background-clip: text; color: transparent; margin: 0;">
            Hotel, Room Allocation & Transport Details
          </h2>
          <p style="text-align:center; color:#6b7280; margin: 8px 0 0; font-size: 16px;">Comprehensive day-wise accommodation and transport overview</p>
        </div>
        <div style="padding: 0;">
          ${initialData.itineraries.map((it) => `
            <div style="border-bottom: 1px solid #f3f4f6; padding: 16px 20px;">
              <div style="display:flex; align-items:flex-start; gap:16px; margin-bottom: 8px;">
                <div style="width:48px; height:48px; background: linear-gradient(to right, #ef4444, #f97316); color:white; border-radius:12px; display:flex; align-items:center; justify-content:center; font-weight:700;">
                  ${it.dayNumber}
                </div>
                <div>
                  <div style="font-size:18px; font-weight:700; color:#111827;">Day ${it.dayNumber}: ${it.days}</div>
                  ${(() => { const t = it.itineraryTitle ? String(it.itineraryTitle) : ''; const cleaned = t.replace(/^<p>/i, '').replace(/<\/p>$/i, ''); return it.itineraryTitle ? '<div style="font-size:14px; color:#374151;">' + cleaned + '</div>' : ''; })()}
                </div>
              </div>
              ${(it.hotelId && hotels.find(h => h.id === it.hotelId)) ? `
                <div style=\"display:flex; gap:16px; align-items:flex-start;\">
                  <div style=\"width:192px; height:128px; background:#f3f4f6; border-radius:8px; overflow:hidden; flex-shrink:0;\">
                    <img src=\"${hotels.find(h => h.id === it.hotelId)?.images?.[0]?.url || ''}\" alt=\"Hotel\" style=\"width:100%; height:100%; object-fit:cover;\" />
                  </div>
                  <div style=\"flex:1;\">
                    <div style=\"margin-bottom:8px;\">
                      <a href=\"${hotels.find(h => h.id === it.hotelId)?.link || '#'}\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"font-size:18px; font-weight:600; color:#111827; text-decoration:underline;\">${hotels.find(h => h.id === it.hotelId)?.name || ''}</a>
                    </div>
                    ${(it.roomAllocations && it.roomAllocations.length>0) ? `
                      <div style="margin-top: 12px;">
                        <table style="${tableStyle}">
                          <thead>
                            <tr>
                              <th style="${tableHeaderStyle}">🏨 Room Type</th>
                              <th style="${tableHeaderStyle}">👥 Occupancy</th>
                              <th style="${tableHeaderStyle}; text-align: center;">📊 Qty</th>
                              <th style="${tableHeaderStyle}">🎫 Voucher No.</th>
                            </tr>
                          </thead>
                          <tbody>
          ${it.roomAllocations.map((room:any, index: number) => `
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
                                <span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 4px 12px; border-radius: 12px; font-weight: 600;">
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
                          const plans = Array.from(new Set((it.roomAllocations || []).map((r:any) => r?.mealPlan?.name || r.mealPlan).filter(Boolean)));
                          return plans.length ? `
                            <div style="margin-top: 12px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 12px 16px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                              <span style="font-weight: 700; color: #92400e;">🍽️ Meal Plan:</span> 
                              <span style="color: #1f2937; font-weight: 600;">${plans.join(' / ')}</span>
                            </div>
                          ` : '';
                        })()}
                      </div>
                    ` : ''}
                  </div>
                </div>
              ` : ''}
              ${(it.transportDetails && it.transportDetails.length>0) ? `
                <div style=\"margin-top:12px; padding-top:8px; border-top:1px solid #e5e7eb;\">
                  <div style=\"font-size:14px; font-weight:600; color:#9a3412; margin-bottom:8px;\">Transport Details</div>
                  ${it.transportDetails.map((t:any) => `
                    <div style=\"display:flex; align-items:center; justify-content:space-between; background:#fff7ed; padding:8px; border-radius:8px; margin-bottom:8px;\">
                      <div style=\"font-weight:600; color:#7c2d12;\">${t?.vehicleType?.name || 'Vehicle'}</div>
                      <div style=\"font-size:14px; color:#7c2d12;\">${'Qty: ' + (t.quantity || 1) + (t.capacity ? ' | Capacity: ' + t.capacity : '')}</div>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          `).join('')}
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
  // Enhanced Itinerary header with beautiful design
      itinerariesSection += `
    <div style="${cardStyle} page-break-before: always; border: none; box-shadow: none; background: transparent;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 32px; text-align: center; border-radius: 16px; position: relative; overflow: hidden;">
        <div style="position: absolute; top: -50px; right: -50px; width: 150px; height: 150px; background: rgba(255,255,255,0.1); border-radius: 50%; opacity: 0.5;"></div>
        <div style="position: absolute; bottom: -30px; left: -30px; width: 100px; height: 100px; background: rgba(255,255,255,0.1); border-radius: 50%; opacity: 0.3;"></div>
        <div style="position: relative; z-index: 1;">
          <h2 style="font-size: 36px; font-weight: 900; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.2); letter-spacing: -0.02em;">
            🗓️ Travel Itinerary
          </h2>
          <p style="margin: 8px 0 0 0; font-size: 18px; opacity: 0.9; font-weight: 500;">Your day-by-day adventure guide</p>
        </div>
      </div>
    </div>
  `;
      // Enhanced individual itinerary day cards
      itinerariesSection += initialData.itineraries
        .map((itinerary, dayIndex) => `
      <div style="${cardStyle}; background: white; padding: 0; page-break-after: always; border: 2px solid #e5e7eb;">
        <!-- Enhanced Itinerary Header -->
        <div style="display: flex; margin-bottom: 0; overflow: hidden; border-radius: 14px 14px 0 0;">
          <!-- Left Box: Day and Days -->
          <div style="flex: 0 0 25%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative;">
            <div style="position: absolute; top: -10px; right: -10px; width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 50%; opacity: 0.5;"></div>
            <div style="position: relative; z-index: 1;">
              <p style="font-size: 32px; font-weight: 900; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">Day</p>
              <p style="font-size: 48px; font-weight: 900; margin: 8px 0; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">${itinerary.dayNumber}</p>
              <p style="font-size: 16px; font-weight: 600; margin: 0; opacity: 0.9;">${itinerary.days}</p>
            </div>
          </div>

          <!-- Right Box: Description -->
          <div style="flex: 1; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 24px; display: flex; align-items: center; position: relative; overflow: hidden;">
            <div style="position: absolute; top: -20px; right: -20px; width: 80px; height: 80px; background: rgba(255,255,255,0.1); border-radius: 50%; opacity: 0.5;"></div>
            <div style="position: relative; z-index: 1; width: 100%;">
              <h3 style="font-size: 24px; font-weight: 800; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.2); line-height: 1.2;">
                ${itinerary.itineraryTitle?.replace(/^<p>/, "").replace(/<\/p>$/, "") || `Day ${itinerary.dayNumber} Activities`}
              </h3>
            </div>
          </div>
        </div>

        <!-- Enhanced Itinerary Content -->
        <div style="padding: 28px;">
          ${(itinerary.itineraryDescription && itinerary.itineraryDescription.trim()) ? `
            <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 20px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #667eea;">
              <h4 style="font-size: 18px; font-weight: 700; color: #1f2937; margin: 0 0 12px 0; display: flex; align-items: center;">
                <span style="${iconStyle}">📋</span>
                Day Overview
              </h4>
              <div style="font-size: 16px; line-height: 1.7; color: #374151; text-align: justify;">
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
              <h4 style="font-size: 18px; font-weight: 700; color: #1f2937; margin: 0 0 16px 0; display: flex; align-items: center;">
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
            <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); padding: 24px; border-radius: 12px; border-left: 4px solid #10b981;">
              <h4 style="font-size: 20px; font-weight: 700; color: #1f2937; margin: 0 0 20px 0; display: flex; align-items: center;">
                <span style="${iconStyle}">🎯</span>
                Planned Activities
              </h4>
              <div style="display: grid; gap: 16px;">
                ${itinerary.activities.map((activity, actIdx) => `
                  <div style="background: white; padding: 16px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border-left: 4px solid #059669;">
                    <div style="display: flex; align-items: center; margin-bottom: 8px;">
                      <div style="background: #10b981; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; margin-right: 12px;">
                        ${actIdx + 1}
                      </div>
                      <h5 style="font-size: 16px; font-weight: 700; color: #1f2937; margin: 0;">
                        ${activity.activityTitle || `Activity ${actIdx + 1}`}
                      </h5>
                    </div>
                    ${activity.activityDescription ? `
                      <p style="font-size: 14px; color: #374151; margin: 8px 0 0 36px; line-height: 1.5;">
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
        <div style="${headerStyle}; display: flex; align-items: center;">
          <div style="font-size: 24px; font-weight: bold;">Inclusions</div>
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
        <div style="${headerStyle}; display: flex; align-items: center;">
          <div style="font-size: 24px; font-weight: bold;">Exclusions</div>
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
        <div style="${headerStyle}; display: flex; align-items: center;">
          <div style="font-size: 24px; font-weight: bold;">Important Notes</div>
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
        <div style="${headerStyle}; display: flex; align-items: center;">
          <div style="font-size: 24px; font-weight: bold;">Payment Policy</div>
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
        <div style="${headerStyle}; display: flex; align-items: center;">
          <div style="font-size: 24px; font-weight: bold;">Kitchen Group Policy</div>
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
        <div style="${headerStyle}; display: flex; align-items: center;">
          <div style="font-size: 24px; font-weight: bold;">Terms and Conditions</div>
        </div>
        <div style="${contentStyle}; font-size: 16px;">
      ${renderBulletList(termsArr)}
        </div>
      </div>
      `
      : "";
    const cancellationPolicySection = cancelArr.length
      ? `
      <div style="${cardStyle}">
        <div style="${headerStyle}; display: flex; align-items: center;">
          <div style="font-size: 24px; font-weight: bold;">Cancellation Policy</div>
        </div>
        <div style="${contentStyle}; font-size: 16px;">
      ${renderBulletList(cancelArr)}
        </div>
      </div>
      `
      : "";
    const airlineCancellationSection = airlineCancelArr.length
      ? `
      <div style="${cardStyle}">
        <div style="${headerStyle}; display: flex; align-items: center;">
          <div style="font-size: 24px; font-weight: bold;">Airline Cancellation Policy</div>
        </div>
        <div style="${contentStyle}; font-size: 16px;">
      ${renderBulletList(airlineCancelArr)}
        </div>
      </div>
      `
      : "";

    const usefulTipsSection = usefulTipsArr.length
      ? `
      <div style="${cardStyle}">
        <div style="${headerStyle}; display: flex; align-items: center;">
          <div style="font-size: 24px; font-weight: bold;">Useful Tips</div>
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
