import { useLocalSearchParams } from "expo-router";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { TourPackageForm } from "@/components/tour-packages/TourPackageForm";

export default function NewTourPackageScreen() {
  const { locationId } = useLocalSearchParams<{ locationId?: string }>();
  const defaultLocationId =
    typeof locationId === "string" ? locationId : undefined;

  return (
    <PermissionGate permission="operations.write">
      <TourPackageForm mode="create" defaultLocationId={defaultLocationId} />
    </PermissionGate>
  );
}
