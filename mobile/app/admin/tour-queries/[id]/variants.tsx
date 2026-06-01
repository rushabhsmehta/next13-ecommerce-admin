import { useLocalSearchParams } from "expo-router";
import { TourQueryVariantsPanel } from "@/components/tour-queries/TourQueryVariantsPanel";

export default function TourQueryVariantsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;
  return <TourQueryVariantsPanel queryId={id} />;
}
