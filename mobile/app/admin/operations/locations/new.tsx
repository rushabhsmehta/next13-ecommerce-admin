import { PermissionGate } from "@/components/auth/PermissionGate";
import { LocationForm } from "@/components/operations/LocationForm";

export default function NewLocationScreen() {
  return (
    <PermissionGate permission="operations.write">
      <LocationForm mode="create" />
    </PermissionGate>
  );
}
