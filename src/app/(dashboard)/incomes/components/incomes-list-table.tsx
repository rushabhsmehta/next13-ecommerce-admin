"use client";

import { useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { MoreHorizontal } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { AlertModal } from "@/components/modals/alert-modal";

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

interface IncomesListTableProps {
  data: any[];
}

export const IncomesListTable: React.FC<IncomesListTableProps> = ({ data }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [incomeToDelete, setIncomeToDelete] = useState<string | null>(null);

  // Handle delete confirmation
  const onDelete = async () => {
    if (!incomeToDelete) return;

    try {
      setLoading(true);
      await axios.delete(`/api/incomes/${incomeToDelete}`);
      router.refresh();
      toast.success('Income deleted successfully');
    } catch (error) {
      toast.error('Something went wrong');
      console.error("Failed to delete income:", error);
    } finally {
      setLoading(false);
      setOpen(false);
      setIncomeToDelete(null);
    }
  };

  return (
    <div className="rounded-md border">
      <AlertModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={onDelete}
        loading={loading}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No incomes found
              </TableCell>
            </TableRow>
          )}
          {data.map((income) => (
            <TableRow key={income.id}>
              <TableCell>{format(new Date(income.incomeDate), "MMM d, yyyy")}</TableCell>
              <TableCell>{income.incomeCategory?.name || "Uncategorized"}</TableCell>
              <TableCell>
                {income.bankAccount?.accountName || income.cashAccount?.accountName || "N/A"}
              </TableCell>
              <TableCell className="max-w-[200px] truncate">
                {income.description || "No description"}
              </TableCell>
              <TableCell className="text-right font-medium text-green-600">{formatPrice(income.amount)}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => {
                        setIncomeToDelete(income.id);
                        setOpen(true);
                      }}
                    >
                      Delete
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push(`/incomes/${income.id}/edit`)}
                    >
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

