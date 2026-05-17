import { useLocalSearchParams } from "expo-router";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { DestinationForm } from "@/components/operations/DestinationForm";

export default function NewDestinationScreen() {
  const { locationId } = useLocalSearchParams<{ locationId?: string }>();
  const defaultLocationId =
    typeof locationId === "string" ? locationId : undefined;

  return (
    <PermissionGate permission="operations.write">
      <DestinationForm mode="create" defaultLocationId={defaultLocationId} />
    </PermissionGate>
  );
}
