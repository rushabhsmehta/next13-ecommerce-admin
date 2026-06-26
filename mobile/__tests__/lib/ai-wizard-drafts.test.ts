import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AI_DRAFT_KEYS,
  consumeAiDraft,
  mapAiDraftToPackageInitial,
  mapAiDraftToQueryInitial,
  storeAiDraft,
} from "../../lib/ai-wizard-drafts";

describe("ai-wizard-drafts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("stores and consumes package create draft", async () => {
    const payload = {
      locationId: "loc-1",
      data: {
        tourPackageName: "Kerala Escape",
        itineraries: [{ dayNumber: 1, itineraryTitle: "Arrival" }],
      },
    };
    await storeAiDraft(AI_DRAFT_KEYS.packageCreate, payload);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      AI_DRAFT_KEYS.packageCreate,
      expect.stringContaining("Kerala Escape")
    );

    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        locationId: "loc-1",
        data: payload.data,
      })
    );
    const consumed = await consumeAiDraft(AI_DRAFT_KEYS.packageCreate);
    expect(consumed?.locationId).toBe("loc-1");
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(AI_DRAFT_KEYS.packageCreate);

    const mapped = mapAiDraftToPackageInitial(
      { timestamp: "", locationId: "loc-1", data: payload.data },
      "Kerala"
    );
    expect(mapped.tourPackageName).toBe("Kerala Escape");
    expect(mapped.itineraries).toHaveLength(1);
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
        itineraries: [{ dayNumber: 1, itineraryTitle: "Beach day" }],
      },
    });
    expect(mapped.tourPackageQueryName).toBe("Sharma Family - Goa");
    expect(mapped.customerName).toBe("Sharma Family");
    expect(mapped.numAdults).toBe("2");
    expect(mapped.numChild512).toBe("1");
    expect(mapped.itineraries).toHaveLength(1);
  });
});
