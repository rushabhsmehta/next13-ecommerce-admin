import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

// GET - Fetch audit logs
export async function GET(req: Request) {
  try {
    const { userId } = auth();
    const { searchParams } = new URL(req.url);
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    // Extract query parameters
    const entityId = searchParams.get('entityId');
    const entityType = searchParams.get('entityType');
    const action = searchParams.get('action');
    const userIdFilter = searchParams.get('userId');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;
    
    // Build where clause based on parameters
    const whereClause: any = {};
    if (entityId) whereClause.entityId = entityId;
    if (entityType) whereClause.entityType = entityType;
    if (action) whereClause.action = action;
    if (userIdFilter) whereClause.userId = userIdFilter;
    
    // Fetch audit logs with pagination
    const auditLogs = await prismadb.auditLog.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    });
    
    // Count total matching logs for pagination
    const total = await prismadb.auditLog.count({
      where: whereClause
    });
    
    return NextResponse.json({
      auditLogs,
      pagination: {
        total,
        limit,
        offset
      }
    });
  } catch (error) {
    console.error('[AUDIT_LOGS_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

// POST - Create a new audit log entry
export async function POST(req: Request) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    const body = await req.json();
    const { 
      entityId, 
      entityType, 
      action, 
      userEmail, 
      userName, 
      userRole,
      before, 
      after, 
      metadata 
    } = body;
    
    // Validate required fields
    if (!entityId) return new NextResponse("entityId is required", { status: 400 });
    if (!entityType) return new NextResponse("entityType is required", { status: 400 });
    if (!action) return new NextResponse("action is required", { status: 400 });
    if (!userEmail) return new NextResponse("userEmail is required", { status: 400 });
    if (!userName) return new NextResponse("userName is required", { status: 400 });
    if (!userRole) return new NextResponse("userRole is required", { status: 400 });
    
    // Create audit log entry
    const auditLog = await prismadb.auditLog.create({
      data: {
        entityId,
        entityType,
        action,
        userId,
        userEmail,
        userName,
        userRole,
        before,
        after,
        metadata
      }
    });
    
    return NextResponse.json(auditLog);
  } catch (error) {
    console.error('[AUDIT_LOGS_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}