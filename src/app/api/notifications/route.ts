import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

// GET - Fetch all notifications
export async function GET(req: Request) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }
    
    // Get query parameters
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined;
    
    // Create where clause based on parameters
    const whereClause: any = {};
    if (unreadOnly) {
      whereClause.read = false;
    }
    
    // Fetch notifications
    const notifications = await prismadb.notification.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });
    
    // Count total unread notifications
    const unreadCount = await prismadb.notification.count({
      where: {
        read: false
      }
    });
    
    return NextResponse.json({
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error('[NOTIFICATIONS_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

// POST - Create a new notification
export async function POST(req: Request) {
  try {
    const { userId } = auth();
    const body = await req.json();
    
    const { type, title, message, data } = body;
    
    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }
    
    if (!type) {
      return new NextResponse("Type is required", { status: 400 });
    }
    
    if (!title) {
      return new NextResponse("Title is required", { status: 400 });
    }
    
    if (!message) {
      return new NextResponse("Message is required", { status: 400 });
    }
    
    // Create notification
    const notification = await prismadb.notification.create({
      data: {
        type,
        title,
        message,
        data
      }
    });
    
    return NextResponse.json(notification);
  } catch (error) {
    console.error('[NOTIFICATIONS_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}