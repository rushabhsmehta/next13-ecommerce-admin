import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { Colors, FontSize, Spacing, BorderRadius } from "@/constants/theme";
import { listCouponOffers, type CouponOffer } from "@/lib/coupons";

export default function OffersScreen() {
  const router = useRouter();
  const [offers, setOffers] = useState<CouponOffer[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setOffers(await listCouponOffers());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function copy(code: string) {
    await Clipboard.setStringAsync(code);
  }

  return (
    <View style={styles.screen} testID="offers-screen">
      <Stack.Screen options={{ title: "Offers" }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={Colors.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Offers</Text>
          <Text style={styles.subtitle}>Available coupon campaigns</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={offers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={offers.length ? styles.list : styles.emptyWrap}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="gift-outline" size={36} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>No active offers</Text>
              <Text style={styles.emptyText}>New destination and seasonal offers will appear here.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.icon}>
                  <Ionicons name="pricetag-outline" size={18} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.offerTitle}>{item.name}</Text>
                  <Text style={styles.discount}>{item.discountText}</Text>
                </View>
              </View>
              {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
              <TouchableOpacity
                testID={`offer-copy-${item.code}`}
                style={styles.codeBtn}
                onPress={() => copy(item.code)}
                accessibilityRole="button"
                accessibilityLabel={`Copy coupon code ${item.code}`}
              >
                <Text style={styles.code}>{item.code}</Text>
                <Ionicons name="copy-outline" size={15} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: FontSize.xl, fontWeight: "800", color: Colors.text },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: Spacing.lg, gap: Spacing.md },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: Spacing.xl },
  empty: { alignItems: "center", gap: Spacing.sm },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: "700", color: Colors.text },
  emptyText: { textAlign: "center", color: Colors.textSecondary },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primaryBg,
    alignItems: "center",
    justifyContent: "center",
  },
  offerTitle: { fontSize: FontSize.md, fontWeight: "700", color: Colors.text },
  discount: { color: Colors.primary, fontWeight: "700", marginTop: 2 },
  description: { color: Colors.textSecondary, lineHeight: 19 },
  codeBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  code: { color: Colors.primary, fontWeight: "800", letterSpacing: 0.5 },
});
