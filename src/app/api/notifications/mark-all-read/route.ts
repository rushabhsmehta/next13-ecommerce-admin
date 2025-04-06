import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

// POST - Mark all notifications as read
export async function POST(req: Request) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }
    
    // Update all unread notifications to read
    const { count } = await prismadb.notification.updateMany({
      where: {
        read: false
      },
      data: {
        read: true
      }
    });
    
    return NextResponse.json({ markedAsRead: count });
  } catch (error) {
    console.error('[NOTIFICATIONS_MARK_ALL_READ]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}