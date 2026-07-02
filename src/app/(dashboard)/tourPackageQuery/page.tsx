import { add, format } from "date-fns";
import type { Prisma } from "@prisma/client";

import prismadb from "@/lib/prismadb";
import { TourPackageQueryClient } from "./components/client";
import { TourPackageQueryColumn } from "./components/columns";


const tourPackageQueryPage = async (
  props: {
    searchParams: Promise<{
      page?: string;
      pageSize?: string;
      search?: string;
      assignedTo?: string;
      status?: string;
    }>
  }
) => {
  const searchParams = await props.searchParams;
  const search = searchParams?.search?.trim() || "";
  const assignedToParam = searchParams?.assignedTo?.trim() || "";
  const assignedTo = assignedToParam && assignedToParam !== "all" ? assignedToParam : "";
  const statusParam = searchParams?.status;
  const status: "all" | "confirmed" | "pending" = statusParam === "confirmed" || statusParam === "pending"
    ? statusParam
    : "all";

  // Parse pagination params
  const parsedPage = parseInt(searchParams?.page || '1');
  const parsedPageSize = parseInt(searchParams?.pageSize || '25');
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const pageSize = Number.isFinite(parsedPageSize) && parsedPageSize > 0 ? parsedPageSize : 25;

  const where: Prisma.TourPackageQueryWhereInput = {
    isArchived: false,
  };

  if (search) {
    where.OR = [
      { tourPackageQueryNumber: { contains: search } },
      { customerNumber: { contains: search } },
      { customerName: { contains: search } },
      { tourPackageQueryName: { contains: search } },
      { assignedTo: { contains: search } },
    ];
  }

  if (assignedTo) {
    where.assignedTo = assignedTo;
  }

  if (status !== "all") {
    where.isFeatured = status === "confirmed";
  }

  const [totalCount, confirmedCount, pendingCount, assigneeRows] = await Promise.all([
    prismadb.tourPackageQuery.count({ where }),
    prismadb.tourPackageQuery.count({
      where: {
        AND: [where, { isFeatured: true }],
      },
    }),
    prismadb.tourPackageQuery.count({
      where: {
        AND: [where, { isFeatured: false }],
      },
    }),
    prismadb.tourPackageQuery.findMany({
      where: {
        isArchived: false,
        assignedTo: { not: null },
      },
      select: {
        assignedTo: true,
      },
      distinct: ["assignedTo"],
      orderBy: {
        assignedTo: "asc",
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);
  const skip = (currentPage - 1) * pageSize;

  const tourPackageQuery = await prismadb.tourPackageQuery.findMany({
    skip,
    take: pageSize,
    select: {
      id: true,
      tourPackageQueryNumber: true,
      tourPackageQueryName: true,
      tourPackageQueryType: true,
      customerName: true,
      assignedTo: true,
      isFeatured: true,
      isArchived: true,
      customerNumber: true,
      tourStartsFrom: true,
      updatedAt: true,
      confirmedVariantId: true,
      queryVariantSnapshots: {
        select: {
          id: true,
          name: true,
          sourceVariantId: true,
        }
      },
      customQueryVariants: true,
      location: {
        select: {
          label: true,
        }
      }
    },
    where,
    orderBy: {
      updatedAt: 'desc'
    }
  });

  const formattedtourPackageQuery: TourPackageQueryColumn[] = tourPackageQuery.map((item) => ({
    id: item.id,
    tourPackageQueryNumber: item.tourPackageQueryNumber ?? '',
    tourPackageQueryName: item.tourPackageQueryName ?? '',
    tourPackageQueryType: item.tourPackageQueryType ?? '',
    customerName: item.customerName ?? '',
    assignedTo: item.assignedTo ?? '',
    isFeatured: item.isFeatured,
    isArchived: item.isArchived,
    customerNumber: item.customerNumber ?? '',
    location: item.location.label,
    tourStartsFrom: item.tourStartsFrom ? format(add(item.tourStartsFrom, { hours: 5, minutes: 30 }), 'dd-MM-yyyy') : '',
    updatedAt: item.updatedAt ? format(add(item.updatedAt, { hours: 5, minutes: 30 }), 'dd-MM-yyyy HH:mm') : '',
    confirmedVariantId: item.confirmedVariantId,
    queryVariantSnapshots: item.queryVariantSnapshots,
    customQueryVariants: item.customQueryVariants as any[],
  }));

  return (
    <>
      {/*       <Navbar /> */}


      <div className="flex-col">
        <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
          <TourPackageQueryClient
            data={formattedtourPackageQuery}
            assignees={assigneeRows
              .map((item) => item.assignedTo)
              .filter((item): item is string => Boolean(item))}
            filters={{
              search,
              assignedTo: assignedTo || "all",
              status,
            }}
            counts={{
              total: totalCount,
              confirmed: confirmedCount,
              pending: pendingCount,
            }}
            pagination={{
              page: currentPage,
              pageSize,
              totalCount,
              totalPages
            }}
          />
        </div>
      </div>

    </>
  );
};

export default tourPackageQueryPage;

