import { useLocalSearchParams } from "expo-router";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { HotelForm } from "@/components/operations/HotelForm";

export default function NewHotelScreen() {
  const { locationId } = useLocalSearchParams<{ locationId?: string }>();
  const defaultLocationId =
    typeof locationId === "string" ? locationId : undefined;

  return (
    <PermissionGate permission="operations.write">
      <HotelForm mode="create" defaultLocationId={defaultLocationId} />
    </PermissionGate>
  );
}
