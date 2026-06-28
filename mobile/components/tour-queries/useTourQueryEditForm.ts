import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import { useAuth } from "@clerk/expo";
import { ApiError, withAuth } from "@/lib/api";
import {
  createTourQueryEditClient,
  type TourQueryEditInput,
} from "@/lib/tour-query-edit";
import { firstTabForFieldErrors } from "./tab-config";
import {
  AI_DRAFT_KEYS,
  consumeAiDraft,
  mapAiDraftToQueryInitial,
} from "@/lib/ai-wizard-drafts";
import type {
  ActivePickerState,
  ItineraryRow,
  RoomAllocationRow,
  TransportDetailRow,
  TabBadgeState,
  TourQueryDetailResponse,
  TourQueryTabId,
} from "./types";
import { POLICY_FIELDS } from "./types";
import {
  formatApiValidationError,
  ISO_DATE as ISO,
  parseSelectedVariantIds,
  toInt,
} from "./utils";

function ensureItineraryRoomDefaults(days: ItineraryRow[]): ItineraryRow[] {
  return days.map((day) => ({
    ...day,
    roomAllocations: day.roomAllocations.filter((ra) => ra.occupancyTypeId?.trim()),
    transportDetails: day.transportDetails ?? [],
  }));
}

function mapItinerariesFromDetail(
  itineraries: any[] | undefined | null
): ItineraryRow[] {
  return (itineraries ?? []).map((it: any) => ({
    id: it.id,
    dayNumber: it.dayNumber != null ? toInt(it.dayNumber, 0) : null,
    days: it.days != null ? String(it.days) : it.dayNumber != null ? String(it.dayNumber) : "",
    locationId: it.locationId ?? null,
    hotelId: it.hotelId ?? it.hotel?.id ?? null,
    itineraryTitle: it.itineraryTitle ?? "",
    itineraryDescription: it.itineraryDescription ?? "",
    mealsIncluded: it.mealsIncluded ?? "",
    roomAllocations: (it.roomAllocations ?? []).map((ra: any) => ({
      id: ra.id,
      roomTypeId: ra.roomTypeId,
      occupancyTypeId: ra.occupancyTypeId ?? "",
      mealPlanId: ra.mealPlanId ?? null,
      quantity: toInt(ra.quantity, 1),
      customRoomType: ra.customRoomType ?? "",
    })),
    transportDetails: (it.transportDetails ?? [])
      .map((td: any) => ({
        id: td.id,
        vehicleTypeId: td.vehicleTypeId ?? td.vehicleType?.id ?? "",
        quantity: toInt(td.quantity, 1),
        description: td.description ?? "",
      }))
      .filter((td: TransportDetailRow) => td.vehicleTypeId?.trim()),
  }));
}

type DetailResponse = TourQueryDetailResponse;

function mapPoliciesFromDetail(d: DetailResponse): Record<string, string> {
  const pol: Record<string, string> = {};
  for (const f of POLICY_FIELDS) {
    pol[f.key as string] = ((d[f.listKey] as string[]) ?? []).join("\n");
  }
  return pol;
}

type BaselinePayload = {
  tourPackageQueryName: string;
  customerName: string;
  customerNumber: string;
  numAdults: string;
  numChild512: string;
  numChild05: string;
  tourStartsFrom: string;
  tourEndsOn: string;
  queryLocationId: string;
  transport: string;
  pickupLocation: string;
  dropLocation: string;
  remarks: string;
  policies: Record<string, string>;
  itineraries: ItineraryRow[];
  selectedTemplateId: string | null;
  selectedVariantIds: string[];
};

function serializeBaseline(p: BaselinePayload): string {
  // Sort the variant IDs so JSON string comparison is order-independent
  const sorted = {
    ...p,
    selectedVariantIds: [...p.selectedVariantIds].sort(),
  };
  return JSON.stringify(sorted);
}

function buildBaselineFromDetail(
  d: DetailResponse,
  itineraries: ItineraryRow[],
  selectedVariantIds: string[]
): BaselinePayload {
  return {
    tourPackageQueryName: d.tourPackageQueryName ?? "",
    customerName: d.customerName ?? "",
    customerNumber: d.customerNumber ?? "",
    numAdults: d.numAdults ?? "",
    numChild512: d.numChild5to12 ?? "",
    numChild05: d.numChild0to5 ?? "",
    tourStartsFrom: d.tourStartsFrom ? d.tourStartsFrom.substring(0, 10) : "",
    tourEndsOn: d.tourEndsOn ? d.tourEndsOn.substring(0, 10) : "",
    queryLocationId: d.locationId ?? d.location?.id ?? "",
    transport: d.transport ?? "",
    pickupLocation: d.pickup_location ?? "",
    dropLocation: d.drop_location ?? "",
    remarks: d.remarks ?? "",
    policies: mapPoliciesFromDetail(d),
    itineraries,
    selectedTemplateId: d.selectedTemplateId || null,
    selectedVariantIds,
  };
}

