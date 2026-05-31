import type { Prisma } from "@prisma/client";

type ItineraryMediaSource = {
  itineraryImages?: { url: string }[];
  activities?: {
    activityTitle?: string | null;
    activityDescription?: string | null;
    activityImages?: { url: string }[];
  }[];
};

/** Copy day images and activities (with images) onto a newly created query itinerary. */
export async function copyItineraryMedia(
  tx: Prisma.TransactionClient,
  source: ItineraryMediaSource,
  createdItineraryId: string,
  locationId: string
): Promise<void> {
  const dayImages = source.itineraryImages ?? [];
  if (dayImages.length > 0) {
    await tx.images.createMany({
      data: dayImages.map((img) => ({
        url: img.url,
        itinerariesId: createdItineraryId,
      })),
    });
  }

  const activities = source.activities ?? [];
  for (const act of activities) {
    const createdAct = await tx.activity.create({
      data: {
        itineraryId: createdItineraryId,
        locationId,
        activityTitle: act.activityTitle ?? "",
        activityDescription: act.activityDescription ?? null,
      },
    });

    const actImages = act.activityImages ?? [];
    if (actImages.length > 0) {
      await tx.images.createMany({
        data: actImages.map((img) => ({
          url: img.url,
          activitiesId: createdAct.id,
        })),
      });
    }
  }
}
