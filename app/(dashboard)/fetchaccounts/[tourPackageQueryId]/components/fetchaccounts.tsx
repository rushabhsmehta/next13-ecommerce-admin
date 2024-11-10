'use client'
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircleIcon, CreditCardIcon, InfoIcon, PlaneIcon, PlaneTakeoffIcon, Shield, XCircleIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Location, Images, Hotel, TourPackageQuery, Itinerary, FlightDetails, Activity } from "@prisma/client";
import { useSearchParams } from 'next/navigation'
import { format, parseISO } from 'date-fns';
import { Separator } from '@radix-ui/react-separator';

interface TourPackageQueryDisplayProps {
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
  selectedOption?: string; // Add this line to accept the selected option

};



export const TourPackageQueryDisplay: React.FC<TourPackageQueryDisplayProps> = ({
  initialData,
  locations,
  hotels,
  // selectedOption = 'Empty', // Provide a default value
}) => {

  const searchParams = useSearchParams();
  const selectedOption = searchParams.get('search') || 'Empty'; // 'option' is the name of your query parameter

  // Now you can use selectedOption to get data from your companyInfo object

  if (!initialData) return <div>No data available</div>;

  return (
    <div className="flex flex-col space-y-2 md:space-y-4 px-4 sm:px-2 md:px-8 lg:px-40">

      {initialData.purchaseDetails && (
        <div className="mb-4">
          <div className="font-semibold text-xl">
            Purchase Details
            <span className="ml-2 text-2xl text-gray-900">{initialData.purchaseDetails}</span>
          </div>
        </div>
      )}

      {initialData.saleDetails && (
        <div className="mb-4">
          <div className="font-semibold text-xl">
            Sale Details
            <span className="ml-2 text-2xl text-gray-900">{initialData.saleDetails}</span>
          </div>
        </div>
      )}

      {initialData.paymentDetails && (
        <div className="mb-4">
          <div className="font-semibold text-xl">
            Payment Details
            <span className="ml-2 text-2xl text-gray-900">{initialData.paymentDetails}</span>
          </div>
        </div>
      )}

      {initialData.receiptDetails && (
        <div className="mb-4">
          <div className="font-semibold text-xl">
            Receipt Details
            <span className="ml-2 text-2xl text-gray-900">{initialData.receiptDetails}</span>
          </div>
        </div>
      )}

      {initialData.expenseDetails && (
        <div className="mb-4">
          <div className="font-semibold text-xl">
            Expense Details
            <span className="ml-2 text-2xl text-gray-900">{initialData.expenseDetails}</span>
          </div>
        </div>
      )}

    </div >
  );
};
