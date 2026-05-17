import { PermissionGate } from "@/components/auth/PermissionGate";
import { FlightTicketForm } from "@/components/flight-tickets/FlightTicketForm";

export default function NewFlightTicketScreen() {
  return (
    <PermissionGate permission="flightTickets.write">
      <FlightTicketForm mode="create" />
    </PermissionGate>
  );
}
