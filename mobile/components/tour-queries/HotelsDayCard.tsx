import { Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import { tourQueryFormStyles as styles } from "./form-styles";
import type { ItineraryRow } from "./types";

export interface HotelsDayCardProps {
  it: ItineraryRow;
  idx: number;
  locations: { id: string; name: string }[];
  roomTypes: { id: string; name: string }[];
  occupancyTypes: { id: string; name: string }[];
  mealPlans: { id: string; name: string }[];
  vehicleTypes: { id: string; name: string }[];
  hotelsCache: Record<string, { id: string; name: string }[]>;
  onChange: (next: ItineraryRow) => void;
  onSelectHotel: () => void;
  onSelectRoomType: (rIdx: number) => void;
  onSelectOccupancy: (rIdx: number) => void;
  onSelectMealPlan: (rIdx: number) => void;
  onSelectVehicleType: (tIdx: number) => void;
  onAddRoom: () => void;
  onDeleteRoom: (rIdx: number) => void;
  onUpdateRoomQuantity: (rIdx: number, qty: string) => void;
  onUpdateCustomRoomType: (rIdx: number, val: string) => void;
  onAddTransport: () => void;
  onDeleteTransport: (tIdx: number) => void;
  onUpdateTransportQuantity: (tIdx: number, qty: string) => void;
  onUpdateTransportDescription: (tIdx: number, val: string) => void;
}

export function HotelsDayCard({
  it,
  idx,
  locations,
  roomTypes,
  occupancyTypes,
  mealPlans,
  vehicleTypes,
  hotelsCache,
  onChange,
  onSelectHotel,
  onSelectRoomType,
  onSelectOccupancy,
  onSelectMealPlan,
  onSelectVehicleType,
  onAddRoom,
  onDeleteRoom,
  onUpdateRoomQuantity,
  onUpdateCustomRoomType,
  onAddTransport,
  onDeleteTransport,
  onUpdateTransportQuantity,
  onUpdateTransportDescription,
}: HotelsDayCardProps) {
  const locationLabel = locations.find((l) => l.id === it.locationId)?.name || "No location";
  const hotelName = it.hotelId
    ? (hotelsCache[it.locationId || ""] || []).find((h) => h.id === it.hotelId)?.name || "Select Hotel"
    : "Select Hotel";

  return (
    <View style={styles.dayCard} testID={`tq-hotels-day-${idx}`}>
      <View style={styles.dayHeader}>
        <View>
          <Text style={styles.dayLabel}>Day {it.dayNumber ?? idx + 1}</Text>
          <Text style={styles.help}>{locationLabel}</Text>
        </View>
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
          <Text
            style={[styles.pickerBtnText, !it.locationId && styles.pickerBtnTextDisabled]}
            numberOfLines={1}
          >
            {hotelName}
          </Text>
          <Ionicons name="chevron-down" size={16} color={Colors.textTertiary} />
        </Pressable>
      </View>

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

      {!(it.roomAllocations ?? []).length ? (
        <Text style={styles.noRoomsText}>No rooms allocated for this day.</Text>
      ) : (
        (it.roomAllocations ?? []).map((ra, rIdx) => {
          const roomTypeName =
            roomTypes.find((r) => r.id === ra.roomTypeId)?.name || "Select Room Type";
          const occupancyName =
            occupancyTypes.find((o) => o.id === ra.occupancyTypeId)?.name || "Select Occupancy";
          const mealPlanName =
            mealPlans.find((m) => m.id === ra.mealPlanId)?.name || "Select Meal Plan";

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

      <View style={[styles.allocationsHeaderRow, { marginTop: 12 }]}>
        <Text style={styles.allocationsTitle}>Transport</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add transport"
          style={styles.addRoomBtn}
          onPress={onAddTransport}
        >
          <Ionicons name="add" size={14} color={Colors.primary} />
          <Text style={styles.addRoomBtnText}>Add Transport</Text>
        </Pressable>
      </View>

      {!(it.transportDetails ?? []).length ? (
        <Text style={styles.noRoomsText}>No transport for this day.</Text>
      ) : (
        (it.transportDetails ?? []).map((td, tIdx) => {
          const vehicleName =
            vehicleTypes.find((v) => v.id === td.vehicleTypeId)?.name || "Select Vehicle";
          return (
            <View key={tIdx} style={styles.roomCard}>
              <View style={styles.roomCardHeader}>
                <Text style={styles.roomLabel}>Transport {tIdx + 1}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Delete transport ${tIdx + 1}`}
                  onPress={() => onDeleteTransport(tIdx)}
                  style={styles.deleteRoomBtn}
                >
                  <Ionicons name="trash-outline" size={14} color={Colors.error} />
                </Pressable>
              </View>
              <View style={styles.row2}>
                <View style={styles.flexField}>
                  <Text style={styles.roomFieldLabel}>Vehicle</Text>
                  <Pressable
                    accessibilityRole="button"
                    style={styles.roomPickerBtn}
                    onPress={() => onSelectVehicleType(tIdx)}
                  >
                    <Text style={styles.roomPickerText} numberOfLines={1}>
                      {vehicleName}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color={Colors.textTertiary} />
                  </Pressable>
                </View>
                <View style={[styles.flexField, { maxWidth: 90 }]}>
                  <Text style={styles.roomFieldLabel}>Qty</Text>
                  <TextInput
                    style={styles.quantityInput}
                    keyboardType="number-pad"
                    value={td.quantity === 0 ? "" : String(td.quantity)}
                    onChangeText={(t) => onUpdateTransportQuantity(tIdx, t)}
                  />
                </View>
              </View>
              <View style={styles.customRoomField}>
                <Text style={styles.roomFieldLabel}>Description</Text>
                <TextInput
                  style={styles.customRoomInput}
                  value={td.description || ""}
                  onChangeText={(t) => onUpdateTransportDescription(tIdx, t)}
                  placeholder="Route or notes"
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
