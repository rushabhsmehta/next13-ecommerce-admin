
import prismadb from "@/lib/prismadb";

export async function getSales(params: {
  customerId?: string;
  status?: string;
} = {}) {
  try {
    const { customerId, status } = params;
    
    let query: any = {};
    
    if (customerId) {
      query.customerId = customerId;
    }
    
    if (status) {
      query.status = status;
    }

    const sales = await prismadb.saleDetail.findMany({
      where: query,
      include: {
        customer: true,
        tourPackageQuery: true,
        items: {
          include: {
            taxSlab: true,
            unitOfMeasure: true,
          }
        }
      },
      orderBy: {
        saleDate: 'desc'
      }
    });

    return sales;
  } catch (error) {
    console.error("[GET_SALES]", error);
    return [];
  }
}
