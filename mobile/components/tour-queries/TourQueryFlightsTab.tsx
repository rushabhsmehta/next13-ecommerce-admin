import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { AdminFormSection } from "@/components/admin";
import { DateField } from "@/components/ui/DateField";
import { OperationsImageGallery } from "@/components/operations/OperationsImageGallery";
import { Colors } from "@/constants/theme";
import { FormField } from "./FormField";
import { tourQueryFormStyles as styles } from "./form-styles";
import type { FlightDetailRow } from "./types";

type Props = {
  flightDetails: FlightDetailRow[];
  setFlightDetails: (updater: FlightDetailRow[] | ((rows: FlightDetailRow[]) => FlightDetailRow[])) => void;
  getTokenForUpload: () => Promise<string | null>;
};

function blankFlight(): FlightDetailRow {
  return {
    id: `temp-flight-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: "",
    flightName: "",
    flightNumber: "",
    from: "",
    to: "",
    departureTime: "",
    arrivalTime: "",
    flightDuration: "",
    images: [],
  };
}

export function TourQueryFlightsTab({
  flightDetails,
  setFlightDetails,
  getTokenForUpload,
}: Props) {
  function addFlight() {
    setFlightDetails((rows) => [...rows, blankFlight()]);
  }

  function removeFlight(index: number) {
    setFlightDetails((rows) => rows.filter((_, rowIndex) => rowIndex !== index));
  }

  function updateFlight(index: number, patch: Partial<FlightDetailRow>) {
    setFlightDetails((rows) =>
      rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row))
    );
  }

  return (
    <AdminFormSection
      title="Flights"
      description="Add each flight segment with timings, route, duration, and optional ticket images."
      testID="tq-edit-section-flights"
    >
      <View style={styles.flightHeaderRow}>
        <Text style={styles.flightCount}>
          {flightDetails.length} flight{flightDetails.length === 1 ? "" : "s"}
        </Text>
        <Pressable
          testID="tq-flight-add"
          accessibilityRole="button"
          accessibilityLabel="Add flight"
          style={styles.addFlightBtn}
          onPress={addFlight}
        >
          <Ionicons name="add" size={16} color={Colors.primary} />
          <Text style={styles.addFlightBtnText}>Add flight</Text>
        </Pressable>
      </View>

      {flightDetails.length === 0 ? (
        <View style={styles.emptyFlightsWrap}>
          <Text style={styles.help}>No flight details yet.</Text>
        </View>
      ) : null}

      {flightDetails.map((flight, index) => (
        <View key={flight.id ?? `flight-${index}`} style={styles.flightEditCard} testID={`tq-flight-card-${index}`}>
          <View style={styles.flightEditHeader}>
            <Text style={styles.flightEditTitle}>Flight {index + 1}</Text>
            <Pressable
              testID={`tq-flight-remove-${index}`}
              accessibilityRole="button"
              accessibilityLabel={`Remove flight ${index + 1}`}
              style={styles.deleteFlightBtn}
              onPress={() => removeFlight(index)}
            >
              <Ionicons name="trash-outline" size={14} color={Colors.error} />
              <Text style={styles.deleteFlightText}>Remove</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Date</Text>
          <DateField
            testID={`tq-flight-date-${index}`}
            accessibilityLabel={`Flight ${index + 1} date`}
            style={styles.input}
            value={flight.date ?? ""}
            onChange={(date) => updateFlight(index, { date })}
            placeholder="Choose flight date"
          />

          <View style={styles.row2}>
            <FormField
              flex
              label="Flight Name"
              value={flight.flightName ?? ""}
              onChange={(flightName) => updateFlight(index, { flightName })}
              placeholder="e.g. Indigo"
              testID={`tq-flight-name-${index}`}
            />
            <FormField
              flex
              label="Flight Number"
              value={flight.flightNumber ?? ""}
              onChange={(flightNumber) => updateFlight(index, { flightNumber })}
              placeholder="e.g. 6E 123"
              testID={`tq-flight-number-${index}`}
            />
          </View>

          <View style={styles.row2}>
            <FormField
              flex
              label="From"
              value={flight.from ?? ""}
              onChange={(from) => updateFlight(index, { from })}
              placeholder="Departure city/airport"
              testID={`tq-flight-from-${index}`}
            />
            <FormField
              flex
              label="To"
              value={flight.to ?? ""}
              onChange={(to) => updateFlight(index, { to })}
              placeholder="Arrival city/airport"
              testID={`tq-flight-to-${index}`}
            />
          </View>

          <View style={styles.row2}>
            <FormField
              flex
              label="Departure Time"
              value={flight.departureTime ?? ""}
              onChange={(departureTime) => updateFlight(index, { departureTime })}
              placeholder="HH:MM"
              testID={`tq-flight-departure-${index}`}
            />
            <FormField
              flex
              label="Arrival Time"
              value={flight.arrivalTime ?? ""}
              onChange={(arrivalTime) => updateFlight(index, { arrivalTime })}
              placeholder="HH:MM"
              testID={`tq-flight-arrival-${index}`}
            />
          </View>

          <FormField
            label="Duration"
            value={flight.flightDuration ?? ""}
            onChange={(flightDuration) => updateFlight(index, { flightDuration })}
            placeholder="e.g. 2h 30m"
            testID={`tq-flight-duration-${index}`}
          />

          <View>
            <Text style={styles.label}>Flight Images</Text>
            <OperationsImageGallery
              images={flight.images ?? []}
              onChange={(images) => updateFlight(index, { images })}
              getToken={getTokenForUpload}
              testID={`tq-flight-images-${index}`}
              addAccessibilityLabel={`Add image for flight ${index + 1}`}
              addLabel="Add image"
              showRequiredHint={false}
            />
          </View>
        </View>
      ))}
    </AdminFormSection>
  );
}
