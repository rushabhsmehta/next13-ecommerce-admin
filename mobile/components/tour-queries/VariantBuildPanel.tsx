import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/expo";
import {
  AdminPickerSheet,
  AdminQuickCreateModal,
  AdminSegmentedControl,
} from "@/components/admin";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { ApiError, withAuth } from "@/lib/api";
import { DEFAULT_OPS_IMAGE_URL } from "@/lib/ops-defaults";
import { createOperationsClient } from "@/lib/operations";
import { VARIANT_BUILD_TABS } from "./tab-config";
import type { VariantBuildTabId } from "./types";
import type {
  VariantBuildContext,
  VariantBuildDraft,
  VariantBuildUpdateInput,
  VariantComparisonItem,
  VariantRoomAllocationInput,
  VariantTransportDetailInput,
} from "@/lib/tour-query-pricing";
import {
  cloneVariantBuildDraft,
  copyFirstDayHotelToAllDays,
  copyFirstDayRoomsAndTransportToAllDays,
  createVariantBuildDraft,
  formatRoomAllocationLine,
  formatTransportLine,
  isHotelOverridden,
  resolveDraftHotelName,
} from "./variant-build-utils";
import { methodLabel } from "./variant-pricing/types";
import {
  formatDiscountLabel,
  hasAppliedVariantDiscount,
} from "@/lib/variant-pricing-discount";
import { extractPlainText } from "@/lib/rich-text";

function formatINR(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "Rs. 0";
  return `Rs. ${Math.round(n).toLocaleString("en-IN")}`;
}

