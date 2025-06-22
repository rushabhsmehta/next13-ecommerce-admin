"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "./columns";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { formatLocalDate } from "@/lib/timezone-utils";

interface SaleReturnClientProps {
  data: any[];
}

export const SaleReturnClient: React.FC<SaleReturnClientProps> = ({
  data
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
    // Transform data for display
  const formattedData = data.map(item => ({
    id: item.id,
    date: formatLocalDate(item.returnDate, "MMMM d, yyyy"),
    customer: item.saleDetail?.customer?.name || "Unknown",
    amount: item.amount,
    gstAmount: item.gstAmount || 0,
    totalAmount: item.amount + (item.gstAmount || 0),
    status: item.status,
    reference: item.reference || "-",
    reason: item.returnReason || "-",
    originalSale: {
      id: item.saleDetailId,
      description: item.saleDetail?.description
    }
  }));

  return (
    <>
      <div className="flex items-center justify-between">
        <Button onClick={() => router.push(`/sale-returns/new`)}>
          <PlusIcon className="mr-2 h-4 w-4" /> Add New
        </Button>
      </div>
      <Separator />
      <DataTable columns={columns} data={formattedData} searchKey="customer" />
    </>
  );
};
