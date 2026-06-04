import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AdminPickerSheet, AdminSegmentedControl } from "@/components/admin";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { VARIANT_BUILD_TABS } from "./tab-config";
import type { VariantBuildTabId } from "./types";
import type {
  VariantBuildContext,
  VariantComparisonItem,
  VariantRoomAllocationInput,
} from "@/lib/tour-query-pricing";
import {
  findNestedRecord,
  formatRoomAllocationLine,
  formatTransportLine,
  resolveVariantHotelName,
  resolveVariantTransport,
  variantDataKeys,
} from "./variant-build-utils";

function formatINR(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "Rs. 0";
  return `Rs. ${Math.round(n).toLocaleString("en-IN")}`;
}

type RoomPickerField = "roomTypeId" | "occupancyTypeId" | "mealPlanId";

interface RoomPickerState {
  itineraryId: string;
  roomIndex: number;
  field: RoomPickerField;
}

function cloneRooms(
  rooms: Record<string, VariantRoomAllocationInput[]>
): Record<string, VariantRoomAllocationInput[]> {
  return JSON.parse(JSON.stringify(rooms));
}

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

function roomsForVariant(
  variant: VariantComparisonItem,
  build: VariantBuildContext
): Record<string, VariantRoomAllocationInput[]> {
  const roomsByItinerary = findNestedRecord(
    build.variantRoomAllocations,
    variantDataKeys(variant)
  );
  const result: Record<string, VariantRoomAllocationInput[]> = {};
  for (const itinerary of build.itineraries) {
    const rows = roomsByItinerary[itinerary.id];
    result[itinerary.id] = Array.isArray(rows)
      ? (rows as VariantRoomAllocationInput[])
      : [];
  }
  return result;
}

