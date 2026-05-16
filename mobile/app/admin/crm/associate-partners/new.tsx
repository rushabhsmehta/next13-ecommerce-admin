import { PermissionGate } from "@/components/auth/PermissionGate";
import { AssociatePartnerForm } from "@/components/associate-partners/AssociatePartnerForm";

export default function NewAssociatePartnerScreen() {
  return (
    <PermissionGate permission="crm.write">
      <AssociatePartnerForm mode="create" />
    </PermissionGate>
  );
}
