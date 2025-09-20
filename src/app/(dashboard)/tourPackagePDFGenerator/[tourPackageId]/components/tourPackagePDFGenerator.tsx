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
  name: string;
  logo: string;
  address: string;
  phone: string;
  email: string;
  website: string;
};


const TourPackagePDFGenerator = ({ initialData, locations, hotels }: TourPackagePDFGeneratorProps) => {
  // State for loading
  const [loading, setLoading] = useState(false);

  // Stub all required variables for buildHtmlContent
  const containerStyle = "";
  const headerSection = "";
  const tourInfoSection = "";
  const totalPriceSection = "";
  const hotelsSection = "";
  const flightSection = "";
  const itinerariesSection = "";
  const inclusionsSection = "";
  const exclusionsSection = "";
  const importantNotesSection = "";
  const paymentPolicySection = "";
  const kitchenGroupPolicySection = "";
  const termsConditionsSection = "";
  const cancellationPolicySection = "";
  const airlineCancellationSection = "";
  const usefulTipsSection = "";
  const companySection = "";
  const currentCompany = { name: "", logo: "", address: "", phone: "", email: "", website: "" };
  const selectedOption = "";
  const parsePolicyField = (field: any) => [];

  const buildHtmlContent = useCallback((): string => {
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
        ${companySection}
      </div>
    `;
  }, [containerStyle, headerSection, tourInfoSection, totalPriceSection, hotelsSection, flightSection, itinerariesSection, inclusionsSection, exclusionsSection, importantNotesSection, paymentPolicySection, kitchenGroupPolicySection, termsConditionsSection, cancellationPolicySection, airlineCancellationSection, usefulTipsSection, companySection]);

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
        const fileName = initialData?.tourPackageName && initialData?.tourPackageType
          ? `${initialData.tourPackageName.replace(/[^a-zA-Z0-9-_]/g, "_")}_${initialData.tourPackageType.replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`
          : "Tour_Package.pdf";
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
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
  }, [buildHtmlContent, initialData]);


  useEffect(() => {
    generatePDF();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  if (!initialData) {
    return <div>No data available</div>;
  }
  return <div>PDF Generated Sucessfully</div>; // Return nothing as the component is only for generating the PDF
};

export default TourPackagePDFGenerator;
