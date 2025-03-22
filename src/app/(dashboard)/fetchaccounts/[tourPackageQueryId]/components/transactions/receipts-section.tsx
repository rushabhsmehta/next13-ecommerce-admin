'use client'

import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Edit, PlusCircleIcon, Trash2, User as UserIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ReceiptFormWrapper } from "@/components/forms/receipt-form-wrapper"; // Updated import
import DeleteConfirmation from "./delete-confirmation";
import { formatPrice } from "@/lib/utils";
import toast from 'react-hot-toast';
import { BankAccount, CashAccount, Customer, ReceiptDetail } from '@prisma/client';

interface ReceiptsSectionProps {
  receiptsData: ReceiptDetail[];
  customers: Customer[];
  bankAccounts: BankAccount[];
  cashAccounts: CashAccount[];
  tourPackageId: string;
  tourPackageName: string;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const ReceiptsSection: React.FC<ReceiptsSectionProps> = ({
  receiptsData,
  customers,
  bankAccounts,
  cashAccounts,
  tourPackageId,
  tourPackageName,
  onRefresh,
  isRefreshing
}) => {
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [itemToDelete, setItemToDelete] = useState<{id: string, type: string} | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Calculate totals
  const totalReceipts = receiptsData.reduce((sum, receipt) => sum + receipt.amount, 0);
  
  // Function to handle edit
  const handleEdit = (receipt: any) => {
    setEditItem(receipt);
    setIsReceiptModalOpen(true);
  };
  
  // Function to handle delete
  const handleDelete = (id: string) => {
    setItemToDelete({ id, type: 'receipt' });
    setIsDeleteDialogOpen(true);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-emerald-800">Receipt Records</h3>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-emerald-800 border-emerald-800">
            {receiptsData.length} records
          </Badge>
          <Button 
            onClick={() => {
              setEditItem(null);
              setIsReceiptModalOpen(true);
            }}
            size="sm"
            variant="outline"
            className="text-emerald-600 border-emerald-600 hover:bg-emerald-50"
          >
            <PlusCircleIcon className="h-4 w-4 mr-1" />
            Add Receipt
          </Button>
        </div>
      </div>
      
      {receiptsData.length > 0 ? (
        <Card className="shadow-lg rounded-lg border-l-4 border-emerald-500">
          <CardHeader className="py-3 bg-gray-50">
            <CardTitle className="text-sm font-medium grid grid-cols-[2fr_1fr_1fr_2fr_80px] gap-4">
              <div>Customer</div>
              <div>Date</div>
              <div>Amount</div>
              <div>Description</div>
              <div>Actions</div>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[250px] overflow-y-auto p-0">
            {receiptsData.map((receipt) => (
              <div key={receipt.id} 
                className="grid grid-cols-[2fr_1fr_1fr_2fr_80px] gap-4 items-center p-3 border-b last:border-0 hover:bg-gray-50">
                <div className="font-medium flex items-center">
                  <UserIcon className="h-4 w-4 mr-1 text-gray-500" />
                  {customers.find(c => c.id === receipt.customerId)?.name || 'N/A'}
                </div>
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-1 text-gray-500" />
                  {format(new Date(receipt.receiptDate), "dd MMM yyyy")}
                </div>
                <div className="font-bold text-emerald-700">
                  <div>{formatPrice(receipt.amount)}</div>
                </div>
                <div className="truncate text-gray-600">{receipt.note || 'No description'}</div>
                <div className="flex justify-center">
                  <div className="flex space-x-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleEdit(receipt)}
                      className="h-7 w-7 p-0"
                    >
                      <Edit className="h-3.5 w-3.5 text-blue-600" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDelete(receipt.id)}
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
                <span className="text-gray-500">Total Receipts:</span>
                <span className="ml-2 font-bold text-emerald-700">{formatPrice(totalReceipts)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <p className="text-gray-500 italic">No receipt records available</p>
      )}
      
      {/* Receipt Entry/Edit Dialog */}
      <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editItem ? "Edit Receipt" : "Add New Receipt"}
            </DialogTitle>
            <DialogDescription>
              {editItem ? "Edit receipt details" : "Create a new receipt for this tour package."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            <ReceiptFormWrapper
              initialData={editItem || {
                tourPackageQueryId: tourPackageId,
                tourPackageQuery: {
                  tourPackageQueryName: tourPackageName
                }
              }}
              customers={customers}
              bankAccounts={bankAccounts}
              cashAccounts={cashAccounts}
              onSuccess={() => {
                setIsReceiptModalOpen(false);
                onRefresh();
                toast.success(editItem ? "Receipt updated successfully" : "Receipt created successfully");
              }}
              submitButtonText={editItem ? "Update Receipt" : "Create Receipt"}
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

export default ReceiptsSection;
