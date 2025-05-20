
import prismadb from "@/lib/prismadb";

export async function getSuppliers(params: {
  isActive?: boolean;
} = {}) {
  try {
    const { isActive } = params;
    
    let query: any = {};
    
    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    const suppliers = await prismadb.supplier.findMany({
      where: query,
      orderBy: {
        name: 'asc'
      }
    });

    return suppliers;
  } catch (error) {
    console.error("[GET_SUPPLIERS]", error);
    return [];
  }
}
