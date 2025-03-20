"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { MoreHorizontal } from "lucide-react";
import { formatPrice } from "@/lib/utils";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

interface ReceiptsListTableProps {
  data: any[];
}

export const ReceiptsListTable: React.FC<ReceiptsListTableProps> = ({ data }) => {
  const router = useRouter();

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Note</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No receipts found
              </TableCell>
            </TableRow>
          )}
          {data.map((receipt) => (
            <TableRow key={receipt.id} className="hover:bg-muted/30">
              <TableCell>{format(new Date(receipt.receiptDate), "MMM d, yyyy")}</TableCell>
              <TableCell>{receipt.customer?.name || "N/A"}</TableCell>
              <TableCell>{receipt.reference || "N/A"}</TableCell>
              <TableCell className="max-w-[200px] truncate">
                {receipt.note || "No notes"}
              </TableCell>
              <TableCell className="text-right font-medium text-emerald-600">{formatPrice(receipt.amount)}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => router.push(`/receipts/${receipt.id}`)}>
                      Edit
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

