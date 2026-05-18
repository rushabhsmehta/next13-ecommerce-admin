import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { MobileAdminModule } from "@/hooks/useCurrentUser";
import { Colors, FontSize, Spacing } from "@/constants/theme";
import { AdminModuleCard } from "./AdminModuleCard";

export interface AdminToolGroupProps {
  id: string;
  title: string;
  modules: MobileAdminModule[];
  onOpenModule: (module: MobileAdminModule) => void;
  defaultExpanded?: boolean;
  testID?: string;
}

export function AdminToolGroup({
  id,
  title,
  modules,
  onOpenModule,
  defaultExpanded = false,
  testID,
}: AdminToolGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const tid = testID ?? `admin-tool-group-${id}`;

  if (!modules.length) return null;

  return (
    <View style={styles.wrap} testID={tid}>
      <Pressable
        testID={`${tid}-toggle`}
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${modules.length} tools`}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => [styles.header, pressed && styles.headerPressed]}
      >
        <Text style={styles.title} allowFontScaling={false}>
          {title}
        </Text>
        <View style={styles.headerRight}>
          <Text style={styles.count} allowFontScaling={false}>
            {modules.length}
          </Text>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={Colors.textTertiary}
            accessibilityElementsHidden
          />
        </View>
      </Pressable>
      {expanded ? (
        <View style={styles.list}>
          {modules.map((mod) => (
            <AdminModuleCard
              key={mod.id}
              module={mod}
              variant="tool"
              onPress={() => onOpenModule(mod)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderSubtle,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  headerPressed: { opacity: 0.85 },
  title: {
    fontSize: FontSize.sm,
    fontWeight: "800",
    color: Colors.text,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  count: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    color: Colors.textTertiary,
  },
  list: { gap: 2, paddingBottom: Spacing.xs },
});
