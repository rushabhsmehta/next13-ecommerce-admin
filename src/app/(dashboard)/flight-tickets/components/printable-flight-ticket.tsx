"use client";

import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Printer, Plane, Users } from "lucide-react";
import QRCode from "react-qr-code";
import jsPDF from "jspdf";
import 'jspdf-autotable';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface PrintableFlightTicketProps {
  flightTicket: any;
}

export const PrintableFlightTicket: React.FC<PrintableFlightTicketProps> = ({
  flightTicket
}) => {
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  
  const [company] = useState({
    name: "Aagam Holidays",
    logo: "/aagamholidays.png",
    address: "123 Travel Street, Mumbai, India",
    phone: "+91 98765 43210",
    email: "info@aagamholidays.com",
  });

  // Generate QR code data URL for embedding in PDF
  useEffect(() => {
    if (qrCodeRef.current) {
      const qrCodeElement = qrCodeRef.current.querySelector('svg');
      if (qrCodeElement) {
        const svgData = new XMLSerializer().serializeToString(qrCodeElement);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx?.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          setQrCodeDataUrl(dataUrl);
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
      }
    }
  }, []); // Removing qrCodeRef.current from dependencies as it's a mutable ref

  // Function to generate PDF using jsPDF
  const generatePDF = (download: boolean = false) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Add company logo (if available)
    try {
      doc.addImage("/aagamholidays.png", "PNG", 15, 10, 20, 20);
    } catch (e) {
      console.log("Company logo couldn't be added to PDF");
    }
    
    // Set font styles
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    
    // Title and company info
    doc.text(`${company.name} - Flight Ticket`, doc.internal.pageSize.width / 2, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(company.address, doc.internal.pageSize.width / 2, 22, { align: 'center' });
    doc.text(`Phone: ${company.phone} | Email: ${company.email}`, doc.internal.pageSize.width / 2, 27, { align: 'center' });
    
    // Add horizontal line
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 32, doc.internal.pageSize.width - 15, 32);
    
    // PNR and Status
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("PNR:", 15, 40);
    doc.setFontSize(14);
    doc.text(flightTicket.pnr, 30, 40);
    
    doc.setFontSize(12);
    doc.text("Status:", doc.internal.pageSize.width - 50, 40);
    
    let statusColor = [0, 128, 0]; // Green for confirmed
    if (flightTicket.status === "cancelled") statusColor = [220, 20, 60]; // Red for cancelled
    if (flightTicket.status === "rescheduled") statusColor = [255, 165, 0]; // Orange for rescheduled
    
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text(flightTicket.status.toUpperCase(), doc.internal.pageSize.width - 35, 40);
    doc.setTextColor(0, 0, 0); // Reset to black
    
    // Flight Information
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Flight Information", 15, 50);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Airline: ${flightTicket.airline}`, 15, 58);
    doc.text(`Flight: ${flightTicket.flightNumber}`, 80, 58);
    doc.text(`Class: ${flightTicket.ticketClass}`, 140, 58);
    
    // Flight route
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    
    // Center the departure and arrival
    const centerX = doc.internal.pageSize.width / 2;
    
    doc.text(flightTicket.departureAirport, centerX - 40, 70, { align: 'center' });
    doc.text(flightTicket.arrivalAirport, centerX + 40, 70, { align: 'center' });
    
    // Flight arrow
    doc.setDrawColor(0, 0, 0);
    doc.line(centerX - 30, 70, centerX + 30, 70);
    
    // Arrow tip
    doc.line(centerX + 30, 70, centerX + 25, 68);
    doc.line(centerX + 30, 70, centerX + 25, 72);
    
    // Times
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(format(new Date(flightTicket.departureTime), "MMM d, yyyy h:mm a"), centerX - 40, 78, { align: 'center' });
    doc.text(format(new Date(flightTicket.arrivalTime), "MMM d, yyyy h:mm a"), centerX + 40, 78, { align: 'center' });
    
    // Add horizontal line
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 85, doc.internal.pageSize.width - 15, 85);
    
    // Passenger Information
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Passenger Information (${flightTicket.passengers.length})`, 15, 95);
    
    // Using autotable to create a table of passengers
    const passengerTableData = flightTicket.passengers.map((passenger: any, index: number) => [
      index + 1,
      passenger.name,
      passenger.type || 'Adult',
      passenger.seatNumber || 'Not Assigned',
      passenger.age || '-',
      passenger.gender || '-'
    ]);
    
    // @ts-ignore
    doc.autoTable({
      startY: 100,
      head: [['#', 'Name', 'Type', 'Seat', 'Age', 'Gender']],
      body: passengerTableData,
      theme: 'grid',
      headStyles: { fillColor: [51, 51, 255], textColor: 255 },
      margin: { left: 15, right: 15 },
      styles: { overflow: 'linebreak', cellWidth: 'auto' },
      columnStyles: { 
        0: { cellWidth: 10 }, 
        1: { cellWidth: 'auto' } 
      }
    });
    
    // Get the Y position after the table
    // @ts-ignore
    const tableEndY = doc.previousAutoTable.finalY + 10;
    
    // Additional Information
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Additional Information", 15, tableEndY);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Baggage Allowance: ${flightTicket.baggageAllowance || 'Standard allowance'}`, 15, tableEndY + 8);
    doc.text(`Booking Reference: ${flightTicket.bookingReference || '-'}`, 15, tableEndY + 16);
    doc.text(`Issue Date: ${format(new Date(flightTicket.issueDate), "MMMM d, yyyy")}`, 15, tableEndY + 24);
    
    // Tour Package Information if available
    if (flightTicket.tourPackageQuery) {
      doc.text(`Tour Package: ${flightTicket.tourPackageQuery.tourPackageQueryName || 
                flightTicket.tourPackageQuery.customerName || 
                flightTicket.tourPackageQuery.id}`, 15, tableEndY + 32);
    }
    
    // Fare Information if available
    if (flightTicket.fareAmount || flightTicket.taxAmount || flightTicket.totalAmount) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Fare Information", doc.internal.pageSize.width - 80, tableEndY);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      let yPos = tableEndY + 8;
      if (flightTicket.fareAmount) {
        doc.text(`Base Fare:`, doc.internal.pageSize.width - 80, yPos);
        doc.text(`₹ ${flightTicket.fareAmount}`, doc.internal.pageSize.width - 30, yPos, { align: 'right' });
        yPos += 8;
      }
      
      if (flightTicket.taxAmount) {
        doc.text(`Taxes & Fees:`, doc.internal.pageSize.width - 80, yPos);
        doc.text(`₹ ${flightTicket.taxAmount}`, doc.internal.pageSize.width - 30, yPos, { align: 'right' });
        yPos += 8;
      }
      
      if (flightTicket.totalAmount) {
        doc.setFont("helvetica", "bold");
        doc.text(`Total:`, doc.internal.pageSize.width - 80, yPos);
        doc.text(`₹ ${flightTicket.totalAmount}`, doc.internal.pageSize.width - 30, yPos, { align: 'right' });
      }
    }
    
    // Add QR code if available
    if (qrCodeDataUrl) {
      try {
        doc.addImage(qrCodeDataUrl, 'PNG', doc.internal.pageSize.width - 35, tableEndY + 40, 25, 25);
        doc.setFontSize(8);
        doc.text("Scan for verification", doc.internal.pageSize.width - 22.5, tableEndY + 68, { align: 'center' });
      } catch (e) {
        console.log("QR code couldn't be added to PDF", e);
      }
    }
    
    // Footer text
    const footerY = doc.internal.pageSize.height - 10;
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text("This is a computer-generated document and does not require a signature.", doc.internal.pageSize.width / 2, footerY, { align: 'center' });
    
    // Save or print the PDF
    if (download) {
      doc.save(`Flight_Ticket_${flightTicket.pnr}.pdf`);
    } else {
      // Open PDF in a new tab for printing
      window.open(URL.createObjectURL(doc.output('blob')));
    }
  };

  const handleGeneratePDF = () => {
    generatePDF(true);
  };
  
  const handlePrint = () => {
    generatePDF(false);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <Button 
          variant="outline"
          size="sm"
          onClick={() => router.push(`/flight-tickets/${flightTicket.pnr}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Ticket Details
        </Button>
        <div className="flex space-x-2">
          <Button 
            variant="secondary"
            size="sm"
            onClick={handleGeneratePDF}
          >
            <Download className="mr-2 h-4 w-4" />
            Save as PDF
          </Button>
          <Button 
            size="sm"
            onClick={handlePrint}
          >
            <Printer className="mr-2 h-4 w-4" />
            Print Ticket
          </Button>
        </div>
      </div>

      {/* Printable Content Preview */}
      <div className="bg-white rounded-md border shadow-sm p-8 max-w-4xl mx-auto" ref={printRef}>
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
          <div className="flex items-center mb-4 md:mb-0">
            <img 
              src={company.logo} 
              alt={company.name} 
              className="h-12 mr-3" 
            />
            <div>
              <h2 className="text-xl font-bold">{company.name}</h2>
              <p className="text-sm text-muted-foreground">{company.address}</p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold flex items-center justify-center md:justify-end">
              <Plane className="mr-2 h-6 w-6" />
              Flight Ticket
            </h1>
            <p className="text-sm text-muted-foreground">{format(new Date(), "MMMM d, yyyy")}</p>
          </div>
        </div>

        <Separator className="my-4" />

        {/* PNR and Status */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <p className="text-sm text-muted-foreground">PNR</p>
            <p className="text-2xl font-black tracking-wider">{flightTicket.pnr}</p>
          </div>
          <div className="mt-2 md:mt-0">
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge 
              className={`
                ${flightTicket.status === "confirmed" ? "bg-green-100 text-green-800 hover:bg-green-100" : 
                  flightTicket.status === "cancelled" ? "bg-red-100 text-red-800 hover:bg-red-100" : 
                  "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"}
              `}
            >
              {flightTicket.status.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Flight Information */}
        <div className="bg-slate-50 p-4 rounded-lg mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div className="mb-4 md:mb-0">
              <p className="text-sm text-muted-foreground">Airline</p>
              <p className="text-xl font-bold">{flightTicket.airline}</p>
            </div>
            <div className="mb-4 md:mb-0">
              <p className="text-sm text-muted-foreground">Flight</p>
              <p className="text-xl font-bold">{flightTicket.flightNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Class</p>
              <p className="text-xl font-bold">{flightTicket.ticketClass}</p>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute left-0 right-0 top-1/2 border-t-2 border-dashed"></div>
            <div className="flex justify-between items-center relative">
              <div className="bg-slate-50 p-2 text-center z-10">
                <p className="text-xl font-bold">{flightTicket.departureAirport}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(flightTicket.departureTime), "MMM d, yyyy")}
                </p>
                <p className="text-sm font-medium">
                  {format(new Date(flightTicket.departureTime), "h:mm a")}
                </p>
              </div>
              
              <div className="flex flex-col items-center z-10 bg-slate-50 px-2">
                <Plane className="h-5 w-5 text-primary rotate-90" />
                <p className="text-xs text-muted-foreground">Flight Duration</p>
              </div>
              
              <div className="bg-slate-50 p-2 text-center z-10">
                <p className="text-xl font-bold">{flightTicket.arrivalAirport}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(flightTicket.arrivalTime), "MMM d, yyyy")}
                </p>
                <p className="text-sm font-medium">
                  {format(new Date(flightTicket.arrivalTime), "h:mm a")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Passenger Information */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Passenger Information</h3>
            <Badge variant="outline" className="flex items-center">
              <Users className="h-3.5 w-3.5 mr-1" />
              {flightTicket.passengers.length} {flightTicket.passengers.length === 1 ? 'Passenger' : 'Passengers'}
            </Badge>
          </div>
          
          <div className="border rounded-lg divide-y">
            {flightTicket.passengers.map((passenger: any, index: number) => (
              <div key={passenger.id} className="p-3 flex flex-col md:flex-row justify-between">
                <div className="flex-1 mb-2 md:mb-0">
                  <p className="text-sm text-muted-foreground">Passenger {index + 1}</p>
                  <p className="text-lg font-bold">{passenger.name}</p>
                </div>
                <div className="flex flex-row justify-between md:justify-end space-x-4 md:space-x-8">
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-medium">{passenger.type || 'Adult'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Seat</p>
                    <p className="font-medium">{passenger.seatNumber || 'Not Assigned'}</p>
                  </div>
                  {passenger.age && (
                    <div>
                      <p className="text-sm text-muted-foreground">Age</p>
                      <p className="font-medium">{passenger.age}</p>
                    </div>
                  )}
                  {passenger.gender && (
                    <div>
                      <p className="text-sm text-muted-foreground">Gender</p>
                      <p className="font-medium">{passenger.gender}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <p className="text-sm text-muted-foreground">Baggage Allowance</p>
            <p className="font-medium">{flightTicket.baggageAllowance || 'Standard allowance'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Booking Reference</p>
            <p className="font-medium">{flightTicket.bookingReference || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Issue Date</p>
            <p className="font-medium">{format(new Date(flightTicket.issueDate), "MMMM d, yyyy")}</p>
          </div>
        </div>

        {/* Tour Package Information */}
        {flightTicket.tourPackageQuery && (
          <div className="mb-6 p-3 border rounded-lg bg-slate-50">
            <p className="text-sm text-muted-foreground">Tour Package</p>
            <p className="font-medium">
              {flightTicket.tourPackageQuery.tourPackageQueryName || 
               flightTicket.tourPackageQuery.customerName || 
               flightTicket.tourPackageQuery.id}
            </p>
          </div>
        )}

        {/* QR Code and Footer */}
        <div className="flex flex-col md:flex-row justify-between items-center mt-8">
          <div className="order-2 md:order-1 text-center md:text-left mt-4 md:mt-0">
            <p className="text-sm text-muted-foreground mb-1">For support, contact:</p>
            <p className="font-medium">{company.phone}</p>
            <p className="font-medium">{company.email}</p>
            <p className="mt-4 text-xs text-muted-foreground">
              This is a computer-generated document and does not require a signature.
            </p>
          </div>
          
          <div className="order-1 md:order-2 flex flex-col items-center">
            <div className="p-2 bg-white border rounded-lg" ref={qrCodeRef}>
              <QRCode 
                value={`PNR:${flightTicket.pnr},FLIGHT:${flightTicket.flightNumber}`} 
                size={100} 
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Scan for verification</p>
          </div>
        </div>
      </div>
    </>
  );
};