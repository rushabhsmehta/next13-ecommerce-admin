import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { handleApi, jsonError } from "@/lib/api-response";
import { requireOrgAdmin } from "@/lib/authz";
import { sendMarketingBroadcast } from "@/lib/expo-push";

export const dynamic = "force-dynamic";

const broadcastSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(500),
  /** Optional deep-link path, e.g. `/packages/some-slug` */
  linkPath: z.string().max(500).optional(),
});

export async function GET() {
  return handleApi(async () => {
    const { userId } = await auth();
    if (!userId) return jsonError("Unauthenticated", 403);
    await requireOrgAdmin(userId);

    const [devices, broadcasts] = await Promise.all([
      prismadb.devicePushToken.count({
        where: { isActive: true, marketingOptIn: true, appVariant: "public" },
      }),
      prismadb.marketingPushBroadcast.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    return NextResponse.json({
      activeDeviceCount: devices,
      broadcasts,
    });
  });
}

export async function POST(req: Request) {
  return handleApi(async () => {
    const { userId } = await auth();
    if (!userId) return jsonError("Unauthenticated", 403);
    await requireOrgAdmin(userId);

    const body = broadcastSchema.parse(await req.json());
    const data = body.linkPath ? { linkPath: body.linkPath } : undefined;

    const result = await sendMarketingBroadcast({
      title: body.title.trim(),
      body: body.body.trim(),
      data,
      appVariant: "public",
    });

    const record = await prismadb.marketingPushBroadcast.create({
      data: {
        title: body.title.trim(),
        body: body.body.trim(),
        data: data ?? undefined,
        sentBy: userId,
        recipientCount: result.recipientCount,
        ticketOkCount: result.ticketOkCount,
        ticketErrorCount: result.ticketErrorCount,
      },
    });

    return NextResponse.json({
      success: true,
      broadcast: record,
      ...result,
    });
  });
}
