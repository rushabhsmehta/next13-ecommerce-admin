import { NextResponse } from "next/server";
import { fetchGooglePlaceReviews } from "@/lib/google-places-reviews";
import { handleApi } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleApi(async () => {
    const payload = await fetchGooglePlaceReviews();
    if (!payload) {
      return NextResponse.json({ configured: false, reviews: [] });
    }

    const res = NextResponse.json({
      configured: true,
      placeId: payload.placeId,
      displayName: payload.displayName,
      rating: payload.rating,
      userRatingCount: payload.userRatingCount,
      googleMapsUri: payload.googleMapsUri,
      reviews: payload.reviews.slice(0, 8),
    });
    res.headers.set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    return res;
  });
}
