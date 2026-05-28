import {
  APP_VARIANT,
  filterNavigationForAppVariant,
  filterPermissionsForAppVariant,
  getPostLoginRoute,
  mobileAppVariantHeaders,
} from "@/lib/app-variant";

describe("app variant helpers", () => {
  const modules = [
    { id: "crm", requiredPermission: "crm.read" },
    { id: "finance", requiredPermission: "finance.read" },
    { id: "reports", requiredPermission: "reports.read" },
    { id: "settings", requiredPermission: "settings.read" },
  ];

  it("hides staff and finance permissions in the public app", () => {
    expect(
      filterPermissionsForAppVariant(["crm.read", "finance.read"], "public")
    ).toEqual([]);
    expect(filterNavigationForAppVariant(modules, "public")).toEqual([]);
  });

  it("keeps only finance permissions and modules in the finance app", () => {
    expect(
      filterPermissionsForAppVariant(
        ["admin.dashboard.read", "crm.read", "finance.read", "finance.write"],
        "finance"
      )
    ).toEqual(["finance.read", "finance.write"]);
    expect(filterNavigationForAppVariant(modules, "finance")).toEqual([
      { id: "finance", requiredPermission: "finance.read" },
    ]);
  });

  it("removes finance and finance-sensitive report surfaces from the staff app", () => {
    expect(
      filterPermissionsForAppVariant(
        ["crm.read", "finance.read", "reports.read", "audit.read", "settings.read"],
        "staff"
      )
    ).toEqual(["crm.read", "settings.read"]);
    expect(filterNavigationForAppVariant(modules, "staff")).toEqual([
      { id: "crm", requiredPermission: "crm.read" },
      { id: "settings", requiredPermission: "settings.read" },
    ]);
  });

  it("routes finance users to the finance hub after login", () => {
    expect(getPostLoginRoute("public")).toBe("/(tabs)");
    expect(getPostLoginRoute("staff")).toBe("/(tabs)");
    expect(getPostLoginRoute("finance")).toBe("/admin/finance");
  });

  it("adds an app variant observability header", () => {
    expect(mobileAppVariantHeaders()).toEqual({
      "X-Mobile-App-Variant": APP_VARIANT,
    });
  });
});
