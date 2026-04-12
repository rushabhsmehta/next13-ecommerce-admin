import { NextResponse } from "next/server";
import { validateAssociateToken } from "../lib/validate-token";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const associate = await validateAssociateToken(req);
    if (!associate) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    return NextResponse.json({
      id: associate.id,
      name: associate.name,
      mobileNumber: associate.mobileNumber,
      email: associate.email,
    });
  } catch (error) {
    console.log("[ASSOCIATE_ME_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
