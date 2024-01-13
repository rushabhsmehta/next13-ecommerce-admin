

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

// GET method to retrieve a specific itinerary master
export async function GET(req: Request, { params }: {params : { itineraryMasterId : string}}) {
  try {
    if (!params.itineraryMasterId) {
      return new NextResponse("Itinerary id is required", { status: 400 });
    }

    const itineraryMaster = await prismadb.itineraryMaster.findUnique({
      where: {
        id: params.itineraryMasterId
      },
      include: {
        location: true,
        itineraryMasterImages: true,
        activities: {
          include: {
            activityImages: true,
          },
          orderBy: {
            createdAt: 'asc'
          },
        }
      }
    });

    return NextResponse.json(itineraryMaster);
  } catch (error) {
    console.log('[ITINERARYMASTER_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};

// DELETE method to delete a specific itinerary master
export async function DELETE(req: Request, { params }: { params : {itineraryMasterId : string, storeId : string }}) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.itineraryMasterId) {
      return new NextResponse("Itinerary id is required", { status: 400 });
    }

    const storeByUserId = await prismadb.store.findFirst({
      where: {
        id: params.storeId,
        userId,
      }
    });

    if (!storeByUserId) {
      return new NextResponse("Unauthorized", { status: 405 });
    }

    const itineraryMaster = await prismadb.itineraryMaster.delete({
      where: {
        id: params.itineraryMasterId,
      }
    });

    return NextResponse.json(itineraryMaster);
  } catch (error) {
    console.log('[ITINERARYMASTER_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};

// PATCH method to update a specific itinerary master
export async function PATCH(req: Request, { params }: { params : {itineraryMasterId : string, storeId : string }}) {
  try {
    const { userId } = auth();
    const body = await req.json();
    const {
      itineraryMasterTitle,
      itineraryMasterDescription,
      itineraryMasterImages,
      activities,
      locationId,
      tourPackageId,
      tourPackageQueryId,
      dayNumber,
      days,
      hotelId,
      mealsIncluded,
    } = body;

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!locationId) {
      return new NextResponse("Location ID is required", { status: 400 });
    }

    if (!itineraryMasterImages || !itineraryMasterImages.length) {
      return new NextResponse("Images are required", { status: 400 });
    }

    if (!itineraryMasterTitle) {
      return new NextResponse("Title is required", { status: 400 });
    }

    if (!itineraryMasterDescription) {
      return new NextResponse("Description is required", { status: 400 });
    }

    if (!params.storeId) {
      return new NextResponse("Store id is required", { status: 400 });
}


const storeByUserId = await prismadb.store.findFirst({
  where: {
    id: params.storeId,
    userId,
  }
});

if (!storeByUserId) {
  return new NextResponse("Unauthorized", { status: 405 });
}

const operations = [];
const itineraryMasterUpdateData = {
  locationId,
  tourPackageId,
  tourPackageQueryId,
  itineraryMasterTitle,
  itineraryMasterDescription,
  dayNumber,
  days,
  hotelId,
  mealsIncluded,
  itineraryMasterImages: {
    deleteMany: {},
    createMany: {
      data: itineraryMasterImages.map((image: { url: any; }) => ({ url: image.url })),
    },
  },
  activities: {
    deleteMany: {},
  },
};

operations.push(prismadb.itineraryMaster.update({
  where: { id: params.itineraryMasterId },
  data: itineraryMasterUpdateData,
}));

activities.forEach((activity: { activityTitle: any; activityDescription: any; locationId: any; activityImages: any[]; }) => {
  const activityData = {
    storeId: params.storeId,
    itineraryMasterId: params.itineraryMasterId,
    activityTitle: activity.activityTitle,
    activityDescription: activity.activityDescription,
    locationId: activity.locationId,
    activityImages: {
      createMany: {
        data: activity.activityImages.map((img: { url: any; }) => ({ url: img.url })),
      },
    },
  };

  operations.push(prismadb.activity.create({ data: activityData }));
});

await prismadb.$transaction(operations);

const updatedItineraryMaster = await prismadb.itineraryMaster.findUnique({
  where: { id: params.itineraryMasterId },
  include: {
    location: true,
    itineraryMasterImages: true,
    activities: {
      include: {
        activityImages: true,
      },
    },
  },
});

return NextResponse.json(updatedItineraryMaster);
} catch (error) {
console.log('[ITINERARY_PATCH]', error);
return new NextResponse("Internal error", { status: 500 });
}
};
    
