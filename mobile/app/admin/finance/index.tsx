import { isFinanceApp } from "@/lib/app-variant";
import AccountsFinanceHub from "@/components/admin/AccountsFinanceHub";
import FinanceBrowseScreen from "./browse";

/** Finance app home: card hub. Other variants fall back to transaction browser. */
export default function FinanceHubScreen() {
  if (isFinanceApp()) {
    return <AccountsFinanceHub />;
  }
  return <FinanceBrowseScreen />;
}
