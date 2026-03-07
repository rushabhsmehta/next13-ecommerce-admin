import { notFound } from "next/navigation";
import Link from "next/link";
import prismadb from "@/lib/prismadb";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit, ArrowLeft } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { PurchaseSaleLinkManager } from "./components/purchase-sale-link-manager";

export default async function PurchaseViewPage({
  params
}: {
  params: { purchaseId: string }
}) {
  const purchase = await prismadb.purchaseDetail.findUnique({
    where: { id: params.purchaseId },
    include: {
      supplier: { select: { id: true, name: true, contact: true } },
      items: {
        include: { taxSlab: true, unitOfMeasure: true },
        orderBy: { orderIndex: 'asc' }
      },
      purchaseReturns: {
        include: { items: true }
      },
      paymentAllocations: {
        include: {
          paymentDetail: {
            select: {
              id: true,
              paymentDate: true,
              amount: true,
              transactionId: true,
              note: true,
              paymentType: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      },
      linkedSales: {
        include: {
          saleDetail: {
            include: {
              customer: { select: { name: true } }
            }
          }
        }
      }
    }
  }) as any;

  if (!purchase) notFound();

  const netPayable = purchase.netPayable ?? ((purchase.price || 0) + (purchase.gstAmount || 0));
  const totalPaid = purchase.paymentAllocations.reduce((sum: number, a: any) => sum + a.allocatedAmount, 0);
  const totalReturns = purchase.purchaseReturns.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
  const balanceDue = netPayable - totalPaid - totalReturns;

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/purchases">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">
                {purchase.billNumber || `Purchase #${purchase.id.slice(0, 8)}`}
              </h1>
              <p className="text-sm text-muted-foreground">
                {purchase.supplier?.name} • {new Date(purchase.purchaseDate).toLocaleDateString('en-IN')}
              </p>
            </div>
            {purchase.isGst ? (
              <Badge className="bg-green-100 text-green-800 border-green-300">GST Bill</Badge>
            ) : (
              <Badge variant="outline">Non-GST</Badge>
            )}
          </div>
          <Link href={`/purchases/${params.purchaseId}`}>
            <Button size="sm">
              <Edit className="h-4 w-4 mr-1" /> Edit
            </Button>
          </Link>
        </div>

        {/* Financial Summary Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-blue-600 font-medium">Bill Amount</p>
              <p className="text-xl font-bold text-blue-900">{formatPrice(netPayable)}</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-green-600 font-medium">Paid</p>
              <p className="text-xl font-bold text-green-900">{formatPrice(totalPaid)}</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-red-600 font-medium">Returns</p>
              <p className="text-xl font-bold text-red-900">{formatPrice(totalReturns)}</p>
            </CardContent>
          </Card>
          <Card className={balanceDue > 0.01 ? "bg-orange-50 border-orange-200" : "bg-green-50 border-green-200"}>
            <CardContent className="pt-4 pb-4">
              <p className={`text-xs font-medium ${balanceDue > 0.01 ? "text-orange-600" : "text-green-600"}`}>Balance Due</p>
              <p className={`text-xl font-bold ${balanceDue > 0.01 ? "text-orange-900" : "text-green-900"}`}>{formatPrice(balanceDue)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="items">
          <TabsList>
            <TabsTrigger value="items">Line Items ({purchase.items.length})</TabsTrigger>
            <TabsTrigger value="payments">Payments ({purchase.paymentAllocations.length})</TabsTrigger>
            <TabsTrigger value="sales">Linked Sales ({purchase.linkedSales.length})</TabsTrigger>
            <TabsTrigger value="returns">Returns ({purchase.purchaseReturns.length})</TabsTrigger>
          </TabsList>

          {/* Line Items Tab */}
          <TabsContent value="items">
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="border-b">
                      <th className="text-left px-4 py-3 font-medium">Product / Service</th>
                      <th className="text-right px-4 py-3 font-medium">Qty</th>
                      <th className="text-right px-4 py-3 font-medium">Price</th>
                      <th className="text-right px-4 py-3 font-medium">Tax</th>
                      <th className="text-right px-4 py-3 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchase.items.map((item: any) => (
                      <tr key={item.id} className="border-b">
                        <td className="px-4 py-3">
                          <div className="font-medium">{item.productName}</div>
                          {item.description && <div className="text-xs text-gray-500">{item.description}</div>}
                        </td>
                        <td className="px-4 py-3 text-right">{item.quantity} {item.unitOfMeasure?.name || ''}</td>
                        <td className="px-4 py-3 text-right">{formatPrice(item.pricePerUnit)}</td>
                        <td className="px-4 py-3 text-right">
                          {item.taxSlab ? `${item.taxSlab.percentage}%` : '-'}
                          {item.taxAmount ? ` (${formatPrice(item.taxAmount)})` : ''}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">{formatPrice(item.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-right font-medium">Subtotal:</td>
                      <td className="px-4 py-3 text-right font-medium">{formatPrice(purchase.price)}</td>
                    </tr>
                    {purchase.gstAmount ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-2 text-right text-gray-600">
                          GST ({purchase.gstPercentage ? `${purchase.gstPercentage}%` : ''}):
                        </td>
                        <td className="px-4 py-2 text-right text-gray-600">{formatPrice(purchase.gstAmount)}</td>
                      </tr>
                    ) : null}
                    <tr className="border-t-2">
                      <td colSpan={4} className="px-4 py-3 text-right font-bold">Total:</td>
                      <td className="px-4 py-3 text-right font-bold">{formatPrice(netPayable)}</td>
                    </tr>
                  </tfoot>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payment History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {purchase.paymentAllocations.length === 0 ? (
                  <div className="px-6 py-8 text-center text-muted-foreground">No payments recorded yet</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr className="border-b">
                        <th className="text-left px-4 py-3 font-medium">Date</th>
                        <th className="text-left px-4 py-3 font-medium">Reference</th>
                        <th className="text-right px-4 py-3 font-medium">Amount Applied</th>
                        <th className="text-left px-4 py-3 font-medium">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchase.paymentAllocations.map((alloc: any) => (
                        <tr key={alloc.id} className="border-b">
                          <td className="px-4 py-3">
                            {new Date(alloc.paymentDetail.paymentDate).toLocaleDateString('en-IN')}
                          </td>
                          <td className="px-4 py-3">
                            <Link href={`/payments/${alloc.paymentDetailId}`} className="text-blue-600 hover:underline">
                              {alloc.paymentDetail.transactionId || alloc.paymentDetailId.slice(0, 8)}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-green-700">
                            {formatPrice(alloc.allocatedAmount)}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">{alloc.note || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={2} className="px-4 py-3 font-medium">Total Paid:</td>
                        <td className="px-4 py-3 text-right font-bold text-green-700">{formatPrice(totalPaid)}</td>
                        <td />
                      </tr>
                      <tr>
                        <td colSpan={2} className="px-4 py-2 font-medium">Balance Due:</td>
                        <td className={`px-4 py-2 text-right font-bold ${balanceDue > 0.01 ? 'text-orange-600' : 'text-green-600'}`}>
                          {formatPrice(balanceDue)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Linked Sales Tab */}
          <TabsContent value="sales">
            <PurchaseSaleLinkManager
              purchaseId={params.purchaseId}
              linkedSales={purchase.linkedSales}
            />
          </TabsContent>

          {/* Returns Tab */}
          <TabsContent value="returns">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Purchase Returns</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {purchase.purchaseReturns.length === 0 ? (
                  <div className="px-6 py-8 text-center text-muted-foreground">No returns recorded</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr className="border-b">
                        <th className="text-left px-4 py-3 font-medium">Return Date</th>
                        <th className="text-left px-4 py-3 font-medium">Reason</th>
                        <th className="text-right px-4 py-3 font-medium">Amount</th>
                        <th className="text-left px-4 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchase.purchaseReturns.map((ret: any) => (
                        <tr key={ret.id} className="border-b">
                          <td className="px-4 py-3">{new Date(ret.returnDate).toLocaleDateString('en-IN')}</td>
                          <td className="px-4 py-3 text-gray-600">{ret.returnReason || '-'}</td>
                          <td className="px-4 py-3 text-right font-medium text-red-600">{formatPrice(ret.amount)}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline">{ret.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
