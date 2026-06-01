import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AdminFormSection } from "@/components/admin";
import { HotelsDayCard } from "./HotelsDayCard";
import { tourQueryFormStyles as styles } from "./form-styles";
import type { TourQueryEditFormState } from "./useTourQueryEditForm";

type Props = Pick<
  TourQueryEditFormState,
  | "itineraries"
  | "setItineraries"
  | "inquiry"
  | "locations"
  | "roomTypes"
  | "occupancyTypes"
  | "mealPlans"
  | "vehicleTypes"
  | "hotelsCache"
  | "addRoomAllocation"
  | "deleteRoomAllocation"
  | "updateRoomQuantity"
  | "updateCustomRoomType"
  | "addTransportDetail"
  | "deleteTransportDetail"
  | "updateTransportQuantity"
  | "updateTransportDescription"
  | "forceApplyInquiryRoomAllocations"
  | "setActivePicker"
>;

export function TourQueryHotelsTab({
  itineraries,
  setItineraries,
  inquiry,
  locations,
  roomTypes,
  occupancyTypes,
  mealPlans,
  vehicleTypes,
  hotelsCache,
  addRoomAllocation,
  deleteRoomAllocation,
  updateRoomQuantity,
  updateCustomRoomType,
  addTransportDetail,
  deleteTransportDetail,
  updateTransportQuantity,
  updateTransportDescription,
  forceApplyInquiryRoomAllocations,
  setActivePicker,
}: Props) {
  return (
    <AdminFormSection title="Hotels & Transport" testID="tq-edit-section-hotels">
      <Text style={styles.help}>
        Set hotels, room allocations, and day-wise transport. Add itinerary days on the Itinerary tab
        first.
      </Text>

      {inquiry?.roomAllocations && inquiry.roomAllocations.length > 0 ? (
        <View style={styles.inquiryRoomBanner} testID="tq-edit-inquiry-rooms-banner">
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Ionicons name="bed-outline" size={16} color="#0369a1" />
            <Text style={{ fontWeight: "700", color: "#0369a1", fontSize: 13 }}>
              Inquiry Room Allocation
            </Text>
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
          <Text style={styles.help}>No itinerary days yet. Add days on the Itinerary tab.</Text>
        </View>
      ) : (
        itineraries.map((it, idx) => (
          <HotelsDayCard
            key={it.id}
            it={it}
            idx={idx}
            locations={locations}
            roomTypes={roomTypes}
            occupancyTypes={occupancyTypes}
            mealPlans={mealPlans}
            vehicleTypes={vehicleTypes}
            hotelsCache={hotelsCache}
            onChange={(next) =>
              setItineraries((arr) => arr.map((x) => (x.id === next.id ? next : x)))
            }
            onSelectHotel={() => setActivePicker({ type: "hotel", dayIndex: idx })}
            onSelectRoomType={(rIdx) =>
              setActivePicker({ type: "roomType", dayIndex: idx, allocationIndex: rIdx })
            }
            onSelectOccupancy={(rIdx) =>
              setActivePicker({ type: "occupancy", dayIndex: idx, allocationIndex: rIdx })
            }
            onSelectMealPlan={(rIdx) =>
              setActivePicker({ type: "mealPlan", dayIndex: idx, allocationIndex: rIdx })
            }
            onSelectVehicleType={(tIdx) =>
              setActivePicker({ type: "vehicleType", dayIndex: idx, transportIndex: tIdx })
            }
            onAddRoom={() => addRoomAllocation(idx)}
            onDeleteRoom={(rIdx) => deleteRoomAllocation(idx, rIdx)}
            onUpdateRoomQuantity={(rIdx, qty) => updateRoomQuantity(idx, rIdx, qty)}
            onUpdateCustomRoomType={(rIdx, val) => updateCustomRoomType(idx, rIdx, val)}
            onAddTransport={() => addTransportDetail(idx)}
            onDeleteTransport={(tIdx) => deleteTransportDetail(idx, tIdx)}
            onUpdateTransportQuantity={(tIdx, qty) => updateTransportQuantity(idx, tIdx, qty)}
            onUpdateTransportDescription={(tIdx, val) => updateTransportDescription(idx, tIdx, val)}
          />
        ))
      )}
    </AdminFormSection>
  );
}
