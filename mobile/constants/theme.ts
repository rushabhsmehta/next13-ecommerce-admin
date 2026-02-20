// Aagam Holidays brand colors — Orange → Red-Purple gradient (from logo)
import { Platform } from "react-native";

export const Colors = {
  primary: "#e8612d",        // warm orange (logo primary)
  primaryDark: "#d4461a",    // darker orange
  primaryLight: "#f09050",   // light orange
  primaryBg: "#fff7ed",      // orange-50
  secondary: "#9b3a8d",      // purple (logo accent)
  secondaryLight: "#c05bae", // light purple

  gradient1: "#f0862a",      // orange (logo top)
  gradient2: "#c23a5e",      // red-purple (logo bottom)

  background: "#ffffff",
  surface: "#faf9f8",        // warm gray-50
  surfaceAlt: "#f5f3f1",     // warm gray-100
  border: "#e8e5e1",         // warm gray-200
  borderLight: "#f5f3f1",    // warm gray-100

  text: "#1c1917",           // warm gray-900
  textSecondary: "#78716c",  // warm gray-500
  textTertiary: "#a8a29e",   // warm gray-400
  textInverse: "#ffffff",

  success: "#16a34a",
  warning: "#f59e0b",
  error: "#ef4444",
  info: "#3b82f6",

  overlay: "rgba(0, 0, 0, 0.5)",
  cardShadow: "rgba(232, 97, 45, 0.08)",

  // Chat colors
  chatBubbleOwn: "#e8612d",
  chatBubbleOther: "#ffffff",
  chatBubbleOwnText: "#ffffff",
  chatBubbleOtherText: "#1c1917",
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
