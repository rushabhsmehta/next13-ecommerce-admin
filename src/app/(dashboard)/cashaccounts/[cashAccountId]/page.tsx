import prismadb from "@/lib/prismadb";
import { CashAccountForm } from "./components/cash-account-form";

const CashAccountPage = async (props: { params: Promise<{ cashAccountId: string }> }) => {
  const params = await props.params;
  const activity = await prismadb.cashAccount.findUnique({
    where: {
      id: params.cashAccountId
    },
  });

  return (
    <>
      <div className="flex-col">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <CashAccountForm initialData={activity} />
        </div>
      </div>

    </>
  );
}

export default CashAccountPage;
