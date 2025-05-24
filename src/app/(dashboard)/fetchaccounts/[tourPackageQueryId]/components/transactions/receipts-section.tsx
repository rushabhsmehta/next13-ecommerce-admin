'use client'

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CldUploadWidget } from 'next-cloudinary';
import { CalendarIcon, Edit, Image as ImageIcon, Upload, PlusCircleIcon, Trash2, User as UserIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ReceiptFormWrapper } from "@/components/forms/receipt-form-wrapper"; // Updated import
import DeleteConfirmation from "./delete-confirmation";
import { formatPrice } from "@/lib/utils";
import toast from 'react-hot-toast';
import { BankAccount, CashAccount, Customer, ReceiptDetail } from '@prisma/client';
import ImageViewer from '@/components/ui/image-viewer';
import ImageUpload from '@/components/ui/image-upload';

// Extended the ReceiptDetail to include images relationship
interface ReceiptWithImages extends ReceiptDetail {
  images?: { url: string }[];
}

interface ReceiptsSectionProps {
  receiptsData: ReceiptWithImages[];
  customers: Customer[];
  bankAccounts: BankAccount[];
  cashAccounts: CashAccount[];
  tourPackageId: string;
  tourPackageName: string;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const ReceiptsSection: React.FC<ReceiptsSectionProps> = ({
  receiptsData: initialReceiptsData,
  customers,
  bankAccounts,
  cashAccounts,
  tourPackageId,
  tourPackageName,
  onRefresh,
  isRefreshing
}) => {
  // Use state to track receipts data locally so we can update it immediately
  const [receiptsData, setReceiptsData] = useState<ReceiptWithImages[]>(initialReceiptsData);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [itemToDelete, setItemToDelete] = useState<{id: string, type: string} | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  // States for image viewer and uploader
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [currentReceiptId, setCurrentReceiptId] = useState<string | null>(null);  // Track the current receipt ID for image operations
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null); // Track which receipt is currently uploading an image
    // Update local state when props change
  useEffect(() => {
    setReceiptsData(initialReceiptsData);
  }, [initialReceiptsData]);
  
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
  // Function to handle viewing images
  const handleViewImages = (receipt: ReceiptWithImages) => {
    if (receipt.images && receipt.images.length > 0) {
      setSelectedImages(receipt.images.map(img => img.url));
      // Store the current receipt ID to use during delete
      setCurrentReceiptId(receipt.id);
      setIsImageViewerOpen(true);
    } else {
      toast.error("No images available for this receipt");
    }
  };
    // Function to handle image deletion
  const handleDeleteImage = async (imageUrl: string, index: number) => {
    if (!currentReceiptId) return;
    
    // Find the receipt in our local state
    const receipt = receiptsData.find(r => r.id === currentReceiptId);
    if (!receipt || !receipt.images) return;
    
    // Filter out the image being deleted
    const updatedImages = receipt.images.filter(img => img.url !== imageUrl);
    
    // Prepare data for API call
    const receiptData = {
      customerId: receipt.customerId,
      receiptDate: receipt.receiptDate,
      amount: receipt.amount,
      bankAccountId: receipt.bankAccountId,
      cashAccountId: receipt.cashAccountId,
      tourPackageQueryId: receipt.tourPackageQueryId,
      images: updatedImages.map(img => img.url)
    };
    
    try {
      // Update via API
      const response = await fetch(`/api/receipts/${currentReceiptId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(receiptData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete image');
      }
      
      // Update local state
      setReceiptsData(receiptsData.map(r => {
        if (r.id === currentReceiptId) {
          return {
            ...r,
            images: updatedImages
          };
        }
        return r;
      }));
      
      // Update the selected images array for the viewer
      setSelectedImages(updatedImages.map(img => img.url));
      
      // Show success message
      toast.success('Image deleted successfully');
      
      // If we deleted all images, close the viewer
      if (updatedImages.length === 0) {
        setIsImageViewerOpen(false);
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Failed to delete image');
      throw error; // Rethrow to indicate failure to the ImageViewer component
    }
  };
    // Removed dialog-related functions as we now handle uploads directly
  
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
          <CardHeader className="py-3 bg-gray-50">            <CardTitle className="text-sm font-medium grid grid-cols-[2fr_1fr_1fr_1fr_1fr_2fr_120px] gap-4">
              <div>Customer</div>
              <div>Date</div>
              <div>Account Type</div>
              <div>Account Name</div>
              <div>Amount</div>
              <div>Description</div>
              <div>Actions</div>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[250px] overflow-y-auto p-0">
            {receiptsData.map((receipt) => {
              const isBank = !!receipt.bankAccountId;
              const accountType = isBank ? "Bank" : receipt.cashAccountId ? "Cash" : "-";
              const accountName = isBank
                ? bankAccounts.find(b => b.id === receipt.bankAccountId)?.accountName || "-"
                : receipt.cashAccountId
                  ? cashAccounts.find(c => c.id === receipt.cashAccountId)?.accountName || "-"
                  : "-";
              return (                <div key={receipt.id}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_2fr_120px] gap-4 items-center p-3 border-b last:border-0 hover:bg-gray-50">
                  <div className="font-medium flex items-center">
                    <UserIcon className="h-4 w-4 mr-1 text-gray-500" />
                    {customers.find(c => c.id === receipt.customerId)?.name || 'N/A'}
                  </div>
                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-1 text-gray-500" />
                    {format(new Date(receipt.receiptDate), "dd MMM yyyy")}
                  </div>
                  <div>{accountType}</div>
                  <div>{accountName}</div>
                  <div className="font-bold text-emerald-700">
                    <div>{formatPrice(receipt.amount)}</div>
                  </div>
                  <div className="truncate text-gray-600">{receipt.note || 'No description'}</div>                  <div className="flex justify-center">
                    <div className="flex space-x-1">
                      {receipt.images && receipt.images.length > 0 ? (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleViewImages(receipt)} 
                          className="h-7 w-7 p-0"
                          title="View Images"
                        >
                          <ImageIcon className="h-3.5 w-3.5 text-green-600" />
                        </Button>
                      ) : null}                      <CldUploadWidget 
                        uploadPreset="ckwg6oej"
                        onUpload={(result: any) => {
                          if (result.info && result.info.secure_url) {
                            const url = result.info.secure_url;
                            
                            // Set this receipt as currently uploading
                            setUploadingImageId(receipt.id);
                            
                            // Prepare data for upload
                            const receiptData = {
                              customerId: receipt.customerId,
                              receiptDate: receipt.receiptDate,
                              amount: receipt.amount,
                              bankAccountId: receipt.bankAccountId,
                              cashAccountId: receipt.cashAccountId,
                              tourPackageQueryId: receipt.tourPackageQueryId,
                              images: [...(receipt.images?.map(img => img.url) || []), url]
                            };
                            
                            // Update directly
                            fetch(`/api/receipts/${receipt.id}`, {
                              method: 'PATCH',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify(receiptData),
                            })
                            .then(response => {
                              if (!response.ok) {
                                throw new Error('Failed to upload image');
                              }
                              toast.success('Image uploaded successfully');
                                // Update local state immediately to show the view button
                              setReceiptsData(receiptsData.map(r => {
                                if (r.id === receipt.id) {
                                  return {
                                    ...r,
                                    images: [...(r.images || []), { url }]
                                  };
                                }
                                return r;
                              }));
                              
                              // Also refresh from server for completeness
                              onRefresh();
                            })
                            .catch(error => {
                              console.error('Error uploading image:', error);
                              toast.error('Failed to upload image');
                            })
                            .finally(() => {
                              // Clear the uploading state
                              setUploadingImageId(null);
                            });
                          }
                        }}
                      >
                        {({ open }) => (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => open()}
                            className="h-7 w-7 p-0"
                            disabled={uploadingImageId === receipt.id}
                            title="Upload Images"
                          >                            {uploadingImageId === receipt.id ? (
                              <div className="h-3.5 w-3.5 flex items-center justify-center">
                                <svg className="animate-spin text-purple-600 h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              </div>
                            ) : (
                              <Upload className="h-3.5 w-3.5 text-purple-600" />
                            )}
                          </Button>
                        )}
                      </CldUploadWidget>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEdit(receipt)}
                        className="h-7 w-7 p-0"
                        title="Edit Receipt"
                      >
                        <Edit className="h-3.5 w-3.5 text-blue-600" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDelete(receipt.id)}
                        className="h-7 w-7 p-0"
                        title="Delete Receipt"
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
        {/* Image Viewer Dialog */}      <ImageViewer 
        images={selectedImages}
        open={isImageViewerOpen}
        onOpenChange={setIsImageViewerOpen}
        onDelete={handleDeleteImage}
      />
        {/* No dialog needed anymore as we're uploading directly from the button */}
    </div>
  );
};

export default ReceiptsSection;