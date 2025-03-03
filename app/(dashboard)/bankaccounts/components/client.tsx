'use client'

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { BankAccountColumn, columns } from "./columns";

interface BankAccountsClientProps {
  data: BankAccountColumn[];
}

export const BankAccountsClient: React.FC<BankAccountsClientProps> = ({
  data
}) => {
  const router = useRouter();

  return (
    <>
      <div className="flex items-center justify-between">
        <Heading title={`Bank Accounts (${data.length})`} description="Manage bank accounts" />
        <Button onClick={() => router.push(`/bankaccounts/new`)}>
          <Plus className="mr-2 h-4 w-4" /> Add New
        </Button>
      </div>
      <Separator />
      <DataTable searchKey="accountName" columns={columns} data={data} />
    </>
  );
};
