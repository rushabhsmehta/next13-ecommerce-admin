import { PermissionGate } from "@/components/auth/PermissionGate";
import { MasterRecordForm } from "@/components/operations/MasterRecordForm";

export default function NewItineraryScreen() {
  return (
    <PermissionGate permission="operations.write">
      <MasterRecordForm kind="itinerary" mode="create" />
    </PermissionGate>
  );
}
