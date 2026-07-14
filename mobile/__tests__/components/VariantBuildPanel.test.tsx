jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/lib/api", () => ({
  ApiError: class ApiError extends Error {},
  withAuth: () =>
    jest.fn(async () => ({
      items: [{ id: "hotel1", name: "Test Hotel" }],
    })),
}));

import React from "react";
import { Alert } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { VariantBuildPanel } from "@/components/tour-queries/VariantBuildPanel";
import type {
  VariantBuildContext,
  VariantComparisonItem,
} from "@/lib/tour-query-pricing";

const luxury: VariantComparisonItem = {
  id: "luxury-snapshot",
  sourceVariantId: "luxury-source",
  name: "Luxury",
  sortOrder: 0,
  isConfirmed: false,
  pricing: null,
  hotelSnapshots: [],
};

const premium: VariantComparisonItem = {
  id: "premium-snapshot",
  sourceVariantId: "premium-source",
  name: "Premium",
  sortOrder: 1,
  isConfirmed: false,
  pricing: null,
  hotelSnapshots: [],
};

const emptyBuild: VariantBuildContext = {
  itineraries: [
    { id: "day1", dayNumber: 1, itineraryTitle: "Arrival", locationId: "loc1", hotel: null },
    { id: "day2", dayNumber: 2, itineraryTitle: "Tour", locationId: "loc1", hotel: null },
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
};

function renderPanel(
  props: Partial<React.ComponentProps<typeof VariantBuildPanel>> = {}
) {
  return render(
    <VariantBuildPanel
      queryId="query1"
      variant={luxury}
      variants={[luxury, premium]}
      build={emptyBuild}
      canWriteSales
      onSaveBuild={jest.fn(async () => {})}
      {...props}
    />
  );
}

describe("VariantBuildPanel", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("edits complete room and transport details and saves only room payload", () => {
    const onSaveBuild = jest.fn(async () => {});
    const onDirtyChange = jest.fn();
    renderPanel({ onSaveBuild, onDirtyChange });

    fireEvent.press(screen.getByTestId("variant-build-luxury-snapshot-rooms"));
    fireEvent.press(screen.getByTestId("variant-build-add-room-luxury-snapshot-day1"));
    fireEvent(
      screen.getByTestId("variant-build-custom-room-toggle-luxury-snapshot-day1-0"),
      "valueChange",
      true
    );
    fireEvent.changeText(
      screen.getByTestId("variant-build-custom-room-luxury-snapshot-day1-0"),
      "Family Suite"
    );
    fireEvent.changeText(
      screen.getByTestId("variant-build-guest-names-luxury-snapshot-day1-0"),
      "Guest One"
    );
    fireEvent.changeText(
      screen.getByTestId("variant-build-voucher-number-luxury-snapshot-day1-0"),
      "VOUCHER-1"
    );
    fireEvent.press(screen.getByTestId("variant-build-add-extra-luxury-snapshot-day1-0"));
    fireEvent.changeText(
      screen.getByTestId("variant-build-extra-qty-luxury-snapshot-day1-0-0"),
      "2"
    );
    fireEvent.press(screen.getByTestId("variant-build-add-transport-luxury-snapshot-day1"));
    fireEvent.changeText(
      screen.getByTestId("variant-build-transport-description-luxury-snapshot-day1-0"),
      "Airport pickup"
    );
    fireEvent.press(screen.getByTestId("variant-build-rooms-save-luxury-snapshot"));

    expect(onDirtyChange).toHaveBeenCalledWith(true);
    expect(onSaveBuild).toHaveBeenCalledTimes(1);
    const [, draft, scope] = onSaveBuild.mock.calls[0];
    expect(scope).toBe("rooms");
    expect(draft.roomsByItinerary.day1[0]).toMatchObject({
      customRoomType: "Family Suite",
      useCustomRoomType: true,
      guestNames: "Guest One",
      voucherNumber: "VOUCHER-1",
    });
    expect(draft.roomsByItinerary.day1[0].extraBeds).toEqual([
      { occupancyTypeId: "oc1", quantity: 2 },
    ]);
    expect(draft.transportByItinerary.day1[0]).toMatchObject({
      vehicleTypeId: "vt1",
      quantity: 1,
      description: "Airport pickup",
    });
    expect(draft.hotelsByItinerary).toBeUndefined();
    expect(draft.roomsByItinerary.day2).toEqual([]);
    expect(draft.transportByItinerary.day2).toEqual([]);
  });

  it("exposes hotel picker controls on the hotels tab", () => {
    renderPanel();
    expect(screen.getByTestId("variant-build-hotel-picker-luxury-snapshot-day1")).toBeTruthy();
    expect(screen.getByTestId("variant-build-hotels-save-luxury-snapshot")).toBeTruthy();
  });

  it("copies Day 1 rooms and transport without saving hotel overrides", () => {
    jest.spyOn(Alert, "alert").mockImplementation((_title, _message, buttons) => {
      buttons?.find((button) => button.text === "Copy")?.onPress?.();
    });
    const onSaveBuild = jest.fn(async () => {});
    renderPanel({ onSaveBuild });

    fireEvent.press(screen.getByTestId("variant-build-luxury-snapshot-rooms"));
    fireEvent.press(screen.getByTestId("variant-build-add-room-luxury-snapshot-day1"));
    fireEvent.press(screen.getByTestId("variant-build-add-transport-luxury-snapshot-day1"));
    fireEvent.press(screen.getByTestId("variant-build-copy-day-one-luxury-snapshot"));
    fireEvent.press(screen.getByTestId("variant-build-rooms-save-luxury-snapshot"));

    const [, draft, scope] = onSaveBuild.mock.calls[0];
    expect(scope).toBe("rooms");
    expect(draft.roomsByItinerary.day2).toEqual(draft.roomsByItinerary.day1);
    expect(draft.transportByItinerary.day2).toEqual(draft.transportByItinerary.day1);
    expect(draft.hotelsByItinerary).toBeUndefined();
    expect(draft.roomsByItinerary.day2).not.toBe(draft.roomsByItinerary.day1);
    expect(draft.transportByItinerary.day2).not.toBe(draft.transportByItinerary.day1);
  });

  it("copies Day 1 hotel without saving room or transport payloads", () => {
    jest.spyOn(Alert, "alert").mockImplementation((_title, _message, buttons) => {
      buttons?.find((button) => button.text === "Copy")?.onPress?.();
    });
    const onSaveBuild = jest.fn(async () => {});
    renderPanel({
      onSaveBuild,
      variant: {
        ...luxury,
        hotelSnapshots: [
          { dayNumber: 1, hotelId: "hotel-day1", hotelName: "Day 1 Hotel" },
          { dayNumber: 2, hotelId: "hotel-day2", hotelName: "Day 2 Hotel" },
        ],
      },
    });

    fireEvent.press(screen.getByTestId("variant-build-copy-day-one-hotels-luxury-snapshot"));
    fireEvent.press(screen.getByTestId("variant-build-hotels-save-luxury-snapshot"));

    const [, draft, scope] = onSaveBuild.mock.calls[0];
    expect(scope).toBe("hotels");
    expect(draft.hotelsByItinerary).toEqual({ day1: "hotel-day1", day2: "hotel-day1" });
    expect(draft.roomsByItinerary).toBeUndefined();
    expect(draft.transportByItinerary).toBeUndefined();
  });

  it("renders persisted data read-only without mutation actions", () => {
    const build: VariantBuildContext = {
      ...emptyBuild,
      variantRoomAllocations: {
        "luxury-source": {
          day1: [{ roomTypeId: "rt1", occupancyTypeId: "oc1", mealPlanId: "mp1", quantity: 1 }],
        },
      },
      variantTransportDetails: {
        "luxury-source": {
          day1: [{ vehicleTypeId: "vt1", quantity: 1, description: "Pickup" }],
        },
      },
    };
    renderPanel({ build, canWriteSales: false, onSaveBuild: undefined });

    fireEvent.press(screen.getByTestId("variant-build-luxury-snapshot-rooms"));
    expect(screen.queryByTestId("variant-build-add-room-luxury-snapshot-day1")).toBeNull();
    expect(screen.queryByTestId("variant-build-add-transport-luxury-snapshot-day1")).toBeNull();
    expect(screen.queryByTestId("variant-build-rooms-save-luxury-snapshot")).toBeNull();
    expect(
      screen.getByTestId("variant-build-room-qty-luxury-snapshot-day1-0").props.editable
    ).toBe(false);
    expect(
      screen.getByTestId("variant-build-transport-description-luxury-snapshot-day1-0").props
        .editable
    ).toBe(false);
  });
});
