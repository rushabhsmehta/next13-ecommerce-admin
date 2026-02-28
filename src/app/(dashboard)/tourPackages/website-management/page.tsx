import prismadb from "@/lib/prismadb";
import { isCurrentUserAssociate } from "@/lib/associate-utils";
import { WebsiteManagementClient } from "../components/website-management-client";

const WebsiteManagementPage = async () => {
  const [locations, tourPackages, isAssociate] = await Promise.all([
    prismadb.location.findMany({
      select: {
        id: true,
        label: true,
      },
      orderBy: {
        label: "asc",
      },
    }),
    prismadb.tourPackage.findMany({
      select: {
        id: true,
        tourPackageName: true,
        locationId: true,
        isFeatured: true,
        isArchived: true,
        websiteSortOrder: true,
        updatedAt: true,
        location: {
          select: {
            id: true,
            label: true,
          },
        },
        primaryRelatedPackages: {
          where: {
            relationType: "related",
          },
          include: {
            relatedTourPackage: {
              select: {
                id: true,
                tourPackageName: true,
                locationId: true,
                isArchived: true,
                websiteSortOrder: true,
              },
            },
          },
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
      orderBy: [
        {
          location: {
            label: "asc",
          },
        },
        {
          websiteSortOrder: "asc",
        },
        {
          updatedAt: "desc",
        },
      ],
    }),
    isCurrentUserAssociate(),
  ]);

  const locationOptions = locations.map((location) => ({
    id: location.id,
    label: location.label,
  }));

  const packageData = tourPackages.map((pkg) => ({
    id: pkg.id,
    name: pkg.tourPackageName ?? "Untitled Package",
    locationId: pkg.locationId,
    locationLabel: pkg.location?.label ?? "Unknown",
    isFeatured: pkg.isFeatured,
    isArchived: pkg.isArchived,
    websiteSortOrder: pkg.websiteSortOrder ?? 0,
    updatedAt: pkg.updatedAt.toISOString(),
    relatedPackages: pkg.primaryRelatedPackages
      .filter((relation) => relation.relatedTourPackage)
      .map((relation) => ({
        id: relation.relatedTourPackage!.id,
        name: relation.relatedTourPackage!.tourPackageName ?? "Untitled Package",
        locationId: relation.relatedTourPackage!.locationId,
        isArchived: relation.relatedTourPackage!.isArchived,
        websiteSortOrder: relation.relatedTourPackage!.websiteSortOrder ?? 0,
        sortOrder: relation.sortOrder ?? 0,
      })),
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <WebsiteManagementClient
          locations={locationOptions}
          packages={packageData}
          readOnly={isAssociate}
        />
      </div>
    </div>
  );
};

export default WebsiteManagementPage;
