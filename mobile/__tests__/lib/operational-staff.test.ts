import { fetchActiveOperationalStaff } from "../../lib/operational-staff";

describe("fetchActiveOperationalStaff", () => {
  it("maps API rows and filters empty ids", async () => {
    const request = jest.fn(async () => [
      { id: "s1", name: "Alex", email: "a@x.com", isActive: true },
      { id: "", name: "Bad", email: "b@x.com" },
    ]);
    const rows = await fetchActiveOperationalStaff(request as any);
    expect(request).toHaveBeenCalledWith("/api/operational-staff?activeOnly=true");
    expect(rows).toEqual([{ id: "s1", name: "Alex", email: "a@x.com", isActive: true }]);
  });

  it("returns empty array on non-array response", async () => {
    const request = jest.fn(async () => ({}) as any);
    const rows = await fetchActiveOperationalStaff(request as any);
    expect(rows).toEqual([]);
  });
});
