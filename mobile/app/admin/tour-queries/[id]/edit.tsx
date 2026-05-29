import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { ApiError, withAuth } from "@/lib/api";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { DateField } from "@/components/ui/DateField";
import {
  AdminBottomActionBar,
  AdminErrorState,
  AdminFormSection,
  AdminLoadingState,
  AdminScreen,
  AdminTopBar,
  AdminPickerSheet,
} from "@/components/admin";
import {
  createTourQueryEditClient,
  type TourQueryEditInput,
} from "@/lib/tour-query-edit";

interface RoomAllocationRow {
  id?: string;
  roomTypeId?: string;
  occupancyTypeId: string;
  mealPlanId?: string | null;
  quantity: number;
  customRoomType?: string | null;
}

interface ItineraryRow {
  id: string;
  dayNumber: number | null;
  days: string | null;
  locationId: string | null;
  hotelId: string | null;
  itineraryTitle: string | null;
  itineraryDescription: string | null;
  mealsIncluded: string | null;
  roomAllocations: RoomAllocationRow[];
}

interface DetailResponse {
  id: string;
  tourPackageQueryName: string | null;
  customerName: string | null;
  customerNumber: string | null;
  numAdults: string | null;
  numChild5to12: string | null;
  numChild0to5: string | null;
  tourStartsFrom: string | null;
  tourEndsOn: string | null;
  remarks: string | null;
  inclusionsList: string[];
  exclusionsList: string[];
  importantNotesList: string[];
  paymentPolicyList: string[];
  usefulTipList: string[];
  cancellationPolicyList: string[];
  airlineCancellationPolicyList: string[];
  termsconditionsList: string[];
  kitchenGroupPolicyList: string[];
  itineraries: ItineraryRow[];
  inquiry: {
    id: string;
    customerName: string | null;
    customerMobileNumber: string | null;
    status: string | null;
    associatePartnerId: string | null;
    roomAllocations: {
      id: string;
      quantity: number;
      customRoomType: string | null;
      roomTypeId: string;
      occupancyTypeId: string;
      mealPlanId: string | null;
      roomType: { id: string; name: string };
      occupancyType: { id: string; name: string };
      mealPlan?: { id: string; name: string } | null;
    }[];
  } | null;
}

const POLICY_FIELDS: {
  key: keyof TourQueryEditInput;
  listKey: keyof DetailResponse;
  label: string;
}[] = [
  { key: "inclusions", listKey: "inclusionsList", label: "Inclusions" },
  { key: "exclusions", listKey: "exclusionsList", label: "Exclusions" },
  { key: "importantNotes", listKey: "importantNotesList", label: "Important notes" },
  { key: "paymentPolicy", listKey: "paymentPolicyList", label: "Payment policy" },
  { key: "usefulTip", listKey: "usefulTipList", label: "Useful tips" },
  { key: "cancellationPolicy", listKey: "cancellationPolicyList", label: "Cancellation policy" },
  {
    key: "airlineCancellationPolicy",
    listKey: "airlineCancellationPolicyList",
    label: "Airline cancellation policy",
  },
  { key: "termsconditions", listKey: "termsconditionsList", label: "Terms & conditions" },
  { key: "kitchenGroupPolicy", listKey: "kitchenGroupPolicyList", label: "Kitchen / group policy" },
];

const ISO = /^\d{4}-\d{2}-\d{2}$/;

type BaselinePayload = {
  tourPackageQueryName: string;
  customerName: string;
  customerNumber: string;
  numAdults: string;
  numChild512: string;
  numChild05: string;
  tourStartsFrom: string;
  tourEndsOn: string;
  remarks: string;
  policies: Record<string, string>;
  itineraries: ItineraryRow[];
};

function serializeBaseline(p: BaselinePayload): string {
  return JSON.stringify(p);
}

export default function EditTourQueryScreen() {
  return (
    <PermissionGate permission="salesTrips.write">
      <EditTourQueryScreenInner />
    </PermissionGate>
  );
}

