import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

// GET a specific notification
export async function GET(
  req: Request,
  { params }: { params: { notificationId: string } }
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.notificationId) {
      return new NextResponse("Notification ID is required", { status: 400 });
    }

    const notification = await prismadb.notification.findUnique({
      where: {
        id: params.notificationId
      }
    });

    return NextResponse.json(notification);
  } catch (error) {
    console.error('[NOTIFICATION_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

// PATCH - Update a notification (mark as read)
export async function PATCH(
  req: Request,
  { params }: { params: { notificationId: string } }
) {
  try {
    const { userId } = auth();
    const body = await req.json();
    
    const { read } = body;

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.notificationId) {
      return new NextResponse("Notification ID is required", { status: 400 });
    }

    // Update notification (usually to mark as read)
    const updatedNotification = await prismadb.notification.update({
      where: {
        id: params.notificationId
      },
      data: {
        read
      }
    });
    
    return NextResponse.json(updatedNotification);
  } catch (error) {
    console.error('[NOTIFICATION_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

// DELETE - Delete a notification
export async function DELETE(
  req: Request,
  { params }: { params: { notificationId: string } }
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.notificationId) {
      return new NextResponse("Notification ID is required", { status: 400 });
    }

    // Delete the notification
    await prismadb.notification.delete({
      where: {
        id: params.notificationId
      }
    });
    
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[NOTIFICATION_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}