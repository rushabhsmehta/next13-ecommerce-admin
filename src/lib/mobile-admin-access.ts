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
  | "in-development"
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
    "aiWizards.write",
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
    // Phase F shipped: shared NetworkProvider + OfflineBanner wired to
    // expo-network, <PermissionGate>/<OfflineGate> components,
    // /admin/coming-soon screen replaces Alert popups for unbuilt modules,
    // mobile API client supports `requireOnline` for online_only writes.
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
    // Phase 1 complete (Todos is `ready`):
    // - /api/mobile/todos GET supports status, priority, assignee (staff id or
    //   "unassigned"), and dueFrom/dueTo date range filters. POST + [todoId]
    //   PATCH/DELETE/complete already shipped.
    // - List screen: status tabs, priority chips, due-date presets
    //   (Any/Overdue/Today/This week), assignee picker modal (active op staff +
    //   Unassigned), reset-filters action, smarter empty state, "No deadline"
    //   label, assignee column.
    // - Create + full inline edit + idempotent complete with completion
    //   metadata. Operational staff assign via /api/operational-staff +
    //   mobile/lib/operational-staff.ts.
    id: "todos",
    title: "Todos",
    description: "Task lists, assignment, due dates, priorities, status changes, and completion tracking.",
    category: "CRM",
    phase: "Phase 1",
    icon: "checkbox-outline",
    status: "ready",
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
    // Phase 1 complete (CRM is `ready`):
    // - Admin inquiry list, filters, delete, detail (status chips, follow-up
    //   PATCH, activity timeline POST/DELETE, op-staff assign/unassign, core
    //   field edit, tour-query deep links).
    // - New inquiry (admin + associate partner picker, room allocations,
    //   transport details).
    // - Customer directory: list, detail with linked inquiries + sales +
    //   outstanding, create (/admin/customers/new), edit
    //   (/admin/customers/[id]/edit), ledger (/admin/customers/[id]/ledger).
    // - Associate partner directory: list + search + activeOnly filter,
    //   detail (call/email/inquiries), create (/admin/crm/associate-partners/new),
    //   edit + activate/deactivate, soft-delete when linked inquiries exist.
    // - Server endpoints under /api/mobile/customers/** and
    //   /api/mobile/associate-partners/** accept the mobile bearer header and
    //   record mobile audit rows (src/app/api/mobile/lib/mobile-audit.ts).
    // - Offline policy `draft_only`: form screens surface network failures
    //   inline; the global OfflineBanner shows connection state.
    // Note: "Export contacts" workflow is delivered by the separate Exports
    // module (id: "exports"); CRM does not own that surface.
    id: "crm",
    title: "CRM",
    description: "Inquiries, customers, notes, follow-ups, assignments, lead conversion, and timelines.",
    category: "CRM",
    phase: "Phase 1",
    icon: "people-outline",
    status: "ready",
    requiredPermission: "crm.read",
    offlinePolicy: "draft_only",
    acceptanceTarget: "Sales and operations users can manage leads and follow-ups entirely from mobile.",
    webRoutes: [
      "/inquiries",
      "/inquiries/[inquiryId]",
      "/customers",
      "/customers/[customerId]",
      "/customers/[customerId]/ledger",
      "/associate-partners",
      "/associate-partners/[associatePartnerId]",
    ],
    workflows: [
      "Inquiry list/detail with filters",
      "Admin new inquiry (shared form + optional associate partner picker)",
      "Status changes, notes / action history, follow-up scheduling",
      "Operational staff assignment and unassignment (org staff)",
      "Customer directory: list, create, edit, and linked history",
      "Customer ledger view (sales, returns, receipts, running balance)",
      "Associate partner directory: list, create, edit, deactivate",
    ],
  },
  {
    // Phase 1 complete (Exports is `ready`):
    // - /api/export/inquiries-contacts and /api/export/queries-contacts accept
    //   either Clerk web session or a mobile bearer token. Mobile exports are
    //   recorded in AuditLog (src/app/api/export/lib/mobile-audit.ts) with
    //   user, byte size, and row count.
    // - Both endpoints now emit identical CSV (proper quote-escaping, UTF-8
    //   BOM, CRLF, charset=utf-8) so Excel imports match.
    // - mobile/lib/exports.ts downloads via expo-file-system/legacy with
    //   Authorization: Bearer ..., hard-blocks offline (refreshNetworkSnapshot
    //   — deliberate, since this path streams raw CSV outside the JSON client),
    //   then opens the system share sheet.
    // - mobile/app/admin/exports/index.tsx wraps with <PermissionGate
    //   permission="exports.read"> + <OfflineGate policy="online_only">.
    // Scope note: neither web nor mobile offers export filtering today; mobile
    // mirrors web exactly per the parity decision (no beyond-web features).
    id: "exports",
    title: "Exports",
    description: "Inquiry/contact exports and report sharing with role checks and audit logging.",
    category: "CRM",
    phase: "Phase 1",
    icon: "download-outline",
    status: "ready",
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
    // Phase 2 complete (Sales & Trips is `ready`):
    // - List + detail + lifecycle (confirm/unconfirm/archive/unarchive) with
    //   `salesTrips.read/write` and associate row scoping.
    // - Native create from inquiry / package / copy: POST /api/mobile/
    //   tour-queries (+ /api/mobile/tour-packages picker) → create.tsx.
    // - Native edit: PATCH /api/mobile/tour-queries/[id] for core fields,
    //   policy text blocks, and per-day itinerary text → [id]/edit.tsx.
    //   (Hotel/room/transport stay in the linked web hotel editor — pricing-
    //   aware nested forms, intentionally out of the native edit slice.)
    // - Native variant comparison: GET /api/mobile/tour-queries/[id]/variants
    //   surfaces server-computed variantPricingData → [id]/variants.tsx.
    // - Server-rendered PDF download + share: GET /api/mobile/tour-queries/
    //   [id]/pdf (generatePDFFromUrl over the public display/PDF pages) wired
    //   into the detail screen via mobile/lib/pdf-download.ts. With-variants
    //   PDF page added to the public route matcher for parity.
    // - All mutations recorded via recordMobileAudit.
    // - Per-query financial summary is native: GET
    //   /api/mobile/tour-queries/[id]/finance + screen
    //   /admin/tour-queries/[id]/finance (mirrors web /fetchaccounts/[id]).
    id: "sales-trips",
    title: "Sales & Trips",
    description: "Tour queries, quotation builder, variants, booking confirmation, vouchers, and PDFs.",
    category: "Sales",
    phase: "Phase 2",
    icon: "map-outline",
    status: "ready",
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
      "Confirm, restore draft, archive, or unarchive from mobile (staff write)",
      "Open hotel editor on the web when needed (pricing-aware nested forms)",
      "View per-query financial summary natively (sales, purchases, cash flow, profit)",
    ],
  },
  {
    // Phase 2 complete (AI Wizards is `ready`): mobile bearer generation and
    // refinement wrap the existing Gemini itinerary behaviour, remain
    // online_only, record audit rows, and require explicit review + location
    // selection before saving an unpublished package draft or draft query.
    id: "ai-wizards",
    title: "AI Wizards",
    description:
      "AI package and query wizards with web-style draft handoff: generate, refine, review, then open create/edit forms for manual save.",
    category: "Sales",
    phase: "Phase 2",
    icon: "sparkles-outline",
    status: "ready",
    requiredPermission: "aiWizards.write",
    offlinePolicy: "online_only",
    acceptanceTarget:
      "Admins can generate and refine packages or quotations on mobile, then save from the standard editor (matching web).",
    webRoutes: ["/tourPackages/ai-wizard", "/tourPackageQuery/ai-wizard", "/api/ai/generate-itinerary"],
    workflows: [
      "Generate itinerary/package draft from location",
      "Refine generated content",
      "Review AI output before opening editor",
      "Create new or apply to existing package/query",
      "Save from tour package or query form",
    ],
  },
  {
    // Phase 3 progress (Operations stays `in-development` — honest-ready bar
    // not yet met). SHIPPED native:
    //   - Read browser for hotels/locations/destinations/suppliers/
    //     itineraries via /api/mobile/operations/list (existing).
    //   - Full native Supplier CRUD (workflow #5 "Supplier directory"):
    //     GET/POST /api/mobile/operations/suppliers + [id] GET/PATCH/DELETE,
    //     idempotent + audited + operations.read/.write guarded
    //     (assert-operations-access.ts); delete blocked when linked
    //     purchases exist (no orphaned financial history). Screens:
    //     operations/suppliers/{index,new,[id]} + SupplierForm; reachable
    //     from the operations hub "Manage suppliers" banner.
    //   - Full native Operational Staff CRUD (workflow #6 "Operational staff
    //     setup and assignment visibility"): GET/POST /api/mobile/operations/
    //     staff + [id] GET/PATCH/DELETE. Passwords bcryptjs-hashed exactly
    //     like the web route, email-uniqueness enforced, password never
    //     selected/returned/logged; delete soft-deactivates when the member
    //     has assigned inquiries; detail surfaces assigned-inquiry count.
    //     Screens: operations/staff/{index,new,[id]} + StaffForm; reachable
    //     from the operations hub "Manage operational staff" banner.
    //   - Full native Transport pricing + vehicle setup (workflow #4):
    //     GET/POST /api/mobile/operations/transport-pricing + [id] GET/PATCH/
    //     DELETE (hard delete, mirrors web); GET/POST /api/mobile/operations/
    //     vehicle-types + [id] GET/PATCH/DELETE (delete soft-deactivates when
    //     linked to transport pricing or transport details). Idempotent +
    //     audited + operations.read/.write guarded. Screens:
    //     operations/transport-pricing/{index,new,[id]} + TransportPricingForm;
    //     operations/vehicle-types/{index,new,[id]} + VehicleTypeForm (dedicated
    //     vehicle-type screens, linked from transport-pricing list banner);
    //     reachable from the operations hub "Manage transport pricing & vehicle
    //     types" banner (testID operations-manage-transport-pricing).
    //   - Full native Location & destination CRUD (workflow #1):
    //     GET/POST /api/mobile/operations/locations + [id] GET/PATCH/DELETE
    //     (delete blocked when hotels/destinations/packages/queries/inquiries
    //     exist); GET/POST /api/mobile/operations/destinations + [id] GET/PATCH/
    //     DELETE (delete blocked when hotels exist). Hero images via POST
    //     /api/mobile/operations/upload-image (R2, operations.write). Mobile
    //     forms cover core fields (label/slug/tags/isActive; destination name,
    //     location parent, optional image) — policy JSON arrays remain web-only.
    //     Screens: operations/locations/{index,new,[id]} + LocationForm;
    //     operations/destinations/{index,new,[id]} + DestinationForm; hub banners
    //     operations-manage-locations / operations-manage-destinations on the
    //     matching tabs.
    //   - Native Hotel CRUD (workflow #2a — hotels only, pricing deferred 2b):
    //     GET/POST /api/mobile/operations/hotels + [id] GET/PATCH/DELETE
    //     (delete blocked when pricing/itineraries/variant links exist).
    //     Gallery via images: { url }[] + POST /api/mobile/operations/upload-image
    //     (R2). Mirrors web hotel create/update (replace-all images on PATCH).
    //     Screens: operations/hotels/{index,new,[id]} + HotelForm +
    //     OperationsImageGallery; hub banner operations-manage-hotels on Hotels
    //     tab.
    //   - Hotel pricing list + read (workflow #2b-i — read-only on mobile):
    //     GET /api/mobile/operations/hotels/[id]/pricing + [pricingId]
    //     GET /api/mobile/operations/pricing-lookups (room/occupancy/meal types).
    //     Screens: operations/hotels/[id]/pricing/{index,[pricingId]}; link from
    //     hotel detail. Mirrors web GET hotel pricing; write/overlap deferred 2b-ii.
    //     SMOKE (2b-i, device): hotel detail → Seasonal pricing → list loads;
    //     tap row → detail shows dates/room/occupancy/meal/price; pull refresh;
    //     empty hotel shows empty state; 401 without operations.read.
    // STILL DEFERRED (web-only; needed before honest-ready):
    //   - Hotel pricing create/edit/delete + overlap split (workflow 2b-ii).
    //   - Itinerary/activity master data + query-linked items (nested).
    //   - locations-suppliers relationship management (web GET-only today).
    // No financial/balance risk in this module (draft_only master data); the
    // remaining risk is data-integrity + scope. CAVEAT: unit-tested, not
    // device-tested.
    // Current implementation closes the deferred items above: pricing writes
    // with overlap split, itinerary/activity master CRUD, and supplier-location
    // links are now native and guarded by operations.read/.write.
    id: "operations",
    title: "Operations",
    description: "Packages, hotels, destinations, itineraries, activities, transport, suppliers, and staff.",
    category: "Operations",
    phase: "Phase 3",
    icon: "briefcase-outline",
    status: "ready",
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
    // Phase 3 complete (Flight Tickets is `ready`): mobile bearer APIs,
    // native CRUD, passenger editor, linked query picker, status updates,
    // share text, and print-link handoff.
    id: "flight-tickets",
    title: "Flight Tickets",
    description: "PNR-based ticket CRUD, print/share views, query linkage, fare/tax details, and status tracking.",
    category: "Operations",
    phase: "Phase 3",
    icon: "airplane-outline",
    status: "ready",
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
    // Phase 3 complete (Website Management is `ready`): mobile bearer APIs and
    // native controls for package live/draft/archive state, website ordering,
    // related recommendations, public preview links, and brochure/share links.
    id: "website-management",
    title: "Website Management",
    description: "Tour package website controls, public travel content, featured ordering, and published visibility.",
    category: "Operations",
    phase: "Phase 3",
    icon: "globe-outline",
    status: "ready",
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
    // Phase 3 complete (Ops Portal is `ready`): mobile bearer assigned-inquiry
    // list/detail scoped to the active OperationalStaff email, progress PATCH,
    // audited action notes, and linked tour-query access.
    id: "ops-portal",
    title: "Ops Portal",
    description: "Operational-staff portal parity for assigned inquiries and on-ground update workflows.",
    category: "Operations",
    phase: "Phase 3",
    icon: "clipboard-outline",
    status: "ready",
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
    // Phase 4 complete (Finance is `ready`). All 7 declared workflows are
    // native. Money-write integrity invariants (uniform across every write):
    //   - online_only: <OfflineGate> wraps the hub + all finance screens and
    //     lib writes set requireOnline.
    //   - idempotent: Idempotency-Key header + AuditLog dedupe lookup.
    //   - no balance drift: account-touching writes recompute the
    //     authoritative balance via recalculateBank/CashBalance (derived from
    //     transactions, never incremental).
    //   - audited: recordMobileAudit on every mutation.
    // Workflow coverage:
    //   1. Accounts + transfers — GET /accounts(+[id]), POST /transfers.
    //      Screens: accounts/index, accounts/[id], record.tsx.
    //   2. Sales/purchases/items/vouchers/balances — POST /sales /purchases
    //      (+ item lines), invoice.tsx; balances via list + /allocatable;
    //      VOUCHER PDF via GET /vouchers/[type]/[id] — a bearer-auth endpoint
    //      that composes branded HTML server-side and runs generatePDF (the
    //      Clerk-protected web voucher pages are NOT exposed). Tappable
    //      sale/purchase rows download+share the voucher.
    //   3. Receipt/payment + allocations — POST /receipts /payments with
    //      receipt→sale / payment→purchase allocation; collect.tsx + /parties
    //      + /allocatable (mirrors web open-sales/open-purchases math).
    //   4. Expense/accrued/income — POST /expenses (incl. accrued) /incomes;
    //      record.tsx.
    //   5. Returns + credit notes + supplier credits — POST/GET
    //      /sale-returns /purchase-returns (?creditOnly=1 powers the
    //      credit-note / supplier-credit views); return.tsx + tds.tsx tabs.
    //   6. TDS + GST-aware handling — GET /tds (transactions), GET/POST
    //      /tds/challans, POST /tds/deposit (mirrors the web tds/deposit
    //      EXACTLY: dated challan + mark deposited, no bank movement — same
    //      as web). GST/TDS computation via POST /compute-tax which REUSES
    //      the exact production helpers in src/lib/tds.ts (computeBaseAmount
    //      / pickApplicableRate / calcTdsAmount / getFinancialYear /
    //      getQuarter) so mobile cannot diverge from web tax math. tds.tsx.
    //   7. Post-write authoritative balance refresh — recalc* after every
    //      account-touching write.
    // Mobile adaptations (parity-equivalent, not gaps): the voucher PDF is a
    // clean branded layout rather than the web's full template; TDS deposit
    // bulk-marks the loaded pending transactions rather than the web's
    // per-transaction multiselect. Documented so future work knows these were
    // deliberate.
    // CAVEAT: code-complete + unit-tested (mobile/__tests__/lib/finance) but
    // NOT device/integration-tested — smoke-test money paths on a device with
    // throwaway data before production use.
    id: "finance",
    title: "Finance",
    description: "Accounts, invoices, purchases, receipts, payments, expenses, transfers, TDS, GST, and ledgers.",
    category: "Finance",
    phase: "Phase 4",
    icon: "wallet-outline",
    status: "ready",
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
    // Phase 6 reports slice is native: dashboard KPIs plus detail screens for
    // upcoming trips, inquiry summary, confirmed/unconfirmed queries,
    // associate performance, profit, GST, TDS, statements, bank book, and cash
    // book via /api/mobile/reports/[kind], with native share text output.
    id: "reports",
    title: "Reports",
    description: "Inquiry, conversion, sales, revenue, collection, profit/loss, GST, TDS, receivable, and payable reports.",
    category: "Reports",
    phase: "Phase 6",
    icon: "bar-chart-outline",
    status: "ready",
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
    // Phase 6 complete (Travel App Admin is `ready`): native review of travel
    // users, approval/active controls, chat group creation/status/member
    // administration, and mobile push-token health via mobile bearer APIs.
    id: "travel-app-admin",
    title: "Travel App Admin",
    description: "Travel users, approvals, mobile access, public app support, and chat group administration.",
    category: "Settings",
    phase: "Phase 6",
    icon: "phone-portrait-outline",
    status: "ready",
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
    // All six workflows are native + verified (screen, lib, /api/mobile/settings,
    // unit tests). `restricted` is the INTENTIONAL terminal state: settings.read,
    // settings.write, and audit.read are granted only to OWNER/ADMIN roles in
    // ROLE_PERMISSIONS (not FINANCE/OPERATIONS/VIEWER). Associates never receive
    // these permissions. Screen enforces PermissionGate + OfflineGate (online_only).
    // Native per workflow:
    // 1. Organization profile + invoice — Org tab, PATCH /settings/organization.
    // 2. Units + tax slabs — Masters tab, create + isActive toggle.
    // 3. TDS config — org TDS signatory fields + tds-sections create/delete.
    // 4. Meal/room/occupancy/vehicle — Masters tab, create + isActive toggle.
    // 5. Pricing attributes/components — create + toggle; components delete (no isActive).
    // 6. Audit logs — Audit tab search via summary; GET /settings/audit-logs.
    // Writes: Idempotency-Key + recordMobileAudit; assert-settings-access guards.
    // CAVEAT: code-complete + unit-tested, NOT device-tested.
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
