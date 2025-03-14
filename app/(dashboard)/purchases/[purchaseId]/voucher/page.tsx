import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Printer } from "lucide-react";
import { jsPDF } from "jspdf";

interface PurchaseVoucherPageProps {
  params: {
    purchaseId: string;
  };
}

const PurchaseVoucherPage = async ({ params }: PurchaseVoucherPageProps) => {
  // Get purchase details with related data
  const purchase = await prismadb.purchaseDetail.findUnique({
    where: {
      id: params.purchaseId,
    },
    include: {
      tourPackageQuery: true,
      supplier: true,
    },
  });

  if (!purchase) {
    return notFound();
  }

  // Format the purchase date
  const formattedDate = format(purchase.purchaseDate, "MMMM d, yyyy");

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <Heading 
            title="Purchase Voucher" 
            description="View and print purchase voucher"
          />
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => window.print()}
              className="flex items-center gap-2 print:hidden"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button 
              variant="default"
              onClick={() => {
                const doc = new jsPDF();
                // Capture the HTML content
                const content = document.getElementById('voucher-content');
                if (content) {
                  doc.html(content, {
                    callback: function(doc) {
                      doc.save(`purchase-voucher-${params.purchaseId}.pdf`);
                    },
                    x: 15,
                    y: 15,
                    width: 170,
                    windowWidth: 650
                  });
                }
              }}
              className="flex items-center gap-2 print:hidden"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>
        <Separator />
        
        <div id="voucher-content" className="bg-white p-8 shadow-md rounded-lg">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-1">PURCHASE VOUCHER</h1>
            <p className="text-muted-foreground">Supplier Purchase Record</p>
          </div>
          
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-1">SUPPLIER</h3>
              <p className="font-medium">{purchase.supplier?.name || "N/A"}</p>
              <p>{purchase.supplier?.contact || "No contact information"}</p>
              <p>{purchase.supplier?.address || ""}</p>
            </div>
            <div className="text-right">
              <h3 className="font-semibold text-sm text-muted-foreground mb-1">VOUCHER DETAILS</h3>
              <p><span className="font-medium">Voucher No:</span> PV-{purchase.id.substring(0, 8).toUpperCase()}</p>
              <p><span className="font-medium">Date:</span> {formattedDate}</p>
            </div>
          </div>
          
          <Card className="mb-6">
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-slate-100 text-slate-900">
                  <tr>
                    <th className="py-3 px-4 text-left font-medium">Description</th>
                    <th className="py-3 px-4 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-medium">{purchase.tourPackageQuery?.tourPackageQueryName || "Purchase"}</p>
                        <p className="text-muted-foreground text-sm">{purchase.description || "No description"}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">{formatPrice(purchase.price)}</td>
                  </tr>
                </tbody>
                <tfoot className="bg-slate-50">
                  <tr>
                    <td className="py-3 px-4 text-right font-semibold">Total:</td>
                    <td className="py-3 px-4 text-right font-bold">{formatPrice(purchase.price)}</td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-2 gap-6 mt-12">
            <div>
              <div className="border-t pt-2">
                <p className="text-center text-sm">Prepared By</p>
              </div>
            </div>
            <div>
              <div className="border-t pt-2">
                <p className="text-center text-sm">Supplier Signature</p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>Thank you for your service!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseVoucherPage;
