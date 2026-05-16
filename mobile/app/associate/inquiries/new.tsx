import { useRouter } from "expo-router";
import { CreateInquiryForm } from "@/components/inquiries/CreateInquiryForm";

export default function CreateAssociateInquiryScreen() {
  const router = useRouter();
  return (
    <CreateInquiryForm
      onCreated={(id) => router.replace(`/associate/inquiries/${id}` as never)}
    />
  );
}
