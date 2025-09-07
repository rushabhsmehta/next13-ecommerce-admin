"use client";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  FlightDetails,
  Hotel,
  Images,
  Location,
  Itinerary,
  TourPackage,
} from "@prisma/client";
// import { format } from "date-fns";

interface TourPackagePDFGeneratorProps {
  initialData: TourPackage & {
    images: Images[];
    itineraries: (Itinerary & {
      itineraryImages: Images[];
      activities: (Activity & {
        activityImages: Images[];
      })[];
    })[];
    flightDetails: FlightDetails[];
  } | null;
  locations: Location[];
  hotels: (Hotel & {
    images: Images[];
  })[];
}

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

const TourPackagePDFGenerator: React.FC<TourPackagePDFGeneratorProps> = ({
  initialData,
  locations,
  hotels,
}) => {
  const searchParams = useSearchParams();
  const selectedOption = searchParams.get("search") || "Empty";
  const [loading, setLoading] = useState(false);

  const currentCompany = companyInfo[selectedOption] ?? companyInfo["Empty"];

  // --- Helper styles (converted from your Tailwind classes) ---
  const containerStyle =
    "font-family: Arial, sans-serif; padding: 16px; max-width: 1200px; margin: auto; background:#fafaf9;";
  const cardStyle =
  "border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 6px 14px rgba(0,0,0,0.06); margin-bottom: 16px; overflow: hidden; background:#ffffff; page-break-inside: avoid; break-inside: avoid;";
  const headerStyle =
    "background: linear-gradient(90deg, #f97316, #fb923c); color: #ffffff; padding: 16px; text-align: center;";
  const contentStyle =
    "padding: 16px; background: #ffffff; color: #374151; font-size: 16px;";
  const sectionTitleStyle =
    "font-size: 24px; font-weight: bold; margin: 0;";
  const subTitleStyle =
    "font-size: 18px; font-weight: bold; margin-right: 8px;";
  const textStyle = "font-size: 16px; color: #1a202c;";
  const gradientFooter =
    "background: linear-gradient(90deg, #f97316, #fb923c); color: #ffffff; padding: 16px;";

  //
  // Policy parsing helpers (aligned with Tour Package Query PDF)
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
        const vals = Object.values(field as any);
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
      <div style="${cardStyle}">
        <div style="${headerStyle}">
          <h1 style="font-size: 28px; margin: 0;">${initialData.tourPackageName}</h1>
          <h2 style="font-size: 24px; margin: 0;">${initialData.tourPackageType} Package</h2>
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

    // 2. Tour Information Section
    const tourInfoSection = `
      <div style="${cardStyle}">
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
      </div>
      </div>
    `;

  // 3. Tour Pricing Section (if applicable)
    const pricingSection =
      initialData.price && initialData.price.trim() !== ""
        ? `
      <div style="${cardStyle}">
        <div style="${headerStyle}">
          <h2 style="${sectionTitleStyle}">Tour Pricing</h2>
        </div>
        <div style="padding: 16px;">
          <div style="font-weight: bold; font-size: 20px; background: #f7fafc; padding: 12px; border-radius: 8px; color: #f97316;">
            ${initialData.price}
          </div>
        </div>
        <div style="padding: 16px; background: #ffffff;">
          ${initialData.pricePerAdult !== ""
          ? `<div style="margin-bottom: 12px; font-weight: bold; background: #f7fafc; padding: 12px; border-radius: 8px;">
                   <span style="color: #1a202c;">Price per Adult:</span> ${initialData.pricePerAdult}
                 </div>`
          : ""
        }
          ${initialData.pricePerChildOrExtraBed !== ""
          ? `<div style="margin-bottom: 12px; font-weight: bold; background: #f7fafc; padding: 12px; border-radius: 8px;">
                   <span style="color: #1a202c;">Price for Triple Occupancy:</span> ${initialData.pricePerChildOrExtraBed}
                 </div>`
          : ""
        }
          ${initialData.pricePerChild5to12YearsNoBed !== ""
          ? `<div style="margin-bottom: 12px; font-weight: bold; background: #f7fafc; padding: 12px; border-radius: 8px;">
                   <span style="color: #1a202c;">Price per Child (5-12 Years - No bed):</span> ${initialData.pricePerChild5to12YearsNoBed}
                 </div>`
          : ""
        }
          ${initialData.pricePerChildwithSeatBelow5Years !== ""
          ? `<div style="margin-bottom: 12px; font-weight: bold; background: #f7fafc; padding: 12px; border-radius: 8px;">
                   <span style="color: #1a202c;">Price per Child with Seat (Below 5 Years):</span> ${initialData.pricePerChildwithSeatBelow5Years}
                 </div>`
          : ""
        }
        </div>
      </div>
      `
        : "";

    // 4. Total Price Section (revamped styling + INR formatting)
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

    // 5. Hotels Summary Section (aggregated from itineraries)
    const hotelsSummary = (initialData.itineraries || [])
      .filter((it) => it.hotelId && hotels.find((h) => h.id === it.hotelId))
      .map((it) => ({
        dayNumber: it.dayNumber,
        days: it.days,
        roomCategory: it.roomCategory,
        mealsIncluded: it.mealsIncluded,
        hotel: hotels.find((h) => h.id === it.hotelId)!,
      }))
      .sort((a, b) => (a.dayNumber ?? 0) - (b.dayNumber ?? 0));

    const hotelsSection = hotelsSummary.length > 0 ? `
      <div style="${cardStyle}">
        <div style="${headerStyle}">
          <h2 style="${sectionTitleStyle}">Hotels</h2>
        </div>
        <div style="${contentStyle}">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px;">
            ${hotelsSummary
              .map(({ dayNumber, days, roomCategory, mealsIncluded, hotel }) => `
                <div style="border:1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background:#ffffff;">
                  <div style="position: relative; width: 100%; height: 160px; background:#f3f4f6;">
                    ${hotel.images?.[0]?.url ? `<a href="${hotel.link || '#'}" target="_blank" rel="noopener noreferrer"><img src="${hotel.images[0].url}" alt="${hotel.name}" style="width:100%; height:100%; object-fit:cover; display:block;" /></a>` : ''}
                    <div style="position:absolute; top:8px; left:8px; background: rgba(249,115,22,0.95); color:#fff; padding:4px 10px; border-radius:999px; font-size:12px; font-weight:700;">
                      Day ${dayNumber}${days ? `: ${days}` : ''}
                    </div>
                  </div>
                  <div style="padding:12px;">
                    <div style="font-size:16px; font-weight:700; color:#111827; margin-bottom:4px;">
                      <a href="${hotel.link || '#'}" target="_blank" rel="noopener noreferrer" style="color:#111827; text-decoration:none;">${hotel.name || 'Hotel'}</a>
                    </div>
                    ${roomCategory ? `<div style=\"font-size:14px; color:#374151; margin-bottom:4px;\"><span style=\"font-weight:600;\">Room:</span> ${roomCategory}</div>` : ''}
                    ${mealsIncluded ? `<div style=\"font-size:14px; color:#374151;\"><span style=\"font-weight:600;\">Meal Plan:</span> ${mealsIncluded}</div>` : ''}
                  </div>
                </div>
              `)
              .join("")}
          </div>
        </div>
      </div>
    ` : '';

    // 6. (Removed) Tour Highlights Section per requirement


    // 7. Flight Details Section (if applicable)
    const flightSection =
      initialData.flightDetails && initialData.flightDetails.length > 0
        ? `
      <div style="${cardStyle}">
        <div style="${headerStyle}">
          <h2 style="${sectionTitleStyle}">Flight Details</h2>
        </div>
        ${initialData.flightDetails
          .map(
            (flight) => `
          <div style="padding: 16px; background: #f7fafc; border-bottom: 1px solid #ddd;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
              <span style="font-weight: bold; font-size: 20px; color: #4a5568;">${flight.date}</span>
              <div style="font-size: 20px; color: #4a5568;">
                <span style="font-weight: bold;">${flight.flightName}</span> | ${flight.flightNumber}
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; color: #4a5568;">
              <div>
                <div style="font-weight: bold; font-size: 14px;">${flight.from}</div>
                <div style="font-size: 14px; margin-top: 4px;">${flight.departureTime}</div>
              </div>
              <div style="text-align: center; font-size: 14px; color: #718096;">
                <div style="margin-bottom: 4px;">&#9992;</div>
                <div>${flight.flightDuration}</div>
                <hr style="border-top: 2px solid #cbd5e0; margin: 4px 0;" />
              </div>
              <div>
                <div style="font-weight: bold; font-size: 14px;">${flight.to}</div>
                <div style="font-size: 14px; margin-top: 4px;">${flight.arrivalTime}</div>
              </div>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    `
        : "";

    // 8. Itineraries Section
    let itinerariesSection = "";

    if (initialData.itineraries && initialData.itineraries.length > 0) {
      // Render the Itinerary header once.
      itinerariesSection += `
        <div style="${cardStyle} page-break-before: always">
          <div style="${headerStyle}">
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
  <div style="flex: 0 0 20%; background: linear-gradient(90deg, #f97316, #fb923c); color: white; padding: 8px; text-align: center; display: flex; align-items: center; justify-content: center;">
    <p style="font-size: 24px; font-weight: bold; margin: 0;">
      Day ${itinerary.dayNumber}: ${itinerary.days}
    </p>
  </div>
  
    <!-- Right Box: Description -->
   <div style="flex: 1; background: linear-gradient(90deg, #f97316, #fb923c); color: white; padding: 16px; text-align: left;">
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
    }


    // 10. Policies with location fallbacks and bullet list rendering
    const loc = locations.find((l) => l.id === initialData.locationId) as any;
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
    const termsArr = withFallback(initialData.termsconditions, loc?.termsconditions);
    const cancelArr = withFallback(initialData.cancellationPolicy, loc?.cancellationPolicy);
    const airlineCancelArr = withFallback(initialData.airlineCancellationPolicy, loc?.airlineCancellationPolicy);
    const usefulTipsArr = withFallback((initialData as any).usefulTip, loc?.usefulTip);

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

    // 16. Company Information Section (aligned with Query PDF)
    let companySection = "";
    if (
      selectedOption !== "Empty" &&
      selectedOption !== "SupplierA" &&
      selectedOption !== "SupplierB"
    ) {
      companySection = `
      <div style="border: 1px solid #ddd; margin: 16px 0; padding: 16px; display: flex; align-items: center; border-radius: 8px;">
        <div style="width: 120px; height: 120px; margin-right: 16px;">
          <img src="${currentCompany.logo}" alt="${currentCompany.name} Logo" style="width: 100%; height: 100%; object-fit: contain;" />
        </div>
        <div style="font-weight: bold; font-size: 16px; color: #1a202c;">
          <div style="font-size:18px; background: linear-gradient(to right, #fb923c, #ef4444); -webkit-background-clip: text; color: transparent;">${currentCompany.name || ''}</div>
          <div>${currentCompany.address}</div>
          <div>Phone: ${currentCompany.phone}</div>
          <div>Email: <a href="mailto:${currentCompany.email}" style="color: #2563eb; text-decoration: underline;">${currentCompany.email}</a></div>
          <div>Website: <a href="${currentCompany.website || '#'}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">${currentCompany.website}</a></div>
        </div>
      </div>
      `;
    } else if (selectedOption === "SupplierA" || selectedOption === "SupplierB") {
      const ah = companyInfo.AH;
      companySection = `
      <div style="border: 1px solid #ddd; margin: 16px 0; padding: 16px; display: flex; align-items: center; border-radius: 8px;">
        <div style="width: 120px; height: 120px; margin-right: 16px;">
          <img src="${ah.logo}" alt="${ah.name} Logo" style="width: 100%; height: 100%; object-fit: contain;" />
        </div>
        <div style="font-weight: bold; font-size: 16px; color: #1a202c;">
          <div style="font-size:18px; background: linear-gradient(to right, #fb923c, #ef4444); -webkit-background-clip: text; color: transparent;">${ah.name}</div>
          <div>${ah.address}</div>
          <div>Phone: ${ah.phone}</div>
          <div>Email: <a href="mailto:${ah.email}" style="color: #2563eb; text-decoration: underline;">${ah.email}</a></div>
          <div>Website: <a href="${ah.website || '#'}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">${ah.website}</a></div>
        </div>
      </div>
      `;
    }

    // Combine all sections into the final HTML content
    return `
      <div style="${containerStyle}">
        ${headerSection}
        ${tourInfoSection}
        ${totalPriceSection}
  ${hotelsSection}
        ${flightSection}
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
  ${companySection}      </div>
    `;
  }, [initialData, currentCompany, locations, hotels, parsePolicyField, selectedOption]);
  const generatePDF = useCallback(async () => {
    setLoading(true);

    const htmlContent = buildHtmlContent();

    try {
      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        body: JSON.stringify({ htmlContent }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        // Ensure tourPackageName is a valid filename (remove special characters)
        const fileName = initialData?.tourPackageName && initialData?.tourPackageType
          ? `${initialData.tourPackageName.replace(/[^a-zA-Z0-9-_]/g, "_")}_${initialData.tourPackageType.replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`
          : "Tour_Package.pdf";

        // Create an anchor element
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName; // Set the dynamic file name
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Revoke object URL after download
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
      } else {
        alert("Failed to generate PDF");
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("An error occurred while generating the PDF.");    } finally {
      setLoading(false);
    }
  }, [initialData, buildHtmlContent]);
  useEffect(() => {
    generatePDF();
  }, [initialData, generatePDF]); // Added generatePDF to dependencies

  if (!initialData) {
    return <div>No data available</div>;
  }
  return <div>PDF Generated Sucessfully</div>; // Return nothing as the component is only for generating the PDF
};

export default TourPackagePDFGenerator;
