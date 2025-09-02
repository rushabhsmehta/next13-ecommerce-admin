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

  // --- Helper styles (converted from your Tailwind classes) ---
  const containerStyle =
    "font-family: Arial, sans-serif; padding: 16px; max-width: 1200px; margin: auto;";
  const cardStyle =
    "border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 16px; overflow: hidden; page-break-inside: avoid; break-inside: avoid;";
  const headerStyle =
    "background: linear-gradient(to right, #ef4444, #f97316); color: white; padding: 16px; text-align: center;";
  const contentStyle =
    "padding: 16px; background: #ffffff; color: #4a5568; font-size: 16px;";
  const sectionTitleStyle =
    "font-size: 24px; font-weight: bold; margin: 0;";
  const subTitleStyle =
    "font-size: 18px; font-weight: bold; margin-right: 8px;";
  const textStyle = "font-size: 16px; color: #1a202c;";
  const gradientFooter =
    "background: linear-gradient(to right, #ef4444, #f97316); color: white; padding: 16px;";

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

    // 1. Header Section (Tour Name, Type and Images)
    const headerSection = `
  <div style="${cardStyle}; page-break-before: always;">
        <div style="${headerStyle}">
          <h1 style="font-size: 28px; margin: 0;">${initialData.tourPackageQueryName}</h1>
          <h2 style="font-size: 24px; margin: 0;">${initialData.tourPackageQueryType} Package</h2>
        </div>
        ${initialData.images
        .map(
          (image, index) => `
            <div style="width: 100%; height: 500px; overflow: hidden;">
              <img src="${image.url}" alt="Tour Image ${index + 1}" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
          `
        )
        .join("")}
      </div>
    `;

    // 2. Customer Details Section
    const customerSection = `
      <div style="${cardStyle}; padding: 16px;">
        <div style="font-size: 20px; font-weight: bold; margin-bottom: 8px;">
          ${initialData.tourPackageQueryNumber}
        </div>
        ${selectedOption !== "SupplierA" && selectedOption !== "SupplierB"
        ? `
          <div style="font-size: 16px; color: #4a5568;">
            <div style="margin-bottom: 8px;">
              <span style="font-weight: bold;">Customer:</span> ${initialData.customerName} | ${initialData.customerNumber}
            </div>
            <div>
              <span style="font-weight: bold;">Associate Partner:</span> ${initialData.associatePartner?.name} | ${initialData.associatePartner?.mobileNumber} | ${initialData.associatePartner?.email}
            </div>
          </div>
          `
        : ""
      }
      ${preparedBy ? `<div style="margin-top:8px; font-size: 14px; color: #6b7280;"><span style="font-weight:600;">Prepared by:</span> ${preparedBy.name} (${preparedBy.email})</div>` : ''}
      </div>
    `;

    // 3. Tour Information Section
    const tourInfoSection = `
  <div style="${cardStyle}; page-break-before: always;">
        <div style="${headerStyle}">
          <h2 style="${sectionTitleStyle}">Tour Information</h2>
        </div>
        <div style="${contentStyle}">
          <div style="margin-bottom: 12px;">
            <span style="${subTitleStyle}">Location:</span>
            <span style="${textStyle}">${locations.find((loc) => loc.id === initialData.locationId)?.label || ""}</span>
          </div>
          ${initialData.numDaysNight
        ? `<div style="margin-bottom: 12px;">
                   <span style="${subTitleStyle}">Duration:</span>
                   <span style="${textStyle}">${initialData.numDaysNight}</span>
                 </div>`
        : ""
      }
          <div style="display: flex; gap: 16px; margin-bottom: 12px;">
            ${initialData.tourStartsFrom
        ? `<div>
                     <span style="${subTitleStyle}">Period:</span>
                     <span style="${textStyle}">${format(
          initialData.tourStartsFrom,
          "dd-MM-yyyy"
        )}</span>
                   </div>`
        : ""
      }
            ${initialData.tourEndsOn
        ? `<div>
                     <span style="${subTitleStyle}">To:</span>
                     <span style="${textStyle}">${format(
          initialData.tourEndsOn,
          "dd-MM-yyyy"
        )}</span>
                   </div>`
        : ""
      }
          </div>
          ${initialData.transport
        ? `<div style="margin-bottom: 12px;">
                   <span style="${subTitleStyle}">Transport:</span>
                   <span style="${textStyle}">${initialData.transport}</span>
                 </div>`
        : ""
      }
          ${initialData.pickup_location
        ? `<div style="margin-bottom: 12px;">
                   <span style="${subTitleStyle}">Pickup:</span>
                   <span style="${textStyle}">${initialData.pickup_location}</span>
                 </div>`
        : ""
      }
          ${initialData.drop_location
        ? `<div style="margin-bottom: 12px;">
                   <span style="${subTitleStyle}">Drop:</span>
                   <span style="${textStyle}">${initialData.drop_location}</span>
                 </div>`
        : ""
      }
          ${initialData.numAdults
        ? `<div style="margin-bottom: 12px;">
                   <span style="${subTitleStyle}">Adults:</span>
                   <span style="${textStyle}">${initialData.numAdults}</span>
                 </div>`
        : ""
      }
          ${initialData.numChild5to12
        ? `<div style="margin-bottom: 12px;">
                   <span style="${subTitleStyle}">Children (5-12 Years):</span>
                   <span style="${textStyle}">${initialData.numChild5to12}</span>
                 </div>`
        : ""
      }
          ${initialData.numChild0to5
        ? `<div style="margin-bottom: 12px;">
                   <span style="${subTitleStyle}">Children (0-5 Years):</span>
                   <span style="${textStyle}">${initialData.numChild0to5}</span>
                 </div>`
        : ""
      }
        </div>
      </div>
    `;

  // Legacy Tour Pricing section removed to match display page.
  const pricingSection = "";

    // 5. Total Price Section
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
      <div style="${cardStyle}; border: 2px solid #fed7aa; border-radius: 12px; overflow: hidden;">
        <div style="background: #fafafa; padding: 20px;">
          <h3 style="font-size: 28px; font-weight: 800; background: linear-gradient(to right, #fb923c, #f87171, #f472b6); -webkit-background-clip: text; color: transparent; margin: 0;">
            🎯 Total Package Price
          </h3>
        </div>
        <div style="padding: 24px; text-align: center;">
          <div style="font-size: 48px; font-weight: 800; color: #111827; margin-bottom: 12px;">
            <span style="color:#ea580c;">₹ </span>${formatINR(initialData.totalPrice)}
          </div>
          <div style="font-size: 16px; color: #374151; background: #fff7ed; padding: 10px 16px; border-radius: 999px; display: inline-block;">
            <span style="font-weight: 600;">Final Tour Package Cost</span>
          </div>
        </div>
      </div>
    `
        : "";

    // 6. Remarks Section
    const remarksSection =
      initialData.remarks !== ""
        ? `
      <div style="${cardStyle}; padding: 16px;">
        <div style="font-size: 16px;">${initialData.remarks}</div>
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
                      <table style=\"width:100%; border-collapse:collapse;\">
                        <thead>
                          <tr>
                            <th style=\"padding:6px; text-align:left; color:#111827; border-bottom:1px solid #e5e7eb;\">Room Type</th>
                            <th style=\"padding:6px; text-align:left; color:#111827; border-bottom:1px solid #e5e7eb;\">Occupancy</th>
                            <th style=\"padding:6px; text-align:center; color:#111827; border-bottom:1px solid #e5e7eb;\">Qty</th>
                            <th style=\"padding:6px; text-align:left; color:#111827; border-bottom:1px solid #e5e7eb;\">Voucher No.</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${it.roomAllocations.map((room:any) => `
                            <tr>
                              <td style=\"padding:6px; border-top:1px solid #f3f4f6;\">
                                ${room.useCustomRoomType ? room.customRoomType : (room?.roomType?.name || room.roomType || 'Standard')}
                                ${room.useCustomRoomType ? '<span style=\"margin-left:4px; font-size:10px; background:#dbeafe; color:#1d4ed8; padding:1px 4px; border-radius:2px;\">Custom</span>' : ''}
                              </td>
                              <td style=\"padding:6px; border-top:1px solid #f3f4f6;\">${room?.occupancyType?.name || room.occupancyType || room.occupancyTypeId || '-'}</td>
                              <td style=\"padding:6px; text-align:center; border-top:1px solid #f3f4f6;\">${room.quantity || 1}</td>
                              <td style=\"padding:6px; border-top:1px solid #f3f4f6; font-size:12px; color:#6b7280;\">${room.voucherNumber || '-'}</td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                      ${(() => {
                        const plans = Array.from(new Set((it.roomAllocations || []).map((r:any) => r?.mealPlan?.name || r.mealPlan).filter(Boolean)));
                        return plans.length ? `<div style=\\\"margin-top:8px; font-size:14px; color:#374151; font-style:italic;\\\"><span style=\\\"font-weight:600;\\\">Meal Plan:</span> ${plans.join(' / ')}</div>` : '';
                      })()}
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
  // Render the Itinerary header once.
      itinerariesSection += `
    <div style="${cardStyle} page-break-before: always">
      <div style="background: linear-gradient(to right, #ef4444, #f97316, #facc15); color: white; padding: 8px; text-align: center;">
        <h2 style="font-size: 24px; font-weight: bold; margin: 0;">Itinerary</h2>
      </div>
    </div>
  `;
      // Map over each itinerary.
      itinerariesSection += initialData.itineraries
        .map((itinerary) => `
      <div style="${cardStyle}; background: #fff; padding: 16px; page-break-after: always;">
        <!-- Itinerary Header -->
     <div style="display: flex; margin-bottom: 8px;">
  <!-- Left Box: Day and Days -->
 <div style="flex: 0 0 20%; background: linear-gradient(to right, #ef4444, #f97316, #facc15); color: white; padding: 8px; text-align: center; display: flex; align-items: center; justify-content: center;">
  <p style="font-size: 24px; font-weight: bold; margin: 0;">
    Day ${itinerary.dayNumber}: ${itinerary.days}
  </p>
</div>

  <!-- Right Box: Description -->
  <div style="flex: 1; background: linear-gradient(to right, #ef4444, #f97316, #facc15); color: white; padding: 16px; text-align: left;">
    <p style="font-size: 24px; font-weight: bold; margin: 0;">
      ${itinerary.itineraryTitle?.replace(/^<p>/, "").replace(/<\/p>$/, "")}
    </p>
  </div>
</div>
   <!-- Itinerary Description & Images -->
        <div style="padding: 8px;">
      <div style="font-size: 16px; text-align: justify; margin-bottom: 8px;">
  ${(itinerary.itineraryDescription || "")
            // Replace both opening and closing <p> tags with <br>
            .replace(/<\/?p>/gi, "<br>")
            // Collapse multiple <br> tags into a single <br>
            .replace(/(<br>\s*)+/gi, "<br>")
            // Remove extra whitespace characters
            .replace(/\s+/g, " ")
            // Trim any leading/trailing whitespace
            .trim().replace(/<\/?(html|body)>/gi, '')
            .replace(/<!--StartFragment-->/gi, '')
            .replace(/<!--EndFragment-->/gi, '')
            // Replace opening <p> tags with <br> and remove closing </p> tags
            .replace(/<p>/gi, '<br>')
            .replace(/<\/p>/gi, '')
            // Normalize any <br> tag (remove extra attributes)
            .replace(/<br\s*[^>]*>/gi, '<br>')
            // Replace multiple consecutive <br> tags with a single <br>
            .replace(/(<br>\s*){2,}/gi, '<br>')
            // Remove extra whitespace and newlines
            .replace(/\s+/g, ' ')
            .trim()
          }
</div>

          ${itinerary.itineraryImages && itinerary.itineraryImages.length > 0
            ? itinerary.itineraryImages
              .map(
                (img, idx) => `
                    <div style="width: 100%; height: 300px; overflow: hidden; margin-bottom: 16px;">
                      <img src="${img.url}" alt="Itinerary Image ${idx + 1}" style="width: 100%; height: 100%; object-fit: cover;" />
                    </div>
                  `
              )
              .join("")
            : ""
          }
       <!-- Activities Section -->
          ${itinerary.activities && itinerary.activities.length > 0
            ? `
              <div style="margin-top: 16px; padding: 16px; border: 1px solid #ddd; border-radius: 8px;">
                <div style="text-align: center; font-size: 20px; font-weight: bold; margin-bottom: 16px;">Activities</div>
                ${itinerary.activities
              .map(
                (activity) => `
                    <div style="margin-bottom: 16px;">
                      <div style="font-size: 20px; font-weight: bold;">${activity.activityTitle || "Activity"}</div>
                      <div style="font-size: 16px; text-align: justify; margin-bottom: 8px;">${activity.activityDescription || "No description provided."}</div>
                      ${activity.activityImages && activity.activityImages.length > 0
                    ? activity.activityImages
                      .map(
                        (actImg, idx) => `
                                <div style="width: 100%; height: 250px; overflow: hidden; margin-top: 8px;">
                                  <img src="${actImg.url}" alt="Activity Image ${idx + 1}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;" />
                                </div>
                              `
                      )
                      .join("")
                    : ""
                  }
                    </div>
                  `
              )
              .join("")}
              </div>
              `
            : ""
          }
        </div>
      </div>
    `)
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

   // Add this new section in buildHtmlContent
   const dynamicPricingSection = 
   initialData.pricingSection && selectedOption !== "Empty" &&
   selectedOption !== "SupplierA" &&
   selectedOption !== "SupplierB"
     ? `
  <div style="${cardStyle}; page-break-inside: avoid; page-break-before: always; margin-top: 20px; border: 1px solid #fed7aa;">
       <div style="background: #f9fafb; padding: 12px 16px; display:flex; align-items:center; justify-content:space-between;">
         <h2 style="${sectionTitleStyle}; background: linear-gradient(to right, #fb923c, #ef4444, #f472b6); -webkit-background-clip: text; color: transparent; margin: 0; display:flex; align-items:center; gap:6px;">💰 Pricing Options</h2>
         <span style="font-size: 12px; color:#6b7280;">INR</span>
       </div>
       <div style="padding: 0;">
         <table style="width: 100%; border-collapse: collapse;">
           <colgroup>
             <col style="width:55%" />
             <col style="width:20%" />
             <col style="width:25%" />
           </colgroup>
           <thead style="background:#f9fafb; font-size:11px; color:#4b5563; text-transform:uppercase;">
             <tr>
               <th style="padding: 8px; text-align: left; border-bottom:1px solid #f3f4f6;">Item</th>
               <th style="padding: 8px; text-align: center; border-bottom:1px solid #f3f4f6;">Base</th>
               <th style="padding: 8px; text-align: left; border-bottom:1px solid #f3f4f6;">Notes</th>
             </tr>
           </thead>
           <tbody>
             ${parsePricingSection(initialData.pricingSection).map((item, index) => `
               <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#fff7ed'};">
                 <td style="padding: 10px; font-size: 14px; color:#111827;">${item.name || ''}</td>
                 <td style="padding: 10px; font-size: 14px; color:#16a34a; font-weight:700; text-align:center;">${item.price ? `₹ ${formatINR(item.price)}` : '-'}</td>
                 <td style="padding: 10px; font-size: 14px; color:#374151;">${item.description || '-'}</td>
               </tr>
             `).join('')}
           </tbody>
         </table>
         <div style="padding: 8px 12px; background:#fff7ed; border-top:1px solid #fbd3bd; font-size:11px; color:#c2410c; font-style:italic;">* Subject to availability & taxes.</div>
       </div>
     </div>
     `
     : '';
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

    try {
      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ htmlContent }),
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
