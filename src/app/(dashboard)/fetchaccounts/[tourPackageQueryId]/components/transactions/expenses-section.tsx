'use client'

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Edit, Image as ImageIcon, Upload, PlusCircleIcon, Trash2, User as UserIcon } from 'lucide-react';
import { CldUploadWidget } from 'next-cloudinary';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ExpenseFormWrapper } from "@/components/forms/expense-form-wrapper"; // Updated import
import DeleteConfirmation from "./delete-confirmation";
import { formatPrice } from "@/lib/utils";
import toast from 'react-hot-toast';
import { BankAccount, CashAccount, ExpenseCategory, ExpenseDetail } from '@prisma/client';
import ImageViewer from '@/components/ui/image-viewer';
import ImageUpload from '@/components/ui/image-upload';

// Extended the ExpenseDetail to include images relationship
interface ExpenseWithImages extends ExpenseDetail {
  images?: { url: string }[];
}

interface ExpensesSectionProps {
  expensesData: ExpenseWithImages[];
  expenseCategories: ExpenseCategory[];
  bankAccounts: BankAccount[];
  cashAccounts: CashAccount[];
  tourPackageId: string;
  tourPackageName: string;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const ExpensesSection: React.FC<ExpensesSectionProps> = ({
  expensesData: initialExpensesData,
  expenseCategories,
  bankAccounts,
  cashAccounts,
  tourPackageId,
  tourPackageName,
  onRefresh,
  isRefreshing
}) => {
  // Use state to track expenses data locally so we can update it immediately
  const [localExpensesData, setLocalExpensesData] = useState<ExpenseWithImages[]>(initialExpensesData);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: string } | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  // States for image viewer and uploader
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [currentImages, setCurrentImages] = useState<string[]>([]);
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);

  // Update local state when the prop changes
  useEffect(() => {
    setLocalExpensesData(initialExpensesData);
  }, [initialExpensesData]);

  // Function to handle image viewing
  const handleViewImages = (expense: ExpenseWithImages) => {
    setCurrentImages(expense.images?.map(img => img.url) || []);
    setIsImageViewerOpen(true);
  };

  // Function to handle image deletion
  const handleDeleteImage = async (imageUrl: string): Promise<void> => {
    try {
      // Find the expense that contains this image
      const expense = localExpensesData.find(exp =>
        exp.images?.some(img => img.url === imageUrl)
      );

      if (!expense) {
        throw new Error('Expense not found for this image');
      }

      // Remove the image URL from the current expense's images
      const updatedImages = expense.images?.filter(img => img.url !== imageUrl).map(img => img.url) || [];

      // Prepare the updated data
      const expenseData = {
        expenseDate: expense.expenseDate,
        amount: expense.amount,
        expenseCategoryId: expense.expenseCategoryId,
        description: expense.description,
        tourPackageQueryId: expense.tourPackageQueryId,
        bankAccountId: expense.bankAccountId,
        cashAccountId: expense.cashAccountId,
        images: updatedImages
      };

      // Update via API
      const response = await fetch(`/api/expenses/${expense.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(expenseData),
      });

      if (!response.ok) {
        throw new Error('Failed to delete image');
      }

      toast.success('Image deleted successfully');

      // Update local state
      setLocalExpensesData(prevExpenses =>
        prevExpenses.map(exp =>
          exp.id === expense.id
            ? { ...exp, images: updatedImages.map(url => ({ url })) }
            : exp
        )
      );

      // Update current images for the viewer
      setCurrentImages(updatedImages);

      // Close image viewer if no images left
      if (updatedImages.length === 0) {
        setIsImageViewerOpen(false);
      }

    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Failed to delete image');
      throw error; // Rethrow to indicate failure to the ImageViewer component
    }
  };

  // Calculate totals
  const totalExpenses = localExpensesData.reduce((sum, expense) => sum + expense.amount, 0);

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
        <div className="flex items-center space-x-2">          <Badge variant="outline" className="text-red-800 border-red-800">
          {localExpensesData.length} records
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
      {localExpensesData.length > 0 ? (
        <Card className="shadow-lg rounded-lg border-l-4 border-red-500">
          <CardHeader className="py-3 bg-gray-50">
            <CardTitle className="text-sm font-medium grid grid-cols-[2fr_1fr_1fr_1fr_1fr_2fr_120px] gap-4">
              <div>Category</div>
              <div>Date</div>
              <div>Account Type</div>
              <div>Account Name</div>
              <div>Amount</div>
              <div>Description</div>
              <div>Actions</div>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[250px] overflow-y-auto p-0">
            {localExpensesData.map((expense) => {
              const isBank = !!expense.bankAccountId;
              const accountType = isBank ? "Bank" : expense.cashAccountId ? "Cash" : "-";
              const accountName = isBank
                ? bankAccounts.find(b => b.id === expense.bankAccountId)?.accountName || "-"
                : expense.cashAccountId
                  ? cashAccounts.find(c => c.id === expense.cashAccountId)?.accountName || "-"
                  : "-";
              return (<div key={expense.id}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_2fr_120px] gap-4 items-center p-3 border-b last:border-0 hover:bg-gray-50">
                <div className="font-medium flex items-center">
                  <UserIcon className="h-4 w-4 mr-1 text-gray-500" />
                  {expenseCategories.find(cat => cat.id === expense.expenseCategoryId)?.name || 'N/A'}
                </div>
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-1 text-gray-500" />
                  {format(new Date(expense.expenseDate), "dd MMM yyyy")}
                </div>
                <div>{accountType}</div>
                <div>{accountName}</div>
                <div className="font-bold text-red-700">
                  <div>{formatPrice(expense.amount)}</div>
                </div>
                <div className="truncate text-gray-600">{expense.description || 'No description'}</div>
                <div className="flex justify-center">
                  <div className="flex space-x-1">
                    {expense.images && expense.images.length > 0 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewImages(expense)}
                        className="h-7 w-7 p-0"
                        title="View Images"
                      >
                        <ImageIcon className="h-3.5 w-3.5 text-green-600" />
                      </Button>
                    ) : null}
                    <CldUploadWidget
                      uploadPreset="ckwg6oej"
                      onSuccess={(result: any) => {
                        if (result.info && result.info.secure_url) {
                          const url = result.info.secure_url;

                          // Set this expense as currently uploading
                          setUploadingImageId(expense.id);

                          // Prepare data for upload
                          const expenseData = {
                            expenseDate: expense.expenseDate,
                            amount: expense.amount,
                            expenseCategoryId: expense.expenseCategoryId,
                            description: expense.description,
                            tourPackageQueryId: expense.tourPackageQueryId,
                            bankAccountId: expense.bankAccountId,
                            cashAccountId: expense.cashAccountId,
                            images: [...(expense.images?.map(img => img.url) || []), url]
                          };

                          // Update directly
                          fetch(`/api/expenses/${expense.id}`, {
                            method: 'PATCH',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(expenseData),
                          })
                            .then(response => {
                              if (!response.ok) {
                                throw new Error('Failed to upload image');
                              }
                              toast.success('Image uploaded successfully');

                              // Update local state immediately to show the view button
                              setLocalExpensesData(prevExpenses =>
                                prevExpenses.map(exp =>
                                  exp.id === expense.id
                                    ? { ...exp, images: [...(exp.images || []), { url }] }
                                    : exp
                                )
                              );
                            })
                            .catch(error => {
                              console.error('Error uploading image:', error);
                              toast.error('Failed to upload image');
                            })
                            .finally(() => {
                              setUploadingImageId(null);
                            });
                        }
                      }}
                    >
                      {({ open }) => {
                        return (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => open?.()}
                            className="h-7 w-7 p-0"
                            title="Upload Image"
                            disabled={uploadingImageId === expense.id}
                          >
                            <Upload className={`h-3.5 w-3.5 text-blue-600 ${uploadingImageId === expense.id ? 'animate-spin' : ''}`} />
                          </Button>
                        );
                      }}
                    </CldUploadWidget>
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
              );
            })}
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
            <ExpenseFormWrapper
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
      {/* Image Viewer for expenses */}
      {isImageViewerOpen && (
        <ImageViewer
          images={currentImages}
          open={isImageViewerOpen}
          onOpenChange={setIsImageViewerOpen}
          onDelete={handleDeleteImage}
        />
      )}
    </div>
  );
};

export default ExpensesSection;