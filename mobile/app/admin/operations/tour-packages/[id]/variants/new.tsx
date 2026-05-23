import { useEffect, useMemo, useRef, useState } from "react";
import { Stack, useLocalSearchParams } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { AdminLoadingState } from "@/components/admin";
import { ApiError, withAuth } from "@/lib/api";
import { createTourPackagesClient } from "@/lib/tour-packages";
import { PackageVariantForm } from "@/components/tour-packages/PackageVariantForm";

export default function NewVariantScreen() {
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
  const [itineraries, setItineraries] = useState<
    { id: string; dayNumber: number | null; itineraryTitle: string | null }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!packageId) return;
    void (async () => {
      try {
        const pkg = await client.get(packageId);
        setLocationId(pkg.locationId);
        setItineraries(pkg.itineraries);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load package.");
      } finally {
        setLoading(false);
      }
    })();
  }, [packageId, client]);

  if (loading) {
    return <AdminLoadingState label="Loading…" testID="variant-new-loading" />;
  }
  if (error || !packageId) {
    return null;
  }

  return (
    <>
      <Stack.Screen options={{ title: "New variant", headerShown: false }} />
      <PackageVariantForm
        packageId={packageId}
        locationId={locationId}
        mode="create"
        itineraries={itineraries}
      />
    </>
  );
}
