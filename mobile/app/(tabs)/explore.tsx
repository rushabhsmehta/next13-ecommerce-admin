import { useEffect, useState, useCallback, useRef } from "react";
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
  Animated,
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

  const fetchPackages = useCallback(
    async (category?: string, search?: string, locationId?: string | null) => {
      try {
        const p: any = { limit: 50 };
        if (category && category !== "all") p.category = category;
        if (search) p.search = search;
        if (locationId) p.locationId = locationId;
        const data = await travelApi.getPackages(p);
        setPackages(data.packages || []);
        const cats = [
          ...new Set(
            (data.packages || []).map((pkg: any) => pkg.tourCategory).filter(Boolean)
          ),
        ] as string[];
        if (cats.length > 0 && categories.length === 0) setCategories(cats);
      } catch (error) {
        console.error("Failed to load packages:", error);
        setPackages([]);
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
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchDestinations();
    fetchPackages(activeCategory, "", activeLocation);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const activeDestLabel = destinations.find((d) => d.id === activeLocation)?.label;

  // ─── Package Card ────────────────────────────────────────────────────────────
  const renderPackage = ({ item, index }: { item: any; index: number }) => (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/packages/${item.slug || item.id}`)}
    >
      {/* Image */}
      <View style={styles.cardImageContainer}>
        {item.images?.[0]?.url ? (
          <Image source={{ uri: item.images[0].url }} style={styles.cardImage} />
        ) : (
          <LinearGradient
            colors={[Colors.gradient1, Colors.gradient2]}
            style={styles.cardImagePlaceholder}
          >
            <Ionicons name="image-outline" size={32} color="rgba(255,255,255,0.6)" />
          </LinearGradient>
        )}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.55)"]}
          style={styles.cardImageGradient}
        />
        {/* Badges */}
        <View style={styles.cardBadgeRow}>
          {item.tourCategory ? (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{item.tourCategory}</Text>
            </View>
          ) : null}
        </View>
        {item.numDaysNight ? (
          <View style={styles.durationBadge}>
            <Ionicons name="time-outline" size={11} color="#fff" />
            <Text style={styles.durationText}>{item.numDaysNight}</Text>
          </View>
        ) : null}
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        <View style={styles.cardInfoLeft}>
          <View style={styles.locationRow}>
            <Ionicons name="location-sharp" size={12} color={Colors.primary} />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.location?.label || "—"}
            </Text>
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.tourPackageName || "Tour Package"}
          </Text>
        </View>
        <View style={styles.cardInfoRight}>
          {item.pricePerAdult ? (
            <>
              <Text style={styles.priceFrom}>from</Text>
              <Text style={styles.priceValue}>
                ₹{Number(item.pricePerAdult).toLocaleString("en-IN")}
              </Text>
              <Text style={styles.pricePer}>/person</Text>
            </>
          ) : (
            <Text style={styles.priceContact}>Contact us</Text>
          )}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.cardFooter}>
        <View style={styles.itineraryTag}>
          <Ionicons name="map-outline" size={12} color={Colors.primary} />
          <Text style={styles.itineraryTagText}>
            {item._count?.itineraries || 0} days planned
          </Text>
        </View>
        <View style={styles.viewBtn}>
          <Text style={styles.viewBtnText}>View Details</Text>
          <Ionicons name="arrow-forward" size={12} color="#fff" />
        </View>
      </View>
    </Pressable>
  );

  // ─── List Header (destinations + search + filters) ───────────────────────────
  const ListHeader = (
    <View>
      {/* Destinations */}
      {destinations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>BROWSE BY DESTINATION</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.destRow}
          >
            <Pressable
              style={[styles.destChip, !activeLocation && styles.destChipActive]}
              onPress={() => handleLocationChange(null)}
            >
              <View style={[styles.destIcon, !activeLocation && styles.destIconActive]}>
                <Ionicons name="globe-outline" size={16} color={!activeLocation ? "#fff" : Colors.primary} />
              </View>
              <Text style={[styles.destLabel, !activeLocation && styles.destLabelActive]}>All</Text>
            </Pressable>
            {destinations.map((dest) => {
              const active = activeLocation === dest.id;
              return (
                <Pressable
                  key={dest.id}
                  style={[styles.destChip, active && styles.destChipActive]}
                  onPress={() => handleLocationChange(active ? null : dest.id)}
                >
                  {dest.imageUrl ? (
                    <Image source={{ uri: dest.imageUrl }} style={styles.destImage} />
                  ) : (
                    <View style={[styles.destIcon, active && styles.destIconActive]}>
                      <Ionicons name="map-outline" size={16} color={active ? "#fff" : Colors.primary} />
                    </View>
                  )}
                  <Text style={[styles.destLabel, active && styles.destLabelActive]} numberOfLines={1}>
                    {dest.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search packages, destinations..."
            placeholderTextColor={Colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery ? (
            <Pressable onPress={() => { setSearchQuery(""); fetchPackages(activeCategory, "", activeLocation); }}>
              <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Category chips */}
      {categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}
        >
          {["all", ...categories].map((cat) => {
            const active = cat === activeCategory;
            return (
              <Pressable key={cat} onPress={() => handleCategoryChange(cat)} style={styles.catChipWrap}>
                {active ? (
                  <LinearGradient
                    colors={[Colors.gradient1, Colors.gradient2]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.catChip}
                  >
                    <Text style={styles.catChipTextActive}>
                      {cat === "all" ? "All Packages" : cat}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View style={[styles.catChip, styles.catChipInactive]}>
                    <Text style={styles.catChipText}>
                      {cat === "all" ? "All Packages" : cat}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Active filter pill */}
      {(activeLocation || activeCategory !== "all") && (
        <View style={styles.filterPillRow}>
          <View style={styles.filterPill}>
            <Ionicons name="funnel" size={11} color={Colors.primary} />
            <Text style={styles.filterPillText}>
              {[activeDestLabel, activeCategory !== "all" && activeCategory].filter(Boolean).join(" · ")}
            </Text>
          </View>
          <Pressable
            style={styles.clearBtn}
            onPress={() => {
              setActiveLocation(null);
              setActiveCategory("all");
              setLoading(true);
              fetchPackages("all", searchQuery, null);
            }}
          >
            <Ionicons name="close" size={12} color={Colors.primary} />
            <Text style={styles.clearBtnText}>Clear</Text>
          </Pressable>
        </View>
      )}

      {/* Results count / loading hint */}
      {!loading && (
        <View style={styles.resultsRow}>
          <Text style={styles.resultsText}>
            {packages.length} package{packages.length !== 1 ? "s" : ""} found
          </Text>
        </View>
      )}
    </View>
  );

  // ─── Empty & Loading states ───────────────────────────────────────────────────
  const ListEmpty = loading ? (
    <View style={styles.centeredState}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.stateText}>Finding packages…</Text>
    </View>
  ) : (
    <View style={styles.centeredState}>
      <LinearGradient colors={[Colors.gradient1, Colors.gradient2]} style={styles.emptyIcon}>
        <Ionicons name="search-outline" size={28} color="#fff" />
      </LinearGradient>
      <Text style={styles.emptyTitle}>No packages found</Text>
      <Text style={styles.emptySubtitle}>Try clearing your filters or search with different terms</Text>
      {(activeLocation || activeCategory !== "all" || searchQuery) && (
        <Pressable
          style={styles.emptyResetBtn}
          onPress={() => {
            setActiveLocation(null);
            setActiveCategory("all");
            setSearchQuery("");
            setLoading(true);
            fetchPackages("all", "", null);
          }}
        >
          <Text style={styles.emptyResetText}>Reset Filters</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <View style={styles.root}>
      <FlatList
        data={loading ? [] : packages}
        keyExtractor={(item) => item.id}
        renderItem={renderPackage}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={<View style={{ height: 100 }} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.surface },
  listContent: { paddingBottom: 20 },

  // ─── Section ───────────────────────────────────────────────────────
  section: { paddingTop: Spacing.lg },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    color: Colors.textSecondary,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },

  // ─── Destinations ──────────────────────────────────────────────────
  destRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.md },
  destChip: {
    alignItems: "center",
    gap: 5,
    width: 72,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadows.light,
  },
  destChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  destImage: { width: 40, height: 40, borderRadius: BorderRadius.md },
  destIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryBg,
    justifyContent: "center",
    alignItems: "center",
  },
  destIconActive: { backgroundColor: Colors.primary },
  destLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.textSecondary,
    textAlign: "center",
    maxWidth: 64,
  },
  destLabelActive: { color: Colors.primary },

  // ─── Search ────────────────────────────────────────────────────────
  searchRow: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.light,
  },
  searchInput: { flex: 1, fontSize: FontSize.md, color: Colors.text },

  // ─── Categories ────────────────────────────────────────────────────
  catRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.sm },
  catChipWrap: {},
  catChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 9,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  catChipInactive: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catChipTextActive: { fontSize: FontSize.sm, fontWeight: "700", color: "#fff" },
  catChipText: { fontSize: FontSize.sm, fontWeight: "500", color: Colors.textSecondary },

  // ─── Filter pill ───────────────────────────────────────────────────
  filterPillRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  filterPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  filterPillText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: "600", flex: 1 },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  clearBtnText: { fontSize: FontSize.sm, fontWeight: "700", color: Colors.primary },

  // ─── Results count ─────────────────────────────────────────────────
  resultsRow: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  resultsText: { fontSize: FontSize.sm, color: Colors.textTertiary, fontWeight: "500" },

  // ─── Card ──────────────────────────────────────────────────────────
  card: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.xl,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    overflow: "hidden",
    ...Shadows.medium,
  },
  cardImageContainer: { position: "relative", height: 180 },
  cardImage: { width: "100%", height: "100%" },
  cardImagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  cardImageGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  cardBadgeRow: {
    position: "absolute",
    top: Spacing.md,
    left: Spacing.md,
    flexDirection: "row",
    gap: Spacing.xs,
  },
  categoryBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  categoryBadgeText: { fontSize: 10, fontWeight: "800", color: "#fff", letterSpacing: 0.5 },
  durationBadge: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  durationText: { fontSize: 10, color: "#fff", fontWeight: "600" },

  cardInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  cardInfoLeft: { flex: 1 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 3, marginBottom: 4 },
  locationText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: "500", flex: 1 },
  cardTitle: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.text,
    lineHeight: 22,
  },
  cardInfoRight: { alignItems: "flex-end", minWidth: 80 },
  priceFrom: { fontSize: 9, color: Colors.textTertiary, fontWeight: "500" },
  priceValue: { fontSize: FontSize.lg, fontWeight: "800", color: Colors.primary, lineHeight: 22 },
  pricePer: { fontSize: 9, color: Colors.textSecondary },
  priceContact: { fontSize: FontSize.sm, color: Colors.textSecondary, fontStyle: "italic" },

  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    marginTop: Spacing.sm,
  },
  itineraryTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  itineraryTagText: { fontSize: 11, color: Colors.primary, fontWeight: "600" },
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
  },
  viewBtnText: { fontSize: 11, fontWeight: "700", color: "#fff" },

  // ─── States ────────────────────────────────────────────────────────
  centeredState: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.sm,
  },
  stateText: { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: Spacing.sm },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: "700", color: Colors.text },
  emptySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyResetBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  emptyResetText: { fontSize: FontSize.md, fontWeight: "700", color: "#fff" },
});
