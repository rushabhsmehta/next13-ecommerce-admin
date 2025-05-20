'use client'

import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Edit, PlusCircleIcon, Trash2, User as UserIcon, CornerUpLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Customer, UnitOfMeasure, SaleReturn, TaxSlab } from '@prisma/client';
import { formatPrice, formatSafeDate } from '@/lib/utils';
import { SaleReturnForm } from '@/components/forms/sale-return-form';

// Define the interface for the section props
interface SaleReturnsSectionProps {
    saleReturnsData: SaleReturn[];
    sales: any[];             // list of sales to return from
    units?: UnitOfMeasure[];
    taxSlabs?: TaxSlab[];
    customers?: Customer[];
    tourPackageId: string;
    tourPackageName: string;
    onRefresh: () => void;
    isRefreshing: boolean;
}

const SaleReturnsSection: React.FC<SaleReturnsSectionProps> = ({
    saleReturnsData,
    sales,
    units,
    taxSlabs,
    customers,
    tourPackageId,
    tourPackageName,
    onRefresh,
    isRefreshing
}) => {
    // Calculate totals
    const totalReturnsAmount = saleReturnsData.reduce((sum, saleReturn) => sum + saleReturn.amount, 0);
    const totalReturnsGST = saleReturnsData.reduce((sum, saleReturn) => sum + (saleReturn.gstAmount || 0), 0);
    const totalReturnsWithGst = totalReturnsAmount + totalReturnsGST;

    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
    const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
    // Use sales list passed in props
    const availableSales = sales || [];

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-amber-800">Sale Returns</h3>
                <div className="flex items-center space-x-2">
                    <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={() => setIsReturnModalOpen(true)}>
                        <PlusCircleIcon className="h-4 w-4 mr-1" /> Add Return
                    </Button>
                    <Badge variant="outline" className="text-amber-800 border-amber-800">
                        {saleReturnsData.length} records
                    </Badge>
                </div>
            </div>

            {saleReturnsData.length > 0 ? (
                <Card className="shadow-lg rounded-lg border-l-4 border-amber-500">
                    <CardHeader className="py-3 bg-gray-50">
                        <CardTitle className="text-sm font-medium grid grid-cols-[2fr_1fr_1fr_2fr_1fr] gap-4">
                            <div>Customer</div>
                            <div>Date</div>
                            <div>Amount (incl. GST)</div>
                            <div>Reason</div>
                            <div>Status</div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-[250px] overflow-y-auto p-0">
                        {saleReturnsData.map((saleReturn) => {
                            // Calculate the total with GST for each individual return
                            const returnWithGst = saleReturn.amount + (saleReturn.gstAmount || 0);

                            return (
                                <div key={saleReturn.id}
                                    className="grid grid-cols-[2fr_1fr_1fr_2fr_1fr] gap-4 items-center p-3 border-b last:border-0 hover:bg-gray-50">
                                    <div className="font-medium flex items-center">
                                        <UserIcon className="h-4 w-4 mr-1 text-gray-500" />
                                        {/* Find the sale that corresponds to this return's saleDetailId, then get its customer */}
                                        {customers?.find(c =>
                                            sales.find(s => s.id === saleReturn.saleDetailId)?.customerId === c.id
                                        )?.name || 'N/A'}
                                    </div>
                                    <div className="flex items-center">
                                        <CalendarIcon className="h-4 w-4 mr-1 text-gray-500" />
                                        {format(new Date(saleReturn.returnDate), "dd MMM yyyy")}
                                    </div>
                                    <div className="font-bold text-amber-700">
                                        <div>{formatPrice(returnWithGst)}</div>
                                        {saleReturn.gstAmount ? (
                                            <div className="text-xs text-gray-500">
                                                GST: ₹{(saleReturn.gstAmount).toFixed(2)}
                                            </div>
                                        ) : null}
                                    </div>
                                    <div className="text-sm text-gray-600 truncate">
                                        {saleReturn.returnReason || 'No reason provided'}
                                    </div>
                                    <div>
                                        <Badge
                                            variant={saleReturn.status === 'completed' ? 'default' :
                                                saleReturn.status === 'pending' ? 'secondary' : 'destructive'}
                                        >
                                            {saleReturn.status}
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
                                <span className="ml-2 font-bold text-amber-700">{formatPrice(totalReturnsWithGst)}</span>
                            </div>
                            <div className="text-sm">
                                <span className="text-gray-500">Total GST:</span>
                                <span className="ml-2 font-bold text-amber-700">{formatPrice(totalReturnsGST)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <p className="text-gray-500 italic">No sale returns records available</p>
            )}

            {/* Sale Return Modal */}
            <Dialog open={isReturnModalOpen} onOpenChange={(open) => { setIsReturnModalOpen(open); if (!open) setSelectedSaleId(null); }}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Add Sale Return</DialogTitle>
                        <DialogDescription>Create a new sale return record.</DialogDescription>
                    </DialogHeader>

                    {availableSales.length === 0 ? (
                        <div className="p-6 text-center">
                            <p className="text-amber-600 mb-4">No sales available to return</p>
                            <p className="text-gray-500">You need to create at least one sale before you can record a return.</p>
                        </div>
                    ) : (
                        <SaleReturnForm
                            initialData={null}
                            sales={availableSales}
                            customers={customers || []}
                            units={units || []}
                            taxSlabs={taxSlabs || []}
                            selectedSaleId={selectedSaleId || undefined}
                            onClose={() => { setIsReturnModalOpen(false); setSelectedSaleId(null); onRefresh(); }}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SaleReturnsSection;
