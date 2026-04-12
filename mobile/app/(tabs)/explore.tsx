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
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from "@/constants/theme";
import { travelApi } from "@/lib/api";

export default function ExploreScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string; locationId?: string }>();

  const [packages, setPackages] = useState<any[]>([]);
  const [destinations, setDestinations] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState(params.category || "all");
  const [activeLocation, setActiveLocation] = useState<string | null>(params.locationId || null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPackages = useCallback(
    async (category?: string, search?: string, locationId?: string | null) => {
      try {
        const p: any = { limit: 50 };
        if (category && category !== "all") p.category = category;
        if (search) p.search = search;
        if (locationId) p.locationId = locationId;
        const data = await travelApi.getPackages(p);
        setPackages(data.packages || []);
        setError(null);

        const cats = [
          ...new Set(
            (data.packages || [])
              .map((pkg: any) => pkg.tourCategory)
              .filter(Boolean)
          ),
        ] as string[];
        if (cats.length > 0 && categories.length === 0) {
          setCategories(cats);
        }
      } catch (err: any) {
        console.error("Failed to load packages:", err);
        setError(err?.message || "Failed to load packages");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [categories.length]
  );

  const fetchDestinations = useCallback(async () => {
    try {
      const data = await travelApi.getDestinations();
      setDestinations(data.destinations || []);
    } catch (error) {
      console.error("Failed to load destinations:", error);
    }
  }, []);

  useEffect(() => {
    fetchDestinations();
    fetchPackages(activeCategory, "", activeLocation);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle incoming params from Home's category/location chips
  useEffect(() => {
    if (params.category && params.category !== activeCategory) {
      setActiveCategory(params.category);
      setLoading(true);
      fetchPackages(params.category, searchQuery, activeLocation);
    }
  }, [params.category]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setLoading(true);
    fetchPackages(cat, searchQuery, activeLocation);
  };

  const handleLocationChange = (locationId: string | null) => {
    setActiveLocation(locationId);
    setLoading(true);
    fetchPackages(activeCategory, searchQuery, locationId);
  };

  const handleSearch = () => {
    setLoading(true);
    fetchPackages(activeCategory, searchQuery, activeLocation);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPackages(activeCategory, searchQuery, activeLocation);
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
      {/* Destinations row */}
      {destinations.length > 0 && (
        <View style={styles.destinationsSection}>
          <Text style={styles.destinationsSectionLabel}>Browse by Destination</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.destinationsList}
          >
            {/* "All" chip */}
            <Pressable
              style={[styles.destChip, !activeLocation && styles.destChipActive]}
              onPress={() => handleLocationChange(null)}
            >
              <View style={[styles.destChipIcon, !activeLocation && styles.destChipIconActive]}>
                <Ionicons name="globe-outline" size={18} color={!activeLocation ? "#fff" : Colors.primary} />
              </View>
              <Text style={[styles.destChipLabel, !activeLocation && styles.destChipLabelActive]}>All</Text>
            </Pressable>

            {destinations.map((dest) => {
              const isActive = activeLocation === dest.id;
              return (
                <Pressable
                  key={dest.id}
                  style={[styles.destChip, isActive && styles.destChipActive]}
                  onPress={() => handleLocationChange(isActive ? null : dest.id)}
                >
                  {dest.imageUrl ? (
                    <Image source={{ uri: dest.imageUrl }} style={styles.destChipImage} />
                  ) : (
                    <View style={[styles.destChipIcon, isActive && styles.destChipIconActive]}>
                      <Ionicons name="map-outline" size={18} color={isActive ? "#fff" : Colors.primary} />
                    </View>
                  )}
                  <Text style={[styles.destChipLabel, isActive && styles.destChipLabelActive]} numberOfLines={1}>
                    {dest.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

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
              fetchPackages(activeCategory, "", activeLocation);
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

      {/* Active filters summary */}
      {(activeLocation || activeCategory !== "all") && (
        <View style={styles.activeFilters}>
          <Ionicons name="funnel" size={12} color={Colors.primary} />
          <Text style={styles.activeFiltersText}>
            {[
              activeLocation && destinations.find((d) => d.id === activeLocation)?.label,
              activeCategory !== "all" && activeCategory,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
          <Pressable
            onPress={() => {
              setActiveLocation(null);
              setActiveCategory("all");
              setLoading(true);
              fetchPackages("all", searchQuery, null);
            }}
          >
            <Text style={styles.clearFilters}>Clear</Text>
          </Pressable>
        </View>
      )}

      {/* Package List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="cloud-offline-outline" size={32} color={Colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Something went wrong</Text>
          <Text style={styles.emptySubtitle}>
            Could not load packages. Please check your connection.
          </Text>
          <Pressable
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              setLoading(true);
              fetchPackages(activeCategory, searchQuery, activeLocation);
            }}
          >
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
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
          style={{ flex: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
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

  // Destinations section
  destinationsSection: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  destinationsSectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    color: Colors.textSecondary,
    letterSpacing: 1,
    textTransform: "uppercase",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  destinationsList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  destChip: {
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background,
    minWidth: 68,
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadows.light,
  },
  destChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  destChipImage: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
  },
  destChipIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryBg,
    justifyContent: "center",
    alignItems: "center",
  },
  destChipIconActive: {
    backgroundColor: Colors.primary,
  },
  destChipLabel: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    color: Colors.textSecondary,
    maxWidth: 64,
    textAlign: "center",
  },
  destChipLabelActive: {
    color: Colors.primary,
  },

  // Active filters
  activeFilters: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  activeFiltersText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: "500",
  },
  clearFilters: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.primary,
    textDecorationLine: "underline",
  },

  // Search
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    margin: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
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
  emptySubtitle: { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: "center", paddingHorizontal: Spacing.lg },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.md,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: FontSize.md,
    fontWeight: "700",
  },
});
