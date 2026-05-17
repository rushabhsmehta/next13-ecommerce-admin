import { PermissionGate } from "@/components/auth/PermissionGate";
import { TransportPricingForm } from "@/components/operations/TransportPricingForm";

export default function NewTransportPricingScreen() {
  return (
    <PermissionGate permission="operations.write">
      <TransportPricingForm mode="create" />
    </PermissionGate>
  );
}
