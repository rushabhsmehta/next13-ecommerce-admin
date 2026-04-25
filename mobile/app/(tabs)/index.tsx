import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  Pressable,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  Colors,
  Spacing,
  FontSize,
  BorderRadius,
  Shadows,
} from "@/constants/theme";
import { travelApi } from "@/lib/api";

const PHONE_NUMBER = "+919724444701";
const WHATSAPP_NUMBER = "919724444701";

type Destination = {
  id: string;
  label: string;
  imageUrl?: string | null;
  slug?: string | null;
  _count?: { tourPackages?: number };
};

type Package = {
  id: string;
  slug?: string | null;
  tourPackageName?: string | null;
  tourCategory?: string | null;
  numDaysNight?: string | null;
  pricePerAdult?: string | null;
  price?: string | null;
  location?: { label?: string | null };
  images?: { url: string }[];
  _count?: { itineraries?: number };
};

export default function HomeScreen() {
  const router = useRouter();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeLocation, setActiveLocation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPackages = useCallback(
    async (opts?: {
      category?: string;
      search?: string;
      locationId?: string | null;
      limit?: number;
    }) => {
      const data = await travelApi.getPackages({
        limit: opts?.limit ?? 8,
        category: opts?.category && opts.category !== "all" ? opts.category : undefined,
        search: opts?.search?.trim() || undefined,
        locationId: opts?.locationId || undefined,
      });

      const nextPackages = data.packages || [];
      setPackages(nextPackages);
      setCategories((prev) =>
        prev.length > 0
          ? prev
          : ([...new Set(nextPackages.map((pkg: Package) => pkg.tourCategory).filter(Boolean))] as string[])
      );
    },
    []
  );

  const loadData = useCallback(
    async (showRefreshing = false) => {
      try {
        if (showRefreshing) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const [destResult, pkgResult] = await Promise.allSettled([
          travelApi.getDestinations(),
          loadPackages({
            category: activeCategory,
            search: appliedSearch,
            locationId: activeLocation,
            limit: 8,
          }),
        ]);

        if (destResult.status === "fulfilled") {
          setDestinations(destResult.value.destinations || []);
        } else {
          console.error("Failed to load destinations:", destResult.reason);
          setDestinations([]);
        }

        if (pkgResult.status === "rejected") {
          console.error("Failed to load packages:", pkgResult.reason);
          setPackages([]);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeCategory, activeLocation, appliedSearch, loadPackages]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedDestinationLabel = useMemo(
    () => destinations.find((d) => d.id === activeLocation)?.label,
    [activeLocation, destinations]
  );

  const handleSearch = () => {
    setAppliedSearch(searchText.trim());
  };

  const handleClear = () => {
    setSearchText("");
    setAppliedSearch("");
    setActiveCategory("all");
    setActiveLocation(null);
  };

  const handleRefresh = () => {
    loadData(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Finding great tours...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={Colors.primary}
        />
      }
    >
      <View style={styles.topHero}>
        <LinearGradient
          colors={[Colors.gradient1, Colors.gradient2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.brandCard}
        >
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <Ionicons name="airplane" size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.brandLabel}>Aagam Holidays</Text>
              <Text style={styles.brandTitle}>Discover your next trip</Text>
            </View>
          </View>

          <View style={styles.searchWrap}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={16} color={Colors.textTertiary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search packages or destinations"
                placeholderTextColor={Colors.textTertiary}
                value={searchText}
                onChangeText={setSearchText}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              {searchText ? (
                <Pressable onPress={() => setSearchText("")}>
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={Colors.textTertiary}
                  />
                </Pressable>
              ) : null}
            </View>
            <Pressable style={styles.searchButton} onPress={handleSearch}>
              <Text style={styles.searchButtonText}>Search</Text>
            </Pressable>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>Browse by destination</Text>
            <Text style={styles.sectionTitle}>Popular places</Text>
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.destRow}
        >
          {destinations.slice(0, 8).map((dest) => {
            const active = activeLocation === dest.id;
            return (
              <Pressable
                key={dest.id}
                style={[styles.destCard, active && styles.destCardActive]}
                onPress={() => {
                  setActiveLocation(active ? null : dest.id);
                }}
              >
                <View style={styles.destImageWrap}>
                  {dest.imageUrl ? (
                    <Image source={{ uri: dest.imageUrl }} style={styles.destImage} />
                  ) : (
                    <LinearGradient
                      colors={[Colors.gradient1, Colors.gradient2]}
                      style={styles.destImage}
                    />
                  )}
                </View>
                <Text style={styles.destLabel} numberOfLines={2}>
                  {dest.label}
                </Text>
                <Text style={styles.destMeta}>
                  {dest._count?.tourPackages || 0} package
                  {(dest._count?.tourPackages || 0) === 1 ? "" : "s"}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>Browse by type</Text>
            <Text style={styles.sectionTitle}>Tour categories</Text>
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}
        >
          {["all", ...categories].map((cat) => {
            const active = cat === activeCategory;
            return (
              <Pressable
                key={cat}
                onPress={() => setActiveCategory(cat)}
                style={[
                  styles.catChip,
                  active && styles.catChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.catChipText,
                    active && styles.catChipTextActive,
                  ]}
                >
                  {cat === "all" ? "All packages" : cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {(appliedSearch || activeCategory !== "all" || activeLocation) && (
        <View style={styles.filterRow}>
          <View style={styles.filterPill}>
            <Ionicons name="funnel" size={11} color={Colors.primary} />
            <Text style={styles.filterText} numberOfLines={1}>
              {[selectedDestinationLabel, activeCategory !== "all" ? activeCategory : null, appliedSearch ? `Search: ${appliedSearch}` : null]
                .filter(Boolean)
                .join(" • ")}
            </Text>
          </View>
          <Pressable style={styles.clearButton} onPress={handleClear}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>Featured</Text>
            <Text style={styles.sectionTitle}>
              {appliedSearch || activeCategory !== "all" || activeLocation
                ? "Matching packages"
                : "Trending packages"}
            </Text>
          </View>
        </View>

        {packages.length > 0 ? (
          packages.map((pkg) => (
            <Pressable
              key={pkg.id}
              style={styles.pkgCard}
              onPress={() => router.push(`/packages/${pkg.slug || pkg.id}`)}
            >
              {pkg.images?.[0]?.url ? (
                <Image source={{ uri: pkg.images[0].url }} style={styles.pkgImage} />
              ) : (
                <LinearGradient
                  colors={[Colors.gradient1, Colors.gradient2]}
                  style={styles.pkgImage}
                />
              )}
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.18)", "rgba(0,0,0,0.84)"]}
                locations={[0, 0.3, 1]}
                style={styles.pkgOverlay}
              />
              <View style={styles.pkgTop}>
                {pkg.numDaysNight ? (
                  <View style={styles.pill}>
                    <Ionicons name="time-outline" size={11} color="#fff" />
                    <Text style={styles.pillText}>{pkg.numDaysNight}</Text>
                  </View>
                ) : null}
                {pkg.tourCategory ? (
                  <View style={styles.categoryPill}>
                    <Text style={styles.categoryPillText}>{pkg.tourCategory}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.pkgBottom}>
                <View style={styles.pkgLeft}>
                  <Text style={styles.pkgLocation} numberOfLines={1}>
                    {pkg.location?.label || ""}
                  </Text>
                  <Text style={styles.pkgTitle} numberOfLines={2}>
                    {pkg.tourPackageName || "Tour Package"}
                  </Text>
                  <Text style={styles.pkgSub}>
                    {pkg._count?.itineraries || 0} day itinerary
                  </Text>
                </View>
                <View style={styles.pkgRight}>
                  <View style={styles.priceBadge}>
                    <Text style={styles.priceFrom}>from</Text>
                    <Text style={styles.priceValue}>
                      {pkg.pricePerAdult
                        ? `₹${Number(pkg.pricePerAdult).toLocaleString("en-IN")}`
                        : "Get Quote"}
                    </Text>
                  </View>
                  <View style={styles.arrowCircle}>
                    <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
                  </View>
                </View>
              </View>
            </Pressable>
          ))
        ) : (
          <View style={styles.emptyState}>
            <LinearGradient colors={[Colors.gradient1, Colors.gradient2]} style={styles.emptyIcon}>
              <Ionicons name="search-outline" size={28} color="#fff" />
            </LinearGradient>
            <Text style={styles.emptyTitle}>No packages found</Text>
            <Text style={styles.emptySubtitle}>
              Try a different search or clear the filters.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <LinearGradient
          colors={[Colors.gradient1, Colors.gradient2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ctaCard}
        >
          <View style={styles.ctaIcon}>
            <Ionicons name="chatbubbles" size={20} color="#fff" />
          </View>
          <Text style={styles.ctaTitle}>Need a custom itinerary?</Text>
          <Text style={styles.ctaSubtitle}>
            Our travel experts can help you plan a perfect trip.
          </Text>
          <View style={styles.ctaButtons}>
            <Pressable
              style={styles.ctaButton}
              onPress={() => Linking.openURL(`tel:${PHONE_NUMBER}`)}
            >
              <Ionicons name="call" size={16} color={Colors.primary} />
              <Text style={styles.ctaButtonText}>Call</Text>
            </Pressable>
            <Pressable
              style={[styles.ctaButton, styles.ctaButtonWa]}
              onPress={() =>
                Linking.openURL(
                  `https://wa.me/${WHATSAPP_NUMBER}?text=Hi, I would like to plan a tour.`
                )
              }
            >
              <Ionicons name="logo-whatsapp" size={16} color="#fff" />
              <Text style={[styles.ctaButtonText, { color: "#fff" }]}>WhatsApp</Text>
            </Pressable>
          </View>
        </LinearGradient>
      </View>

      <View style={{ height: 110 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.surface,
  },
  loadingText: {
    marginTop: Spacing.md,
    color: Colors.textSecondary,
    fontSize: FontSize.md,
  },

  topHero: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  brandCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.medium,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  brandLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.78)",
    textTransform: "uppercase",
    letterSpacing: 1.4,
    fontWeight: "700",
  },
  brandTitle: {
    fontSize: FontSize.title,
    color: "#fff",
    fontWeight: "800",
    marginTop: 2,
  },
  searchWrap: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  searchButton: {
    backgroundColor: "#fff",
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    justifyContent: "center",
    alignItems: "center",
  },
  searchButtonText: {
    fontSize: FontSize.sm,
    fontWeight: "800",
    color: Colors.primary,
  },

  section: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1.3,
    marginBottom: 3,
  },
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: "800",
    color: Colors.text,
  },

  destRow: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  destCard: {
    width: 142,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.light,
  },
  destCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  destImageWrap: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginBottom: 8,
  },
  destImage: {
    width: "100%",
    height: "100%",
  },
  destLabel: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.text,
    lineHeight: 18,
  },
  destMeta: {
    marginTop: 2,
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  catRow: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  catChip: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  catChipText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  catChipTextActive: {
    color: "#fff",
    fontWeight: "800",
  },

  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  filterPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  filterText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: "700",
  },
  clearButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.background,
  },
  clearButtonText: {
    fontSize: FontSize.sm,
    fontWeight: "800",
    color: Colors.primary,
  },

  pkgCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    height: 220,
    ...Shadows.medium,
  },
  pkgImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  pkgOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "75%",
  },
  pkgTop: {
    position: "absolute",
    top: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: "row",
    gap: Spacing.xs,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  pillText: { fontSize: 11, color: "#fff", fontWeight: "700" },
  categoryPill: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  categoryPillText: { fontSize: 11, color: "#fff", fontWeight: "700" },
  pkgBottom: {
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
  pkgLeft: { flex: 1, marginRight: Spacing.sm },
  pkgLocation: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
    marginBottom: 3,
  },
  pkgTitle: {
    fontSize: FontSize.lg,
    fontWeight: "800",
    color: "#fff",
    lineHeight: 22,
    marginBottom: 4,
  },
  pkgSub: { fontSize: 11, color: "rgba(255,255,255,0.7)" },
  pkgRight: { alignItems: "flex-end", gap: Spacing.xs },
  priceBadge: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    alignItems: "flex-end",
  },
  priceFrom: { fontSize: 9, color: "rgba(255,255,255,0.7)", fontWeight: "500" },
  priceValue: { fontSize: FontSize.md, fontWeight: "800", color: "#fff" },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },

  emptyState: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    gap: 6,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: "800",
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },

  ctaCard: {
    borderRadius: BorderRadius.xl,
    marginHorizontal: Spacing.lg,
    padding: Spacing.xl,
    alignItems: "center",
  },
  ctaIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  ctaTitle: {
    fontSize: FontSize.xl,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    marginBottom: 4,
  },
  ctaSubtitle: {
    fontSize: FontSize.sm,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  ctaButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
    width: "100%",
  },
  ctaButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
  },
  ctaButtonWa: {
    backgroundColor: "#25D366",
  },
  ctaButtonText: {
    fontSize: FontSize.sm,
    fontWeight: "800",
    color: Colors.primary,
  },
});
