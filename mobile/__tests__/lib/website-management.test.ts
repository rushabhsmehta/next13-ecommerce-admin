import { createWebsiteManagementClient } from "../../lib/website-management";

describe("createWebsiteManagementClient", () => {
  it("lists website packages with filters", async () => {
    const request = jest.fn(async () => ({ items: [], locations: [], total: 0, hasMore: false, nextOffset: 0 }));
    const client = createWebsiteManagementClient(request as any);
    await client.listPackages({ search: "kerala", locationId: "loc1", status: "published", limit: 20 });
    expect(request).toHaveBeenCalledWith(
      "/api/mobile/website/packages?search=kerala&locationId=loc1&status=published&limit=20",
      { retries: 1 }
    );
  });

  it("updates package controls with idempotency", async () => {
    const request = jest.fn(async () => ({ id: "pkg1" }));
    const client = createWebsiteManagementClient(request as any);
    await client.updatePackage("pkg/1", { isFeatured: true });
    expect(request.mock.calls[0][0]).toBe("/api/mobile/website/packages/pkg%2F1");
    expect(request.mock.calls[0][1].method).toBe("PATCH");
    expect(request.mock.calls[0][1].headers["Idempotency-Key"]).toMatch(/^website-package-update-/);
  });

  it("reorders and saves related package recommendations", async () => {
    const request = jest.fn(async () => ({ success: true }));
    const client = createWebsiteManagementClient(request as any);
    await client.reorderPackages("loc1", ["a", "b"]);
    await client.updateRelated("pkg1", ["rel1", "rel2"]);
    expect(request.mock.calls[0][0]).toBe("/api/mobile/website/reorder");
    expect(request.mock.calls[0][1].body).toEqual({ locationId: "loc1", orderedIds: ["a", "b"] });
    expect(request.mock.calls[0][1].headers["Idempotency-Key"]).toMatch(/^website-package-reorder-/);
    expect(request.mock.calls[1][0]).toBe("/api/mobile/website/packages/pkg1/related");
    expect(request.mock.calls[1][1].method).toBe("PUT");
    expect(request.mock.calls[1][1].headers["Idempotency-Key"]).toMatch(/^website-related-update-/);
  });
});

