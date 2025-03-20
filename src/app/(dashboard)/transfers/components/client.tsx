"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { DataTable } from "@/components/ui/data-table";
import { columns, TransferColumn } from "./columns";
import { TransferModal } from "./transfer-modal";
import { TransferDetailsModal } from "./transfer-details-modal";
import { BankAccount, CashAccount } from "@prisma/client";
import { ApiList } from "@/components/ui/api-list";

interface TransferClientProps {
  data: TransferColumn[];
  bankAccounts: BankAccount[];
  cashAccounts: CashAccount[];
}

export const TransferClient: React.FC<TransferClientProps> = ({
  data,
  bankAccounts,
  cashAccounts
}) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TransferModal 
        bankAccounts={bankAccounts}
        cashAccounts={cashAccounts}
        isOpen={open}
        onClose={() => setOpen(false)}
      />
      <TransferDetailsModal />
      <div className="flex items-center justify-between">
        <Heading title={`Fund Transfers (${data.length})`} description="Manage fund transfers between accounts" />
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Transfer
        </Button>
      </div>
      <Separator />
      <DataTable searchKey="reference" columns={columns} data={data} />
      <Heading title="API" description="API calls for transfers" />
      <Separator />
      <ApiList entityName="transfers" entityIdName="transferId" />
    </>
  );
};

