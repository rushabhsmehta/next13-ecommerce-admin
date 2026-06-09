import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTravelBasePathFromHost } from "@/lib/travel-paths";
import { TravelNavbar } from "./components/travel-navbar";
import { TravelFooter } from "./components/travel-footer";
import { TravelPathProvider } from "./components/travel-path-provider";
import { TravelWhatsAppFab } from "./components/whatsapp-fab";
import { JsonLd } from "./components/json-ld";
import { buildTravelAgencyJsonLd } from "@/lib/travel-structured-data";

export const metadata: Metadata = {
  title: "Travel | Aagam Holidays - Discover Amazing Tour Packages",
  description:
    "Explore handcrafted tour packages to the most beautiful destinations. Book your dream vacation with Aagam Holidays.",
};

export default async function TravelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const host = (await headers()).get("host") ?? "";
  const basePath = getTravelBasePathFromHost(host);

  return (
    <TravelPathProvider basePath={basePath}>
      <JsonLd data={buildTravelAgencyJsonLd()} />
      <div className="min-h-screen bg-white">
        <TravelNavbar />
        <main>{children}</main>
        <TravelFooter />
        <TravelWhatsAppFab />
      </div>
    </TravelPathProvider>
  );
}