/** Allow empty qty while editing; coerce to at least 1 only when persisting. */
function parseQuantityInput(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const parsed = Number.parseInt(trimmed.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatQuantityValue(quantity: number | undefined): string {
  if (quantity == null || quantity === 0) return "";
  return String(quantity);
}

function normalizeBuildDraftForSave(draft: VariantBuildDraft): VariantBuildDraft {
  const next = cloneVariantBuildDraft(draft);
  for (const itineraryId of Object.keys(next.roomsByItinerary)) {
    next.roomsByItinerary[itineraryId] = (next.roomsByItinerary[itineraryId] ?? []).map(
      (room) => ({
        ...room,
        quantity: Math.max(1, room.quantity ?? 1),
        extraBeds: (room.extraBeds ?? []).map((bed) => ({
          ...bed,
          quantity: Math.max(1, bed.quantity ?? 1),
        })),
      })
    );
  }
  for (const itineraryId of Object.keys(next.transportByItinerary)) {
    next.transportByItinerary[itineraryId] = (next.transportByItinerary[itineraryId] ?? []).map(
      (row) => ({
        ...row,
        quantity: Math.max(1, row.quantity ?? 1),
      })
    );
  }
  return next;
}

type RoomPickerField = "roomTypeId" | "occupancyTypeId" | "mealPlanId";

type BuildPickerState =
  | {
      type: "room";
      itineraryId: string;
      roomIndex: number;
      field: RoomPickerField;
    }
  | {
      type: "extraOccupancy";
      itineraryId: string;
      roomIndex: number;
      extraIndex: number;
    }
  | {
      type: "transport";
      itineraryId: string;
      transportIndex: number;
    }
  | {
      type: "hotel";
      itineraryId: string;
      locationId: string | null;
    }
  | { type: "copyVariant" };

function defaultRoom(build: VariantBuildContext): VariantRoomAllocationInput {
  return {
    roomTypeId: build.lookups.roomTypes[0]?.id || "",
    occupancyTypeId: build.lookups.occupancyTypes[0]?.id || "",
    mealPlanId: build.lookups.mealPlans[0]?.id || "",
    quantity: 1,
    customRoomType: "",
    useCustomRoomType: false,
    guestNames: "",
    voucherNumber: "",
    extraBeds: [],
  };
}

function defaultTransport(build: VariantBuildContext): VariantTransportDetailInput {
  return {
    vehicleTypeId: build.lookups.vehicleTypes[0]?.id || "",
    quantity: 1,
    description: "",
  };
}

export interface VariantBuildPanelProps {
  queryId: string;
  variant: VariantComparisonItem;
  variants: VariantComparisonItem[];
  build: VariantBuildContext;
  canWriteSales: boolean;
  onSaveBuild?: (
    variant: VariantComparisonItem,
    input: VariantBuildUpdateInput,
    scope: VariantBuildSaveScope
  ) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
  savingBuild?: boolean;
}

export type VariantBuildSaveScope = "hotels" | "rooms";

export function VariantBuildPanel({
  queryId,
  variant,
  variants,
  build,
  canWriteSales,
  onSaveBuild,
  onDirtyChange,
  savingBuild = false,
}: VariantBuildPanelProps) {
  const router = useRouter();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const authRequest = useMemo(() => withAuth(() => getTokenRef.current()), []);
  const opsClient = useMemo(() => createOperationsClient(authRequest), [authRequest]);

  const [activeTab, setActiveTab] = useState<VariantBuildTabId>("hotels");
  const [picker, setPicker] = useState<BuildPickerState | null>(null);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>(() => ({
    [build.itineraries[0]?.id ?? ""]: true,
  }));
  const [hotelsCache, setHotelsCache] = useState<
    Record<string, Array<{ id: string; name: string }>>
  >({});
  const [loadingHotelsFor, setLoadingHotelsFor] = useState<string | null>(null);
  const [showHotelCreate, setShowHotelCreate] = useState(false);
  const [showVehicleCreate, setShowVehicleCreate] = useState(false);
  const [creatingHotel, setCreatingHotel] = useState(false);
  const [creatingVehicle, setCreatingVehicle] = useState(false);
  const [localVehicleTypes, setLocalVehicleTypes] = useState<
    Array<{ id: string; name: string }>
  >([]);

  const persistedDraft = useMemo(
    () => createVariantBuildDraft(variant, build),
    [build, variant]
  );
  const [draft, setDraft] = useState<VariantBuildDraft>(() =>
    cloneVariantBuildDraft(persistedDraft)
  );

  useEffect(() => {
    setDraft(cloneVariantBuildDraft(persistedDraft));
  }, [persistedDraft]);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(persistedDraft),
    [draft, persistedDraft]
  );
  const hotelsDirty = useMemo(
    () => JSON.stringify(draft.hotelsByItinerary) !== JSON.stringify(persistedDraft.hotelsByItinerary),
    [draft.hotelsByItinerary, persistedDraft.hotelsByItinerary]
  );
  const roomsTransportDirty = useMemo(
    () =>
      JSON.stringify({
        roomsByItinerary: draft.roomsByItinerary,
        transportByItinerary: draft.transportByItinerary,
      }) !==
      JSON.stringify({
        roomsByItinerary: persistedDraft.roomsByItinerary,
        transportByItinerary: persistedDraft.transportByItinerary,
      }),
    [
      draft.roomsByItinerary,
      draft.transportByItinerary,
      persistedDraft.roomsByItinerary,
      persistedDraft.transportByItinerary,
    ]
  );

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(
    () => () => {
      onDirtyChange?.(false);
    },
    [onDirtyChange]
  );

  const loadHotelsForLocation = useCallback(
    async (locId: string) => {
      if (!locId || hotelsCache[locId]) return;
      setLoadingHotelsFor(locId);
      try {
        const response = await authRequest<{ items: { id: string; name: string }[] }>(
          `/api/mobile/operations/list?type=hotels&locationId=${encodeURIComponent(locId)}&limit=100`
        );
        setHotelsCache((prev) => ({
          ...prev,
          [locId]: response?.items || [],
        }));
      } catch (err) {
        console.log("Failed to load hotels for location", locId, err);
      } finally {
        setLoadingHotelsFor((current) => (current === locId ? null : current));
      }
    },
    [authRequest, hotelsCache]
  );

  useEffect(() => {
    const locationIds = Array.from(
      new Set(
        build.itineraries
          .map((itinerary) => itinerary.locationId)
          .filter((value): value is string => Boolean(value))
      )
    );
    for (const locationId of locationIds) {
      void loadHotelsForLocation(locationId);
    }
  }, [build.itineraries, loadHotelsForLocation]);

  const canEdit = canWriteSales && Boolean(onSaveBuild);
  const itineraryIds = useMemo(
    () => build.itineraries.map((itinerary) => itinerary.id),
    [build.itineraries]
  );

  const dayRows = useMemo(
    () =>
      build.itineraries.map((itinerary, index) => {
        const hotelId = draft.hotelsByItinerary[itinerary.id];
        const locationHotels = itinerary.locationId
          ? hotelsCache[itinerary.locationId]
          : undefined;
        return {
          ...itinerary,
          dayLabel: itinerary.dayNumber ?? index + 1,
          hotelId: hotelId ?? "",
          hotelName: resolveDraftHotelName(hotelId, {
            hotels: locationHotels,
            variant,
            build,
            itineraryId: itinerary.id,
            dayNumber: itinerary.dayNumber,
            fallbackHotel: itinerary.hotel,
          }),
          hotelModified: isHotelOverridden(variant, build, itinerary.id),
          rooms: draft.roomsByItinerary[itinerary.id] ?? [],
          transport: draft.transportByItinerary[itinerary.id] ?? [],
        };
      }),
    [build, draft, hotelsCache, variant]
  );

  const setRoomsForDay = (
    itineraryId: string,
    updater: (rows: VariantRoomAllocationInput[]) => VariantRoomAllocationInput[]
  ) => {
    setDraft((previous) => ({
      ...previous,
      roomsByItinerary: {
        ...previous.roomsByItinerary,
        [itineraryId]: updater(previous.roomsByItinerary[itineraryId] ?? []),
      },
    }));
  };

  const setTransportForDay = (
    itineraryId: string,
    updater: (rows: VariantTransportDetailInput[]) => VariantTransportDetailInput[]
  ) => {
    setDraft((previous) => ({
      ...previous,
      transportByItinerary: {
        ...previous.transportByItinerary,
        [itineraryId]: updater(previous.transportByItinerary[itineraryId] ?? []),
      },
    }));
  };

  const setHotelForDay = (itineraryId: string, hotelId: string) => {
    setDraft((previous) => ({
      ...previous,
      hotelsByItinerary: {
        ...previous.hotelsByItinerary,
        [itineraryId]: hotelId,
      },
    }));
  };

  const updateRoom = (
    itineraryId: string,
    roomIndex: number,
    updates: Partial<VariantRoomAllocationInput>
  ) => {
    setRoomsForDay(itineraryId, (rows) =>
      rows.map((room, index) => (index === roomIndex ? { ...room, ...updates } : room))
    );
  };

  const updateExtraOccupancy = (
    itineraryId: string,
    roomIndex: number,
    extraIndex: number,
    updates: Record<string, unknown>
  ) => {
    setRoomsForDay(itineraryId, (rows) =>
      rows.map((room, index) => {
        if (index !== roomIndex) return room;
        const extraBeds = [...(room.extraBeds ?? [])];
        extraBeds[extraIndex] = { ...extraBeds[extraIndex], ...updates };
        return { ...room, extraBeds };
      })
    );
  };

  const updateTransport = (
    itineraryId: string,
    transportIndex: number,
    updates: Partial<VariantTransportDetailInput>
  ) => {
    setTransportForDay(itineraryId, (rows) =>
      rows.map((transport, index) =>
        index === transportIndex ? { ...transport, ...updates } : transport
      )
    );
  };

  const confirmCopyDayOneHotel = () => {
    const firstId = itineraryIds[0];
    const firstHotel = firstId ? draft.hotelsByItinerary[firstId] ?? "" : "";
    if (!firstHotel) {
      Alert.alert("Nothing to copy", "Select a hotel on Day 1 first.");
      return;
    }
    Alert.alert(
      "Copy Day 1 hotel to all days?",
      "This replaces only the hotel selection on every day. Rooms and transport stay unchanged.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Copy",
          onPress: () => setDraft((previous) => copyFirstDayHotelToAllDays(previous, itineraryIds)),
        },
      ]
    );
  };

  const confirmCopyDayOneRoomsAndTransport = () => {
    const firstId = itineraryIds[0];
    const firstRooms = firstId ? draft.roomsByItinerary[firstId] ?? [] : [];
    const firstTransport = firstId ? draft.transportByItinerary[firstId] ?? [] : [];
    if (firstRooms.length === 0 && firstTransport.length === 0) {
      Alert.alert("Nothing to copy", "Add a room or transport entry to Day 1 first.");
      return;
    }
    Alert.alert(
      "Copy Day 1 rooms and transport?",
      "This replaces only room allocations and transport details on every day. Hotels stay unchanged.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Copy",
          onPress: () =>
            setDraft((previous) =>
              copyFirstDayRoomsAndTransportToAllDays(previous, itineraryIds)
            ),
        },
      ]
    );
  };

  const confirmCopyVariant = (sourceVariant: VariantComparisonItem) => {
    Alert.alert(
      "Copy variant details?",
      `Replace the current room allocations and transport details with "${sourceVariant.name}"? Hotels stay unchanged.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Copy",
          onPress: () =>
            setDraft((previous) => {
              const sourceDraft = createVariantBuildDraft(sourceVariant, build);
              return {
                ...previous,
                roomsByItinerary: sourceDraft.roomsByItinerary,
                transportByItinerary: sourceDraft.transportByItinerary,
              };
            }),
        },
      ]
    );
  };

  const openHotelPicker = (itineraryId: string, locationId: string | null) => {
    if (!canEdit) return;
    if (locationId) void loadHotelsForLocation(locationId);
    setPicker({ type: "hotel", itineraryId, locationId });
  };

  const pickerOptions = useMemo(() => {
    if (!picker) return [];
    if (picker.type === "copyVariant") {
      return variants
        .filter((item) => item.id !== variant.id)
        .map((item) => ({ id: item.id, label: item.name || "Unnamed variant" }));
    }
    if (picker.type === "hotel") {
      const hotels = picker.locationId ? hotelsCache[picker.locationId] ?? [] : [];
      return [
        { id: "", label: "-- No hotel selected --" },
        ...hotels.map((hotel) => ({ id: hotel.id, label: hotel.name })),
      ];
    }
    if (picker.type === "transport") {
      const base = build.lookups.vehicleTypes.map((item) => ({
        id: item.id,
        label: item.name,
      }));
      const extras = localVehicleTypes
        .filter((item) => !base.some((b) => b.id === item.id))
        .map((item) => ({ id: item.id, label: item.name }));
      return [...extras, ...base];
    }
    if (picker.type === "extraOccupancy") {
      return build.lookups.occupancyTypes.map((item) => ({ id: item.id, label: item.name }));
    }
    if (picker.field === "roomTypeId") {
      return build.lookups.roomTypes.map((item) => ({ id: item.id, label: item.name }));
    }
    if (picker.field === "occupancyTypeId") {
      return build.lookups.occupancyTypes.map((item) => ({ id: item.id, label: item.name }));
    }
    return build.lookups.mealPlans.map((item) => ({ id: item.id, label: item.name }));
  }, [build.lookups, hotelsCache, localVehicleTypes, picker, variant.id, variants]);

  const pickerTitle = useMemo(() => {
    if (!picker) return "";
    if (picker.type === "copyVariant") return "Copy Details From Variant";
    if (picker.type === "hotel") return "Select Hotel";
    if (picker.type === "transport") return "Select Vehicle Type";
    if (picker.type === "extraOccupancy") return "Select Additional Occupancy";
    if (picker.field === "roomTypeId") return "Select Room Type";
    if (picker.field === "occupancyTypeId") return "Select Occupancy";
    return "Select Meal Plan";
  }, [picker]);

  const pickerSelectedId = useMemo(() => {
    if (!picker || picker.type === "copyVariant") return undefined;
    if (picker.type === "hotel") {
      return draft.hotelsByItinerary[picker.itineraryId] ?? "";
    }
    if (picker.type === "transport") {
      return draft.transportByItinerary[picker.itineraryId]?.[picker.transportIndex]
        ?.vehicleTypeId as string | undefined;
    }
    const room = draft.roomsByItinerary[picker.itineraryId]?.[picker.roomIndex];
    if (picker.type === "extraOccupancy") {
      return room?.extraBeds?.[picker.extraIndex]?.occupancyTypeId as string | undefined;
    }
    return room?.[picker.field] as string | undefined;
  }, [draft, picker]);

  const handlePickerSelect = (option: { id: string; label: string }) => {
    if (!picker) return;
    if (picker.type === "copyVariant") {
      const source = variants.find((item) => item.id === option.id);
      if (source) confirmCopyVariant(source);
      return;
    }
    if (picker.type === "hotel") {
      setHotelForDay(picker.itineraryId, option.id);
      return;
    }
    if (picker.type === "transport") {
      updateTransport(picker.itineraryId, picker.transportIndex, {
        vehicleTypeId: option.id,
      });
      return;
    }
    if (picker.type === "extraOccupancy") {
      updateExtraOccupancy(picker.itineraryId, picker.roomIndex, picker.extraIndex, {
        occupancyTypeId: option.id,
      });
      return;
    }
    updateRoom(picker.itineraryId, picker.roomIndex, { [picker.field]: option.id });
  };

  const resetHotels = () => {
    setDraft((previous) => ({
      ...previous,
      hotelsByItinerary: cloneVariantBuildDraft(persistedDraft).hotelsByItinerary,
    }));
  };

  const resetRoomsAndTransport = () => {
    const persisted = cloneVariantBuildDraft(persistedDraft);
    setDraft((previous) => ({
      ...previous,
      roomsByItinerary: persisted.roomsByItinerary,
      transportByItinerary: persisted.transportByItinerary,
    }));
  };

  const saveBuild = (scope: VariantBuildSaveScope) => {
    const scopeDirty = scope === "hotels" ? hotelsDirty : roomsTransportDirty;
    if (!onSaveBuild || savingBuild || !scopeDirty) return;
    const normalized = normalizeBuildDraftForSave(draft);
    const input: VariantBuildUpdateInput =
      scope === "hotels"
        ? { hotelsByItinerary: normalized.hotelsByItinerary }
        : {
            roomsByItinerary: normalized.roomsByItinerary,
            transportByItinerary: normalized.transportByItinerary,
          };
    void onSaveBuild(variant, input, scope);
  };

  return (
    <View style={styles.wrap} testID={`variant-build-${variant.id}`}>
      <AdminSegmentedControl
        options={VARIANT_BUILD_TABS.map((tab) => ({ id: tab.id, label: tab.label }))}
        value={activeTab}
        onChange={setActiveTab}
        testIDPrefix={`variant-build-${variant.id}`}
        scrollable
      />

      {activeTab === "hotels" ? (
        <View style={styles.panel} testID={`variant-build-hotels-${variant.id}`}>
          {dayRows.length === 0 ? (
            <Text style={styles.empty}>Add itinerary days on the Itinerary tab first.</Text>
          ) : (
            <>
              {canEdit ? (
                <View style={styles.copyBar}>
                  <Pressable
                    testID={`variant-build-copy-day-one-hotels-${variant.id}`}
                    accessibilityRole="button"
                    accessibilityLabel="Copy Day 1 hotel to all days"
                    style={styles.copyBtn}
                    disabled={savingBuild}
                    onPress={confirmCopyDayOneHotel}
                  >
                    <Ionicons name="copy-outline" size={14} color={Colors.primary} />
                    <Text style={styles.copyBtnText}>Copy Day 1 Hotel</Text>
                  </Pressable>
                </View>
              ) : null}
              {dayRows.map((day) => (
                <View key={day.id} style={styles.dayCard}>
                  <View style={styles.hotelCardHead}>
                    <View style={styles.nightBadge}>
                      <Text style={styles.nightBadgeText}>Night {day.dayLabel}</Text>
                    </View>
                    <View style={styles.hotelBadgeRow}>
                      {day.hotelModified ? (
                        <View style={styles.modifiedBadge}>
                          <Text style={styles.modifiedBadgeText}>Modified</Text>
                        </View>
                      ) : null}
                      {day.rooms.length > 0 || day.transport.length > 0 ? (
                        <Text style={styles.muted}>
                          {day.rooms.length} room{day.rooms.length === 1 ? "" : "s"}
                          {day.transport.length > 0
                            ? ` · ${day.transport.length} transport`
                            : ""}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  {canEdit ? (
                    <Pressable
                      testID={`variant-build-hotel-picker-${variant.id}-${day.id}`}
                      accessibilityRole="button"
                      accessibilityLabel={`Select hotel for night ${day.dayLabel}: ${day.hotelName}`}
                      accessibilityHint="Opens hotel picker for this night"
                      style={[styles.fieldBox, savingBuild ? styles.readOnlyField : null]}
                      disabled={savingBuild}
                      onPress={() => openHotelPicker(day.id, day.locationId)}
                    >
                      <Text style={styles.fieldLabel}>Hotel</Text>
                      <Text style={styles.fieldValue} numberOfLines={2}>
                        {day.locationId && loadingHotelsFor === day.locationId
                          ? "Loading hotels…"
                          : day.hotelName}
                      </Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.hotelName} numberOfLines={2}>
                      {day.hotelName}
                    </Text>
                  )}
                  {day.itineraryTitle ? (
                    <Text style={styles.muted} numberOfLines={2}>
                      {extractPlainText(day.itineraryTitle)}
                    </Text>
                  ) : null}
                </View>
              ))}
              {canEdit ? (
                <View style={styles.saveBar}>
                  <Pressable
                    testID={`variant-build-hotels-reset-${variant.id}`}
                    accessibilityRole="button"
                    accessibilityLabel="Reset hotel edits"
                    style={[styles.saveBtn, styles.resetBtn, !hotelsDirty ? styles.disabledBtn : null]}
                    disabled={savingBuild || !hotelsDirty}
                    onPress={resetHotels}
                  >
                    <Text style={styles.resetBtnText}>Reset</Text>
                  </Pressable>
                  <Pressable
                    testID={`variant-build-hotels-save-${variant.id}`}
                    accessibilityRole="button"
                    accessibilityLabel="Save hotel overrides"
                    style={[
                      styles.saveBtn,
                      styles.primarySaveBtn,
                      !hotelsDirty || savingBuild ? styles.disabledBtn : null,
                    ]}
                    disabled={!hotelsDirty || savingBuild}
                    onPress={() => saveBuild("hotels")}
                  >
                    <Ionicons name="save-outline" size={15} color="#fff" />
                    <Text style={styles.primarySaveText}>
                      {savingBuild ? "Saving..." : "Save Hotels"}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          )}
        </View>
      ) : null}

      {activeTab === "rooms" ? (
        <View style={styles.panel} testID={`variant-build-rooms-${variant.id}`}>
          {dayRows.length === 0 ? (
            <Text style={styles.empty}>No itinerary days configured.</Text>
          ) : (
            <>
              {canEdit ? (
                <View style={styles.copyBar}>
                  <Pressable
                    testID={`variant-build-copy-day-one-${variant.id}`}
                    accessibilityRole="button"
                    accessibilityLabel="Copy Day 1 rooms and transport to all days"
                    style={styles.copyBtn}
                    disabled={savingBuild}
                    onPress={confirmCopyDayOneRoomsAndTransport}
                  >
                    <Ionicons name="copy-outline" size={14} color={Colors.primary} />
                    <Text style={styles.copyBtnText}>Copy Day 1 Rooms + Transport</Text>
                  </Pressable>
                  <Pressable
                    testID={`variant-build-copy-variant-${variant.id}`}
                    accessibilityRole="button"
                    accessibilityLabel="Copy rooms and transport from another variant"
                    style={[styles.copyBtn, variants.length < 2 ? styles.disabledBtn : null]}
                    disabled={savingBuild || variants.length < 2}
                    onPress={() => setPicker({ type: "copyVariant" })}
                  >
                    <Ionicons name="layers-outline" size={14} color={Colors.primary} />
                    <Text style={styles.copyBtnText}>Copy Variant</Text>
                  </Pressable>
                </View>
              ) : null}

              {dayRows.map((day) => {
                const expanded = Boolean(expandedDays[day.id]);
                return (
                  <View key={day.id} style={styles.dayCard}>
                    <Pressable
                      testID={`variant-build-day-toggle-${variant.id}-${day.id}`}
                      accessibilityRole="button"
                      accessibilityLabel={`${expanded ? "Collapse" : "Expand"} Day ${day.dayLabel}`}
                      accessibilityState={{ expanded }}
                      style={styles.dayToggle}
                      onPress={() =>
                        setExpandedDays((previous) => ({
                          ...previous,
                          [day.id]: !previous[day.id],
                        }))
                      }
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.dayTitle}>Day {day.dayLabel}</Text>
                        <Text style={styles.muted}>
                          {day.rooms.length} room{day.rooms.length === 1 ? "" : "s"} ·{" "}
                          {day.transport.length} transport
                        </Text>
                      </View>
                      <Ionicons
                        name={expanded ? "chevron-up" : "chevron-down"}
                        size={18}
                        color={Colors.textSecondary}
                      />
                    </Pressable>

                    {expanded ? (
                      <View style={styles.dayBody}>
                        <View style={styles.sectionHeader}>
                          <Text style={styles.sectionTitle}>Room Allocations</Text>
                          {canEdit ? (
                            <Pressable
                              testID={`variant-build-add-room-${variant.id}-${day.id}`}
                              accessibilityRole="button"
                              accessibilityLabel={`Add room allocation for day ${day.dayLabel}`}
                              style={styles.smallBtn}
                              disabled={savingBuild}
                              onPress={() =>
                                setRoomsForDay(day.id, (rows) => [...rows, defaultRoom(build)])
                              }
                            >
                              <Ionicons name="add" size={14} color={Colors.primary} />
                              <Text style={styles.smallBtnText}>Add Room</Text>
                            </Pressable>
                          ) : null}
                        </View>

                        {day.rooms.length === 0 ? (
                          <Text style={styles.muted}>No room allocations</Text>
                        ) : (
                          day.rooms.map((room, roomIndex) => {
                            const roomTypeLabel =
                              build.lookups.roomTypes.find((item) => item.id === room.roomTypeId)
                                ?.name || "Select room type";
                            const occupancyLabel =
                              build.lookups.occupancyTypes.find(
                                (item) => item.id === room.occupancyTypeId
                              )?.name || "Select occupancy";
                            const mealPlanLabel =
                              build.lookups.mealPlans.find((item) => item.id === room.mealPlanId)
                                ?.name || "Select meal plan";

                            return (
                              <View
                                key={`${day.id}-room-${roomIndex}`}
                                style={styles.editorCard}
                                testID={`variant-build-room-${variant.id}-${day.id}-${roomIndex}`}
                              >
                                <View style={styles.editorHeader}>
                                  <Text style={styles.editorTitle}>Room {roomIndex + 1}</Text>
                                  {canEdit ? (
                                    <Pressable
                                      testID={`variant-build-delete-room-${variant.id}-${day.id}-${roomIndex}`}
                                      accessibilityRole="button"
                                      accessibilityLabel={`Delete room ${roomIndex + 1}`}
                                      style={styles.deleteBtn}
                                      disabled={savingBuild}
                                      onPress={() =>
                                        setRoomsForDay(day.id, (rows) =>
                                          rows.filter((_, index) => index !== roomIndex)
                                        )
                                      }
                                    >
                                      <Ionicons name="trash-outline" size={14} color={Colors.error} />
                                    </Pressable>
                                  ) : null}
                                </View>

                                <View style={styles.toggleRow}>
                                  <View style={{ flex: 1 }}>
                                    <Text style={styles.fieldLabel}>Custom Room Type</Text>
                                    <Text style={styles.fieldHint}>
                                      Use a custom room name instead of a saved room type.
                                    </Text>
                                  </View>
                                  <Switch
                                    testID={`variant-build-custom-room-toggle-${variant.id}-${day.id}-${roomIndex}`}
                                    accessibilityLabel={`Use custom room type for room ${roomIndex + 1}`}
                                    value={Boolean(room.useCustomRoomType)}
                                    disabled={!canEdit || savingBuild}
                                    onValueChange={(value) =>
                                      updateRoom(day.id, roomIndex, {
                                        useCustomRoomType: value,
                                        ...(!value ? { customRoomType: "" } : {}),
                                      })
                                    }
                                    trackColor={{
                                      false: Colors.borderSubtle,
                                      true: Colors.primaryLight,
                                    }}
                                    thumbColor={room.useCustomRoomType ? Colors.primary : Colors.surface}
                                  />
                                </View>

                                {room.useCustomRoomType ? (
                                  <LabeledInput
                                    label="Custom Room Name"
                                    testID={`variant-build-custom-room-${variant.id}-${day.id}-${roomIndex}`}
                                    value={typeof room.customRoomType === "string" ? room.customRoomType : ""}
                                    editable={canEdit && !savingBuild}
                                    onChangeText={(text) =>
                                      updateRoom(day.id, roomIndex, { customRoomType: text })
                                    }
                                    placeholder="e.g. Family Suite"
                                  />
                                ) : (
                                  <PickerButton
                                    label="Room Type"
                                    value={roomTypeLabel}
                                    testID={`variant-build-room-type-${variant.id}-${day.id}-${roomIndex}`}
                                    disabled={!canEdit || savingBuild}
                                    onPress={() =>
                                      setPicker({
                                        type: "room",
                                        itineraryId: day.id,
                                        roomIndex,
                                        field: "roomTypeId",
                                      })
                                    }
                                  />
                                )}

                                <View style={styles.twoCol}>
                                  <PickerButton
                                    label="Occupancy"
                                    value={occupancyLabel}
                                    testID={`variant-build-occupancy-${variant.id}-${day.id}-${roomIndex}`}
                                    disabled={!canEdit || savingBuild}
                                    onPress={() =>
                                      setPicker({
                                        type: "room",
                                        itineraryId: day.id,
                                        roomIndex,
                                        field: "occupancyTypeId",
                                      })
                                    }
                                  />
                                  <LabeledInput
                                    label="Qty"
                                    testID={`variant-build-room-qty-${variant.id}-${day.id}-${roomIndex}`}
                                    value={formatQuantityValue(room.quantity)}
                                    editable={canEdit && !savingBuild}
                                    keyboardType="number-pad"
                                    onChangeText={(text) =>
                                      updateRoom(day.id, roomIndex, {
                                        quantity: parseQuantityInput(text),
                                      })
                                    }
                                  />
                                </View>

                                <PickerButton
                                  label="Meal Plan"
                                  value={mealPlanLabel}
                                  testID={`variant-build-meal-plan-${variant.id}-${day.id}-${roomIndex}`}
                                  disabled={!canEdit || savingBuild}
                                  onPress={() =>
                                    setPicker({
                                      type: "room",
                                      itineraryId: day.id,
                                      roomIndex,
                                      field: "mealPlanId",
                                    })
                                  }
                                />

                                <View style={styles.extraSection}>
                                  <View style={styles.sectionHeader}>
                                    <Text style={styles.extraTitle}>Additional Occupancies</Text>
                                    {canEdit ? (
                                      <Pressable
                                        testID={`variant-build-add-extra-${variant.id}-${day.id}-${roomIndex}`}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Add additional occupancy to room ${roomIndex + 1}`}
                                        style={styles.extraAddBtn}
                                        disabled={savingBuild}
                                        onPress={() =>
                                          updateRoom(day.id, roomIndex, {
                                            extraBeds: [
                                              ...(room.extraBeds ?? []),
                                              {
                                                occupancyTypeId:
                                                  build.lookups.occupancyTypes[0]?.id || "",
                                                quantity: 1,
                                              },
                                            ],
                                          })
                                        }
                                      >
                                        <Text style={styles.extraAddText}>+ Add Occupancy</Text>
                                      </Pressable>
                                    ) : null}
                                  </View>
                                  {(room.extraBeds ?? []).length === 0 ? (
                                    <Text style={styles.fieldHint}>
                                      Add child beds, extra mattresses, or other occupancies.
                                    </Text>
                                  ) : (
                                    (room.extraBeds ?? []).map((extra, extraIndex) => {
                                      const extraLabel =
                                        build.lookups.occupancyTypes.find(
                                          (item) => item.id === extra.occupancyTypeId
                                        )?.name || "Select occupancy";
                                      return (
                                        <View
                                          key={`${day.id}-room-${roomIndex}-extra-${extraIndex}`}
                                          style={styles.extraRow}
                                        >
                                          <PickerButton
                                            label="Occupancy"
                                            value={extraLabel}
                                            testID={`variant-build-extra-occupancy-${variant.id}-${day.id}-${roomIndex}-${extraIndex}`}
                                            disabled={!canEdit || savingBuild}
                                            onPress={() =>
                                              setPicker({
                                                type: "extraOccupancy",
                                                itineraryId: day.id,
                                                roomIndex,
                                                extraIndex,
                                              })
                                            }
                                          />
                                          <LabeledInput
                                            label="Qty"
                                            testID={`variant-build-extra-qty-${variant.id}-${day.id}-${roomIndex}-${extraIndex}`}
                                            value={formatQuantityValue(extra.quantity)}
                                            editable={canEdit && !savingBuild}
                                            keyboardType="number-pad"
                                            onChangeText={(text) =>
                                              updateExtraOccupancy(
                                                day.id,
                                                roomIndex,
                                                extraIndex,
                                                { quantity: parseQuantityInput(text) }
                                              )
                                            }
                                          />
                                          {canEdit ? (
                                            <Pressable
                                              testID={`variant-build-delete-extra-${variant.id}-${day.id}-${roomIndex}-${extraIndex}`}
                                              accessibilityRole="button"
                                              accessibilityLabel={`Delete additional occupancy ${extraIndex + 1}`}
                                              style={styles.deleteBtn}
                                              disabled={savingBuild}
                                              onPress={() =>
                                                updateRoom(day.id, roomIndex, {
                                                  extraBeds: (room.extraBeds ?? []).filter(
                                                    (_, index) => index !== extraIndex
                                                  ),
                                                })
                                              }
                                            >
                                              <Ionicons
                                                name="trash-outline"
                                                size={14}
                                                color={Colors.error}
                                              />
                                            </Pressable>
                                          ) : null}
                                        </View>
                                      );
                                    })
                                  )}
                                </View>

                                <LabeledInput
                                  label="Guest Names"
                                  testID={`variant-build-guest-names-${variant.id}-${day.id}-${roomIndex}`}
                                  value={typeof room.guestNames === "string" ? room.guestNames : ""}
                                  editable={canEdit && !savingBuild}
                                  onChangeText={(text) =>
                                    updateRoom(day.id, roomIndex, { guestNames: text })
                                  }
                                  placeholder="Optional"
                                />
                                <LabeledInput
                                  label="Voucher Number"
                                  testID={`variant-build-voucher-number-${variant.id}-${day.id}-${roomIndex}`}
                                  value={
                                    typeof room.voucherNumber === "string" ? room.voucherNumber : ""
                                  }
                                  editable={canEdit && !savingBuild}
                                  onChangeText={(text) =>
                                    updateRoom(day.id, roomIndex, { voucherNumber: text })
                                  }
                                  placeholder="Optional booking confirmation"
                                />
                                <Text style={styles.previewLine}>
                                  {formatRoomAllocationLine(
                                    room as Record<string, unknown>,
                                    build
                                  )}
                                </Text>
                              </View>
                            );
                          })
                        )}

                        <View style={styles.sectionDivider} />
                        <View style={styles.sectionHeader}>
                          <Text style={styles.sectionTitle}>Transport Details</Text>
                          {canEdit ? (
                            <Pressable
                              testID={`variant-build-add-transport-${variant.id}-${day.id}`}
                              accessibilityRole="button"
                              accessibilityLabel={`Add transport for day ${day.dayLabel}`}
                              style={styles.smallBtn}
                              disabled={savingBuild}
                              onPress={() =>
                                setTransportForDay(day.id, (rows) => [
                                  ...rows,
                                  defaultTransport(build),
                                ])
                              }
                            >
                              <Ionicons name="add" size={14} color={Colors.primary} />
                              <Text style={styles.smallBtnText}>Add Transport</Text>
                            </Pressable>
                          ) : null}
                        </View>

                        {day.transport.length === 0 ? (
                          <Text style={styles.muted}>No transport details</Text>
                        ) : (
                          day.transport.map((transport, transportIndex) => {
                            const vehicleLabel =
                              build.lookups.vehicleTypes.find(
                                (item) => item.id === transport.vehicleTypeId
                              )?.name || "Select vehicle type";
                            return (
                              <View
                                key={`${day.id}-transport-${transportIndex}`}
                                style={styles.editorCard}
                                testID={`variant-build-transport-${variant.id}-${day.id}-${transportIndex}`}
                              >
                                <View style={styles.editorHeader}>
                                  <Text style={styles.editorTitle}>
                                    Transport {transportIndex + 1}
                                  </Text>
                                  {canEdit ? (
                                    <Pressable
                                      testID={`variant-build-delete-transport-${variant.id}-${day.id}-${transportIndex}`}
                                      accessibilityRole="button"
                                      accessibilityLabel={`Delete transport ${transportIndex + 1}`}
                                      style={styles.deleteBtn}
                                      disabled={savingBuild}
                                      onPress={() =>
                                        setTransportForDay(day.id, (rows) =>
                                          rows.filter((_, index) => index !== transportIndex)
                                        )
                                      }
                                    >
                                      <Ionicons name="trash-outline" size={14} color={Colors.error} />
                                    </Pressable>
                                  ) : null}
                                </View>
                                <View style={styles.twoCol}>
                                  <PickerButton
                                    label="Vehicle Type"
                                    value={vehicleLabel}
                                    testID={`variant-build-vehicle-type-${variant.id}-${day.id}-${transportIndex}`}
                                    disabled={!canEdit || savingBuild}
                                    onPress={() =>
                                      setPicker({
                                        type: "transport",
                                        itineraryId: day.id,
                                        transportIndex,
                                      })
                                    }
                                  />
                                  <LabeledInput
                                    label="Qty"
                                    testID={`variant-build-transport-qty-${variant.id}-${day.id}-${transportIndex}`}
                                    value={formatQuantityValue(transport.quantity)}
                                    editable={canEdit && !savingBuild}
                                    keyboardType="number-pad"
                                    onChangeText={(text) =>
                                      updateTransport(day.id, transportIndex, {
                                        quantity: parseQuantityInput(text),
                                      })
                                    }
                                  />
                                </View>
                                <LabeledInput
                                  label="Description"
                                  testID={`variant-build-transport-description-${variant.id}-${day.id}-${transportIndex}`}
                                  value={
                                    typeof transport.description === "string"
                                      ? transport.description
                                      : ""
                                  }
                                  editable={canEdit && !savingBuild}
                                  onChangeText={(text) =>
                                    updateTransport(day.id, transportIndex, {
                                      description: text,
                                    })
                                  }
                                  placeholder="Optional"
                                />
                                <Text style={styles.previewLine}>
                                  {formatTransportLine(
                                    transport as Record<string, unknown>,
                                    build
                                  )}
                                </Text>
                              </View>
                            );
                          })
                        )}
                      </View>
                    ) : null}
                  </View>
                );
              })}

              {canEdit ? (
                <View style={styles.saveBar}>
                  <Pressable
                    testID={`variant-build-reset-${variant.id}`}
                    accessibilityRole="button"
                    accessibilityLabel="Reset room and transport edits"
                    style={[
                      styles.saveBtn,
                      styles.resetBtn,
                      !roomsTransportDirty ? styles.disabledBtn : null,
                    ]}
                    disabled={savingBuild || !roomsTransportDirty}
                    onPress={resetRoomsAndTransport}
                  >
                    <Text style={styles.resetBtnText}>Reset</Text>
                  </Pressable>
                  <Pressable
                    testID={`variant-build-rooms-save-${variant.id}`}
                    accessibilityRole="button"
                    accessibilityLabel="Save room allocations and transport details"
                    style={[
                      styles.saveBtn,
                      styles.primarySaveBtn,
                      !roomsTransportDirty || savingBuild ? styles.disabledBtn : null,
                    ]}
                    disabled={!roomsTransportDirty || savingBuild}
                    onPress={() => saveBuild("rooms")}
                  >
                    <Ionicons name="save-outline" size={15} color="#fff" />
                    <Text style={styles.primarySaveText}>
                      {savingBuild ? "Saving..." : "Save Rooms & Transport"}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          )}
        </View>
      ) : null}

      {activeTab === "pricing" ? (
        <View style={styles.panel} testID={`variant-build-pricing-${variant.id}`}>
          {variant.pricing ? (
            <>
              <Text style={styles.total}>{formatINR(variant.pricing.totalCost)}</Text>
              <Text style={styles.muted}>
                {methodLabel(variant.pricing.calculationMethod)} · Base{" "}
                {formatINR(variant.pricing.basePrice)} · Markup{" "}
                {formatINR(variant.pricing.markupAmount)} ({variant.pricing.markupPercentage}%)
              </Text>
              {hasAppliedVariantDiscount(variant.pricing.appliedDiscount) ? (
                <Text style={styles.discountHint}>
                  {formatDiscountLabel(variant.pricing.appliedDiscount)} — saves{" "}
                  {formatINR(variant.pricing.discountAmount ?? variant.pricing.appliedDiscount?.amount)}
                </Text>
              ) : null}
              <View style={styles.split}>
                <Text style={styles.splitItem}>
                  Stay {formatINR(variant.pricing.accommodation)}
                </Text>
                <Text style={styles.splitItem}>
                  Transport {formatINR(variant.pricing.transport)}
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.empty}>Pricing not computed for this variant yet.</Text>
          )}
          {dayRows.some((day) => day.transport.length > 0) ? (
            <View style={styles.transportPreview}>
              {dayRows.map((day) =>
                day.transport.map((row, index) => (
                  <Text key={`${day.id}-transport-${index}`} style={styles.bullet}>
                    Day {day.dayLabel}: {formatTransportLine(row as Record<string, unknown>, build)}
                  </Text>
                ))
              )}
            </View>
          ) : null}
          {canWriteSales ? (
            <Pressable
              testID={`variant-build-pricing-edit-${variant.id}`}
              accessibilityRole="button"
              accessibilityLabel="Edit variant pricing"
              style={styles.editBtn}
              onPress={() =>
                router.push(
                  `/admin/tour-queries/${queryId}/variants/${variant.id}/pricing` as never
                )
              }
            >
              <Ionicons name="calculator-outline" size={15} color={Colors.primary} />
              <Text style={styles.editBtnText}>
                {variant.pricing ? "Edit pricing" : "Add pricing"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {picker ? (
        <AdminPickerSheet
          visible
          title={pickerTitle}
          options={pickerOptions}
          selectedId={pickerSelectedId}
          testID={`variant-build-picker-${variant.id}`}
          onSelect={handlePickerSelect}
          onClose={() => setPicker(null)}
          footerAction={
            picker.type === "hotel"
              ? {
                  label: "Add hotel",
                  testID: `variant-build-hotel-add-${variant.id}`,
                  disabled: !picker.locationId,
                  onPress: () => setShowHotelCreate(true),
                }
              : picker.type === "transport"
                ? {
                    label: "Add vehicle type",
                    testID: `variant-build-vehicle-add-${variant.id}`,
                    onPress: () => setShowVehicleCreate(true),
                  }
                : undefined
          }
        />
      ) : null}

      <AdminQuickCreateModal
        visible={showHotelCreate}
        title="Add hotel"
        hint="Creates a hotel for this day location and selects it."
        fields={[
          {
            key: "name",
            label: "Hotel name",
            placeholder: "e.g. Taj Exotica",
            required: true,
            autoCapitalize: "words",
            maxLength: 200,
          },
        ]}
        submitLabel="Create hotel"
        loading={creatingHotel}
        onClose={() => setShowHotelCreate(false)}
        onSubmit={async (values) => {
          const hotelName = values.name?.trim();
          const locId =
            picker?.type === "hotel" ? picker.locationId : null;
          const itineraryId =
            picker?.type === "hotel" ? picker.itineraryId : null;
          if (!hotelName || !locId || !itineraryId) return;
          setCreatingHotel(true);
          try {
            const saved = await opsClient.createHotel({
              name: hotelName,
              locationId: locId,
              images: [{ url: DEFAULT_OPS_IMAGE_URL }],
            });
            setHotelsCache((prev) => ({
              ...prev,
              [locId]: [
                { id: saved.id, name: saved.name },
                ...(prev[locId] ?? []).filter((h) => h.id !== saved.id),
              ],
            }));
            setHotelForDay(itineraryId, saved.id);
            setShowHotelCreate(false);
            setPicker(null);
          } catch (err) {
            Alert.alert(
              "Create failed",
              err instanceof ApiError ? err.message : "Could not create the hotel."
            );
          } finally {
            setCreatingHotel(false);
          }
        }}
        testID={`variant-build-hotel-quick-create-${variant.id}`}
      />

      <AdminQuickCreateModal
        visible={showVehicleCreate}
        title="Add vehicle type"
        fields={[
          {
            key: "name",
            label: "Vehicle type name",
            placeholder: "e.g. Innova Crysta",
            required: true,
            autoCapitalize: "words",
            maxLength: 200,
          },
        ]}
        submitLabel="Create vehicle type"
        loading={creatingVehicle}
        onClose={() => setShowVehicleCreate(false)}
        onSubmit={async (values) => {
          const vehicleName = values.name?.trim();
          if (!vehicleName || picker?.type !== "transport") return;
          setCreatingVehicle(true);
          try {
            const saved = await opsClient.createVehicleType({ name: vehicleName });
            setLocalVehicleTypes((prev) => {
              if (prev.some((v) => v.id === saved.id)) return prev;
              return [{ id: saved.id, name: saved.name }, ...prev];
            });
            updateTransport(picker.itineraryId, picker.transportIndex, {
              vehicleTypeId: saved.id,
            });
            setShowVehicleCreate(false);
            setPicker(null);
          } catch (err) {
            Alert.alert(
              "Create failed",
              err instanceof ApiError
                ? err.message
                : "Could not create the vehicle type."
            );
          } finally {
            setCreatingVehicle(false);
          }
        }}
        testID={`variant-build-vehicle-quick-create-${variant.id}`}
      />
    </View>
  );
}

function PickerButton({
  label,
  value,
  testID,
  disabled,
  onPress,
}: {
  label: string;
  value: string;
  testID: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      style={[styles.fieldBox, disabled ? styles.readOnlyField : null]}
      disabled={disabled}
      onPress={onPress}
    >
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue} numberOfLines={1}>
        {value}
      </Text>
    </Pressable>
  );
}

function LabeledInput({
  label,
  testID,
  value,
  editable,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  testID: string;
  value: string;
  editable: boolean;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "number-pad";
}) {
  return (
    <View style={[styles.fieldBox, !editable ? styles.readOnlyField : null]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        testID={testID}
        accessibilityLabel={label}
        style={styles.fieldInput}
        value={value}
        editable={editable}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textTertiary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.sm },
  panel: { gap: Spacing.sm },
  dayCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  dayToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  dayBody: { gap: Spacing.sm },
  dayTitle: { fontSize: FontSize.sm, fontWeight: "800", color: Colors.text },
  hotelCardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  hotelBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    flexShrink: 1,
  },
  modifiedBadge: {
    backgroundColor: "#FEF3C7",
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  modifiedBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: "800",
    color: Colors.warning,
  },
  nightBadge: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  nightBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: "800",
    color: Colors.textInverse,
  },
  hotelName: {
    fontSize: FontSize.md,
    fontWeight: "800",
    color: Colors.text,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  sectionTitle: { fontSize: FontSize.sm, fontWeight: "900", color: Colors.text },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.borderSubtle,
    marginVertical: Spacing.xs,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowText: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: "600" },
  bullet: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: "600" },
  muted: { fontSize: FontSize.sm, color: Colors.textTertiary, fontWeight: "600" },
  discountHint: {
    fontSize: FontSize.xs,
    color: Colors.success,
    fontWeight: "800",
  },
  empty: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: "600",
    paddingVertical: Spacing.sm,
  },
  total: { fontSize: FontSize.xl, fontWeight: "900", color: Colors.text },
  split: { flexDirection: "row", gap: Spacing.md },
  splitItem: { fontSize: FontSize.sm, fontWeight: "700", color: Colors.textSecondary },
  copyBar: { flexDirection: "row", gap: Spacing.sm },
  copyBtn: {
    flex: 1,
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primaryBg,
  },
  copyBtnText: { fontSize: FontSize.xs, fontWeight: "900", color: Colors.primary },
  smallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
  },
  smallBtnText: { fontSize: FontSize.xs, fontWeight: "900", color: Colors.primary },
  editorCard: {
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.background,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  editorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  editorTitle: { fontSize: FontSize.xs, fontWeight: "900", color: Colors.textSecondary },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fee2e2",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
    padding: Spacing.sm,
  },
  twoCol: { flexDirection: "row", gap: Spacing.sm },
  fieldBox: {
    flex: 1,
    minHeight: 54,
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
    justifyContent: "center",
    minWidth: 0,
  },
  readOnlyField: { backgroundColor: Colors.surfaceAlt },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: Colors.textTertiary,
    textTransform: "uppercase",
  },
  fieldHint: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: "600",
    color: Colors.textTertiary,
    lineHeight: 14,
  },
  fieldValue: {
    marginTop: 3,
    fontSize: FontSize.sm,
    fontWeight: "800",
    color: Colors.text,
  },
  fieldInput: {
    marginTop: 2,
    paddingVertical: 0,
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.text,
  },
  extraSection: {
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#fcd34d",
    backgroundColor: "#fffbeb",
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  extraTitle: { fontSize: FontSize.xs, fontWeight: "900", color: "#92400e" },
  extraAddBtn: {
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#f59e0b",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
  },
  extraAddText: { fontSize: 10, fontWeight: "900", color: "#92400e" },
  extraRow: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  previewLine: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  saveBar: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  saveBtn: {
    minHeight: 44,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  resetBtn: {
    flex: 0.6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
  },
  resetBtnText: { fontSize: FontSize.sm, fontWeight: "900", color: Colors.textSecondary },
  primarySaveBtn: { flex: 1, backgroundColor: Colors.primary },
  primarySaveText: { fontSize: FontSize.xs, fontWeight: "900", color: "#fff" },
  disabledBtn: { opacity: 0.5 },
  transportPreview: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderSubtle,
    paddingTop: Spacing.sm,
    gap: 4,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primaryBg,
  },
  editBtnText: { fontSize: FontSize.sm, fontWeight: "800", color: Colors.primary },
});
