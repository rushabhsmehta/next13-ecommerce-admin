import { auth } from '@clerk/nextjs/server';
import prismadb from '@/lib/prismadb';
import { replaceTourPackageQueryAccounting } from '@/lib/tour-package-query-accounting';
import { handleTourPackageQueryAccountingPatch } from '@/lib/tour-package-query-accounting-route';

export async function PATCH(req: Request, props: { params: Promise<{ tourPackageQueryId: string }> }) {
  const params = await props.params;
  const { userId } = await auth();
  const body = await req.json();

  return handleTourPackageQueryAccountingPatch({
    userId,
    tourPackageQueryId: params.tourPackageQueryId,
    body,
    findTourPackageQueryById: async (tourPackageQueryId) => {
      return prismadb.tourPackageQuery.findUnique({
        where: {
          id: tourPackageQueryId,
        },
        select: {
          id: true,
        },
      });
    },
    replaceTourPackageQueryAccounting,
  });
}
