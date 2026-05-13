import { AppRole, roleAtLeast } from "@/lib/authz";

export type MobileAdminPermission =
  | "admin.dashboard.read"
  | "todos.read"
  | "todos.write"
  | "crm.read"
  | "crm.write"
  | "exports.read"
  | "salesTrips.read"
  | "salesTrips.write"
  | "aiWizards.write"
  | "operations.read"
  | "operations.write"
  | "flightTickets.read"
  | "flightTickets.write"
  | "website.read"
  | "website.write"
  | "opsPortal.read"
  | "opsPortal.write"
  | "finance.read"
  | "finance.write"
  | "reports.read"
  | "communications.read"
  | "communications.write"
  | "travelAppAdmin.read"
  | "travelAppAdmin.write"
  | "settings.read"
  | "settings.write"
  | "audit.read";

export type MobileAdminModuleStatus =
  | "foundation"
  | "ready"
  | "planned"
  | "restricted";

export interface MobileAdminModule {
  id: string;
  title: string;
  description: string;
  category: string;
  phase: string;
  icon: string;
  status: MobileAdminModuleStatus;
  requiredPermission: MobileAdminPermission;
  offlinePolicy: "read_cache" | "draft_only" | "online_only";
  acceptanceTarget: string;
  webRoutes: string[];
  workflows: string[];
}

export interface MobileAdminProfile {
  organizationRole: AppRole | null;
  isOwner: boolean;
  isAdmin: boolean;
  isFinance: boolean;
  isOperations: boolean;
  isAssociate: boolean;
  canUseAdmin: boolean;
  canUseFinance: boolean;
  permissions: MobileAdminPermission[];
  mobileNavigation: MobileAdminModule[];
}

const OWNER_ADMIN_PERMISSIONS: MobileAdminPermission[] = [
  "admin.dashboard.read",
  "todos.read",
  "todos.write",
  "crm.read",
  "crm.write",
  "exports.read",
  "salesTrips.read",
  "salesTrips.write",
  "aiWizards.write",
  "operations.read",
  "operations.write",
  "flightTickets.read",
  "flightTickets.write",
  "website.read",
  "website.write",
  "opsPortal.read",
  "opsPortal.write",
  "finance.read",
  "finance.write",
  "reports.read",
  "communications.read",
  "communications.write",
  "travelAppAdmin.read",
  "travelAppAdmin.write",
  "settings.read",
  "settings.write",
  "audit.read",
];

const ROLE_PERMISSIONS: Record<AppRole, MobileAdminPermission[]> = {
  OWNER: OWNER_ADMIN_PERMISSIONS,
  ADMIN: OWNER_ADMIN_PERMISSIONS,
  FINANCE: [
    "admin.dashboard.read",
    "todos.read",
    "crm.read",
    "salesTrips.read",
    "finance.read",
    "finance.write",
    "reports.read",
  ],
  OPERATIONS: [
    "admin.dashboard.read",
    "todos.read",
    "todos.write",
    "crm.read",
    "crm.write",
    "salesTrips.read",
    "salesTrips.write",
    "operations.read",
    "operations.write",
    "flightTickets.read",
    "flightTickets.write",
    "opsPortal.read",
    "opsPortal.write",
  ],
  VIEWER: [
    "admin.dashboard.read",
    "todos.read",
    "crm.read",
    "salesTrips.read",
    "reports.read",
  ],
};

const ASSOCIATE_PERMISSIONS: MobileAdminPermission[] = [
  "admin.dashboard.read",
  "crm.read",
  "crm.write",
  "salesTrips.read",
];

