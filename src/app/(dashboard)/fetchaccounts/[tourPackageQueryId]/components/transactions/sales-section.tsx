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
import { SaleFormWrapper } from "@/components/forms/sale-form-wrapper"; // Updated import
import DeleteConfirmation from "./delete-confirmation";
import toast from 'react-hot-toast';
import { Customer, UnitOfMeasure, SaleDetail, TaxSlab } from '@prisma/client';
import { formatPrice, formatSafeDate } from '@/lib/utils';

interface SalesSectionProps {
  salesData: (SaleDetail & {
    customer?: { id: string; name: string } | null;
  })[];
  units: UnitOfMeasure[];
  taxSlabs: TaxSlab[];
  customers: Customer[]; // Fix: Changed from UnitOfMeasure[] to Customer[]
  tourPackageId: string;
  tourPackageName: string;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const SalesSection: React.FC<SalesSectionProps> = ({
  salesData,
  units,
  taxSlabs,
  customers,
  tourPackageId,
  tourPackageName,
  onRefresh,
  isRefreshing
}) => {
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: string } | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Calculate totals
  const totalSales = salesData.reduce((sum, sale) => sum + sale.salePrice, 0);
  const totalSalesGST = salesData.reduce((sum, sale) => sum + (sale.gstAmount || 0), 0);

  // Function to handle edit
  const handleEdit = (sale: any) => {
    setEditItem(sale);
    setIsSaleModalOpen(true);
  };

  // Function to handle delete
  const handleDelete = (id: string) => {
    setItemToDelete({ id, type: 'sale' });
    setIsDeleteDialogOpen(true);
  };

  // Function to handle duplicate
  const handleDuplicate = (sale: any) => {
    // Create a copy of the sale without the ID and timestamps
    const { id, createdAt, updatedAt, ...saleData } = sale;

    // Pre-fill the form with this data but treat as new
    const duplicateData = {
      ...saleData,
      saleDate: new Date(), // Set to today for the duplicate
    };

    // Ensure nested items are also cleaned up if they exist (though sale detail row handles this usually)
    if (duplicateData.items) {
      duplicateData.items = duplicateData.items.map((item: any) => {
        const { id, saleDetailId, ...itemData } = item;
        return itemData;
      });
    }

    setEditItem(duplicateData);
    setIsSaleModalOpen(true);
  };

