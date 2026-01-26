'use client'

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Edit, FileDown, Image as ImageIcon, Upload, PlusCircleIcon, Trash2, User as UserIcon, Copy, Printer } from 'lucide-react';
import { CldUploadWidget } from 'next-cloudinary';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PaymentFormWrapper } from "@/components/forms/payment-form-wrapper"; // Updated import
import DeleteConfirmation from "./delete-confirmation";
import { formatPrice } from "@/lib/utils";
import toast from 'react-hot-toast';
import { BankAccount, CashAccount, PaymentDetail, Supplier, Customer } from '@prisma/client';
import ImageViewer from '@/components/ui/image-viewer';
import ImageUpload from '@/components/ui/image-upload';

// Extended the PaymentDetail to include images relationship
interface PaymentWithImages extends PaymentDetail {
  images?: { url: string }[];
  supplier?: { id: string; name: string; contact?: string } | null;
  customer?: { id: string; name: string; contact?: string } | null;
}

interface PaymentsSectionProps {
  paymentsData: PaymentWithImages[];
  suppliers: Supplier[];
  customers: Customer[];
  bankAccounts: BankAccount[];
  cashAccounts: CashAccount[];
  tourPackageId: string;
  tourPackageName: string;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const PaymentsSection: React.FC<PaymentsSectionProps> = ({
  paymentsData: initialPaymentsData,
  suppliers,
  customers,
  bankAccounts,
  cashAccounts,
  tourPackageId,
  tourPackageName,
  onRefresh,
  isRefreshing
}) => {
  // Use state to track payments data locally so we can update it immediately
  const [paymentsData, setPaymentsData] = useState<PaymentWithImages[]>(initialPaymentsData);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: string } | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  // States for image viewer and uploader
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [currentPaymentId, setCurrentPaymentId] = useState<string | null>(null);  // Track the current payment ID for image operations
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null); // Track which payment is currently uploading an image
  // Update local state when props change
  useEffect(() => {
    setPaymentsData(initialPaymentsData);
  }, [initialPaymentsData]);

  // Calculate totals
  const totalPayments = paymentsData.reduce((sum, payment) => sum + payment.amount, 0);

  const formatAmountForPdf = (value: number) => {
    return formatPrice(value).replace('₹', 'Rs. ');
  };

  const handleExportPaymentsPDF = () => {
    if (!paymentsData.length) {
      toast.error('No payments to export');
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const generatedAt = format(new Date(), "dd MMM yyyy HH:mm");
    const sanitizedName = tourPackageName.replace(/\s+/g, '-').toLowerCase() || 'tour-package';

    doc.setFontSize(16);
    doc.text(`Payment Records - ${tourPackageName}`, 40, 40);
    doc.setFontSize(10);
    doc.text(`Generated on ${generatedAt}`, 40, 60);

    const rows = paymentsData.map((payment, index) => {
      const isBank = !!payment.bankAccountId;
      const accountType = isBank ? 'Bank' : payment.cashAccountId ? 'Cash' : '-';
      const accountName = isBank
        ? bankAccounts.find(b => b.id === payment.bankAccountId)?.accountName || '-'
        : payment.cashAccountId
          ? cashAccounts.find(c => c.id === payment.cashAccountId)?.accountName || '-'
          : '-';
      const partyName = payment.paymentType === 'customer_refund'
        ? payment.customer
          ? `${payment.customer.name}${payment.customer.contact ? ` - ${payment.customer.contact}` : ''}`
          : 'N/A'
        : payment.supplier
          ? `${payment.supplier.name}${payment.supplier.contact ? ` - ${payment.supplier.contact}` : ''}`
          : 'N/A';
      const typeLabel = payment.paymentType === 'customer_refund' ? 'Customer Refund' : 'Payment';

      return [
        index + 1,
        partyName,
        typeLabel,
        format(new Date(payment.paymentDate), 'dd MMM yyyy'),
        accountType,
        accountName,
        formatAmountForPdf(payment.amount),
        payment.note || 'No description'
      ];
    });

    autoTable(doc, {
      head: [['#', 'Party', 'Type', 'Date', 'Account Type', 'Account Name', 'Amount', 'Description']],
      body: rows,
      startY: 80,
      styles: { fontSize: 9, cellPadding: 6, overflow: 'linebreak' },
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 245, 255] },
      columnStyles: {
        6: { halign: 'right', cellWidth: 110 },
        7: { cellWidth: 220 }
      }
    });

    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 80;
    doc.setFontSize(12);
    doc.text(`Total Payments: ${formatAmountForPdf(totalPayments)}`, 40, finalY + 30);

    const timestamp = format(new Date(), 'yyyyMMdd-HHmmss');
    doc.save(`payment-records-${sanitizedName}-${timestamp}.pdf`);
  };

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

  // Function to handle duplicate
  const handleDuplicate = (payment: PaymentWithImages) => {
    // Create a copy of the payment without the ID and timestamps
    const { id, createdAt, updatedAt, ...paymentData } = payment;

    // Pre-fill the form with this data but treat as new
    const duplicateData = {
      ...paymentData,
      note: `Copy of ${payment.note || ''}`.trim(),
      paymentDate: new Date(),
      tourPackageQueryId: tourPackageId, // Ensure it is linked to the current tour package // Set to today for the duplicate
      images: [] // Don't copy images
    };

    setEditItem(duplicateData);
    setIsPaymentModalOpen(true);
  };

  // Function to generate single voucher PDF - now redirects to standard voucher page
  const handleGenerateVoucher = (payment: PaymentWithImages) => {
    window.open(`/payments/${payment.id}/voucher`, '_blank');
  };

  // Function to handle viewing images
  const handleViewImages = (payment: PaymentWithImages) => {
    if (payment.images && payment.images.length > 0) {
      setSelectedImages(payment.images.map(img => img.url));
      // Store the current payment ID to use during delete
      setCurrentPaymentId(payment.id);
      setIsImageViewerOpen(true);
    } else {
      toast.error("No images available for this payment");
    }
  };
  // Function to handle image deletion
  const handleDeleteImage = async (imageUrl: string, index: number) => {
    if (!currentPaymentId) return;

    // Find the payment in our local state
    const payment = paymentsData.find(p => p.id === currentPaymentId);
    if (!payment || !payment.images) return;

    // Filter out the image being deleted
    const updatedImages = payment.images.filter(img => img.url !== imageUrl);

    // Prepare data for API call
    const paymentData = {
      supplierId: payment.supplierId,
      paymentDate: payment.paymentDate,
      amount: payment.amount,
      bankAccountId: payment.bankAccountId,
      cashAccountId: payment.cashAccountId,
      images: updatedImages.map(img => img.url)
    };

    try {
      // Update via API
      const response = await fetch(`/api/payments/${currentPaymentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        throw new Error('Failed to delete image');
      }

      // Update local state
      setPaymentsData(paymentsData.map(p => {
        if (p.id === currentPaymentId) {
          return {
            ...p,
            images: updatedImages
          };
        }
        return p;
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
        <h3 className="text-lg font-semibold text-indigo-800">Payment Records</h3>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-indigo-800 border-indigo-800">
            {paymentsData.length} records
          </Badge>
          <Button
            onClick={handleExportPaymentsPDF}
            size="sm"
            variant="outline"
            className="text-indigo-600 border-indigo-600 hover:bg-indigo-50"
            disabled={!paymentsData.length}
          >
            <FileDown className="h-4 w-4 mr-1" />
            Download PDF
          </Button>
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
          <CardHeader className="py-3 bg-gray-50">            <CardTitle className="text-sm font-medium grid grid-cols-[2fr_1fr_1fr_1fr_1fr_2fr_120px] gap-4">
            <div>Supplier/Customer</div>
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
              return (<div key={payment.id}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_2fr_120px] gap-4 items-center p-3 border-b last:border-0 hover:bg-gray-50">
                <div className="font-medium">
                  <div className="flex items-center">
                    {payment.paymentType === "customer_refund" ? (
                      <>
                        <div className="flex items-center">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2">
                            Refund
                          </span>
                          <UserIcon className="h-4 w-4 mr-1 text-green-600" />
                        </div>
                        <div>
                          {payment.customer
                            ? `${payment.customer.name}${payment.customer.contact ? ` - ${payment.customer.contact}` : ''}`
                            : 'N/A'}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                            Payment
                          </span>
                          <UserIcon className="h-4 w-4 mr-1 text-blue-600" />
                        </div>
                        <div>
                          {payment.supplier
                            ? `${payment.supplier.name}${payment.supplier.contact ? ` - ${payment.supplier.contact}` : ''}`
                            : 'N/A'}
                        </div>
                      </>
                    )}
                  </div>
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
                <div className="truncate text-gray-600">{payment.note || 'No description'}</div>                  <div className="flex justify-center">
                  <div className="flex space-x-1">
                    {payment.images && payment.images.length > 0 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewImages(payment)}
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

                          // Set this payment as currently uploading
                          setUploadingImageId(payment.id);

                          // Prepare data for upload
                          const paymentData = {
                            supplierId: payment.supplierId,
                            paymentDate: payment.paymentDate,
                            amount: payment.amount,
                            bankAccountId: payment.bankAccountId,
                            cashAccountId: payment.cashAccountId,
                            images: [...(payment.images?.map(img => img.url) || []), url]
                          };
                          // Update directly
                          fetch(`/api/payments/${payment.id}`, {
                            method: 'PATCH',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(paymentData),
                          })
                            .then(response => {
                              if (!response.ok) {
                                throw new Error('Failed to upload image');
                              }
                              toast.success('Image uploaded successfully');
                              // Update local state immediately to show the view button
                              setPaymentsData(paymentsData.map(p => {
                                if (p.id === payment.id) {
                                  return {
                                    ...p,
                                    images: [...(p.images || []), { url }]
                                  };
                                }
                                return p;
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
                          disabled={uploadingImageId === payment.id}
                          title="Upload Images"
                        >                            {uploadingImageId === payment.id ? (
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
                      onClick={() => handleEdit(payment)}
                      className="h-7 w-7 p-0"
                      title="Edit Payment"
                    >
                      <Edit className="h-3.5 w-3.5 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(payment.id)}
                      className="h-7 w-7 p-0"
                      title="Delete Payment"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicate(payment)}
                      className="h-7 w-7 p-0"
                      title="Duplicate Payment"
                    >
                      <Copy className="h-3.5 w-3.5 text-orange-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleGenerateVoucher(payment)}
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
              <DialogTitle>
                {editItem && editItem.id ? "Edit Payment" : "Add New Payment"}
              </DialogTitle>
            </DialogTitle>
            <DialogDescription>
              {editItem && editItem.id ? "Edit payment details" : "Create a new payment for this tour package."}
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
              customers={customers}
              bankAccounts={bankAccounts}
              cashAccounts={cashAccounts}
              onSuccess={() => {
                setIsPaymentModalOpen(false);
                onRefresh();
                onRefresh();
                toast.success((editItem && editItem.id) ? "Payment updated successfully" : "Payment created successfully");
              }}
              submitButtonText={editItem && editItem.id ? "Update Payment" : "Create Payment"}
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
      />      {/* Image Viewer Dialog */}      <ImageViewer
        images={selectedImages}
        open={isImageViewerOpen}
        onOpenChange={setIsImageViewerOpen}
        onDelete={handleDeleteImage}
      />{/* No dialog needed anymore as we're uploading directly from the button */}
    </div>
  );
};

export default PaymentsSection;