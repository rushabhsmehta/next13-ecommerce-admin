import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import { TravelNavbar } from "./components/travel-navbar";
import { TravelFooter } from "./components/travel-footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Aagam Holidays - Discover Amazing Tour Packages",
  description:
    "Explore handcrafted tour packages to the most beautiful destinations. Book your dream vacation with Aagam Holidays.",
};

export default function TravelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${inter.className} min-h-screen bg-white`}>
      <TravelNavbar />
      <main>{children}</main>
      <TravelFooter />
    </div>
  );
}
