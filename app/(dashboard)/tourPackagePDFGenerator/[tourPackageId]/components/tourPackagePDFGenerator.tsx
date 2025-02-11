"use client";
import { useEffect, useState } from "react";
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
import { format } from "date-fns";

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
      "1203, PNTC, Times of India Press Road, Satellite, Ahmedabad - 380015, Gujarat, India",
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
    "font-family: Arial, sans-serif; padding: 16px; max-width: 1200px; margin: auto;";
  const cardStyle =
    "border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 16px; overflow: hidden;";
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

  // --- Build HTML content ---
  const buildHtmlContent = (): string => {
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
      ${
      initialData.numDaysNight
        ? `<div style="margin-bottom: 12px;">
         <span style="${subTitleStyle}">Duration:</span>
         <span style="${textStyle}">${initialData.numDaysNight}</span>
         </div>`
        : ""
      }
      ${
      initialData.transport
        ? `<div style="margin-bottom: 12px;">
         <span style="${subTitleStyle}">Transport:</span>
         <span style="${textStyle}">${initialData.transport}</span>
         </div>`
        : ""
      }
      ${
      initialData.pickup_location
        ? `<div style="margin-bottom: 12px;">
         <span style="${subTitleStyle}">Pickup:</span>
         <span style="${textStyle}">${initialData.pickup_location}</span>
         </div>`
        : ""
      }
      ${
      initialData.drop_location
        ? `<div style="margin-bottom: 12px;">
         <span style="${subTitleStyle}">Drop:</span>
         <span style="${textStyle}">${initialData.drop_location}</span>
         </div>`
        : ""
      }
      ${
      initialData.numAdults
        ? `<div style="margin-bottom: 12px;">
         <span style="${subTitleStyle}">Adults:</span>
         <span style="${textStyle}">${initialData.numAdults}</span>
         </div>`
        : ""
      }
      ${
      initialData.numChild5to12
        ? `<div style="margin-bottom: 12px;">
         <span style="${subTitleStyle}">Children (5-12 Years):</span>
         <span style="${textStyle}">${initialData.numChild5to12}</span>
         </div>`
        : ""
      }
      ${
      initialData.numChild0to5
        ? `<div style="margin-bottom: 12px;">
         <span style="${subTitleStyle}">Children (0-5 Years):</span>
         <span style="${textStyle}">${initialData.numChild0to5}</span>
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
          ${
            initialData.pricePerAdult !== ""
              ? `<div style="margin-bottom: 12px; font-weight: bold; background: #f7fafc; padding: 12px; border-radius: 8px;">
                   <span style="color: #1a202c;">Price per Adult:</span> ${initialData.pricePerAdult}
                 </div>`
              : ""
          }
          ${
            initialData.pricePerChildOrExtraBed !== ""
              ? `<div style="margin-bottom: 12px; font-weight: bold; background: #f7fafc; padding: 12px; border-radius: 8px;">
                   <span style="color: #1a202c;">Price for Triple Occupancy:</span> ${initialData.pricePerChildOrExtraBed}
                 </div>`
              : ""
          }
          ${
            initialData.pricePerChild5to12YearsNoBed !== ""
              ? `<div style="margin-bottom: 12px; font-weight: bold; background: #f7fafc; padding: 12px; border-radius: 8px;">
                   <span style="color: #1a202c;">Price per Child (5-12 Years - No bed):</span> ${initialData.pricePerChild5to12YearsNoBed}
                 </div>`
              : ""
          }
          ${
            initialData.pricePerChildwithSeatBelow5Years !== ""
              ? `<div style="margin-bottom: 12px; font-weight: bold; background: #f7fafc; padding: 12px; border-radius: 8px;">
                   <span style="color: #1a202c;">Price per Child with Seat (Below 5 Years):</span> ${initialData.pricePerChildwithSeatBelow5Years}
                 </div>`
              : ""
          }
        </div>
      </div>
      `
        : "";

    // 4. Total Price Section
    const totalPriceSection =
      initialData.totalPrice && initialData.totalPrice.trim() !== ""
        ? `
      <div style="${cardStyle}; padding: 16px;">
        <div style="font-weight: bold; font-size: 20px; background: #f7fafc; padding: 12px; border-radius: 8px; color: #f97316;">
          Total Price: ${initialData.totalPrice}
        </div>
      </div>
    `
        : "";

    // 6. Tour Highlights Section
    const highlightsSection =
      initialData.tour_highlights && initialData.tour_highlights.trim() !== ""
        ? `
      <div style="${cardStyle}">
        <div style="${headerStyle}">
          <h2 style="${sectionTitleStyle}">Tour Highlights</h2>
        </div>
        <div style="${contentStyle}; font-size: 18px;">
          ${initialData.tour_highlights}
        </div>
      </div>
    `
        : "";

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
              <!-- Right Box: Itinerary Title -->
              <div style="flex: 1; background: linear-gradient(to right, #ef4444, #f97316, #facc15); color: white; padding: 16px; text-align: left;">
                <p style="font-size: 24px; font-weight: bold; margin: 0;">
                  ${itinerary.itineraryTitle?.replace(/^<p>/, "").replace(/<\/p>$/, "")}
                </p>
              </div>
            </div>
            <!-- Itinerary Description & Images -->
            <div style="padding: 8px;">
              <div style="font-size: 16px; text-align: justify; margin-bottom: 8px;">
                ${itinerary.itineraryDescription || ""}
              </div>
              ${
                itinerary.itineraryImages && itinerary.itineraryImages.length > 0
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
              <!-- Hotel Details Section -->
              ${
                itinerary.hotelId && hotels.find((hotel) => hotel.id === itinerary.hotelId)
                  ? `
                  <div style="${cardStyle}">
                    <div style="background: linear-gradient(to right, #ef4444, #f97316, #facc15); color: white; padding: 16px; text-align: center;">
                      <h2 style="font-size: 32px; font-weight: bold; margin: 0;">Hotel Details</h2>
                    </div>
                    <div style="padding: 16px;">
                      ${
                        hotels.find((hotel) => hotel.id === itinerary.hotelId)?.images.length === 1
                          ? `
                            <div style="display: flex; gap: 16px; margin-bottom: 16px;">
                              <div style="width: 250px; height: 250px;">
                                <a href="${hotels.find((hotel) => hotel.id === itinerary.hotelId)?.link}" target="_blank" rel="noopener noreferrer">
                                  <img src="${hotels.find((hotel) => hotel.id === itinerary.hotelId)?.images[0].url}" 
                                       alt="Hotel Image" 
                                       style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;" />
                                </a>
                              </div>
                              <div>
                                <div style="font-weight: bold; font-size: 16px;">Hotel Name:</div>
                                <div style="font-size: 16px; margin-bottom: 8px;">
                                  <a href="${hotels.find((hotel) => hotel.id === itinerary.hotelId)?.link}" target="_blank" rel="noopener noreferrer">
                                    ${hotels.find((hotel) => hotel.id === itinerary.hotelId)?.name || ""}
                                  </a>
                                </div>
                                ${
                                  itinerary.roomCategory
                                    ? `<div style="font-weight: bold; font-size: 16px;">Room Category:</div>
                                       <div style="font-size: 16px; margin-bottom: 8px;">${itinerary.roomCategory}</div>`
                                    : ""
                                }
                                ${
                                  itinerary.mealsIncluded
                                    ? `<div style="font-weight: bold; font-size: 16px;">Meal Plan:</div>
                                       <div style="font-size: 16px; margin-bottom: 8px;">${itinerary.mealsIncluded}</div
                                }`
                                    : ""
                                }
                              </div>
                            </div>
                          `
                          : `
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
                              ${hotels.find((hotel) => hotel.id === itinerary.hotelId)?.images
                                .map(
                                  (image) => `
                                    <div style="width: 250px; height: 250px; overflow: hidden; border-radius: 8px;">
                                      <img
                                        src="${image.url}"
                                        alt="Hotel Image"
                                        style="width: 100%; height: 100%; object-fit: cover;"
                                      />
                                    </div>
                                  `
                                )
                                .join("")}
                            </div>
                          `
                      }
                    </div>
                  </div>
                `
                  : ""
              }
              <!-- Activities Section -->
              ${
                itinerary.activities && itinerary.activities.length > 0
                  ? `
                  <div style="margin-top: 16px; padding: 16px; border: 1px solid #ddd; border-radius: 8px;">
                    <h4 style="font-size: 1.25rem; font-weight: bold; margin-bottom: 8px;">Activities</h4>
                    ${itinerary.activities
                      .map(
                        (activity, activityIndex) => `
                        <div style="margin-bottom: 16px;">
                          <h5 style="font-size: 1rem; font-weight: bold;">${activity.activityTitle || 'Activity'}</h5>
                          <p>${activity.activityDescription || 'No description provided.'}</p>
                          ${activity.activityImages && activity.activityImages.length > 0
                            ? activity.activityImages
                              .map(
                                (activityImage, activityImgIndex) => `
                              <div style="width: 100%; height: 300px; overflow: hidden; margin-top: 16px;">
                                <img 
                                  src="${activityImage.url}" 
                                  alt="Activity Image ${activityImgIndex + 1}" 
                                  style="object-fit: cover; width: 100%; height: 100%; border-radius: 8px;"
                                />
                              </div>
                            `
                              )
                              .join('')
                            : ''
                          }
                        </div>
                      `
                      )
                      .join('')}
                  </div>
                `
                  : ''
              }
            </div>
          </div>
        `)
        .join("");
    }

    // 9. Inclusions Section
    const inclusionsSection =
      initialData.inclusions
        ? `
      <div style="${cardStyle}">
        <div style="${headerStyle}">
          <h2 style="${sectionTitleStyle}">Inclusions</h2>
        </div>
        <div style="${contentStyle}">
          ${initialData.inclusions}
        </div>
      </div>
    `
        : "";

    // 10. Exclusions Section
    const exclusionsSection =
      initialData.exclusions
        ? `
      <div style="${cardStyle}">
        <div style="${headerStyle}">
          <h2 style="${sectionTitleStyle}">Exclusions</h2>
        </div>
        <div style="${contentStyle}">
          ${initialData.exclusions}
        </div>
      </div>
    `
        : "";

    // 11. Important Notes Section
    const importantNotesSection =
      initialData.importantNotes
        ? `
      <div style="${cardStyle}">
        <div style="${headerStyle}">
          <h2 style="${sectionTitleStyle}">Important Notes</h2>
        </div>
        <div style="${contentStyle}">
          ${initialData.importantNotes}
        </div>
      </div>
    `
        : "";

    // 12. Payment Policy Section
    const paymentPolicySection =
      initialData.paymentPolicy
        ? `
      <div style="${cardStyle}">
        <div style="${headerStyle}">
          <h2 style="${sectionTitleStyle}">Payment Policy</h2>
        </div>
        <div style="${contentStyle}">
          ${initialData.paymentPolicy}
        </div>
      </div>
    `
        : "";

    // 13. Terms and Conditions Section
    const termsConditionsSection =
      initialData.termsconditions
        ? `
      <div style="${cardStyle}">
        <div style="${headerStyle}">
          <h2 style="${sectionTitleStyle}">Terms and Conditions</h2>
        </div>
        <div style="${contentStyle}">
          ${initialData.termsconditions}
        </div>
      </div>
    `
        : "";

    // 14. Cancellation Policy Section
    const cancellationPolicySection =
      initialData.cancellationPolicy
        ? `
      <div style="${cardStyle}">
        <div style="${headerStyle}">
          <h2 style="${sectionTitleStyle}">Cancellation Policy</h2>
        </div>
        <div style="${contentStyle}">
          ${initialData.cancellationPolicy}
        </div>
      </div>
    `
        : "";

    // 15. Airline Cancellation Policy Section
    const airlineCancellationPolicySection =
      initialData.airlineCancellationPolicy
        ? `
      <div style="${cardStyle}">
        <div style="${headerStyle}">
          <h2 style="${sectionTitleStyle}">Airline Cancellation Policy</h2>
        </div>
        <div style="${contentStyle}">
          ${initialData.airlineCancellationPolicy}
        </div>
      </div>
    `
        : "";

    // 16. Company Information Section
    const companyInfoSection = `
      <div style="border-bottom: 1px solid #ddd; margin: 16px 0; padding: 16px; display: flex; align-items: center;">
        <div style="width: 120px; height: 120px; position: relative; padding: 8px; margin-right: 16px;">
          <img src="${companyInfo.AH.logo}" alt="${companyInfo.AH.name} Logo" style="width: 100%; height: 100%; object-fit: contain;" />
        </div>
        <ul style="list-style-type: none; margin: 0; padding: 0; font-weight: bold; color: #1a202c;">
          <li>${companyInfo.AH.address}</li>
          <li>Phone: ${companyInfo.AH.phone}</li>
          <li>
            Email: 
            <a href="mailto:${companyInfo.AH.email}" style="color: #2563eb; text-decoration: underline;">
              ${companyInfo.AH.email}
            </a>
          </li>
          <li>
            Website: 
            <a href="${companyInfo.AH.website || '#'}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">
              ${companyInfo.AH.website}
            </a>
          </li>
        </ul>
      </div>
    `;

    // Combine all sections into the final HTML content
    return `
      <div style="${containerStyle}">
        ${headerSection}
        ${tourInfoSection}
        ${pricingSection}
        ${totalPriceSection}
        ${highlightsSection}
        ${flightSection}
        ${itinerariesSection}
        ${inclusionsSection}
        ${exclusionsSection}
        ${importantNotesSection}
        ${paymentPolicySection}
        ${termsConditionsSection}
        ${cancellationPolicySection}
        ${airlineCancellationPolicySection}
        ${companyInfoSection}
      </div>
    `;
  };

  const generatePDF = async () => {
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
      alert("An error occurred while generating the PDF.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generatePDF();
  }, [initialData]); // Empty dependency array ensures this runs only once

  if (!initialData) {
    return <div>No data available</div>;
  }
  return <div>PDF Generated Sucessfully</div>; // Return nothing as the component is only for generating the PDF
};

export default TourPackagePDFGenerator;
