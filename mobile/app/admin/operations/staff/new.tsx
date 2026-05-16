import { PermissionGate } from "@/components/auth/PermissionGate";
import { StaffForm } from "@/components/operations/StaffForm";

export default function NewStaffScreen() {
  return (
    <PermissionGate permission="operations.write">
      <StaffForm mode="create" />
    </PermissionGate>
  );
}
