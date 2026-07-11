import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AdminFormSection } from "@/components/admin";
import { ItineraryDayCard } from "./ItineraryDayCard";
import { tourQueryFormStyles as styles } from "./form-styles";
import type { TourQueryEditFormState } from "./useTourQueryEditForm";

type Props = Pick<
  TourQueryEditFormState,
  "itineraries" | "setItineraries" | "locations" | "addDay" | "deleteDay" | "setActivePicker"
>;

export function TourQueryItineraryTab({
  itineraries,
  setItineraries,
  locations,
  addDay,
  deleteDay,
  setActivePicker,
}: Props) {
  return (
    <AdminFormSection title="Itinerary" testID="tq-edit-section-itinerary">
      <View style={styles.itineraryHeaderRow}>
        <Text style={styles.help}>
          Manage daily locations, titles, descriptions, and meals. Hotels and transport are managed
          on the Variants tab.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add new day to itinerary"
          style={styles.addDayBtn}
          onPress={addDay}
        >
          <Ionicons name="add" size={14} color="#0284c7" />
          <Text style={styles.addDayBtnText}>Add Day</Text>
        </Pressable>
      </View>

      {itineraries.length === 0 ? (
        <View style={styles.emptyItineraryWrap}>
          <Text style={styles.help}>
            This tour package query has no itinerary yet. Click Add Day to begin.
          </Text>
        </View>
      ) : (
        itineraries.map((it, idx) => (
          <ItineraryDayCard
            key={it.id}
            it={it}
            idx={idx}
            locations={locations}
            onChange={(next) =>
              setItineraries((arr) => arr.map((x) => (x.id === next.id ? next : x)))
            }
            onSelectLocation={() => setActivePicker({ type: "location", dayIndex: idx })}
            onDeleteDay={() => deleteDay(idx)}
          />
        ))
      )}
    </AdminFormSection>
  );
}
