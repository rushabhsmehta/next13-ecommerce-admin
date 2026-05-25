import { AppProviders } from "@/components/app/AppProviders";
import { FinanceStack } from "@/components/app/VariantStacks";

export default function FinanceRootLayout() {
  return (
    <AppProviders variant="finance">
      <FinanceStack />
    </AppProviders>
  );
}
