'use client'

import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Edit, PlusCircleIcon, Trash2, User as UserIcon, CornerUpLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Supplier, UnitOfMeasure, PurchaseReturn, TaxSlab, PurchaseDetail } from '@prisma/client';
import { formatPrice, formatSafeDate } from '@/lib/utils';
import { PurchaseReturnForm } from '@/components/forms/purchase-return-form';
import { useRouter } from 'next/navigation';

// Define the interface for the section props
interface PurchaseReturnsSectionProps {
  purchaseReturnsData: PurchaseReturn[];
  units?: UnitOfMeasure[];
  taxSlabs?: TaxSlab[];
  suppliers?: Supplier[];
  tourPackageId: string;
  tourPackageName: string;
  onRefresh: () => void;
  isRefreshing: boolean;
  initialData?: any; // For accessing the purchase details
}

const PurchaseReturnsSection: React.FC<PurchaseReturnsSectionProps> = ({
  purchaseReturnsData,
  units,
  taxSlabs,
  suppliers,
  tourPackageId,
  tourPackageName,
  onRefresh,
  isRefreshing,
  initialData
}) => {
  // Calculate totals
  const totalReturnsAmount = purchaseReturnsData.reduce((sum, purchaseReturn) => sum + purchaseReturn.amount, 0);
  const totalReturnsGST = purchaseReturnsData.reduce((sum, purchaseReturn) => sum + (purchaseReturn.gstAmount || 0), 0);
  const totalReturnsWithGst = totalReturnsAmount + totalReturnsGST;
  // State for the modal
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);  // Filter unique purchase details for dropdown
  const uniquePurchases = Array.from(new Set(
    initialData?.purchaseDetails?.map((purchase: PurchaseDetail) => purchase.id) || []
  )).map((id) => {
    const purchase = initialData?.purchaseDetails?.find((p: PurchaseDetail) => p.id === id);
    return purchase;
  }).filter(Boolean);
    // Debug output for purchases
  console.log("Available purchases for returns:", initialData?.purchaseDetails?.length || 0, "purchases");
  if (initialData?.purchaseDetails && initialData.purchaseDetails.length > 0) {
    console.log("First purchase example:", {
      id: initialData.purchaseDetails[0].id,
      supplier: initialData.purchaseDetails[0].supplier?.name || 'N/A',
      date: initialData.purchaseDetails[0].purchaseDate,
      hasItems: initialData.purchaseDetails[0].items?.length > 0,
      itemsCount: initialData.purchaseDetails[0].items?.length || 0
    });
  }
  const handleAddReturn = (purchaseId: string) => {
    console.log("Selected purchase for return:", purchaseId);
    setSelectedPurchaseId(purchaseId);
    setIsReturnModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-cyan-800">Purchase Returns</h3>
        <div className="flex items-center space-x-2">
          <Button 
            onClick={() => setIsReturnModalOpen(true)}
            size="sm" 
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            <PlusCircleIcon className="h-4 w-4 mr-1" />
            Add Return
          </Button>
          <Badge variant="outline" className="text-cyan-800 border-cyan-800">
            {purchaseReturnsData.length} records
          </Badge>
        </div>
      </div>
      
      {purchaseReturnsData.length > 0 ? (
        <Card className="shadow-lg rounded-lg border-l-4 border-cyan-500">
          <CardHeader className="py-3 bg-gray-50">
            <CardTitle className="text-sm font-medium grid grid-cols-[2fr_1fr_1fr_2fr_1fr] gap-4">
              <div>Supplier</div>
              <div>Date</div>
              <div>Amount (incl. GST)</div>
              <div>Reason</div>
              <div>Status</div>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[250px] overflow-y-auto p-0">
            {purchaseReturnsData.map((purchaseReturn) => {
              // Calculate the total with GST for each individual return
              const returnWithGst = purchaseReturn.amount + (purchaseReturn.gstAmount || 0);
              
              return (
                <div key={purchaseReturn.id} 
                  className="grid grid-cols-[2fr_1fr_1fr_2fr_1fr] gap-4 items-center p-3 border-b last:border-0 hover:bg-gray-50">                  <div className="font-medium flex items-center">
                    <UserIcon className="h-4 w-4 mr-1 text-gray-500" />                    {suppliers?.find(s => 
                      // Look for the purchase detail that corresponds to this return's purchaseDetailId
                      initialData?.purchaseDetails?.find((p: PurchaseDetail) => p.id === purchaseReturn.purchaseDetailId)?.supplierId === s.id
                    )?.name || 'N/A'}
                  </div>
                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-1 text-gray-500" />
                    {format(new Date(purchaseReturn.returnDate), "dd MMM yyyy")}
                  </div>
                  <div className="font-bold text-cyan-700">
                    <div>{formatPrice(returnWithGst)}</div>
                    {purchaseReturn.gstAmount ? (
                      <div className="text-xs text-gray-500">
                        GST: ₹{(purchaseReturn.gstAmount).toFixed(2)}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-sm text-gray-600 truncate">
                    {purchaseReturn.returnReason || 'No reason provided'}
                  </div>
                  <div>
                    <Badge 
                      variant={purchaseReturn.status === 'completed' ? 'default' : 
                              purchaseReturn.status === 'pending' ? 'secondary' : 'destructive'}
                    >
                      {purchaseReturn.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
          <CardContent className="border-t bg-gray-50 py-2">
            <div className="flex justify-end items-center space-x-4">
              <div className="text-sm">
                <span className="text-gray-500">Total Returns (incl. GST):</span>
                <span className="ml-2 font-bold text-cyan-700">{formatPrice(totalReturnsWithGst)}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Total GST:</span>
                <span className="ml-2 font-bold text-cyan-700">{formatPrice(totalReturnsGST)}</span>
              </div>
            </div>
          </CardContent>
        </Card>      ) : (
        <p className="text-gray-500 italic">No purchase returns records available</p>
      )}      {/* Purchase Return Modal */}
      <Dialog open={isReturnModalOpen} onOpenChange={(open) => {
        setIsReturnModalOpen(open);
        if (!open) setSelectedPurchaseId(null);
      }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Add Purchase Return</DialogTitle>
            <DialogDescription>
              Create a new purchase return for items that were returned to the supplier.
            </DialogDescription>
          </DialogHeader>
          
          {uniquePurchases.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-amber-600 mb-4">No purchases available to return</p>
              <p className="text-gray-500">You need to create at least one purchase before you can record a return.</p>
            </div>
          ) : (
            <PurchaseReturnForm 
              initialData={null}
              purchases={initialData?.purchaseDetails || []}
              suppliers={suppliers || []}
              units={units || []}
              taxSlabs={taxSlabs || []}              selectedPurchaseId={selectedPurchaseId || undefined}
              onClose={() => {
                setIsReturnModalOpen(false);
                setSelectedPurchaseId(null);
                onRefresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseReturnsSection;
