const mockCompare = jest.fn();

jest.mock("expo-router", () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

jest.mock("@clerk/expo", () => ({
  useAuth: () => ({ getToken: jest.fn(async () => "token") }),
}));

jest.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    permissions: ["salesTrips.read", "salesTrips.write"],
    isLoading: false,
  }),
}));

jest.mock("@/components/auth/PermissionGate", () => ({
  PermissionGate: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {},
  withAuth: () => jest.fn(),
}));

jest.mock("@/constants/api", () => ({
  API_BASE_URL: "http://127.0.0.1:3000",
}));

jest.mock("@/lib/tour-queries-web-urls", () => ({
  absoluteAdminUrl: (_base: string, path: string) => path,
  tourQueryHotelUpdatePath: (id: string) => `/hotel/${id}`,
}));

jest.mock("@/lib/tour-query-pricing", () => ({
  createTourQueryPricingClient: () => ({
    compare: mockCompare,
    updateVariantBuild: jest.fn(),
    confirmVariant: jest.fn(),
  }),
}));

import React from "react";
import { Alert } from "react-native";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { TourQueryVariantsPanel } from "@/components/tour-queries/TourQueryVariantsPanel";

const variants = [
  {
    id: "v1",
    sourceVariantId: "source-v1",
    name: "Luxury",
    sortOrder: 0,
    isConfirmed: false,
    pricing: null,
    hotelSnapshots: [],
  },
  {
    id: "v2",
    sourceVariantId: "source-v2",
    name: "Premium",
    sortOrder: 1,
    isConfirmed: false,
    pricing: null,
    hotelSnapshots: [],
  },
];

describe("TourQueryVariantsPanel", () => {
  beforeEach(() => {
    mockCompare.mockReset();
    mockCompare.mockResolvedValue({
      tourPackageQueryId: "q1",
      confirmedVariantId: null,
      hasPricing: false,
      variants,
      build: {
        itineraries: [
          {
            id: "day1",
            dayNumber: 1,
            itineraryTitle: "Arrival",
            locationId: "loc1",
            hotel: null,
          },
        ],
        variantRoomAllocations: {},
        variantTransportDetails: {},
        variantHotelOverrides: {},
        lookups: {
          roomTypes: [{ id: "rt1", name: "Deluxe" }],
          occupancyTypes: [{ id: "oc1", name: "Double" }],
          mealPlans: [{ id: "mp1", name: "CP" }],
          vehicleTypes: [{ id: "vt1", name: "Innova" }],
        },
      },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("warns before switching variants with unsaved build edits", async () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    render(<TourQueryVariantsPanel queryId="q1" embedded />);

    await waitFor(() => expect(screen.getByTestId("trip-variant-tab-v1")).toBeTruthy());
    fireEvent.press(screen.getByTestId("variant-build-v1-rooms"));
    fireEvent.press(screen.getByTestId("variant-build-add-room-v1-day1"));
    fireEvent.press(screen.getByTestId("trip-variant-tab-v2"));

    expect(alert).toHaveBeenCalledWith(
      "Discard unsaved variant edits?",
      "Room allocation or transport changes have not been saved.",
      expect.any(Array)
    );

    const buttons = alert.mock.calls.at(-1)?.[2];
    buttons?.find((button) => button.text === "Discard")?.onPress?.();
    await waitFor(() => expect(screen.getByTestId("variant-card-v2")).toBeTruthy());
  });
});
