
import prismadb from "@/lib/prismadb";

export async function getSaleReturns(params: {
  customerId?: string;
  saleDetailId?: string;
} = {}) {
  try {
    const { customerId, saleDetailId } = params;
    
    let query: any = {};
    
    if (saleDetailId) {
      query.saleDetailId = saleDetailId;
    }
    
    if (customerId) {
      query.saleDetail = {
        customerId
      };
    }

    const saleReturns = await prismadb.saleReturn.findMany({
      where: query,
      include: {
        saleDetail: {
          include: {
            customer: true
          }
        },
        items: {
          include: {
            taxSlab: true,
            unitOfMeasure: true,
            saleItem: true
          }
        }
      },
      orderBy: {
        returnDate: 'desc'
      }
    });

    return saleReturns;
  } catch (error) {
    console.error("[GET_SALE_RETURNS]", error);
    return [];
  }
}
