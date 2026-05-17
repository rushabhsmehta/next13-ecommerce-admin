import { createSettingsAdminClient } from "../../lib/settings-admin";

describe("createSettingsAdminClient", () => {
  it("loads settings summary with audit search", async () => {
    const request = jest.fn(async () => ({ organization: null, masters: {}, auditLogs: [] }));
    const client = createSettingsAdminClient(request as any);
    await client.getSummary("mobile");
    expect(request).toHaveBeenCalledWith("/api/mobile/settings/summary?auditSearch=mobile", {
      retries: 1,
    });
  });

  it("writes organization and master data with idempotency", async () => {
    const request = jest.fn(async () => ({ id: "x" }));
    const client = createSettingsAdminClient(request as any);
    await client.updateOrganization({ name: "Aagam" });
    await client.createMaster("units", { name: "Piece", abbreviation: "pcs" });
    await client.updateMaster("units", "unit/1", { isActive: false });
    expect(request.mock.calls[0][0]).toBe("/api/mobile/settings/organization");
    expect(request.mock.calls[0][1].headers["Idempotency-Key"]).toMatch(/^settings-org-update-/);
    expect(request.mock.calls[1][0]).toBe("/api/mobile/settings/masters/units");
    expect(request.mock.calls[1][1].headers["Idempotency-Key"]).toMatch(/^settings-units-create-/);
    expect(request.mock.calls[2][0]).toBe("/api/mobile/settings/masters/units/unit%2F1");
    expect(request.mock.calls[2][1].headers["Idempotency-Key"]).toMatch(/^settings-units-update-/);
  });

  it("deleteMaster DELETEs pricing components with idempotency", async () => {
    const request = jest.fn(async () => ({ success: true }));
    const client = createSettingsAdminClient(request as any);
    await client.deleteMaster("pricing-components", "pc/1");
    expect(request).toHaveBeenCalledWith(
      "/api/mobile/settings/masters/pricing-components/pc%2F1",
      expect.objectContaining({
        method: "DELETE",
        headers: { "Idempotency-Key": expect.stringMatching(/^settings-pricing-components-delete-/) },
      })
    );
  });

  it("searchAuditLogs builds the query string", async () => {
    const request = jest.fn(async () => ({ auditLogs: [], total: 0 }));
    const client = createSettingsAdminClient(request as any);
    await client.searchAuditLogs("invoice");
    expect(request).toHaveBeenCalledWith("/api/mobile/settings/audit-logs?search=invoice&limit=50", {
      retries: 1,
    });
  });
});

