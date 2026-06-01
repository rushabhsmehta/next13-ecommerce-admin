import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import { tourQueryFormStyles as styles } from "./form-styles";
import { FormField } from "./FormField";
import type { ItineraryRow } from "./types";

export interface ItineraryDayCardProps {
  it: ItineraryRow;
  idx: number;
  locations: { id: string; name: string }[];
  onChange: (next: ItineraryRow) => void;
  onSelectLocation: () => void;
  onDeleteDay: () => void;
}

export function ItineraryDayCard({
  it,
  idx,
  locations,
  onChange,
  onSelectLocation,
  onDeleteDay,
}: ItineraryDayCardProps) {
  const [descOpen, setDescOpen] = useState(false);
  const plainDesc = String(it.itineraryDescription ?? "").replace(/<[^>]+>/g, "");

  const locationLabel = locations.find((l) => l.id === it.locationId)?.name || "Select Location";

  return (
    <View style={styles.dayCard} testID={`tq-edit-day-${idx}`}>
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

      <FormField
        label="Day title"
        value={it.itineraryTitle ?? ""}
        onChange={(t) => onChange({ ...it, itineraryTitle: t })}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={descOpen ? "Hide description editor" : "Show description editor"}
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
      <FormField
        label="Meals included"
        value={it.mealsIncluded ?? ""}
        onChange={(t) => onChange({ ...it, mealsIncluded: t })}
      />
    </View>
  );
}
