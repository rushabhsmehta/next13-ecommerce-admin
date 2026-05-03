import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Calendar, MessageCircle, Clock } from "lucide-react";
import prismadb from "@/lib/prismadb";
import { formatSafeDate } from "@/lib/utils";

export const metadata = {
  title: "My Chats | Aagam Holidays",
};

export default async function TravelChatPage() {
  const { userId } = await auth();
  if (!userId) redirect("/travel/login?from=/travel/chat");

  const travelUser = await prismadb.travelAppUser.findUnique({
    where: { clerkUserId: userId },
    include: {
      chatMemberships: {
        where: { isActive: true },
        include: { chatGroup: true },
        orderBy: { joinedAt: "desc" },
      },
    },
  });

  if (!travelUser) redirect("/travel/login?from=/travel/chat");

  if (!travelUser.isApproved) {
    return <PendingApprovalView name={travelUser.name} />;
  }

  return <TravelChatView name={travelUser.name} memberships={travelUser.chatMemberships} />;
}

function PendingApprovalView({ name }: { name: string }) {
  const whatsappLink = `https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_PHONE || ""}?text=Hi, I recently signed up on the Aagam Holidays app and would like to know about my account approval.`;

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-orange-50 mx-auto">
          <Clock className="w-8 h-8 text-orange-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Hi {name}!</h1>
          <p className="text-gray-600 leading-relaxed">
            Your account is currently under review. Once approved, you&apos;ll get access to your trip group chats and booking updates.
          </p>
        </div>
        <div className="bg-orange-50 rounded-xl p-4 text-sm text-orange-800 space-y-1">
          <p className="font-medium">Need faster access?</p>
          <p>Contact our team on WhatsApp and we&apos;ll get you set up quickly.</p>
        </div>
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-green-500 px-6 py-3 text-sm font-semibold text-white hover:bg-green-600 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          Contact us on WhatsApp
        </a>
      </div>
    </div>
  );
}

type Membership = {
  id: string;
  role: string;
  joinedAt: Date;
  chatGroup: {
    id: string;
    name: string;
    description: string | null;
    tourStartDate: Date | null;
    tourEndDate: Date | null;
    imageUrl: string | null;
  };
};

function TravelChatView({ name, memberships }: { name: string; memberships: Membership[] }) {
  if (memberships.length === 0) {
    return (
      <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-orange-50 mx-auto">
            <MessageCircle className="w-8 h-8 text-orange-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">Welcome, {name}!</h1>
            <p className="text-gray-600 leading-relaxed">
              You haven&apos;t been added to a trip group yet. Your coordinator will add you once your booking is confirmed.
            </p>
          </div>
          <a
            href="/travel/packages"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-6 py-3 text-sm font-semibold text-white hover:from-orange-600 hover:to-red-600 transition-colors"
          >
            Browse tour packages
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pt-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Chats</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back, {name}</p>
      </div>
      <div className="space-y-3">
        {memberships.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md hover:border-orange-100 transition-all"
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden">
              {m.chatGroup.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.chatGroup.imageUrl} alt={m.chatGroup.name} className="w-full h-full object-cover" />
              ) : (
                <MessageCircle className="w-5 h-5 text-orange-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{m.chatGroup.name}</p>
              {(m.chatGroup.tourStartDate || m.chatGroup.tourEndDate) && (
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <Calendar className="w-3 h-3" />
                  {m.chatGroup.tourStartDate && formatSafeDate(m.chatGroup.tourStartDate)}
                  {m.chatGroup.tourStartDate && m.chatGroup.tourEndDate && " – "}
                  {m.chatGroup.tourEndDate && formatSafeDate(m.chatGroup.tourEndDate)}
                </p>
              )}
              {m.chatGroup.description && (
                <p className="text-xs text-gray-400 truncate mt-0.5">{m.chatGroup.description}</p>
              )}
            </div>
            <span className="flex-shrink-0 text-xs text-orange-500 font-medium capitalize">
              {m.role.toLowerCase()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
