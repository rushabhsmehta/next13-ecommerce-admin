import prismadb from "@/lib/prismadb";

export async function getCustomers(params: {
  isActive?: boolean;
} = {}) {
  try {
    const { isActive } = params;
    
    let query: any = {};
    
    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    const customers = await prismadb.customer.findMany({
      where: query,
      orderBy: {
        name: 'asc'
      }
    });

    return customers;
  } catch (error) {
    console.error("[GET_CUSTOMERS]", error);
    return [];
  }
}
