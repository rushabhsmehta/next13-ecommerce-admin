import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { ApiError, withAuth } from "@/lib/api";
import { API_BASE_URL } from "@/constants/api";
import { PermissionGate } from "@/components/auth/PermissionGate";
import {
  AdminErrorState,
  AdminLoadingState,
  AdminScreen,
  AdminTopBar,
  AdminTopBarIconButton,
} from "@/components/admin";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { FlightTicketForm } from "@/components/flight-tickets/FlightTicketForm";
import {
  createFlightTicketsClient,
  type FlightTicket,
  type FlightTicketInput,
} from "@/lib/flight-tickets";
import { useCurrentUser } from "@/hooks/useCurrentUser";

function fmtDate(value?: string | null): string {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

function money(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "-";
  return `Rs. ${Math.round(value).toLocaleString("en-IN")}`;
}

function statusStyle(status: string) {
  const s = status.toLowerCase();
  if (s.includes("cancel")) return styles.statusBad;
  if (s.includes("pending") || s.includes("hold")) return styles.statusWarn;
  return styles.statusOk;
}

function ticketPayload(ticket: FlightTicket, status?: string): FlightTicketInput {
  return {
    airline: ticket.airline,
    flightNumber: ticket.flightNumber,
    departureAirport: ticket.departureAirport,
    arrivalAirport: ticket.arrivalAirport,
    departureTime: ticket.departureTime,
    arrivalTime: ticket.arrivalTime,
    ticketClass: ticket.ticketClass,
    status: status ?? ticket.status,
    baggageAllowance: ticket.baggageAllowance,
    bookingReference: ticket.bookingReference,
    fareAmount: ticket.fareAmount,
    taxAmount: ticket.taxAmount,
    totalAmount: ticket.totalAmount,
    tourPackageQueryId: ticket.tourPackageQueryId,
    passengers: ticket.passengers,
  };
}

function shareText(ticket: FlightTicket): string {
  const pax = ticket.passengers.map((p) => p.name).filter(Boolean).join(", ");
  return [
    `Flight ticket ${ticket.pnr}`,
    `${ticket.airline} ${ticket.flightNumber}`,
    `${ticket.departureAirport} to ${ticket.arrivalAirport}`,
    `Departure: ${fmtDate(ticket.departureTime)}`,
    `Status: ${ticket.status}`,
    pax ? `Passengers: ${pax}` : null,
    ticket.totalAmount != null ? `Total: ${money(ticket.totalAmount)}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export default function FlightTicketDetailScreen() {
  return (
    <PermissionGate permission="flightTickets.read">
      <FlightTicketDetailInner />
    </PermissionGate>
  );
}

function FlightTicketDetailInner() {
  const router = useRouter();
  const { pnr, mode } = useLocalSearchParams<{ pnr: string; mode?: string }>();
  const decodedPnr = pnr ? decodeURIComponent(pnr) : "";
  const { getToken } = useAuth();
  const { permissions } = useCurrentUser();
  const canWrite = permissions.includes("flightTickets.write");
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const client = useMemo(
    () => createFlightTicketsClient(withAuth(() => getTokenRef.current())),
    []
  );

  const [ticket, setTicket] = useState<FlightTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (kind: "initial" | "refresh" = "initial") => {
      if (!decodedPnr) return;
      if (kind === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        setTicket(await client.getTicket(decodedPnr));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load flight ticket.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [client, decodedPnr]
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(next: string) {
    if (!ticket) return;
    setBusy(next);
    try {
      const updated = await client.updateTicket(ticket.pnr, ticketPayload(ticket, next));
      setTicket(updated);
    } catch (err) {
      Alert.alert(
        "Status update failed",
        err instanceof ApiError ? err.message : "Could not update ticket status."
      );
    } finally {
      setBusy(null);
    }
  }

  function confirmDelete() {
    if (!ticket) return;
    Alert.alert(`Delete ticket ${ticket.pnr}?`, "This removes the ticket and passengers.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void doDelete() },
    ]);
  }

  async function doDelete() {
    if (!ticket) return;
    setBusy("delete");
    try {
      await client.deleteTicket(ticket.pnr);
      router.replace("/admin/flight-tickets" as never);
    } catch (err) {
      Alert.alert(
        "Delete failed",
        err instanceof ApiError ? err.message : "Could not delete flight ticket."
      );
    } finally {
      setBusy(null);
    }
  }

  async function shareTicket() {
    if (!ticket) return;
    await Share.share({ message: shareText(ticket), title: `Flight ticket ${ticket.pnr}` });
  }

  function openPrint() {
    if (!ticket) return;
    const url = `${API_BASE_URL}/flight-tickets/${encodeURIComponent(ticket.pnr)}/print`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Could not open print view", url);
    });
  }

  if (mode === "edit" && ticket) {
    return (
      <PermissionGate permission="flightTickets.write">
        <FlightTicketForm mode="edit" pnr={ticket.pnr} initial={ticket} />
      </PermissionGate>
    );
  }

  if (loading) {
    return (
      <AdminLoadingState label="Loading ticket…" testID="flight-ticket-loading" />
    );
  }

  if (error || !ticket) {
    return (
      <AdminScreen testID="flight-ticket-error">
        <Stack.Screen options={{ title: "Flight ticket", headerShown: false }} />
        <AdminErrorState
          message={error ?? "Flight ticket not found"}
          onRetry={() => void load()}
          testID="flight-ticket-error-state"
        />
      </AdminScreen>
    );
  }

  return (
    <AdminScreen
      testID="flight-ticket-detail-screen"
      bottomInset={Spacing.xl}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load("refresh")}
          tintColor={Colors.primary}
        />
      }
      contentContainerStyle={styles.content}
    >
      <Stack.Screen options={{ title: ticket.pnr, headerShown: false }} />
      <AdminTopBar
        title={ticket.pnr}
        subtitle={`${ticket.airline} ${ticket.flightNumber}`}
        onBackPress={() => router.back()}
        testID="flight-ticket-header"
        rightSlot={
          <View style={styles.headerActions}>
            <AdminTopBarIconButton
              icon="share-outline"
              label="Share flight ticket"
              testID="flight-ticket-share"
              onPress={() => void shareTicket()}
            />
            <AdminTopBarIconButton
              icon="print-outline"
              label="Open flight ticket print view"
              testID="flight-ticket-print"
              onPress={openPrint}
            />
          </View>
        }
      />
        <View style={styles.hero}>
          <View style={styles.routeRow}>
            <Text style={styles.airport}>{ticket.departureAirport}</Text>
            <Ionicons name="airplane" size={18} color={Colors.primary} />
            <Text style={styles.airport}>{ticket.arrivalAirport}</Text>
          </View>
          <View style={[styles.statusPill, statusStyle(ticket.status)]}>
            <Text style={styles.statusText}>{ticket.status}</Text>
          </View>
          <Text style={styles.dateLine}>
            {fmtDate(ticket.departureTime)} to {fmtDate(ticket.arrivalTime)}
          </Text>
        </View>

        {canWrite ? (
          <View style={styles.actionsRow}>
            {["confirmed", "pending", "cancelled"].map((s) => (
              <Pressable
                key={s}
                testID={`flight-ticket-set-${s}`}
                accessibilityRole="button"
                accessibilityLabel={`Set ticket status ${s}`}
                disabled={busy != null || ticket.status === s}
                style={[
                  styles.actionBtn,
                  ticket.status === s ? styles.actionSelected : null,
                  busy != null ? styles.disabled : null,
                ]}
                onPress={() => void updateStatus(s)}
              >
                {busy === s ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Text style={styles.actionText}>{s}</Text>
                )}
              </Pressable>
            ))}
          </View>
        ) : null}

        <Section title="Passengers">
          {ticket.passengers.map((p, index) => (
            <View key={p.id ?? index} style={styles.passengerRow}>
              <View style={styles.passengerIcon}>
                <Ionicons name="person-outline" size={16} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.passengerName}>{p.name}</Text>
                <Text style={styles.muted}>
                  {p.type || "Adult"}
                  {p.seatNumber ? ` - Seat ${p.seatNumber}` : ""}
                  {p.age != null ? ` - Age ${p.age}` : ""}
                </Text>
              </View>
            </View>
          ))}
        </Section>

        <Section title="Fare and booking">
          <Info label="Class" value={ticket.ticketClass} />
          <Info label="Fare" value={money(ticket.fareAmount)} />
          <Info label="Tax" value={money(ticket.taxAmount)} />
          <Info label="Total" value={money(ticket.totalAmount)} strong />
          <Info label="Baggage" value={ticket.baggageAllowance || "-"} />
          <Info label="Booking reference" value={ticket.bookingReference || "-"} />
        </Section>

        <Section title="Linked trip">
          {ticket.tourPackageQueryId ? (
            <Pressable
              testID="flight-ticket-linked-query"
              accessibilityRole="button"
              accessibilityLabel="Open linked tour query"
              style={styles.linkRow}
              onPress={() =>
                router.push(`/admin/tour-queries/${ticket.tourPackageQueryId}` as never)
              }
            >
              <Ionicons name="map-outline" size={18} color={Colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.linkTitle} numberOfLines={1}>
                  {ticket.tourPackageQueryName || ticket.tourPackageQueryId}
                </Text>
                <Text style={styles.muted} numberOfLines={1}>
                  {ticket.customerName || "Linked tour query"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
            </Pressable>
          ) : (
            <Text style={styles.muted}>No tour query linked.</Text>
          )}
        </Section>

        {canWrite ? (
          <View style={styles.footerActions}>
            <Pressable
              testID="flight-ticket-edit"
              accessibilityRole="button"
              accessibilityLabel="Edit flight ticket"
              style={styles.primaryBtn}
              onPress={() =>
                router.push(`/admin/flight-tickets/${encodeURIComponent(ticket.pnr)}?mode=edit` as never)
              }
            >
              <Ionicons name="create-outline" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Edit</Text>
            </Pressable>
            <Pressable
              testID="flight-ticket-delete"
              accessibilityRole="button"
              accessibilityLabel="Delete flight ticket"
              disabled={busy === "delete"}
              style={[styles.deleteBtn, busy === "delete" ? styles.disabled : null]}
              onPress={confirmDelete}
            >
              <Ionicons name="trash-outline" size={18} color={Colors.error} />
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
          </View>
        ) : null}
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

function Info({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, strong ? styles.infoStrong : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: "row", gap: 4 },
  container: { flex: 1, backgroundColor: Colors.background },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
    gap: Spacing.sm,
    padding: Spacing.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: "900", color: Colors.text },
  headerSubtitle: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  hero: {
    alignItems: "center",
    gap: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
  },
  routeRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  airport: { fontSize: FontSize.xl, fontWeight: "900", color: Colors.text },
  statusPill: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  statusOk: { backgroundColor: "#dcfce7" },
  statusWarn: { backgroundColor: "#fef3c7" },
  statusBad: { backgroundColor: "#fee2e2" },
  statusText: { fontSize: FontSize.xs, fontWeight: "900", color: Colors.text },
  dateLine: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: "700" },
  actionsRow: { flexDirection: "row", gap: Spacing.xs, flexWrap: "wrap" },
  actionBtn: {
    flexGrow: 1,
    minHeight: 40,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
  },
  actionSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  actionText: { fontSize: FontSize.xs, fontWeight: "900", color: Colors.text },
  disabled: { opacity: 0.6 },
  section: { gap: Spacing.sm },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: "900", color: Colors.text },
  sectionBody: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  passengerRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  passengerIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primaryBg,
    alignItems: "center",
    justifyContent: "center",
  },
  passengerName: { fontSize: FontSize.sm, fontWeight: "900", color: Colors.text },
  muted: { fontSize: FontSize.xs, color: Colors.textTertiary },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.md,
    paddingVertical: 2,
  },
  infoLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: "700" },
  infoValue: { flex: 1, textAlign: "right", fontSize: FontSize.sm, color: Colors.text },
  infoStrong: { fontWeight: "900" },
  linkRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  linkTitle: { fontSize: FontSize.sm, fontWeight: "900", color: Colors.text },
  footerActions: { flexDirection: "row", gap: Spacing.sm },
  primaryBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing.xs,
  },
  primaryBtnText: { color: "#fff", fontSize: FontSize.sm, fontWeight: "900" },
  deleteBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: "#fff1f2",
    borderWidth: 1,
    borderColor: "#fecdd3",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing.xs,
  },
  deleteText: { color: Colors.error, fontSize: FontSize.sm, fontWeight: "900" },
  errorTitle: { fontSize: FontSize.md, color: Colors.text, fontWeight: "800", textAlign: "center" },
  retryBtn: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  retryText: { color: "#fff", fontWeight: "900" },
});
