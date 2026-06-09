import { redirect } from "next/navigation";
import { travelHref } from "@/lib/travel-paths";
import { getServerTravelBasePath } from "@/lib/travel-paths-server";

export default async function TravelAccountPage() {
  const basePath = await getServerTravelBasePath();
  redirect(travelHref("/packages", basePath));
}
