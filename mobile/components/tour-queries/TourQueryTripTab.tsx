import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AdminFormSection } from "@/components/admin";
import { DateField } from "@/components/ui/DateField";
import { Colors } from "@/constants/theme";
import { FormField } from "./FormField";
import { tourQueryFormStyles as styles } from "./form-styles";
import type { TourQueryEditFormState } from "./useTourQueryEditForm";

type Props = Pick<
  TourQueryEditFormState,
  | "startsFrom"
  | "setStartsFrom"
  | "endsOn"
  | "setEndsOn"
  | "queryLocationId"
  | "locations"
  | "transport"
  | "setTransport"
  | "pickupLocation"
  | "setPickupLocation"
  | "dropLocation"
  | "setDropLocation"
  | "datesOrderWarning"
  | "setActivePicker"
  | "itineraries"
>;

export function TourQueryTripTab({
  startsFrom,
  setStartsFrom,
  endsOn,
  setEndsOn,
  queryLocationId,
  locations,
  transport,
  setTransport,
  pickupLocation,
  setPickupLocation,
  dropLocation,
  setDropLocation,
  datesOrderWarning,
  setActivePicker,
  itineraries,
}: Props) {
  const durationNights =
    startsFrom && endsOn && startsFrom <= endsOn
      ? Math.max(0, Math.round((Date.parse(endsOn) - Date.parse(startsFrom)) / 86400000))
      : null;

  const locationLabel =
    locations.find((l) => l.id === queryLocationId)?.name ?? "Select primary destination";

  return (
    <AdminFormSection title="Trip details" testID="tq-edit-section-trip">
      <View style={{ marginBottom: 12 }}>
        <Text style={styles.label}>Primary destination</Text>
        <Pressable
          testID="tq-edit-query-location-picker"
          accessibilityRole="button"
          accessibilityLabel="Choose primary destination"
          style={styles.pickerBtn}
          onPress={() => setActivePicker({ type: "queryLocation", dayIndex: -1 })}
        >
          <Text style={styles.pickerBtnText} numberOfLines={2}>
            {locationLabel}
          </Text>
          <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
        </Pressable>
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
      {durationNights != null ? (
        <Text style={styles.help}>
          {durationNights} night{durationNights === 1 ? "" : "s"} · {itineraries.length} itinerary
          day{itineraries.length === 1 ? "" : "s"}
        </Text>
      ) : null}
      {datesOrderWarning ? (
        <Text style={styles.helpErr}>End date cannot be before start date.</Text>
      ) : null}

      <FormField label="Transport" value={transport} onChange={setTransport} />
      <FormField label="Pickup location" value={pickupLocation} onChange={setPickupLocation} />
      <FormField label="Drop location" value={dropLocation} onChange={setDropLocation} />
    </AdminFormSection>
  );
}