  // Function to generate single voucher PDF
  const handleGenerateVoucher = (sale: any) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const width = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(16, 185, 129); // Emerald color
    doc.text("SALE INVOICE", width / 2, 60, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Invoice No: ${sale.id.substring(0, 8).toUpperCase()}`, 40, 90);
    doc.text(`Date: ${formatsafeDateForPdf(sale.saleDate)}`, width - 40, 90, { align: 'right' });

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

    doc.text("Billed To:", leftCol, y);
    const customerName = sale.customer?.name || getCustomerName(sale.customerId);
    doc.setFont("helvetica", "bold");
    doc.text(customerName, leftCol, y + lineHeight);
    doc.setFont("helvetica", "normal");

    doc.text("Tour Package:", rightCol, y);
    doc.setFont("helvetica", "bold");
    doc.text(tourPackageName, rightCol, y + lineHeight);
    doc.setFont("helvetica", "normal");

    // Items Table if available
    let startY = 230;

    // If we had item level details we would list them here. 
    // For now we show the main description and amount.

    const rows = [
      [
        "1",
        sale.description || "Tour Package Sale",
        formatPrice(sale.salePrice).replace('₹', 'Rs. '),
        sale.gstPercentage ? `${sale.gstPercentage}%` : "-",
        formatPrice(sale.gstAmount || 0).replace('₹', 'Rs. '),
        formatPrice((sale.salePrice || 0) + (sale.gstAmount || 0)).replace('₹', 'Rs. ')
      ]
    ];

    autoTable(doc, {
      head: [['#', 'Description', 'Amount', 'GST %', 'GST Amt', 'Total']],
      body: rows,
      startY: startY,
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255] },
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
    doc.text(`Grand Total: ${formatPrice((sale.salePrice || 0) + (sale.gstAmount || 0)).replace('₹', 'Rs. ')}`, width - 40, finalY + 40, { align: 'right' });

    // Footer
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Authorized Signatory", width - 60, finalY + 100, { align: 'right' });

    doc.save(`sale-invoice-${sale.id.substring(0, 8)}.pdf`);
    toast.success("Invoice downloaded");
  };

  const formatsafeDateForPdf = (date: any) => {
    try {
      return format(new Date(date), "dd MMM yyyy");
    } catch (e) {
      return "N/A";
    }
  }
  const renderGSTInfo = (salePrice: number, gstAmount?: number | null, gstPercentage?: number | null) => {
    if (!gstAmount && !gstPercentage) return null;

    return (
      <div className="text-xs text-gray-500 mt-1">
        GST: ₹{(gstAmount || 0).toFixed(2)}
        {gstPercentage ? ` (${gstPercentage}%)` : ''}
      </div>
    );
  };

  // Look up customer name by ID
  const getCustomerName = (customerId?: string | null) => {
    if (!customerId) return 'N/A';
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.name : 'N/A';
  };

  // Calculate totals with tax included
  const totalAmount = salesData.reduce((sum, sale) => sum + (sale.salePrice || 0), 0);
  const totalGst = salesData.reduce((sum, sale) => sum + (sale.gstAmount || 0), 0);
  const totalAmountWithGst = totalAmount + totalGst;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-emerald-800">Sales Records</h3>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-emerald-800 border-emerald-800">
            {salesData.length} records
          </Badge>
          <Button
            onClick={() => {
              setEditItem(null);
              setIsSaleModalOpen(true);
            }}
            size="sm"
            variant="outline"
            className="text-green-600 border-green-600 hover:bg-green-50"
          >
            <PlusCircleIcon className="h-4 w-4 mr-1" />
            Add Sale
          </Button>
        </div>
      </div>

      {salesData.length > 0 ? (
        <Card className="shadow-lg rounded-lg border-l-4 border-emerald-500">
          <CardHeader className="py-3 bg-gray-50">
            <CardTitle className="text-sm font-medium grid grid-cols-[2fr_1fr_1fr_2fr_80px] gap-4">
              <div>Customer</div>
              <div>Date</div>
              <div>Amount (incl. GST)</div>
              <div>Description</div>
              <div>Actions</div>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[250px] overflow-y-auto p-0">
            {salesData.map((sale) => {
              // Calculate the total with GST for each individual sale
              const saleWithGst = (sale.salePrice || 0) + (sale.gstAmount || 0);

              return (
                <div key={sale.id}
                  className="grid grid-cols-[2fr_1fr_1fr_2fr_80px] gap-4 items-center p-3 border-b last:border-0 hover:bg-gray-50">
                  <div className="font-medium flex items-center">
                    <UserIcon className="h-4 w-4 mr-1 text-gray-500" />
                    {sale.customer?.name || getCustomerName(sale.customerId)}
                  </div>                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-1 text-gray-500" />
                    {formatSafeDate(sale.saleDate, "dd MMM yyyy")}
                  </div>
                  <div className="font-bold text-emerald-700">
                    <div>{formatPrice(saleWithGst)}</div>
                    {renderGSTInfo(sale.salePrice, sale.gstAmount, sale.gstPercentage)}
                  </div>
                  <div className="truncate text-gray-600">{sale.description || 'No description'}</div>
                  <div className="flex justify-center">
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(sale)}
                        className="h-7 w-7 p-0"
                      >
                        <Edit className="h-3.5 w-3.5 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(sale.id)}
                        className="h-7 w-7 p-0"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicate(sale)}
                        className="h-7 w-7 p-0"
                        title="Duplicate Sale"
                      >
                        <Copy className="h-3.5 w-3.5 text-orange-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleGenerateVoucher(sale)}
                        className="h-7 w-7 p-0"
                        title="Print Invoice"
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
                <span className="text-gray-500">Total Sales (incl. GST):</span>
                <span className="ml-2 font-bold text-emerald-700">{formatPrice(totalAmountWithGst)}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Total GST:</span>
                <span className="ml-2 font-bold text-emerald-700">{formatPrice(totalGst)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <p className="text-gray-500 italic">No sales records available</p>
      )}

      {/* Sale Entry/Edit Dialog */}
      <Dialog open={isSaleModalOpen} onOpenChange={setIsSaleModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <DialogTitle>
                {editItem && editItem.id ? "Edit Sale" : "Add New Sale"}
              </DialogTitle>
            </DialogTitle>
            <DialogDescription>
              {editItem && editItem.id ? "Edit sale details" : "Create a new sale for this tour package."}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <SaleFormWrapper
              initialData={editItem || {
                tourPackageQueryId: tourPackageId,
                tourPackageQuery: {
                  tourPackageQueryName: tourPackageName
                }
              }}
              units={units}
              taxSlabs={taxSlabs}
              customers={customers}
              onSuccess={() => {
                setIsSaleModalOpen(false);
                onRefresh();
                onRefresh();
                toast.success((editItem && editItem.id) ? "Sale updated successfully" : "Sale created successfully");
              }}
              submitButtonText={editItem && editItem.id ? "Update Sale" : "Create Sale"}
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

export default SalesSection;