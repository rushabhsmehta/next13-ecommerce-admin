'use client'
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircleIcon, CreditCardIcon, InfoIcon, PlaneIcon, PlaneTakeoffIcon, Shield, XCircleIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Location, Images, Hotel, TourPackageQuery, Itinerary, FlightDetails, Activity } from "@prisma/client";
import { useSearchParams } from 'next/navigation'
import { format, parseISO } from 'date-fns';
import { Separator } from '@radix-ui/react-separator';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';

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
    <>
      
        
        <div className="space-y-8 w-full max-w-md mx-auto">
          <Card className="break-inside-avoid font-bold">
            <CardHeader className="bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-t-lg flex justify-between items-center">
              <CardTitle className="flex items-center justify-between text-xl font-bold">
                <span>{initialData?.tourPackageQueryName}</span>
              </CardTitle>
              <CardTitle className="text-xl font-bold  mb-4">
                {initialData?.tourPackageQueryNumber}
              </CardTitle>
              <CardTitle className="flex items-center justify-between text-xl font-bold">
                <span>{initialData?.tourPackageQueryType + " Package"} </span>
              </CardTitle>
            </CardHeader>
          </Card>

          <Separator />
          {initialData.purchaseDetails && (
            <Card className="shadow-lg rounded-lg">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Purchase Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-gray-900 text-lg whitespace-pre-line">{initialData.purchaseDetails}</div>
              </CardContent>
            </Card>
          )}

          {initialData.saleDetails && (
            <Card className="shadow-lg rounded-lg">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Sale Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-gray-900 text-lg whitespace-pre-line">{initialData.saleDetails}</div>
              </CardContent>
            </Card>
          )}

          {initialData.paymentDetails && (
            <Card className="shadow-lg rounded-lg">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Payment Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-gray-900 text-lg whitespace-pre-line">{initialData.paymentDetails}</div>
              </CardContent>
            </Card>
          )}

          {initialData.receiptDetails && (
            <Card className="shadow-lg rounded-lg">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Receipt Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-gray-900 text-lg whitespace-pre-line">{initialData.receiptDetails}</div>
              </CardContent>
            </Card>
          )}

          {initialData.expenseDetails && (
            <Card className="shadow-lg rounded-lg">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Expense Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-gray-900 text-lg whitespace-pre-line">{initialData.expenseDetails}</div>
              </CardContent>
            </Card>
          )}
        </div >
      
    </>
  );
};
