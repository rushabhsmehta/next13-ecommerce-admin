/// <reference types="jest" />

import React from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import type { ReactTestInstance } from "react-test-renderer";

const mockReplace = jest.fn();
const mockGetToken = jest.fn(() => Promise.resolve("mobile-token"));
const mockSetActive = jest.fn(() => Promise.resolve());
const mockStartSSOFlow = jest.fn(() =>
  Promise.resolve({
    createdSessionId: "session-1",
    setActive: mockSetActive,
  })
);
const mockRedirectUrl = "aagamholidays://oauth-native-callback";

jest.mock("react-native", () => {
  const React = require("react");
  const RN = jest.requireActual<typeof import("react-native")>("react-native");
  (RN as unknown as { Pressable: (props: { children: React.ReactNode }) => React.ReactElement }).Pressable = ({ children, ...props }) =>
    React.createElement(RN.Text, props, children);
  return RN;
});

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

jest.mock("expo-web-browser", () => ({
  __esModule: true,
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock("@/lib/clerk-oauth-redirect", () => ({
  getClerkOAuthRedirectUrl: jest.fn(() => mockRedirectUrl),
}));

jest.mock("@/constants/api", () => ({
  API_BASE_URL: "https://admin.test",
}));

jest.mock("@/lib/dev-auth-bypass", () => ({
  getDevAuthBypassToken: jest.fn(() => Promise.resolve(null)),
  setDevAuthBypassToken: jest.fn(() => Promise.resolve()),
}));

jest.mock("@clerk/clerk-expo", () => ({
  useAuth: () => ({
    getToken: mockGetToken,
  }),
  useSignIn: () => ({
    isLoaded: true,
    signIn: { create: jest.fn(), attemptFirstFactor: jest.fn() },
    setActive: jest.fn(),
  }),
  useSignUp: () => ({
    isLoaded: true,
    signUp: {
      create: jest.fn(),
      prepareEmailAddressVerification: jest.fn(),
      attemptEmailAddressVerification: jest.fn(),
    },
    setActive: jest.fn(),
  }),
  useSSO: () => ({
    startSSOFlow: mockStartSSOFlow,
  }),
}));

import LoginScreen from "../../app/login";

function getPressableButton(testID: string) {
  let button: ReactTestInstance | null = screen.getByTestId(testID);
  while (button && typeof button.props.onPress !== "function") {
    button = button.parent;
  }
  if (!button || typeof button.props.onPress !== "function") {
    throw new Error(`No press handler found for ${testID}`);
  }
  return button;
}

describe("Login social sign-in", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetToken.mockResolvedValue("mobile-token");
    mockStartSSOFlow.mockResolvedValue({
      createdSessionId: "session-1",
      setActive: mockSetActive,
    });
    global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
  });

  it("renders Google sign-in wired to Clerk OAuth", () => {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => ({ travelUser: { id: "traveller-1", name: "Ravi" } }),
    } as Response);

    render(<LoginScreen />);

    const button = getPressableButton("login-google-btn");
    expect(screen.getByText("Continue with Google")).toBeTruthy();
    expect(button.props.accessibilityLabel).toBe("Continue with Google");
    expect(String(button.props.onPress)).toContain("oauth_google");
  });

  it("renders Apple sign-in wired to Clerk OAuth", () => {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => ({ travelUser: null }),
    } as Response);

    render(<LoginScreen />);

    const button = getPressableButton("login-apple-btn");
    expect(screen.getByText("Continue with Apple")).toBeTruthy();
    expect(button.props.accessibilityLabel).toBe("Continue with Apple");
    expect(String(button.props.onPress)).toContain("oauth_apple");
  });
});
