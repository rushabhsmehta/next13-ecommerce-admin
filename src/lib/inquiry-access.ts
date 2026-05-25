import { clerkClient } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";

export interface InquiryAccessContext {
  userId: string;
  isAdminLike: boolean;
  isAssociate: boolean;
  associatePartnerId: string | null;
  associatePartner:
    | {
        id: string;
        name: string;
        email: string | null;
        mobileNumber: string;
      }
    | null;
}

function clerkEmailsLowercased(user: {
  emailAddresses: { emailAddress?: string | null }[];
}): string[] {
  const seen = new Set<string>();
  for (const addr of user.emailAddresses) {
    const raw = addr.emailAddress?.trim().toLowerCase();
    if (raw) seen.add(raw);
  }
  return Array.from(seen);
}

export async function resolveInquiryAccessContext(
  userId: string
): Promise<InquiryAccessContext> {
  const membership = await prismadb.organizationMember.findFirst({
    where: { userId, isActive: true },
    select: { id: true },
  });

  if (membership) {
    return {
      userId,
      isAdminLike: true,
      isAssociate: false,
      associatePartnerId: null,
      associatePartner: null,
    };
  }

  let emails: string[] = [];
  try {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    emails = clerkEmailsLowercased(user);
  } catch (error) {
    console.log("[INQUIRY_ACCESS] Clerk user lookup failed", error);
  }

  const associatePartner =
    emails.length > 0
      ? await prismadb.associatePartner.findFirst({
          where: {
            isActive: true,
            OR: emails.flatMap((email) => [{ email }, { gmail: email }]),
          },
          select: {
            id: true,
            name: true,
            email: true,
            mobileNumber: true,
          },
        })
      : null;

  const isAssociate = !!associatePartner;

  return {
    userId,
    isAdminLike: false,
    isAssociate,
    associatePartnerId: isAssociate ? associatePartner!.id : null,
    associatePartner: isAssociate ? associatePartner : null,
  };
}

/**
 * Whether this Clerk user may use inquiry APIs at all (list/create/delete at route level).
 * Travel-app-only users (no org membership, not an associate partner) must not see or mutate inquiries here.
 */
export function canActOnInquiries(ctx: InquiryAccessContext): boolean {
  return ctx.isAdminLike || ctx.isAssociate;
}

/**
 * Row-level access: org staff see all; associates only rows tied to their partner id.
 */
export function canAccessInquiryForContext(
  ctx: InquiryAccessContext,
  inquiryAssociatePartnerId: string | null
): boolean {
  if (ctx.isAdminLike) return true;
  if (ctx.isAssociate) {
    return inquiryAssociatePartnerId === ctx.associatePartnerId;
  }
  return false;
}
