import { ApiError } from "@/lib/api";
import { fetchCrmInquiriesList } from "@/lib/crm-inquiries-list";

describe("fetchCrmInquiriesList", () => {
  it("returns paginated mobile response", async () => {
    const authRequest = jest.fn().mockResolvedValue({
      items: [
        {
          id: "inq_1",
          customerName: "Test",
          tourPackageQueries: [
            {
              id: "tpq_1",
              inquiryId: "inq_1",
              tourPackageQueryName: "Goa 4N Family",
              tourPackageQueryNumber: "TPQ-1042",
              tourPackageQueryType: "Custom",
              isFeatured: true,
              updatedAt: "2026-06-20T12:00:00.000Z",
            },
          ],
        },
      ],
      total: 1,
      nextOffset: 1,
      hasMore: false,
    });

    const result = await fetchCrmInquiriesList(authRequest, "limit=30&offset=0");
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.items[0]?.tourPackageQueries?.[0]?.tourPackageQueryName).toBe(
      "Goa 4N Family"
    );
    expect(authRequest).toHaveBeenCalledWith(
      "/api/mobile/crm/inquiries?limit=30&offset=0",
      expect.any(Object)
    );
  });

  it("falls back to legacy /api/inquiries on 404", async () => {
    const authRequest = jest
      .fn()
      .mockRejectedValueOnce(new ApiError("Request failed with status 404", 404))
      .mockResolvedValueOnce([{ id: "inq_legacy", customerName: "Legacy" }]);

    const result = await fetchCrmInquiriesList(authRequest, "limit=10");
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe("inq_legacy");
    expect(authRequest).toHaveBeenNthCalledWith(
      2,
      "/api/inquiries?limit=10",
      expect.objectContaining({ cacheKey: "legacy-inquiries:?limit=10" })
    );
  });
});
