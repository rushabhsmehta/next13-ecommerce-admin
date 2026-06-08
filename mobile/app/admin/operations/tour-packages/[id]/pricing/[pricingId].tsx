import { useEffect, useMemo, useRef, useState } from "react";
import { Stack, useLocalSearchParams } from "expo-router";
import { useAuth } from "@clerk/expo";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { AdminErrorState, AdminLoadingState } from "@/components/admin";
import { ApiError, withAuth } from "@/lib/api";
import { createTourPackagesClient } from "@/lib/tour-packages";
import { TourPackagePricingForm } from "@/components/tour-packages/TourPackagePricingForm";

function firstParam(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function EditTourPackagePricingScreen() {
  return (
    <PermissionGate permission="operations.write">
      <Inner />
    </PermissionGate>
  );
}

function Inner() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    pricingId?: string | string[];
    packageVariantId?: string | string[];
    variantName?: string | string[];
  }>();
  const packageId = firstParam(params.id);
  const pricingId = firstParam(params.pricingId);
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
  const [initial, setInitial] =
    useState<Parameters<typeof TourPackagePricingForm>[0]["initial"]>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!packageId || !pricingId) return;
    void (async () => {
      try {
        const [pkg, pricing] = await Promise.all([
          client.get(packageId),
          client.getPricing(packageId, pricingId),
        ]);
        setLocationId(pkg.locationId);
        if (packageVariantId) {
          try {
            const variant = await client.getVariant(packageId, packageVariantId);
            setVariantName(variant.name);
          } catch {
            /* keep the route-provided variant name if lookup fails */
          }
        }
        setInitial({
          startDate: new Date(pricing.startDate),
          endDate: new Date(pricing.endDate),
          mealPlanId: pricing.mealPlanId,
          mealPlanName: pricing.mealPlanName,
          numberOfRooms: String(pricing.numberOfRooms),
          packageVariantId: pricing.packageVariantId ?? "",
          packageVariantName: pricing.packageVariantName ?? "",
          vehicleTypeId: pricing.vehicleTypeId ?? "",
          vehicleTypeName: pricing.vehicleTypeName ?? "",
          locationSeasonalPeriodId: pricing.locationSeasonalPeriodId ?? "",
          seasonalPeriodName: pricing.seasonalPeriodName ?? "",
          description: pricing.description ?? "",
          isGroupPricing: pricing.isGroupPricing,
          isActive: pricing.isActive,
          components: pricing.pricingComponents.map((c) => ({
            pricingAttributeId: c.pricingAttributeId,
            price: String(c.price),
            purchasePrice: c.purchasePrice != null ? String(c.purchasePrice) : "",
            description: c.description ?? "",
          })),
        });
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load pricing.");
      } finally {
        setLoading(false);
      }
    })();
  }, [packageId, pricingId, packageVariantId, client]);

  if (loading) {
    return <AdminLoadingState label="Loading pricing…" testID="tour-pricing-edit-loading" />;
  }
  if (error || !packageId || !pricingId || !initial) {
    return <AdminErrorState message={error ?? "Pricing not found"} />;
  }

  return (
    <>
      <Stack.Screen options={{ title: "Edit pricing", headerShown: false }} />
      <TourPackagePricingForm
        packageId={packageId}
        locationId={locationId}
        mode="edit"
        pricingId={pricingId}
        lockedVariant={
          packageVariantId ? { id: packageVariantId, name: variantName } : undefined
        }
        initial={initial}
      />
    </>
  );
}
