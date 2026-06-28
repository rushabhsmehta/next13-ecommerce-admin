import { useLocalSearchParams } from "expo-router";
import { TourQueryVariantsPanel } from "@/components/tour-queries/TourQueryVariantsPanel";
import { firstRouteParam } from "@/lib/route-params";

export default function TourQueryVariantsScreen() {
  const { id: rawId } = useLocalSearchParams<{ id?: string | string[] }>();
  const id = firstRouteParam(rawId);
  if (!id) return null;
  return <TourQueryVariantsPanel queryId={id} />;
}
