import { add, format } from "date-fns";

import prismadb from "@/lib/prismadb";
import { TourPackageQueryClient } from "./components/client";
import { TourPackageQueryColumn } from "./components/columns";
import Navbar from "@/components/navbar";


const tourPackageQueryPage = async (
  props: {
    searchParams: Promise<{ page?: string, pageSize?: string }>
  }
) => {
  const searchParams = await props.searchParams;
  // Parse pagination params
  const page = parseInt(searchParams?.page || '1');
  const pageSize = parseInt(searchParams?.pageSize || '25');
  const skip = (page - 1) * pageSize;

  // Fetch total count for pagination
  const totalCount = await prismadb.tourPackageQuery.count({
    where: {
      isArchived: false,
    }
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  // Optimized query: only fetch necessary fields, with pagination
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
      location: {
        select: {
          label: true,
        }
      }
    },
    where: {
      isArchived: false,
    },
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
  }));

  return (
    <>
      {/*       <Navbar /> */}


      <div className="flex-col">
        <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
          <TourPackageQueryClient
            data={formattedtourPackageQuery}
            pagination={{
              page,
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

