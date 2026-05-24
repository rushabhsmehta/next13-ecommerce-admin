import { createTourPackagesClient } from "../../lib/tour-packages";

describe("createTourPackagesClient", () => {
  it("create POSTs with body + idempotency key", async () => {
    const request = jest.fn(async () => ({
      id: "pkg1",
      tourPackage: { id: "pkg1", tourPackageName: "Test", locationId: "loc1" },
    }));
    const client = createTourPackagesClient(request as any);
    await client.create({
      locationId: "loc1",
      tourPackageName: "Himachal Escape",
    });
    const [endpoint, opts] = request.mock.calls[0];
    expect(endpoint).toBe("/api/mobile/tour-packages");
    expect(opts.method).toBe("POST");
    expect(opts.body).toEqual({
      locationId: "loc1",
      tourPackageName: "Himachal Escape",
    });
    expect(opts.headers["Idempotency-Key"]).toMatch(/^tour-package-create-/);
  });

  it("update PATCHes partial payload", async () => {
    const request = jest.fn(async () => ({ id: "pkg1", tourPackageName: "Updated" }));
    const client = createTourPackagesClient(request as any);
    await client.update("pkg1", { tourPackageName: "Updated" });
    const [endpoint, opts] = request.mock.calls[0];
    expect(endpoint).toBe("/api/mobile/tour-packages/pkg1");
    expect(opts.method).toBe("PATCH");
    expect(opts.body).toEqual({ tourPackageName: "Updated" });
  });

  it("listVariants GETs package variants endpoint", async () => {
    const request = jest.fn(async () => ({ variants: [], total: 0 }));
    const client = createTourPackagesClient(request as any);
    await client.listVariants("pkg1");
    expect(request.mock.calls[0][0]).toBe("/api/mobile/tour-packages/pkg1/variants");
  });

  it("createPricing POSTs with idempotency key", async () => {
    const request = jest.fn(async () => ({ id: "pr1", totalPrice: 1000 }));
    const client = createTourPackagesClient(request as any);
    await client.createPricing("pkg1", {
      startDate: "2026-06-01",
      endDate: "2026-08-31",
      mealPlanId: "mp1",
      numberOfRooms: 1,
      pricingComponents: [{ pricingAttributeId: "pa1", price: 1000 }],
    });
    const [endpoint, opts] = request.mock.calls[0];
    expect(endpoint).toBe("/api/mobile/tour-packages/pkg1/pricing");
    expect(opts.method).toBe("POST");
    expect(opts.headers["Idempotency-Key"]).toMatch(/^tour-package-pricing-create-/);
  });

  it("getLookups includes locationId query", async () => {
    const request = jest.fn(async () => ({
      mealPlans: [],
      vehicleTypes: [],
      pricingAttributes: [],
      seasonalPeriods: [],
    }));
    const client = createTourPackagesClient(request as any);
    await client.getLookups("loc1");
    expect(request.mock.calls[0][0]).toBe("/api/mobile/tour-packages/lookups?locationId=loc1");
  });

  it("delete sends DELETE request to package endpoint", async () => {
    const request = jest.fn(async () => ({ deleted: true, id: "pkg1" }));
    const client = createTourPackagesClient(request as any);
    await client.delete("pkg1");
    const [endpoint, opts] = request.mock.calls[0];
    expect(endpoint).toBe("/api/mobile/tour-packages/pkg1");
    expect(opts.method).toBe("DELETE");
  });
});
