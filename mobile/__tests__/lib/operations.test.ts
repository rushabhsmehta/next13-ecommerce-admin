import { createOperationsClient } from "../../lib/operations";

const READ_CACHE = { cacheTtlSeconds: 45, dedupe: true, staleOnError: true };
const LOOKUP_CACHE = { cacheTtlSeconds: 300, dedupe: true, staleOnError: true };

describe("createOperationsClient", () => {
  it("listSuppliers builds the query string", async () => {
    const request = jest.fn(async () => ({
      suppliers: [],
      total: 0,
      hasMore: false,
      nextOffset: 0,
    }));
    const client = createOperationsClient(request as any);
    await client.listSuppliers({ search: "acme", limit: 10, offset: 20 });
    expect(request).toHaveBeenCalledWith(
      "/api/mobile/operations/suppliers?search=acme&limit=10&offset=20",
      READ_CACHE
    );
  });

  it("listSuppliers with no filters omits the query string", async () => {
    const request = jest.fn(async () => ({
      suppliers: [],
      total: 0,
      hasMore: false,
      nextOffset: 0,
    }));
    const client = createOperationsClient(request as any);
    await client.listSuppliers();
    expect(request).toHaveBeenCalledWith("/api/mobile/operations/suppliers", READ_CACHE);
  });

  it("getSupplier encodes the id", async () => {
    const request = jest.fn(async () => ({}));
    const client = createOperationsClient(request as any);
    await client.getSupplier("a/b");
    expect(request).toHaveBeenCalledWith(
      "/api/mobile/operations/suppliers/a%2Fb"
    );
  });

  it("createSupplier POSTs with an idempotency key", async () => {
    const request = jest.fn(async () => ({ id: "s1", name: "X" }));
    const client = createOperationsClient(request as any);
    await client.createSupplier({ name: "X" });
    const [endpoint, opts] = request.mock.calls[0];
    expect(endpoint).toBe("/api/mobile/operations/suppliers");
    expect(opts.method).toBe("POST");
    expect(opts.headers["Idempotency-Key"]).toMatch(/^supplier-create-/);
  });

  it("updateSupplier PATCHes; deleteSupplier DELETEs", async () => {
    const request = jest.fn(async () => ({ id: "s1", name: "X" }));
    const client = createOperationsClient(request as any);
    await client.updateSupplier("s1", { name: "Y" });
    await client.deleteSupplier("s1");
    expect(request.mock.calls[0][0]).toBe(
      "/api/mobile/operations/suppliers/s1"
    );
    expect(request.mock.calls[0][1].method).toBe("PATCH");
    expect(request.mock.calls[1][1].method).toBe("DELETE");
  });

  it("listStaff builds query (search + activeOnly)", async () => {
    const request = jest.fn(async () => ({ staff: [], total: 0 }));
    const client = createOperationsClient(request as any);
    await client.listStaff({ search: "priya", activeOnly: true });
    expect(request).toHaveBeenCalledWith(
      "/api/mobile/operations/staff?search=priya&activeOnly=true",
      READ_CACHE
    );
  });

  it("createStaff POSTs with an idempotency key", async () => {
    const request = jest.fn(async () => ({ id: "st1" }));
    const client = createOperationsClient(request as any);
    await client.createStaff({
      name: "Priya",
      email: "p@x.com",
      password: "secret1",
    });
    const [endpoint, opts] = request.mock.calls[0];
    expect(endpoint).toBe("/api/mobile/operations/staff");
    expect(opts.method).toBe("POST");
    expect(opts.headers["Idempotency-Key"]).toMatch(/^staff-create-/);
  });

  it("updateStaff PATCHes; deleteStaff DELETEs; ids encoded", async () => {
    const request = jest.fn(async () => ({ id: "st1" }));
    const client = createOperationsClient(request as any);
    await client.updateStaff("a b", { name: "P", email: "p@x.com" });
    await client.deleteStaff("a b");
    expect(request.mock.calls[0][0]).toBe("/api/mobile/operations/staff/a%20b");
    expect(request.mock.calls[0][1].method).toBe("PATCH");
    expect(request.mock.calls[1][0]).toBe("/api/mobile/operations/staff/a%20b");
    expect(request.mock.calls[1][1].method).toBe("DELETE");
  });

  it("getStaff hits the detail endpoint", async () => {
    const request = jest.fn(async () => ({
      staff: {},
      summary: { assignedInquiries: 0 },
    }));
    const client = createOperationsClient(request as any);
    await client.getStaff("st1");
    expect(request).toHaveBeenCalledWith("/api/mobile/operations/staff/st1");
  });

  it("listTransportPricing builds the query string", async () => {
    const request = jest.fn(async () => ({
      items: [],
      total: 0,
      hasMore: false,
      nextOffset: 0,
    }));
    const client = createOperationsClient(request as any);
    await client.listTransportPricing({ search: "goa", limit: 10, offset: 5 });
    expect(request).toHaveBeenCalledWith(
      "/api/mobile/operations/transport-pricing?search=goa&limit=10&offset=5",
      READ_CACHE
    );
  });

  it("getTransportPricing encodes the id", async () => {
    const request = jest.fn(async () => ({ transportPricing: {} }));
    const client = createOperationsClient(request as any);
    await client.getTransportPricing("a/b");
    expect(request).toHaveBeenCalledWith(
      "/api/mobile/operations/transport-pricing/a%2Fb"
    );
  });

  it("createTransportPricing POSTs with an idempotency key", async () => {
    const request = jest.fn(async () => ({ id: "tp1" }));
    const client = createOperationsClient(request as any);
    await client.createTransportPricing({
      locationId: "loc1",
      vehicleTypeId: "vt1",
      price: 1000,
      transportType: "PerDay",
      startDate: "2025-01-01",
      endDate: "2025-12-31",
    });
    const [endpoint, opts] = request.mock.calls[0];
    expect(endpoint).toBe("/api/mobile/operations/transport-pricing");
    expect(opts.method).toBe("POST");
    expect(opts.headers["Idempotency-Key"]).toMatch(/^transport-pricing-create-/);
  });

  it("updateTransportPricing PATCHes; deleteTransportPricing DELETEs", async () => {
    const request = jest.fn(async () => ({ id: "tp1" }));
    const client = createOperationsClient(request as any);
    await client.updateTransportPricing("tp1", { price: 2000 });
    await client.deleteTransportPricing("tp1");
    expect(request.mock.calls[0][0]).toBe(
      "/api/mobile/operations/transport-pricing/tp1"
    );
    expect(request.mock.calls[0][1].method).toBe("PATCH");
    expect(request.mock.calls[1][1].method).toBe("DELETE");
  });

  it("listVehicleTypes builds query (search + activeOnly)", async () => {
    const request = jest.fn(async () => ({ items: [], total: 0 }));
    const client = createOperationsClient(request as any);
    await client.listVehicleTypes({ search: "innova", activeOnly: true });
    expect(request).toHaveBeenCalledWith(
      "/api/mobile/operations/vehicle-types?search=innova&activeOnly=true",
      READ_CACHE
    );
  });

  it("createVehicleType POSTs with an idempotency key", async () => {
    const request = jest.fn(async () => ({ id: "vt1", name: "SUV" }));
    const client = createOperationsClient(request as any);
    await client.createVehicleType({ name: "SUV" });
    const [endpoint, opts] = request.mock.calls[0];
    expect(endpoint).toBe("/api/mobile/operations/vehicle-types");
    expect(opts.method).toBe("POST");
    expect(opts.headers["Idempotency-Key"]).toMatch(/^vehicle-type-create-/);
  });

  it("getVehicleType encodes id; updateVehicleType PATCHes; deleteVehicleType DELETEs", async () => {
    const request = jest.fn(async () => ({ id: "vt1" }));
    const client = createOperationsClient(request as any);
    await client.getVehicleType("a/b");
    await client.updateVehicleType("a b", { name: "Van" });
    await client.deleteVehicleType("a b");
    expect(request.mock.calls[0][0]).toBe(
      "/api/mobile/operations/vehicle-types/a%2Fb"
    );
    expect(request.mock.calls[1][0]).toBe(
      "/api/mobile/operations/vehicle-types/a%20b"
    );
    expect(request.mock.calls[1][1].method).toBe("PATCH");
    expect(request.mock.calls[2][1].method).toBe("DELETE");
  });

  it("listLocations builds the query string", async () => {
    const request = jest.fn(async () => ({
      items: [],
      total: 0,
      hasMore: false,
      nextOffset: 0,
    }));
    const client = createOperationsClient(request as any);
    await client.listLocations({ search: "goa", limit: 20, offset: 5 });
    expect(request).toHaveBeenCalledWith(
      "/api/mobile/operations/locations?search=goa&limit=20&offset=5",
      READ_CACHE
    );
  });

  it("createLocation POSTs with an idempotency key", async () => {
    const request = jest.fn(async () => ({ id: "loc1", label: "Goa" }));
    const client = createOperationsClient(request as any);
    await client.createLocation({
      label: "Goa",
      imageUrl: "https://cdn.example/goa.jpg",
    });
    const [endpoint, opts] = request.mock.calls[0];
    expect(endpoint).toBe("/api/mobile/operations/locations");
    expect(opts.method).toBe("POST");
    expect(opts.headers["Idempotency-Key"]).toMatch(/^location-create-/);
  });

  it("updateLocation PATCHes; deleteLocation DELETEs; ids encoded", async () => {
    const request = jest.fn(async () => ({ id: "loc1" }));
    const client = createOperationsClient(request as any);
    await client.updateLocation("a/b", {
      label: "G",
      imageUrl: "https://x/y.jpg",
    });
    await client.deleteLocation("a b");
    expect(request.mock.calls[0][0]).toBe("/api/mobile/operations/locations/a%2Fb");
    expect(request.mock.calls[0][1].method).toBe("PATCH");
    expect(request.mock.calls[1][1].method).toBe("DELETE");
  });

  it("listDestinations builds query (search + locationId)", async () => {
    const request = jest.fn(async () => ({
      items: [],
      total: 0,
      hasMore: false,
      nextOffset: 0,
    }));
    const client = createOperationsClient(request as any);
    await client.listDestinations({
      search: "north",
      locationId: "loc1",
      limit: 10,
    });
    expect(request).toHaveBeenCalledWith(
      "/api/mobile/operations/destinations?search=north&locationId=loc1&limit=10",
      READ_CACHE
    );
  });

  it("createDestination POSTs with an idempotency key", async () => {
    const request = jest.fn(async () => ({ id: "d1", name: "North Goa" }));
    const client = createOperationsClient(request as any);
    await client.createDestination({ name: "North Goa", locationId: "loc1" });
    const [endpoint, opts] = request.mock.calls[0];
    expect(endpoint).toBe("/api/mobile/operations/destinations");
    expect(opts.method).toBe("POST");
    expect(opts.headers["Idempotency-Key"]).toMatch(/^destination-create-/);
  });

  it("getDestination encodes id; updateDestination PATCHes; deleteDestination DELETEs", async () => {
    const request = jest.fn(async () => ({ id: "d1" }));
    const client = createOperationsClient(request as any);
    await client.getDestination("d/1");
    await client.updateDestination("d 1", { name: "X", locationId: "loc1" });
    await client.deleteDestination("d 1");
    expect(request.mock.calls[0][0]).toBe(
      "/api/mobile/operations/destinations/d%2F1"
    );
    expect(request.mock.calls[1][1].method).toBe("PATCH");
    expect(request.mock.calls[2][1].method).toBe("DELETE");
  });

  it("listHotels builds query (search + locationId)", async () => {
    const request = jest.fn(async () => ({
      items: [],
      total: 0,
      hasMore: false,
      nextOffset: 0,
    }));
    const client = createOperationsClient(request as any);
    await client.listHotels({ search: "taj", locationId: "loc1", limit: 15 });
    expect(request).toHaveBeenCalledWith(
      "/api/mobile/operations/hotels?search=taj&locationId=loc1&limit=15",
      READ_CACHE
    );
  });

  it("createHotel POSTs with an idempotency key", async () => {
    const request = jest.fn(async () => ({ id: "h1", name: "Taj" }));
    const client = createOperationsClient(request as any);
    await client.createHotel({
      name: "Taj",
      locationId: "loc1",
      images: [{ url: "https://cdn.example/h.jpg" }],
    });
    const [endpoint, opts] = request.mock.calls[0];
    expect(endpoint).toBe("/api/mobile/operations/hotels");
    expect(opts.method).toBe("POST");
    expect(opts.headers["Idempotency-Key"]).toMatch(/^hotel-create-/);
  });

  it("getHotel encodes id; updateHotel PATCHes; deleteHotel DELETEs", async () => {
    const request = jest.fn(async () => ({ id: "h1" }));
    const client = createOperationsClient(request as any);
    await client.getHotel("h/1");
    await client.updateHotel("h 1", {
      name: "Taj",
      locationId: "loc1",
      images: [{ url: "https://x/y.jpg" }],
    });
    await client.deleteHotel("h 1");
    expect(request.mock.calls[0][0]).toBe("/api/mobile/operations/hotels/h%2F1");
    expect(request.mock.calls[1][1].method).toBe("PATCH");
    expect(request.mock.calls[2][1].method).toBe("DELETE");
  });

  it("listHotelPricing builds query (date range + activeOnly)", async () => {
    const request = jest.fn(async () => ({
      hotel: { id: "h1", name: "Taj", locationId: "loc1" },
      items: [],
      total: 0,
    }));
    const client = createOperationsClient(request as any);
    await client.listHotelPricing("h1", {
      startDate: "2026-01-01",
      endDate: "2026-03-31",
      activeOnly: false,
    });
    expect(request).toHaveBeenCalledWith(
      "/api/mobile/operations/hotels/h1/pricing?startDate=2026-01-01&endDate=2026-03-31&activeOnly=false",
      READ_CACHE
    );
  });

  it("listHotelPricing encodes hotel id", async () => {
    const request = jest.fn(async () => ({
      hotel: { id: "h/x", name: "X", locationId: "loc1" },
      items: [],
      total: 0,
    }));
    const client = createOperationsClient(request as any);
    await client.listHotelPricing("h/x");
    expect(request).toHaveBeenCalledWith(
      "/api/mobile/operations/hotels/h%2Fx/pricing",
      READ_CACHE
    );
  });

  it("getHotelPricing encodes hotel and pricing ids", async () => {
    const request = jest.fn(async () => ({
      hotel: { id: "h1", name: "Taj", locationId: "loc1" },
      pricing: { id: "p/1" },
    }));
    const client = createOperationsClient(request as any);
    await client.getHotelPricing("h 1", "p 2");
    expect(request).toHaveBeenCalledWith(
      "/api/mobile/operations/hotels/h%201/pricing/p%202"
    );
  });

  it("getHotelPricingLookups hits pricing-lookups endpoint", async () => {
    const request = jest.fn(async () => ({
      roomTypes: [],
      occupancyTypes: [],
      mealPlans: [],
    }));
    const client = createOperationsClient(request as any);
    await client.getHotelPricingLookups();
    expect(request).toHaveBeenCalledWith(
      "/api/mobile/operations/pricing-lookups",
      LOOKUP_CACHE
    );
  });
});
