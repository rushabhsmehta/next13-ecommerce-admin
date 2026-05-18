import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Spacing } from "@/constants/theme";

export interface AdminScreenProps {
  children: ReactNode;
  /** Wrap content in ScrollView (default true). Set false when using FlatList as direct child. */
  scroll?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  keyboardAvoiding?: boolean;
  testID?: string;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Extra bottom padding beyond safe area */
  bottomInset?: number;
  /** Apply safe-area top inset (disable on tab roots that already inset) */
  safeAreaTop?: boolean;
  /** Sticky region below scroll content (e.g. primary action bar) */
  footer?: ReactNode;
}

export function AdminScreen({
  children,
  scroll = true,
  refreshControl,
  keyboardAvoiding = false,
  testID = "admin-screen",
  contentContainerStyle,
  bottomInset = Spacing.md,
  safeAreaTop = true,
  footer,
}: AdminScreenProps) {
  const insets = useSafeAreaInsets();

  const body = scroll ? (
    <ScrollView
      testID={testID}
      style={styles.flex}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: insets.bottom + bottomInset },
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  ) : (
    <View testID={testID} style={[styles.flex, contentContainerStyle]}>
      {children}
    </View>
  );

  const shell = (
    <View style={[styles.root, safeAreaTop ? { paddingTop: insets.top } : null]}>
      <View style={footer ? styles.bodyWithFooter : styles.bodyFill}>{body}</View>
      {footer}
    </View>
  );

  if (!keyboardAvoiding) return shell;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={insets.top}
    >
      {shell}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  bodyFill: { flex: 1 },
  bodyWithFooter: { flex: 1, minHeight: 0 },
  scrollContent: {
    flexGrow: 1,
  },
});
