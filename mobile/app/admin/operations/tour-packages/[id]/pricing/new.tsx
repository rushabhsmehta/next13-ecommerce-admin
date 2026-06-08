import { useEffect, useMemo, useRef, useState } from "react";
import { Stack, useLocalSearchParams } from "expo-router";
import { useAuth } from "@clerk/expo";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { AdminLoadingState } from "@/components/admin";
import { withAuth } from "@/lib/api";
import { createTourPackagesClient } from "@/lib/tour-packages";
import { TourPackagePricingForm } from "@/components/tour-packages/TourPackagePricingForm";

function firstParam(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function NewTourPackagePricingScreen() {
  return (
    <PermissionGate permission="operations.write">
      <Inner />
    </PermissionGate>
  );
}

function Inner() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    packageVariantId?: string | string[];
    variantName?: string | string[];
  }>();
  const packageId = firstParam(params.id);
  const packageVariantId = firstParam(params.packageVariantId);
  const requestedVariantName = firstParam(params.variantName);
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
  const [variantName, setVariantName] = useState(requestedVariantName ?? "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!packageId) return;
    void (async () => {
      try {
        const pkg = await client.get(packageId);
        setLocationId(pkg.locationId);
        if (packageVariantId) {
          try {
            const variant = await client.getVariant(packageId, packageVariantId);
            setVariantName(variant.name);
          } catch {
            /* keep the route-provided variant name if lookup fails */
          }
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, [packageId, packageVariantId, client]);

  if (loading || !packageId) {
    return <AdminLoadingState label="Loading…" testID="tour-pricing-new-loading" />;
  }

  return (
    <>
      <Stack.Screen options={{ title: "New pricing", headerShown: false }} />
      <TourPackagePricingForm
        packageId={packageId}
        locationId={locationId}
        mode="create"
        lockedVariant={
          packageVariantId ? { id: packageVariantId, name: variantName } : undefined
        }
      />
    </>
  );
}
