import * as Application from "expo-application";
import {
  APP_VARIANT,
  MOBILE_APP_VARIANTS,
  type MobileAppVariant,
} from "@/lib/app-variant";

/** One Metro per variant in dev — avoids Accounts loading Operations JS. */
export const DEV_METRO_PORTS: Record<MobileAppVariant, number> = {
  public: 8081,
  staff: 8082,
  finance: 8083,
};

const PACKAGE_TO_VARIANT: Record<string, MobileAppVariant> = {
  "com.aagamholidays.app": "public",
  "com.aagamholidays.staff": "staff",
  "com.aagamholidays.finance": "finance",
};

const VARIANT_LABELS: Record<MobileAppVariant, string> = {
  public: "Aagam Holidays",
  staff: "Aagam Operations",
  finance: "Aagam Accounts",
};

export function getNativeAppVariant(): MobileAppVariant | null {
  const id = Application.applicationId;
  if (!id) return null;
  return PACKAGE_TO_VARIANT[id] ?? null;
}

export function getVariantLabel(variant: MobileAppVariant): string {
  return VARIANT_LABELS[variant];
}

export function getDevMetroPort(variant: MobileAppVariant): number {
  return DEV_METRO_PORTS[variant];
}

export type VariantDevMismatch = {
  native: MobileAppVariant;
  bundle: MobileAppVariant;
  nativeLabel: string;
  bundleLabel: string;
  expectedPort: number;
  startCommand: string;
};

/** In __DEV__, detect finance APK + staff Metro (etc.). */
export function getVariantDevMismatch(): VariantDevMismatch | null {
  if (!__DEV__) return null;
  const native = getNativeAppVariant();
  if (!native || !MOBILE_APP_VARIANTS.includes(native)) return null;
  const bundle = APP_VARIANT;
  if (native === bundle) return null;
  return {
    native,
    bundle,
    nativeLabel: getVariantLabel(native),
    bundleLabel: getVariantLabel(bundle),
    expectedPort: getDevMetroPort(native),
    startCommand: `npm run start:${native}`,
  };
}
