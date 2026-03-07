import { notFound } from "next/navigation";
import Link from "next/link";
import prismadb from "@/lib/prismadb";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit, ArrowLeft } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { SalePurchaseLinkManager } from "./components/sale-purchase-link-manager";

export default async function SaleViewPage({
  params
}: {
  params: { saleId: string }
}) {
  const sale = await prismadb.saleDetail.findUnique({
    where: { id: params.saleId },
    include: {
      customer: { select: { id: true, name: true, contact: true } },
      items: {
        include: { taxSlab: true, unitOfMeasure: true },
        orderBy: { orderIndex: 'asc' }
      },
      saleReturns: {
        include: { items: true }
      },
      receiptAllocations: {
        include: {
          receiptDetail: {
            select: {
              id: true,
              receiptDate: true,
              amount: true,
              reference: true,
              note: true,
              receiptType: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      },
      linkedPurchases: {
        include: {
          purchaseDetail: {
            include: {
              supplier: { select: { name: true } }
            }
          }
        }
      }
    }
  });

  if (!sale) notFound();

  const totalInvoiceAmount = (sale.salePrice || 0) + (sale.gstAmount || 0);
  const totalReceived = sale.receiptAllocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
  const totalReturns = sale.saleReturns.reduce((sum, r) => sum + (r.amount || 0), 0);
  const balanceDue = totalInvoiceAmount - totalReceived - totalReturns;

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/sales">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">
                {sale.invoiceNumber || `Sale #${sale.id.slice(0, 8)}`}
              </h1>
              <p className="text-sm text-muted-foreground">
                {sale.customer?.name} • {new Date(sale.saleDate).toLocaleDateString('en-IN')}
              </p>
            </div>
            {sale.isGst ? (
              <Badge className="bg-green-100 text-green-800 border-green-300">GST Invoice</Badge>
            ) : (
              <Badge variant="outline">Non-GST</Badge>
            )}
          </div>
          <Link href={`/sales/${params.saleId}`}>
            <Button size="sm">
              <Edit className="h-4 w-4 mr-1" /> Edit
            </Button>
          </Link>
        </div>

        {/* Financial Summary Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-blue-600 font-medium">Invoice Amount</p>
              <p className="text-xl font-bold text-blue-900">{formatPrice(totalInvoiceAmount)}</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-green-600 font-medium">Received</p>
              <p className="text-xl font-bold text-green-900">{formatPrice(totalReceived)}</p>
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
            <TabsTrigger value="items">Line Items ({sale.items.length})</TabsTrigger>
            <TabsTrigger value="receipts">Receipts ({sale.receiptAllocations.length})</TabsTrigger>
            <TabsTrigger value="purchases">Linked Purchases ({sale.linkedPurchases.length})</TabsTrigger>
            <TabsTrigger value="returns">Returns ({sale.saleReturns.length})</TabsTrigger>
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
                    {sale.items.map(item => (
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
                      <td className="px-4 py-3 text-right font-medium">{formatPrice(sale.salePrice)}</td>
                    </tr>
                    {sale.gstAmount ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-2 text-right text-gray-600">
                          GST ({sale.gstPercentage ? `${sale.gstPercentage}%` : ''}):
                        </td>
                        <td className="px-4 py-2 text-right text-gray-600">{formatPrice(sale.gstAmount)}</td>
                      </tr>
                    ) : null}
                    <tr className="border-t-2">
                      <td colSpan={4} className="px-4 py-3 text-right font-bold">Total:</td>
                      <td className="px-4 py-3 text-right font-bold">{formatPrice(totalInvoiceAmount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Receipts Tab */}
          <TabsContent value="receipts">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payment History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {sale.receiptAllocations.length === 0 ? (
                  <div className="px-6 py-8 text-center text-muted-foreground">No payments received yet</div>
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
                      {sale.receiptAllocations.map(alloc => (
                        <tr key={alloc.id} className="border-b">
                          <td className="px-4 py-3">
                            {new Date(alloc.receiptDetail.receiptDate).toLocaleDateString('en-IN')}
                          </td>
                          <td className="px-4 py-3">
                            <Link href={`/receipts/${alloc.receiptDetailId}`} className="text-blue-600 hover:underline">
                              {alloc.receiptDetail.reference || alloc.receiptDetailId.slice(0, 8)}
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
                        <td colSpan={2} className="px-4 py-3 font-medium">Total Received:</td>
                        <td className="px-4 py-3 text-right font-bold text-green-700">{formatPrice(totalReceived)}</td>
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

          {/* Linked Purchases Tab */}
          <TabsContent value="purchases">
            <SalePurchaseLinkManager
              saleId={params.saleId}
              linkedPurchases={sale.linkedPurchases}
            />
          </TabsContent>

          {/* Returns Tab */}
          <TabsContent value="returns">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sale Returns</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {sale.saleReturns.length === 0 ? (
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
                      {sale.saleReturns.map(ret => (
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
