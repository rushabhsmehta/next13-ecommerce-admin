'use client'

import { useState } from 'react';
import { CalendarIcon, Edit, PlusCircleIcon, Trash2, User as UserIcon, Copy, Printer } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PurchaseFormWrapper } from "@/components/forms/purchase-form-wrapper"; // Updated import
import DeleteConfirmation from "./delete-confirmation";
import { formatPrice, formatSafeDate } from "@/lib/utils";
import toast from 'react-hot-toast';
import { PurchaseDetail, Supplier, TaxSlab, UnitOfMeasure } from '@prisma/client';

interface PurchasesSectionProps {
  purchasesData: PurchaseDetail[];
  taxSlabs: TaxSlab[];
  suppliers: Supplier[];
  units: UnitOfMeasure[];
  tourPackageId: string;
  tourPackageName: string;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const PurchasesSection: React.FC<PurchasesSectionProps> = ({
  purchasesData,
  suppliers,
  taxSlabs,
  units,
  tourPackageId,
  tourPackageName,
  onRefresh,
  isRefreshing
}) => {
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: string } | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Calculate totals with tax included
  const totalPurchases = purchasesData.reduce((sum, purchase) => sum + (purchase.price || 0), 0);
  const totalPurchasesGST = purchasesData.reduce((sum, purchase) => sum + (purchase.gstAmount || 0), 0);
  const totalPurchasesWithGST = totalPurchases + totalPurchasesGST;

  // Function to handle edit
  const handleEdit = (purchase: any) => {
    setEditItem(purchase);
    setIsPurchaseModalOpen(true);
  };

  // Function to handle delete
  const handleDelete = (id: string) => {
    setItemToDelete({ id, type: 'purchase' });
    setIsDeleteDialogOpen(true);
  };

  // Function to handle duplicate
  const handleDuplicate = (purchase: any) => {
    // Create a copy of the purchase without the ID and timestamps
    const { id, createdAt, updatedAt, ...purchaseData } = purchase;

    // Pre-fill the form with this data but treat as new
    const duplicateData = {
      ...purchaseData,
      purchaseDate: new Date(), // Set to today for the duplicate
    };

    setEditItem(duplicateData);
    setIsPurchaseModalOpen(true);
  };

