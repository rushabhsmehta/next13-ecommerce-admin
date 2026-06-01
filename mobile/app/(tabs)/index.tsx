import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  Pressable,
  TextInput,
  RefreshControl,
  Animated,
  Linking,
  ActivityIndicator,
} from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@clerk/clerk-expo";
import {
  Colors,
  Spacing,
  FontSize,
  BorderRadius,
  Shadows,
} from "@/constants/theme";
import { travelApi } from "@/lib/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUnread } from "@/hooks/useUnread";
import { useDebounce } from "@/hooks/useDebounce";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { splitPackageName } from "@/lib/rich-text";
import {
  PackageCard,
  PACKAGE_CARD_CAROUSEL_WIDTH,
  type HomePackage,
} from "@/components/home/PackageCard";
import { testimonials, whyUs } from "@/components/home/homeConstants";
import {
  getLastViewedPackage,
  setLastViewedPackage,
  type LastViewedPackage,
} from "@/lib/home-preferences";
import {
  WHATSAPP_BUSINESS_NUMBER,
  WHATSAPP_BUSINESS_NUMBER_E164,
} from "@/constants/whatsapp";
import { captureException, trackEvent } from "@/lib/analytics";

/** Fixed-width tiles in the Popular places row (identical card sizes) */
const POPULAR_PLACE_CARD_WIDTH = 100;
/** Thumb + label only (no package count) */
const POPULAR_PLACE_CARD_HEIGHT = 112;
const TESTIMONIAL_CARD_WIDTH = 240;
const PAGE_SIZE = 8;
const MAX_LOCATION_CAROUSELS = 12;
const CAROUSEL_PKG_LIMIT = 8;

type LocationCarouselRow = {
  id: string;
  label: string;
  slug?: string | null;
  packages: Package[];
};

const PHONE_NUMBER = WHATSAPP_BUSINESS_NUMBER_E164;
const WHATSAPP_NUMBER = WHATSAPP_BUSINESS_NUMBER;

type Destination = {
  id: string;
  label: string;
  imageUrl?: string | null;
  slug?: string | null;
  _count?: { tourPackages?: number };
};

type Package = HomePackage;

function formatFeaturedCount(n: number): string {
  if (!n || n < 1) return "";
  if (n >= 10_000) return `${Math.round(n / 1000)}K+`;
  if (n >= 1000) {
    const k = n / 1000;
    const s = k >= 10 ? k.toFixed(0) : k.toFixed(1).replace(/\.0$/, "");
    return `${s}K+`;
  }
  return String(n);
}

function buildWhatsAppPlanMessage(parts: {
  search?: string;
  destination?: string;
  category?: string;
}): string {
  const lines = ["Hi, I would like to plan a tour."];
  if (parts.destination) lines.push(`Destination interest: ${parts.destination}`);
  if (parts.category && parts.category !== "all") lines.push(`Category: ${parts.category}`);
  if (parts.search) lines.push(`I was searching for: ${parts.search}`);
  return lines.join(" ");
}

