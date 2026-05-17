import { PermissionGate } from "@/components/auth/PermissionGate";
import { VehicleTypeForm } from "@/components/operations/VehicleTypeForm";

export default function NewVehicleTypeScreen() {
  return (
    <PermissionGate permission="operations.write">
      <VehicleTypeForm mode="create" />
    </PermissionGate>
  );
}
