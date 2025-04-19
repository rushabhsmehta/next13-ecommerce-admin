'use client'

import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Edit, PlusCircleIcon, Trash2, User as UserIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PaymentFormWrapper } from "@/components/forms/payment-form-wrapper"; // Updated import
import DeleteConfirmation from "./delete-confirmation";
import { formatPrice } from "@/lib/utils";
import toast from 'react-hot-toast';
import { BankAccount, CashAccount, PaymentDetail, Supplier } from '@prisma/client';

interface PaymentsSectionProps {
  paymentsData: PaymentDetail[];
  suppliers: Supplier[];
  bankAccounts: BankAccount[];
  cashAccounts: CashAccount[];
  tourPackageId: string;
  tourPackageName: string;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const PaymentsSection: React.FC<PaymentsSectionProps> = ({
  paymentsData,
  suppliers,
  bankAccounts,
  cashAccounts,
  tourPackageId,
  tourPackageName,
  onRefresh,
  isRefreshing
}) => {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [itemToDelete, setItemToDelete] = useState<{id: string, type: string} | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Calculate totals
  const totalPayments = paymentsData.reduce((sum, payment) => sum + payment.amount, 0);
  
  // Function to handle edit
  const handleEdit = (payment: any) => {
    setEditItem(payment);
    setIsPaymentModalOpen(true);
  };
  
  // Function to handle delete
  const handleDelete = (id: string) => {
    setItemToDelete({ id, type: 'payment' });
    setIsDeleteDialogOpen(true);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-indigo-800">Payment Records</h3>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-indigo-800 border-indigo-800">
            {paymentsData.length} records
          </Badge>
          <Button 
            onClick={() => {
              setEditItem(null);
              setIsPaymentModalOpen(true);
            }}
            size="sm"
            variant="outline"
            className="text-indigo-600 border-indigo-600 hover:bg-indigo-50"
          >
            <PlusCircleIcon className="h-4 w-4 mr-1" />
            Add Payment
          </Button>
        </div>
      </div>
      
      {paymentsData.length > 0 ? (
        <Card className="shadow-lg rounded-lg border-l-4 border-indigo-500">
          <CardHeader className="py-3 bg-gray-50">
            <CardTitle className="text-sm font-medium grid grid-cols-[2fr_1fr_1fr_1fr_1fr_2fr_80px] gap-4">
              <div>Supplier</div>
              <div>Date</div>
              <div>Account Type</div>
              <div>Account Name</div>
              <div>Amount</div>
              <div>Description</div>
              <div>Actions</div>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[250px] overflow-y-auto p-0">
            {paymentsData.map((payment) => {
              const isBank = !!payment.bankAccountId;
              const accountType = isBank ? "Bank" : payment.cashAccountId ? "Cash" : "-";
              const accountName = isBank
                ? bankAccounts.find(b => b.id === payment.bankAccountId)?.accountName || "-"
                : payment.cashAccountId
                  ? cashAccounts.find(c => c.id === payment.cashAccountId)?.accountName || "-"
                  : "-";
              return (
                <div key={payment.id}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_2fr_80px] gap-4 items-center p-3 border-b last:border-0 hover:bg-gray-50">
                  <div className="font-medium flex items-center">
                    <UserIcon className="h-4 w-4 mr-1 text-gray-500" />
                    {suppliers.find(s => s.id === payment.supplierId)?.name || 'N/A'}
                  </div>
                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-1 text-gray-500" />
                    {format(new Date(payment.paymentDate), "dd MMM yyyy")}
                  </div>
                  <div>{accountType}</div>
                  <div>{accountName}</div>
                  <div className="font-bold text-indigo-700">
                    <div>{formatPrice(payment.amount)}</div>
                  </div>
                  <div className="truncate text-gray-600">{payment.note || 'No description'}</div>
                  <div className="flex justify-center">
                    <div className="flex space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleEdit(payment)}
                        className="h-7 w-7 p-0"
                      >
                        <Edit className="h-3.5 w-3.5 text-blue-600" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDelete(payment.id)}
                        className="h-7 w-7 p-0"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
          <CardContent className="border-t bg-gray-50 py-2">
            <div className="flex justify-end items-center space-x-4">
              <div className="text-sm">
                <span className="text-gray-500">Total Payments:</span>
                <span className="ml-2 font-bold text-indigo-700">{formatPrice(totalPayments)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <p className="text-gray-500 italic">No payment records available</p>
      )}
      
      {/* Payment Entry/Edit Dialog */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editItem ? "Edit Payment" : "Add New Payment"}
            </DialogTitle>
            <DialogDescription>
              {editItem ? "Edit payment details" : "Create a new payment for this tour package."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            <PaymentFormWrapper
              initialData={editItem || {
                tourPackageQueryId: tourPackageId,
                tourPackageQuery: {
                  tourPackageQueryName: tourPackageName
                }
              }}
              suppliers={suppliers}
              bankAccounts={bankAccounts}
              cashAccounts={cashAccounts}
              onSuccess={() => {
                setIsPaymentModalOpen(false);
                onRefresh();
                toast.success(editItem ? "Payment updated successfully" : "Payment created successfully");
              }}
              submitButtonText={editItem ? "Update Payment" : "Create Payment"}
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

export default PaymentsSection;