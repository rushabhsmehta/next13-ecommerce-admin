"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { MoreHorizontal, Trash } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import axios from "axios";
import { toast } from "react-hot-toast";

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
import { AlertModal } from "@/components/modals/alert-modal";

interface ExpensesListTableProps {
  data: any[];
}

export const ExpensesListTable: React.FC<ExpensesListTableProps> = ({ data }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);

  // Handle delete confirmation
  const onDelete = async () => {
    if (!expenseToDelete) return;
    
    try {
      setLoading(true);
      await axios.delete(`/api/expenses/${expenseToDelete}`);
      router.refresh();
      toast.success('Expense deleted successfully');
    } catch (error) {
      toast.error('Something went wrong');
      console.error("Failed to delete expense:", error);
    } finally {
      setLoading(false);
      setOpen(false);
      setExpenseToDelete(null);
    }
  };

  // Function to open delete confirmation modal
  const handleDeleteClick = (id: string) => {
    setExpenseToDelete(id);
    setOpen(true);
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
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No expenses found
                </TableCell>
              </TableRow>
            )}
            {data.map((expense) => (
              <TableRow key={expense.id} className="hover:bg-muted/30">
                <TableCell>{format(new Date(expense.expenseDate), "MMM d, yyyy")}</TableCell>
                <TableCell>{expense.expenseCategory?.name || "N/A"}</TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {expense.description || "No description"}
                </TableCell>
                <TableCell className="text-right font-medium text-red-600">{formatPrice(expense.amount)}</TableCell>
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
                      <DropdownMenuItem onClick={() => router.push(`/expenses/${expense.id}`)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteClick(expense.id)}
                        className="text-red-600 focus:bg-red-50"
                      >
                        <Trash className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

