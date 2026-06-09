export type GooglePlaceReview = {
  authorName: string;
  authorPhotoUrl: string | null;
  rating: number;
  text: string;
  relativeTime: string | null;
  authorUri: string | null;
};

export type GooglePlaceReviewsPayload = {
  placeId: string;
  displayName: string;
  rating: number | null;
  userRatingCount: number | null;
  reviews: GooglePlaceReview[];
  googleMapsUri: string | null;
};

function trimEnv(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v || undefined;
}

export function getGooglePlacesApiKey(): string | undefined {
  return trimEnv(process.env.GOOGLE_PLACES_API_KEY);
}

export function getGooglePlaceId(): string | undefined {
  return trimEnv(process.env.NEXT_PUBLIC_GOOGLE_PLACE_ID);
}

export function extractPlaceIdFromGoogleUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    const q = parsed.searchParams.get("q");
    if (q?.startsWith("place_id:")) {
      return q.slice("place_id:".length);
    }
    const placeIdParam = parsed.searchParams.get("place_id");
    if (placeIdParam) return placeIdParam;

    const match = url.match(/place_id[=:]([A-Za-z0-9_-]+)/i);
    if (match?.[1]) return match[1];
  } catch {
    /* ignore */
  }
  return undefined;
}

export function resolveGooglePlaceId(): string | undefined {
  return (
    getGooglePlaceId() ||
    extractPlaceIdFromGoogleUrl(
      trimEnv(process.env.NEXT_PUBLIC_GOOGLE_BUSINESS_URL) || ""
    )
  );
}

export async function fetchGooglePlaceReviews(): Promise<GooglePlaceReviewsPayload | null> {
  const apiKey = getGooglePlacesApiKey();
  const placeId = resolveGooglePlaceId();
  if (!apiKey || !placeId) return null;

  const fieldMask = [
    "id",
    "displayName",
    "rating",
    "userRatingCount",
    "googleMapsUri",
    "reviews",
  ].join(",");

  const res = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    {
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldMask,
      },
      next: { revalidate: 3600 },
    }
  );

  if (!res.ok) {
    console.log("[GOOGLE_PLACES_REVIEWS]", res.status, await res.text().catch(() => ""));
    return null;
  }

  const data = await res.json();
  const reviews: GooglePlaceReview[] = (data.reviews ?? []).map(
    (review: {
      rating?: number;
      relativePublishTimeDescription?: string;
      text?: { text?: string };
      authorAttribution?: {
        displayName?: string;
        photoUri?: string;
        uri?: string;
      };
    }) => ({
      authorName: review.authorAttribution?.displayName || "Google user",
      authorPhotoUrl: review.authorAttribution?.photoUri ?? null,
      rating: review.rating ?? 0,
      text: review.text?.text?.trim() || "",
      relativeTime: review.relativePublishTimeDescription ?? null,
      authorUri: review.authorAttribution?.uri ?? null,
    })
  );

  return {
    placeId,
    displayName: data.displayName?.text || "Aagam Holidays",
    rating: typeof data.rating === "number" ? data.rating : null,
    userRatingCount:
      typeof data.userRatingCount === "number" ? data.userRatingCount : null,
    reviews: reviews.filter((r) => r.text.length > 0),
    googleMapsUri: data.googleMapsUri ?? null,
  };
}
