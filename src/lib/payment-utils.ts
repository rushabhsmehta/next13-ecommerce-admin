import prismadb from "@/lib/prismadb";

/**
 * Calculates how much a customer has paid for a specific sale
 * @param saleId The ID of the sale to check payments for
 * @returns Object containing paid amount, total sale amount, and payment percentage
 */
export async function calculateSalePaymentStatus(saleId: string) {
  try {
    // Get the sale details first
    const sale = await prismadb.saleDetail.findUnique({
      where: { id: saleId },
      include: {
        customer: true,
        tourPackageQuery: true
      }
    });

    if (!sale) {
      throw new Error(`Sale with ID ${saleId} not found`);
    }

    // Calculate the total sale amount including GST if applicable
    const totalSaleAmount = sale.salePrice + (sale.gstAmount || 0);
    
    // Get all receipts for this customer related to this tour package
    const receipts = await prismadb.receiptDetail.findMany({
      where: {
        customerId: sale.customerId,
        tourPackageQueryId: sale.tourPackageQueryId
      }
    });

    // Calculate total amount paid through receipts
    const totalPaid = receipts.reduce((sum, receipt) => sum + receipt.amount, 0);
    
    // Calculate payment percentage (0 to 1)
    const paymentPercentage = totalSaleAmount > 0 
      ? Math.min(totalPaid / totalSaleAmount, 1) // Cap at 100%
      : 0;
    
    return {
      totalSaleAmount,
      totalPaid,
      paymentPercentage
    };
  } catch (error) {
    console.error("[CALCULATE_SALE_PAYMENT_STATUS]", error);
    return {
      totalSaleAmount: 0,
      totalPaid: 0,
      paymentPercentage: 0
    };
  }
}
