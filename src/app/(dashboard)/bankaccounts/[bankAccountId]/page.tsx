import prismadb from "@/lib/prismadb";
import { BankAccountForm } from "./components/bank-account-form";

const BankAccountPage = async ({ 
  params 
}: { 
  params: { bankAccountId: string } 
}) => {
  const bankAccount = await prismadb.bankAccount.findUnique({
    where: {
      id: params.bankAccountId
    }
  });

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <BankAccountForm initialData={bankAccount} />
      </div>
    </div>
  );
}

export default BankAccountPage;
