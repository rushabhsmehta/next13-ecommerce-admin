import { useMemo } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AdminHubSection,
  AdminLoadingState,
  AdminScreen,
} from "@/components/admin";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  filterOperationsNavSections,
  type OperationsNavItem,
  ASSOCIATE_OPERATIONS_SECTIONS,
  OPERATIONS_ADMIN_SECTIONS,
} from "@/lib/operations-admin-nav";

function displayRoleLabel(
  role: string | null,
  isAssociate: boolean,
  isOwner: boolean
): string {
  if (isAssociate) return "Associate";
  if (isOwner) return "Owner";
  if (role === "ADMIN") return "Admin";
  if (role === "OPERATIONS") return "Operations";
  if (role === "FINANCE") return "Finance";
  if (role === "VIEWER") return "Viewer";
  return role ? role.charAt(0) + role.slice(1).toLowerCase() : "Staff";
}

export function OperationsAdminHub() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();
  const {
    organizationRole,
    isAssociate,
    canUseAdmin,
    permissions,
    isLoading: authLoading,
    isOwner,
  } = useCurrentUser();

  const navSections = useMemo(() => {
    const base = isAssociate ? ASSOCIATE_OPERATIONS_SECTIONS : OPERATIONS_ADMIN_SECTIONS;
    return filterOperationsNavSections(base, { permissions, isAssociate });
  }, [isAssociate, permissions]);

  function openItem(item: OperationsNavItem) {
    router.push(item.route as never);
  }

  if (authLoading) {
    return <AdminLoadingState label="Loading…" testID="operations-hub-loading" />;
  }

  if (!isSignedIn && !canUseAdmin) {
    return (
      <View style={styles.centered}>
        <Ionicons name="lock-closed-outline" size={42} color={Colors.textTertiary} />
        <Text style={styles.emptyTitle}>Sign in required</Text>
        <Text style={styles.emptyText}>Use your staff account to open Operations.</Text>
        <Pressable
          testID="operations-hub-sign-in"
          accessibilityRole="button"
          accessibilityLabel="Sign in"
          style={styles.primaryButton}
          onPress={() => router.push("/login")}
        >
          <Text style={styles.primaryButtonText}>Sign in</Text>
        </Pressable>
      </View>
    );
  }

  if (!canUseAdmin) {
    return (
      <View style={styles.centered}>
        <Ionicons name="shield-outline" size={42} color={Colors.textTertiary} />
        <Text style={styles.emptyTitle}>No access</Text>
        <Text style={styles.emptyText}>Operations isn’t enabled for this account.</Text>
      </View>
    );
  }

  const roleLabel = displayRoleLabel(organizationRole, isAssociate, isOwner);

  return (
    <AdminScreen
      testID="operations-admin-hub"
      contentContainerStyle={{
        paddingBottom: insets.bottom + Spacing.lg,
        paddingHorizontal: Spacing.lg,
        gap: Spacing.xl,
      }}
    >
      <View style={styles.header} testID="operations-hub-header">
        <View style={styles.headerText}>
          <Text style={styles.title}>Operations</Text>
          <Text style={styles.subtitle}>Same modules as web CRM — tap a card to open</Text>
        </View>
        <View style={styles.rolePill}>
          <Text style={styles.rolePillText}>{roleLabel}</Text>
        </View>
      </View>

      {navSections.map((section) => (
        <AdminHubSection
          key={section.id}
          id={section.id}
          title={section.title}
          items={section.items}
          onPressItem={openItem}
        />
      ))}
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.background,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: "800",
    color: Colors.text,
    textAlign: "center",
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  primaryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    marginTop: Spacing.sm,
  },
  primaryButtonText: { color: Colors.textInverse, fontWeight: "800", fontSize: FontSize.md },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.md,
    paddingTop: Spacing.sm,
  },
  headerText: { flex: 1, gap: 4 },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: "800",
    color: Colors.text,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  rolePill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
  },
  rolePillText: {
    fontSize: FontSize.xs,
    fontWeight: "800",
    color: Colors.textSecondary,
  },
});
