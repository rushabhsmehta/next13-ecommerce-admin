import Constants from "expo-constants";
import * as Application from "expo-application";
import * as Updates from "expo-updates";
import { APP_VARIANT, type MobileAppVariant } from "@/lib/app-variant";

const APP_DISPLAY_NAMES: Record<MobileAppVariant, string> = {
  public: "Aagam Holidays",
  staff: "Aagam Operations",
  finance: "Aagam Accounts",
};

export type AppVersionInfo = {
  appName: string;
  variant: MobileAppVariant;
  version: string;
  buildNumber: string;
  runtimeVersion: string | null;
  updateLabel: string | null;
  shortLabel: string;
  detailLines: string[];
};

export function getAppVersionInfo(): AppVersionInfo {
  const appName = APP_DISPLAY_NAMES[APP_VARIANT];
  const version =
    Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? "?";
  const buildNumber = Application.nativeBuildVersion ?? "?";
  const runtimeVersion =
    (typeof Constants.expoConfig?.runtimeVersion === "string"
      ? Constants.expoConfig.runtimeVersion
      : null) ??
    (typeof Updates.runtimeVersion === "string" ? Updates.runtimeVersion : null);

  let updateLabel: string | null = null;
  if (Updates.isEnabled) {
    const parts: string[] = [];
    if (Updates.channel) parts.push(Updates.channel);
    if (Updates.updateId) parts.push(Updates.updateId.slice(0, 8));
    if (parts.length > 0) updateLabel = parts.join(" · ");
  }

  const shortLabel = `${appName} · v${version} (build ${buildNumber})`;
  const detailLines = [
    shortLabel,
    runtimeVersion ? `Runtime ${runtimeVersion}` : null,
    updateLabel ? `OTA ${updateLabel}` : null,
    __DEV__ ? "Development" : null,
  ].filter((line): line is string => Boolean(line));

  return {
    appName,
    variant: APP_VARIANT,
    version,
    buildNumber,
    runtimeVersion,
    updateLabel,
    shortLabel,
    detailLines,
  };
}
