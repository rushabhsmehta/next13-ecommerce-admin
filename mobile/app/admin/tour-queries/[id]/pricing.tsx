import { useLocalSearchParams } from "expo-router";
import { TourQueryPricingPanel } from "@/components/tour-queries/TourQueryPricingPanel";

export default function TourQueryPricingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;
  return <TourQueryPricingPanel queryId={id} />;
}
