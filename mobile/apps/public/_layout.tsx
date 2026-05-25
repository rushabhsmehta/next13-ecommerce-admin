import { AppProviders } from "@/components/app/AppProviders";
import { PublicStack } from "@/components/app/VariantStacks";

export default function PublicRootLayout() {
  return (
    <AppProviders variant="public">
      <PublicStack />
    </AppProviders>
  );
}
