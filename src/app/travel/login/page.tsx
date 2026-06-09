import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prismadb from "@/lib/prismadb";
import { travelHref } from "@/lib/travel-paths";
import { getServerTravelBasePath } from "@/lib/travel-paths-server";
import { EmailOtpForm } from "./components/email-otp-form";

export const metadata = {
  title: "Login | Aagam Holidays",
  description: "Sign in to access your trip chats and booking updates.",
};

export default async function TravelLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const basePath = await getServerTravelBasePath();
  const { userId } = await auth();
  const params = await searchParams;
  const returnTo = params.from ?? travelHref("/chat", basePath);

  if (userId) {
    const travelUser = await prismadb.travelAppUser.findUnique({
      where: { clerkUserId: userId },
    });
    if (travelUser) redirect(returnTo);
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-16">
      <EmailOtpForm returnTo={returnTo} />
    </div>
  );
}
