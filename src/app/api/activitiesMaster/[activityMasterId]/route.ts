import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import prismadb from "@/lib/prismadb";

export async function GET(req: Request, props: { params: Promise<{ activityMasterId: string }> }) {
  const params = await props.params;
  try {
    if (!params.activityMasterId) {
      return new NextResponse("Activity id is required", { status: 400 });
    }

    const activityMaster = await prismadb.activityMaster.findUnique({
      where: {
        id: params.activityMasterId
      },
      include: {
        activityMasterImages: true,
        location : true,
      }
    });
  
    return NextResponse.json(activityMaster);
  } catch (error) {
    console.log('[ACTIVITYMASTER_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};

export async function DELETE(req: Request, props: { params: Promise<{ activityMasterId : string }> }) {
  const params = await props.params;
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }



    if (!params.activityMasterId) {
      return new NextResponse("Activity id is required", { status: 400 });
    }    
    
   

    

    const activityMaster = await prismadb.activityMaster.delete({
      where: {
        id: params.activityMasterId,
      }
    });
  
    return NextResponse.json(activityMaster);
  } catch (error) {
    console.log('[ACTIVITYMASTER_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};


export async function PATCH(req: Request, props: { params: Promise<{ activityMasterId : string }> }) {
  const params = await props.params;
  try {   
    const { userId } = await auth();

    const body = await req.json();
    
    const { activityMasterTitle, activityMasterDescription, activityMasterImages, locationId } = body;
    
    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!locationId) {
      return new NextResponse("Location ID is required", { status: 400 });
    }
   // if (!activityMasterImages || !activityMasterImages.length) {
   //   return new NextResponse("Images are required", { status: 400 });
   // }

    if (!activityMasterTitle) {
      return new NextResponse("Title is required", { status: 400 });
    }

    if (!activityMasterDescription) {
        return new NextResponse("Description is required", { status: 400 });
      }

    if (!params.activityMasterId) {
      return new NextResponse("Activity id is required", { status: 400 });
    }

   

    

    await prismadb.activityMaster.update({
      where: {
        id: params.activityMasterId,
      },
      data: {
        activityMasterTitle,
        activityMasterDescription,
        locationId,
        activityMasterImages: {
          deleteMany: {},
        },
      }
    });

    const activityMaster = await prismadb.activityMaster.update({
      where: {
        id: params.activityMasterId
      },
      data: {
        activityMasterImages: {
          createMany: {
            data: [
              ...activityMasterImages.map((activityMasterImage : { url: string }) => activityMasterImage),
            ],
          },
        },  
      }
    }
    )
 
  
    return NextResponse.json(activityMaster);
  } catch (error) {
    console.log('[ACTIVITY_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};