export function useTourQueryEditForm(queryId: string) {
  const id = queryId;
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const authRequest = useMemo(() => withAuth(() => getTokenRef.current()), []);
  const editClient = useMemo(
    () => createTourQueryEditClient(authRequest),
    [authRequest]
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerNumber, setCustomerNumber] = useState("");
  const [numAdults, setNumAdults] = useState("");
  const [numChild512, setNumChild512] = useState("");
  const [numChild05, setNumChild05] = useState("");
  const [startsFrom, setStartsFrom] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [queryLocationId, setQueryLocationId] = useState<string | null>(null);
  const [transport, setTransport] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropLocation, setDropLocation] = useState("");
  const [remarks, setRemarks] = useState("");
  const [policies, setPolicies] = useState<Record<string, string>>({});
  const [itineraries, setItineraries] = useState<ItineraryRow[]>([]);
  const [inquiry, setInquiry] = useState<DetailResponse["inquiry"]>(null);
  const [saveErrorTab, setSaveErrorTab] = useState<TourQueryTabId | null>(null);
  const baselineSerialized = useRef<string | null>(null);

  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [roomTypes, setRoomTypes] = useState<{ id: string; name: string }[]>([]);
  const [occupancyTypes, setOccupancyTypes] = useState<{ id: string; name: string }[]>([]);
  const [mealPlans, setMealPlans] = useState<{ id: string; name: string }[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<{ id: string; name: string }[]>([]);
  const [hotelsCache, setHotelsCache] = useState<Record<string, { id: string; name: string }[]>>({});

  const [packagesList, setPackagesList] = useState<{ id: string; name: string }[]>([]);
  const [queriesList, setQueriesList] = useState<{ id: string; name: string }[]>([]);
  const [packageVariants, setPackageVariants] = useState<{ id: string; name: string }[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([]);
  const [selectedCopyQueryId, setSelectedCopyQueryId] = useState<string | null>(null);

  const [activePicker, setActivePicker] = useState<ActivePickerState>(null);
  const packagesLocationRef = useRef<string | null | undefined>(undefined);
  const aiApplyDraftChecked = useRef(false);

  const refreshPackagesList = useCallback(
    async (locId: string | null, keepSelectedId?: string | null) => {
      try {
        const qs = new URLSearchParams({ limit: "100" });
        if (locId) qs.set("locationId", locId);
        const pkgsRes = await authRequest<{
          packages: { id: string; tourPackageName: string | null }[];
        }>(`/api/mobile/tour-packages?${qs}`);
        let list = (pkgsRes.packages ?? []).map((p) => ({
          id: p.id,
          name: p.tourPackageName || "Untitled Package",
        }));
        if (keepSelectedId && !list.some((p) => p.id === keepSelectedId)) {
          try {
            const pkg = await authRequest<{ id: string; tourPackageName: string | null }>(
              `/api/mobile/tour-packages/${encodeURIComponent(keepSelectedId)}`
            );
            list = [
              { id: pkg.id, name: pkg.tourPackageName || "Untitled Package" },
              ...list,
            ];
          } catch (err) {
            console.log("Failed to load selected template for package list", err);
          }
        }
        setPackagesList(list);
      } catch (err) {
        console.log("Failed to load tour packages for location", locId, err);
        setPackagesList([]);
      }
    },
    [authRequest]
  );

  const loadHotelsForLocation = useCallback(async (locId: string) => {
    if (!locId || hotelsCache[locId]) return;
    try {
      const response = await authRequest<{ items: { id: string; name: string }[] }>(
        `/api/mobile/operations/list?type=hotels&locationId=${encodeURIComponent(locId)}&limit=100`
      );
      setHotelsCache((prev) => ({
        ...prev,
        [locId]: response.items || [],
      }));
    } catch (err) {
      console.log("Failed to load hotels for location", locId, err);
    }
  }, [hotelsCache, authRequest]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) {
        if (!cancelled) {
          setError("Missing query id");
          setLoading(false);
        }
        return;
      }
      try {
        const [d, locRes, pricingRes, vehicleRes, queriesRes] = await Promise.all([
          authRequest<DetailResponse>(
            `/api/mobile/tour-queries/${encodeURIComponent(id)}`
          ),
          authRequest<{ items: { id: string; name: string }[] }>(
            "/api/mobile/operations/list?type=locations&limit=100"
          ),
          authRequest<{
            roomTypes: { id: string; name: string }[];
            occupancyTypes: { id: string; name: string }[];
            mealPlans: { id: string; name: string }[];
          }>("/api/mobile/operations/pricing-lookups"),
          authRequest<{ items: { id: string; name: string }[] }>(
            "/api/mobile/operations/list?type=vehicle-types&limit=100"
          ),
          authRequest<{
            queries: { id: string; tourPackageQueryName: string | null; tourPackageQueryNumber: string | null }[];
          }>("/api/mobile/tour-queries?status=all&limit=50")
        ]);

        if (cancelled) return;

        setName(d.tourPackageQueryName ?? "");
        setCustomerName(d.customerName ?? "");
        setCustomerNumber(d.customerNumber ?? "");
        setNumAdults(d.numAdults ?? "");
        setNumChild512(d.numChild5to12 ?? "");
        setNumChild05(d.numChild0to5 ?? "");
        setStartsFrom(d.tourStartsFrom ? d.tourStartsFrom.substring(0, 10) : "");
        setEndsOn(d.tourEndsOn ? d.tourEndsOn.substring(0, 10) : "");
        setQueryLocationId(d.locationId ?? d.location?.id ?? null);
        setTransport(d.transport ?? "");
        setPickupLocation(d.pickup_location ?? "");
        setDropLocation(d.drop_location ?? "");
        setRemarks(d.remarks ?? "");
        setLocations(locRes.items || []);
        setRoomTypes(pricingRes.roomTypes || []);
        setOccupancyTypes(pricingRes.occupancyTypes || []);
        setMealPlans(pricingRes.mealPlans || []);
        setVehicleTypes(vehicleRes.items || []);
        setInquiry(d.inquiry ?? null);
        setSelectedPackageId(d.selectedTemplateId || null);
        setPackageVariants([]);
        setSelectedCopyQueryId(null);
        const initVariantIds = parseSelectedVariantIds(d.selectedVariantIds);
        setSelectedVariantIds(initVariantIds);

        const initLocationId = d.locationId ?? d.location?.id ?? null;
        await refreshPackagesList(initLocationId, d.selectedTemplateId || null);
        if (!cancelled) packagesLocationRef.current = initLocationId;

        setQueriesList(
          (queriesRes.queries ?? [])
            .filter((q) => q.id !== id)
            .map((q) => ({
              id: q.id,
              name: q.tourPackageQueryName || q.tourPackageQueryNumber || "Untitled Query",
            }))
        );

        if (d.selectedTemplateId) {
          try {
            const pkg = await authRequest<any>(`/api/mobile/tour-packages/${encodeURIComponent(d.selectedTemplateId)}`);
            setPackageVariants(pkg.variants || []);
          } catch (err) {
            console.log("Failed to load variants on init", err);
          }
        }

        const pol = mapPoliciesFromDetail(d);
        const itinerariesInit = mapItinerariesFromDetail(d.itineraries);

        baselineSerialized.current = serializeBaseline(
          buildBaselineFromDetail(d, itinerariesInit, initVariantIds)
        );
        setPolicies(pol);
        setItineraries(itinerariesInit);

        // Pre-fetch hotels for all unique locations in loaded itineraries
        const uniqueLocationIds = Array.from(
          new Set(
            (d.itineraries ?? [])
              .map((it: any) => it.locationId)
              .filter((locId): locId is string => typeof locId === "string" && locId.length > 0)
          )
        );

        await Promise.all(
          uniqueLocationIds.map(async (locId) => {
            try {
              const response = await authRequest<{ items: { id: string; name: string }[] }>(
                `/api/mobile/operations/list?type=hotels&locationId=${encodeURIComponent(locId)}&limit=100`
              );
              if (!cancelled) {
                setHotelsCache((prev) => ({
                  ...prev,
                  [locId]: response.items || [],
                }));
              }
            } catch (err) {
              console.log("Failed to load hotels for location on init", locId, err);
            }
          })
        );
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof ApiError ? err.message : "Could not load query."
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id, authRequest, refreshPackagesList]);

  useEffect(() => {
    if (loading || !id || aiApplyDraftChecked.current) return;
    aiApplyDraftChecked.current = true;
    void (async () => {
      try {
        const stored = await consumeAiDraft(AI_DRAFT_KEYS.queryApply);
        if (!stored) return;
        const mapped = mapAiDraftToQueryInitial(stored);
        setName((prev) => mapped.tourPackageQueryName || prev);
        setTransport((prev) => mapped.transport || prev);
        setPickupLocation((prev) => mapped.pickupLocation || prev);
        setDropLocation((prev) => mapped.dropLocation || prev);
        if (mapped.itineraries.length) setItineraries(mapped.itineraries);
        Alert.alert(
          "AI Wizard",
          "Applied AI-generated itinerary to this query. Review and save when ready."
        );
      } catch {
        // Draft storage unavailable on older native builds — edit still works.
      }
    })();
  }, [loading, id]);

  useEffect(() => {
    if (loading) return;
    if (packagesLocationRef.current === queryLocationId) return;
    packagesLocationRef.current = queryLocationId;
    void refreshPackagesList(queryLocationId, selectedPackageId);
  }, [loading, queryLocationId, selectedPackageId, refreshPackagesList]);

  const datesOk =
    (!startsFrom || ISO.test(startsFrom)) && (!endsOn || ISO.test(endsOn));

  const datesOrderWarning =
    !!(
      startsFrom &&
      endsOn &&
      ISO.test(startsFrom) &&
      ISO.test(endsOn) &&
      startsFrom > endsOn
    );

  const liveSerialized = useMemo(
    () =>
      serializeBaseline({
        tourPackageQueryName: name,
        customerName,
        customerNumber,
        numAdults,
        numChild512,
        numChild05,
        tourStartsFrom: startsFrom,
        tourEndsOn: endsOn,
        queryLocationId: queryLocationId ?? "",
        transport,
        pickupLocation,
        dropLocation,
        remarks,
        policies,
        itineraries,
        selectedTemplateId: selectedPackageId,
        selectedVariantIds,
      }),
    [
      name,
      customerName,
      customerNumber,
      numAdults,
      numChild512,
      numChild05,
      startsFrom,
      endsOn,
      queryLocationId,
      transport,
      pickupLocation,
      dropLocation,
      remarks,
      policies,
      itineraries,
      selectedPackageId,
      selectedVariantIds,
    ]
  );

  const dirty =
    !!baselineSerialized.current && liveSerialized !== baselineSerialized.current;

  const itineraryValidationError = useMemo(() => {
    if (selectedPackageId && itineraries.length === 0) {
      return "Selected template has no itinerary days. Choose another template or add at least one day.";
    }
    for (let d = 0; d < itineraries.length; d++) {
      const day = itineraries[d];
      if (!day.locationId) {
        return `Day ${day.dayNumber ?? d + 1}: choose a location.`;
      }
      for (let r = 0; r < day.roomAllocations.length; r++) {
        if (!day.roomAllocations[r].occupancyTypeId?.trim()) {
          return `Day ${day.dayNumber ?? d + 1}, room ${r + 1}: choose occupancy.`;
        }
      }
    }
    return null;
  }, [itineraries, selectedPackageId]);

  const saveBlocked =
    saving || !datesOk || datesOrderWarning || !dirty || !!itineraryValidationError;

  const addDay = useCallback(() => {
    setItineraries((prev) => {
      const nextDayNumber = prev.length + 1;
      const initialAllocations: RoomAllocationRow[] = (inquiry?.roomAllocations || []).map((ra) => ({
        roomTypeId: ra.roomTypeId,
        occupancyTypeId: ra.occupancyTypeId,
        mealPlanId: ra.mealPlanId || null,
        quantity: ra.quantity ?? 1,
        customRoomType: ra.customRoomType || "",
      }));

      const newDay: ItineraryRow = {
        id: `temp-${Date.now()}-${Math.random()}`,
        dayNumber: nextDayNumber,
        days: String(nextDayNumber),
        locationId: locations[0]?.id || null,
        hotelId: null,
        itineraryTitle: "",
        itineraryDescription: "",
        mealsIncluded: "",
        roomAllocations: initialAllocations,
        transportDetails: [],
      };
      if (newDay.locationId) {
        void loadHotelsForLocation(newDay.locationId);
      }
      return [...prev, newDay];
    });
  }, [locations, loadHotelsForLocation, inquiry]);

  const deleteDay = useCallback((indexToDelete: number) => {
    setItineraries((prev) => {
      const filtered = prev.filter((_, idx) => idx !== indexToDelete);
      return filtered.map((day, idx) => ({
        ...day,
        dayNumber: idx + 1,
        days: String(idx + 1),
      }));
    });
  }, []);

  const addRoomAllocation = useCallback((dayIndex: number) => {
    setItineraries((prev) => {
      const copy = [...prev];
      const day = { ...copy[dayIndex] };
      const defaultRoomType = roomTypes[0]?.id || "4ae23712-19f7-4035-9db9-4d0df85d64ea";
      const defaultOccupancy = occupancyTypes[0]?.id || "";
      const defaultMealPlan = mealPlans[0]?.id || null;

      const newAllocation: RoomAllocationRow = {
        roomTypeId: defaultRoomType,
        occupancyTypeId: defaultOccupancy,
        mealPlanId: defaultMealPlan,
        quantity: 1,
        customRoomType: "",
      };

      day.roomAllocations = [...day.roomAllocations, newAllocation];
      copy[dayIndex] = day;
      return copy;
    });
  }, [roomTypes, occupancyTypes, mealPlans]);

  const deleteRoomAllocation = useCallback((dayIndex: number, allocIndex: number) => {
    setItineraries((prev) => {
      const copy = [...prev];
      const day = { ...copy[dayIndex] };
      day.roomAllocations = day.roomAllocations.filter((_, idx) => idx !== allocIndex);
      copy[dayIndex] = day;
      return copy;
    });
  }, []);

  const updateRoomQuantity = useCallback((dayIndex: number, allocIndex: number, qtyStr: string) => {
    const qty = qtyStr === "" ? 0 : parseInt(qtyStr.replace(/[^0-9]/g, ""), 10) || 0;
    setItineraries((prev) => {
      const copy = [...prev];
      const day = { ...copy[dayIndex] };
      const allocs = [...day.roomAllocations];
      allocs[allocIndex] = { ...allocs[allocIndex], quantity: qty };
      day.roomAllocations = allocs;
      copy[dayIndex] = day;
      return copy;
    });
  }, []);

  const updateCustomRoomType = useCallback((dayIndex: number, allocIndex: number, text: string) => {
    setItineraries((prev) => {
      const copy = [...prev];
      const day = { ...copy[dayIndex] };
      const allocs = [...day.roomAllocations];
      allocs[allocIndex] = { ...allocs[allocIndex], customRoomType: text };
      day.roomAllocations = allocs;
      copy[dayIndex] = day;
      return copy;
    });
  }, []);

  const addTransportDetail = useCallback((dayIndex: number) => {
    setItineraries((prev) => {
      const copy = [...prev];
      const day = { ...copy[dayIndex] };
      const defaultVehicle = vehicleTypes[0]?.id || "";
      day.transportDetails = [
        ...day.transportDetails,
        {
          vehicleTypeId: defaultVehicle,
          quantity: 1,
          description: "",
        },
      ];
      copy[dayIndex] = day;
      return copy;
    });
  }, [vehicleTypes]);

  const deleteTransportDetail = useCallback((dayIndex: number, transportIndex: number) => {
    setItineraries((prev) => {
      const copy = [...prev];
      const day = { ...copy[dayIndex] };
      day.transportDetails = day.transportDetails.filter((_, idx) => idx !== transportIndex);
      copy[dayIndex] = day;
      return copy;
    });
  }, []);

  const updateTransportQuantity = useCallback(
    (dayIndex: number, transportIndex: number, qtyStr: string) => {
      const qty = qtyStr === "" ? 0 : parseInt(qtyStr.replace(/[^0-9]/g, ""), 10) || 0;
      setItineraries((prev) => {
        const copy = [...prev];
        const day = { ...copy[dayIndex] };
        const rows = [...day.transportDetails];
        rows[transportIndex] = { ...rows[transportIndex], quantity: qty };
        day.transportDetails = rows;
        copy[dayIndex] = day;
        return copy;
      });
    },
    []
  );

  const updateTransportDescription = useCallback(
    (dayIndex: number, transportIndex: number, text: string) => {
      setItineraries((prev) => {
        const copy = [...prev];
        const day = { ...copy[dayIndex] };
        const rows = [...day.transportDetails];
        rows[transportIndex] = { ...rows[transportIndex], description: text };
        day.transportDetails = rows;
        copy[dayIndex] = day;
        return copy;
      });
    },
    []
  );

  const applyInquiryRoomAllocationsToAll = useCallback((currentItineraries: ItineraryRow[]) => {
    if (!inquiry || !inquiry.roomAllocations || inquiry.roomAllocations.length === 0) {
      return currentItineraries;
    }
    const mapped: RoomAllocationRow[] = inquiry.roomAllocations.map((ra) => ({
      roomTypeId: ra.roomTypeId,
      occupancyTypeId: ra.occupancyTypeId,
      mealPlanId: ra.mealPlanId || null,
      quantity: ra.quantity ?? 1,
      customRoomType: ra.customRoomType || "",
    }));
    return currentItineraries.map((day) => ({
      ...day,
      roomAllocations: [...mapped],
    }));
  }, [inquiry]);

  const forceApplyInquiryRoomAllocations = useCallback(() => {
    setItineraries((prev) => applyInquiryRoomAllocationsToAll(prev));
    Alert.alert("Success", "Inquiry room allocations applied to all days.");
  }, [applyInquiryRoomAllocationsToAll]);

  const pickerOptions = useMemo(() => {
    if (!activePicker) return [];
    switch (activePicker.type) {
      case "location":
        return locations.map((l) => ({ id: l.id, label: l.name }));
      case "hotel": {
        const day = itineraries[activePicker.dayIndex];
        const locId = day?.locationId;
        if (!locId) return [];
        return (hotelsCache[locId] || []).map((h) => ({ id: h.id, label: h.name }));
      }
      case "roomType":
        return roomTypes.map((rt) => ({ id: rt.id, label: rt.name }));
      case "occupancy":
        return occupancyTypes.map((ot) => ({ id: ot.id, label: ot.name }));
      case "mealPlan":
        return mealPlans.map((mp) => ({ id: mp.id, label: mp.name }));
      case "vehicleType":
        return vehicleTypes.map((vt) => ({ id: vt.id, label: vt.name }));
      case "packageTemplate":
        return packagesList.map((p) => ({ id: p.id, label: p.name }));
      case "copyQuery":
        return queriesList.map((q) => ({ id: q.id, label: q.name }));
      case "queryLocation":
        return locations.map((l) => ({ id: l.id, label: l.name }));
      default:
        return [];
    }
  }, [
    activePicker,
    locations,
    hotelsCache,
    itineraries,
    roomTypes,
    occupancyTypes,
    mealPlans,
    vehicleTypes,
    packagesList,
    packageVariants,
    queriesList,
  ]);

  const pickerTitle = useMemo(() => {
    if (!activePicker) return "";
    switch (activePicker.type) {
      case "location":
        return "Select Location";
      case "hotel":
        return "Select Hotel";
      case "roomType":
        return "Select Room Type";
      case "occupancy":
        return "Select Occupancy";
      case "mealPlan":
        return "Select Meal Plan";
      case "vehicleType":
        return "Select Vehicle";
      case "packageTemplate":
        return "Select Tour Package Template";
      case "copyQuery":
        return "Copy from Another Query";
      case "queryLocation":
        return "Primary Destination";
      default:
        return "";
    }
  }, [activePicker]);

  const pickerSelectedId = useMemo(() => {
    if (!activePicker) return undefined;
    if (activePicker.type === "packageTemplate") return selectedPackageId ?? undefined;
    if (activePicker.type === "copyQuery") return selectedCopyQueryId ?? undefined;
    if (activePicker.type === "queryLocation") return queryLocationId ?? undefined;

    const day = itineraries[activePicker.dayIndex];
    if (!day) return undefined;
    if (activePicker.type === "location") return day.locationId;
    if (activePicker.type === "hotel") return day.hotelId;

    const alloc = day.roomAllocations[activePicker.allocationIndex!];
    if (!alloc) {
      const transport = day.transportDetails[activePicker.transportIndex!];
      if (activePicker.type === "vehicleType") return transport?.vehicleTypeId;
      return undefined;
    }
    if (activePicker.type === "roomType") return alloc.roomTypeId;
    if (activePicker.type === "occupancy") return alloc.occupancyTypeId;
    if (activePicker.type === "mealPlan") return alloc.mealPlanId;
    return undefined;
  }, [activePicker, itineraries, selectedPackageId, selectedCopyQueryId, queryLocationId]);

  const handlePickerSelect = useCallback(async (option: { id: string; label: string }) => {
    if (!activePicker) return;
    const { type, dayIndex, allocationIndex, transportIndex } = activePicker;

    if (type === "queryLocation") {
      setQueryLocationId(option.id);
      return;
    }

    if (type === "packageTemplate") {
      setSaving(true);
      try {
        const pkg = await authRequest<any>(`/api/mobile/tour-packages/${encodeURIComponent(option.id)}`);
        const newItineraries = (pkg.itineraries || []).map((it: any, idx: number) => ({
          id: `temp-${Date.now()}-${idx}-${Math.random()}`,
          dayNumber: it.dayNumber,
          days: String(it.dayNumber),
          locationId: pkg.locationId || locations[0]?.id || null,
          hotelId: null,
          itineraryTitle: it.itineraryTitle || "",
          itineraryDescription: it.itineraryDescription || "",
          mealsIncluded: it.mealsIncluded || "",
          roomAllocations: [],
          transportDetails: [],
        }));

        if (newItineraries.length === 0) {
          Alert.alert(
            "No itinerary on template",
            "This tour package has no itinerary days in admin. Add days on the web dashboard or use Add Day below."
          );
          setSaving(false);
          return;
        }

        setSelectedVariantIds([]);
        setSelectedCopyQueryId(null);
        setSelectedPackageId(pkg.id ?? option.id);
        setPackageVariants(pkg.variants || []);

        // Auto-select default variant if any
        const defaultVar = pkg.variants?.find((v: any) => v.isDefault);
        if (defaultVar) {
          setSelectedVariantIds([defaultVar.id]);
        }

        if (pkg.locationId) {
          void loadHotelsForLocation(pkg.locationId);
        }

        const withRooms = ensureItineraryRoomDefaults(
          applyInquiryRoomAllocationsToAll(newItineraries)
        );
        setItineraries(withRooms);
      } catch (err) {
        Alert.alert("Error", "Could not load package template details.");
      } finally {
        setSaving(false);
      }
      return;
    }

    if (type === "copyQuery") {
      setSelectedCopyQueryId(option.id);
      setSelectedPackageId(null);
      setSelectedVariantIds([]);
      setSaving(true);
      try {
        const srcQuery = await authRequest<any>(
          `/api/mobile/tour-queries/${encodeURIComponent(option.id)}`
        );

        const newItineraries = (srcQuery.itineraries || []).map((it: any) => ({
          id: `temp-${Date.now()}-${Math.random()}`,
          dayNumber: it.dayNumber,
          days: String(it.dayNumber),
          locationId: it.locationId || null,
          hotelId: it.hotelId || it.hotel?.id || null,
          itineraryTitle: it.itineraryTitle || "",
          itineraryDescription: it.itineraryDescription || "",
          mealsIncluded: it.mealsIncluded || "",
          roomAllocations: (it.roomAllocations ?? []).map((ra: any) => ({
            roomTypeId: ra.roomTypeId,
            occupancyTypeId: ra.occupancyTypeId ?? "",
            mealPlanId: ra.mealPlanId ?? null,
            quantity: toInt(ra.quantity, 1),
            customRoomType: ra.customRoomType ?? "",
          })),
          transportDetails: (it.transportDetails ?? []).map((td: any) => ({
            vehicleTypeId: td.vehicleTypeId ?? td.vehicleType?.id ?? "",
            quantity: toInt(td.quantity, 1),
            description: td.description ?? "",
          })).filter((td: TransportDetailRow) => td.vehicleTypeId?.trim()),
        }));

        for (const it of newItineraries) {
          if (it.locationId) {
            void loadHotelsForLocation(it.locationId);
          }
        }

        const pol: Record<string, string> = {};
        for (const f of POLICY_FIELDS) {
          pol[f.key as string] = ((srcQuery[f.listKey] as string[]) ?? []).join("\n");
        }
        setPolicies(pol);

        const withRooms = ensureItineraryRoomDefaults(
          applyInquiryRoomAllocationsToAll(newItineraries)
        );
        setItineraries(withRooms);
      } catch (err) {
        Alert.alert("Error", "Could not load query details to copy.");
      } finally {
        setSaving(false);
      }
      return;
    }

    setItineraries((prev) => {
      const copy = [...prev];
      const day = { ...copy[dayIndex] };

      if (type === "location") {
        day.locationId = option.id;
        if (day.hotelId) {
          day.hotelId = null;
        }
        void loadHotelsForLocation(option.id);
      } else if (type === "hotel") {
        day.hotelId = option.id;
      } else if (transportIndex !== undefined && type === "vehicleType") {
        const transports = [...day.transportDetails];
        transports[transportIndex] = { ...transports[transportIndex], vehicleTypeId: option.id };
        day.transportDetails = transports;
      } else if (allocationIndex !== undefined) {
        const allocs = [...day.roomAllocations];
        const alloc = { ...allocs[allocationIndex] };
        if (type === "roomType") {
          alloc.roomTypeId = option.id;
        } else if (type === "occupancy") {
          alloc.occupancyTypeId = option.id;
        } else if (type === "mealPlan") {
          alloc.mealPlanId = option.id;
        }
        allocs[allocationIndex] = alloc;
        day.roomAllocations = allocs;
      }

      copy[dayIndex] = day;
      return copy;
    });
  }, [activePicker, loadHotelsForLocation, locations, authRequest, applyInquiryRoomAllocationsToAll, vehicleTypes]);

  const applySavedDetail = useCallback(
    (d: DetailResponse) => {
      const refreshedItineraries = mapItinerariesFromDetail(d.itineraries);
      const refreshedVariantIds = parseSelectedVariantIds(d.selectedVariantIds);
      const refreshedPolicies = mapPoliciesFromDetail(d);

      setName(d.tourPackageQueryName ?? "");
      setCustomerName(d.customerName ?? "");
      setCustomerNumber(d.customerNumber ?? "");
      setNumAdults(d.numAdults ?? "");
      setNumChild512(d.numChild5to12 ?? "");
      setNumChild05(d.numChild0to5 ?? "");
      setStartsFrom(d.tourStartsFrom ? d.tourStartsFrom.substring(0, 10) : "");
      setEndsOn(d.tourEndsOn ? d.tourEndsOn.substring(0, 10) : "");
      setQueryLocationId(d.locationId ?? d.location?.id ?? null);
      setTransport(d.transport ?? "");
      setPickupLocation(d.pickup_location ?? "");
      setDropLocation(d.drop_location ?? "");
      setRemarks(d.remarks ?? "");
      setInquiry(d.inquiry ?? null);
      setSelectedPackageId(d.selectedTemplateId || null);
      setSelectedVariantIds(refreshedVariantIds);
      setPolicies(refreshedPolicies);
      setItineraries(refreshedItineraries);
      baselineSerialized.current = serializeBaseline(
        buildBaselineFromDetail(d, refreshedItineraries, refreshedVariantIds)
      );
    },
    []
  );

  const save = useCallback(async () => {
    if (!id || saveBlocked) return;
    const allowedVariantIds = new Set(packageVariants.map((v) => v.id));
    const variantIdsForSave = selectedVariantIds.filter((vid) => allowedVariantIds.has(vid));
    if (selectedVariantIds.length > 0 && variantIdsForSave.length === 0) {
      Alert.alert(
        "Cannot save",
        "Re-select variants after choosing the tour package template."
      );
      return;
    }
    if (variantIdsForSave.length > 0 && !selectedPackageId) {
      Alert.alert("Cannot save", "Choose a tour package template before saving variants.");
      return;
    }
    setSaving(true);
    try {
      const payload: TourQueryEditInput = {
        tourPackageQueryName: name.trim(),
        customerName: customerName.trim(),
        customerNumber: customerNumber.trim(),
        numAdults: numAdults.trim(),
        numChild5to12: numChild512.trim(),
        numChild0to5: numChild05.trim(),
        tourStartsFrom: startsFrom ? startsFrom : null,
        tourEndsOn: endsOn ? endsOn : null,
        locationId: queryLocationId ?? undefined,
        transport: transport.trim() || null,
        pickup_location: pickupLocation.trim() || null,
        drop_location: dropLocation.trim() || null,
        remarks: remarks.trim() || null,
        selectedTemplateId: selectedPackageId,
        selectedTemplateType: selectedPackageId ? "TourPackageVariant" : null,
        tourPackageTemplateName: selectedPackageId
          ? packagesList.find((p) => p.id === selectedPackageId)?.name || null
          : null,
        selectedVariantIds: variantIdsForSave,
        itineraries: itineraries.map((it) => ({
          id: it.id.startsWith("temp-") ? undefined : it.id,
          dayNumber: it.dayNumber ?? undefined,
          days: it.days ?? undefined,
          locationId: it.locationId ?? undefined,
          hotelId: it.hotelId,
          itineraryTitle: it.itineraryTitle ?? "",
          itineraryDescription: it.itineraryDescription ?? "",
          mealsIncluded: it.mealsIncluded ?? "",
          roomAllocations: it.roomAllocations
            .filter((ra) => ra.occupancyTypeId?.trim())
            .map((ra) => ({
              roomTypeId: ra.roomTypeId,
              occupancyTypeId: ra.occupancyTypeId.trim(),
              mealPlanId: ra.mealPlanId,
              quantity: toInt(ra.quantity, 1) || 1,
              customRoomType: ra.customRoomType || null,
            })),
          transportDetails: it.transportDetails
            .filter((td) => td.vehicleTypeId?.trim())
            .map((td) => ({
              vehicleTypeId: td.vehicleTypeId.trim(),
              quantity: toInt(td.quantity, 1) || 1,
              description: td.description?.trim() || null,
            })),
        })),
      };
      for (const f of POLICY_FIELDS) {
        payload[f.key] = (policies[f.key as string] ?? "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean) as never;
      }
      await editClient.update(id, payload);
      const refreshed = await authRequest<DetailResponse>(
        `/api/mobile/tour-queries/${encodeURIComponent(id)}`
      );
      applySavedDetail(refreshed);
      Alert.alert("Saved", "Tour package query updated.");
    } catch (err) {
      if (err instanceof ApiError && err.details && typeof err.details === "object") {
        const flat = err.details as { fieldErrors?: Record<string, string[] | undefined> };
        const tab = firstTabForFieldErrors(flat.fieldErrors);
        if (tab) setSaveErrorTab(tab);
      }
      Alert.alert("Save failed", formatApiValidationError(err));
    } finally {
      setSaving(false);
    }
  }, [
    id,
    saveBlocked,
    name,
    customerName,
    customerNumber,
    numAdults,
    numChild512,
    numChild05,
    startsFrom,
    endsOn,
    queryLocationId,
    transport,
    pickupLocation,
    dropLocation,
    remarks,
    policies,
    itineraries,
    selectedPackageId,
    selectedVariantIds,
    packageVariants,
    packagesList,
    editClient,
    authRequest,
    applySavedDetail,
  ]);

  const tabBadges = useMemo((): TabBadgeState => {
    const daysMissingHotel = itineraries.reduce(
      (acc, it) => (!it?.hotelId ? acc + 1 : acc),
      0
    );
    return {
      trip: !datesOk || datesOrderWarning || (!startsFrom && !endsOn),
      hotels: daysMissingHotel > 0 ? daysMissingHotel : undefined,
      pricing: false,
      variants: selectedVariantIds.length > 0,
    };
  }, [itineraries, datesOk, datesOrderWarning, startsFrom, endsOn, selectedVariantIds]);

  const saveDisabledReason = saving
    ? selectedVariantIds.length > 0
      ? "Saving? variant snapshots can take up to a minute."
      : "Saving?"
    : itineraryValidationError
      ? itineraryValidationError
      : datesOrderWarning
        ? "End date cannot be before start date."
        : !datesOk
          ? "Choose valid dates."
          : !dirty
            ? "Change a field to enable save."
            : undefined;

  return {
    id,
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
    inquiry,
    locations,
    roomTypes,
    occupancyTypes,
    mealPlans,
    vehicleTypes,
    hotelsCache,
    packagesList,
    queriesList,
    packageVariants,
    selectedPackageId,
    setSelectedPackageId,
    selectedVariantIds,
    setSelectedVariantIds,
    selectedCopyQueryId,
    datesOk,
    datesOrderWarning,
    itineraryValidationError,
    addDay,
    deleteDay,
    addRoomAllocation,
    deleteRoomAllocation,
    updateRoomQuantity,
    updateCustomRoomType,
    addTransportDetail,
    deleteTransportDetail,
    updateTransportQuantity,
    updateTransportDescription,
    forceApplyInquiryRoomAllocations,
    activePicker,
    setActivePicker,
    pickerOptions,
    pickerTitle,
    pickerSelectedId,
    handlePickerSelect,
    loadHotelsForLocation,
    authRequest,
  };
}

export type TourQueryEditFormState = ReturnType<typeof useTourQueryEditForm>;
