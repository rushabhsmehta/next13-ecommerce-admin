"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import axios from "axios";
import { toast } from "react-hot-toast";
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
  DropdownMenuLabel,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit, FileText, Trash } from "lucide-react";
import { AlertModal } from "@/components/modals/alert-modal";

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
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<SupplierTransaction | null>(null);

  const onDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      setLoading(true);
      
      // Delete appropriate record based on transaction type
      if (itemToDelete.type === "Purchase") {
        await axios.delete(`/api/purchases/${itemToDelete.id}`);
        toast.success('Purchase deleted.');
      } else if (itemToDelete.type === "Payment") {
        await axios.delete(`/api/payments/${itemToDelete.id}`);
        toast.success('Payment deleted.');
      }
      
      router.refresh();
    } catch (error) {
      toast.error('Something went wrong.');
    } finally {
      setLoading(false);
      setOpen(false);
      setItemToDelete(null);
    }
  };

  return (
    <>
      <AlertModal 
        isOpen={open} 
        onClose={() => setOpen(false)}
        onConfirm={onDelete}
        loading={loading}
      />
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
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem 
                            onClick={() => router.push(`/${transaction.type.toLowerCase()}s/${transaction.id}`)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => router.push(`/${transaction.type.toLowerCase()}s/${transaction.id}/voucher`)}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            View Voucher
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              setItemToDelete(transaction);
                              setOpen(true);
                            }}
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
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
    </>
  );
};
