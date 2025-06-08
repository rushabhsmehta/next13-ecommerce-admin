import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import * as bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET(
  req: Request
) {
  try {
    const { userId } = auth();
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active');

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const whereClause = activeOnly === 'true' ? { isActive: true } : {};

    const operationalStaff = await prismadb.operationalStaff.findMany({
      where: whereClause,
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(operationalStaff);
  } catch (error) {
    console.log('[OPERATIONAL_STAFF_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function POST(
  req: Request
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { name, email, password, role, isActive } = body;

    // Validate required fields
    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }

    if (!email) {
      return new NextResponse("Email is required", { status: 400 });
    }

    if (!password) {
      return new NextResponse("Password is required", { status: 400 });
    }

    // Validate role
    if (role && !['OPERATIONS', 'ADMIN'].includes(role)) {
      return new NextResponse("Invalid role. Must be 'OPERATIONS' or 'ADMIN'", { status: 400 });
    }

    // Check if email is already in use
    const existingStaff = await prismadb.operationalStaff.findUnique({
      where: {
        email: email
      }
    });

    if (existingStaff) {
      return new NextResponse("Email is already in use", { status: 400 });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create operational staff
    const operationalStaff = await prismadb.operationalStaff.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'OPERATIONS',
        isActive: isActive !== undefined ? isActive : true
      }
    });

    // Remove password from response for security
    const { password: _, ...staffWithoutPassword } = operationalStaff;

    return NextResponse.json(staffWithoutPassword);
  } catch (error) {
    console.log('[OPERATIONAL_STAFF_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
