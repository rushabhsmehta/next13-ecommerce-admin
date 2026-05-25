const VERSION = "1.0.2";
const PUBLIC_EAS_PROJECT_ID = "f6e23049-3b76-47ee-8194-9c9ad6de731a";
const STAFF_EAS_PROJECT_ID =
  process.env.EXPO_STAFF_EAS_PROJECT_ID ??
  "00000000-0000-4000-8000-000000000001";
const FINANCE_EAS_PROJECT_ID =
  process.env.EXPO_FINANCE_EAS_PROJECT_ID ??
  "00000000-0000-4000-8000-000000000002";

const variants = {
  public: {
    name: "Aagam Holidays",
    slug: "aagam-holidays",
    scheme: "aagamholidays",
    package: "com.aagamholidays.app",
    bundleIdentifier: "com.aagamholidays.app",
    routerRoot: "apps/public",
    runtimeVersion: VERSION,
    easProjectId: PUBLIC_EAS_PROJECT_ID,
    splashColor: "#e8612d",
    icon: "./assets/icon.png",
    adaptiveIcon: "./assets/adaptive-icon.png",
    notificationColor: "#e8612d",
  },
  staff: {
    name: "Aagam Operations",
    slug: "aagam-staff",
    scheme: "aagamstaff",
    package: "com.aagamholidays.staff",
    bundleIdentifier: "com.aagamholidays.staff",
    routerRoot: "apps/staff",
    runtimeVersion: `${VERSION}-staff`,
    easProjectId: STAFF_EAS_PROJECT_ID,
    splashColor: "#1f6feb",
    icon: "./assets/icon-staff.png",
    adaptiveIcon: "./assets/adaptive-icon-staff.png",
    notificationColor: "#1f6feb",
  },
  finance: {
    name: "Aagam Accounts",
    slug: "aagam-finance",
    scheme: "aagamfinance",
    package: "com.aagamholidays.finance",
    bundleIdentifier: "com.aagamholidays.finance",
    routerRoot: "apps/finance",
    runtimeVersion: `${VERSION}-finance`,
    easProjectId: FINANCE_EAS_PROJECT_ID,
    splashColor: "#047857",
    icon: "./assets/icon-finance.png",
    adaptiveIcon: "./assets/adaptive-icon-finance.png",
    notificationColor: "#047857",
  },
};

function resolveVariant() {
  const requested = process.env.APP_VARIANT ?? "public";
  if (requested in variants) return requested;
  console.warn(`[app.config] Unknown APP_VARIANT=${requested}; using public.`);
  return "public";
}

module.exports = () => {
  const appVariant = resolveVariant();
  const variant = variants[appVariant];
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://admin.aagamholidays.com";
  const websiteUrl = process.env.EXPO_PUBLIC_WEBSITE_URL ?? "https://aagamholidays.com";
  const tripMediaPlugins =
    appVariant === "finance"
      ? []
      : [
          [
            "expo-location",
            {
              locationWhenInUsePermission:
                "Allow Aagam Holidays to access your location to share in trip chat.",
            },
          ],
          [
            "expo-image-picker",
            {
              photosPermission:
                "Allow Aagam Holidays to access your photos to share in trip chat.",
              cameraPermission:
                "Allow Aagam Holidays to access your camera to take photos for trip chat.",
            },
          ],
        ];
  const tripMediaInfoPlist =
    appVariant === "finance"
      ? {}
      : {
          NSLocationWhenInUseUsageDescription:
            "We need your location to share it in trip chat.",
          NSCameraUsageDescription:
            "We need camera access to share photos in trip chat.",
          NSPhotoLibraryUsageDescription:
            "We need photo library access to share photos in trip chat.",
        };

  return {
    expo: {
      name: variant.name,
      slug: variant.slug,
      version: VERSION,
      orientation: "portrait",
      scheme: variant.scheme,
      userInterfaceStyle: "light",
      icon: variant.icon,
      splash: {
        image: variant.icon,
        resizeMode: "contain",
        backgroundColor: variant.splashColor,
      },
      assetBundlePatterns: ["**/*"],
      ios: {
        supportsTablet: true,
        bundleIdentifier: variant.bundleIdentifier,
        infoPlist: tripMediaInfoPlist,
      },
      android: {
        adaptiveIcon: {
          foregroundImage: variant.adaptiveIcon,
          backgroundColor: "#ffffff",
        },
        package: variant.package,
        permissions:
          appVariant === "finance"
            ? ["android.permission.READ_EXTERNAL_STORAGE"]
            : [
                "android.permission.ACCESS_FINE_LOCATION",
                "android.permission.ACCESS_COARSE_LOCATION",
                "android.permission.CAMERA",
                "android.permission.READ_EXTERNAL_STORAGE",
              ],
      },
      web: {
        bundler: "metro",
        output: "single",
        favicon: "./assets/favicon.png",
      },
      plugins: [
        ["expo-router", { root: variant.routerRoot }],
        "expo-font",
        "expo-secure-store",
        [
          "expo-notifications",
          {
            color: variant.notificationColor ?? variant.splashColor,
          },
        ],
        ...tripMediaPlugins,
        "expo-web-browser",
      ],
      experiments: {
        typedRoutes: true,
      },
      extra: {
        appVariant,
        appScheme: variant.scheme,
        router: {
          origin: false,
          root: variant.routerRoot,
        },
        eas: {
          projectId: variant.easProjectId,
        },
        apiBaseUrl,
        apiBaseUrlDev:
          process.env.EXPO_PUBLIC_API_BASE_URL_DEV ?? "http://127.0.0.1:3000",
        websiteUrl,
        websiteUrlDev:
          process.env.EXPO_PUBLIC_WEBSITE_URL_DEV ?? "https://aagamholidays.com",
        whatsappBusinessNumber: "919724444701",
      },
      owner: "rushabh2310",
      runtimeVersion: variant.runtimeVersion,
      updates: {
        url: `https://u.expo.dev/${variant.easProjectId}`,
      },
    },
  };
};
