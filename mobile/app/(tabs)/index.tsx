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
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Colors,
  Spacing,
  FontSize,
  BorderRadius,
  Shadows,
} from "@/constants/theme";
import { travelApi } from "@/lib/api";
import { useDebounce } from "@/hooks/useDebounce";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { splitPackageName } from "@/lib/rich-text";
import {
  WHATSAPP_BUSINESS_NUMBER,
  WHATSAPP_BUSINESS_NUMBER_E164,
} from "@/constants/whatsapp";

const DEST_CHIP_WIDTH = 188;
const TESTIMONIAL_CARD_WIDTH = 240;

const PHONE_NUMBER = WHATSAPP_BUSINESS_NUMBER_E164;
const WHATSAPP_NUMBER = WHATSAPP_BUSINESS_NUMBER;

const highlights = [
  { value: "10K+", label: "Happy Travellers", icon: "people-outline" as const },
  { value: "200+", label: "Tour Packages", icon: "briefcase-outline" as const },
  { value: "4.8★", label: "Avg. Rating", icon: "star-outline" as const },
];

const whyUs = [
  {
    icon: "sparkles-outline" as const,
    title: "Handcrafted trips",
    text: "Each itinerary is planned to feel personal, not generic.",
  },
  {
    icon: "shield-checkmark-outline" as const,
    title: "Safe travel",
    text: "We keep logistics, safety and support tightly managed.",
  },
  {
    icon: "swap-horizontal-outline" as const,
    title: "Custom plans",
    text: "We can tweak packages to match dates, pace and budget.",
  },
  {
    icon: "chatbubbles-outline" as const,
    title: "Always reachable",
    text: "Call or WhatsApp us whenever you need help.",
  },
];

const testimonials = [
  {
    initials: "PS",
    name: "Priya Sharma",
    trip: "Kerala Backwaters & Munnar",
    location: "Mumbai",
    quote:
      "Absolutely magical experience. Every detail was arranged beautifully and the trip felt effortless from start to finish.",
    accent: ["#ff9f43", "#ff6b6b"] as [string, string],
  },
  {
    initials: "RM",
    name: "Rahul & Neha",
    trip: "Rajasthan Heritage Tour",
    location: "Ahmedabad",
    quote:
      "Super organised and smooth. The itinerary balanced sightseeing and rest perfectly, which made the whole journey enjoyable.",
    accent: ["#8e7dff", "#5f6cff"] as [string, string],
  },
  {
    initials: "AV",
    name: "Anjali & Vikram",
    trip: "Goa Honeymoon Package",
    location: "Delhi",
    quote:
      "The team took care of everything and made the trip feel special. We just showed up and enjoyed every moment.",
    accent: ["#ff6fae", "#ff7b72"] as [string, string],
  },
];

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

const skelStyles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background,
    overflow: "hidden",
    ...Shadows.medium,
  },
  image: {
    width: "100%",
    height: 210,
    backgroundColor: Colors.surfaceAlt,
  },
  body: { padding: Spacing.md + 2 },
  line: { height: 14, borderRadius: 6, backgroundColor: Colors.border },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  pill: { height: 12, borderRadius: 6, backgroundColor: Colors.border },
});

