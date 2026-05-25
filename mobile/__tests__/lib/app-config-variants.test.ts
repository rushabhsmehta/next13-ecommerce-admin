const loadConfig = require("../../app.config.js");

function loadExpoConfig(variant: "public" | "staff" | "finance") {
  const previous = process.env.APP_VARIANT;
  process.env.APP_VARIANT = variant;
  const expo = loadConfig().expo;
  if (previous === undefined) delete process.env.APP_VARIANT;
  else process.env.APP_VARIANT = previous;
  return expo;
}

describe("app.config variants", () => {
  it("keeps the public store identity", () => {
    const expo = loadExpoConfig("public");
    expect(expo.name).toBe("Aagam Holidays");
    expect(expo.slug).toBe("aagam-holidays");
    expect(expo.scheme).toBe("aagamholidays");
    expect(expo.android.package).toBe("com.aagamholidays.app");
    expect(expo.ios.bundleIdentifier).toBe("com.aagamholidays.app");
    expect(expo.extra.router.root).toBe("apps/public");
  });

  it("configures the staff app identity and router root", () => {
    const expo = loadExpoConfig("staff");
    expect(expo.name).toBe("Aagam Operations");
    expect(expo.scheme).toBe("aagamstaff");
    expect(expo.android.package).toBe("com.aagamholidays.staff");
    expect(expo.extra.appVariant).toBe("staff");
    expect(expo.extra.router.root).toBe("apps/staff");
  });

  it("configures the finance app identity and router root", () => {
    const expo = loadExpoConfig("finance");
    expect(expo.name).toBe("Aagam Accounts");
    expect(expo.scheme).toBe("aagamfinance");
    expect(expo.android.package).toBe("com.aagamholidays.finance");
    expect(expo.android.permissions).toEqual(["android.permission.READ_EXTERNAL_STORAGE"]);
    expect(expo.ios.infoPlist).toEqual({});
    expect(expo.plugins).not.toContain("expo-location");
    expect(JSON.stringify(expo.plugins)).not.toContain("expo-image-picker");
    expect(expo.extra.appVariant).toBe("finance");
    expect(expo.extra.router.root).toBe("apps/finance");
  });
});
