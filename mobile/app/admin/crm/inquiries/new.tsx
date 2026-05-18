import { Stack, useRouter } from "expo-router";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { AdminScreen, AdminTopBar } from "@/components/admin";
import { CreateInquiryForm } from "@/components/inquiries/CreateInquiryForm";

export default function AdminNewInquiryScreen() {
  return (
    <PermissionGate permission="crm.write">
      <AdminNewInquiryInner />
    </PermissionGate>
  );
}

function AdminNewInquiryInner() {
  const router = useRouter();

  return (
    <AdminScreen scroll={false} testID="crm-new-inquiry-screen">
      <Stack.Screen options={{ headerShown: false }} />
      <AdminTopBar
        title="New inquiry"
        subtitle="CRM"
        onBackPress={() => router.back()}
        testID="crm-new-inquiry"
      />
      <CreateInquiryForm
        showAssociatePartnerPicker
        onCreated={(id) => router.replace(`/admin/crm/inquiries/${id}` as never)}
      />
    </AdminScreen>
  );
}
