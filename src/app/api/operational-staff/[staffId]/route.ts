import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import * as bcrypt from 'bcryptjs';

export async function GET(
  req: Request,
  { params }: { params: { staffId: string } }
) {
  try {
    if (!params.staffId) {
      return new NextResponse("Staff ID is required", { status: 400 });
    }

    const operationalStaff = await prismadb.operationalStaff.findUnique({
      where: {
        id: params.staffId
      }
    });
  
    return NextResponse.json(operationalStaff);
  } catch (error) {
    console.log('[OPERATIONAL_STAFF_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { staffId: string } }
) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    const body = await req.json();
    
    const { name, email, password, role, isActive } = body;
    
    if (!params.staffId) {
      return new NextResponse("Staff ID is required", { status: 400 });
    }

    // Check if staff exists
    const existingStaff = await prismadb.operationalStaff.findUnique({
      where: { id: params.staffId }
    });

    if (!existingStaff) {
      return new NextResponse("Operational staff not found", { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (password) updateData.password = await bcrypt.hash(password, 10);
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    const operationalStaff = await prismadb.operationalStaff.update({
      where: {
        id: params.staffId
      },
      data: updateData
    });
  
    return NextResponse.json(operationalStaff);
  } catch (error) {
    console.log('[OPERATIONAL_STAFF_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { staffId: string } }
) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.staffId) {
      return new NextResponse("Staff ID is required", { status: 400 });
    }

    const operationalStaff = await prismadb.operationalStaff.delete({
      where: {
        id: params.staffId
      }
    });
  
    return NextResponse.json(operationalStaff);
  } catch (error) {
    console.log('[OPERATIONAL_STAFF_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
