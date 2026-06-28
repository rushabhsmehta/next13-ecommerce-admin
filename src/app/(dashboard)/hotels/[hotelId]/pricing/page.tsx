import { redirect } from "next/navigation";

export default async function LegacyHotelPricingRedirect({
  params,
}: {
  params: Promise<{ hotelId: string }>;
}) {
  const { hotelId } = await params;
  redirect(`/hotel-pricing?hotelId=${encodeURIComponent(hotelId)}`);
}
