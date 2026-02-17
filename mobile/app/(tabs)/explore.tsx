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
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
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

        // Extract unique categories
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
      <Image
        source={{ uri: item.images?.[0]?.url }}
        style={styles.cardImage}
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
      <View style={styles.cardBody}>
        <Text style={styles.location}>
          <Ionicons name="location" size={11} color={Colors.primary} />{" "}
          {item.location?.label}
        </Text>
        <Text style={styles.name} numberOfLines={2}>
          {item.tourPackageName || "Tour Package"}
        </Text>
        <View style={styles.cardFooter}>
          {item.pricePerAdult ? (
            <Text style={styles.price}>
              ₹{Number(item.pricePerAdult).toLocaleString("en-IN")}
              <Text style={styles.priceUnit}>/person</Text>
            </Text>
          ) : (
            <Text style={styles.contactPrice}>Contact for pricing</Text>
          )}
          <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={Colors.textTertiary} />
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
          renderItem={({ item }) => (
            <Pressable
              style={[
                styles.categoryChip,
                item === activeCategory && styles.categoryChipActive,
              ]}
              onPress={() => handleCategoryChange(item)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  item === activeCategory && styles.categoryChipTextActive,
                ]}
              >
                {item === "all" ? "All Packages" : item}
              </Text>
            </Pressable>
          )}
        />
      )}

      {/* Package List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : packages.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="search" size={48} color={Colors.textTertiary} />
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: FontSize.md, color: Colors.text },

  // Categories
  categoryList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  categoryChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryChipText: {
    fontSize: FontSize.sm,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  categoryChipTextActive: { color: "#fff" },

  // Cards
  listContent: { padding: Spacing.lg, gap: Spacing.lg },
  card: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardImage: { width: "100%", height: 160 },
  badge: {
    position: "absolute",
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  badgeText: { fontSize: FontSize.xs, fontWeight: "600", color: Colors.primary },
  durationBadge: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  durationText: { fontSize: FontSize.xs, color: "#fff" },
  cardBody: { padding: Spacing.lg },
  location: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 4 },
  name: { fontSize: FontSize.lg, fontWeight: "600", color: Colors.text, marginBottom: Spacing.md },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.md,
  },
  price: { fontSize: FontSize.lg, fontWeight: "700", color: Colors.primary },
  priceUnit: { fontSize: FontSize.xs, fontWeight: "400", color: Colors.textSecondary },
  contactPrice: { fontSize: FontSize.sm, color: Colors.textSecondary },

  emptyTitle: { fontSize: FontSize.lg, fontWeight: "600", color: Colors.text },
  emptySubtitle: { fontSize: FontSize.md, color: Colors.textSecondary },
});
