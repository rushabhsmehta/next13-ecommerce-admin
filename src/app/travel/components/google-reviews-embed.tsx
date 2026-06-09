"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Loader2, Star } from "lucide-react";
import {
  getGoogleBusinessUrl,
  getGoogleMapsEmbedUrl,
} from "@/lib/travel-site-config";

type LiveReview = {
  authorName: string;
  authorPhotoUrl: string | null;
  rating: number;
  text: string;
  relativeTime: string | null;
  authorUri: string | null;
};

type ReviewsResponse = {
  configured: boolean;
  displayName?: string;
  rating?: number | null;
  userRatingCount?: number | null;
  googleMapsUri?: string | null;
  reviews: LiveReview[];
};

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${
            i < rating
              ? "text-amber-400 fill-amber-400"
              : "text-gray-200 fill-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: LiveReview }) {
  const initials = review.authorName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <article className="min-w-[280px] max-w-[320px] flex-shrink-0 snap-start rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        {review.authorPhotoUrl ? (
          <Image
            src={review.authorPhotoUrl}
            alt=""
            width={40}
            height={40}
            className="rounded-full object-cover"
            unoptimized
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-white text-xs font-bold">
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {review.authorName}
          </p>
          {review.relativeTime && (
            <p className="text-xs text-gray-400">{review.relativeTime}</p>
          )}
        </div>
      </div>
      <StarRow rating={review.rating} />
      <p className="mt-3 text-sm text-gray-600 leading-relaxed line-clamp-6">
        {review.text}
      </p>
      {review.authorUri && (
        <a
          href={review.authorUri}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-xs text-gray-400 hover:text-orange-600"
        >
          View on Google
        </a>
      )}
    </article>
  );
}

export function GoogleReviewsEmbed() {
  const googleBusinessUrl = getGoogleBusinessUrl();
  const mapsEmbedUrl = getGoogleMapsEmbedUrl();

  const placeId = process.env.NEXT_PUBLIC_GOOGLE_PLACE_ID?.trim();
  const shouldFetchReviews = Boolean(
    placeId || googleBusinessUrl?.includes("place_id")
  );

  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [loading, setLoading] = useState(shouldFetchReviews);

  useEffect(() => {
    if (!shouldFetchReviews) return;

    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/travel/google-reviews");
        if (!res.ok) return;
        const json = (await res.json()) as ReviewsResponse;
        if (!cancelled) setData(json);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [shouldFetchReviews]);

  const reviewsLink =
    data?.googleMapsUri || googleBusinessUrl || undefined;
  const hasLiveReviews = Boolean(data?.configured && data.reviews.length > 0);

  if (loading) {
    return (
      <div className="flex justify-center py-8 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (hasLiveReviews && data) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-amber-100 bg-amber-50/60 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
              <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden>
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Google rating — {data.displayName}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {data.rating != null && (
                  <span className="text-lg font-bold text-gray-900">
                    {data.rating.toFixed(1)}
                  </span>
                )}
                {data.rating != null && <StarRow rating={Math.round(data.rating)} />}
                {data.userRatingCount != null && (
                  <span className="text-sm text-gray-500">
                    ({data.userRatingCount} reviews)
                  </span>
                )}
              </div>
            </div>
          </div>
          {reviewsLink && (
            <a
              href={reviewsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white border border-amber-200 px-5 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
            >
              Read all on Google
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          {data.reviews.map((review, idx) => (
            <ReviewCard key={`${review.authorName}-${idx}`} review={review} />
          ))}
        </div>
      </div>
    );
  }

  if (mapsEmbedUrl) {
    return (
      <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-white">
        <iframe
          title="Aagam Holidays on Google Maps"
          src={mapsEmbedUrl}
          className="w-full h-[420px] sm:h-[480px] border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
        {reviewsLink && (
          <div className="px-4 py-3 border-t border-gray-100 text-center">
            <Link
              href={reviewsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-orange-600 hover:underline"
            >
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              Read reviews on Google
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>
    );
  }

  return null;
}
