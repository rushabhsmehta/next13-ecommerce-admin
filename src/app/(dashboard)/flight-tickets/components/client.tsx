"use client";

import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { Printer, Eye, Pencil, Trash2 } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { AlertModal } from "@/components/modals/alert-modal";
import { FlightTicket, Passenger } from "@prisma/client";

interface FlightTicketsClientProps {
  data: (FlightTicket & {
    passengers: Passenger[];
    tourPackageQuery?: {
      tourPackageQueryName: string | null;
      customerName: string | null;
    } | null;
  })[];
}

export const FlightTicketsClient: React.FC<FlightTicketsClientProps> = ({
  data
}) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deletingPnr, setDeletingPnr] = useState<string | null>(null);

  const onDelete = async (pnr: string) => {
    try {
      setLoading(true);
      await axios.delete(`/api/flight-tickets/${pnr}`);
      router.refresh();
      toast.success('Flight ticket deleted.');
    } catch (error) {
      toast.error('Something went wrong.');
    } finally {
      setLoading(false);
      setDeletingPnr(null);
      setOpen(false);
    }
  };

  return (
    <>
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={() => deletingPnr && onDelete(deletingPnr)}
        loading={loading}
      />
      <Card>
        <CardHeader>
          <CardTitle>Flight Tickets</CardTitle>
          <CardDescription>
            Manage your flight tickets and vouchers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PNR</TableHead>
                <TableHead>Passenger</TableHead>
                <TableHead>Flight</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                    No flight tickets found.
                  </TableCell>
                </TableRow>
              )}
              {data.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell>{ticket.passengers.length} Passengers</TableCell>

                  <TableCell className="font-medium">{ticket.pnr}</TableCell>
                  {ticket.passengers.map((passenger) => (
                    <TableCell key={passenger.id} className="font-medium">{passenger.name}</TableCell>
                  ))}

                  <TableCell>{ticket.passengers.length} Passengers</TableCell>

                  <TableCell>
                    {ticket.airline} {ticket.flightNumber}
                  </TableCell>
                  <TableCell>
                    {ticket.departureAirport} to {ticket.arrivalAirport}
                  </TableCell>
                  <TableCell>
                    {format(new Date(ticket.departureTime), "MMM d, yyyy h:mm a")}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${ticket.status === "confirmed"
                          ? "bg-green-100 text-green-800"
                          : ticket.status === "cancelled"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                    >
                      {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => router.push(`/flight-tickets/${ticket.pnr}`)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => router.push(`/flight-tickets/${ticket.pnr}/edit`)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => router.push(`/flight-tickets/${ticket.pnr}/print`)}
                        >
                          <Printer className="mr-2 h-4 w-4" />
                          Print Ticket
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setDeletingPnr(ticket.pnr);
                            setOpen(true);
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
};