import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { z } from "zod";

import { handleApi, jsonError } from "@/lib/api-response";
import db from "../../../../lib/prismadb";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
    customInstructions: z.string().optional(),
});

export async function GET(req: Request) {
    return handleApi(async () => {
        const { userId } = auth();
        if (!userId) {
            return jsonError("Unauthenticated", 403, "AUTH");
        }

        const settings = await db.aiSettings.findUnique({
            where: { userId },
        });

        return NextResponse.json({
            customInstructions: settings?.customInstructions || "",
        });
    });
}

export async function POST(req: Request) {
    return handleApi(async () => {
        const { userId } = auth();
        if (!userId) {
            return jsonError("Unauthenticated", 403, "AUTH");
        }

        const parsed = bodySchema.parse(await req.json());

        const settings = await db.aiSettings.upsert({
            where: { userId },
            update: {
                customInstructions: parsed.customInstructions,
            },
            create: {
                userId,
                customInstructions: parsed.customInstructions,
            },
        });

        return NextResponse.json(settings);
    });
}
