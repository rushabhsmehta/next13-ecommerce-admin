import { useEffect, useMemo, useRef, useState } from "react";
import { Stack, useLocalSearchParams } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { AdminErrorState, AdminLoadingState } from "@/components/admin";
import { ApiError, withAuth } from "@/lib/api";
import { createTourPackagesClient } from "@/lib/tour-packages";
import { TourPackagePricingForm } from "@/components/tour-packages/TourPackagePricingForm";

export default function EditTourPackagePricingScreen() {
  return (
    <PermissionGate permission="operations.write">
      <Inner />
    </PermissionGate>
  );
}

function Inner() {
  const { id: packageId, pricingId } = useLocalSearchParams<{
    id: string;
    pricingId: string;
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
  }, [packageId, pricingId, client]);

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
        initial={initial}
      />
    </>
  );
}
