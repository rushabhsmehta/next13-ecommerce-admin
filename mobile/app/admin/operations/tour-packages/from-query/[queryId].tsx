import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@clerk/expo";
import { ApiError, withAuth } from "@/lib/api";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { AdminErrorState, AdminScreen, AdminTopBar } from "@/components/admin";
import { Colors, Spacing } from "@/constants/theme";
import { TourPackageForm } from "@/components/tour-packages/TourPackageForm";
import { createTourPackageFromQueryClient } from "@/lib/tour-package-from-query";

export default function TourPackageFromQueryScreen() {
  return (
    <PermissionGate permission="operations.write">
      <Inner />
    </PermissionGate>
  );
}

function Inner() {
  const router = useRouter();
  const { queryId } = useLocalSearchParams<{ queryId?: string }>();
  const resolvedQueryId = typeof queryId === "string" ? queryId : "";
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const client = useMemo(
    () => createTourPackageFromQueryClient(withAuth(() => getTokenRef.current())),
    []
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initial, setInitial] = useState<
    React.ComponentProps<typeof TourPackageForm>["initial"] | null
  >(null);

  const load = useCallback(async () => {
    if (!resolvedQueryId) {
      setError("Missing query id.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const prefill = await client.loadPrefill(resolvedQueryId);
      setInitial({
        locationId: prefill.locationId,
        locationLabel: prefill.locationLabel,
        tourPackageName: prefill.tourPackageName,
        tourPackageType: prefill.tourPackageType,
        tourCategory: prefill.tourCategory,
        numDaysNight: prefill.numDaysNight,
        transport: prefill.transport,
        pickup_location: prefill.pickup_location,
        drop_location: prefill.drop_location,
        price: prefill.price,
        itineraries: prefill.itineraries,
        images: prefill.images,
        pricingSection: prefill.pricingSection,
        inclusions: prefill.inclusions,
        exclusions: prefill.exclusions,
        importantNotes: prefill.importantNotes,
        paymentPolicy: prefill.paymentPolicy,
        usefulTip: prefill.usefulTip,
        cancellationPolicy: prefill.cancellationPolicy,
        airlineCancellationPolicy: prefill.airlineCancellationPolicy,
        termsconditions: prefill.termsconditions,
        kitchenGroupPolicy: prefill.kitchenGroupPolicy,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load query data.");
    } finally {
      setLoading(false);
    }
  }, [client, resolvedQueryId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <AdminScreen testID="tour-package-from-query-screen">
        <Stack.Screen options={{ title: "Create package", headerShown: false }} />
        <ActivityIndicator style={{ marginTop: Spacing.xl }} color={Colors.primary} />
      </AdminScreen>
    );
  }

  if (error || !initial) {
    return (
      <AdminScreen testID="tour-package-from-query-screen">
        <Stack.Screen options={{ title: "Create package", headerShown: false }} />
        <AdminTopBar
          title="Create tour package"
          onBackPress={() => router.back()}
          testID="tour-package-from-query-header"
        />
        <AdminErrorState
          message={error ?? "Could not prepare package data."}
          onRetry={() => void load()}
          testID="tour-package-from-query-error"
        />
      </AdminScreen>
    );
  }

  return (
    <View style={styles.container} testID="tour-package-from-query-screen">
      <Stack.Screen options={{ title: "Create package", headerShown: false }} />
      <TourPackageForm mode="create" initial={initial} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
});
