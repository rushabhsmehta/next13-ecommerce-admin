"use client";

import { formatPrice } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit, FileText } from "lucide-react";

type SupplierTransaction = {
  id: string;
  date: Date;
  type: string;
  description: string;
  amount: number;
  isInflow: boolean;
  reference: string;
  packageId?: string;
  packageName?: string;
  paymentMode?: string;
  accountName?: string;
  balance: number;
};

interface TransactionsTableProps {
  data: SupplierTransaction[];
}

export const TransactionsTable: React.FC<TransactionsTableProps> = ({ data }) => {
  const router = useRouter();

  const navigateToTransaction = (transaction: SupplierTransaction) => {
    // Navigate to the appropriate transaction page based on the type
    if (transaction.type === "Purchase") {
      router.push(`/purchases/${transaction.id}`);
    } else if (transaction.type === "Payment") {
      router.push(`/payments/${transaction.id}`);
    }
  };
  
  const handleGenerateVoucher = (transaction: SupplierTransaction) => {
    if (transaction.type === "Purchase") {
      router.push(`/purchases/${transaction.id}/voucher`);
    } else if (transaction.type === "Payment") {
      router.push(`/payments/${transaction.id}/voucher`);
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Purchase</TableHead>
            <TableHead className="text-right">Payment</TableHead>
            <TableHead className="text-right">Balance</TableHead>
            <TableHead className="w-[70px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                No transactions found
              </TableCell>
            </TableRow>
          ) : (
            <>
              {data.map((transaction) => (
                <TableRow key={`${transaction.type}-${transaction.id}`}>
                  <TableCell>{format(new Date(transaction.date), "MMM dd, yyyy")}</TableCell>
                  <TableCell>{transaction.type}</TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell className="text-right">
                    {transaction.isInflow ? formatPrice(transaction.amount) : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {!transaction.isInflow ? formatPrice(transaction.amount) : "-"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatPrice(transaction.balance)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => router.push(`/${transaction.type.toLowerCase()}s/${transaction.id}`)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => router.push(`/${transaction.type.toLowerCase()}s/${transaction.id}/voucher`)}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Generate Voucher
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
