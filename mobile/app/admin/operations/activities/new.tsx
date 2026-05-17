import { PermissionGate } from "@/components/auth/PermissionGate";
import { MasterRecordForm } from "@/components/operations/MasterRecordForm";

export default function NewActivityScreen() {
  return (
    <PermissionGate permission="operations.write">
      <MasterRecordForm kind="activity" mode="create" />
    </PermissionGate>
  );
}
