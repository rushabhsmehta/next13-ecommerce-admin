'use client'

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CldUploadWidget } from 'next-cloudinary';
import { CalendarIcon, Edit, FileDown, Image as ImageIcon, Upload, PlusCircleIcon, Trash2, User as UserIcon, Copy, Printer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ReceiptFormWrapper } from "@/components/forms/receipt-form-wrapper"; // Updated import
import DeleteConfirmation from "./delete-confirmation";
import { formatPrice } from "@/lib/utils";
import toast from 'react-hot-toast';
import { BankAccount, CashAccount, Customer, ReceiptDetail, Supplier } from '@prisma/client';
import ImageViewer from '@/components/ui/image-viewer';
import ImageUpload from '@/components/ui/image-upload';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extended the ReceiptDetail to include images relationship
interface ReceiptWithImages extends ReceiptDetail {
  images?: { url: string }[];
  customer?: { id: string; name: string; contact?: string } | null;
  supplier?: { id: string; name: string; contact?: string } | null;
}

interface ReceiptsSectionProps {
  receiptsData: ReceiptWithImages[];
  customers: Customer[];
  suppliers: Supplier[];
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
  suppliers,
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
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: string } | null>(null);
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

  const formatAmountForPdf = (value: number) => {
    return formatPrice(value).replace('₹', 'Rs. ');
  };

  const handleExportReceiptsPDF = () => {
    if (!receiptsData.length) {
      toast.error('No receipts to export');
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const generatedAt = format(new Date(), "dd MMM yyyy HH:mm");
    const sanitizedName = tourPackageName.replace(/\s+/g, '-').toLowerCase() || 'tour-package';

    doc.setFontSize(16);
    doc.text(`Receipt Records - ${tourPackageName}`, 40, 40);
    doc.setFontSize(10);
    doc.text(`Generated on ${generatedAt}`, 40, 60);

    const rows = receiptsData.map((receipt, index) => {
      const isBank = !!receipt.bankAccountId;
      const accountType = isBank ? 'Bank' : receipt.cashAccountId ? 'Cash' : '-';
      const accountName = isBank
        ? bankAccounts.find(b => b.id === receipt.bankAccountId)?.accountName || '-'
        : receipt.cashAccountId
          ? cashAccounts.find(c => c.id === receipt.cashAccountId)?.accountName || '-'
          : '-';
      const partyName = receipt.receiptType === 'supplier_refund'
        ? receipt.supplier
          ? `${receipt.supplier.name}${receipt.supplier.contact ? ` - ${receipt.supplier.contact}` : ''}`
          : 'N/A'
        : receipt.customer
          ? `${receipt.customer.name}${receipt.customer.contact ? ` - ${receipt.customer.contact}` : ''}`
          : 'N/A';
      const typeLabel = receipt.receiptType === 'supplier_refund' ? 'Supplier Refund' : 'Receipt';

      return [
        index + 1,
        partyName,
        typeLabel,
        format(new Date(receipt.receiptDate), 'dd MMM yyyy'),
        accountType,
        accountName,
        formatAmountForPdf(receipt.amount),
        receipt.note || 'No description'
      ];
    });

    autoTable(doc, {
      head: [['#', 'Party', 'Type', 'Date', 'Account Type', 'Account Name', 'Amount', 'Description']],
      body: rows,
      startY: 80,
      styles: { fontSize: 9, cellPadding: 6, overflow: 'linebreak' },
      headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [236, 253, 245] },
      columnStyles: {
        6: { halign: 'right', cellWidth: 110 },
        7: { cellWidth: 220 }
      }
    });

    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 80;
    doc.setFontSize(12);
    doc.text(`Total Receipts: ${formatAmountForPdf(totalReceipts)}`, 40, finalY + 30);

    const timestamp = format(new Date(), 'yyyyMMdd-HHmmss');
    doc.save(`receipt-records-${sanitizedName}-${timestamp}.pdf`);
  };

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

  // Function to handle duplicate
  const handleDuplicate = (receipt: ReceiptWithImages) => {
    // Create a copy of the receipt without the ID and timestamps
    const { id, createdAt, updatedAt, ...receiptData } = receipt;

    // Set as the item to be edited (but logically it's a new item based on this one)
    // We pass it to the form wrapper which will handle it as a "new" item because we'll modify it slightly
    // actually, the better approach is to pass it as editItem but with a flag or just manually handle the form save
    // Simpler approach: Pre-fill the form with this data but treat as new

    const duplicateData = {
      ...receiptData,
      note: `Copy of ${receipt.note || ''}`.trim(),
      receiptDate: new Date(), // Set to today for the duplicate
      images: [] // Don't copy images
    };

    setEditItem(duplicateData);
    setIsReceiptModalOpen(true);
  };

  // Function to generate single voucher PDF
  const handleGenerateVoucher = (receipt: ReceiptWithImages) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a5' }); // A5 is good for vouchers
    const width = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(16, 185, 129); // Emerald color
    doc.text("RECEIPT VOUCHER", width / 2, 60, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Voucher No: ${receipt.id.substring(0, 8).toUpperCase()}`, 40, 90);
    doc.text(`Date: ${format(new Date(receipt.receiptDate), "dd MMM yyyy")}`, width - 40, 90, { align: 'right' });

    // Content Box
    doc.setDrawColor(200);
    doc.setFillColor('#FAFAFA');
    doc.rect(30, 110, width - 60, 240, 'FD');

    doc.setFontSize(12);
    doc.setTextColor(0);

    let y = 140;
    const lineHeight = 30;
    const leftCol = 50;
    const rightCol = 180;

    doc.text("Received From:", leftCol, y);
    const partyName = receipt.receiptType === 'supplier_refund'
      ? receipt.supplier?.name || 'N/A'
      : receipt.customer?.name || 'N/A';
    doc.setFont("helvetica", "bold");
    doc.text(partyName, rightCol, y);
    doc.setFont("helvetica", "normal");

    y += lineHeight;
    doc.text("Amount:", leftCol, y);
    doc.setFont("helvetica", "bold");
    doc.text(formatPrice(receipt.amount).replace('₹', 'Rs. '), rightCol, y);
    doc.setFont("helvetica", "normal");

    y += lineHeight;
    doc.text("Payment Mode:", leftCol, y);
    const accountInfo = receipt.bankAccountId
      ? `Bank (${bankAccounts.find(b => b.id === receipt.bankAccountId)?.accountName})`
      : `Cash (${cashAccounts.find(c => c.id === receipt.cashAccountId)?.accountName})`;
    doc.text(accountInfo, rightCol, y);

    y += lineHeight;
    doc.text("Received For:", leftCol, y);
    doc.text(tourPackageName, rightCol, y);

    if (receipt.note) {
      y += lineHeight;
      doc.text("Note:", leftCol, y);
      doc.text(receipt.note, rightCol, y, { maxWidth: width - rightCol - 40 });
    }

    // Footer
    (doc as any).setLineDash([2, 2], 0);
    doc.line(30, 310, width - 30, 310);
    (doc as any).setLineDash([], 0);

    doc.setFontSize(10);
    doc.text("Authorized Signatory", width - 60, 340, { align: 'right' });

    doc.save(`receipt-voucher-${receipt.id.substring(0, 8)}.pdf`);
    toast.success("Voucher downloaded");
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
            onClick={handleExportReceiptsPDF}
            size="sm"
            variant="outline"
            className="text-emerald-600 border-emerald-600 hover:bg-emerald-50"
            disabled={!receiptsData.length}
          >
            <FileDown className="h-4 w-4 mr-1" />
            Download PDF
          </Button>
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
            <div>Customer/Supplier</div>
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
              return (<div key={receipt.id}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_2fr_120px] gap-4 items-center p-3 border-b last:border-0 hover:bg-gray-50">
                <div className="font-medium">
                  <div className="flex items-center">
                    {receipt.receiptType === "supplier_refund" ? (
                      <>
                        <div className="flex items-center">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 mr-2">
                            Refund
                          </span>
                          <UserIcon className="h-4 w-4 mr-1 text-orange-600" />
                        </div>
                        <div>
                          {receipt.supplier
                            ? `${receipt.supplier.name}${receipt.supplier.contact ? ` - ${receipt.supplier.contact}` : ''}`
                            : 'N/A'}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 mr-2">
                            Receipt
                          </span>
                          <UserIcon className="h-4 w-4 mr-1 text-emerald-600" />
                        </div>
                        <div>
                          {receipt.customer
                            ? `${receipt.customer.name}${receipt.customer.contact ? ` - ${receipt.customer.contact}` : ''}`
                            : 'N/A'}
                        </div>
                      </>
                    )}
                  </div>
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicate(receipt)}
                      className="h-7 w-7 p-0"
                      title="Duplicate Receipt"
                    >
                      <Copy className="h-3.5 w-3.5 text-orange-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleGenerateVoucher(receipt)}
                      className="h-7 w-7 p-0"
                      title="Print Voucher"
                    >
                      <Printer className="h-3.5 w-3.5 text-gray-600" />
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
              <DialogTitle>
                {editItem && editItem.id ? "Edit Receipt" : "Add New Receipt"}
              </DialogTitle>
            </DialogTitle>
            <DialogDescription>
              {editItem && editItem.id ? "Edit receipt details" : "Create a new receipt for this tour package."}
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
              suppliers={suppliers}
              bankAccounts={bankAccounts}
              cashAccounts={cashAccounts}
              onSuccess={() => {
                setIsReceiptModalOpen(false);
                onRefresh();
                onRefresh();
                toast.success((editItem && editItem.id) ? "Receipt updated successfully" : "Receipt created successfully");
              }}
              submitButtonText={editItem && editItem.id ? "Update Receipt" : "Create Receipt"}
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