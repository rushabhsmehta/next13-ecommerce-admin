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

interface ReceiptVoucherPageProps {
  params: {
    receiptId: string;
  };
}

const ReceiptVoucherPage = async ({ params }: ReceiptVoucherPageProps) => {
  // Get receipt details with related data
  const receipt = await prismadb.receiptDetail.findUnique({
    where: {
      id: params.receiptId,
    },
    include: {
      tourPackageQuery: true,
      customer: true,
      bankAccount: true,
      cashAccount: true,
    },
  });

  if (!receipt) {
    return notFound();
  }

  // Format the receipt date
  const formattedDate = format(receipt.receiptDate, "MMMM d, yyyy");
  
  // Determine payment method and account details
  const paymentMethod = receipt.bankAccount 
    ? `Bank - ${receipt.bankAccount.accountName}`
    : receipt.cashAccount
    ? `Cash - ${receipt.cashAccount.accountName}`
    : "Unknown";

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <Heading 
            title="Receipt Voucher" 
            description="View and print receipt voucher"
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
                      doc.save(`receipt-voucher-${params.receiptId}.pdf`);
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
            <h1 className="text-3xl font-bold mb-1">RECEIPT VOUCHER</h1>
            <p className="text-muted-foreground">Payment Receipt</p>
          </div>
          
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-1">RECEIVED FROM</h3>
              <p className="font-medium">{receipt.customer?.name || "N/A"}</p>
              <p>{receipt.customer?.contact || "No contact information"}</p>
              <p>{receipt.customer?.email || ""}</p> {/* Changed from address to email which exists in the customer type */}
            </div>
            <div className="text-right">
              <h3 className="font-semibold text-sm text-muted-foreground mb-1">VOUCHER DETAILS</h3>
              <p><span className="font-medium">Voucher No:</span> RV-{receipt.id.substring(0, 8).toUpperCase()}</p>
              <p><span className="font-medium">Date:</span> {formattedDate}</p>
              <p><span className="font-medium">Reference:</span> {receipt.reference || "-"}</p>
            </div>
          </div>
          
          <Card className="mb-6">
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-slate-100 text-slate-900">
                  <tr>
                    <th className="py-3 px-4 text-left font-medium">Description</th>
                    <th className="py-3 px-4 text-left font-medium">Payment Method</th>
                    <th className="py-3 px-4 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-medium">
                          {receipt.tourPackageQuery?.tourPackageQueryName 
                            ? `Payment for ${receipt.tourPackageQuery.tourPackageQueryName}` 
                            : receipt.note || "Customer Payment"
                          }
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-4">{paymentMethod}</td>
                    <td className="py-4 px-4 text-right">{formatPrice(receipt.amount)}</td>
                  </tr>
                </tbody>
                <tfoot className="bg-slate-50">
                  <tr>
                    <td colSpan={2} className="py-3 px-4 text-right font-semibold">Total:</td>
                    <td className="py-3 px-4 text-right font-bold">{formatPrice(receipt.amount)}</td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-2 gap-6 mt-12">
            <div>
              <div className="border-t pt-2">
                <p className="text-center text-sm">Received By</p>
              </div>
            </div>
            <div>
              <div className="border-t pt-2">
                <p className="text-center text-sm">Authorized Signature</p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>Thank you for your payment!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptVoucherPage;
