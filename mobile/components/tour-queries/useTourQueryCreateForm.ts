import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/expo";
import { ApiError, withAuth } from "@/lib/api";
import {
  AI_DRAFT_KEYS,
  consumeAiDraft,
  mapAiDraftToQueryInitial,
} from "@/lib/ai-wizard-drafts";
import { createAiWizardsClient } from "@/lib/ai-wizards";
import type { AiItineraryDraft } from "@/lib/ai-wizards";
import type {
  ActivePickerState,
  ItineraryRow,
  TabBadgeState,
  TourQueryTabId,
} from "./types";
import { formatApiValidationError, toInt } from "./utils";

function buildDraftFromForm(input: {
  name: string;
  customerName: string;
  numAdults: string;
  numChild512: string;
  startsFrom: string;
  transport: string;
  pickupLocation: string;
  dropLocation: string;
  itineraries: ItineraryRow[];
}): AiItineraryDraft {
  return {
    tourPackageName: input.name.trim() || "Untitled Query",
    customerName: input.customerName.trim() || null,
    tourStartsFrom: input.startsFrom.trim() || null,
    numAdults: toInt(input.numAdults, 2),
    numChildren: toInt(input.numChild512, 0),
    transport: input.transport.trim() || null,
    pickup_location: input.pickupLocation.trim() || null,
    drop_location: input.dropLocation.trim() || null,
    itineraries: input.itineraries.map((day, index) => ({
      dayNumber: day.dayNumber ?? index + 1,
      itineraryTitle: day.itineraryTitle ?? "",
      itineraryDescription: day.itineraryDescription ?? "",
      mealsIncluded: day.mealsIncluded ?? "",
      activities: (day.activities ?? []).map((activity) => ({
        activityTitle: activity.activityTitle ?? "",
        activityDescription: activity.activityDescription ?? "",
        activityImages: activity.activityImages ?? [],
      })),
    })),
  };
}

