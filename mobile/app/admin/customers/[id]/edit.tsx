import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Stack } from "expo-router";
import { useLocalSearchParams } from "expo-router";
import { useAuth } from "@clerk/expo";
import { ApiError, withAuth } from "@/lib/api";
import {
  AdminErrorState,
  AdminLoadingState,
  AdminScreen,
} from "@/components/admin";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { CustomerForm } from "@/components/customers/CustomerForm";
import { createCustomersClient } from "@/lib/customers";

export default function EditCustomerScreen() {
  return (
    <PermissionGate permission="crm.write">
      <EditCustomerScreenInner />
    </PermissionGate>
  );
}

function EditCustomerScreenInner() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const authRequest = useMemo(
    () => withAuth(() => getTokenRef.current()),
    []
  );
  const client = useMemo(() => createCustomersClient(authRequest), [authRequest]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initial, setInitial] = useState<{
    name: string;
    contact: string;
    email: string;
    associatePartnerId: string | null;
    associatePartnerName: string | null;
    birthdate: string;
    marriageAnniversary: string;
  } | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await client.get(id);
      setInitial({
        name: res.customer.name ?? "",
        contact: res.customer.contact ?? "",
        email: res.customer.email ?? "",
        associatePartnerId: res.customer.associatePartner?.id ?? null,
        associatePartnerName: res.customer.associatePartner?.name ?? null,
        birthdate: res.customer.birthdate
          ? res.customer.birthdate.substring(0, 10)
          : "",
        marriageAnniversary: res.customer.marriageAnniversary
          ? res.customer.marriageAnniversary.substring(0, 10)
          : "",
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load customer.");
    } finally {
      setLoading(false);
    }
  }, [id, client]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <AdminLoadingState label="Loading customer…" testID="customer-edit-loading" />;
  }
  if (error || !initial) {
    return (
      <AdminScreen testID="customer-edit-error">
        <Stack.Screen options={{ title: "Edit customer", headerShown: false }} />
        <AdminErrorState
          message={error ?? "Customer not found"}
          onRetry={() => void load()}
          testID="customer-edit-error-state"
        />
      </AdminScreen>
    );
  }

  return <CustomerForm mode="edit" customerId={id} initial={initial} />;
}
