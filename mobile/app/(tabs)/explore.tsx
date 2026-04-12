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

  // ─── Package Card (Thrillophilia-style full-bleed overlay) ──────────────────
  const renderPackage = ({ item }: { item: any }) => (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/packages/${item.slug || item.id}`)}
    >
      {/* Full-bleed image */}
      {item.images?.[0]?.url ? (
        <Image source={{ uri: item.images[0].url }} style={styles.cardImage} />
      ) : (
        <LinearGradient
          colors={[Colors.gradient1, Colors.gradient2]}
          style={styles.cardImage}
        />
      )}

      {/* Dark gradient overlay — bottom 65% */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.25)", "rgba(0,0,0,0.82)"]}
        locations={[0, 0.35, 1]}
        style={styles.cardOverlay}
      />

      {/* Top row: duration + category */}
      <View style={styles.cardTop}>
        {item.numDaysNight ? (
          <View style={styles.durationPill}>
            <Ionicons name="time-outline" size={11} color="#fff" />
            <Text style={styles.durationPillText}>{item.numDaysNight}</Text>
          </View>
        ) : null}
        {item.tourCategory ? (
          <View style={styles.categoryPill}>
            <Text style={styles.categoryPillText}>{item.tourCategory}</Text>
          </View>
        ) : null}
      </View>

      {/* Bottom overlay: location + title + price */}
      <View style={styles.cardBottom}>
        <View style={styles.cardBottomLeft}>
          <View style={styles.locationRow}>
            <Ionicons name="location-sharp" size={11} color="rgba(255,255,255,0.75)" />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.location?.label || ""}
            </Text>
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.tourPackageName || "Tour Package"}
          </Text>
          {item._count?.itineraries > 0 && (
            <View style={styles.itinRow}>
              <Ionicons name="map-outline" size={11} color="rgba(255,255,255,0.7)" />
              <Text style={styles.itinText}>{item._count.itineraries} day itinerary</Text>
            </View>
          )}
        </View>
        <View style={styles.cardBottomRight}>
          {item.pricePerAdult ? (
            <View style={styles.priceBadge}>
              <Text style={styles.priceFrom}>from</Text>
              <Text style={styles.priceValue}>
                ₹{Number(item.pricePerAdult).toLocaleString("en-IN")}
              </Text>
              <Text style={styles.pricePer}>/ person</Text>
            </View>
          ) : (
            <View style={styles.priceBadge}>
              <Text style={styles.priceContact}>Get Quote</Text>
            </View>
          )}
          <View style={styles.viewArrow}>
            <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
          </View>
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

  // ─── Card (Thrillophilia full-bleed style) ─────────────────────────
  card: {
    borderRadius: BorderRadius.xl,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    height: 220,
    overflow: "hidden",
    ...Shadows.medium,
  },
  cardImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  cardOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "75%",
  },
  cardTop: {
    position: "absolute",
    top: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: "row",
    gap: Spacing.xs,
  },
  durationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  durationPillText: { fontSize: 11, color: "#fff", fontWeight: "700" },
  categoryPill: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  categoryPillText: { fontSize: 11, color: "#fff", fontWeight: "700" },
  cardBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  cardBottomLeft: { flex: 1, marginRight: Spacing.sm },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 3, marginBottom: 4 },
  locationText: { fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: "500" },
  cardTitle: {
    fontSize: FontSize.lg,
    fontWeight: "800",
    color: "#fff",
    lineHeight: 22,
    marginBottom: 4,
  },
  itinRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  itinText: { fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: "500" },
  cardBottomRight: { alignItems: "flex-end", gap: Spacing.xs },
  priceBadge: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: BorderRadius.md,
    alignItems: "flex-end",
  },
  priceFrom: { fontSize: 9, color: "rgba(255,255,255,0.7)", fontWeight: "500" },
  priceValue: { fontSize: FontSize.md, fontWeight: "800", color: "#fff" },
  pricePer: { fontSize: 9, color: "rgba(255,255,255,0.7)" },
  priceContact: { fontSize: FontSize.sm, color: "#fff", fontWeight: "700" },
  viewArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },

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
