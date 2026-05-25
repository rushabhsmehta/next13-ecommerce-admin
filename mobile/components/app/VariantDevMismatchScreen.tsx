import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BorderRadius, Colors, FontSize, Spacing } from "@/constants/theme";
import type { VariantDevMismatch } from "@/lib/variant-dev";

export function VariantDevMismatchScreen({ mismatch }: { mismatch: VariantDevMismatch }) {
  return (
    <View style={styles.root} testID="variant-dev-mismatch">
      <Ionicons name="swap-horizontal-outline" size={48} color={Colors.primary} />
      <Text style={styles.title}>Wrong dev server</Text>
      <Text style={styles.body}>
        You opened <Text style={styles.strong}>{mismatch.nativeLabel}</Text>, but Metro is
        serving <Text style={styles.strong}>{mismatch.bundleLabel}</Text> JavaScript. That is why
        you see the wrong app UI.
      </Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Fix (USB)</Text>
        <Text style={styles.step}>1. Stop the current Metro terminal (Ctrl+C)</Text>
        <Text style={styles.step}>2. In mobile/ run:</Text>
        <Text style={styles.code}>{mismatch.startCommand}</Text>
        <Text style={styles.step}>3. Port reverse:</Text>
        <Text style={styles.code}>
          adb reverse tcp:{mismatch.expectedPort} tcp:{mismatch.expectedPort}
        </Text>
        <Text style={styles.step}>4. Reload this app (shake → Reload)</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.xl,
    justifyContent: "center",
    gap: Spacing.md,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: "800",
    color: Colors.text,
  },
  body: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  strong: {
    fontWeight: "800",
    color: Colors.text,
  },
  card: {
    marginTop: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    gap: Spacing.sm,
  },
  cardTitle: {
    fontSize: FontSize.sm,
    fontWeight: "800",
    color: Colors.text,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  step: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  code: {
    fontFamily: "monospace",
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.primaryDark,
    backgroundColor: Colors.primaryBg,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
  },
});
