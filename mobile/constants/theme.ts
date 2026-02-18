// Aagam Holidays brand colors — deep teal/cyan premium theme
import { Platform } from "react-native";

export const Colors = {
  primary: "#0d9488",        // teal-600
  primaryDark: "#0f766e",    // teal-700
  primaryLight: "#2dd4bf",   // teal-400
  primaryBg: "#f0fdfa",      // teal-50
  secondary: "#06b6d4",      // cyan-500
  secondaryLight: "#22d3ee", // cyan-400

  gradient1: "#0d9488",      // teal
  gradient2: "#06b6d4",      // cyan

  background: "#ffffff",
  surface: "#f8fafc",        // slate-50
  surfaceAlt: "#f1f5f9",     // slate-100
  border: "#e2e8f0",         // slate-200
  borderLight: "#f1f5f9",    // slate-100

  text: "#0f172a",           // slate-900
  textSecondary: "#64748b",  // slate-500
  textTertiary: "#94a3b8",   // slate-400
  textInverse: "#ffffff",

  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  info: "#3b82f6",

  overlay: "rgba(0, 0, 0, 0.5)",
  cardShadow: "rgba(13, 148, 136, 0.08)",

  // Chat colors
  chatBubbleOwn: "#0d9488",
  chatBubbleOther: "#ffffff",
  chatBubbleOwnText: "#ffffff",
  chatBubbleOtherText: "#0f172a",
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const FontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
  xxxl: 26,
  title: 30,
  hero: 34,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Shadows = {
  light: Platform.select({
    ios: {
      shadowColor: Colors.cardShadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 8,
    },
    android: { elevation: 2 },
  }),
  medium: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    },
    android: { elevation: 4 },
  }),
  heavy: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
    },
    android: { elevation: 8 },
  }),
};
