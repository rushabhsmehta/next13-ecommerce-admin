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

interface PaymentVoucherPageProps {
  params: {
    paymentId: string;
  };
}

const PaymentVoucherPage = async ({ params }: PaymentVoucherPageProps) => {
  // Get payment details with related data
  const payment = await prismadb.paymentDetail.findUnique({
    where: {
      id: params.paymentId,
    },
    include: {
      tourPackageQuery: true,
      supplier: true,
      bankAccount: true,
      cashAccount: true,
    },
  });

  if (!payment) {
    return notFound();
  }

  // Format the payment date
  const formattedDate = format(payment.paymentDate, "MMMM d, yyyy");
  
  // Determine payment method and account details
  const paymentMethod = payment.method || (payment.bankAccount 
    ? `Bank - ${payment.bankAccount.accountName}`
    : payment.cashAccount
    ? `Cash - ${payment.cashAccount.accountName}`
    : "Unknown");

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <Heading 
            title="Payment Voucher" 
            description="View and print payment voucher"
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
                      doc.save(`payment-voucher-${params.paymentId}.pdf`);
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
            <h1 className="text-3xl font-bold mb-1">PAYMENT VOUCHER</h1>
            <p className="text-muted-foreground">Payment to Supplier</p>
          </div>
          
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-1">PAID TO</h3>
              <p className="font-medium">{payment.supplier?.name || "N/A"}</p>
              <p>{payment.supplier?.contact || "No contact information"}</p>
              <p>{payment.supplier?.email || ""}</p> {/* Changed from address to email which exists in the supplier type */}
            </div>
            <div className="text-right">
              <h3 className="font-semibold text-sm text-muted-foreground mb-1">VOUCHER DETAILS</h3>
              <p><span className="font-medium">Voucher No:</span> PY-{payment.id.substring(0, 8).toUpperCase()}</p>
              <p><span className="font-medium">Date:</span> {formattedDate}</p>
              <p><span className="font-medium">Reference:</span> {payment.transactionId || "-"}</p>
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
                          {payment.tourPackageQuery?.tourPackageQueryName 
                            ? `Payment for ${payment.tourPackageQuery.tourPackageQueryName}` 
                            : payment.note || "Supplier Payment"
                          }
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-4">{paymentMethod}</td>
                    <td className="py-4 px-4 text-right">{formatPrice(payment.amount)}</td>
                  </tr>
                </tbody>
                <tfoot className="bg-slate-50">
                  <tr>
                    <td colSpan={2} className="py-3 px-4 text-right font-semibold">Total:</td>
                    <td className="py-3 px-4 text-right font-bold">{formatPrice(payment.amount)}</td>
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
            <p>This serves as official proof of payment.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentVoucherPage;
