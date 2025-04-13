import { NextResponse } from "next/server";
import { cookies } from 'next/headers';

export async function POST() {
  try {
    // Clear the authentication cookie
    cookies().delete('ops_token');
    
    return NextResponse.json({
      message: "Signed out successfully"
    });
  } catch (error) {
    console.log('[OPS_AUTH_SIGNOUT_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
