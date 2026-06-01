import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, FontSize, Spacing, BorderRadius } from "@/constants/theme";
import {
  getSavedPackages,
  removeSavedPackage,
  type SavedPackage,
} from "@/lib/saved-packages";

export default function SavedPackagesScreen() {
  const router = useRouter();
  const [packages, setPackages] = useState<SavedPackage[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSaved = useCallback(async () => {
    setLoading(true);
    setPackages(await getSavedPackages());
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSaved();
    }, [loadSaved])
  );

  async function handleRemove(pkg: SavedPackage) {
    const next = await removeSavedPackage(pkg.id);
    setPackages(next);
  }

  if (!loading && packages.length === 0) {
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <Ionicons name="heart-outline" size={36} color={Colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>No saved packages yet</Text>
        <Text style={styles.emptyText}>
          Tap the heart on any package to keep it here for comparison and quick access.
        </Text>
        <Pressable style={styles.primaryButton} onPress={() => router.push("/")}>
          <Text style={styles.primaryButtonText}>Browse Packages</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      data={packages}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <>
          <View style={styles.headerCard}>
            <Text style={styles.headerTitle}>Saved packages</Text>
            <Text style={styles.headerText}>
              Shortlist tours, compare the basics, then open any package to enquire.
            </Text>
          </View>
          <CompareRail packages={packages} />
        </>
      }
      renderItem={({ item }) => (
        <Pressable
          style={styles.card}
          accessibilityRole="button"
          accessibilityLabel={`Open ${item.title}`}
          onPress={() => router.push(`/packages/${item.slug || item.id}` as never)}
        >
          <View style={styles.cardIcon}>
            <Ionicons name="map-outline" size={20} color={Colors.primary} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>
            {item.subtitle ? (
              <Text style={styles.cardSubtitle} numberOfLines={1}>
                {item.subtitle}
              </Text>
            ) : null}
            <View style={styles.metaRow}>
              {item.locationLabel ? (
                <Meta icon="location-outline" label={item.locationLabel} />
              ) : null}
              {item.duration ? <Meta icon="time-outline" label={item.duration} /> : null}
              {item.price ? <Meta icon="cash-outline" label={item.price} /> : null}
            </View>
          </View>
          <Pressable
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item.title} from saved packages`}
            onPress={() =>
              Alert.alert("Remove saved package?", item.title, [
                { text: "Cancel", style: "cancel" },
                { text: "Remove", style: "destructive", onPress: () => void handleRemove(item) },
              ])
            }
          >
            <Ionicons name="trash-outline" size={20} color={Colors.textTertiary} />
          </Pressable>
        </Pressable>
      )}
    />
  );
}

function CompareRail({ packages }: { packages: SavedPackage[] }) {
  const compare = packages.slice(0, 3);
  if (compare.length < 2) return null;
  return (
    <View style={styles.compareCard}>
      <Text style={styles.compareTitle}>Quick compare</Text>
      <Text style={styles.compareHint}>Showing your first {compare.length} saved tours.</Text>
      <View style={styles.compareGrid}>
        {compare.map((pkg) => (
          <View key={pkg.id} style={styles.compareColumn}>
            <Text style={styles.compareName} numberOfLines={2}>
              {pkg.title}
            </Text>
            <CompareValue label="Place" value={pkg.locationLabel ?? "Custom"} />
            <CompareValue label="Duration" value={pkg.duration ?? "Ask team"} />
            <CompareValue label="Price" value={pkg.price ?? "Quote"} />
          </View>
        ))}
      </View>
    </View>
  );
}

function CompareValue({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.compareValue}>
      <Text style={styles.compareLabel}>{label}</Text>
      <Text style={styles.compareText} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Meta({ icon, label }: { icon: any; label: string }) {
  return (
    <View style={styles.metaChip}>
      <Ionicons name={icon} size={11} color={Colors.textSecondary} />
      <Text style={styles.metaText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.md,
    backgroundColor: Colors.background,
  },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primaryBg,
  },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: "800", color: Colors.text },
  emptyText: {
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  primaryButton: {
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  primaryButtonText: { color: "#fff", fontWeight: "800" },
  list: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.md,
    backgroundColor: Colors.surface,
  },
  headerCard: {
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primaryBg,
    padding: Spacing.lg,
    gap: 4,
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: "800", color: Colors.text },
  headerText: { color: Colors.textSecondary, lineHeight: 20 },
  compareCard: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  compareTitle: { color: Colors.text, fontWeight: "800", fontSize: FontSize.md },
  compareHint: { color: Colors.textTertiary, fontSize: FontSize.xs },
  compareGrid: { flexDirection: "row", gap: Spacing.sm },
  compareColumn: {
    flex: 1,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    padding: Spacing.sm,
    gap: 7,
  },
  compareName: { color: Colors.text, fontWeight: "800", fontSize: FontSize.xs },
  compareValue: { gap: 2 },
  compareLabel: { color: Colors.textTertiary, fontSize: 9, fontWeight: "700" },
  compareText: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: "700" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primaryBg,
  },
  cardBody: { flex: 1, gap: 5 },
  cardTitle: { color: Colors.text, fontWeight: "800", fontSize: FontSize.md },
  cardSubtitle: { color: Colors.textTertiary, fontSize: FontSize.sm },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    maxWidth: "100%",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  metaText: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: "600" },
});

