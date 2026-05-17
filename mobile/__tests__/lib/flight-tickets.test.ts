import { createFlightTicketsClient } from "../../lib/flight-tickets";

describe("createFlightTicketsClient", () => {
  it("lists tickets with search and pagination", async () => {
    const request = jest.fn(async () => ({ items: [], total: 0, hasMore: false, nextOffset: 0 }));
    const client = createFlightTicketsClient(request as any);
    await client.listTickets({ search: "PNR", limit: 10, offset: 20 });
    expect(request).toHaveBeenCalledWith(
      "/api/mobile/flight-tickets?search=PNR&limit=10&offset=20",
      { retries: 1 }
    );
  });

  it("creates, updates, and deletes with idempotency keys", async () => {
    const request = jest.fn(async () => ({ pnr: "ABC123", passengers: [] }));
    const client = createFlightTicketsClient(request as any);
    const input = {
      pnr: "ABC123",
      airline: "Indigo",
      flightNumber: "6E101",
      departureAirport: "AMD",
      arrivalAirport: "DEL",
      departureTime: "2026-06-01",
      arrivalTime: "2026-06-01",
      ticketClass: "Economy",
      passengers: [{ name: "Ravi", type: "Adult" }],
    };
    await client.createTicket(input);
    await client.updateTicket("ABC/123", input);
    await client.deleteTicket("ABC/123");

    expect(request.mock.calls[0][0]).toBe("/api/mobile/flight-tickets");
    expect(request.mock.calls[0][1].headers["Idempotency-Key"]).toMatch(/^flight-ticket-create-/);
    expect(request.mock.calls[1][0]).toBe("/api/mobile/flight-tickets/ABC%2F123");
    expect(request.mock.calls[1][1].headers["Idempotency-Key"]).toMatch(/^flight-ticket-update-/);
    expect(request.mock.calls[2][1].method).toBe("DELETE");
    expect(request.mock.calls[2][1].headers["Idempotency-Key"]).toMatch(/^flight-ticket-delete-/);
  });

  it("searches tour queries for linking", async () => {
    const request = jest.fn(async () => ({ queries: [] }));
    const client = createFlightTicketsClient(request as any);
    await client.searchTourQueries("mehta");
    expect(request).toHaveBeenCalledWith(
      "/api/mobile/tour-queries?status=all&limit=8&search=mehta",
      { retries: 1 }
    );
  });
});