export function useTourQueryCreateForm(defaultLocationId?: string) {
  const router = useRouter();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const authRequest = useMemo(() => withAuth(() => getTokenRef.current()), []);
  const aiClient = useMemo(() => createAiWizardsClient(authRequest), [authRequest]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveErrorTab, setSaveErrorTab] = useState<TourQueryTabId | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);

  const [name, setName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerNumber, setCustomerNumber] = useState("");
  const [numAdults, setNumAdults] = useState("2");
  const [numChild512, setNumChild512] = useState("0");
  const [numChild05, setNumChild05] = useState("0");
  const [startsFrom, setStartsFrom] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [queryLocationId, setQueryLocationId] = useState<string | null>(
    defaultLocationId ?? null
  );
  const [transport, setTransport] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropLocation, setDropLocation] = useState("");
  const [remarks, setRemarks] = useState("");
  const [policies, setPolicies] = useState<Record<string, string>>({});
  const [itineraries, setItineraries] = useState<ItineraryRow[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [activePicker, setActivePicker] = useState<ActivePickerState>(null);

  const datesOk = !startsFrom || !endsOn || startsFrom <= endsOn;
  const datesOrderWarning = !!(startsFrom && endsOn && startsFrom > endsOn);
  const dirty = name.trim().length > 0 || itineraries.length > 0 || draftLoaded;
  const saveBlocked =
    saving || !name.trim() || !queryLocationId || !datesOk || datesOrderWarning;

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      setError(null);
      try {
        const locRes = await authRequest<{ items: { id: string; name: string }[] }>(
          "/api/mobile/operations/list?type=locations&limit=100"
        );
        if (cancelled) return;
        setLocations(locRes.items || []);

        if (!draftLoaded) {
          const stored = await consumeAiDraft(AI_DRAFT_KEYS.queryCreate);
          if (stored && !cancelled) {
            const mapped = mapAiDraftToQueryInitial(stored);
            setName(mapped.tourPackageQueryName);
            setCustomerName(mapped.customerName);
            setNumAdults(mapped.numAdults || "2");
            setNumChild512(mapped.numChild512 || "0");
            setStartsFrom(mapped.tourStartsFrom);
            setQueryLocationId(mapped.locationId || defaultLocationId || null);
            setTransport(mapped.transport);
            setPickupLocation(mapped.pickupLocation);
            setDropLocation(mapped.dropLocation);
            setItineraries(mapped.itineraries);
            setDraftLoaded(true);
            Alert.alert(
              "AI Wizard",
              "Loaded properties from AI generation. Review and save when ready."
            );
          } else if (defaultLocationId && !queryLocationId) {
            setQueryLocationId(defaultLocationId);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Could not load form.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, [authRequest, defaultLocationId, draftLoaded, queryLocationId]);

  const addDay = useCallback(() => {
    setItineraries((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        dayNumber: prev.length + 1,
        days: String(prev.length + 1),
        locationId: queryLocationId,
        hotelId: null,
        itineraryTitle: `Day ${prev.length + 1}`,
        itineraryDescription: "",
        mealsIncluded: "",
        roomAllocations: [],
        transportDetails: [],
        activities: [],
      },
    ]);
  }, [queryLocationId]);

  const deleteDay = useCallback((index: number) => {
    setItineraries((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((day, i) => ({
          ...day,
          dayNumber: i + 1,
          days: String(i + 1),
        }))
    );
  }, []);

  const save = useCallback(async () => {
    if (saveBlocked || !queryLocationId) return;
    setSaving(true);
    try {
      const draft = buildDraftFromForm({
        name,
        customerName,
        numAdults,
        numChild512,
        startsFrom,
        transport,
        pickupLocation,
        dropLocation,
        itineraries,
      });
      const saved = await aiClient.saveDraft({
        targetType: "tourPackageQuery",
        locationId: queryLocationId,
        draft,
      });
      router.replace(`/admin/tour-queries/${saved.id}/edit` as never);
    } catch (err) {
      Alert.alert("Create failed", formatApiValidationError(err));
    } finally {
      setSaving(false);
    }
  }, [
    aiClient,
    customerName,
    dropLocation,
    itineraries,
    name,
    numAdults,
    numChild512,
    pickupLocation,
    queryLocationId,
    router,
    saveBlocked,
    startsFrom,
    transport,
  ]);

  const pickerOptions = useMemo(() => {
    if (activePicker?.type === "location") {
      return locations.map((l) => ({ id: l.id, label: l.name }));
    }
    return [];
  }, [activePicker, locations]);

  const pickerTitle =
    activePicker?.type === "location" ? "Destination location" : "Choose";

  const pickerSelectedId =
    activePicker?.type === "location" ? queryLocationId ?? undefined : undefined;

  const handlePickerSelect = useCallback(
    (option: { id: string; label: string }) => {
      if (activePicker?.type === "location") {
        setQueryLocationId(option.id);
      }
      setActivePicker(null);
    },
    [activePicker]
  );

  const tabBadges = useMemo((): TabBadgeState => {
    return {
      trip: !datesOk || datesOrderWarning || (!startsFrom && !endsOn),
      pricing: false,
      variants: false,
    };
  }, [datesOk, datesOrderWarning, startsFrom, endsOn]);

  const saveDisabledReason = saving
    ? "Creating…"
    : !name.trim()
      ? "Enter a query name."
      : !queryLocationId
        ? "Select a destination location."
        : datesOrderWarning
          ? "End date cannot be before start date."
          : !datesOk
            ? "Choose valid dates."
            : undefined;

  const noop = useCallback(() => {}, []);

  return {
    id: "new",
    loading,
    error,
    saving,
    setSaving,
    dirty,
    saveBlocked,
    saveDisabledReason,
    save,
    saveErrorTab,
    setSaveErrorTab,
    tabBadges,
    name,
    setName,
    customerName,
    setCustomerName,
    customerNumber,
    setCustomerNumber,
    numAdults,
    setNumAdults,
    numChild512,
    setNumChild512,
    numChild05,
    setNumChild05,
    startsFrom,
    setStartsFrom,
    endsOn,
    setEndsOn,
    queryLocationId,
    setQueryLocationId,
    transport,
    setTransport,
    pickupLocation,
    setPickupLocation,
    dropLocation,
    setDropLocation,
    remarks,
    setRemarks,
    policies,
    setPolicies,
    itineraries,
    setItineraries,
    inquiry: null,
    locations,
    roomTypes: [],
    occupancyTypes: [],
    mealPlans: [],
    vehicleTypes: [],
    hotelsCache: {},
    packagesList: [],
    queriesList: [],
    packageVariants: [],
    selectedPackageId: null,
    setSelectedPackageId: noop as (id: string | null) => void,
    selectedVariantIds: [],
    setSelectedVariantIds: noop as Dispatch<SetStateAction<string[]>>,
    selectedCopyQueryId: null,
    datesOk,
    datesOrderWarning,
    itineraryValidationError: null,
    addDay,
    deleteDay,
    addRoomAllocation: noop,
    deleteRoomAllocation: noop,
    updateRoomQuantity: noop,
    updateCustomRoomType: noop,
    addTransportDetail: noop,
    deleteTransportDetail: noop,
    updateTransportQuantity: noop,
    updateTransportDescription: noop,
    forceApplyInquiryRoomAllocations: noop,
    activePicker,
    setActivePicker,
    pickerOptions,
    pickerTitle,
    pickerSelectedId,
    handlePickerSelect,
    loadHotelsForLocation: async () => undefined,
    authRequest,
  };
}

export type TourQueryCreateFormState = ReturnType<typeof useTourQueryCreateForm>;
