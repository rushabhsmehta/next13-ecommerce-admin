import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { resolveInquiryAccessContext } from "@/lib/inquiry-access";
import { buildMobileAdminProfile } from "@/lib/mobile-admin-access";

export const dynamic = "force-dynamic";

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function GET(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const [membership, inquiryAccess] = await Promise.all([
      prismadb.organizationMember.findFirst({
        where: { userId, isActive: true },
        orderBy: { createdAt: "asc" },
        select: { role: true, organizationId: true },
      }),
      resolveInquiryAccessContext(userId),
    ]);

    const profile = buildMobileAdminProfile(
      membership?.role ?? null,
      inquiryAccess.isAssociate
    );

    if (!profile.canUseAdmin) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const inquiryScope = inquiryAccess.isAssociate
      ? { associatePartnerId: inquiryAccess.associatePartnerId ?? undefined }
      : {};
    const today = startOfToday();

    const [
      openInquiries,
      followUpsDue,
      openTodos,
      tourQueries,
      customers,
      suppliers,
      flightTickets,
      unreadNotifications,
      sales,
      purchases,
      receipts,
      payments,
      bankAccounts,
      cashAccounts,
      travelUsers,
      chatGroups,
      auditLogs,
    ] = await Promise.all([
      prismadb.inquiry.count({
        where: {
          ...inquiryScope,
          status: { notIn: ["CONFIRMED", "confirmed", "CANCELLED", "cancelled"] },
        },
      }),
      prismadb.inquiry.count({
        where: {
          ...inquiryScope,
          nextFollowUpDate: { lte: today },
          status: { notIn: ["CONFIRMED", "confirmed", "CANCELLED", "cancelled"] },
        },
      }),
      profile.permissions.includes("todos.read")
        ? prismadb.todoItem.count({
            where: { status: { not: "DONE" } },
          })
        : Promise.resolve(0),
      inquiryAccess.isAssociate
        ? Promise.resolve(0)
        : prismadb.tourPackageQuery.count(),
      inquiryAccess.isAssociate ? Promise.resolve(0) : prismadb.customer.count(),
      profile.permissions.includes("operations.read")
        ? prismadb.supplier.count()
        : Promise.resolve(0),
      profile.permissions.includes("flightTickets.read")
        ? prismadb.flightTicket.count()
        : Promise.resolve(0),
      profile.permissions.includes("admin.dashboard.read")
        ? prismadb.notification.count({ where: { read: false } })
        : Promise.resolve(0),
      profile.permissions.includes("finance.read")
        ? prismadb.saleDetail.count()
        : Promise.resolve(0),
      profile.permissions.includes("finance.read")
        ? prismadb.purchaseDetail.count()
        : Promise.resolve(0),
      profile.permissions.includes("finance.read")
        ? prismadb.receiptDetail.count()
        : Promise.resolve(0),
      profile.permissions.includes("finance.read")
        ? prismadb.paymentDetail.count()
        : Promise.resolve(0),
      profile.permissions.includes("finance.read")
        ? prismadb.bankAccount.count({ where: { isActive: true } })
        : Promise.resolve(0),
      profile.permissions.includes("finance.read")
        ? prismadb.cashAccount.count({ where: { isActive: true } })
        : Promise.resolve(0),
      profile.permissions.includes("travelAppAdmin.read")
        ? prismadb.travelAppUser.count()
        : Promise.resolve(0),
      profile.permissions.includes("travelAppAdmin.read")
        ? prismadb.chatGroup.count({ where: { isActive: true } })
        : Promise.resolve(0),
      profile.permissions.includes("audit.read")
        ? prismadb.auditLog.count()
        : Promise.resolve(0),
    ]);

    const stats = [
      {
        id: "open-inquiries",
        label: "Open inquiries",
        value: openInquiries,
        category: "CRM",
        requiresAttention: openInquiries > 0,
      },
      {
        id: "follow-ups-due",
        label: "Follow-ups due",
        value: followUpsDue,
        category: "CRM",
        requiresAttention: followUpsDue > 0,
      },
      ...(profile.permissions.includes("todos.read")
        ? [
            {
              id: "open-todos",
              label: "Open todos",
              value: openTodos,
              category: "Tasks",
              requiresAttention: openTodos > 0,
            },
          ]
        : []),
      {
        id: "tour-queries",
        label: "Tour queries",
        value: tourQueries,
        category: "Sales",
        requiresAttention: false,
      },
      {
        id: "customers",
        label: "Customers",
        value: customers,
        category: "CRM",
        requiresAttention: false,
      },
      ...(profile.permissions.includes("operations.read")
        ? [
            {
              id: "suppliers",
              label: "Suppliers",
              value: suppliers,
              category: "Operations",
              requiresAttention: false,
            },
            {
              id: "flight-tickets",
              label: "Flight tickets",
              value: flightTickets,
              category: "Operations",
              requiresAttention: false,
            },
          ]
        : []),
      {
        id: "unread-notifications",
        label: "Unread alerts",
        value: unreadNotifications,
        category: "Notifications",
        requiresAttention: unreadNotifications > 0,
      },
      ...(profile.permissions.includes("finance.read")
        ? [
            {
              id: "sales",
              label: "Sales",
              value: sales,
              category: "Finance",
              requiresAttention: false,
            },
            {
              id: "purchases",
              label: "Purchases",
              value: purchases,
              category: "Finance",
              requiresAttention: false,
            },
            {
              id: "receipts-payments",
              label: "Receipts / payments",
              value: `${receipts} / ${payments}`,
              category: "Finance",
              requiresAttention: false,
            },
            {
              id: "active-accounts",
              label: "Bank / cash accounts",
              value: `${bankAccounts} / ${cashAccounts}`,
              category: "Finance",
              requiresAttention: false,
            },
          ]
        : []),
      ...(profile.permissions.includes("travelAppAdmin.read")
        ? [
            {
              id: "travel-users",
              label: "Travel users",
              value: travelUsers,
              category: "Travel App",
              requiresAttention: false,
            },
            {
              id: "chat-groups",
              label: "Active chat groups",
              value: chatGroups,
              category: "Travel App",
              requiresAttention: false,
            },
          ]
        : []),
      ...(profile.permissions.includes("audit.read")
        ? [
            {
              id: "audit-logs",
              label: "Audit records",
              value: auditLogs,
              category: "Audit",
              requiresAttention: false,
            },
          ]
        : []),
    ];

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      organizationId: membership?.organizationId ?? null,
      profile,
      stats,
      safety: {
        financeWrites: "online_only",
        nonIdempotentRetries: "disabled_until_idempotency",
        offlineMutations: "drafts_only_for_crm_and_operations",
        balanceSource: "server_authoritative",
        serverIdempotency: "required_before_enabling_money_movement",
        postWriteRefresh: "required_for_balances_allocations_and_tax_status",
        exports: "role_restricted_and_audited",
        audit: "required_for_sensitive_mobile_actions",
      },
      rollout: [
        "Foundation",
        "Todos, CRM, exports, and daily follow-ups",
        "Tour queries, AI wizards, quotations, variants, PDFs, and bookings",
        "Operations, master data, flight tickets, website management, and ops portal",
        "Finance, accounting, allocations, vouchers, TDS, GST, and ledgers",
        "Communications, WhatsApp, campaigns, trip chat, and travel-app admin",
        "Reports, settings, mobile access, audit controls, and hardening",
      ],
    });
  } catch (error) {
    console.log("[MOBILE_ADMIN_OVERVIEW]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
