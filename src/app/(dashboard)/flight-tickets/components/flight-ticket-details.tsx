"use client";

import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { Plane, Printer, Pencil, ArrowLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Badge
} from "@/components/ui/badge";

interface FlightTicketDetailsProps {
  flightTicket: any;
}

export const FlightTicketDetails: React.FC<FlightTicketDetailsProps> = ({
  flightTicket
}) => {
  const router = useRouter();

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <Button 
          variant="outline"
          size="sm"
          onClick={() => router.push("/flight-tickets")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Flight Tickets
        </Button>
        <div className="flex space-x-2">
          <Button 
            variant="outline"
            size="sm"
            onClick={() => router.push(`/flight-tickets/${flightTicket.pnr}/edit`)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit Ticket
          </Button>
          <Button 
            size="sm"
            onClick={() => router.push(`/flight-tickets/${flightTicket.pnr}/print`)}
          >
            <Printer className="mr-2 h-4 w-4" />
            Print Ticket
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <Plane className="mr-2 h-6 w-6" />
            Flight Ticket Details
          </CardTitle>
          <CardDescription>
            View details for flight ticket with PNR: {flightTicket.pnr}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Flight Information */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Flight Information</h3>
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <div className="text-center md:text-left mb-4 md:mb-0">
                  <p className="text-sm text-muted-foreground">Airline</p>
                  <p className="text-xl font-bold">{flightTicket.airline}</p>
                </div>
                <div className="text-center mb-4 md:mb-0">
                  <p className="text-sm text-muted-foreground">Flight Number</p>
                  <p className="text-xl font-bold">{flightTicket.flightNumber}</p>
                </div>
                <div className="text-center md:text-right">
                  <p className="text-sm text-muted-foreground">Class</p>
                  <p className="text-xl font-bold">{flightTicket.ticketClass}</p>
                </div>
              </div>
              
              <div className="relative">
                <div className="absolute left-0 right-0 top-1/2 border-t border-dashed border-muted-foreground"></div>
                <div className="flex justify-between items-center relative">
                  <div className="bg-muted p-2 text-center z-10">
                    <p className="text-xl font-bold">{flightTicket.departureAirport}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(flightTicket.departureTime), "MMM d, yyyy")}
                    </p>
                    <p className="text-sm font-medium">
                      {format(new Date(flightTicket.departureTime), "h:mm a")}
                    </p>
                  </div>
                  
                  <div className="flex flex-col items-center z-10 bg-muted px-2">
                    <Plane className="h-5 w-5 text-primary rotate-90" />
                    <p className="text-xs text-muted-foreground">Flight Duration</p>
                  </div>
                  
                  <div className="bg-muted p-2 text-center z-10">
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
          </div>

          {/* Passengers Information */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">Passengers ({flightTicket.passengers.length})</h3>
              <Badge variant="outline" className="flex items-center">
                <Users className="h-3.5 w-3.5 mr-1" />
                {flightTicket.passengers.length} {flightTicket.passengers.length === 1 ? 'Passenger' : 'Passengers'}
              </Badge>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Seat</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Gender</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flightTicket.passengers.map((passenger: any, index: number) => (
                    <TableRow key={passenger.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{passenger.name}</TableCell>
                      <TableCell>{passenger.type || 'Adult'}</TableCell>
                      <TableCell>{passenger.seatNumber || 'Not Assigned'}</TableCell>
                      <TableCell>{passenger.age || '-'}</TableCell>
                      <TableCell>{passenger.gender || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Ticket Information */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Ticket Information</h3>
            <div className="bg-muted p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">PNR</p>
                  <p className="text-lg font-medium">{flightTicket.pnr}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className={`text-lg font-medium ${
                    flightTicket.status === "confirmed" 
                      ? "text-green-600" 
                      : flightTicket.status === "cancelled" 
                      ? "text-red-600" 
                      : "text-yellow-600"
                  }`}>
                    {flightTicket.status.charAt(0).toUpperCase() + flightTicket.status.slice(1)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Booking Reference</p>
                  <p className="text-lg font-medium">{flightTicket.bookingReference || '-'}</p>
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Issue Date</p>
                  <p className="text-lg font-medium">
                    {format(new Date(flightTicket.issueDate), "MMM d, yyyy")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Baggage Allowance</p>
                  <p className="text-lg font-medium">{flightTicket.baggageAllowance || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tour Package</p>
                  <p className="text-lg font-medium">
                    {flightTicket.tourPackageQuery ? 
                      (flightTicket.tourPackageQuery.tourPackageQueryName || 
                       flightTicket.tourPackageQuery.customerName || 
                       flightTicket.tourPackageQuery.id) : 
                      'No package linked'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Fare Information */}
          {(flightTicket.fareAmount || flightTicket.taxAmount || flightTicket.totalAmount) && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Fare Information</h3>
              <div className="bg-muted p-4 rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {flightTicket.fareAmount && (
                      <TableRow>
                        <TableCell>Base Fare</TableCell>
                        <TableCell className="text-right">₹ {flightTicket.fareAmount}</TableCell>
                      </TableRow>
                    )}
                    {flightTicket.taxAmount && (
                      <TableRow>
                        <TableCell>Taxes & Fees</TableCell>
                        <TableCell className="text-right">₹ {flightTicket.taxAmount}</TableCell>
                      </TableRow>
                    )}
                    {flightTicket.totalAmount && (
                      <TableRow className="font-medium">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right">₹ {flightTicket.totalAmount}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};