export const MOBILE_ADMIN_MODULES: MobileAdminModule[] = [
  {
    id: "today",
    title: "Today",
    description: "Role-based command center for follow-ups, open work, alerts, and shortcuts.",
    category: "Foundation",
    phase: "Foundation",
    icon: "speedometer-outline",
    status: "foundation",
    requiredPermission: "admin.dashboard.read",
    offlinePolicy: "read_cache",
    acceptanceTarget: "Every role can see its current work and jump to the next action.",
    webRoutes: ["/", "/accounts", "/notifications"],
    workflows: [
      "Role-specific dashboard",
      "Follow-up and alert summaries",
      "Deep links into assigned work",
      "Global admin search across major records",
    ],
  },
  {
    id: "todos",
    title: "Todos",
    description: "Task lists, assignment, due dates, priorities, status changes, and completion tracking.",
    category: "CRM",
    phase: "Phase 1",
    icon: "checkbox-outline",
    status: "planned",
    requiredPermission: "todos.read",
    offlinePolicy: "draft_only",
    acceptanceTarget: "Users can create, assign, complete, and review task follow-ups from mobile.",
    webRoutes: ["/todos", "/todos/[todoId]"],
    workflows: [
      "List tasks by status, priority, assignee, and due date",
      "Create and edit task details",
      "Mark tasks complete with completion metadata",
      "Link tasks to operational staff where applicable",
    ],
  },
  {
    id: "crm",
    title: "CRM",
    description: "Inquiries, customers, notes, follow-ups, assignments, lead conversion, and timelines.",
    category: "CRM",
    phase: "Phase 1",
    icon: "people-outline",
    status: "planned",
    requiredPermission: "crm.read",
    offlinePolicy: "draft_only",
    acceptanceTarget: "Sales and operations users can manage leads and follow-ups entirely from mobile.",
    webRoutes: [
      "/inquiries",
      "/inquiries/[inquiryId]",
      "/customers",
      "/customers/[customerId]",
      "/associate-partners",
      "/export-contacts",
    ],
    workflows: [
      "Inquiry list/detail/create/edit/delete with filters",
      "Status changes, notes, action history, and follow-up scheduling",
      "Staff assignment and unassignment",
      "Customer directory and linked history",
      "Associate partner visibility and restricted inquiry creation",
      "Export contacts for inquiries and queries",
    ],
  },
  {
    id: "exports",
    title: "Exports",
    description: "Inquiry/contact exports and report sharing with role checks and audit logging.",
    category: "CRM",
    phase: "Phase 1",
    icon: "download-outline",
    status: "planned",
    requiredPermission: "exports.read",
    offlinePolicy: "online_only",
    acceptanceTarget: "Authorized users can export and share contact/report data from mobile with audit visibility.",
    webRoutes: ["/export-contacts", "/api/export/inquiries-contacts", "/api/export/queries-contacts"],
    workflows: [
      "Export inquiry contacts",
      "Export query contacts",
      "Share generated files from mobile",
      "Restrict and audit every export",
    ],
  },
  {
    id: "sales-trips",
    title: "Sales & Trips",
    description: "Tour queries, quotation builder, variants, booking confirmation, vouchers, and PDFs.",
    category: "Sales",
    phase: "Phase 2",
    icon: "map-outline",
    status: "in-development",
    requiredPermission: "salesTrips.read",
    offlinePolicy: "draft_only",
    acceptanceTarget: "Admins can create, price, share, revise, and confirm tour queries from mobile.",
    webRoutes: [
      "/tourPackageQuery",
      "/tourPackageQuery/[tourPackageQueryId]",
      "/tourpackagequeryfrominquiry/[inquiryId]",
      "/tourPackageQueryFromTourPackage/[tourPackageQueryFromTourPackageId]",
      "/tourPackageQueryCreateCopy",
      "/tourPackageQueryDisplay",
      "/tourPackageQueryVariantDisplay",
      "/tourPackageQueryHotelUpdate/[tourPackageQueryId]",
      "/tourPackageQueryPDFGenerator/[tourPackageQueryId]",
      "/tourPackageQueryPDFGeneratorWithVariants/[tourPackageQueryId]",
      "/tourPackageQueryVoucherDisplay/[tourPackageQueryVoucherId]",
      "/fetchaccounts/[tourPackageQueryId]",
    ],
    workflows: [
      "Create query from inquiry or package",
      "Copy and revise existing queries",
      "Build itinerary, hotels, room allocations, transport, inclusions, and terms",
      "Compare variants and run server-side pricing",
      "Share display links, PDFs, and vouchers",
      "Confirm query and review trip financial summary",
    ],
  },
  {
    id: "ai-wizards",
    title: "AI Wizards",
    description: "AI package and query generation flows with review, refine, and save steps.",
    category: "Sales",
    phase: "Phase 2",
    icon: "sparkles-outline",
    status: "planned",
    requiredPermission: "aiWizards.write",
    offlinePolicy: "online_only",
    acceptanceTarget: "Admins can generate and refine packages or quotations from mobile before saving.",
    webRoutes: ["/tourPackages/ai-wizard", "/tourPackageQuery/ai-wizard", "/api/ai/generate-itinerary"],
    workflows: [
      "Generate itinerary/package draft",
      "Refine generated content",
      "Review AI output before saving",
      "Convert approved draft into package or query",
    ],
  },
  {
    id: "operations",
    title: "Operations",
    description: "Packages, hotels, destinations, itineraries, activities, transport, suppliers, and staff.",
    category: "Operations",
    phase: "Phase 3",
    icon: "briefcase-outline",
    status: "planned",
    requiredPermission: "operations.read",
    offlinePolicy: "draft_only",
    acceptanceTarget: "Operations users can maintain trip inventory and resolve trip setup issues from mobile.",
    webRoutes: [
      "/locations",
      "/destinations",
      "/hotels",
      "/hotel-pricing",
      "/itineraries",
      "/itinerariesMaster",
      "/activities",
      "/activitiesMaster",
      "/locations-suppliers",
      "/transport-pricing",
      "/operational-staff",
      "/suppliers",
    ],
    workflows: [
      "Location and destination CRUD",
      "Hotel CRUD and hotel pricing",
      "Itinerary/activity master data and query-linked items",
      "Transport pricing and vehicle detail setup",
      "Supplier directory and location relationships",
      "Operational staff setup and assignment visibility",
    ],
  },
  {
    id: "flight-tickets",
    title: "Flight Tickets",
    description: "PNR-based ticket CRUD, print/share views, query linkage, fare/tax details, and status tracking.",
    category: "Operations",
    phase: "Phase 3",
    icon: "airplane-outline",
    status: "planned",
    requiredPermission: "flightTickets.read",
    offlinePolicy: "draft_only",
    acceptanceTarget: "Operations users can create, edit, view, print, and link flight tickets from mobile.",
    webRoutes: ["/flight-tickets", "/flight-tickets/new", "/flight-tickets/[pnr]", "/flight-tickets/[pnr]/edit", "/flight-tickets/[pnr]/print"],
    workflows: [
      "List and search tickets by PNR/customer/query",
      "Create and edit fare, tax, route, and timing details",
      "Link tickets to tour package queries",
      "Print or share mobile ticket views",
    ],
  },
  {
    id: "website-management",
    title: "Website Management",
    description: "Tour package website controls, public travel content, featured ordering, and published visibility.",
    category: "Operations",
    phase: "Phase 3",
    icon: "globe-outline",
    status: "planned",
    requiredPermission: "website.read",
    offlinePolicy: "online_only",
    acceptanceTarget: "Admins can manage website-facing package visibility and public travel content from mobile.",
    webRoutes: ["/tourPackages", "/tourPackages/website-management", "/travel", "/api/travel/packages"],
    workflows: [
      "Manage package publish/feature status",
      "Update website order and related recommendations",
      "Preview public package pages",
      "Share public package links and brochures",
    ],
  },
  {
    id: "ops-portal",
    title: "Ops Portal",
    description: "Operational-staff portal parity for assigned inquiries and on-ground update workflows.",
    category: "Operations",
    phase: "Phase 3",
    icon: "clipboard-outline",
    status: "planned",
    requiredPermission: "opsPortal.read",
    offlinePolicy: "draft_only",
    acceptanceTarget: "Operational staff can complete assigned inquiry work from mobile without using the ops web portal.",
    webRoutes: ["/ops", "/ops/inquiry/[inquiryId]", "/api/ops/my-inquiries"],
    workflows: [
      "Assigned inquiry list",
      "Inquiry detail for operational staff",
      "Update operational progress and notes",
      "Respect staff email and active-status access rules",
    ],
  },
  {
    id: "finance",
    title: "Finance",
    description: "Accounts, invoices, purchases, receipts, payments, expenses, transfers, TDS, GST, and ledgers.",
    category: "Finance",
    phase: "Phase 4",
    icon: "wallet-outline",
    status: "restricted",
    requiredPermission: "finance.read",
    offlinePolicy: "online_only",
    acceptanceTarget: "Finance users can create and review daily accounting records without balance drift.",
    webRoutes: [
      "/accounts",
      "/bankaccounts",
      "/cashaccounts",
      "/transfers",
      "/sales",
      "/purchases",
      "/receipts",
      "/payments",
      "/expenses",
      "/expenses/accrued",
      "/incomes",
      "/sale-returns",
      "/sale-returns/credit-notes",
      "/purchase-returns",
      "/purchase-returns/supplier-credits",
      "/tds",
      "/tds/challans",
      "/tds/reports",
    ],
    workflows: [
      "Bank/cash account and transfer management",
      "Sales, purchases, items, vouchers, and balances",
      "Receipt and payment allocation flows",
      "Expense, accrued expense, and income management",
      "Sale returns, purchase returns, credit notes, and supplier credits",
      "TDS transactions, challans, deposits, and GST-aware tax handling",
      "Post-write authoritative balance refresh",
    ],
  },
  {
    id: "communications",
    title: "Communications",
    description: "WhatsApp inbox, templates, campaigns, catalog, customer messages, trip chat, and notifications.",
    category: "Communications",
    phase: "Phase 5",
    icon: "chatbubbles-outline",
    status: "ready",
    requiredPermission: "communications.read",
    offlinePolicy: "read_cache",
    acceptanceTarget: "Communication-heavy work can happen from mobile with linked customer context.",
    webRoutes: [
      "/whatsapp",
      "/whatsapp/chat",
      "/whatsapp/customers",
      "/whatsapp/catalog",
      "/whatsapp/media",
      "/whatsapp/templates",
      "/whatsapp/flows",
      "/whatsapp/campaigns",
      "/chat-management",
    ],
    workflows: [
      "WhatsApp inbox and conversation detail",
      "Customer profile and message history",
      "Templates, media, flows, catalog, and campaigns",
      "Campaign preview, launch, stats, recipients, and retry handling",
      "Trip chat group management and member controls",
    ],
  },
  {
    id: "reports",
    title: "Reports",
    description: "Inquiry, conversion, sales, revenue, collection, profit/loss, GST, TDS, receivable, and payable reports.",
    category: "Reports",
    phase: "Phase 6",
    icon: "bar-chart-outline",
    status: "planned",
    requiredPermission: "reports.read",
    offlinePolicy: "read_cache",
    acceptanceTarget: "Owners and managers can monitor the business with role-restricted reports.",
    webRoutes: [
      "/reports/upcomingTrips",
      "/reports/inquirySummary",
      "/reports/confirmedQueries",
      "/reports/unconfirmedQueries",
      "/reports/associatePerformance",
      "/reports/profit",
      "/reports/gst",
      "/tds/reports",
      "/customers/ledger",
      "/suppliers/ledger",
      "/bank-book",
      "/cash-book",
    ],
    workflows: [
      "Upcoming trip and query status reports",
      "Inquiry, conversion, and associate performance reports",
      "Profit, GST, TDS, receivable, payable, and collection reporting",
      "Customer/supplier statements",
      "Bank book and cash book running balances",
      "Role-restricted export/share actions",
    ],
  },
  {
    id: "travel-app-admin",
    title: "Travel App Admin",
    description: "Travel users, approvals, mobile access, public app support, and chat group administration.",
    category: "Settings",
    phase: "Phase 6",
    icon: "phone-portrait-outline",
    status: "planned",
    requiredPermission: "travelAppAdmin.read",
    offlinePolicy: "online_only",
    acceptanceTarget: "Admins can manage mobile users, approvals, and travel-app chat administration from mobile.",
    webRoutes: ["/travel-users", "/chat-management", "/settings/mobile-access"],
    workflows: [
      "Travel user list/create/update/deactivate",
      "Approval and active-status controls",
      "Chat group creation and membership management",
      "Mobile access review and push-token health",
    ],
  },
  {
    id: "settings",
    title: "Settings & Audit",
    description: "Master data, pricing configuration, tax settings, staff access, audit logs, and mobile controls.",
    category: "Settings",
    phase: "Phase 6",
    icon: "settings-outline",
    status: "restricted",
    requiredPermission: "settings.read",
    offlinePolicy: "online_only",
    acceptanceTarget: "Owners and admins can configure and audit sensitive back-office behavior from mobile.",
    webRoutes: [
      "/settings/organization",
      "/settings/units",
      "/settings/tax-slabs",
      "/settings/invoice",
      "/settings/tds",
      "/settings/meal-plans",
      "/settings/room-types",
      "/settings/occupancy-types",
      "/settings/vehicle-types",
      "/settings/pricing-attributes",
      "/settings/pricing-components",
      "/audit-logs",
    ],
    workflows: [
      "Organization profile and invoice settings",
      "Units of measure and tax slabs",
      "TDS settings and tax configuration",
      "Meal plans, room types, occupancy types, and vehicle types",
      "Pricing attributes and pricing components",
      "Audit-log review for sensitive activity",
    ],
  },
];

