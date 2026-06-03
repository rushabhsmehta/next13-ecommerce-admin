import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { ApiError, withAuth } from "@/lib/api";
import { DateField } from "@/components/ui/DateField";
import {
  AdminBottomActionBar,
  AdminPickerSheet,
  AdminScreen,
  AdminTopBar,
} from "@/components/admin";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import {
  createFlightTicketsClient,
  type FlightPassenger,
  type FlightTicket,
  type FlightTicketInput,
  type FlightTicketTourQueryOption,
} from "@/lib/flight-tickets";

type Mode = "create" | "edit";

interface Props {
  mode: Mode;
  initial?: FlightTicket | null;
  pnr?: string;
}

const STATUSES = ["confirmed", "pending", "cancelled"];
const PASSENGER_TYPES = ["Adult", "Child", "Infant"];

function toDateInput(value?: string | null): string {
  if (!value) return "";
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return String(value).slice(0, 10);
  }
}

function parseMoney(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number.parseFloat(trimmed);
  return Number.isFinite(n) ? n : null;
}

function parseAge(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
}

function blankPassenger(): FlightPassenger {
  return { name: "", type: "Adult", seatNumber: "", age: null, gender: "" };
}

function displayQuery(q: FlightTicketTourQueryOption): string {
  const title = q.tourPackageQueryName || q.tourPackageQueryNumber || q.id.slice(0, 8);
  return q.customerName ? `${title} - ${q.customerName}` : title;
}

