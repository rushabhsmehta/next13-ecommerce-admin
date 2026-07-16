import { NativeModules } from "react-native";
import * as SecureStore from "expo-secure-store";
import {
  AI_DRAFT_KEYS,
  consumeAiDraft,
  mapAiDraftToPackageInitial,
  mapAiDraftToQueryInitial,
  storeAiDraft,
} from "../../lib/ai-wizard-drafts";

function setAsyncStorageNativeAvailable(available: boolean) {
  Object.defineProperty(NativeModules, "RNCAsyncStorage", {
    value: available ? {} : null,
    configurable: true,
    writable: true,
  });
}

describe("ai-wizard-drafts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setAsyncStorageNativeAvailable(true);
  });

  it("stores and consumes package create draft via SecureStore fallback", async () => {
    setAsyncStorageNativeAvailable(false);
    const payload = {
      locationId: "loc-1",
      data: {
        tourPackageName: "Kerala Escape",
        itineraries: [{ dayNumber: 1, itineraryTitle: "Arrival" }],
      },
    };
    await storeAiDraft(AI_DRAFT_KEYS.packageCreate, payload);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      `ai-draft:${AI_DRAFT_KEYS.packageCreate}`,
      expect.stringContaining("Kerala Escape")
    );

    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        locationId: "loc-1",
        data: payload.data,
      })
    );
    const consumed = await consumeAiDraft(AI_DRAFT_KEYS.packageCreate);
    expect(consumed?.locationId).toBe("loc-1");
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
      `ai-draft:${AI_DRAFT_KEYS.packageCreate}`
    );

    const mapped = mapAiDraftToPackageInitial(
      { timestamp: "", locationId: "loc-1", data: payload.data },
      "Kerala"
    );
    expect(mapped.tourPackageName).toBe("Kerala Escape");
    expect(mapped.itineraries).toHaveLength(1);
  });

  it("returns null when AsyncStorage native module is unavailable", async () => {
    setAsyncStorageNativeAvailable(false);
    await expect(consumeAiDraft(AI_DRAFT_KEYS.queryApply)).resolves.toBeNull();
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith(
      `ai-draft:${AI_DRAFT_KEYS.queryApply}`
    );
    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });

  it("maps query draft initial fields", () => {
    const mapped = mapAiDraftToQueryInitial({
      timestamp: "",
      locationId: "loc-2",
      data: {
        tourPackageName: "Sharma Family - Goa",
        customerName: "Sharma Family",
        numAdults: 2,
        numChildren: 1,
        tourStartsFrom: "2026-07-01",
        flightDetails: [
          {
            date: "2026-07-01",
            flightName: "Indigo",
            flightNumber: "6E 123",
            from: "AMD",
            to: "DEL",
            departureTime: "08:30",
            arrivalTime: "10:05",
            flightDuration: "1h 35m",
            images: [{ url: "https://example.com/ticket.jpg" }],
          },
        ],
        itineraries: [{ dayNumber: 1, itineraryTitle: "Beach day" }],
      },
    });
    expect(mapped.tourPackageQueryName).toBe("Sharma Family - Goa");
    expect(mapped.customerName).toBe("Sharma Family");
    expect(mapped.numAdults).toBe("2");
    expect(mapped.numChild512).toBe("1");
    expect(mapped.flightDetails).toEqual([
      {
        id: "ai-draft-flight-1",
        date: "2026-07-01",
        flightName: "Indigo",
        flightNumber: "6E 123",
        from: "AMD",
        to: "DEL",
        departureTime: "08:30",
        arrivalTime: "10:05",
        flightDuration: "1h 35m",
        images: [{ url: "https://example.com/ticket.jpg" }],
      },
    ]);
    expect(mapped.itineraries).toHaveLength(1);
  });
});
