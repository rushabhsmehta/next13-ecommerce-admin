
import prismadb from "@/lib/prismadb";

export async function getPurchases(params: {
  supplierId?: string;
  status?: string;
} = {}) {
  try {
    const { supplierId, status } = params;
    
    let query: any = {};
    
    if (supplierId) {
      query.supplierId = supplierId;
    }
    
    if (status) {
      query.status = status;
    }

    const purchases = await prismadb.purchaseDetail.findMany({
      where: query,
      include: {
        supplier: true,
        tourPackageQuery: true,
        items: {
          include: {
            taxSlab: true,
            unitOfMeasure: true,
          }
        }
      },
      orderBy: {
        purchaseDate: 'desc'
      }
    });

    return purchases;
  } catch (error) {
    console.error("[GET_PURCHASES]", error);
    return [];
  }
}
