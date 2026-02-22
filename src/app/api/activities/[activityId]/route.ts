import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import prismadb from "@/lib/prismadb";

export async function GET(req: Request, props: { params: Promise<{ activityId: string }> }) {
  const params = await props.params;
  try {
    if (!params.activityId) {
      return new NextResponse("Activity id is required", { status: 400 });
    }

    const activity = await prismadb.activity.findUnique({
      where: {
        id: params.activityId
      },
      include: {
        activityImages: true,
        location : true,
      }
    });
  
    return NextResponse.json(activity);
  } catch (error) {
    console.log('[ACTIVITY_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};

export async function DELETE(req: Request, props: { params: Promise<{ activityId : string }> }) {
  const params = await props.params;
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }



    if (!params.activityId) {
      return new NextResponse("Activity id is required", { status: 400 });
    }    
    

    const activity = await prismadb.activity.delete({
      where: {
        id: params.activityId,
      }
    });
  
    return NextResponse.json(activity);
  } catch (error) {
    console.log('[ACTIVITY_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};


export async function PATCH(req: Request, props: { params: Promise<{ activityId : string }> }) {
  const params = await props.params;
  try {   
    const { userId } = await auth();

    const body = await req.json();
    
    const { activityTitle, activityDescription, activityImages, locationId } = body;
    
    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!locationId) {
      return new NextResponse("Location ID is required", { status: 400 });
    }
    if (!activityImages || !activityImages.length) {
      return new NextResponse("Images are required", { status: 400 });
    }

    if (!activityTitle) {
      return new NextResponse("Title is required", { status: 400 });
    }

    if (!activityDescription) {
        return new NextResponse("Description is required", { status: 400 });
      }

    if (!params.activityId) {
      return new NextResponse("Activity id is required", { status: 400 });
    }

   

    

    await prismadb.activity.update({
      where: {
        id: params.activityId,
      },
      data: {
        activityTitle,
        activityDescription,
        locationId,
        activityImages: {
          deleteMany: {},
        },
      }
    });

    const activity = await prismadb.activity.update({
      where: {
        id: params.activityId
      },
      data: {
        activityImages: {
          createMany: {
            data: [
              ...activityImages.map((activityImage : { url: string }) => activityImage),
            ],
          },
        },  
      }
    }
    )
 
  
    return NextResponse.json(activity);
  } catch (error) {
    console.log('[ACTIVITY_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
};
