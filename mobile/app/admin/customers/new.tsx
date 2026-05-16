import { PermissionGate } from "@/components/auth/PermissionGate";
import { CustomerForm } from "@/components/customers/CustomerForm";

export default function NewCustomerScreen() {
  return (
    <PermissionGate permission="crm.write">
      <CustomerForm mode="create" />
    </PermissionGate>
  );
}
