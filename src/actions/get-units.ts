
import prismadb from "@/lib/prismadb";

export async function getUnitsOfMeasure(params: {
  isActive?: boolean;
} = {}) {
  try {
    const { isActive } = params;
    
    let query: any = {};
    
    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    const units = await prismadb.unitOfMeasure.findMany({
      where: query,
      orderBy: {
        name: 'asc'
      }
    });

    return units;
  } catch (error) {
    console.error("[GET_UNITS_OF_MEASURE]", error);
    return [];
  }
}
