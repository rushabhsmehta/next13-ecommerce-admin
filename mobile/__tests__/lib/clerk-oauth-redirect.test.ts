import Constants from "expo-constants";
import { getClerkOAuthRedirectUrl } from "@/lib/clerk-oauth-redirect";

jest.mock("expo-linking", () => ({
  createURL: jest.fn((path: string) => `aagamstaff://${path}`),
}));

jest.mock("expo-auth-session", () => ({
  makeRedirectUri: jest.fn(() => ""),
}));

jest.mock("@/lib/app-variant", () => ({
  APP_SCHEME: "aagamstaff",
}));

describe("getClerkOAuthRedirectUrl", () => {
  beforeEach(() => {
    (Constants as { expoConfig?: object }).expoConfig = {
      scheme: "aagamstaff",
    };
  });

  it("falls back to scheme://oauth-native-callback when makeRedirectUri is empty", () => {
    expect(getClerkOAuthRedirectUrl()).toBe("aagamstaff://oauth-native-callback");
  });
});
