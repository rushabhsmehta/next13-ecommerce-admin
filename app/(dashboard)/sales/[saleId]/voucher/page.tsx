import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { VoucherActions } from "@/components/voucher-actions";

interface SaleVoucherPageProps {
  params: {
    saleId: string;
  };
}

const SaleVoucherPage = async ({ params }: SaleVoucherPageProps) => {
  // Get sale details with related data
  const sale = await prismadb.saleDetail.findUnique({
    where: {
      id: params.saleId,
    },
    include: {
      tourPackageQuery: true,
      customer: true,
    },
  });

  if (!sale) {
    return notFound();
  }

  // Format the sale date
  const formattedDate = format(sale.saleDate, "MMMM d, yyyy");

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <Heading 
            title="Sales Voucher" 
            description="View and print sales voucher"
          />
          <VoucherActions id={params.saleId} type="sale" />
        </div>
        <Separator />
        
        <div id="voucher-content" className="bg-white p-8 shadow-md rounded-lg">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-1">SALES VOUCHER</h1>
            <p className="text-muted-foreground">Tour Package Sale Receipt</p>
          </div>
          
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-1">CUSTOMER</h3>
              <p className="font-medium">{sale.customer?.name || "N/A"}</p>
              <p>{sale.customer?.contact || "No contact information"}</p>
              <p>{sale.customer?.email || ""}</p> {/* Changed from address to email which exists in the customer type */}
            </div>
            <div className="text-right">
              <h3 className="font-semibold text-sm text-muted-foreground mb-1">VOUCHER DETAILS</h3>
              <p><span className="font-medium">Voucher No:</span> SV-{sale.id.substring(0, 8).toUpperCase()}</p>
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
                        <p className="font-medium">{sale.tourPackageQuery?.tourPackageQueryName || "Tour Package"}</p>
                        <p className="text-muted-foreground text-sm">{sale.description || "No description"}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">{formatPrice(sale.salePrice)}</td>
                  </tr>
                </tbody>
                <tfoot className="bg-slate-50">
                  <tr>
                    <td className="py-3 px-4 text-right font-semibold">Total:</td>
                    <td className="py-3 px-4 text-right font-bold">{formatPrice(sale.salePrice)}</td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-2 gap-6 mt-12">
            <div>
              <div className="border-t pt-2">
                <p className="text-center text-sm">Customer Signature</p>
              </div>
            </div>
            <div>
              <div className="border-t pt-2">
                <p className="text-center text-sm">Authorized Signature</p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>Thank you for your business!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaleVoucherPage;
