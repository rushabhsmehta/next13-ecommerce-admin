import { useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AdminLoadingState, AdminScreen } from "@/components/admin";

/**
 * Legacy route: query-level pricing was removed in favor of variant pricing.
 * Redirect deep links to the variants panel.
 */
export default function TourQueryPricingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    if (!id) return;
    router.replace(`/admin/tour-queries/${id}/variants` as never);
  }, [id, router]);

  return (
    <AdminScreen testID="tour-query-pricing-redirect">
      <AdminLoadingState label="Opening variants…" testID="tour-query-pricing-redirect-loading" />
    </AdminScreen>
  );
}
