import {
  ASSOCIATE_OPERATIONS_SECTIONS,
  OPERATIONS_ADMIN_SECTIONS,
  filterOperationsNavSections,
} from "@/lib/operations-admin-nav";

describe("operations-admin-nav", () => {
  it("hides finance and staff-only items for associates", () => {
    const sections = filterOperationsNavSections(OPERATIONS_ADMIN_SECTIONS, {
      permissions: ["crm.read", "salesTrips.read"],
      isAssociate: true,
    });
    const ids = sections.flatMap((s) => s.items.map((i) => i.id));
    expect(ids).toContain("associate-inquiries");
    expect(ids).not.toContain("customers");
    expect(ids).not.toContain("finance");
  });

  it("shows CRM dashboard items for admin CRM permissions", () => {
    const sections = filterOperationsNavSections(OPERATIONS_ADMIN_SECTIONS, {
      permissions: ["crm.read", "crm.write", "todos.read", "salesTrips.read"],
      isAssociate: false,
    });
    const dashboard = sections.find((s) => s.id === "dashboard");
    expect(dashboard?.items.map((i) => i.id)).toEqual(
      expect.arrayContaining(["inquiries", "todos", "tour-queries"])
    );
  });

  it("associate preset only exposes inquiry and tour query cards", () => {
    const sections = filterOperationsNavSections(ASSOCIATE_OPERATIONS_SECTIONS, {
      permissions: ["crm.read", "salesTrips.read"],
      isAssociate: true,
    });
    expect(sections).toHaveLength(1);
    expect(sections[0].items).toHaveLength(2);
  });
});
