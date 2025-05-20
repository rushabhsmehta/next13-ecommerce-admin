
import prismadb from "@/lib/prismadb";

export async function getPurchaseReturns(params: {
  supplierId?: string;
  purchaseDetailId?: string;
} = {}) {
  try {
    const { supplierId, purchaseDetailId } = params;
    
    let query: any = {};
    
    if (purchaseDetailId) {
      query.purchaseDetailId = purchaseDetailId;
    }
    
    if (supplierId) {
      query.purchaseDetail = {
        supplierId
      };
    }

    const purchaseReturns = await prismadb.purchaseReturn.findMany({
      where: query,
      include: {
        purchaseDetail: {
          include: {
            supplier: true
          }
        },
        items: {
          include: {
            taxSlab: true,
            unitOfMeasure: true,
            purchaseItem: true
          }
        }
      },
      orderBy: {
        returnDate: 'desc'
      }
    });

    return purchaseReturns;
  } catch (error) {
    console.error("[GET_PURCHASE_RETURNS]", error);
    return [];
  }
}
