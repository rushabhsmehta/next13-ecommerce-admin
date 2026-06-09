import { headers } from "next/headers";
import { getTravelBasePathFromHost } from "@/lib/travel-paths";

export async function getServerTravelBasePath(): Promise<string> {
  const host = (await headers()).get("host") ?? "";
  return getTravelBasePathFromHost(host);
}
