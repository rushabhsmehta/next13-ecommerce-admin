"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/utils";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { 
  MoreHorizontal, 
  Eye, 
  CreditCard, 
  Edit, 
  Calendar,
  DollarSign,
  Tag,
  FileText
} from "lucide-react";
import Link from "next/link";

interface AccruedExpensesTableProps {
  expenses: any[];
  onPayExpense: (expense: any) => void;
}

export const AccruedExpensesTable: React.FC<AccruedExpensesTableProps> = ({
  expenses,
  onPayExpense,
}) => {
  if (expenses.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <CreditCard className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Accrued Expenses</h3>
          <p className="text-gray-500 text-center mb-4">
            There are currently no accrued expenses to display.
          </p>
          <Link href="/expenses/new">
            <Button>
              Add New Expense
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50">
                <TableHead className="font-semibold text-gray-700">Accrued Date</TableHead>
                <TableHead className="font-semibold text-gray-700">Category</TableHead>
                <TableHead className="font-semibold text-gray-700">Description</TableHead>
                <TableHead className="font-semibold text-gray-700">Tour</TableHead>
                <TableHead className="font-semibold text-gray-700 text-right">Amount</TableHead>
                <TableHead className="font-semibold text-gray-700">Status</TableHead>
                <TableHead className="font-semibold text-gray-700 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id} className="hover:bg-gray-50/50">
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">
                        {format(new Date(expense.accruedDate), "MMM d, yyyy")}
                      </span>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Tag className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">
                        {expense.expenseCategory?.name || "Uncategorized"}
                      </span>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span className="max-w-[200px] truncate">
                        {expense.description || "No description"}
                      </span>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    {expense.tourPackageQuery?.tourPackage?.name ? (
                      <Badge variant="outline" className="font-normal">
                        {expense.tourPackageQuery.tourPackage.name}
                      </Badge>
                    ) : (
                      <span className="text-gray-400 text-sm">No tour</span>
                    )}
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span className="font-semibold text-red-600">
                        {formatPrice(expense.amount)}
                      </span>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                      Accrued
                    </Badge>
                  </TableCell>
                  
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
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem asChild>
                          <Link href={`/expenses/${expense.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem asChild>
                          <Link href={`/expenses/${expense.id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Expense
                          </Link>
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem 
                          onClick={() => onPayExpense(expense)}
                          className="text-green-600 focus:text-green-600"
                        >
                          <CreditCard className="mr-2 h-4 w-4" />
                          Mark as Paid
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
