import { createAiWizardsClient } from "../../lib/ai-wizards";

describe("createAiWizardsClient", () => {
  it("loads AI locations", async () => {
    const request = jest.fn(async () => ({ locations: [] }));
    const client = createAiWizardsClient(request as any);
    await client.listLocations();
    expect(request).toHaveBeenCalledWith("/api/mobile/ai/locations", { retries: 1 });
  });

  it("generates and refines itinerary drafts", async () => {
    const request = jest.fn(async () => ({ success: true, data: { tourPackageName: "Kerala" } }));
    const client = createAiWizardsClient(request as any);
    await client.generate({
      destination: "Kerala",
      duration: { nights: 3, days: 4 },
      groupType: "family",
      budgetCategory: "mid-range",
      targetType: "tourPackage",
    });
    await client.refine({ tourPackageName: "Kerala" }, "Make it premium");
    expect(request.mock.calls[0][0]).toBe("/api/mobile/ai/generate-itinerary");
    expect(request.mock.calls[0][1].headers["Idempotency-Key"]).toMatch(/^ai-generate-/);
    expect(request.mock.calls[1][0]).toBe("/api/mobile/ai/refine-itinerary");
    expect(request.mock.calls[1][1].body.userPrompt).toBe("Make it premium");
    expect(request.mock.calls[1][1].headers["Idempotency-Key"]).toMatch(/^ai-refine-/);
  });

  it("saves reviewed drafts with idempotency", async () => {
    const request = jest.fn(async () => ({ success: true, targetType: "tourPackage", id: "pkg1" }));
    const client = createAiWizardsClient(request as any);
    await client.saveDraft({
      targetType: "tourPackage",
      locationId: "loc1",
      draft: { tourPackageName: "Kerala" },
    });
    expect(request).toHaveBeenCalledWith("/api/mobile/ai/save-draft", {
      method: "POST",
      body: {
        targetType: "tourPackage",
        locationId: "loc1",
        draft: { tourPackageName: "Kerala" },
      },
      headers: { "Idempotency-Key": expect.stringMatching(/^ai-save-/) },
    });
  });
});

