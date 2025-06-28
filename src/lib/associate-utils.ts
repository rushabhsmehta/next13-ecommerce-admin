import { headers } from "next/headers";
import { auth, currentUser } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

/**
 * Check if current request is from an associate domain
 */
export function isAssociateDomain(): boolean {
  if (typeof window !== 'undefined') {
    // Client-side
    return window.location.hostname.includes('associate.aagamholidays.com');
  } else {
    // Server-side
    const headersList = headers();
    const hostname = headersList.get('host') || '';
    return hostname.includes('associate.aagamholidays.com');
  }
}

/**
 * Get current associate partner information if user is accessing from associate domain
 */
export async function getCurrentAssociatePartner() {
  const { userId } = auth();
  
  if (!userId || !isAssociateDomain()) {
    return null;
  }

  try {
    const user = await currentUser();
    if (!user) return null;

    const userEmail = user.emailAddresses[0]?.emailAddress;
    if (!userEmail) return null;

    const associatePartner = await prismadb.associatePartner.findFirst({
      where: {
        OR: [
          { gmail: userEmail },
          { email: userEmail }
        ],
        isActive: true
      }
    });

    return associatePartner;
  } catch (error) {
    console.error('Error fetching associate partner:', error);
    return null;
  }
}

/**
 * Check if current user is an associate partner
 */
export async function isCurrentUserAssociate(): Promise<boolean> {
  const associatePartner = await getCurrentAssociatePartner();
  return !!associatePartner;
}