  // Function to generate single voucher PDF
  const handleGenerateVoucher = (purchase: any) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const width = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235); // Blue color
    doc.text("PURCHASE VOUCHER", width / 2, 60, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Voucher No: ${purchase.id.substring(0, 8).toUpperCase()}`, 40, 90);
    doc.text(`Date: ${formatsafeDateForPdf(purchase.purchaseDate)}`, width - 40, 90, { align: 'right' });

    // Content Box
    doc.setDrawColor(200);
    doc.setFillColor('#FAFAFA');
    doc.rect(30, 110, width - 60, 100, 'FD');

    doc.setFontSize(12);
    doc.setTextColor(0);

    let y = 140;
    const lineHeight = 20;
    const leftCol = 50;
    const rightCol = 300;

    doc.text("Supplier:", leftCol, y);
    const supplierName = suppliers.find(s => s.id === purchase.supplierId)?.name || 'N/A';
    doc.setFont("helvetica", "bold");
    doc.text(supplierName, leftCol, y + lineHeight);
    doc.setFont("helvetica", "normal");

    doc.text("Tour Package:", rightCol, y);
    doc.setFont("helvetica", "bold");
    doc.text(tourPackageName, rightCol, y + lineHeight);
    doc.setFont("helvetica", "normal");

    // Items Table if available
    let startY = 230;

    const rows = [
      [
        "1",
        purchase.description || "Tour Package Purchase",
        formatPrice(purchase.price).replace('₹', 'Rs. '),
        purchase.gstPercentage ? `${purchase.gstPercentage}%` : "-",
        formatPrice(purchase.gstAmount || 0).replace('₹', 'Rs. '),
        formatPrice((purchase.price || 0) + (purchase.gstAmount || 0)).replace('₹', 'Rs. ')
      ]
    ];

    autoTable(doc, {
      head: [['#', 'Description', 'Amount', 'GST %', 'GST Amt', 'Total']],
      body: rows,
      startY: startY,
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'center' },
        4: { halign: 'right' },
        5: { halign: 'right' }
      }
    });

    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || startY + 50;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Grand Total: ${formatPrice((purchase.price || 0) + (purchase.gstAmount || 0)).replace('₹', 'Rs. ')}`, width - 40, finalY + 40, { align: 'right' });

    // Footer
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Authorized Signatory", width - 60, finalY + 100, { align: 'right' });

    doc.save(`purchase-voucher-${purchase.id.substring(0, 8)}.pdf`);
    toast.success("Voucher downloaded");
  };

  const formatsafeDateForPdf = (date: any) => {
    try {
      return format(new Date(date), "dd MMM yyyy");
    } catch (e) {
      return "N/A";
    }
  }
  const renderGSTInfo = (basePrice: number, gstAmount?: number | null, gstPercentage?: number | null) => {
    if (!gstAmount && !gstPercentage) return null;

    return (
      <div className="text-xs text-gray-500 mt-1">
        GST: ₹{(gstAmount || 0).toFixed(2)}
        {gstPercentage ? ` (${gstPercentage}%)` : ''}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-blue-800">Purchase Records</h3>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-blue-800 border-blue-800">
            {purchasesData.length} records
          </Badge>
          <Button
            onClick={() => {
              setEditItem(null);
              setIsPurchaseModalOpen(true);
            }}
            size="sm"
            variant="outline"
            className="text-blue-600 border-blue-600 hover:bg-blue-50"
          >
            <PlusCircleIcon className="h-4 w-4 mr-1" />
            Add Purchase
          </Button>
        </div>
      </div>

      {purchasesData.length > 0 ? (
        <Card className="shadow-lg rounded-lg border-l-4 border-blue-500">
          <CardHeader className="py-3 bg-gray-50">
            <CardTitle className="text-sm font-medium grid grid-cols-[2fr_1fr_1fr_2fr_80px] gap-4">
              <div>Supplier</div>
              <div>Date</div>
              <div>Amount (incl. GST)</div>
              <div>Description</div>
              <div>Actions</div>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[250px] overflow-y-auto p-0">
            {purchasesData.map((purchase) => {
              // Calculate the total with GST for each individual purchase
              const purchaseWithGst = (purchase.price || 0) + (purchase.gstAmount || 0);

              return (
                <div key={purchase.id}
                  className="grid grid-cols-[2fr_1fr_1fr_2fr_80px] gap-4 items-center p-3 border-b last:border-0 hover:bg-gray-50">
                  <div className="font-medium flex items-center">
                    <UserIcon className="h-4 w-4 mr-1 text-gray-500" />
                    {suppliers.find(supplier => supplier.id === purchase.supplierId)?.name || 'N/A'}
                  </div>                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-1 text-gray-500" />
                    {formatSafeDate(purchase.purchaseDate, "dd MMM yyyy")}
                  </div>
                  <div className="font-bold text-blue-700">
                    <div>{formatPrice(purchaseWithGst)}</div>
                    {renderGSTInfo(purchase.price, purchase.gstAmount, purchase.gstPercentage)}
                  </div>
                  <div className="truncate text-gray-600">{purchase.description || 'No description'}</div>
                  <div className="flex justify-center">
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(purchase)}
                        className="h-7 w-7 p-0"
                      >
                        <Edit className="h-3.5 w-3.5 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(purchase.id)}
                        className="h-7 w-7 p-0"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicate(purchase)}
                        className="h-7 w-7 p-0"
                        title="Duplicate Purchase"
                      >
                        <Copy className="h-3.5 w-3.5 text-orange-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleGenerateVoucher(purchase)}
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
                <span className="text-gray-500">Total Purchases (incl. GST):</span>
                <span className="ml-2 font-bold text-blue-700">{formatPrice(totalPurchasesWithGST)}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Total GST:</span>
                <span className="ml-2 font-bold text-blue-700">{formatPrice(totalPurchasesGST)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <p className="text-gray-500 italic">No purchase records available</p>
      )}

      {/* Purchase Entry/Edit Dialog */}
      <Dialog open={isPurchaseModalOpen} onOpenChange={setIsPurchaseModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <DialogTitle>
                {editItem && editItem.id ? "Edit Purchase" : "Add New Purchase"}
              </DialogTitle>
            </DialogTitle>
            <DialogDescription>
              {editItem && editItem.id ? "Edit purchase details" : "Create a new purchase for this tour package."}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <PurchaseFormWrapper
              initialData={editItem || {
                tourPackageQueryId: tourPackageId,
                tourPackageQueryName: tourPackageName
              }}
              taxSlabs={taxSlabs}
              suppliers={suppliers}
              units={units}
              onSuccess={() => {
                setIsPurchaseModalOpen(false);
                setEditItem(null);
                onRefresh();
                onRefresh();
                toast.success((editItem && editItem.id) ? "Purchase updated successfully" : "Purchase created successfully");
              }}
              submitButtonText={editItem && editItem.id ? "Update Purchase" : "Create Purchase"}
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

export default PurchasesSection;