export function VariantBuildPanel({
  queryId,
  variant,
  build,
  canWriteSales,
  onSaveRooms,
  savingRooms = false,
}: {
  queryId: string;
  variant: VariantComparisonItem;
  build: VariantBuildContext;
  canWriteSales: boolean;
  onSaveRooms?: (
    variant: VariantComparisonItem,
    roomsByItinerary: Record<string, VariantRoomAllocationInput[]>
  ) => Promise<void>;
  savingRooms?: boolean;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<VariantBuildTabId>("hotels");
  const [roomPicker, setRoomPicker] = useState<RoomPickerState | null>(null);

  const persistedRooms = useMemo(
    () => roomsForVariant(variant, build),
    [build, variant]
  );
  const [roomDraft, setRoomDraft] =
    useState<Record<string, VariantRoomAllocationInput[]>>(persistedRooms);

  useEffect(() => {
    setRoomDraft(cloneRooms(persistedRooms));
  }, [persistedRooms]);

  const roomsDirty = useMemo(
    () => JSON.stringify(roomDraft) !== JSON.stringify(persistedRooms),
    [roomDraft, persistedRooms]
  );

  const dayRows = useMemo(
    () =>
      build.itineraries.map((it, idx) => ({
        ...it,
        dayLabel: it.dayNumber ?? idx + 1,
        hotelName: resolveVariantHotelName(variant, build, it.id, it.dayNumber, it.hotel),
        rooms: roomDraft[it.id] ?? [],
        transport: resolveVariantTransport(variant, build, it.id),
      })),
    [build, variant, roomDraft]
  );

  const setRoomsForDay = (
    itineraryId: string,
    updater: (rows: VariantRoomAllocationInput[]) => VariantRoomAllocationInput[]
  ) => {
    setRoomDraft((prev) => ({
      ...prev,
      [itineraryId]: updater(prev[itineraryId] ?? []),
    }));
  };

  const updateRoom = (
    itineraryId: string,
    roomIndex: number,
    updates: Partial<VariantRoomAllocationInput>
  ) => {
    setRoomsForDay(itineraryId, (rows) =>
      rows.map((room, idx) => (idx === roomIndex ? { ...room, ...updates } : room))
    );
  };

  const addRoom = (itineraryId: string) => {
    setRoomsForDay(itineraryId, (rows) => [...rows, defaultRoom(build)]);
  };

  const deleteRoom = (itineraryId: string, roomIndex: number) => {
    setRoomsForDay(itineraryId, (rows) => rows.filter((_, idx) => idx !== roomIndex));
  };

  const pickerOptions = useMemo(() => {
    if (!roomPicker) return [];
    if (roomPicker.field === "roomTypeId") {
      return build.lookups.roomTypes.map((item) => ({ id: item.id, label: item.name }));
    }
    if (roomPicker.field === "occupancyTypeId") {
      return build.lookups.occupancyTypes.map((item) => ({ id: item.id, label: item.name }));
    }
    return build.lookups.mealPlans.map((item) => ({ id: item.id, label: item.name }));
  }, [build.lookups, roomPicker]);

  const pickerTitle = useMemo(() => {
    if (!roomPicker) return "";
    if (roomPicker.field === "roomTypeId") return "Select Room Type";
    if (roomPicker.field === "occupancyTypeId") return "Select Occupancy";
    return "Select Meal Plan";
  }, [roomPicker]);

  const pickerSelectedId = useMemo(() => {
    if (!roomPicker) return undefined;
    const room = roomDraft[roomPicker.itineraryId]?.[roomPicker.roomIndex];
    const value = room?.[roomPicker.field];
    return typeof value === "string" ? value : undefined;
  }, [roomDraft, roomPicker]);

  const saveRooms = () => {
    if (!onSaveRooms || savingRooms || !roomsDirty) return;
    void onSaveRooms(variant, cloneRooms(roomDraft));
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
            <Text style={styles.empty}>Add itinerary days on the Hotels tab first.</Text>
          ) : (
            dayRows.map((day) => (
              <View key={day.id} style={styles.dayCard}>
                <Text style={styles.dayTitle}>
                  Day {day.dayLabel}
                  {day.itineraryTitle ? ` - ${day.itineraryTitle.replace(/<[^>]+>/g, "")}` : ""}
                </Text>
                <View style={styles.row}>
                  <Ionicons name="bed-outline" size={15} color={Colors.textSecondary} />
                  <Text style={styles.rowText}>{day.hotelName}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      ) : null}

      {activeTab === "rooms" ? (
        <View style={styles.panel} testID={`variant-build-rooms-${variant.id}`}>
          {dayRows.length === 0 ? (
            <Text style={styles.empty}>No itinerary days configured.</Text>
          ) : (
            <>
              {dayRows.map((day) => (
                <View key={day.id} style={styles.dayCard}>
                  <View style={styles.dayHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dayTitle}>Day {day.dayLabel}</Text>
                      <Text style={styles.muted}>
                        {day.rooms.length} room allocation{day.rooms.length === 1 ? "" : "s"}
                      </Text>
                    </View>
                    {canWriteSales && onSaveRooms ? (
                      <Pressable
                        testID={`variant-build-add-room-${variant.id}-${day.id}`}
                        accessibilityRole="button"
                        accessibilityLabel={`Add room allocation for day ${day.dayLabel}`}
                        style={styles.smallBtn}
                        disabled={savingRooms}
                        onPress={() => addRoom(day.id)}
                      >
                        <Ionicons name="add" size={14} color={Colors.primary} />
                        <Text style={styles.smallBtnText}>Add Room</Text>
                      </Pressable>
                    ) : null}
                  </View>

                  {day.rooms.length === 0 ? (
                    <Text style={styles.muted}>No room allocations</Text>
                  ) : (
                    day.rooms.map((room, idx) => {
                      const roomTypeLabel =
                        build.lookups.roomTypes.find((item) => item.id === room.roomTypeId)
                          ?.name || "Room type";
                      const occupancyLabel =
                        build.lookups.occupancyTypes.find(
                          (item) => item.id === room.occupancyTypeId
                        )?.name || "Occupancy";
                      const mealPlanLabel =
                        build.lookups.mealPlans.find((item) => item.id === room.mealPlanId)
                          ?.name || "Meal plan";

                      return (
                        <View key={`${day.id}-room-${idx}`} style={styles.roomEditor}>
                          <View style={styles.roomHeader}>
                            <Text style={styles.roomTitle}>Room {idx + 1}</Text>
                            {canWriteSales && onSaveRooms ? (
                              <Pressable
                                testID={`variant-build-delete-room-${variant.id}-${day.id}-${idx}`}
                                accessibilityRole="button"
                                accessibilityLabel={`Delete room ${idx + 1}`}
                                style={styles.deleteBtn}
                                disabled={savingRooms}
                                onPress={() => deleteRoom(day.id, idx)}
                              >
                                <Ionicons name="trash-outline" size={14} color={Colors.error} />
                              </Pressable>
                            ) : null}
                          </View>

                          <View style={styles.row2}>
                            <Pressable
                              testID={`variant-build-room-type-${variant.id}-${day.id}-${idx}`}
                              accessibilityRole="button"
                              accessibilityLabel={`Room type ${roomTypeLabel}`}
                              style={styles.pickerBtn}
                              disabled={!canWriteSales || !onSaveRooms || savingRooms}
                              onPress={() =>
                                setRoomPicker({
                                  itineraryId: day.id,
                                  roomIndex: idx,
                                  field: "roomTypeId",
                                })
                              }
                            >
                              <Text style={styles.pickerLabel}>Room Type</Text>
                              <Text style={styles.pickerText} numberOfLines={1}>
                                {roomTypeLabel}
                              </Text>
                            </Pressable>
                            <Pressable
                              testID={`variant-build-occupancy-${variant.id}-${day.id}-${idx}`}
                              accessibilityRole="button"
                              accessibilityLabel={`Occupancy ${occupancyLabel}`}
                              style={styles.pickerBtn}
                              disabled={!canWriteSales || !onSaveRooms || savingRooms}
                              onPress={() =>
                                setRoomPicker({
                                  itineraryId: day.id,
                                  roomIndex: idx,
                                  field: "occupancyTypeId",
                                })
                              }
                            >
                              <Text style={styles.pickerLabel}>Occupancy</Text>
                              <Text style={styles.pickerText} numberOfLines={1}>
                                {occupancyLabel}
                              </Text>
                            </Pressable>
                          </View>

                          <View style={styles.row2}>
                            <Pressable
                              testID={`variant-build-meal-plan-${variant.id}-${day.id}-${idx}`}
                              accessibilityRole="button"
                              accessibilityLabel={`Meal plan ${mealPlanLabel}`}
                              style={styles.pickerBtn}
                              disabled={!canWriteSales || !onSaveRooms || savingRooms}
                              onPress={() =>
                                setRoomPicker({
                                  itineraryId: day.id,
                                  roomIndex: idx,
                                  field: "mealPlanId",
                                })
                              }
                            >
                              <Text style={styles.pickerLabel}>Meal Plan</Text>
                              <Text style={styles.pickerText} numberOfLines={1}>
                                {mealPlanLabel}
                              </Text>
                            </Pressable>
                            <View style={[styles.pickerBtn, styles.qtyWrap]}>
                              <Text style={styles.pickerLabel}>Qty</Text>
                              <TextInput
                                testID={`variant-build-room-qty-${variant.id}-${day.id}-${idx}`}
                                style={styles.qtyInput}
                                keyboardType="number-pad"
                                value={String(room.quantity || 1)}
                                editable={canWriteSales && !!onSaveRooms && !savingRooms}
                                onChangeText={(text) => {
                                  const qty = Number.parseInt(text.replace(/[^0-9]/g, ""), 10);
                                  updateRoom(day.id, idx, {
                                    quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
                                  });
                                }}
                              />
                            </View>
                          </View>

                          <View style={styles.customRoomField}>
                            <Text style={styles.pickerLabel}>Custom Room Name</Text>
                            <TextInput
                              testID={`variant-build-custom-room-${variant.id}-${day.id}-${idx}`}
                              style={styles.customRoomInput}
                              value={typeof room.customRoomType === "string" ? room.customRoomType : ""}
                              editable={canWriteSales && !!onSaveRooms && !savingRooms}
                              onChangeText={(text) =>
                                updateRoom(day.id, idx, {
                                  customRoomType: text,
                                  useCustomRoomType: text.trim().length > 0,
                                })
                              }
                              placeholder="Optional"
                              placeholderTextColor={Colors.textTertiary}
                            />
                          </View>

                          <Text style={styles.previewLine}>
                            {formatRoomAllocationLine(room as Record<string, unknown>, build)}
                          </Text>
                        </View>
                      );
                    })
                  )}
                </View>
              ))}

              {canWriteSales && onSaveRooms ? (
                <View style={styles.saveBar}>
                  <Pressable
                    testID={`variant-build-rooms-reset-${variant.id}`}
                    accessibilityRole="button"
                    accessibilityLabel="Reset room allocation edits"
                    style={[styles.saveBtn, styles.resetBtn]}
                    disabled={savingRooms || !roomsDirty}
                    onPress={() => setRoomDraft(cloneRooms(persistedRooms))}
                  >
                    <Text style={styles.resetBtnText}>Reset</Text>
                  </Pressable>
                  <Pressable
                    testID={`variant-build-rooms-save-${variant.id}`}
                    accessibilityRole="button"
                    accessibilityLabel="Save room allocations"
                    style={[
                      styles.saveBtn,
                      styles.primarySaveBtn,
                      (!roomsDirty || savingRooms) ? styles.disabledBtn : null,
                    ]}
                    disabled={!roomsDirty || savingRooms}
                    onPress={saveRooms}
                  >
                    <Ionicons name="save-outline" size={15} color="#fff" />
                    <Text style={styles.primarySaveText}>
                      {savingRooms ? "Saving..." : "Save Rooms"}
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
                Base {formatINR(variant.pricing.basePrice)} - Markup{" "}
                {formatINR(variant.pricing.markupAmount)} ({variant.pricing.markupPercentage}%)
              </Text>
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
                day.transport.map((row, idx) => (
                  <Text key={`${day.id}-transport-${idx}`} style={styles.bullet}>
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

      {roomPicker ? (
        <AdminPickerSheet
          visible
          title={pickerTitle}
          options={pickerOptions}
          selectedId={pickerSelectedId}
          testID={`variant-build-picker-${variant.id}`}
          onSelect={(option) => {
            updateRoom(roomPicker.itineraryId, roomPicker.roomIndex, {
              [roomPicker.field]: option.id,
            });
          }}
          onClose={() => setRoomPicker(null)}
        />
      ) : null}
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
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  dayTitle: { fontSize: FontSize.sm, fontWeight: "800", color: Colors.text },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowText: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: "600" },
  row2: { flexDirection: "row", gap: Spacing.sm },
  bullet: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: "600" },
  muted: { fontSize: FontSize.sm, color: Colors.textTertiary, fontWeight: "600" },
  empty: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: "600",
    paddingVertical: Spacing.sm,
  },
  total: { fontSize: FontSize.xl, fontWeight: "900", color: Colors.text },
  split: { flexDirection: "row", gap: Spacing.md },
  splitItem: { fontSize: FontSize.sm, fontWeight: "700", color: Colors.textSecondary },
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
  roomEditor: {
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.background,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  roomHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  roomTitle: { fontSize: FontSize.xs, fontWeight: "900", color: Colors.textSecondary },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fee2e2",
  },
  pickerBtn: {
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
  pickerLabel: {
    fontSize: 10,
    fontWeight: "900",
    color: Colors.textTertiary,
    textTransform: "uppercase",
  },
  pickerText: {
    marginTop: 3,
    fontSize: FontSize.sm,
    fontWeight: "800",
    color: Colors.text,
  },
  qtyWrap: { flex: 0.45 },
  qtyInput: {
    marginTop: 2,
    fontSize: FontSize.md,
    fontWeight: "900",
    color: Colors.text,
    paddingVertical: 0,
  },
  customRoomField: {
    borderRadius: BorderRadius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
  },
  customRoomInput: {
    marginTop: 2,
    paddingVertical: 0,
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.text,
  },
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
    minHeight: 42,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  resetBtn: {
    flex: 0.7,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
  },
  resetBtnText: { fontSize: FontSize.sm, fontWeight: "900", color: Colors.textSecondary },
  primarySaveBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  primarySaveText: { fontSize: FontSize.sm, fontWeight: "900", color: "#fff" },
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
