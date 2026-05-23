import { useEffect, useMemo, useRef, useState } from "react";
import { Stack, useLocalSearchParams } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { AdminLoadingState } from "@/components/admin";
import { ApiError, withAuth } from "@/lib/api";
import { createTourPackagesClient } from "@/lib/tour-packages";
import { TourPackagePricingForm } from "@/components/tour-packages/TourPackagePricingForm";

export default function NewTourPackagePricingScreen() {
  return (
    <PermissionGate permission="operations.write">
      <Inner />
    </PermissionGate>
  );
}

function Inner() {
  const { id: packageId } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const client = useMemo(
    () => createTourPackagesClient(withAuth(() => getTokenRef.current())),
    []
  );

  const [locationId, setLocationId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!packageId) return;
    void (async () => {
      try {
        const pkg = await client.get(packageId);
        setLocationId(pkg.locationId);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, [packageId, client]);

  if (loading || !packageId) {
    return <AdminLoadingState label="Loading…" testID="tour-pricing-new-loading" />;
  }

  return (
    <>
      <Stack.Screen options={{ title: "New pricing", headerShown: false }} />
      <TourPackagePricingForm packageId={packageId} locationId={locationId} mode="create" />
    </>
  );
}
