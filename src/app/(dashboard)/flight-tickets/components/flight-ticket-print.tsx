"use client";

import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { Plane, ArrowLeft, Printer, BarChart4 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import Image from "next/image";
import QRCode from "react-qr-code";

interface FlightTicketPrintProps {
  flightTicket: any;
  organization: any;
}

export const FlightTicketPrint: React.FC<FlightTicketPrintProps> = ({
  flightTicket,
  organization
}) => {
  const router = useRouter();

  useEffect(() => {
    // Auto-trigger print dialog when component mounts
    const timeoutId = setTimeout(() => {
      window.print();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const departureDate = format(new Date(flightTicket.departureTime), "MMM d, yyyy");
  const departureTime = format(new Date(flightTicket.departureTime), "h:mm a");
  const arrivalDate = format(new Date(flightTicket.arrivalTime), "MMM d, yyyy");
  const arrivalTime = format(new Date(flightTicket.arrivalTime), "h:mm a");
  
  // Calculate duration between departure and arrival
  const durationMs = new Date(flightTicket.arrivalTime).getTime() - new Date(flightTicket.departureTime).getTime();
  const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
  const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  const flightDuration = `${durationHours}h ${durationMinutes}m`;

  return (
    <>
      <div className="print:hidden mb-4 flex justify-between">
        <Button 
          variant="outline"
          size="sm"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button 
          size="sm"
          onClick={handlePrint}
        >
          <Printer className="mr-2 h-4 w-4" />
          Print Ticket
        </Button>
      </div>

      {/* Printable Ticket */}
      <div className="w-full max-w-4xl mx-auto bg-white print:shadow-none shadow-lg rounded-lg overflow-hidden border border-gray-200 print:border-none">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center">
            {organization?.logoUrl ? (
              <div className="mr-3 w-12 h-12 relative">
                <Image 
                  src={organization.logoUrl} 
                  alt={organization?.name || "Company Logo"} 
                  fill
                  className="object-contain"
                />
              </div>
            ) : (
              <Plane className="h-12 w-12 text-blue-600 mr-3" />
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{organization?.name || "Travel Agency"}</h1>
              <p className="text-sm text-gray-500">{organization?.phone || ""}</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-semibold">Flight Ticket</h2>
            <p className="text-sm text-gray-500">Issue Date: {format(new Date(flightTicket.issueDate), "MMM d, yyyy")}</p>
          </div>
        </div>

        {/* Ticket Body */}
        <div className="p-6">
          {/* Flight Info */}
          <div className="flex flex-col md:flex-row justify-between mb-8">
            <div>
              <p className="text-sm font-medium text-gray-500">Airline</p>
              <p className="text-xl font-bold text-gray-900">{flightTicket.airline}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Flight</p>
              <p className="text-xl font-bold text-gray-900">{flightTicket.flightNumber}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Class</p>
              <p className="text-xl font-bold text-gray-900">{flightTicket.ticketClass}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Status</p>
              <p className={`text-xl font-bold ${
                flightTicket.status === "confirmed" 
                  ? "text-green-600" 
                  : flightTicket.status === "cancelled" 
                  ? "text-red-600" 
                  : "text-yellow-600"
              }`}>
                {flightTicket.status.charAt(0).toUpperCase() + flightTicket.status.slice(1)}
              </p>
            </div>
          </div>
          
          {/* Passenger Info */}
          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">Passenger Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Name</p>
                <p className="text-base font-bold text-gray-900">{flightTicket.passengerName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Type</p>
                <p className="text-base font-medium text-gray-900">{flightTicket.passengerType || 'Adult'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Seat</p>
                <p className="text-base font-medium text-gray-900">{flightTicket.seatNumber || 'Not Assigned'}</p>
              </div>
            </div>
          </div>
          
          {/* Route Info */}
          <div className="mb-8 relative">
            <div className="absolute left-0 right-0 top-1/2 border-t-2 border-dashed border-blue-200 z-0"></div>
            <div className="flex justify-between items-center relative z-10">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="text-center">
                  <p className="text-xl font-bold text-gray-900">{flightTicket.departureAirport}</p>
                  <p className="text-sm font-medium text-gray-500">{departureDate}</p>
                  <p className="text-lg font-bold text-gray-800">{departureTime}</p>
                </div>
              </div>
              
              <div className="flex flex-col items-center bg-white px-4">
                <div className="rounded-full bg-blue-100 p-2 mb-1">
                  <Plane className="h-6 w-6 text-blue-600 rotate-90" />
                </div>
                <p className="text-xs font-medium text-gray-500">{flightDuration}</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="text-center">
                  <p className="text-xl font-bold text-gray-900">{flightTicket.arrivalAirport}</p>
                  <p className="text-sm font-medium text-gray-500">{arrivalDate}</p>
                  <p className="text-lg font-bold text-gray-800">{arrivalTime}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Ticket Details & QR Code */}
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-3">Ticket Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <p className="text-gray-600">PNR</p>
                  <p className="font-medium text-gray-900">{flightTicket.pnr}</p>
                </div>
                {flightTicket.bookingReference && (
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <p className="text-gray-600">Booking Reference</p>
                    <p className="font-medium text-gray-900">{flightTicket.bookingReference}</p>
                  </div>
                )}
                {flightTicket.baggageAllowance && (
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <p className="text-gray-600">Baggage</p>
                    <p className="font-medium text-gray-900">{flightTicket.baggageAllowance}</p>
                  </div>
                )}
                {flightTicket.tourPackageQuery && (
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <p className="text-gray-600">Tour Package</p>
                    <p className="font-medium text-gray-900">
                      {flightTicket.tourPackageQuery.tourPackageQueryName || 
                       flightTicket.tourPackageQuery.customerName || 
                       flightTicket.tourPackageQuery.id}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Fare Details */}
              {(flightTicket.fareAmount || flightTicket.taxAmount || flightTicket.totalAmount) && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3">Fare Summary</h3>
                  <div className="space-y-2">
                    {flightTicket.fareAmount && (
                      <div className="flex justify-between border-b border-gray-100 pb-2">
                        <p className="text-gray-600">Base Fare</p>
                        <p className="font-medium text-gray-900">₹ {flightTicket.fareAmount}</p>
                      </div>
                    )}
                    {flightTicket.taxAmount && (
                      <div className="flex justify-between border-b border-gray-100 pb-2">
                        <p className="text-gray-600">Taxes & Fees</p>
                        <p className="font-medium text-gray-900">₹ {flightTicket.taxAmount}</p>
                      </div>
                    )}
                    {flightTicket.totalAmount && (
                      <div className="flex justify-between font-semibold">
                        <p className="text-gray-800">Total Amount</p>
                        <p className="text-gray-900">₹ {flightTicket.totalAmount}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex flex-col items-center justify-center">
              <div className="p-3 bg-white border border-gray-200 rounded-lg">
                <QRCode 
                  value={`PNR:${flightTicket.pnr},NAME:${flightTicket.passengerName},FLIGHT:${flightTicket.flightNumber}`} 
                  size={128} 
                />
              </div>
              <p className="mt-2 text-xs text-gray-500 text-center">Scan for ticket details</p>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="bg-gray-50 p-4 text-center text-xs text-gray-500 border-t border-gray-200">
          <p>This is an electronic ticket. Please bring a valid photo ID for check-in.</p>
          <p className="mt-1">{organization?.name ? `© ${new Date().getFullYear()} ${organization.name}` : ""} {organization?.website || ""}</p>
        </div>
      </div>
    </>
  );
};