// ─── Home Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();
  const { isAssociate, travelUser } = useCurrentUser();
  const showPersonalShortcuts = isSignedIn || !!travelUser;
  const { total: unreadChatTotal } = useUnread();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [locationCarouselRows, setLocationCarouselRows] = useState<
    LocationCarouselRow[]
  >([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeLocation, setActiveLocation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [featuredPackageCount, setFeaturedPackageCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastViewed, setLastViewed] = useState<LastViewedPackage | null>(null);
  const [packageTotal, setPackageTotal] = useState<number | null>(null);

  const debouncedSearch = useDebounce(searchText, 300);
  const dataFetchId = useRef(0);

  useEffect(() => {
    void getLastViewedPackage().then(setLastViewed);
  }, []);

  // Skeleton pulse animation
  const skeletonOpacity = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonOpacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(skeletonOpacity, {
          toValue: 0.5,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [skeletonOpacity]);

  const loadData = useCallback(
    async (showRefreshing = false) => {
      const myFetch = ++dataFetchId.current;
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setLoadError(null);
      try {
        const searchQ =
          debouncedSearch.trim() || appliedSearch.trim()
            ? debouncedSearch.trim() || appliedSearch.trim()
            : undefined;
        const isBrowseMode =
          !activeLocation && activeCategory === "all" && !searchQ;

        if (isBrowseMode) {
          try {
            const feed = (await travelApi.getHomeFeed({
              maxLocations: MAX_LOCATION_CAROUSELS,
              packagesPerLocation: CAROUSEL_PKG_LIMIT,
            })) as {
              destinations?: Destination[];
              categories?: string[];
              featuredPackageCount?: number;
              locationCarousels?: LocationCarouselRow[];
            };

            if (myFetch !== dataFetchId.current) return;

            setDestinations(feed.destinations || []);
            setFeaturedPackageCount(
              typeof feed.featuredPackageCount === "number"
                ? feed.featuredPackageCount
                : 0
            );
            setPackageTotal(
              typeof feed.featuredPackageCount === "number"
                ? feed.featuredPackageCount
                : null
            );
            if (Array.isArray(feed.categories) && feed.categories.length > 0) {
              setCategories(feed.categories);
            }

            const rows = feed.locationCarousels || [];

            if (rows.length === 0) {
              try {
                const fb = (await travelApi.getPackages({
                  limit: PAGE_SIZE,
                  offset: 0,
                })) as {
                  packages?: Package[];
                  hasMore?: boolean;
                };
                if (myFetch !== dataFetchId.current) return;
                setPackages(fb.packages || []);
                setHasMore(Boolean(fb.hasMore));
                setLocationCarouselRows([]);
                setLoadError(null);
              } catch {
                if (myFetch !== dataFetchId.current) return;
                setPackages([]);
                setHasMore(false);
                setLocationCarouselRows([]);
                setLoadError("Packages could not load. Pull down to retry.");
              }
            } else {
              setLocationCarouselRows(rows);
              setPackages([]);
              setHasMore(false);
              setLoadError(null);
            }
          } catch (err) {
            if (myFetch !== dataFetchId.current) return;
            console.error("Failed to load home feed:", err);
            setDestinations([]);
            setPackages([]);
            setLocationCarouselRows([]);
            setHasMore(false);
            setLoadError("Packages could not load. Pull down to retry.");
            setPackageTotal(null);
          }
        } else {
          setLocationCarouselRows([]);
          const [destResult, pkgResult] = await Promise.allSettled([
            travelApi.getDestinations(),
            travelApi.getPackages({
              limit: PAGE_SIZE,
              offset: 0,
              category:
                activeCategory !== "all" ? activeCategory : undefined,
              search: searchQ,
              locationId: activeLocation || undefined,
            }),
          ]);

          if (myFetch !== dataFetchId.current) return;

          if (destResult.status === "fulfilled") {
            setDestinations(destResult.value.destinations || []);
          } else {
            console.error("Failed to load destinations:", destResult.reason);
            setDestinations([]);
          }

          if (pkgResult.status === "fulfilled") {
            const d = pkgResult.value as {
              packages?: Package[];
              hasMore?: boolean;
              categories?: string[];
              featuredPackageCount?: number;
              total?: number;
            };
            setPackages(d.packages || []);
            setHasMore(Boolean(d.hasMore));
            setFeaturedPackageCount(
              typeof d.featuredPackageCount === "number"
                ? d.featuredPackageCount
                : 0
            );
            setPackageTotal(typeof d.total === "number" ? d.total : null);
            if (Array.isArray(d.categories) && d.categories.length > 0) {
              setCategories(d.categories);
            }
          } else {
            console.error("Failed to load packages:", pkgResult.reason);
            setPackages([]);
            setHasMore(false);
            setLoadError("Packages could not load. Pull down to retry.");
            setPackageTotal(null);
          }
        }
      } catch (error) {
        console.error(error);
        captureException(error, { screen: "home", activeCategory, activeLocation });
        if (myFetch === dataFetchId.current) {
          setLoadError("Something went wrong. Please try again.");
        }
      } finally {
        if (myFetch === dataFetchId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [activeCategory, activeLocation, appliedSearch, debouncedSearch]
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const loadMorePackages = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    const epoch = dataFetchId.current;
    setLoadingMore(true);
    setLoadError(null);
    const searchQ =
      debouncedSearch.trim() || appliedSearch.trim()
        ? debouncedSearch.trim() || appliedSearch.trim()
        : undefined;
    try {
      const data = (await travelApi.getPackages({
        limit: PAGE_SIZE,
        offset: packages.length,
        category: activeCategory !== "all" ? activeCategory : undefined,
        search: searchQ,
        locationId: activeLocation || undefined,
      })) as { packages?: Package[]; hasMore?: boolean };
      if (epoch !== dataFetchId.current) return;
      setPackages((prev) => [...prev, ...(data.packages || [])]);
      setHasMore(Boolean(data.hasMore));
    } catch {
      if (epoch !== dataFetchId.current) return;
      setLoadError("Could not load more packages.");
    } finally {
      if (epoch === dataFetchId.current) {
        setLoadingMore(false);
      }
    }
  }, [
    hasMore,
    loadingMore,
    packages.length,
    activeCategory,
    activeLocation,
    appliedSearch,
    debouncedSearch,
  ]);

  const selectedDestinationLabel = useMemo(
    () => destinations.find((d) => d.id === activeLocation)?.label,
    [activeLocation, destinations]
  );

  const openPackage = useCallback(
    async (pkg: Package) => {
      const title = splitPackageName(pkg.tourPackageName ?? "Tour").title;
      const entry: LastViewedPackage = {
        id: pkg.id,
        slug: pkg.slug ?? null,
        title,
      };
      await setLastViewedPackage(entry);
      setLastViewed(entry);
      trackEvent("package_open", { packageId: pkg.id, source: "home" });
      router.push(`/packages/${pkg.slug || pkg.id}` as never);
    },
    [router]
  );

  const waPlanMessage = useMemo(
    () =>
      buildWhatsAppPlanMessage({
        search: appliedSearch || debouncedSearch.trim() || undefined,
        destination: selectedDestinationLabel,
        category: activeCategory,
      }),
    [appliedSearch, debouncedSearch, selectedDestinationLabel, activeCategory]
  );

  const showingLocationCarousels = useMemo(() => {
    const q =
      debouncedSearch.trim() || appliedSearch.trim()
        ? debouncedSearch.trim() || appliedSearch.trim()
        : undefined;
    return (
      !activeLocation &&
      activeCategory === "all" &&
      !q &&
      locationCarouselRows.length > 0
    );
  }, [
    activeLocation,
    activeCategory,
    debouncedSearch,
    appliedSearch,
    locationCarouselRows,
  ]);

  const syncDebouncedSearch = useCallback(() => {
    const term = debouncedSearch.trim();
    if (term !== appliedSearch) {
      setAppliedSearch(term);
    }
  }, [debouncedSearch, appliedSearch]);

  useEffect(() => {
    syncDebouncedSearch();
  }, [syncDebouncedSearch]);

  const submitSearch = useCallback(() => {
    const term = searchText.trim();
    setAppliedSearch(term);
    if (term) trackEvent("package_search", { queryLength: term.length });
  }, [searchText]);

  const recommendedPackages = useMemo(() => {
    if (!lastViewed) return [];
    const pool = showingLocationCarousels
      ? locationCarouselRows.flatMap((row) => row.packages)
      : packages;
    return pool.filter((pkg) => pkg.id !== lastViewed.id).slice(0, 3);
  }, [lastViewed, locationCarouselRows, packages, showingLocationCarousels]);

  const handleClear = () => {
    setSearchText("");
    setAppliedSearch("");
    setActiveCategory("all");
    setActiveLocation(null);
  };

  const handleRefresh = () => loadData(true);

  // ── Skeleton Loading State ──
  if (loading) {
    return (
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero skeleton */}
        <Animated.View
          style={[styles.skeletonHero, { paddingTop: insets.top + 8, opacity: skeletonOpacity }]}
        />

        {/* Section title skeleton */}
        <View style={{ paddingHorizontal: Spacing.lg, marginTop: 20, marginBottom: 4 }}>
          <Animated.View
            style={[
              { height: 10, width: 100, borderRadius: 5, backgroundColor: Colors.border, marginBottom: 6 },
              { opacity: skeletonOpacity },
            ]}
          />
          <Animated.View
            style={[
              { height: 18, width: 180, borderRadius: 6, backgroundColor: Colors.border },
              { opacity: skeletonOpacity },
            ]}
          />
        </View>

        {/* Skeleton: popular place tiles */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View
            style={{
              flexDirection: "row",
              paddingHorizontal: Spacing.lg,
              gap: Spacing.sm,
              paddingBottom: Spacing.sm,
            }}
          >
            {[1, 2, 3, 4, 5].map((i) => (
              <Animated.View
                key={i}
                style={[
                  {
                    width: POPULAR_PLACE_CARD_WIDTH,
                    height: POPULAR_PLACE_CARD_HEIGHT,
                    borderRadius: BorderRadius.lg,
                    backgroundColor: Colors.surfaceAlt,
                  },
                  { opacity: skeletonOpacity },
                ]}
              />
            ))}
          </View>
        </ScrollView>

        {/* Skeleton: horizontal package strips per destination */}
        {[1, 2].map((row) => (
          <View key={row} style={{ marginBottom: Spacing.lg }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingHorizontal: Spacing.lg,
                marginBottom: Spacing.sm,
              }}
            >
              <Animated.View
                style={[
                  {
                    height: 14,
                    width: 132,
                    borderRadius: 6,
                    backgroundColor: Colors.border,
                  },
                  { opacity: skeletonOpacity },
                ]}
              />
              <Animated.View
                style={[
                  {
                    height: 14,
                    width: 52,
                    borderRadius: 6,
                    backgroundColor: Colors.border,
                  },
                  { opacity: skeletonOpacity },
                ]}
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", paddingLeft: Spacing.lg }}>
                {[1, 2, 3].map((i) => (
                  <Animated.View
                    key={i}
                    style={[
                      {
                        width: PACKAGE_CARD_CAROUSEL_WIDTH,
                        height:
                          PACKAGE_CARD_CAROUSEL_WIDTH + 118 /* square thumb + body */,
                        marginRight: Spacing.sm,
                        borderRadius: BorderRadius.lg,
                        backgroundColor: Colors.surfaceAlt,
                      },
                      { opacity: skeletonOpacity },
                    ]}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        ))}

        <View style={{ height: insets.bottom + 32 }} />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      testID="home-screen"
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
      <StatusBar style="light" />
      {/* ── Hero ── */}
      <View style={styles.topHero}>
        <LinearGradient
          colors={[Colors.gradient1, Colors.gradient2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.brandCard, { paddingTop: insets.top + 8 }]}
        >
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <Ionicons name="airplane" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.brandLabel}>Aagam Holidays</Text>
              <Text style={styles.brandTitle}>Discover your next trip</Text>
              <Text style={styles.heroMetaInline} numberOfLines={1}>
                {featuredPackageCount > 0 ? `${formatFeaturedCount(featuredPackageCount)} tours` : "Tours"}
                {" · "}
                Verified
                {destinations.length > 0 ? ` · ${destinations.length} destinations` : ""}
              </Text>
            </View>
          </View>

          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color={Colors.textTertiary} />
            <TextInput
              testID="search-input"
              style={styles.searchInput}
              placeholder="Search packages or destinations"
              placeholderTextColor={Colors.textTertiary}
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={submitSearch}
              returnKeyType="search"
              accessibilityLabel="Search packages or destinations"
              accessibilityHint="Type to search for tour packages or destinations"
            />
            {searchText ? (
              <Pressable
                onPress={() => setSearchText("")}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
              </Pressable>
            ) : null}
            <View style={styles.searchDivider} />
            <Pressable
              onPress={submitSearch}
              accessibilityRole="button"
              accessibilityLabel="Submit search"
            >
              <Text style={styles.searchButtonText}>Search</Text>
            </Pressable>
          </View>
        </LinearGradient>
      </View>

      {loadError ? (
        <View style={styles.errorBanner}>
          <Ionicons name="warning-outline" size={18} color={Colors.error} />
          <Text style={styles.errorBannerText}>{loadError}</Text>
          <Pressable
            onPress={() => void loadData(true)}
            style={styles.errorRetry}
            accessibilityRole="button"
            accessibilityLabel="Retry loading"
          >
            <Text style={styles.errorRetryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {/* ── Active Filter Pill (above packages so results stay in context) ── */}
      {(appliedSearch || activeCategory !== "all" || activeLocation) && (
        <View style={styles.filterRow}>
          <View testID="filter-badge" style={styles.filterPill}>
            <Ionicons name="funnel" size={11} color={Colors.primary} />
            <Text style={styles.filterText} numberOfLines={1}>
              {[
                selectedDestinationLabel,
                activeCategory !== "all" ? activeCategory : null,
                appliedSearch ? `"${appliedSearch}"` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          </View>
          <Pressable style={styles.clearButton} onPress={handleClear}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </Pressable>
        </View>
      )}

      {/* ── Popular places (same-size tiles, directly above packages) ── */}
      <View style={styles.popularPlacesSection}>
        <SectionHeader
          title="Popular places"
          subtitle={
            destinations.length > 0
              ? `${destinations.length} destinations to explore`
              : undefined
          }
          action={
            destinations.length > 8
              ? {
                  label: "View all",
                  testID: "destinations-view-all",
                  onPress: () => router.push("/destinations" as Href),
                }
              : undefined
          }
        />
        <View style={styles.carouselWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={POPULAR_PLACE_CARD_WIDTH + Spacing.sm}
            snapToAlignment="start"
            contentContainerStyle={styles.destRow}
          >
            {destinations.slice(0, 8).map((dest) => {
              const active = activeLocation === dest.id;
              return (
                <Pressable
                  key={dest.id}
                  testID={`home-dest-${dest.id}`}
                  style={[styles.destChip, active && styles.destChipActive]}
                  onPress={() => setActiveLocation(active ? null : dest.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter by ${dest.label}`}
                  accessibilityHint="Toggle filter for packages in this destination"
                >
                  <View style={styles.destChipThumbWrap}>
                    {dest.imageUrl?.trim() ? (
                      <Image
                        source={{ uri: dest.imageUrl.trim() }}
                        style={styles.destChipThumb}
                        resizeMode="cover"
                      />
                    ) : (
                      <LinearGradient
                        colors={[Colors.gradient1, Colors.gradient2]}
                        style={styles.destChipThumb}
                      />
                    )}
                    {active ? (
                      <View style={styles.destChipThumbOverlay}>
                        <Ionicons name="checkmark" size={11} color="#fff" />
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.destChipInfo}>
                    <Text
                      style={[
                        styles.destChipLabel,
                        active && styles.destChipLabelActive,
                      ]}
                      numberOfLines={2}
                    >
                      {dest.label}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
          <LinearGradient
            colors={["rgba(250,249,248,0)", Colors.surface]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.edgeFade}
            pointerEvents="none"
          />
        </View>
      </View>

      {/* ── Package Cards ── */}
      <View style={styles.packagesSection}>
        <SectionHeader
          title={
            showingLocationCarousels
              ? "Packages by destination"
              : appliedSearch || activeCategory !== "all" || activeLocation
                ? "Matching packages"
                : "Trending packages"
          }
          subtitle={
            showingLocationCarousels
              ? packageTotal != null && packageTotal > 0
                ? `${packageTotal} ${packageTotal === 1 ? "package" : "packages"} · swipe each row`
                : "Explore tours grouped by destination"
              : packages.length > 0
                ? packageTotal != null
                  ? `Showing ${packages.length} of ${packageTotal} ${
                      packageTotal === 1 ? "package" : "packages"
                    }`
                  : `${packages.length} ${packages.length === 1 ? "package" : "packages"}`
                : !loadError &&
                    !appliedSearch &&
                    activeCategory === "all" &&
                    !activeLocation
                  ? "Tap a place above or pick a category below"
                  : undefined
          }
        />

        <View testID="package-list">
          {showingLocationCarousels ? (
            <>
              {locationCarouselRows.map((row) => (
                <View
                  key={row.id}
                  style={styles.locationCarouselBlock}
                  testID={`home-location-carousel-${row.id}`}
                >
                  <View style={styles.locationCarouselHeader}>
                    <Text style={styles.locationCarouselTitle} numberOfLines={1}>
                      {row.label}
                    </Text>
                    <Pressable
                      onPress={() => setActiveLocation(row.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`See all packages in ${row.label}`}
                      accessibilityHint="Shows a full list filtered to this destination"
                      hitSlop={8}
                    >
                      <Text style={styles.seeAllText}>See all</Text>
                    </Pressable>
                  </View>
                  <View style={styles.carouselWrap}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      decelerationRate="fast"
                      snapToInterval={
                        PACKAGE_CARD_CAROUSEL_WIDTH + Spacing.sm
                      }
                      snapToAlignment="start"
                      contentContainerStyle={styles.carouselPkgRow}
                    >
                      {row.packages.map((pkg, index) => (
                        <PackageCard
                          key={pkg.id}
                          variant="carousel"
                          testID={`package-card-${row.id}-${index}`}
                          pkg={pkg}
                          onPress={() => void openPackage(pkg)}
                        />
                      ))}
                    </ScrollView>
                  </View>
                </View>
              ))}
            </>
          ) : packages.length > 0 ? (
            packages.map((pkg, index) => (
              <PackageCard
                key={pkg.id}
                testID={`package-card-${index}`}
                pkg={pkg}
                onPress={() => void openPackage(pkg)}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <LinearGradient
                colors={[Colors.gradient1, Colors.gradient2]}
                style={styles.emptyIcon}
              >
                <Ionicons name="search-outline" size={28} color="#fff" />
              </LinearGradient>
              <Text style={styles.emptyTitle}>
                {loadError ? "Could not load packages" : "No packages found"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {loadError
                  ? "Use Retry above or pull down to refresh."
                  : appliedSearch ||
                      activeCategory !== "all" ||
                      activeLocation
                    ? "Try a different search or clear the filters."
                    : "Featured packages are unavailable right now. Please try again later."}
              </Text>
            </View>
          )}
          {!showingLocationCarousels && hasMore && packages.length > 0 ? (
            <Pressable
              testID="home-load-more-packages"
              style={[styles.loadMoreBtn, loadingMore ? styles.loadMoreDisabled : null]}
              onPress={() => void loadMorePackages()}
              disabled={loadingMore}
              accessibilityRole="button"
              accessibilityLabel="Load more packages"
            >
              {loadingMore ? (
                <ActivityIndicator color={Colors.primary} />
              ) : (
                <Text style={styles.loadMoreText}>Load more</Text>
              )}
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* ── Partner + shortcuts (below packages so tours stay above the fold) ── */}
      {isAssociate ? (
        <Pressable
          testID="associate-inquiries-banner"
          accessibilityRole="button"
          accessibilityLabel="Open associate inquiries"
          accessibilityHint="Create and manage inquiries linked to your partner account"
          style={styles.associateBannerCompact}
          onPress={() => router.push("/associate/inquiries")}
        >
          <View style={styles.associateBannerIconCompact}>
            <Ionicons name="briefcase" size={15} color={Colors.primary} />
          </View>
          <Text style={styles.associateBannerTitleCompact}>Partner inquiries</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
        </Pressable>
      ) : null}

      {showPersonalShortcuts ? (
        <View style={styles.shortcutsRowCompact}>
          <Pressable
            testID="home-shortcut-enquiries"
            style={styles.shortcutChipCompact}
            onPress={() => router.push("/profile/inquiries")}
            accessibilityRole="button"
            accessibilityLabel="Open my enquiries"
            accessibilityHint="View enquiries you submitted from the app"
          >
            <Ionicons name="mail-outline" size={15} color={Colors.primary} />
            <Text style={styles.shortcutChipTextCompact}>Enquiries</Text>
          </Pressable>
          <Pressable
            testID="home-shortcut-trips"
            style={styles.shortcutChipCompact}
            onPress={() => router.push("/chat")}
            accessibilityRole="button"
            accessibilityLabel="Open trips and chat"
            accessibilityHint="View trip groups and messages"
          >
            <View style={styles.shortcutIconWrap}>
              <Ionicons name="chatbubbles-outline" size={15} color={Colors.primary} />
              {unreadChatTotal > 0 ? (
                <View style={styles.shortcutBadge}>
                  <Text style={styles.shortcutBadgeText}>
                    {unreadChatTotal > 99 ? "99+" : unreadChatTotal}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.shortcutChipTextCompact}>Trips</Text>
          </Pressable>
          {lastViewed ? (
            <Pressable
              testID="home-shortcut-continue"
              style={styles.shortcutChipCompact}
              onPress={() =>
                router.push(`/packages/${lastViewed.slug || lastViewed.id}` as never)
              }
              accessibilityRole="button"
              accessibilityLabel="Continue last viewed package"
            >
              <Ionicons name="play-circle-outline" size={15} color={Colors.primary} />
              <Text style={styles.shortcutChipTextCompact} numberOfLines={1}>
                Continue
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {recommendedPackages.length > 0 ? (
        <View style={styles.recommendationSection}>
          <SectionHeader
            title="Recommended next"
            subtitle="Based on your recent browsing"
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselPkgRow}
          >
            {recommendedPackages.map((pkg, index) => (
              <PackageCard
                key={pkg.id}
                variant="carousel"
                testID={`recommended-package-${index}`}
                pkg={pkg}
                onPress={() => void openPackage(pkg)}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* ── Tour Categories ── */}
      <View style={styles.section}>
        <SectionHeader title="Tour categories" />
        <ScrollView
          testID="category-chips"
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}
        >
          {["all", ...categories].map((cat) => {
            const active = cat === activeCategory;
            return (
              <Pressable
                key={cat}
                testID={`category-chip-${cat}`}
                onPress={() => setActiveCategory(cat)}
                style={[styles.catChip, active && styles.catChipActive]}
              >
                <Text style={[styles.catChipText, active && styles.catChipTextActive]}>
                  {cat === "all" ? "All packages" : cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Testimonials ── */}
      <View style={styles.section}>
        <SectionHeader title="What travellers say" subtitle="Stories from real trips" />
        <View style={styles.carouselWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={TESTIMONIAL_CARD_WIDTH + Spacing.sm}
            snapToAlignment="start"
            contentContainerStyle={styles.testimonialRow}
          >
            {testimonials.map((item) => (
              <View key={item.name} style={styles.testimonialCard}>
                <View style={styles.quoteIcon}>
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color={Colors.primary} />
                </View>
                <View style={styles.starRow}>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Ionicons key={index} name="star" size={12} color="#f5b400" />
                  ))}
                </View>
                <Text style={styles.testimonialQuote} numberOfLines={4}>
                  {item.quote}
                </Text>
                <View style={styles.testimonialFooter}>
                  <LinearGradient colors={item.accent} style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.initials}</Text>
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.testimonialName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.testimonialTrip} numberOfLines={1}>
                      {item.trip}
                    </Text>
                    <Text style={styles.testimonialLocation}>{item.location}</Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
          <LinearGradient
            colors={["rgba(250,249,248,0)", Colors.surface]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.edgeFade}
            pointerEvents="none"
          />
        </View>
      </View>

      {/* ── Why Travel With Us ── */}
      <View style={styles.section}>
        <SectionHeader title="The Aagam difference" />
        <View style={styles.whyGrid}>
          {whyUs.map((item) => (
            <View key={item.title} style={styles.whyCard}>
              <View style={styles.whyIconWrap}>
                <Ionicons name={item.icon} size={20} color={Colors.primary} />
              </View>
              <Text style={styles.whyTitle}>{item.title}</Text>
              <Text style={styles.whyText} numberOfLines={3}>
                {item.text}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── CTA ── */}
      <View style={styles.section}>
        <LinearGradient
          colors={[Colors.gradient1, Colors.gradient2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ctaCard}
        >
          <View style={styles.ctaHeader}>
            <View style={styles.ctaIcon}>
              <Ionicons name="chatbubbles" size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ctaTitle}>Need a custom itinerary?</Text>
              <Text style={styles.ctaSubtitle}>
                We can tailor a trip around your dates, budget and pace.
              </Text>
            </View>
          </View>
          <View style={styles.ctaButtons}>
            <Pressable
              style={styles.ctaButton}
              onPress={() => Linking.openURL(`tel:${PHONE_NUMBER}`)}
            >
              <Ionicons name="call" size={16} color={Colors.primary} />
              <Text style={styles.ctaButtonText}>Call Us</Text>
            </Pressable>
            <Pressable
              style={[styles.ctaButton, styles.ctaButtonWa]}
              onPress={() =>
                Linking.openURL(
                  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waPlanMessage)}`
                )
              }
            >
              <Ionicons name="logo-whatsapp" size={16} color="#fff" />
              <Text style={[styles.ctaButtonText, { color: "#fff" }]}>WhatsApp</Text>
            </Pressable>
          </View>
        </LinearGradient>
      </View>

      <View style={{ height: insets.bottom + 16 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },

  // ── Skeleton ──
  skeletonHero: {
    height: 148,
    backgroundColor: Colors.surfaceAlt,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },

  // ── Hero ──
  topHero: { marginBottom: 4 },
  brandCard: {
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
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
    fontSize: 11,
    color: "rgba(255,255,255,0.90)",
    textTransform: "uppercase",
    letterSpacing: 1.4,
    fontWeight: "700",
  },
  brandTitle: {
    fontSize: FontSize.xl,
    color: "#fff",
    fontWeight: "800",
    marginTop: 2,
    lineHeight: 26,
  },
  heroMetaInline: {
    fontSize: 11,
    color: "rgba(255,255,255,0.72)",
    marginTop: 4,
    fontWeight: "600",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: FontSize.md, color: Colors.text },
  searchDivider: {
    width: 1,
    height: 16,
    backgroundColor: Colors.border,
    marginHorizontal: 2,
  },
  searchButtonText: {
    fontSize: FontSize.sm,
    fontWeight: "800",
    color: Colors.primary,
    paddingHorizontal: 4,
  },

  associateBannerCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  associateBannerIconCompact: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.primaryBg,
    justifyContent: "center",
    alignItems: "center",
  },
  associateBannerTitleCompact: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.text,
  },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  errorBannerText: { flex: 1, fontSize: FontSize.sm, color: Colors.text, fontWeight: "600" },
  errorRetry: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  errorRetryText: { fontSize: FontSize.sm, fontWeight: "800", color: "#fff" },

  shortcutsRowCompact: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xs,
    marginBottom: 2,
  },
  shortcutChipCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  shortcutChipTextCompact: {
    fontSize: FontSize.xs + 1,
    fontWeight: "700",
    color: Colors.text,
    maxWidth: 88,
  },
  shortcutIconWrap: { position: "relative" },
  shortcutBadge: {
    position: "absolute",
    top: -8,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  shortcutBadgeText: { fontSize: 9, fontWeight: "800", color: "#fff" },

  loadMoreBtn: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  loadMoreDisabled: { opacity: 0.6 },
  loadMoreText: { fontSize: FontSize.md, fontWeight: "800", color: Colors.primary },

  // ── Sections ──
  popularPlacesSection: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  /** Packages directly below Popular places */
  packagesSection: { paddingTop: Spacing.sm, paddingBottom: 0 },
  recommendationSection: { paddingTop: Spacing.md, paddingBottom: Spacing.xs },
  locationCarouselBlock: { marginBottom: Spacing.lg },
  locationCarouselHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  locationCarouselTitle: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: "800",
    color: Colors.text,
  },
  seeAllText: {
    fontSize: FontSize.sm,
    fontWeight: "800",
    color: Colors.primary,
  },
  carouselPkgRow: {
    paddingLeft: Spacing.lg,
    paddingBottom: 2,
    paddingRight: Spacing.lg,
  },
  section: { paddingTop: Spacing.lg, paddingBottom: 0 },
  carouselWrap: { position: "relative" },
  edgeFade: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 28,
  },

  // ── Popular places (fixed-size vertical tiles) ──
  destRow: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: 2,
  },
  destChip: {
    width: POPULAR_PLACE_CARD_WIDTH,
    height: POPULAR_PLACE_CARD_HEIGHT,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadows.light,
  },
  destChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  destChipThumbWrap: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.sm,
    overflow: "hidden",
    position: "relative",
  },
  destChipThumb: { width: "100%", height: "100%" },
  destChipThumbOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(232, 97, 45, 0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  destChipInfo: {
    marginTop: Spacing.sm,
    alignItems: "center",
    width: "100%",
    justifyContent: "center",
  },
  destChipLabel: {
    fontSize: FontSize.xs + 1,
    fontWeight: "700",
    color: Colors.text,
    textAlign: "center",
    width: "100%",
    lineHeight: 15,
  },
  destChipLabelActive: { color: Colors.primary },

  // ── Categories ──
  catRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  catChip: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catChipText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: "600" },
  catChipTextActive: { color: "#fff", fontWeight: "800" },

  // ── Filter pill ──
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
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
  filterText: { flex: 1, fontSize: FontSize.sm, color: Colors.primary, fontWeight: "700" },
  clearButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.background,
  },
  clearButtonText: { fontSize: FontSize.sm, fontWeight: "800", color: Colors.primary },

  // ── Empty state ──
  emptyState: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
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
  emptyTitle: { fontSize: FontSize.xl, fontWeight: "800", color: Colors.text },
  emptySubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },

  // ── CTA Card ──
  ctaCard: {
    borderRadius: BorderRadius.xl,
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
  },
  ctaHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  ctaIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  ctaTitle: { fontSize: FontSize.lg, fontWeight: "800", color: "#fff", marginBottom: 4 },
  ctaSubtitle: {
    fontSize: FontSize.sm,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  ctaButtons: { flexDirection: "row", gap: Spacing.sm, width: "100%" },
  ctaButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderRadius: BorderRadius.lg,
    paddingVertical: 11,
  },
  ctaButtonWa: { backgroundColor: "#25D366" },
  ctaButtonText: { fontSize: FontSize.sm, fontWeight: "800", color: Colors.primary },

  // ── Testimonials ──
  testimonialRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  testimonialCard: {
    width: 240,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    ...Shadows.light,
  },
  quoteIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: Colors.primaryBg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  starRow: { flexDirection: "row", gap: 2, marginBottom: 8 },
  testimonialQuote: {
    fontSize: FontSize.sm,
    color: Colors.text,
    lineHeight: 19,
    minHeight: 76,
    marginBottom: 10,
  },
  testimonialFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  testimonialName: { fontSize: FontSize.sm, fontWeight: "800", color: Colors.text },
  testimonialTrip: { fontSize: 11, color: Colors.primary, fontWeight: "700" },
  testimonialLocation: { fontSize: 10, color: Colors.textSecondary },

  // ── Why Grid ──
  whyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  whyCard: {
    width: "48%",
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    minHeight: 132,
    ...Shadows.light,
  },
  whyIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: Colors.primaryBg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  whyTitle: { fontSize: FontSize.sm, fontWeight: "800", color: Colors.text, marginBottom: 4 },
  whyText: { fontSize: 11, color: Colors.textSecondary, lineHeight: 16 },
});
