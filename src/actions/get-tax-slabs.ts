
import prismadb from "@/lib/prismadb";

export async function getTaxSlabs(params: {
  isActive?: boolean;
} = {}) {
  try {
    const { isActive } = params;
    
    let query: any = {};
    
    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    const taxSlabs = await prismadb.taxSlab.findMany({
      where: query,
      orderBy: {
        name: 'asc'
      }
    });

    return taxSlabs;
  } catch (error) {
    console.error("[GET_TAX_SLABS]", error);
    return [];
  }
}
