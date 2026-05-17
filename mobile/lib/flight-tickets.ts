import type { AuthenticatedRequest } from "@/lib/associate-inquiries";

export interface FlightPassenger {
  id?: string;
  name: string;
  type: string;
  seatNumber?: string | null;
  age?: number | null;
  gender?: string | null;
}

export interface FlightTicket {
  id: string;
  pnr: string;
  airline: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  ticketClass: string;
  status: string;
  baggageAllowance: string | null;
  bookingReference: string | null;
  fareAmount: number | null;
  taxAmount: number | null;
  totalAmount: number | null;
  tourPackageQueryId: string | null;
  tourPackageQueryName: string | null;
  customerName: string | null;
  passengers: FlightPassenger[];
  createdAt?: string;
}

export interface FlightTicketListResponse {
  items: FlightTicket[];
  total: number;
  hasMore: boolean;
  nextOffset: number;
}

export interface FlightTicketInput {
  pnr?: string;
  airline: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  ticketClass: string;
  status?: string;
  baggageAllowance?: string | null;
  bookingReference?: string | null;
  fareAmount?: number | null;
  taxAmount?: number | null;
  totalAmount?: number | null;
  tourPackageQueryId?: string | null;
  passengers: FlightPassenger[];
}

export interface FlightTicketTourQueryOption {
  id: string;
  tourPackageQueryNumber: string | null;
  tourPackageQueryName: string | null;
  customerName: string | null;
  tourStartsFrom: string | null;
}

interface TourQueryPickerResponse {
  queries: FlightTicketTourQueryOption[];
}

function makeIdempotencyKey(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

function qsFrom(filters: Record<string, string | number | undefined | null>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value != null && String(value).trim() !== "") qs.set(key, String(value));
  }
  const raw = qs.toString();
  return raw ? `?${raw}` : "";
}

export function createFlightTicketsClient(authRequest: AuthenticatedRequest) {
  return {
    listTickets(
      filters: {
        search?: string;
        tourPackageQueryId?: string;
        limit?: number;
        offset?: number;
      } = {}
    ): Promise<FlightTicketListResponse> {
      return authRequest<FlightTicketListResponse>(
        `/api/mobile/flight-tickets${qsFrom(filters)}`,
        { retries: 1 }
      );
    },

    getTicket(pnr: string): Promise<FlightTicket> {
      return authRequest<FlightTicket>(
        `/api/mobile/flight-tickets/${encodeURIComponent(pnr)}`
      );
    },

    createTicket(input: FlightTicketInput): Promise<FlightTicket> {
      return authRequest<FlightTicket>("/api/mobile/flight-tickets", {
        method: "POST",
        body: input,
        headers: { "Idempotency-Key": makeIdempotencyKey("flight-ticket-create") },
      });
    },

    updateTicket(pnr: string, input: FlightTicketInput): Promise<FlightTicket> {
      return authRequest<FlightTicket>(
        `/api/mobile/flight-tickets/${encodeURIComponent(pnr)}`,
        {
          method: "PATCH",
          body: input,
          headers: { "Idempotency-Key": makeIdempotencyKey("flight-ticket-update") },
        }
      );
    },

    deleteTicket(pnr: string): Promise<{ deleted: boolean; ticket: { id: string; pnr: string } }> {
      return authRequest(`/api/mobile/flight-tickets/${encodeURIComponent(pnr)}`, {
        method: "DELETE",
        headers: { "Idempotency-Key": makeIdempotencyKey("flight-ticket-delete") },
      });
    },

    searchTourQueries(search: string): Promise<FlightTicketTourQueryOption[]> {
      return authRequest<TourQueryPickerResponse>(
        `/api/mobile/tour-queries${qsFrom({
          status: "all",
          limit: 8,
          search: search.trim(),
        })}`,
        { retries: 1 }
      ).then((res) => res.queries);
    },
  };
}

export type FlightTicketsClient = ReturnType<typeof createFlightTicketsClient>;
