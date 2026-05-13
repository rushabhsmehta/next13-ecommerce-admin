import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getUserOrgRole } from "@/lib/authz";
import {
  canAccessDashboardPath,
  isPublicDashboardPathname,
} from "@/lib/crm-route-access-rules";
import { CrmRoleProvider } from "@/providers/crm-role-provider";

export const dynamic = "force-dynamic";

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const h = await headers();
  const host = (h.get("host") || "").toLowerCase();
  if (host.includes("associate.aagamholidays.com")) {
    return <CrmRoleProvider role={null}>{children}</CrmRoleProvider>;
  }

  const pathname = h.get("x-crm-pathname") || "/";
  const ua = h.get("user-agent");

  const { userId } = await auth();

  if (isPublicDashboardPathname(pathname) && !userId) {
    return <CrmRoleProvider role={null}>{children}</CrmRoleProvider>;
  }

  if (!userId) {
    redirect("/sign-in");
  }

  const role = await getUserOrgRole(userId);

  if (!canAccessDashboardPath(role, pathname, { userAgent: ua })) {
    if (canAccessDashboardPath(role, "/inquiries", { userAgent: ua })) {
      redirect("/inquiries");
    }
    redirect("/access-denied");
  }

  return <CrmRoleProvider role={role}>{children}</CrmRoleProvider>;
}
