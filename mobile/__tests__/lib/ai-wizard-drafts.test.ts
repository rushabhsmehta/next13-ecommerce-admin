import * as SecureStore from "expo-secure-store";
import {
  AI_DRAFT_KEYS,
  acknowledgeAiDraft,
  consumeAiDraft,
  mapAiDraftToPackageInitial,
  mapAiDraftToPackageItineraries,
  mapAiDraftToQueryInitial,
  normalizeAiActivities,
  storeAiDraft,
} from "../../lib/ai-wizard-drafts";

jest.mock("@react-native-async-storage/async-storage", () => {
  throw new Error("AsyncStorage unavailable in this test");
});

describe("ai-wizard-drafts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    acknowledgeAiDraft(AI_DRAFT_KEYS.packageCreate);
    acknowledgeAiDraft(AI_DRAFT_KEYS.packageApply);
    acknowledgeAiDraft(AI_DRAFT_KEYS.queryCreate);
    acknowledgeAiDraft(AI_DRAFT_KEYS.queryApply);
  });

  it("keeps draft in memory on store so create form works even if SecureStore fails", async () => {
    (SecureStore.setItemAsync as jest.Mock).mockRejectedValueOnce(
      new Error("value too large")
    );
    const payload = {
      locationId: "loc-1",
      data: {
        tourPackageName: "Kerala Escape",
        itineraries: [
          {
            dayNumber: 1,
            itineraryTitle: "Arrival",
            activities: [
              { activityTitle: "Airport pickup", activityDescription: "Meet and greet" },
              "City walk",
            ],
          },
        ],
      },
    };

    await storeAiDraft(AI_DRAFT_KEYS.packageCreate, payload);

    // No need to read SecureStore — memory handoff should serve create screen.
    const consumed = await consumeAiDraft(AI_DRAFT_KEYS.packageCreate);
    expect(consumed?.locationId).toBe("loc-1");
    expect(consumed?.data.itineraries).toHaveLength(1);

    const mapped = mapAiDraftToPackageItineraries(consumed!.data, "loc-1");
    expect(mapped[0].activities).toEqual([
      {
        activityTitle: "Airport pickup",
        activityDescription: "Meet and greet",
        activityImages: [],
      },
      {
        activityTitle: "City walk",
        activityDescription: "",
        activityImages: [],
      },
    ]);
  });

  it("returns null when nothing is stored", async () => {
    acknowledgeAiDraft(AI_DRAFT_KEYS.queryApply);
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);
    await expect(consumeAiDraft(AI_DRAFT_KEYS.queryApply)).resolves.toBeNull();
  });

  it("keeps consumed draft in handoff cache until acknowledged", async () => {
    const storedJson = JSON.stringify({
      timestamp: new Date().toISOString(),
      locationId: "loc-handoff",
      data: {
        tourPackageName: "Handoff Package",
        itineraries: [
          { dayNumber: 1, itineraryTitle: "Arrival" },
          { dayNumber: 2, itineraryTitle: "Sightseeing" },
        ],
      },
    });
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(storedJson);
    const first = await consumeAiDraft(AI_DRAFT_KEYS.packageCreate);
    expect(first?.data.itineraries).toHaveLength(2);

    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);
    const second = await consumeAiDraft(AI_DRAFT_KEYS.packageCreate);
    expect(second?.data.tourPackageName).toBe("Handoff Package");
    expect(second?.data.itineraries).toHaveLength(2);

    acknowledgeAiDraft(AI_DRAFT_KEYS.packageCreate);
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);
    await expect(consumeAiDraft(AI_DRAFT_KEYS.packageCreate)).resolves.toBeNull();
  });

  it("normalizes mixed activity shapes", () => {
    expect(
      normalizeAiActivities([
        { activityTitle: "A", activityDescription: "desc" },
        "Plain string activity",
        { title: "Alias title", description: "Alias desc" },
        null,
      ])
    ).toEqual([
      {
        activityTitle: "A",
        activityDescription: "desc",
        activityImages: [],
      },
      {
        activityTitle: "Plain string activity",
        activityDescription: "",
        activityImages: [],
      },
      {
        activityTitle: "Alias title",
        activityDescription: "Alias desc",
        activityImages: [],
      },
    ]);
  });

  it("maps query draft initial fields", () => {
    const mapped = mapAiDraftToQueryInitial({
      timestamp: "",
      locationId: "loc-2",
      data: {
        tourPackageName: "Goa",
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
    expect(mapped.flightDetails).toHaveLength(1);
    expect(mapped.itineraries).toHaveLength(1);
  });

  it("maps package initial with itineraries", () => {
    const mapped = mapAiDraftToPackageInitial(
      {
        timestamp: "",
        locationId: "loc-1",
        data: {
          tourPackageName: "Kerala Escape",
          itineraries: [{ dayNumber: 1, itineraryTitle: "Arrival" }],
        },
      },
      "Kerala"
    );
    expect(mapped.tourPackageName).toBe("Kerala Escape");
    expect(mapped.itineraries).toHaveLength(1);
  });
});
