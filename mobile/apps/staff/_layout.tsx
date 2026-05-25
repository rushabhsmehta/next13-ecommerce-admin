import { AppProviders } from "@/components/app/AppProviders";
import { StaffStack } from "@/components/app/VariantStacks";

export default function StaffRootLayout() {
  return (
    <AppProviders variant="staff">
      <StaffStack />
    </AppProviders>
  );
}
