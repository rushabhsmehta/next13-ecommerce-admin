import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  Pressable,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from "@/constants/theme";
import { travelApi } from "@/lib/api";

export default function ExploreScreen() {
  const router = useRouter();
  const [packages, setPackages] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPackages = useCallback(
    async (category?: string, search?: string) => {
      try {
        const params: any = { limit: 50 };
        if (category && category !== "all") params.category = category;
        if (search) params.search = search;
        const data = await travelApi.getPackages(params);
        setPackages(data.packages || []);

        const cats = [
          ...new Set(
            (data.packages || [])
              .map((p: any) => p.tourCategory)
              .filter(Boolean)
          ),
        ] as string[];
        if (cats.length > 0 && categories.length === 0) {
          setCategories(cats);
        }
      } catch (error) {
        console.error("Failed to load packages:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [categories.length]
  );

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setLoading(true);
    fetchPackages(cat, searchQuery);
  };

  const handleSearch = () => {
    setLoading(true);
    fetchPackages(activeCategory, searchQuery);
  };

  const renderPackage = ({ item }: { item: any }) => (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/packages/${item.slug || item.id}`)}
    >
      <View style={styles.cardImageWrap}>
        {item.images?.[0]?.url ? (
          <Image
            source={{ uri: item.images[0].url }}
            style={styles.cardImage}
          />
        ) : (
          <LinearGradient
            colors={[Colors.gradient1, Colors.gradient2]}
            style={[styles.cardImage, { justifyContent: "center", alignItems: "center" }]}
          >
            <Ionicons name="image-outline" size={36} color="rgba(255,255,255,0.5)" />
          </LinearGradient>
        )}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.35)"]}
          style={styles.cardImageOverlay}
        />
        {item.tourCategory && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.tourCategory}</Text>
          </View>
        )}
        {item.numDaysNight && (
          <View style={styles.durationBadge}>
            <Ionicons name="time-outline" size={10} color="#fff" />
            <Text style={styles.durationText}>{item.numDaysNight}</Text>
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardAccent} />
        <View style={styles.cardContent}>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={11} color={Colors.primary} />
            <Text style={styles.location}>{item.location?.label}</Text>
          </View>
          <Text style={styles.name} numberOfLines={2}>
            {item.tourPackageName || "Tour Package"}
          </Text>
          <View style={styles.cardFooter}>
            {item.pricePerAdult ? (
              <Text style={styles.price}>
                ₹{Number(item.pricePerAdult).toLocaleString("en-IN")}
                <Text style={styles.priceUnit}> /person</Text>
              </Text>
            ) : (
              <Text style={styles.contactPrice}>Contact for pricing</Text>
            )}
            <View style={styles.arrowBtn}>
              <Ionicons name="arrow-forward" size={14} color="#fff" />
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchBar}>
        <View style={styles.searchIconWrap}>
          <Ionicons name="search" size={14} color="#fff" />
        </View>
        <TextInput
          style={styles.searchInput}
          placeholder="Search packages..."
          placeholderTextColor={Colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {searchQuery ? (
          <Pressable
            onPress={() => {
              setSearchQuery("");
              fetchPackages(activeCategory, "");
            }}
          >
            <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
          </Pressable>
        ) : null}
      </View>

      {/* Category Filter */}
      {categories.length > 0 && (
        <FlatList
          horizontal
          data={["all", ...categories]}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => {
            const isActive = item === activeCategory;
            const label = item === "all" ? "All Packages" : item;
            return (
              <Pressable
                style={styles.categoryChipOuter}
                onPress={() => handleCategoryChange(item)}
              >
                {isActive ? (
                  <LinearGradient
                    colors={[Colors.gradient1, Colors.gradient2]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.categoryChipInner}
                  >
                    <Text style={styles.categoryChipTextActive}>{label}</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.categoryChipInactive}>
                    <Text style={styles.categoryChipText}>{label}</Text>
                  </View>
                )}
              </Pressable>
            );
          }}
        />
      )}

      {/* Package List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : packages.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="search" size={32} color={Colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No packages found</Text>
          <Text style={styles.emptySubtitle}>
            Try adjusting your search or filters
          </Text>
        </View>
      ) : (
        <FlatList
          data={packages}
          keyExtractor={(item) => item.id}
          renderItem={renderPackage}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchPackages(activeCategory, searchQuery);
              }}
              tintColor={Colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.sm,
  },

  // Search
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    margin: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    ...Shadows.light,
  },
  searchIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  searchInput: { flex: 1, fontSize: FontSize.md, color: Colors.text },

  // Categories
  categoryList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    height: 40,
  },
  categoryChipOuter: {
    height: 36,
  },
  categoryChipInner: {
    height: 36,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryChipInactive: {
    height: 36,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipText: {
    fontSize: FontSize.sm,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  categoryChipTextActive: {
    color: "#fff",
    fontSize: FontSize.sm,
    fontWeight: "700",
  },

  // Cards
  listContent: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.lg },
  card: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    ...Shadows.medium,
  },
  cardImageWrap: { position: "relative" },
  cardImage: { width: "100%", height: 180 },
  cardImageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  badge: {
    position: "absolute",
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  badgeText: { fontSize: FontSize.xs, fontWeight: "700", color: "#fff" },
  durationBadge: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  durationText: { fontSize: FontSize.xs, color: "#fff", fontWeight: "600" },
  cardBody: { flexDirection: "row" },
  cardAccent: {
    width: 4,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  cardContent: { flex: 1, padding: Spacing.lg },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  location: { fontSize: FontSize.sm, color: Colors.textSecondary },
  name: { fontSize: FontSize.lg, fontWeight: "700", color: Colors.text, marginBottom: Spacing.md, lineHeight: 22 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.md,
  },
  price: { fontSize: FontSize.lg, fontWeight: "800", color: Colors.primary },
  priceUnit: { fontSize: FontSize.xs, fontWeight: "400", color: Colors.textSecondary },
  contactPrice: { fontSize: FontSize.sm, color: Colors.textSecondary },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  // Empty state
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryBg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: "700", color: Colors.text },
  emptySubtitle: { fontSize: FontSize.md, color: Colors.textSecondary },
});
