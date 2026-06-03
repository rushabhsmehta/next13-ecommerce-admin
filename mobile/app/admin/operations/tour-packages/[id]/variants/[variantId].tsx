import { useEffect, useMemo, useRef, useState } from "react";
import { Stack, useLocalSearchParams } from "expo-router";
import { useAuth } from "@clerk/expo";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { AdminErrorState, AdminLoadingState } from "@/components/admin";
import { ApiError, withAuth } from "@/lib/api";
import { createTourPackagesClient } from "@/lib/tour-packages";
import { PackageVariantForm } from "@/components/tour-packages/PackageVariantForm";

export default function EditVariantScreen() {
  return (
    <PermissionGate permission="operations.write">
      <Inner />
    </PermissionGate>
  );
}

function Inner() {
  const { id: packageId, variantId } = useLocalSearchParams<{
    id: string;
    variantId: string;
  }>();
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
  const [initial, setInitial] = useState<Parameters<typeof PackageVariantForm>[0]["initial"]>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!packageId || !variantId) return;
    void (async () => {
      try {
        const [pkg, variant] = await Promise.all([
          client.get(packageId),
          client.getVariant(packageId, variantId),
        ]);
        setLocationId(pkg.locationId);
        setItineraries(pkg.itineraries);
        setInitial({
          name: variant.name,
          description: variant.description ?? "",
          isDefault: variant.isDefault,
          sortOrder: variant.sortOrder,
          priceModifier: String(variant.priceModifier ?? 0),
          hotelMappings: variant.hotelMappings.map((m) => ({
            itineraryId: m.itineraryId,
            hotelId: m.hotelId,
            hotelName: m.hotelName,
          })),
        });
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load variant.");
      } finally {
        setLoading(false);
      }
    })();
  }, [packageId, variantId, client]);

  if (loading) {
    return <AdminLoadingState label="Loading variant…" testID="variant-edit-loading" />;
  }
  if (error || !packageId || !variantId || !initial) {
    return <AdminErrorState message={error ?? "Variant not found"} />;
  }

  return (
    <>
      <Stack.Screen options={{ title: "Edit variant", headerShown: false }} />
      <PackageVariantForm
        packageId={packageId}
        locationId={locationId}
        mode="edit"
        variantId={variantId}
        initial={initial}
        itineraries={itineraries}
      />
    </>
  );
}
