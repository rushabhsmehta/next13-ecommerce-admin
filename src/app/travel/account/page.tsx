import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prismadb from "@/lib/prismadb";
import { travelHref } from "@/lib/travel-paths";
import { getServerTravelBasePath } from "@/lib/travel-paths-server";
import { AccountClient } from "./components/account-client";

export const metadata = {
  title: "My Account | Aagam Holidays",
  description: "Manage your Aagam Holidays profile and saved tour packages.",
};

export default async function TravelAccountPage() {
  const basePath = await getServerTravelBasePath();
  const accountPath = travelHref("/account", basePath);
  const loginPath = travelHref(`/login?from=${encodeURIComponent(accountPath)}`, basePath);
  const chatPath = travelHref("/chat", basePath);
  const packagesPath = travelHref("/packages", basePath);
  const comparePath = travelHref("/compare", basePath);
  const homePath = travelHref("/", basePath);

  const { userId } = await auth();
  if (!userId) redirect(loginPath);

  const travelUser = await prismadb.travelAppUser.findUnique({
    where: { clerkUserId: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      isApproved: true,
    },
  });

  return (
    <AccountClient
      initialProfile={travelUser}
      chatPath={chatPath}
      packagesPath={packagesPath}
      comparePath={comparePath}
      homePath={homePath}
    />
  );
}