// ─── Package Card ─────────────────────────────────────────────────────────────
function PackageCard({ pkg, onPress }: { pkg: Package; onPress: () => void }) {
  const imageUrl = pkg.images?.[0]?.url;
  const [imageFailed, setImageFailed] = useState(false);
  const displayPrice = pkg.pricePerAdult || pkg.price;
  const formattedPrice = displayPrice
    ? `₹${Number(displayPrice).toLocaleString("en-IN")}`
    : null;
  const nameParts = useMemo(
    () => splitPackageName(pkg.tourPackageName ?? "Tour Package"),
    [pkg.tourPackageName]
  );

  return (
    <Pressable
      style={pkgCardStyles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${nameParts.title} package`}
    >
      {/* ── Image + Overlays ── */}
      <View style={pkgCardStyles.imageWrap}>
        {imageUrl && !imageFailed ? (
          <Image
            source={{ uri: imageUrl }}
            style={pkgCardStyles.image}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <View style={[pkgCardStyles.image, pkgCardStyles.imageFallback]}>
            <Ionicons name="image-outline" size={32} color={Colors.textTertiary} />
            <Text style={pkgCardStyles.imageFallbackText} numberOfLines={1}>
              {pkg.location?.label || "Photo coming soon"}
            </Text>
          </View>
        )}

        {/* Bottom gradient for location text legibility */}
        {imageUrl && !imageFailed ? (
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.62)"]}
            style={pkgCardStyles.imageGradient}
            pointerEvents="none"
          />
        ) : null}

        {/* Duration badge — top left */}
        {pkg.numDaysNight ? (
          <View style={pkgCardStyles.durationBadge}>
            <Ionicons name="time-outline" size={10} color="#fff" />
            <Text style={pkgCardStyles.durationText}>{pkg.numDaysNight}</Text>
          </View>
        ) : null}

        {/* Category badge — top right */}
        {pkg.tourCategory ? (
          <View style={pkgCardStyles.categoryBadge}>
            <Text style={pkgCardStyles.categoryText}>{pkg.tourCategory}</Text>
          </View>
        ) : null}

        {/* Location — bottom of image (only when image renders) */}
        {pkg.location?.label && imageUrl && !imageFailed ? (
          <View style={pkgCardStyles.locationRow}>
            <Ionicons name="location" size={11} color="rgba(255,255,255,0.92)" />
            <Text style={pkgCardStyles.locationText} numberOfLines={1}>
              {pkg.location.label}
            </Text>
          </View>
        ) : null}
      </View>

      {/* ── Card Body ── */}
      <View style={pkgCardStyles.body}>
        <Text style={pkgCardStyles.name} numberOfLines={2}>
          {nameParts.title}
        </Text>
        {nameParts.subtitle ? (
          <Text style={pkgCardStyles.subtitle} numberOfLines={1}>
            {nameParts.subtitle}
          </Text>
        ) : null}

        <View style={pkgCardStyles.footer}>
          {/* Rating */}
          <View style={pkgCardStyles.ratingRow}>
            <Ionicons name="star" size={12} color="#f59e0b" />
            <Text style={pkgCardStyles.ratingText}>4.8</Text>
            <Text style={pkgCardStyles.ratingLabel}>· Highly Rated</Text>
          </View>

          {/* Price */}
          {formattedPrice ? (
            <View style={pkgCardStyles.priceBlock}>
              <Text style={pkgCardStyles.price}>{formattedPrice}</Text>
              <Text style={pkgCardStyles.priceUnit}>/person</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const pkgCardStyles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background,
    overflow: "hidden",
    ...Shadows.medium,
  },
  imageWrap: { position: "relative" },
  image: { width: "100%", height: 210 },
  imageFallback: {
    backgroundColor: Colors.surfaceAlt,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  imageFallbackText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: "500",
    paddingHorizontal: Spacing.lg,
    textAlign: "center",
  },
  imageGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  durationBadge: {
    position: "absolute",
    top: Spacing.md,
    left: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.48)",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  durationText: {
    fontSize: FontSize.xs,
    color: "#fff",
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  categoryBadge: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  categoryText: {
    fontSize: FontSize.xs,
    color: Colors.text,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  locationRow: {
    position: "absolute",
    bottom: Spacing.sm,
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: FontSize.xs,
    color: "rgba(255,255,255,0.92)",
    fontWeight: "600",
    flex: 1,
  },
  body: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: 8,
  },
  name: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.text,
    lineHeight: 22,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: "500",
    marginTop: -2,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingText: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.text,
  },
  ratingLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: "500",
  },
  priceBlock: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  price: {
    fontSize: FontSize.lg,
    fontWeight: "800",
    color: Colors.primary,
  },
  priceUnit: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
});

// ─── Home Screen ──────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeLocation, setActiveLocation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const debouncedSearch = useDebounce(searchText, 300);

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
          : ([
              ...new Set(
                nextPackages
                  .map((pkg: Package) => pkg.tourCategory)
                  .filter(Boolean)
              ),
            ] as string[])
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
            search: debouncedSearch || appliedSearch || undefined,
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
    [activeCategory, activeLocation, appliedSearch, debouncedSearch, loadPackages]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedDestinationLabel = useMemo(
    () => destinations.find((d) => d.id === activeLocation)?.label,
    [activeLocation, destinations]
  );

  const handleSearch = useCallback(() => {
    const term = debouncedSearch.trim();
    if (term !== appliedSearch) {
      setAppliedSearch(term);
    }
  }, [debouncedSearch, appliedSearch]);

  useEffect(() => {
    handleSearch();
  }, [handleSearch]);

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
          style={[styles.skeletonHero, { paddingTop: insets.top + 20, opacity: skeletonOpacity }]}
        />

        {/* Trust bar skeleton */}
        <View style={styles.skeletonTrustRow}>
          {[1, 2, 3].map((i) => (
            <Animated.View
              key={i}
              style={[styles.skeletonTrustCard, { opacity: skeletonOpacity }]}
            />
          ))}
        </View>

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

        {/* Skeleton package cards */}
        {[1, 2, 3].map((i) => (
          <View key={i} style={skelStyles.card}>
            <View style={skelStyles.image} />
            <View style={skelStyles.body}>
              <View style={[skelStyles.line, { width: "78%" }]} />
              <View style={[skelStyles.line, { width: "52%", marginTop: 6 }]} />
              <View style={skelStyles.footer}>
                <View style={[skelStyles.pill, { width: 60 }]} />
                <View style={[skelStyles.pill, { width: 80 }]} />
              </View>
            </View>
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
      {/* ── Hero ── */}
      <View style={styles.topHero}>
        <LinearGradient
          colors={[Colors.gradient1, Colors.gradient2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.brandCard, { paddingTop: insets.top + 20 }]}
        >
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <Ionicons name="airplane" size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.brandLabel}>Aagam Holidays</Text>
              <Text style={styles.brandTitle}>Discover your{"\n"}next trip</Text>
              <Text style={styles.brandSubtitle}>200+ handcrafted tours across India</Text>
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
              onPress={handleSearch}
              accessibilityRole="button"
              accessibilityLabel="Submit search"
            >
              <Text style={styles.searchButtonText}>Search</Text>
            </Pressable>
          </View>
        </LinearGradient>
      </View>

      {/* ── Trust Bar ── */}
      <View style={styles.trustBar}>
        <View style={styles.trustItem}>
          <View style={styles.trustIconWrap}>
            <Ionicons name="star" size={14} color={Colors.text} />
          </View>
          <View>
            <Text style={styles.trustValue}>4.8 Rated</Text>
            <Text style={styles.trustSub}>10K+ reviews</Text>
          </View>
        </View>

        <View style={styles.trustDivider} />

        <View style={styles.trustItem}>
          <View style={styles.trustIconWrap}>
            <Ionicons name="shield-checkmark" size={14} color={Colors.text} />
          </View>
          <View>
            <Text style={styles.trustValue}>100% Safe</Text>
            <Text style={styles.trustSub}>Verified tours</Text>
          </View>
        </View>

        <View style={styles.trustDivider} />

        <View style={styles.trustItem}>
          <View style={styles.trustIconWrap}>
            <Ionicons name="people" size={14} color={Colors.text} />
          </View>
          <View>
            <Text style={styles.trustValue}>10K+ Happy</Text>
            <Text style={styles.trustSub}>Travellers</Text>
          </View>
        </View>
      </View>

      {/* ── Popular Destinations ── */}
      <View style={styles.section}>
        <SectionHeader
          title="Popular places"
          subtitle={destinations.length > 0 ? `${destinations.length} destinations to explore` : undefined}
        />
        <View style={styles.carouselWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={DEST_CHIP_WIDTH + Spacing.sm}
          snapToAlignment="start"
          contentContainerStyle={styles.destRow}
        >
          {destinations.slice(0, 8).map((dest) => {
            const active = activeLocation === dest.id;
            return (
              <Pressable
                key={dest.id}
                style={[styles.destChip, active && styles.destChipActive]}
                onPress={() => setActiveLocation(active ? null : dest.id)}
              >
                {/* Thumbnail */}
                <View style={styles.destChipThumbWrap}>
                  {dest.imageUrl ? (
                    <Image source={{ uri: dest.imageUrl }} style={styles.destChipThumb} />
                  ) : (
                    <LinearGradient
                      colors={[Colors.gradient1, Colors.gradient2]}
                      style={styles.destChipThumb}
                    />
                  )}
                  {active && (
                    <View style={styles.destChipThumbOverlay}>
                      <Ionicons name="checkmark" size={11} color="#fff" />
                    </View>
                  )}
                </View>

                {/* Label + count */}
                <View style={styles.destChipInfo}>
                  <Text
                    style={[styles.destChipLabel, active && styles.destChipLabelActive]}
                    numberOfLines={1}
                  >
                    {dest.label}
                  </Text>
                  <Text style={styles.destChipMeta}>
                    {dest._count?.tourPackages || 0} pkg
                    {(dest._count?.tourPackages || 0) === 1 ? "" : "s"}
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

      {/* ── Active Filter Pill ── */}
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

      {/* ── Package Cards ── */}
      <View style={styles.section}>
        <SectionHeader
          title={
            appliedSearch || activeCategory !== "all" || activeLocation
              ? "Matching packages"
              : "Trending packages"
          }
          subtitle={
            packages.length > 0
              ? `${packages.length} ${packages.length === 1 ? "package" : "packages"}`
              : undefined
          }
        />

        <View testID="package-list">
          {packages.length > 0 ? (
            packages.map((pkg, index) => (
              <View key={pkg.id} testID={`package-card-${index}`}>
                <PackageCard
                  pkg={pkg}
                  onPress={() => router.push(`/packages/${pkg.slug || pkg.id}`)}
                />
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <LinearGradient
                colors={[Colors.gradient1, Colors.gradient2]}
                style={styles.emptyIcon}
              >
                <Ionicons name="search-outline" size={28} color="#fff" />
              </LinearGradient>
              <Text style={styles.emptyTitle}>No packages found</Text>
              <Text style={styles.emptySubtitle}>
                Try a different search or clear the filters.
              </Text>
            </View>
          )}
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

      <View style={{ height: insets.bottom + 16 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },

  // ── Skeleton ──
  skeletonHero: {
    height: 220,
    backgroundColor: Colors.surfaceAlt,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  skeletonTrustRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
  skeletonTrustCard: {
    flex: 1,
    height: 72,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.border,
  },

  // ── Hero ──
  topHero: { marginBottom: Spacing.sm },
  brandCard: {
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  brandIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
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
    fontSize: FontSize.xxxl,
    color: "#fff",
    fontWeight: "800",
    marginTop: 3,
    lineHeight: 32,
  },
  brandSubtitle: {
    fontSize: FontSize.sm,
    color: "rgba(255,255,255,0.75)",
    marginTop: 5,
    fontWeight: "500",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
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

  // ── Trust Bar ──
  trustBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    ...Shadows.light,
  },
  trustItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
  },
  trustIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: "center",
    alignItems: "center",
  },
  trustValue: {
    fontSize: FontSize.xs + 1,
    fontWeight: "700",
    color: Colors.text,
    lineHeight: 16,
  },
  trustSub: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: "500",
    lineHeight: 14,
  },
  trustDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.borderSubtle,
  },

  // ── Sections ──
  section: { paddingTop: Spacing.lg, paddingBottom: 0 },
  carouselWrap: { position: "relative" },
  edgeFade: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 28,
  },

  // ── Destination Chips ──
  destRow: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    paddingBottom: 2,
  },
  destChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.full,
    paddingRight: 14,
    paddingLeft: 5,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadows.light,
  },
  destChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  destChipThumbWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: "hidden",
    position: "relative",
  },
  destChipThumb: { width: "100%", height: "100%" },
  destChipThumbOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(232, 97, 45, 0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  destChipInfo: { gap: 1 },
  destChipLabel: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.text,
    maxWidth: 90,
  },
  destChipLabelActive: { color: Colors.primary },
  destChipMeta: {
    fontSize: 10,
    color: Colors.textTertiary,
    fontWeight: "500",
  },

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
