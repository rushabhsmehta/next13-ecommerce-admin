import type { Ionicons } from "@expo/vector-icons";

export type OperationsNavIcon = keyof typeof Ionicons.glyphMap;

export type OperationsNavItem = {
  id: string;
  title: string;
  subtitle?: string;
  icon: OperationsNavIcon;
  route: string;
  /** Required permission id (e.g. crm.read). Omit to show whenever the section is shown. */
  permission?: string;
  hideForAssociate?: boolean;
  associateOnly?: boolean;
  accent?: boolean;
};

export type OperationsNavSection = {
  id: string;
  title: string;
  items: OperationsNavItem[];
};

export type OperationsNavContext = {
  permissions: string[];
  isAssociate: boolean;
};

export function filterOperationsNavSections(
  sections: OperationsNavSection[],
  ctx: OperationsNavContext
): OperationsNavSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (ctx.isAssociate && item.hideForAssociate) return false;
        if (!ctx.isAssociate && item.associateOnly) return false;
        if (item.permission && !ctx.permissions.includes(item.permission)) return false;
        return true;
      }),
    }))
    .filter((section) => section.items.length > 0);
}

/** Mirrors web CRM sidebar groups — mobile routes only. */
export const OPERATIONS_ADMIN_SECTIONS: OperationsNavSection[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    items: [
      {
        id: "inquiries",
        title: "Inquiries",
        subtitle: "Leads & follow-ups",
        icon: "people-outline",
        route: "/admin/crm/inquiries",
        permission: "crm.read",
        hideForAssociate: true,
      },
      {
        id: "associate-inquiries",
        title: "Inquiries",
        subtitle: "Your leads",
        icon: "people-outline",
        route: "/associate/inquiries",
        permission: "crm.read",
        associateOnly: true,
      },
      {
        id: "new-inquiry",
        title: "New inquiry",
        icon: "person-add-outline",
        route: "/admin/crm/inquiries/new",
        permission: "crm.write",
        hideForAssociate: true,
        accent: true,
      },
      {
        id: "tour-queries",
        title: "Tour queries",
        subtitle: "Quotes & trips",
        icon: "map-outline",
        route: "/admin/tour-queries",
        permission: "salesTrips.read",
      },
      {
        id: "new-tour-query",
        title: "New trip",
        icon: "add-circle-outline",
        route: "/admin/tour-queries/create",
        permission: "salesTrips.write",
        accent: true,
      },
      {
        id: "todos",
        title: "Todos",
        subtitle: "Tasks & deadlines",
        icon: "checkbox-outline",
        route: "/admin/todos",
        permission: "todos.read",
        hideForAssociate: true,
      },
    ],
  },
  {
    id: "crm",
    title: "CRM",
    items: [
      {
        id: "customers",
        title: "Customers",
        icon: "person-outline",
        route: "/admin/customers",
        permission: "crm.read",
        hideForAssociate: true,
      },
      {
        id: "associates",
        title: "Associates",
        icon: "hand-left-outline",
        route: "/admin/crm/associate-partners",
        permission: "crm.read",
        hideForAssociate: true,
      },
      {
        id: "exports",
        title: "Export contacts",
        icon: "download-outline",
        route: "/admin/exports",
        permission: "exports.read",
        hideForAssociate: true,
      },
    ],
  },
  {
    id: "master-data",
    title: "Master data",
    items: [
      {
        id: "locations",
        title: "Locations",
        icon: "earth-outline",
        route: "/admin/operations/locations",
        permission: "operations.read",
        hideForAssociate: true,
      },
      {
        id: "destinations",
        title: "Destinations",
        icon: "compass-outline",
        route: "/admin/operations/destinations",
        permission: "operations.read",
        hideForAssociate: true,
      },
      {
        id: "hotels",
        title: "Hotels",
        icon: "bed-outline",
        route: "/admin/operations/hotels",
        permission: "operations.read",
        hideForAssociate: true,
      },
      {
        id: "itineraries",
        title: "Itineraries",
        icon: "list-outline",
        route: "/admin/operations/itineraries",
        permission: "operations.read",
        hideForAssociate: true,
      },
      {
        id: "activities",
        title: "Activities",
        icon: "walk-outline",
        route: "/admin/operations/activities",
        permission: "operations.read",
        hideForAssociate: true,
      },
      {
        id: "tour-packages",
        title: "Tour packages",
        icon: "briefcase-outline",
        route: "/admin/operations/tour-packages",
        permission: "operations.read",
        hideForAssociate: true,
      },
      {
        id: "ai-wizards",
        title: "AI wizards",
        icon: "sparkles-outline",
        route: "/admin/ai-wizards",
        permission: "aiWizards.write",
        hideForAssociate: true,
      },
    ],
  },
  {
    id: "operations",
    title: "Operations",
    items: [
      {
        id: "ops-hub",
        title: "Operations hub",
        subtitle: "Browse all resources",
        icon: "grid-outline",
        route: "/admin/operations",
        permission: "operations.read",
        hideForAssociate: true,
      },
      {
        id: "staff",
        title: "Operational staff",
        icon: "id-card-outline",
        route: "/admin/operations/staff",
        permission: "operations.read",
        hideForAssociate: true,
      },
      {
        id: "suppliers",
        title: "Suppliers",
        icon: "business-outline",
        route: "/admin/operations/suppliers",
        permission: "operations.read",
        hideForAssociate: true,
      },
      {
        id: "transport-pricing",
        title: "Transport pricing",
        icon: "car-outline",
        route: "/admin/operations/transport-pricing",
        permission: "operations.read",
        hideForAssociate: true,
      },
      {
        id: "vehicle-types",
        title: "Vehicle types",
        icon: "bus-outline",
        route: "/admin/operations/vehicle-types",
        permission: "operations.read",
        hideForAssociate: true,
      },
      {
        id: "location-suppliers",
        title: "Location suppliers",
        icon: "pin-outline",
        route: "/admin/operations/location-suppliers",
        permission: "operations.read",
        hideForAssociate: true,
      },
      {
        id: "flight-tickets",
        title: "Flight tickets",
        icon: "airplane-outline",
        route: "/admin/flight-tickets",
        permission: "flightTickets.read",
        hideForAssociate: true,
      },
      {
        id: "ops-portal",
        title: "Ops portal",
        icon: "clipboard-outline",
        route: "/admin/ops-portal",
        permission: "opsPortal.read",
        hideForAssociate: true,
      },
    ],
  },
  {
    id: "communications",
    title: "WhatsApp",
    items: [
      {
        id: "whatsapp",
        title: "WhatsApp inbox",
        icon: "logo-whatsapp",
        route: "/(tabs)/whatsapp",
        permission: "communications.read",
        hideForAssociate: true,
      },
    ],
  },
  {
    id: "website",
    title: "Website & travel app",
    items: [
      {
        id: "website",
        title: "Website",
        icon: "globe-outline",
        route: "/admin/website",
        permission: "website.read",
        hideForAssociate: true,
      },
      {
        id: "travel-app",
        title: "Travel app admin",
        icon: "phone-portrait-outline",
        route: "/admin/travel-app",
        permission: "travelAppAdmin.read",
        hideForAssociate: true,
      },
    ],
  },
  {
    id: "settings",
    title: "Settings",
    items: [
      {
        id: "settings",
        title: "Settings",
        icon: "settings-outline",
        route: "/admin/settings",
        permission: "settings.read",
        hideForAssociate: true,
      },
      {
        id: "safeguards",
        title: "Safeguards",
        icon: "shield-checkmark-outline",
        route: "/admin/safeguards",
        permission: "admin.dashboard.read",
        hideForAssociate: true,
      },
    ],
  },
];

export const ASSOCIATE_OPERATIONS_SECTIONS: OperationsNavSection[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    items: [
      {
        id: "associate-inquiries",
        title: "Inquiries",
        subtitle: "Your leads",
        icon: "people-outline",
        route: "/associate/inquiries",
        permission: "crm.read",
      },
      {
        id: "tour-queries",
        title: "Tour queries",
        subtitle: "Quotes & trips",
        icon: "map-outline",
        route: "/admin/tour-queries",
        permission: "salesTrips.read",
      },
    ],
  },
];
