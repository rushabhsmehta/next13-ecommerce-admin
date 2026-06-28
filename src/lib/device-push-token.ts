import prismadb from "@/lib/prismadb";

export function isValidExpoPushToken(token: string): boolean {
  return (
    token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken[")
  );
}

export async function upsertDevicePushToken(opts: {
  expoPushToken: string;
  platform?: string | null;
  appVariant?: string;
  travelAppUserId?: string | null;
}) {
  const {
    expoPushToken,
    platform = null,
    appVariant = "public",
    travelAppUserId = null,
  } = opts;

  return prismadb.devicePushToken.upsert({
    where: { expoPushToken },
    create: {
      expoPushToken,
      platform,
      appVariant,
      travelAppUserId,
      isActive: true,
      marketingOptIn: true,
      lastSeenAt: new Date(),
    },
    update: {
      isActive: true,
      lastSeenAt: new Date(),
      platform: platform ?? undefined,
      appVariant,
      ...(travelAppUserId ? { travelAppUserId } : {}),
    },
  });
}

export async function deactivateDevicePushToken(expoPushToken: string) {
  await prismadb.devicePushToken.updateMany({
    where: { expoPushToken },
    data: { isActive: false },
  });
}

/** Link an install token to the signed-in travel user (best-effort). */
export async function linkDeviceTokenToTravelUser(
  expoPushToken: string,
  travelAppUserId: string,
) {
  await prismadb.devicePushToken.updateMany({
    where: { expoPushToken },
    data: { travelAppUserId, lastSeenAt: new Date(), isActive: true },
  });
}
