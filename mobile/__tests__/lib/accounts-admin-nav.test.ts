import { ACCOUNTS_ADMIN_SECTIONS } from "@/lib/accounts-admin-nav";

describe("accounts-admin-nav", () => {
  it("includes overview, quick actions, and transaction browse links", () => {
    const ids = ACCOUNTS_ADMIN_SECTIONS.flatMap((s) => s.items.map((i) => i.id));
    expect(ids).toEqual(
      expect.arrayContaining([
        "accounts",
        "collect",
        "record",
        "sales",
        "purchases",
        "tds",
      ])
    );
    const sales = ACCOUNTS_ADMIN_SECTIONS.flatMap((s) => s.items).find((i) => i.id === "sales");
    expect(sales?.route).toBe("/admin/finance/browse?type=sales");
  });
});