export function FlightTicketForm({ mode, initial, pnr: routePnr }: Props) {
  const router = useRouter();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const client = useMemo(
    () => createFlightTicketsClient(withAuth(() => getTokenRef.current())),
    []
  );

  const [pnr, setPnr] = useState(initial?.pnr ?? "");
  const [airline, setAirline] = useState(initial?.airline ?? "");
  const [flightNumber, setFlightNumber] = useState(initial?.flightNumber ?? "");
  const [departureAirport, setDepartureAirport] = useState(initial?.departureAirport ?? "");
  const [arrivalAirport, setArrivalAirport] = useState(initial?.arrivalAirport ?? "");
  const [departureTime, setDepartureTime] = useState(toDateInput(initial?.departureTime));
  const [arrivalTime, setArrivalTime] = useState(toDateInput(initial?.arrivalTime));
  const [ticketClass, setTicketClass] = useState(initial?.ticketClass ?? "Economy");
  const [status, setStatus] = useState(initial?.status ?? "confirmed");
  const [baggageAllowance, setBaggageAllowance] = useState(initial?.baggageAllowance ?? "");
  const [bookingReference, setBookingReference] = useState(initial?.bookingReference ?? "");
  const [fareAmount, setFareAmount] = useState(
    initial?.fareAmount != null ? String(initial.fareAmount) : ""
  );
  const [taxAmount, setTaxAmount] = useState(
    initial?.taxAmount != null ? String(initial.taxAmount) : ""
  );
  const [totalAmount, setTotalAmount] = useState(
    initial?.totalAmount != null ? String(initial.totalAmount) : ""
  );
  const [tourPackageQueryId, setTourPackageQueryId] = useState(
    initial?.tourPackageQueryId ?? ""
  );
  const [querySearch, setQuerySearch] = useState(
    initial?.tourPackageQueryName || initial?.customerName || ""
  );
  const [queryResults, setQueryResults] = useState<FlightTicketTourQueryOption[]>([]);
  const [queryLoading, setQueryLoading] = useState(false);
  const [passengers, setPassengers] = useState<FlightPassenger[]>(
    initial?.passengers?.length
      ? initial.passengers.map((p) => ({
          ...p,
          seatNumber: p.seatNumber ?? "",
          gender: p.gender ?? "",
          age: p.age ?? null,
        }))
      : [blankPassenger()]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queryPickerOpen, setQueryPickerOpen] = useState(false);

  useEffect(() => {
    if (!querySearch.trim() || querySearch.trim().length < 2) {
      setQueryResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      setQueryLoading(true);
      try {
        setQueryResults(await client.searchTourQueries(querySearch));
      } catch {
        setQueryResults([]);
      } finally {
        setQueryLoading(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [client, querySearch]);

  const totalSuggestion = useMemo(() => {
    const fare = parseMoney(fareAmount) ?? 0;
    const tax = parseMoney(taxAmount) ?? 0;
    return fare || tax ? String(fare + tax) : "";
  }, [fareAmount, taxAmount]);

  const queryOptions = useMemo(
    () =>
      queryResults.map((q) => ({
        id: q.id,
        label: displayQuery(q),
        subtitle: q.tourPackageQueryNumber ?? q.id.slice(0, 8),
      })),
    [queryResults]
  );

  const validationError = useMemo(() => {
    if (mode === "create" && !pnr.trim()) return "PNR is required.";
    if (!airline.trim()) return "Airline is required.";
    if (!flightNumber.trim()) return "Flight number is required.";
    if (!departureAirport.trim() || !arrivalAirport.trim()) {
      return "Departure and arrival airports are required.";
    }
    if (!departureTime.trim() || !arrivalTime.trim()) {
      return "Departure and arrival dates are required.";
    }
    if (!ticketClass.trim()) return "Ticket class is required.";
    if (!passengers.length || passengers.some((p) => !p.name.trim())) {
      return "Add at least one passenger name.";
    }
    return null;
  }, [
    mode,
    pnr,
    airline,
    flightNumber,
    departureAirport,
    arrivalAirport,
    departureTime,
    arrivalTime,
    ticketClass,
    passengers,
  ]);

  const setPassenger = useCallback(
    (index: number, patch: Partial<FlightPassenger>) => {
      setPassengers((prev) =>
        prev.map((p, i) => (i === index ? { ...p, ...patch } : p))
      );
    },
    []
  );

  function validate(): string | null {
    if (mode === "create" && !pnr.trim()) return "PNR is required.";
    if (!airline.trim()) return "Airline is required.";
    if (!flightNumber.trim()) return "Flight number is required.";
    if (!departureAirport.trim() || !arrivalAirport.trim()) {
      return "Departure and arrival airports are required.";
    }
    if (!departureTime.trim() || !arrivalTime.trim()) {
      return "Departure and arrival dates are required.";
    }
    if (!ticketClass.trim()) return "Ticket class is required.";
    if (!passengers.length || passengers.some((p) => !p.name.trim())) {
      return "Add at least one passenger name.";
    }
    return null;
  }

  async function submit() {
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }

    const payload: FlightTicketInput = {
      ...(mode === "create" ? { pnr: pnr.trim().toUpperCase() } : {}),
      airline: airline.trim(),
      flightNumber: flightNumber.trim(),
      departureAirport: departureAirport.trim(),
      arrivalAirport: arrivalAirport.trim(),
      departureTime: departureTime.trim(),
      arrivalTime: arrivalTime.trim(),
      ticketClass: ticketClass.trim(),
      status,
      baggageAllowance: baggageAllowance.trim() || null,
      bookingReference: bookingReference.trim() || null,
      fareAmount: parseMoney(fareAmount),
      taxAmount: parseMoney(taxAmount),
      totalAmount: parseMoney(totalAmount || totalSuggestion),
      tourPackageQueryId: tourPackageQueryId.trim() || null,
      passengers: passengers.map((p) => ({
        name: p.name.trim(),
        type: p.type || "Adult",
        seatNumber: String(p.seatNumber ?? "").trim() || null,
        age: parseAge(p.age),
        gender: String(p.gender ?? "").trim() || null,
      })),
    };

    setSaving(true);
    setError(null);
    try {
      const saved =
        mode === "create"
          ? await client.createTicket(payload)
          : await client.updateTicket(routePnr || initial!.pnr, payload);
      router.replace(`/admin/flight-tickets/${encodeURIComponent(saved.pnr)}` as never);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save flight ticket.");
    } finally {
      setSaving(false);
    }
  }

  function removePassenger(index: number) {
    if (passengers.length === 1) {
      Alert.alert("Passenger required", "A ticket must include at least one passenger.");
      return;
    }
    setPassengers((prev) => prev.filter((_, i) => i !== index));
  }

  function selectQuery(q: FlightTicketTourQueryOption) {
    setTourPackageQueryId(q.id);
    setQuerySearch(displayQuery(q));
    setQueryResults([]);
  }

  const title = mode === "create" ? "New ticket" : "Edit ticket";

  return (
    <AdminScreen
      keyboardAvoiding
      testID={mode === "create" ? "flight-ticket-new-screen" : "flight-ticket-edit-screen"}
      contentContainerStyle={styles.content}
      footer={
        <AdminBottomActionBar
          primaryLabel={mode === "create" ? "Create ticket" : "Save changes"}
          primaryIcon={mode === "create" ? "add-circle-outline" : "save-outline"}
          primaryTestID="flight-ticket-save"
          primaryDisabled={!!validationError || saving}
          disabledReason={validationError ?? (saving ? "Saving…" : undefined)}
          onPrimaryPress={() => void submit()}
        />
      }
    >
      <Stack.Screen options={{ title, headerShown: false }} />

      <AdminTopBar
        title={title}
        subtitle={
          mode === "create" ? "PNR, passengers, fare and query link" : (initial?.pnr ?? routePnr)
        }
        onBackPress={() => router.back()}
        testID="flight-ticket-form-header"
      />
        {error ? (
          <View style={styles.errorCard}>
            <Ionicons name="warning-outline" size={16} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Section title="Ticket">
          {mode === "create" ? (
            <Field
              testID="flight-ticket-pnr"
              label="PNR"
              value={pnr}
              onChangeText={(v) => setPnr(v.toUpperCase())}
              autoCapitalize="characters"
            />
          ) : (
            <ReadOnly label="PNR" value={initial?.pnr ?? routePnr ?? ""} />
          )}
          <Field testID="flight-ticket-airline" label="Airline" value={airline} onChangeText={setAirline} />
          <Field
            testID="flight-ticket-flight-number"
            label="Flight number"
            value={flightNumber}
            onChangeText={setFlightNumber}
            autoCapitalize="characters"
          />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field
                testID="flight-ticket-departure-airport"
                label="From"
                value={departureAirport}
                onChangeText={setDepartureAirport}
                autoCapitalize="characters"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                testID="flight-ticket-arrival-airport"
                label="To"
                value={arrivalAirport}
                onChangeText={setArrivalAirport}
                autoCapitalize="characters"
              />
            </View>
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <DateOnlyField
                testID="flight-ticket-departure-date"
                label="Departure date"
                value={departureTime}
                onChange={setDepartureTime}
              />
            </View>
            <View style={{ flex: 1 }}>
              <DateOnlyField
                testID="flight-ticket-arrival-date"
                label="Arrival date"
                value={arrivalTime}
                onChange={setArrivalTime}
              />
            </View>
          </View>
          <Field
            testID="flight-ticket-class"
            label="Class"
            value={ticketClass}
            onChangeText={setTicketClass}
          />
          <Segmented
            label="Status"
            values={STATUSES}
            value={status}
            onChange={setStatus}
            testIDPrefix="flight-ticket-status"
          />
        </Section>

        <Section title="Passengers">
          {passengers.map((p, index) => (
            <View key={index} style={styles.passengerBlock}>
              <View style={styles.passengerHeader}>
                <Text style={styles.passengerTitle}>Passenger {index + 1}</Text>
                <Pressable
                  testID={`flight-ticket-passenger-remove-${index}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove passenger ${index + 1}`}
                  style={styles.iconBtn}
                  onPress={() => removePassenger(index)}
                >
                  <Ionicons name="trash-outline" size={16} color={Colors.error} />
                </Pressable>
              </View>
              <Field
                testID={`flight-ticket-passenger-name-${index}`}
                label="Name"
                value={p.name}
                onChangeText={(v) => setPassenger(index, { name: v })}
              />
              <Segmented
                label="Type"
                values={PASSENGER_TYPES}
                value={p.type}
                onChange={(v) => setPassenger(index, { type: v })}
                testIDPrefix={`flight-ticket-passenger-type-${index}`}
              />
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Field
                    testID={`flight-ticket-passenger-seat-${index}`}
                    label="Seat"
                    value={String(p.seatNumber ?? "")}
                    onChangeText={(v) => setPassenger(index, { seatNumber: v })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Field
                    testID={`flight-ticket-passenger-age-${index}`}
                    label="Age"
                    value={p.age == null ? "" : String(p.age)}
                    onChangeText={(v) => setPassenger(index, { age: parseAge(v) })}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
              <Field
                testID={`flight-ticket-passenger-gender-${index}`}
                label="Gender"
                value={String(p.gender ?? "")}
                onChangeText={(v) => setPassenger(index, { gender: v })}
              />
            </View>
          ))}
          <Pressable
            testID="flight-ticket-passenger-add"
            accessibilityRole="button"
            accessibilityLabel="Add passenger"
            style={styles.secondaryBtn}
            onPress={() => setPassengers((prev) => [...prev, blankPassenger()])}
          >
            <Ionicons name="add" size={18} color={Colors.primary} />
            <Text style={styles.secondaryBtnText}>Add passenger</Text>
          </Pressable>
        </Section>

        <Section title="Fare">
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field
                testID="flight-ticket-fare"
                label="Fare"
                value={fareAmount}
                onChangeText={setFareAmount}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                testID="flight-ticket-tax"
                label="Tax"
                value={taxAmount}
                onChangeText={setTaxAmount}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          <Field
            testID="flight-ticket-total"
            label="Total"
            value={totalAmount}
            onChangeText={setTotalAmount}
            placeholder={totalSuggestion ? `Suggested ${totalSuggestion}` : undefined}
            keyboardType="decimal-pad"
          />
          <Field
            testID="flight-ticket-baggage"
            label="Baggage allowance"
            value={baggageAllowance}
            onChangeText={setBaggageAllowance}
          />
          <Field
            testID="flight-ticket-booking-ref"
            label="Booking reference"
            value={bookingReference}
            onChangeText={setBookingReference}
          />
        </Section>

        <Section title="Linked trip">
          <Field
            testID="flight-ticket-query-search"
            label="Search trip"
            value={querySearch}
            onChangeText={(v) => {
              setQuerySearch(v);
              if (!v.trim()) setTourPackageQueryId("");
            }}
            placeholder="Customer, query number, or trip name"
          />
          <Pressable
            testID="flight-ticket-query-picker"
            accessibilityRole="button"
            accessibilityLabel="Choose tour query from search results"
            style={styles.secondaryBtn}
            disabled={queryLoading || queryResults.length === 0}
            onPress={() => setQueryPickerOpen(true)}
          >
            {queryLoading ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <>
                <Ionicons name="search" size={18} color={Colors.primary} />
                <Text style={styles.secondaryBtnText}>
                  {queryResults.length
                    ? `Choose from ${queryResults.length} result${queryResults.length === 1 ? "" : "s"}`
                    : "Search to see trip options"}
                </Text>
              </>
            )}
          </Pressable>
          {tourPackageQueryId ? (
            <View style={styles.linkedPill}>
              <Ionicons name="link-outline" size={15} color={Colors.primary} />
              <Text style={styles.linkedText} numberOfLines={1}>
                Linked: {tourPackageQueryId}
              </Text>
              <Pressable
                testID="flight-ticket-query-clear"
                accessibilityRole="button"
                accessibilityLabel="Clear linked trip"
                onPress={() => {
                  setTourPackageQueryId("");
                  setQuerySearch("");
                }}
              >
                <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
              </Pressable>
            </View>
          ) : null}
        </Section>

      <AdminPickerSheet
        visible={queryPickerOpen}
        title="Link tour query"
        options={queryOptions}
        selectedId={tourPackageQueryId || null}
        loading={queryLoading}
        onClose={() => setQueryPickerOpen(false)}
        onSelect={(opt) => {
          const found = queryResults.find((q) => q.id === opt.id);
          if (found) selectQuery(found);
        }}
        searchPlaceholder="Filter results…"
        emptyLabel="No trips match your search."
        testID="flight-ticket-query"
      />
    </AdminScreen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.readOnly}>
        <Text style={styles.readOnlyText}>{value}</Text>
      </View>
    </View>
  );
}

function Field({
  label,
  testID,
  ...props
}: ComponentProps<typeof TextInput> & { label: string; testID: string }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        testID={testID}
        accessibilityLabel={label}
        style={styles.input}
        placeholderTextColor={Colors.textTertiary}
      />
    </View>
  );
}

function DateOnlyField({
  label,
  testID,
  value,
  onChange,
}: {
  label: string;
  testID: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <DateField
        testID={testID}
        accessibilityLabel={label}
        style={styles.input}
        value={value}
        onChange={onChange}
        placeholder="Choose date"
        allowClear={false}
      />
    </View>
  );
}

function Segmented({
  label,
  values,
  value,
  onChange,
  testIDPrefix,
}: {
  label: string;
  values: string[];
  value: string;
  onChange: (value: string) => void;
  testIDPrefix: string;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.segmentWrap}>
        {values.map((v) => {
          const active = value === v;
          return (
            <Pressable
              key={v}
              testID={`${testIDPrefix}-${v.toLowerCase()}`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${label} ${v}`}
              style={[styles.segment, active ? styles.segmentActive : null]}
              onPress={() => onChange(v)}
            >
              <Text style={[styles.segmentText, active ? styles.segmentTextActive : null]}>
                {v}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  section: { gap: Spacing.sm },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: "900",
    color: Colors.text,
  },
  sectionBody: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  row: { flexDirection: "row", gap: Spacing.sm },
  fieldWrap: { gap: 6 },
  label: { fontSize: FontSize.xs, color: Colors.textTertiary, fontWeight: "800" },
  input: {
    minHeight: 42,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    color: Colors.text,
    fontSize: FontSize.sm,
    backgroundColor: Colors.background,
  },
  readOnly: {
    minHeight: 42,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    paddingHorizontal: Spacing.sm,
    justifyContent: "center",
    backgroundColor: Colors.surfaceAlt,
  },
  readOnlyText: { fontSize: FontSize.sm, color: Colors.text, fontWeight: "700" },
  segmentWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  segment: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 9,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  segmentActive: { backgroundColor: Colors.primary, borderColor: Colors.primaryDark },
  segmentText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: "800" },
  segmentTextActive: { color: Colors.textInverse },
  passengerBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderSubtle,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  passengerHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  passengerTitle: { flex: 1, fontSize: FontSize.sm, fontWeight: "900", color: Colors.text },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    minHeight: 42,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primaryBg,
  },
  secondaryBtnText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: "900" },
  linkedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
  },
  linkedText: { flex: 1, fontSize: FontSize.xs, color: Colors.primary, fontWeight: "800" },
  errorCard: {
    borderRadius: BorderRadius.md,
    backgroundColor: "#fff1f2",
    borderWidth: 1,
    borderColor: "#fecdd3",
    padding: Spacing.sm,
    flexDirection: "row",
    gap: Spacing.xs,
    alignItems: "center",
  },
  errorText: { color: Colors.error, fontSize: FontSize.sm, flex: 1 },
});