export function getMobileAdminPermissions(
  role: AppRole | null | undefined,
  isAssociate: boolean
): MobileAdminPermission[] {
  const permissions = new Set<MobileAdminPermission>();
  if (role) {
    for (const permission of ROLE_PERMISSIONS[role]) permissions.add(permission);
  }
  if (isAssociate) {
    for (const permission of ASSOCIATE_PERMISSIONS) permissions.add(permission);
  }
  return Array.from(permissions);
}

export function getMobileAdminNavigation(
  role: AppRole | null | undefined,
  isAssociate: boolean
): MobileAdminModule[] {
  const permissions = getMobileAdminPermissions(role, isAssociate);
  return MOBILE_ADMIN_MODULES.filter((module) =>
    permissions.includes(module.requiredPermission)
  );
}

export function buildMobileAdminProfile(
  role: AppRole | null | undefined,
  isAssociate: boolean
): MobileAdminProfile {
  const permissions = getMobileAdminPermissions(role, isAssociate);
  const canUseAdmin = permissions.includes("admin.dashboard.read");

  return {
    organizationRole: role ?? null,
    isOwner: role === "OWNER",
    isAdmin: role === "ADMIN" || role === "OWNER",
    isFinance:
      role === "FINANCE" || role === "ADMIN" || role === "OWNER",
    isOperations:
      role === "OPERATIONS" || role === "ADMIN" || role === "OWNER",
    isAssociate,
    canUseAdmin,
    canUseFinance:
      !!role && roleAtLeast(role, "FINANCE") && permissions.includes("finance.read"),
    permissions,
    mobileNavigation: getMobileAdminNavigation(role, isAssociate),
  };
}
