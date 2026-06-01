import { Redirect } from "expo-router";

export default function FinanceIndex() {
  return <Redirect href={"/admin/finance" as never} />;
}
