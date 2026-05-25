import Constants from "expo-constants";

export const MOBILE_APP_VARIANTS = ["public", "staff", "finance"] as const;
export type MobileAppVariant = (typeof MOBILE_APP_VARIANTS)[number];

type MaybeVariant = string | null | undefined;

function normalizeVariant(value: MaybeVariant): MobileAppVariant {
  return MOBILE_APP_VARIANTS.includes(value as MobileAppVariant)
    ? (value as MobileAppVariant)
    : "public";
}

const extra = (Constants.expoConfig?.extra ?? {}) as {
  appVariant?: string;
  appScheme?: string;
};

export const APP_VARIANT = normalizeVariant(
  extra.appVariant ?? process.env.APP_VARIANT
);

export const APP_SCHEME =
  extra.appScheme ??
  (APP_VARIANT === "staff"
    ? "aagamstaff"
    : APP_VARIANT === "finance"
      ? "aagamfinance"
      : "aagamholidays");

export function isPublicApp(variant: MobileAppVariant = APP_VARIANT) {
  return variant === "public";
}

export function isStaffApp(variant: MobileAppVariant = APP_VARIANT) {
  return variant === "staff";
}

export function isFinanceApp(variant: MobileAppVariant = APP_VARIANT) {
  return variant === "finance";
}

export function getPostLoginRoute(variant: MobileAppVariant = APP_VARIANT): string {
  return variant === "finance" ? "/admin/finance" : "/(tabs)";
}

export function mobileAppVariantHeaders(): Record<string, string> {
  return { "X-Mobile-App-Variant": APP_VARIANT };
}

export function filterPermissionsForAppVariant(
  permissions: string[],
  variant: MobileAppVariant = APP_VARIANT
): string[] {
  if (variant === "public") return [];
  if (variant === "finance") {
    return permissions.filter((permission) => permission.startsWith("finance."));
  }
  return permissions.filter(
    (permission) =>
      !permission.startsWith("finance.") &&
      permission !== "reports.read" &&
      permission !== "audit.read"
  );
}

export function filterNavigationForAppVariant<
  T extends { id: string; requiredPermission?: string }
>(
  modules: T[],
  variant: MobileAppVariant = APP_VARIANT
): T[] {
  if (variant === "public") return [];
  if (variant === "finance") return modules.filter((module) => module.id === "finance");
  return modules.filter(
    (module) =>
      module.id !== "finance" &&
      module.id !== "reports" &&
      module.requiredPermission !== "audit.read"
  );
}
