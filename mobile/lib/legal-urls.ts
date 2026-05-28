import { WEBSITE_URL } from "@/constants/api";

function travelBase(): string {
  const base = WEBSITE_URL.replace(/\/$/, "");
  return base.endsWith("/travel") ? base : `${base}/travel`;
}

export function getPrivacyPolicyUrl(): string {
  return `${travelBase()}/privacy`;
}

export function getTermsOfServiceUrl(): string {
  return `${travelBase()}/terms`;
}

export function getAccountDeletionUrl(): string {
  return `${travelBase()}/account-deletion`;
}

export function getDataDeletionUrl(): string {
  return `${travelBase()}/data-deletion`;
}
