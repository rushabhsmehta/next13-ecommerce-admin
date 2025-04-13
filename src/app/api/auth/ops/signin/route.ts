import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import * as bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return new NextResponse("Missing email or password", { status: 400 });
    }

    // Find the operational staff member by email
    const staff = await prismadb.operationalStaff.findUnique({
      where: {
        email,
        isActive: true
      }
    });

    // If staff not found or inactive, return error
    if (!staff) {
      return new NextResponse("Invalid credentials", { status: 401 });
    }

    // Compare passwords
    const passwordMatch = await bcrypt.compare(password, staff.password);
    
    if (!passwordMatch) {
      return new NextResponse("Invalid credentials", { status: 401 });
    }
    
    // Generate JWT token
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key-change-in-production');
    
    const token = await new SignJWT({
      id: staff.id,
      email: staff.email,
      name: staff.name,
      role: staff.role
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);

    // Set cookie
    cookies().set({
      name: 'ops_token',
      value: token,
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 24 hours
      sameSite: 'strict'
    });

    // Return user info (excluding password)
    const { password: _, ...staffData } = staff;
    
    return NextResponse.json({
      user: staffData,
      message: "Authentication successful"
    });
  } catch (error) {
    console.log('[OPS_AUTH_SIGNIN_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
