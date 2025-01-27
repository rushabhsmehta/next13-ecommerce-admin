"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  FlightDetails,
  Hotel,
  Images,
  Location,
  Itinerary,
  TourPackageQuery,
} from "@prisma/client";
import { format } from "date-fns";

interface TourPackageQueryPDFGeneratorProps {
  initialData: TourPackageQuery & {
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

const TourPackageQueryPDFGenerator: React.FC<TourPackageQueryPDFGeneratorProps> = ({
  initialData,
  locations,
  hotels,
}) => {
  const searchParams = useSearchParams();
  const selectedOption = searchParams.get("search") || "Empty";
  const [loading, setLoading] = useState(false);

  const currentCompany = companyInfo[selectedOption] ?? companyInfo["Empty"];

  if (!initialData) {
    return <div>No data available</div>;
  }


  const generatePDF = async () => {
    setLoading(true);

    const htmlContent = `
    <div style="display: flex; flex-direction: column; gap: 16px; padding: 16px; font-family: Arial, sans-serif;">
    <!-- Tour Package Header Section -->
    <div style="break-inside: avoid; font-weight: bold; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
      <div style="background: linear-gradient(to right, #ef4444, #f97316); color: white; padding: 16px; border-radius: 8px 8px 0 0; justify-content: space-between; align-items: center;">
        <h1 style="font-size: 1.5rem; font-weight: bold; margin: 0;">
          ${initialData.tourPackageQueryName}
        </h1>       
        <h2 style="font-size: 1.5rem; font-weight: bold; margin: 0;">
          ${initialData.tourPackageQueryType} Package
        </h2>
      </div>
      ${initialData.images
        .map(
          (image, index) => `
          <div style="width: 100%; height: 500px; overflow: hidden;">
            <img 
              src="${image.url}" 
              alt="Tour Image ${index + 1}" 
              style="object-fit: cover; width: 100%; height: 100%;" 
            />
          </div>
        `
        )
        .join('')}
    </div>

    <!-- Customer Details Section -->
    <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-top: 16px; font-size: 1rem;">
      <div style="margin-bottom: 16px; font-size: 1.25rem; font-weight: bold; color: #1a202c;">
        ${initialData.tourPackageQueryNumber}
      </div>
      ${selectedOption !== 'SupplierA' && selectedOption !== 'SupplierB'
        ? `
        <div style="font-size: 1rem; color: #4a5568;">
          <div style="margin-bottom: 8px;">
            <span style="font-weight: bold;">Customer:</span> ${initialData.customerName} | ${initialData.customerNumber}
          </div>
          <div>
            <span style="font-weight: bold;">Assigned To:</span> ${initialData.assignedTo} | ${initialData.assignedToMobileNumber} | ${initialData.assignedToEmail}
          </div>
        </div>
      `
        : ''
      }
    </div>
      
    <!-- Tour Package Details Section -->
    <div style="break-inside: avoid; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);">
      <div style="background: linear-gradient(to right, #ef4444, #f97316); color: white; padding: 16px; border-radius: 8px 8px 0 0;">
        <h2 style="font-size: 1.5rem; font-weight: bold; margin: 0;">Tour Information</h2>
      </div>
      <div style="padding: 16px; background: #ffffff; color: #4a5568; font-size: 1rem;">
        <div style="margin-bottom: 16px;">
          <span style="font-weight: bold; font-size: 1.125rem;">Location:</span>
          <span style="margin-left: 8px; font-size: 1.25rem; color: #1a202c;">
            ${locations.find(location => location.id === initialData.locationId)?.label || ''}
          </span>
        </div>
        ${initialData.numDaysNight
        ? `
          <div style="margin-bottom: 16px;">
            <span style="font-weight: bold; font-size: 1.125rem;">Duration:</span>
            <span style="margin-left: 8px; font-size: 1.25rem; color: #1a202c;">${initialData.numDaysNight}</span>
          </div>
        `
        : ''
      }
        ${initialData.tourStartsFrom || initialData.tourEndsOn
        ? `
          <div style="display: flex; margin-bottom: 16px;">
            ${initialData.tourStartsFrom
          ? `
              <div>
                <span style="font-weight: bold; font-size: 1.125rem;">Period:</span>
                <span style="margin-left: 8px; font-size: 1.25rem; color: #1a202c;">${format(initialData.tourStartsFrom, 'dd-MM-yyyy')}</span>
              </div>
            `
          : ''
        }
            ${initialData.tourEndsOn
          ? `
              <div style="margin-left: 16px;">
                <span style="font-weight: bold; font-size: 1.125rem;">To:</span>
                <span style="margin-left: 8px; font-size: 1.25rem; color: #1a202c;">${format(initialData.tourEndsOn, 'dd-MM-yyyy')}</span>
              </div>
            `
          : ''
        }
          </div>
        `
        : ''
      }
        ${initialData.transport
        ? `
          <div style="margin-bottom: 16px;">
            <span style="font-weight: bold; font-size: 1.125rem;">Transport:</span>
            <span style="margin-left: 8px; font-size: 1.25rem; color: #1a202c;">${initialData.transport}</span>
          </div>
        `
        : ''
      }
        ${initialData.pickup_location
        ? `
          <div style="margin-bottom: 16px;">
            <span style="font-weight: bold; font-size: 1.125rem;">Pickup:</span>
            <span style="margin-left: 8px; font-size: 1.25rem; color: #1a202c;">${initialData.pickup_location}</span>
          </div>
        `
        : ''
      }
        ${initialData.drop_location
        ? `
          <div style="margin-bottom: 16px;">
            <span style="font-weight: bold; font-size: 1.125rem;">Drop:</span>
            <span style="margin-left: 8px; font-size: 1.25rem; color: #1a202c;">${initialData.drop_location}</span>
          </div>
        `
        : ''
      }
        ${initialData.numAdults
        ? `
          <div style="margin-bottom: 16px;">
            <span style="font-weight: bold; font-size: 1.125rem;">Adults:</span>
            <span style="margin-left: 8px; font-size: 1.25rem; color: #1a202c;">${initialData.numAdults}</span>
          </div>
        `
        : ''
      }
        ${initialData.numChild5to12
        ? `
          <div style="margin-bottom: 16px;">
            <span style="font-weight: bold; font-size: 1.125rem;">Children (5 - 12 Years):</span>
            <span style="margin-left: 8px; font-size: 1.25rem; color: #1a202c;">${initialData.numChild5to12}</span>
          </div>
        `
        : ''
      }
        ${initialData.numChild0to5
        ? `
          <div style="margin-bottom: 16px;">
            <span style="font-weight: bold; font-size: 1.125rem;">Children (0 - 5 Years):</span>
            <span style="margin-left: 8px; font-size: 1.25rem; color: #1a202c;">${initialData.numChild0to5}</span>
          </div>
        `
        : ''
      }
      </div>
    </div>


    <!-- Tour Pricing Section -->
    ${selectedOption !== 'Empty' && selectedOption !== 'SupplierA' && selectedOption !== 'SupplierB'
        ? `
      <div style="border: 1px solid #ddd; border-radius: 8px; margin-bottom: 16px; box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(to right, #ef4444, #f97316); color: white; padding: 16px; border-radius: 8px 8px 0 0;">
          <h2 style="font-size: 1.5rem; font-weight: bold; margin: 0;">Tour Pricing</h2>
        </div>
  
        ${initialData.price && initialData.price.trim() !== ''
          ? `
          <div style="padding: 16px;">
            <div style="font-weight: bold; font-size: 1.25rem; color: #4a5568; background: #f7fafc; padding: 8px; border-radius: 8px;">
              <span style="color: #f97316;">${initialData.price}</span>
            </div>
          </div>
          `
          : ''
        }
  
        <div style="padding: 16px; background: #ffffff;">
          <!-- Price per Adult Section -->
          ${initialData.pricePerAdult !== ''
          ? `
            <div style="margin-bottom: 16px;">
              <div style="font-weight: bold; font-size: 1.125rem; background: #f7fafc; padding: 8px; border-radius: 8px;">
                <span style="color: #1a202c;">Price per Adult:</span> ${initialData.pricePerAdult}
              </div>
            </div>
            `
          : ''
        }
  
          <!-- Price for Children Section -->
          <div>
            ${initialData.pricePerChildOrExtraBed !== ''
          ? `
              <div style="margin-bottom: 16px;">
                <div style="font-weight: bold; font-size: 1.125rem; background: #f7fafc; padding: 8px; border-radius: 8px;">
                  <span style="color: #1a202c;">Price for Triple Occupancy:</span> ${initialData.pricePerChildOrExtraBed}
                </div>
              </div>
              `
          : ''
        }
            ${initialData.pricePerChild5to12YearsNoBed !== ''
          ? `
              <div style="margin-bottom: 16px;">
                <div style="font-weight: bold; font-size: 1.125rem; background: #f7fafc; padding: 8px; border-radius: 8px;">
                  <span style="color: #1a202c;">Price per Child (5-12 Years - No bed):</span> ${initialData.pricePerChild5to12YearsNoBed}
                </div>
              </div>
              `
          : ''
        }
            ${initialData.pricePerChildwithSeatBelow5Years !== ''
          ? `
              <div style="margin-bottom: 16px;">
                <div style="font-weight: bold; font-size: 1.125rem; background: #f7fafc; padding: 8px; border-radius: 8px;">
                  <span style="color: #1a202c;">Price per Child with Seat (Below 5 Years):</span> ${initialData.pricePerChildwithSeatBelow5Years}
                </div>
              </div>
              `
          : ''
        }
          </div>
        </div>
      </div>
      `
        : ''
      }
  
    <!-- Total Price Section -->
    ${initialData.totalPrice && initialData.totalPrice.trim() !== ''
        ? `
      <div style="margin-bottom: 16px; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1); padding: 16px;">
        <div style="font-weight: bold; font-size: 1.25rem; color: #4a5568; background: #f7fafc; padding: 8px; border-radius: 8px;">
          Total Price: <span style="color: #f97316;">${initialData.totalPrice}</span>
        </div>
      </div>
      `
        : ''
      }
  
    <!-- Remarks Section -->
    ${initialData.remarks !== ''
        ? `
      <div style="margin-bottom: 16px; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1); padding: 16px;">
        <div>${initialData.remarks}</div>
      </div>
      `
        : ''
      }
  
          <!-- Tour Highlights Section -->
    ${initialData.tour_highlights && initialData.tour_highlights.trim() !== ''
        ? `
      <div style="break-inside: avoid; border: 1px solid #ddd; border-radius: 8px; margin-top: 16px; box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(to right, #ef4444, #f97316); color: white; padding: 16px; border-radius: 8px 8px 0 0;">
          <h2 style="font-size: 1.5rem; font-weight: bold; margin: 0;">Tour Highlights</h2>
        </div>
        <div style="padding: 16px; background: #ffffff; color: #4a5568; font-size: 1.25rem;">
          ${initialData.tour_highlights}
        </div>
      </div>
    `
        : ''
      }

  
 <!-- Flight Details Section -->
    ${initialData.flightDetails && initialData.flightDetails.length > 0 && selectedOption !== 'SupplierA' && selectedOption !== 'SupplierB'
        ? `
      <div style="break-inside: avoid; border: 1px solid #ddd; border-radius: 8px; margin-top: 16px; box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(to right, #ef4444, #f97316); color: white; padding: 16px; border-radius: 8px 8px 0 0;">
          <h3 style="font-size: 1.5rem; font-weight: bold; margin: 0;">Flight Details</h3>
        </div>
        ${initialData.flightDetails
          .map(
            (flight, index) => `
          <div style="padding: 16px; background: #f7fafc; border-bottom: 1px solid #ddd;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
              <span style="font-size: 1.25rem; font-weight: bold; color: #4a5568;">${flight.date}</span>
              <div style="font-size: 1.25rem; color: #4a5568;">
                <span style="font-weight: bold;">${flight.flightName}</span> |
                <span>${flight.flightNumber}</span>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; color: #4a5568;">
              <div>
                <div style="font-weight: bold; font-size: 0.875rem;">${flight.from}</div>
                <div style="font-size: 0.875rem; margin-top: 4px;">${flight.departureTime}</div>
              </div>
              <div style="text-align: center; font-size: 0.875rem; color: #718096;">
                <div style="margin-bottom: 4px;">&#9992;</div> <!-- Airplane Icon -->
                <div>${flight.flightDuration}</div>
                <hr style="border-top: 2px solid #cbd5e0; margin: 4px 0;" />
              </div>
              <div>
                <div style="font-weight: bold; font-size: 0.875rem;">${flight.to}</div>
                <div style="font-size: 0.875rem; margin-top: 4px;">${flight.arrivalTime}</div>
              </div>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    `
        : ''
      }

    <!-- Itineraries Section -->
    ${initialData.itineraries && initialData.itineraries.length > 0
        ? `
      <div style="padding: 16px; border: 1px solid #ddd; border-radius: 8px; margin-top: 16px;">
        <h2 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 16px; text-align: center;">Itinerary</h2>
        ${initialData.itineraries
          .map(
            (itinerary, index) => `
            <div style="break-inside: avoid; border: 1px solid #ddd; border-radius: 8px; margin-top: 16px; box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(to right, #ef4444, #f97316); color: white; padding: 16px; display: flex; align-items: center;">
                    <h3 style="font-size: 1.25rem; font-weight: bold; margin-bottom: 8px;">
              Day ${itinerary.dayNumber}: ${itinerary.days} - ${itinerary.itineraryTitle?.replace(/^<p>/, '').replace(/<\/p>$/, '') || ''}
            </h3>
            </div>
            <p>${itinerary.itineraryDescription || ''}</p>

            <!-- Itinerary Images -->
            ${itinerary.itineraryImages && itinerary.itineraryImages.length > 0
                ? itinerary.itineraryImages
                  .map(
                    (image, imageIndex) => `
                <div style="width: 100%; height: 300px; overflow: hidden; margin-top: 16px;">
                  <img 
                    src="${image.url}" 
                    alt="Itinerary Image ${imageIndex + 1}" 
                    style="object-fit: cover; width: 100%; height: 100%; border-radius: 8px;"
                  />
                </div>
              `
                  )
                  .join('')
                : ''
              }

            <!-- Hotel Section -->
<div style="padding: 16px; font-family: Arial, sans-serif;">
  ${itinerary.hotelId &&
                hotels.find((hotel) => hotel.id === itinerary.hotelId)
                ? `
      <div style="margin-bottom: 16px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
        <div style="background: linear-gradient(to right, #ef4444, #f97316); color: white; padding: 16px; text-align: center; font-weight: bold; font-size: 1.5rem;">
          Hotel Details
        </div>
        <div style="padding: 16px;">
          ${hotels.find((hotel) => hotel.id === itinerary.hotelId)?.images.length === 1
                  ? `
              <div style="display: flex; align-items: flex-start; margin-bottom: 16px;">
                <div style="width: 250px; height: 250px; overflow: hidden; border-radius: 8px;">
                  <img
                    src="${hotels.find((hotel) => hotel.id === itinerary.hotelId)?.images[0].url || ""
                  }"
                    alt="Hotel Image"
                    style="width: 100%; height: 100%; object-fit: cover;"
                  />
                </div>
                <div style="margin-left: 16px;">
                  <h3 style="font-weight: bold; font-size: 1.25rem;">Hotel Name:</h3>
                  <p style="font-size: 1.25rem; margin-bottom: 4px;">
                    ${hotels.find((hotel) => hotel.id === itinerary.hotelId)?.name || ""}
                  </p>
                  ${itinerary.numberofRooms
                    ? `
                  <h5 style="font-weight: bold; font-size: 1.25rem;">Number of Rooms: ${itinerary.numberofRooms}</h4>
                  `
                    : ""
                  }
                  ${itinerary.roomCategory
                    ? `
                  <h5 style="font-weight: bold; font-size: 1.25rem;">Room Category : ${itinerary.roomCategory}</p>
                  `
                    : ""
                  }
                  ${itinerary.mealsIncluded
                    ? `
                  <h5 style="font-weight: bold; font-size: 1.25rem;">Meal Plan:</h4>
                  <p style="font-size: 1.25rem; margin-bottom: 4px;">${itinerary.mealsIncluded}</p>
                  `
                    : ""
                  }
                </div>
              </div>
              `
                  : `
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
                ${hotels
                    .find((hotel) => hotel.id === itinerary.hotelId)
                    ?.images.map(
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
</div>

            <!-- Activities Section -->
            ${itinerary.activities && itinerary.activities.length > 0
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
        `
          )
          .join('')}
      </div>
    `
        : ''
      }

 <!-- Inclusions Section -->
    ${initialData.inclusions
        ? `
      <div style="break-inside: avoid; border: 1px solid #ddd; border-radius: 8px; margin-top: 16px; box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(to right, #ef4444, #f97316); color: white; padding: 16px; display: flex; align-items: center;">
          <h3 style="font-size: 1.5rem; font-weight: bold; margin: 0;">Inclusions</h3>
        </div>
        <div style="padding: 16px; background: #ffffff; color: #4a5568; font-size: 1.25rem;">
          ${initialData.inclusions}
        </div>
      </div>
    `
        : ""
      }

    <!-- Exclusions Section -->
    ${initialData.exclusions
        ? `
      <div style="break-inside: avoid; border: 1px solid #ddd; border-radius: 8px; margin-top: 16px; box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(to right, #ef4444, #f97316); color: white; padding: 16px; display: flex; align-items: center;">
          <h3 style="font-size: 1.5rem; font-weight: bold; margin: 0;">Exclusions</h3>
        </div>
        <div style="padding: 16px; background: #ffffff; color: #4a5568; font-size: 1.25rem;">
          ${initialData.exclusions}
        </div>
      </div>
    `
        : ""
      }
  
    <!-- Important Notes Section -->
    ${initialData.importantNotes
        ? `
      <div style="break-inside: avoid; border: 1px solid #ddd; border-radius: 8px; margin-top: 16px; box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(to right, #ef4444, #f97316); color: white; padding: 16px; display: flex; align-items: center;">
          <h3 style="font-size: 1.5rem; font-weight: bold; margin: 0;">Important Notes</h3>
        </div>
        <div style="padding: 16px; background: #ffffff; color: #4a5568; font-size: 1.25rem;">
          ${initialData.importantNotes}
        </div>
      </div>
    `
        : ""
      }

    <!-- Payment Policy Section -->
    ${initialData.paymentPolicy
        ? `
      <div style="break-inside: avoid; border: 1px solid #ddd; border-radius: 8px; margin-top: 16px; box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(to right, #ef4444, #f97316); color: white; padding: 16px; display: flex; align-items: center;">
          <h3 style="font-size: 1.5rem; font-weight: bold; margin: 0;">Payment Policy</h3>
        </div>
        <div style="padding: 16px; background: #ffffff; color: #4a5568; font-size: 1.25rem;">
          ${initialData.paymentPolicy}
        </div>
      </div>
    `
        : ""
      }

    <!-- Terms and Conditions Section -->
    ${initialData.termsconditions
        ? `
      <div style="break-inside: avoid; border: 1px solid #ddd; border-radius: 8px; margin-top: 16px; box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(to right, #ef4444, #f97316); color: white; padding: 16px; display: flex; align-items: center;">
          <h3 style="font-size: 1.5rem; font-weight: bold; margin: 0;">Terms and Conditions</h3>
        </div>
        <div style="padding: 16px; background: #ffffff; color: #4a5568; font-size: 1.25rem;">
          ${initialData.termsconditions}
        </div>
      </div>
    `
        : ""
      }

    <!-- Cancellation Policy Section -->
    ${initialData.cancellationPolicy
        ? `
      <div style="break-inside: avoid; border: 1px solid #ddd; border-radius: 8px; margin-top: 16px; box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(to right, #ef4444, #f97316); color: white; padding: 16px; display: flex; align-items: center;">
          <h3 style="font-size: 1.5rem; font-weight: bold; margin: 0;">Cancellation Policy</h3>
        </div>
        <div style="padding: 16px; background: #ffffff; color: #4a5568; font-size: 1.25rem;">
          ${initialData.cancellationPolicy}
        </div>
      </div>
    `
        : ""
      }

    <!-- Airline Cancellation Policy Section -->
    ${initialData.airlineCancellationPolicy
        ? `
      <div style="break-inside: avoid; border: 1px solid #ddd; border-radius: 8px; margin-top: 16px; box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(to right, #ef4444, #f97316); color: white; padding: 16px; display: flex; align-items: center;">
          <h3 style="font-size: 1.5rem; font-weight: bold; margin: 0;">Airline Cancellation Policy</h3>
        </div>
        <div style="padding: 16px; background: #ffffff; color: #4a5568; font-size: 1.25rem;">
          ${initialData.airlineCancellationPolicy}
        </div>
      </div>
    `
        : ""
      }

  
     ${selectedOption !== 'Empty' &&
        selectedOption !== 'SupplierA' &&
        selectedOption !== 'SupplierB'
        ? `
      <div style="border-bottom: 1px solid #ddd; margin: 16px 0; padding: 16px; display: flex; justify-content: space-between; align-items: center;">
        <div style="width: 120px; height: 120px; position: relative;">
          <img src="${currentCompany.logo}" alt="${currentCompany.name} Logo" style="width: 100%; height: 100%; object-fit: contain;" />
        </div>
        <ul style="list-style-type: none; margin: 0; padding: 0; font-weight: bold; color: #1a202c;">
          <li>${currentCompany.address}</li>
          <li>Phone: ${currentCompany.phone}</li>
          <li>
            Email: 
            <a href="mailto:${currentCompany.email}" style="color: #2563eb; text-decoration: underline;">
              ${currentCompany.email}
            </a>
          </li>
          <li>
            Website: 
            <a href="${currentCompany.website || '#'}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">
              ${currentCompany.website}
            </a>
          </li>
        </ul>
      </div>
      `
        : ''
      }
  
      ${(selectedOption === 'SupplierA' || selectedOption === 'SupplierB') 
        ? `
          <div style="border-bottom: 1px solid #ddd; margin: 16px 0; padding: 16px; display: flex; justify-content: space-between; align-items: center;">
            <div style="width: 120px; height: 120px; position: relative;">
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
        `
        : ``
      }  
    </div>
  `;


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
        const link = document.createElement("a");
        link.href = url;
        link.download = "generated.pdf";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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

  return (
    <div className="p-4">
      <button
        onClick={generatePDF}
        className="bg-blue-500 text-white px-4 py-2 rounded"
        disabled={loading}
      >
        {loading ? "Generating..." : "Download PDF"}
      </button>
    </div>
  );
};

export default TourPackageQueryPDFGenerator;
