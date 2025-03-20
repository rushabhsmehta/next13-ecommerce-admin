'use client'

import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Edit, PlusCircleIcon, Trash2, User as UserIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ExpenseFormDialog } from "@/components/forms/expense-form-dialog"; // Updated path
import DeleteConfirmation from "./delete-confirmation";
import { formatPrice } from "@/lib/utils";
import toast from 'react-hot-toast';
import { BankAccount, CashAccount, ExpenseCategory, ExpenseDetail } from '@prisma/client';

interface ExpensesSectionProps {
  expensesData: ExpenseDetail[];
  expenseCategories: ExpenseCategory[];
  bankAccounts: BankAccount[];
  cashAccounts: CashAccount[];
  tourPackageId: string;
  tourPackageName: string;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const ExpensesSection: React.FC<ExpensesSectionProps> = ({
  expensesData,
  expenseCategories,
  bankAccounts,
  cashAccounts,
  tourPackageId,
  tourPackageName,
  onRefresh,
  isRefreshing
}) => {
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [itemToDelete, setItemToDelete] = useState<{id: string, type: string} | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Calculate totals
  const totalExpenses = expensesData.reduce((sum, expense) => sum + expense.amount, 0);
  
  // Function to handle edit
  const handleEdit = (expense: any) => {
    setEditItem(expense);
    setIsExpenseModalOpen(true);
  };
  
  // Function to handle delete
  const handleDelete = (id: string) => {
    setItemToDelete({ id, type: 'expense' });
    setIsDeleteDialogOpen(true);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-red-800">Expense Records</h3>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-red-800 border-red-800">
            {expensesData.length} records
          </Badge>
          <Button 
            onClick={() => {
              setEditItem(null);
              setIsExpenseModalOpen(true);
            }}
            size="sm"
            variant="outline"
            className="text-red-600 border-red-600 hover:bg-red-50"
          >
            <PlusCircleIcon className="h-4 w-4 mr-1" />
            Add Expense
          </Button>
        </div>
      </div>
      
      {expensesData.length > 0 ? (
        <Card className="shadow-lg rounded-lg border-l-4 border-red-500">
          <CardHeader className="py-3 bg-gray-50">
            <CardTitle className="text-sm font-medium grid grid-cols-[2fr_1fr_1fr_2fr_80px] gap-4">
              <div>Category</div>
              <div>Date</div>
              <div>Amount</div>
              <div>Description</div>
              <div>Actions</div>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[250px] overflow-y-auto p-0">
            {expensesData.map((expense) => (
              <div key={expense.id} 
                className="grid grid-cols-[2fr_1fr_1fr_2fr_80px] gap-4 items-center p-3 border-b last:border-0 hover:bg-gray-50">
                <div className="font-medium flex items-center">
                  <UserIcon className="h-4 w-4 mr-1 text-gray-500" />
                  {expenseCategories.find(cat => cat.id === expense.expenseCategoryId)?.name || 'N/A'}
                </div>
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-1 text-gray-500" />
                  {format(new Date(expense.expenseDate), "dd MMM yyyy")}
                </div>
                <div className="font-bold text-red-700">
                  <div>{formatPrice(expense.amount)}</div>
                </div>
                <div className="truncate text-gray-600">{expense.description || 'No description'}</div>
                <div className="flex justify-center">
                  <div className="flex space-x-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleEdit(expense)}
                      className="h-7 w-7 p-0"
                    >
                      <Edit className="h-3.5 w-3.5 text-blue-600" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDelete(expense.id)}
                      className="h-7 w-7 p-0"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-600" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
          <CardContent className="border-t bg-gray-50 py-2">
            <div className="flex justify-end items-center space-x-4">
              <div className="text-sm">
                <span className="text-gray-500">Total Expenses:</span>
                <span className="ml-2 font-bold text-red-700">{formatPrice(totalExpenses)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <p className="text-gray-500 italic">No expense records available</p>
      )}
      
      {/* Expense Entry/Edit Dialog */}
      <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editItem ? "Edit Expense" : "Add New Expense"}
            </DialogTitle>
            <DialogDescription>
              {editItem ? "Edit expense details" : "Create a new expense for this tour package."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            <ExpenseFormDialog
              initialData={editItem || {
                tourPackageQueryId: tourPackageId,
                tourPackageQuery: {
                  tourPackageQueryName: tourPackageName
                }
              }}
              expenseCategories={expenseCategories}
              bankAccounts={bankAccounts}
              cashAccounts={cashAccounts}
              onSuccess={() => {
                setIsExpenseModalOpen(false);
                onRefresh();
                toast.success(editItem ? "Expense updated successfully" : "Expense created successfully");
              }}
              submitButtonText={editItem ? "Update Expense" : "Create Expense"}
            />
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <DeleteConfirmation 
        isOpen={isDeleteDialogOpen}
        setIsOpen={setIsDeleteDialogOpen}
        itemToDelete={itemToDelete}
        onConfirmDelete={onRefresh}
      />
    </div>
  );
};

export default ExpensesSection;
