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
  withAuth: () =>
    jest.fn(async () => ({
      items: [{ id: "hotel1", name: "Test Hotel" }],
    })),
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
    createCustomVariant: jest.fn(),
    updateCustomVariant: jest.fn(),
    deleteCustomVariant: jest.fn(),
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
      "Hotel, room allocation, or transport changes have not been saved.",
      expect.any(Array)
    );

    const buttons = alert.mock.calls.at(-1)?.[2];
    buttons?.find((button) => button.text === "Discard")?.onPress?.();
    await waitFor(() => expect(screen.getByTestId("variant-card-v2")).toBeTruthy());
  }, 15000);

  it("shows comparison matrix and add-custom action when multiple variants exist", async () => {
    mockCompare.mockResolvedValue({
      tourPackageQueryId: "q1",
      confirmedVariantId: null,
      hasPricing: true,
      variants: [
        {
          ...variants[0],
          pricing: {
            calculationMethod: "manual",
            components: [{ name: "Per Person", price: "10000", description: "" }],
            remarks: null,
            totalCost: 20000,
            basePrice: 18000,
            markupPercentage: 10,
            markupAmount: 2000,
            accommodation: 15000,
            transport: 3000,
            calculatedAt: null,
          },
        },
        {
          ...variants[1],
          pricing: {
            calculationMethod: "manual",
            components: [{ name: "Per Person", price: "12000", description: "" }],
            remarks: null,
            totalCost: 24000,
            basePrice: 22000,
            markupPercentage: 10,
            markupAmount: 2000,
            accommodation: 18000,
            transport: 4000,
            calculatedAt: null,
          },
        },
      ],
      build: {
        itineraries: [
          {
            id: "day1",
            dayNumber: 1,
            itineraryTitle: "Arrival",
            locationId: "loc1",
            hotel: { id: "h1", name: "Hotel One" },
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

    render(<TourQueryVariantsPanel queryId="q1" embedded />);

    await waitFor(() => expect(screen.getByTestId("variant-comparison-matrix")).toBeTruthy());
    expect(screen.getByTestId("variant-hotel-day-compare")).toBeTruthy();
    expect(screen.getByTestId("trip-variant-add-custom")).toBeTruthy();
  });
});
