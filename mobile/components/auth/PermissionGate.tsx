import { type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  BorderRadius,
  Colors,
  FontSize,
  Spacing,
} from "@/constants/theme";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNetwork } from "@/lib/network";

interface PermissionGateProps {
  /**
   * Required permission string. Must match a `MobileAdminPermission`
   * returned by /api/mobile/auth-status (driven by mobile-admin-access.ts).
   * Wrap any admin screen entry with this gate so server-controlled RBAC
   * is enforced on the client too.
   */
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGate({ permission, children, fallback }: PermissionGateProps) {
  const { permissions, isLoading } = useCurrentUser();
  if (isLoading) {
    return (
      <View style={styles.loadingContainer} testID="permission-loading">
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }
  if (permissions.includes(permission)) return <>{children}</>;
  return <>{fallback ?? <DefaultDenied />}</>;
}

function DefaultDenied() {
  return (
    <View style={styles.deniedContainer} testID="permission-denied">
      <Ionicons name="lock-closed-outline" size={36} color={Colors.textTertiary} />
      <Text style={styles.deniedTitle}>No access</Text>
      <Text style={styles.deniedText}>
        Your role does not have permission for this section. Ask an Owner or Admin
        to update your access on the web admin.
      </Text>
    </View>
  );
}

interface OfflineGateProps {
  children: ReactNode;
  /**
   * When `policy` is `online_only`, the gate hides children while offline.
   * For `draft_only` / `read_cache` we render children — those policies are
   * enforced inside the screen-level fetchers, not here.
   */
  policy?: "online_only" | "draft_only" | "read_cache";
  fallback?: ReactNode;
}

export function OfflineGate({ children, policy = "online_only", fallback }: OfflineGateProps) {
  const { isOnline } = useNetwork();
  if (policy !== "online_only" || isOnline) return <>{children}</>;
  return <>{fallback ?? <DefaultOfflineFallback />}</>;
}

function DefaultOfflineFallback() {
  return (
    <View style={styles.offlineContainer} testID="offline-blocked">
      <Ionicons name="cloud-offline-outline" size={36} color={Colors.warning} />
      <Text style={styles.deniedTitle}>Reconnect to continue</Text>
      <Text style={styles.deniedText}>
        This section needs an internet connection because it changes financial
        records, exports, or settings. We block writes offline to prevent
        balance drift.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  deniedContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    gap: Spacing.md,
    minHeight: 240,
  },
  offlineContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    margin: Spacing.lg,
  },
  deniedTitle: {
    fontSize: FontSize.xl,
    fontWeight: "800",
    color: Colors.text,
    textAlign: "center",
  },
  deniedText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
