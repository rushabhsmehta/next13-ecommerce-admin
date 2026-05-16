import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { ApiError, withAuth } from "@/lib/api";
import { Colors, FontSize, Spacing } from "@/constants/theme";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { createCustomersClient } from "@/lib/customers";

export default function EditCustomerScreen() {
  return (
    <PermissionGate permission="crm.write">
      <EditCustomerScreenInner />
    </PermissionGate>
  );
}

function EditCustomerScreenInner() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const authRequest = useMemo(
    () => withAuth(() => getTokenRef.current()),
    []
  );
  const client = useMemo(() => createCustomersClient(authRequest), [authRequest]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initial, setInitial] = useState<{
    name: string;
    contact: string;
    email: string;
    associatePartnerId: string | null;
    associatePartnerName: string | null;
    birthdate: string;
    marriageAnniversary: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) return;
      try {
        const res = await client.get(id);
        if (cancelled) return;
        setInitial({
          name: res.customer.name ?? "",
          contact: res.customer.contact ?? "",
          email: res.customer.email ?? "",
          associatePartnerId: res.customer.associatePartner?.id ?? null,
          associatePartnerName: res.customer.associatePartner?.name ?? null,
          birthdate: res.customer.birthdate
            ? res.customer.birthdate.substring(0, 10)
            : "",
          marriageAnniversary: res.customer.marriageAnniversary
            ? res.customer.marriageAnniversary.substring(0, 10)
            : "",
        });
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Could not load customer.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id, client]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }
  if (error || !initial) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={42} color={Colors.error} />
        <Text style={styles.errorText}>{error ?? "Customer not found"}</Text>
      </View>
    );
  }

  return <CustomerForm mode="edit" customerId={id} initial={initial} />;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  errorText: { fontSize: FontSize.md, fontWeight: "700", color: Colors.text, textAlign: "center" },
});
