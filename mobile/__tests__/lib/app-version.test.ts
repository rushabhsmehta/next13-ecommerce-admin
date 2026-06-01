import Constants from "expo-constants";
import { getAppVersionInfo } from "@/lib/app-version";

jest.mock("@/lib/app-variant", () => ({
  APP_VARIANT: "staff",
}));

jest.mock("expo-application", () => ({
  nativeApplicationVersion: "1.0.3",
  nativeBuildVersion: "45",
}));

jest.mock("expo-updates", () => ({
  isEnabled: true,
  channel: "staff-production",
  updateId: "abcd1234-5678-90ab-cdef-1234567890ab",
  runtimeVersion: "1.0.3-staff",
}));

describe("getAppVersionInfo", () => {
  beforeEach(() => {
    (Constants as { expoConfig?: object }).expoConfig = {
      version: "1.0.3",
      runtimeVersion: "1.0.3-staff",
    };
  });

  it("formats staff build label with version code", () => {
    const info = getAppVersionInfo();
    expect(info.shortLabel).toBe("Aagam Operations · v1.0.3 (build 45)");
    expect(info.buildNumber).toBe("45");
    expect(info.detailLines.some((l) => l.includes("Runtime 1.0.3-staff"))).toBe(true);
    expect(info.detailLines.some((l) => l.includes("staff-production"))).toBe(true);
  });
});
