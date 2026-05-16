import { PermissionGate } from "@/components/auth/PermissionGate";
import { SupplierForm } from "@/components/operations/SupplierForm";

export default function NewSupplierScreen() {
  return (
    <PermissionGate permission="operations.write">
      <SupplierForm mode="create" />
    </PermissionGate>
  );
}