function EditTourQueryScreenInner() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
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
  const [remarks, setRemarks] = useState("");
  const [policies, setPolicies] = useState<Record<string, string>>({});
  const [itineraries, setItineraries] = useState<ItineraryRow[]>([]);
  const [inquiry, setInquiry] = useState<DetailResponse["inquiry"]>(null);
  const [policiesOpen, setPoliciesOpen] = useState(false);
  const [expandedPolicyKey, setExpandedPolicyKey] = useState<string | null>(null);
  const baselineSerialized = useRef<string | null>(null);

  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [roomTypes, setRoomTypes] = useState<{ id: string; name: string }[]>([]);
  const [occupancyTypes, setOccupancyTypes] = useState<{ id: string; name: string }[]>([]);
  const [mealPlans, setMealPlans] = useState<{ id: string; name: string }[]>([]);
  const [hotelsCache, setHotelsCache] = useState<Record<string, { id: string; name: string }[]>>({});

  const [packagesList, setPackagesList] = useState<{ id: string; name: string }[]>([]);
  const [queriesList, setQueriesList] = useState<{ id: string; name: string }[]>([]);
  const [packageVariants, setPackageVariants] = useState<{ id: string; name: string }[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedCopyQueryId, setSelectedCopyQueryId] = useState<string | null>(null);

  interface ActivePickerState {
    type:
      | "location"
      | "hotel"
      | "roomType"
      | "occupancy"
      | "mealPlan"
      | "packageTemplate"
      | "packageVariant"
      | "copyQuery";
    dayIndex: number;
    allocationIndex?: number;
  }
  const [activePicker, setActivePicker] = useState<ActivePickerState | null>(null);

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
      if (!id) return;
      try {
        const [d, locRes, pricingRes, pkgsRes, queriesRes] = await Promise.all([
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
          authRequest<{
            packages: { id: string; tourPackageName: string | null }[];
          }>("/api/mobile/tour-packages"),
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
        setRemarks(d.remarks ?? "");
        setLocations(locRes.items || []);
        setRoomTypes(pricingRes.roomTypes || []);
        setOccupancyTypes(pricingRes.occupancyTypes || []);
        setMealPlans(pricingRes.mealPlans || []);
        setInquiry(d.inquiry ?? null);

        setPackagesList(
          (pkgsRes.packages ?? []).map((p) => ({
            id: p.id,
            name: p.tourPackageName || "Untitled Package",
          }))
        );
        setQueriesList(
          (queriesRes.queries ?? [])
            .filter((q) => q.id !== id)
            .map((q) => ({
              id: q.id,
              name: q.tourPackageQueryName || q.tourPackageQueryNumber || "Untitled Query",
            }))
        );

        const pol: Record<string, string> = {};
        for (const f of POLICY_FIELDS) {
          pol[f.key as string] = ((d[f.listKey] as string[]) ?? []).join("\n");
        }

        const itinerariesInit = (d.itineraries ?? []).map((it: any) => ({
          id: it.id,
          dayNumber: it.dayNumber,
          days: it.days ?? (it.dayNumber ? String(it.dayNumber) : ""),
          locationId: it.locationId ?? null,
          hotelId: it.hotelId ?? null,
          itineraryTitle: it.itineraryTitle ?? "",
          itineraryDescription: it.itineraryDescription ?? "",
          mealsIncluded: it.mealsIncluded ?? "",
          roomAllocations: (it.roomAllocations ?? []).map((ra: any) => ({
            id: ra.id,
            roomTypeId: ra.roomTypeId,
            occupancyTypeId: ra.occupancyTypeId,
            mealPlanId: ra.mealPlanId ?? null,
            quantity: ra.quantity ?? 1,
            customRoomType: ra.customRoomType ?? "",
          })),
        }));

        baselineSerialized.current = serializeBaseline({
          tourPackageQueryName: d.tourPackageQueryName ?? "",
          customerName: d.customerName ?? "",
          customerNumber: d.customerNumber ?? "",
          numAdults: d.numAdults ?? "",
          numChild512: d.numChild5to12 ?? "",
          numChild05: d.numChild0to5 ?? "",
          tourStartsFrom: d.tourStartsFrom ? d.tourStartsFrom.substring(0, 10) : "",
          tourEndsOn: d.tourEndsOn ? d.tourEndsOn.substring(0, 10) : "",
          remarks: d.remarks ?? "",
          policies: pol,
          itineraries: itinerariesInit,
        });
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
  }, [id, authRequest]);

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
        remarks,
        policies,
        itineraries,
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
      remarks,
      policies,
      itineraries,
    ]
  );

  const dirty =
    !!baselineSerialized.current && liveSerialized !== baselineSerialized.current;

  const saveBlocked = saving || !datesOk || datesOrderWarning || !dirty;

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
      case "packageTemplate":
        return packagesList.map((p) => ({ id: p.id, label: p.name }));
      case "packageVariant":
        return packageVariants.map((v) => ({ id: v.id, label: v.name }));
      case "copyQuery":
        return queriesList.map((q) => ({ id: q.id, label: q.name }));
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
      case "packageTemplate":
        return "Select Tour Package Template";
      case "packageVariant":
        return "Select Package Variant";
      case "copyQuery":
        return "Copy from Another Query";
      default:
        return "";
    }
  }, [activePicker]);

  const pickerSelectedId = useMemo(() => {
    if (!activePicker) return undefined;
    if (activePicker.type === "packageTemplate") return selectedPackageId ?? undefined;
    if (activePicker.type === "packageVariant") return selectedVariantId ?? undefined;
    if (activePicker.type === "copyQuery") return selectedCopyQueryId ?? undefined;

    const day = itineraries[activePicker.dayIndex];
    if (!day) return undefined;
    if (activePicker.type === "location") return day.locationId;
    if (activePicker.type === "hotel") return day.hotelId;

    const alloc = day.roomAllocations[activePicker.allocationIndex!];
    if (!alloc) return undefined;
    if (activePicker.type === "roomType") return alloc.roomTypeId;
    if (activePicker.type === "occupancy") return alloc.occupancyTypeId;
    if (activePicker.type === "mealPlan") return alloc.mealPlanId;
    return undefined;
  }, [activePicker, itineraries, selectedPackageId, selectedVariantId, selectedCopyQueryId]);

  const handlePickerSelect = useCallback(async (option: { id: string; label: string }) => {
    if (!activePicker) return;
    const { type, dayIndex, allocationIndex } = activePicker;

    if (type === "packageTemplate") {
      setSelectedPackageId(option.id);
      setSelectedVariantId(null);
      setSelectedCopyQueryId(null);
      setSaving(true);
      try {
        const pkg = await authRequest<any>(`/api/mobile/tour-packages/${encodeURIComponent(option.id)}`);
        setPackageVariants(pkg.variants || []);
        
        const newItineraries = (pkg.itineraries || []).map((it: any) => ({
          id: `temp-${Date.now()}-${Math.random()}`,
          dayNumber: it.dayNumber,
          days: String(it.dayNumber),
          locationId: pkg.locationId || locations[0]?.id || null,
          hotelId: null,
          itineraryTitle: it.itineraryTitle || "",
          itineraryDescription: it.itineraryDescription || "",
          mealsIncluded: it.mealsIncluded || "",
          roomAllocations: [],
        }));

        if (pkg.locationId) {
          void loadHotelsForLocation(pkg.locationId);
        }

        const withRooms = applyInquiryRoomAllocationsToAll(newItineraries);
        setItineraries(withRooms);
      } catch (err) {
        Alert.alert("Error", "Could not load package template details.");
      } finally {
        setSaving(false);
      }
      return;
    }

    if (type === "packageVariant") {
      if (!selectedPackageId) return;
      setSelectedVariantId(option.id);
      setSaving(true);
      try {
        const res = await authRequest<{ mappings: any[] }>(
          `/api/mobile/tour-packages/${encodeURIComponent(selectedPackageId)}/variants/${encodeURIComponent(option.id)}/hotel-mappings`
        );
        
        setItineraries((prev) => {
          const copy = [...prev];
          for (const mapping of res.mappings || []) {
            const dIdx = copy.findIndex((d) => d.dayNumber === mapping.dayNumber);
            if (dIdx !== -1) {
              copy[dIdx] = {
                ...copy[dIdx],
                hotelId: mapping.hotelId,
              };
              if (copy[dIdx].locationId) {
                void loadHotelsForLocation(copy[dIdx].locationId);
              }
            }
          }
          return copy;
        });
      } catch (err) {
        Alert.alert("Error", "Could not load variant hotel mappings.");
      } finally {
        setSaving(false);
      }
      return;
    }

    if (type === "copyQuery") {
      setSelectedCopyQueryId(option.id);
      setSelectedPackageId(null);
      setSelectedVariantId(null);
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
          hotelId: it.hotelId || null,
          itineraryTitle: it.itineraryTitle || "",
          itineraryDescription: it.itineraryDescription || "",
          mealsIncluded: it.mealsIncluded || "",
          roomAllocations: [],
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

        const withRooms = applyInquiryRoomAllocationsToAll(newItineraries);
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
  }, [activePicker, loadHotelsForLocation, selectedPackageId, locations, authRequest, applyInquiryRoomAllocationsToAll]);

  const save = useCallback(async () => {
    if (!id || saveBlocked) return;
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
        remarks: remarks.trim() || null,
        itineraries: itineraries.map((it) => ({
          id: it.id.startsWith("temp-") ? undefined : it.id,
          dayNumber: it.dayNumber ?? undefined,
          days: it.days ?? undefined,
          locationId: it.locationId ?? undefined,
          hotelId: it.hotelId,
          itineraryTitle: it.itineraryTitle ?? "",
          itineraryDescription: it.itineraryDescription ?? "",
          mealsIncluded: it.mealsIncluded ?? "",
          roomAllocations: it.roomAllocations.map((ra) => ({
            roomTypeId: ra.roomTypeId,
            occupancyTypeId: ra.occupancyTypeId,
            mealPlanId: ra.mealPlanId,
            quantity: ra.quantity || 1,
            customRoomType: ra.customRoomType || null,
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
      router.back();
    } catch (err) {
      Alert.alert(
        "Save failed",
        err instanceof ApiError ? err.message : "Could not save changes."
      );
    } finally {
      setSaving(false);
    }
  }, [
    id,
    saving,
    saveBlocked,
    name,
    customerName,
    customerNumber,
    numAdults,
    numChild512,
    numChild05,
    startsFrom,
    endsOn,
    remarks,
    policies,
    itineraries,
    editClient,
    router,
  ]);

  if (loading) {
    return (
      <AdminLoadingState label="Loading tour package query…" testID="tq-edit-loading" />
    );
  }
  if (error) {
    return (
      <AdminScreen testID="tq-edit-error">
        <Stack.Screen options={{ title: "Edit Tour Package Query", headerShown: false }} />
        <AdminErrorState message={error} testID="tq-edit-error-state" />
      </AdminScreen>
    );
  }

  const saveDisabledReason = saving
    ? "Saving…"
    : datesOrderWarning
      ? "End date cannot be before start date."
      : !datesOk
        ? "Choose valid dates."
        : !dirty
          ? "Change a field to enable save."
          : undefined;

  return (
    <>
      <AdminScreen
        keyboardAvoiding
      testID="tq-edit-screen"
      footer={
        <AdminBottomActionBar
          primaryLabel="Save changes"
          primaryIcon="save-outline"
          primaryTestID="tq-edit-save"
          primaryDisabled={saveBlocked}
          primaryHint={
            datesOrderWarning
              ? "Fix date order before saving."
              : !dirty
                ? "Enable after you change a field."
                : "Writes updates to this query."
          }
          disabledReason={saveDisabledReason}
          onPrimaryPress={save}
        />
      }
    >
      <Stack.Screen options={{ title: "Edit Tour Package Query", headerShown: false }} />
      <AdminTopBar
        title="Edit Tour Package Query"
        subtitle={dirty ? "Unsaved changes" : "All changes saved"}
        onBackPress={() => router.back()}
        testID="tq-edit-header"
      />

        <AdminFormSection title="Basics" testID="tq-edit-section-basics">
          <Field label="Tour package query name" value={name} onChange={setName} />
        </AdminFormSection>

        <AdminFormSection title="Template & Source" testID="tq-edit-section-template">
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.label}>Load from Tour Package Template</Text>
            <Pressable
              testID="tq-edit-template-picker"
              accessibilityRole="button"
              accessibilityLabel="Choose package template"
              style={styles.pickerBtn}
              onPress={() => setActivePicker({ type: "packageTemplate", dayIndex: -1 })}
            >
              <Text style={styles.pickerBtnText} numberOfLines={2}>
                {packagesList.find((p) => p.id === selectedPackageId)?.name ?? "Select package template..."}
              </Text>
              <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {selectedPackageId ? (
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.label}>Select Package Variant</Text>
              <Pressable
                testID="tq-edit-variant-picker"
                accessibilityRole="button"
                accessibilityLabel="Choose package variant"
                style={styles.pickerBtn}
                onPress={() => setActivePicker({ type: "packageVariant", dayIndex: -1 })}
              >
                <Text style={styles.pickerBtnText} numberOfLines={2}>
                  {packageVariants.find((v) => v.id === selectedVariantId)?.name ?? "Select package variant..."}
                </Text>
                <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>
          ) : null}

          <View style={{ marginBottom: 12 }}>
            <Text style={styles.label}>Copy from Another Query</Text>
            <Pressable
              testID="tq-edit-copy-query-picker"
              accessibilityRole="button"
              accessibilityLabel="Choose query to copy"
              style={styles.pickerBtn}
              onPress={() => setActivePicker({ type: "copyQuery", dayIndex: -1 })}
            >
              <Text style={styles.pickerBtnText} numberOfLines={2}>
                {queriesList.find((q) => q.id === selectedCopyQueryId)?.name ?? "Select query to copy..."}
              </Text>
              <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
            </Pressable>
          </View>
        </AdminFormSection>

        <AdminFormSection title="Guests and dates" testID="tq-edit-section-guests">
          <Field
            label="Customer name"
            value={customerName}
            onChange={setCustomerName}
          />
          <Field
            label="Customer number"
            value={customerNumber}
            onChange={setCustomerNumber}
            keyboardType="phone-pad"
          />
          <View style={styles.row3}>
            <Field
              label="Adults"
              value={numAdults}
              onChange={setNumAdults}
              keyboardType="number-pad"
              flex
            />
            <Field
              label="Child 5-12"
              value={numChild512}
              onChange={setNumChild512}
              keyboardType="number-pad"
              flex
            />
            <Field
              label="Child 0-5"
              value={numChild05}
              onChange={setNumChild05}
              keyboardType="number-pad"
              flex
            />
          </View>
          <View style={styles.row2}>
            <View style={styles.flexField}>
              <Text style={styles.label}>Start date</Text>
              <DateField
                testID="tq-edit-start-date"
                accessibilityLabel="Start date"
                style={styles.input}
                value={startsFrom}
                onChange={setStartsFrom}
                placeholder="Choose start date"
              />
            </View>
            <View style={styles.flexField}>
              <Text style={styles.label}>End date</Text>
              <DateField
                testID="tq-edit-end-date"
                accessibilityLabel="End date"
                style={styles.input}
                value={endsOn}
                onChange={setEndsOn}
                placeholder="Choose end date"
              />
            </View>
          </View>
          {datesOrderWarning ?
            (
              <Text style={styles.helpErr}>End date cannot be before start date.</Text>
            )
            : null}
        </AdminFormSection>

        <AdminFormSection title="Remarks" testID="tq-edit-section-remarks">
          <Field
            label="Remarks"
            value={remarks}
            onChange={setRemarks}
            multiline
          />
        </AdminFormSection>

        <Pressable
          testID="tq-edit-section-policies-toggle"
          accessibilityRole="button"
          accessibilityLabel={policiesOpen ? "Hide policies section" : "Show policies section"}
          style={styles.collapsibleHeading}
          onPress={() => setPoliciesOpen((o) => !o)}
        >
          <Text style={[styles.sectionHeading, { flex: 1, marginTop: 0, marginBottom: 0 }]}>
            Policies · one item per line
          </Text>
          <Ionicons
            name={policiesOpen ? "chevron-up" : "chevron-down"}
            size={18}
            color={Colors.textTertiary}
          />
        </Pressable>
        {policiesOpen ? (
          <View testID="tq-edit-section-policies" style={styles.policyWrap}>
            {POLICY_FIELDS.map((f) => {
              const val = policies[f.key as string] ?? "";
              const lines = val.split(/\r?\n/).filter((ln) => ln.trim()).length || 0;
              const expanded = expandedPolicyKey === `pol-${String(f.key)}`;
              return (
                <View key={f.key as string} style={styles.policyCard}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${expanded ? "Hide" : "Show"} editor for ${f.label}`}
                    style={styles.policyTap}
                    onPress={() =>
                      setExpandedPolicyKey((prev) =>
                        prev === `pol-${String(f.key)}` ? null : `pol-${String(f.key)}`
                      )
                    }
                  >
                    <Text style={styles.policyTapTitle}>{f.label}</Text>
                    <Text style={styles.policyTapHint}>{lines} lines</Text>
                    <Ionicons
                      name={expanded ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={Colors.textTertiary}
                    />
                  </Pressable>
                  {expanded ?
                    (
                      <TextInput
                        style={[styles.input, styles.policyTextarea]}
                        value={val}
                        onChangeText={(t) =>
                          setPolicies((p) => ({ ...p, [f.key as string]: t }))
                        }
                        multiline
                        placeholderTextColor={Colors.textTertiary}
                      />
                    )
                    : null}
                </View>
              );
            })}
          </View>
        ) : null}

        <AdminFormSection title="Itinerary" testID="tq-edit-section-itinerary">
          <View style={styles.itineraryHeaderRow}>
            <Text style={styles.help}>
              Manage daily stays, locations, hotels, and room allocations.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add new day to itinerary"
              style={styles.addDayBtn}
              onPress={addDay}
            >
              <Ionicons name="add" size={14} color={Colors.primary} />
              <Text style={styles.addDayBtnText}>Add Day</Text>
            </Pressable>
          </View>

          {inquiry?.roomAllocations && inquiry.roomAllocations.length > 0 ? (
            <View style={styles.inquiryRoomBanner} testID="tq-edit-inquiry-rooms-banner">
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Ionicons name="bed-outline" size={16} color="#0369a1" />
                <Text style={{ fontWeight: "700", color: "#0369a1", fontSize: 13 }}>
                  Inquiry Room Allocation
                </Text>
              </View>
              <Text style={{ color: "#0c4a6e", fontSize: 12, marginBottom: 8, lineHeight: 16 }}>
                This inquiry specifies the following rooms:
              </Text>
              <View style={{ gap: 4, marginBottom: 12 }}>
                {inquiry.roomAllocations.map((ra) => (
                  <Text key={ra.id} style={{ color: "#0c4a6e", fontSize: 11, fontWeight: "600" }}>
                    • {ra.quantity}x {ra.customRoomType || ra.roomType?.name || "Custom Room"}{" "}
                    ({ra.occupancyType?.name || "Unknown Occupancy"})
                    {ra.mealPlan ? ` + ${ra.mealPlan.name}` : ""}
                  </Text>
                ))}
              </View>
              <Pressable
                testID="tq-edit-apply-inquiry-rooms"
                accessibilityRole="button"
                accessibilityLabel="Apply inquiry room allocations to all days"
                style={styles.applyRoomsBtn}
                onPress={forceApplyInquiryRoomAllocations}
              >
                <Ionicons name="checkmark-circle-outline" size={14} color="#fff" />
                <Text style={styles.applyRoomsBtnText}>Apply to All Days</Text>
              </Pressable>
            </View>
          ) : null}

        {itineraries.length === 0 ? (
          <View style={styles.emptyItineraryWrap}>
            <Text style={styles.help}>
              This tour package query has no itinerary yet. Click "Add Day" to begin.
            </Text>
          </View>
        ) : (
          itineraries.map((it, idx) => (
            <ItineraryDayCard
              key={it.id}
              it={it}
              idx={idx}
              locations={locations}
              roomTypes={roomTypes}
              occupancyTypes={occupancyTypes}
              mealPlans={mealPlans}
              hotelsCache={hotelsCache}
              onChange={(next) =>
                setItineraries((arr) =>
                  arr.map((x) => (x.id === next.id ? next : x))
                )
              }
              onSelectLocation={() => setActivePicker({ type: "location", dayIndex: idx })}
              onSelectHotel={() => setActivePicker({ type: "hotel", dayIndex: idx })}
              onSelectRoomType={(rIdx) => setActivePicker({ type: "roomType", dayIndex: idx, allocationIndex: rIdx })}
              onSelectOccupancy={(rIdx) => setActivePicker({ type: "occupancy", dayIndex: idx, allocationIndex: rIdx })}
              onSelectMealPlan={(rIdx) => setActivePicker({ type: "mealPlan", dayIndex: idx, allocationIndex: rIdx })}
              onAddRoom={() => addRoomAllocation(idx)}
              onDeleteRoom={(rIdx) => deleteRoomAllocation(idx, rIdx)}
              onUpdateRoomQuantity={(rIdx, qty) => updateRoomQuantity(idx, rIdx, qty)}
              onUpdateCustomRoomType={(rIdx, val) => updateCustomRoomType(idx, rIdx, val)}
              onDeleteDay={() => deleteDay(idx)}
            />
          ))
        )}
        </AdminFormSection>
    </AdminScreen>

    {activePicker ? (
      <AdminPickerSheet
        visible={true}
        title={pickerTitle}
        options={pickerOptions}
        selectedId={pickerSelectedId}
        onSelect={handlePickerSelect}
        onClose={() => setActivePicker(null)}
      />
    ) : null}
    </>
  );
}

function ItineraryDayCard({
  it,
  idx,
  locations,
  roomTypes,
  occupancyTypes,
  mealPlans,
  hotelsCache,
  onChange,
  onSelectLocation,
  onSelectHotel,
  onSelectRoomType,
  onSelectOccupancy,
  onSelectMealPlan,
  onAddRoom,
  onDeleteRoom,
  onUpdateRoomQuantity,
  onUpdateCustomRoomType,
  onDeleteDay,
}: {
  it: ItineraryRow;
  idx: number;
  locations: { id: string; name: string }[];
  roomTypes: { id: string; name: string }[];
  occupancyTypes: { id: string; name: string }[];
  mealPlans: { id: string; name: string }[];
  hotelsCache: Record<string, { id: string; name: string }[]>;
  onChange: (next: ItineraryRow) => void;
  onSelectLocation: () => void;
  onSelectHotel: () => void;
  onSelectRoomType: (rIdx: number) => void;
  onSelectOccupancy: (rIdx: number) => void;
  onSelectMealPlan: (rIdx: number) => void;
  onAddRoom: () => void;
  onDeleteRoom: (rIdx: number) => void;
  onUpdateRoomQuantity: (rIdx: number, qty: string) => void;
  onUpdateCustomRoomType: (rIdx: number, val: string) => void;
  onDeleteDay: () => void;
}) {
  const [descOpen, setDescOpen] = useState(false);
  const plainDesc = String(it.itineraryDescription ?? "").replace(/<[^>]+>/g, "");

  const locationLabel = locations.find((l) => l.id === it.locationId)?.name || "Select Location";
  const hotelName = it.hotelId
    ? (hotelsCache[it.locationId || ""] || []).find((h) => h.id === it.hotelId)?.name || "Select Hotel"
    : "Select Hotel";

  return (
    <View style={styles.dayCard}>
      <View style={styles.dayHeader}>
        <Text style={styles.dayLabel}>Day {it.dayNumber ?? idx + 1}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete day"
          onPress={onDeleteDay}
          style={styles.deleteDayBtn}
        >
          <Ionicons name="trash-outline" size={14} color={Colors.error} />
          <Text style={styles.deleteDayText}>Delete Day</Text>
        </Pressable>
      </View>

      <View style={styles.row2}>
        <View style={styles.flexField}>
          <Text style={styles.label}>Location</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Location: ${locationLabel}`}
            style={styles.pickerBtn}
            onPress={onSelectLocation}
          >
            <Text style={styles.pickerBtnText} numberOfLines={1}>
              {locationLabel}
            </Text>
            <Ionicons name="chevron-down" size={16} color={Colors.textTertiary} />
          </Pressable>
        </View>

        <View style={styles.flexField}>
          <Text style={styles.label}>Hotel</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Hotel: ${hotelName}`}
            style={[styles.pickerBtn, !it.locationId && styles.pickerBtnDisabled]}
            disabled={!it.locationId}
            onPress={onSelectHotel}
          >
            <Text style={[styles.pickerBtnText, !it.locationId && styles.pickerBtnTextDisabled]} numberOfLines={1}>
              {hotelName}
            </Text>
            <Ionicons name="chevron-down" size={16} color={Colors.textTertiary} />
          </Pressable>
        </View>
      </View>

      <Field
        label="Day title"
        value={it.itineraryTitle ?? ""}
        onChange={(t) => onChange({ ...it, itineraryTitle: t })}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={descOpen ? "Hide description editor" : "Show description editor"}
        accessibilityHint="Shows or hides the multiline day description editor."
        style={styles.inlineToggle}
        onPress={() => setDescOpen((o) => !o)}
      >
        <Text style={styles.inlineToggleText}>
          Description {descOpen ? "· hide" : "· expand"}
        </Text>
        <Ionicons
          name={descOpen ? "chevron-up" : "chevron-down"}
          size={16}
          color={Colors.textTertiary}
        />
      </Pressable>
      {descOpen ? (
        <TextInput
          style={[styles.input, styles.textarea]}
          value={plainDesc}
          onChangeText={(t) => onChange({ ...it, itineraryDescription: t })}
          multiline
          placeholder="Plain text..."
          placeholderTextColor={Colors.textTertiary}
        />
      ) : null}
      <Field
        label="Meals included"
        value={it.mealsIncluded ?? ""}
        onChange={(t) => onChange({ ...it, mealsIncluded: t })}
      />

      {/* Room Allocations Section */}
      <View style={styles.allocationsHeaderRow}>
        <Text style={styles.allocationsTitle}>Room Allocations</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add room allocation"
          style={styles.addRoomBtn}
          onPress={onAddRoom}
        >
          <Ionicons name="add" size={14} color={Colors.primary} />
          <Text style={styles.addRoomBtnText}>Add Room</Text>
        </Pressable>
      </View>

      {it.roomAllocations.length === 0 ? (
        <Text style={styles.noRoomsText}>No rooms allocated for this day.</Text>
      ) : (
        it.roomAllocations.map((ra, rIdx) => {
          const roomTypeName = roomTypes.find((r) => r.id === ra.roomTypeId)?.name || "Select Room Type";
          const occupancyName = occupancyTypes.find((o) => o.id === ra.occupancyTypeId)?.name || "Select Occupancy";
          const mealPlanName = mealPlans.find((m) => m.id === ra.mealPlanId)?.name || "Select Meal Plan";

          return (
            <View key={rIdx} style={styles.roomCard}>
              <View style={styles.roomCardHeader}>
                <Text style={styles.roomLabel}>Room {rIdx + 1}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Delete room allocation ${rIdx + 1}`}
                  onPress={() => onDeleteRoom(rIdx)}
                  style={styles.deleteRoomBtn}
                >
                  <Ionicons name="trash-outline" size={14} color={Colors.error} />
                </Pressable>
              </View>

              <View style={styles.row2}>
                <View style={styles.flexField}>
                  <Text style={styles.roomFieldLabel}>Room Type</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Room Type: ${roomTypeName}`}
                    style={styles.roomPickerBtn}
                    onPress={() => onSelectRoomType(rIdx)}
                  >
                    <Text style={styles.roomPickerText} numberOfLines={1}>
                      {roomTypeName}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color={Colors.textTertiary} />
                  </Pressable>
                </View>

                <View style={styles.flexField}>
                  <Text style={styles.roomFieldLabel}>Occupancy</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Occupancy: ${occupancyName}`}
                    style={styles.roomPickerBtn}
                    onPress={() => onSelectOccupancy(rIdx)}
                  >
                    <Text style={styles.roomPickerText} numberOfLines={1}>
                      {occupancyName}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color={Colors.textTertiary} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.row2}>
                <View style={styles.flexField}>
                  <Text style={styles.roomFieldLabel}>Meal Plan</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Meal Plan: ${mealPlanName}`}
                    style={styles.roomPickerBtn}
                    onPress={() => onSelectMealPlan(rIdx)}
                  >
                    <Text style={styles.roomPickerText} numberOfLines={1}>
                      {mealPlanName}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color={Colors.textTertiary} />
                  </Pressable>
                </View>

                <View style={[styles.flexField, { maxWidth: 90 }]}>
                  <Text style={styles.roomFieldLabel}>Quantity</Text>
                  <TextInput
                    style={styles.quantityInput}
                    keyboardType="number-pad"
                    value={ra.quantity === 0 ? "" : String(ra.quantity)}
                    onChangeText={(t) => onUpdateRoomQuantity(rIdx, t)}
                  />
                </View>
              </View>

              <View style={styles.customRoomField}>
                <Text style={styles.roomFieldLabel}>Custom Room Name (Optional)</Text>
                <TextInput
                  style={styles.customRoomInput}
                  value={ra.customRoomType || ""}
                  onChangeText={(t) => onUpdateCustomRoomType(rIdx, t)}
                  placeholder="e.g. Deluxe Sea View"
                  placeholderTextColor={Colors.textTertiary}
                />
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
  keyboardType,
  flex,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (t: string) => void;
  multiline?: boolean;
  keyboardType?: "default" | "number-pad" | "phone-pad";
  flex?: boolean;
  placeholder?: string;
}) {
  return (
    <View style={flex ? { flex: 1 } : undefined}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline ? styles.textarea : null]}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        keyboardType={keyboardType ?? "default"}
        placeholder={placeholder}
        placeholderTextColor={Colors.textTertiary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  inquiryRoomBanner: {
    backgroundColor: "#f0f9ff",
    borderColor: "#bae6fd",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  applyRoomsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#0284c7",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    alignSelf: "flex-start",
  },
  applyRoomsBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  container: { flex: 1, backgroundColor: Colors.background },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
    gap: Spacing.sm,
    padding: Spacing.xl,
  },
  errText: { fontSize: FontSize.md, fontWeight: "700", color: Colors.text, textAlign: "center" },
  sectionHeading: {
    fontSize: FontSize.xs,
    fontWeight: "900",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.55,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    marginLeft: 2,
  },
  collapsibleHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingRight: 4,
  },
  policyWrap: { gap: Spacing.sm, marginBottom: Spacing.sm },
  policyCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
    overflow: "hidden",
  },
  policyTap: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  policyTapTitle: { flex: 1, fontSize: FontSize.sm, fontWeight: "800", color: Colors.text },
  policyTapHint: { fontSize: FontSize.xs, fontWeight: "700", color: Colors.textTertiary },
  policyTextarea: { minHeight: 120, marginHorizontal: Spacing.md, marginBottom: Spacing.md },
  inlineToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  inlineToggleText: {
    fontSize: FontSize.xs,
    fontWeight: "800",
    color: Colors.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { flex: 1, fontSize: FontSize.xl, fontWeight: "900", color: Colors.text },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, gap: 4 },
  label: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: Spacing.md,
    marginBottom: 4,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  textarea: { minHeight: 90, textAlignVertical: "top" },
  flexField: { flex: 1 },
  row2: { flexDirection: "row", gap: Spacing.md },
  row3: { flexDirection: "row", gap: Spacing.sm },
  help: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 4 },
  helpErr: { color: Colors.error, fontSize: FontSize.xs, marginTop: 4 },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: "900",
    color: Colors.text,
    marginTop: Spacing.xl,
  },
  dayCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  dayLabel: {
    fontSize: FontSize.sm,
    fontWeight: "900",
    color: Colors.primary,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    backgroundColor: Colors.background,
  },
  submit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.md,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: "#fff", fontWeight: "800", fontSize: FontSize.md },
  itineraryHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
    marginTop: 4,
  },
  addDayBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  addDayBtnText: {
    fontSize: FontSize.xs,
    fontWeight: "800",
    color: Colors.primary,
  },
  emptyItineraryWrap: {
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: "dashed",
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  deleteDayBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.sm,
    backgroundColor: "#fee2e2",
  },
  deleteDayText: {
    fontSize: FontSize.xs,
    fontWeight: "800",
    color: Colors.error,
  },
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginTop: 4,
  },
  pickerBtnDisabled: {
    opacity: 0.5,
  },
  pickerBtnText: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  pickerBtnTextDisabled: {
    color: Colors.textTertiary,
  },
  allocationsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  allocationsTitle: {
    fontSize: FontSize.xs,
    fontWeight: "900",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  addRoomBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primarySoft,
  },
  addRoomBtnText: {
    fontSize: FontSize.xs,
    fontWeight: "800",
    color: Colors.primary,
  },
  noRoomsText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontStyle: "italic",
    marginVertical: Spacing.xs,
  },
  roomCard: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  roomCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 4,
    marginBottom: 4,
  },
  roomLabel: {
    fontSize: FontSize.xs,
    fontWeight: "800",
    color: Colors.textSecondary,
  },
  deleteRoomBtn: {
    padding: 2,
  },
  roomFieldLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  roomPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    gap: Spacing.xs,
  },
  roomPickerText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  quantityInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    fontSize: FontSize.sm,
    color: Colors.text,
    textAlign: "center",
  },
  customRoomField: {
    marginTop: 4,
  },
  customRoomInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
});
