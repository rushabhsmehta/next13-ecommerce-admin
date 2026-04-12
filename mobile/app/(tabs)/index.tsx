import { useEffect, useState, useCallback } from "react";
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
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from "@/constants/theme";
import { travelApi } from "@/lib/api";

const PHONE_NUMBER = "+919724444701";
const WHATSAPP_NUMBER = "919724444701";

export default function HomeScreen() {
  const router = useRouter();
  const [destinations, setDestinations] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [destResult, pkgResult] = await Promise.allSettled([
        travelApi.getDestinations(),
        travelApi.getPackages({ limit: 6 }),
      ]);
      if (destResult.status === "fulfilled")
        setDestinations(destResult.value.destinations || []);
      if (pkgResult.status === "fulfilled") {
        const pkgs = pkgResult.value.packages || [];
        setPackages(pkgs);
        setCategories([...new Set(pkgs.map((p: any) => p.tourCategory).filter(Boolean))] as string[]);
      } else {
        console.error("Failed to load packages:", pkgResult.reason);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearch = () => {
    if (searchQuery.trim())
      router.push({ pathname: "/(tabs)/explore", params: { q: searchQuery.trim() } });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Discovering amazing places…</Text>
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
          onRefresh={() => { setRefreshing(true); fetchData(); }}
          tintColor={Colors.primary}
        />
      }
    >
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <LinearGradient
        colors={[Colors.gradient1, Colors.gradient2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.heroBrand}>AAGAM HOLIDAYS</Text>
        <Text style={styles.heroTitle}>Discover Your{"\n"}Next Adventure</Text>
        <Text style={styles.heroSubtitle}>Handcrafted tours to stunning destinations</Text>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Where do you want to go?"
            placeholderTextColor={Colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
            </Pressable>
          ) : null}
        </View>
      </LinearGradient>

      {/* Curved white ledge */}
      <View style={styles.ledge} />

      {/* ── Stats ────────────────────────────────────────────────── */}
      <View style={styles.statsRow}>
        {[
          { icon: "map" as const,       label: "Destinations",   value: `${destinations.length}+` },
          { icon: "briefcase" as const, label: "Packages",       value: "50+" },
          { icon: "heart" as const,     label: "Happy Clients",  value: "10K+" },
        ].map((s) => (
          <View key={s.label} style={styles.statCard}>
            <LinearGradient colors={[Colors.gradient1, Colors.gradient2]} style={styles.statIcon}>
              <Ionicons name={s.icon} size={16} color="#fff" />
            </LinearGradient>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Trending Packages ─────────────────────────────────────── */}
      {packages.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEye}>FEATURED</Text>
              <Text style={styles.sectionTitle}>Trending Packages</Text>
            </View>
            <Pressable style={styles.seeAll} onPress={() => router.push("/(tabs)/explore")}>
              <Text style={styles.seeAllText}>See All</Text>
              <Ionicons name="arrow-forward" size={13} color={Colors.primary} />
            </Pressable>
          </View>

          {packages.map((pkg) => (
            <Pressable
              key={pkg.id}
              style={styles.pkgCard}
              onPress={() => router.push(`/packages/${pkg.slug || pkg.id}`)}
            >
              {/* Full-bleed image */}
              {pkg.images?.[0]?.url ? (
                <Image source={{ uri: pkg.images[0].url }} style={styles.pkgImage} />
              ) : (
                <LinearGradient
                  colors={[Colors.gradient1, Colors.gradient2]}
                  style={styles.pkgImage}
                />
              )}

              {/* Gradient overlay */}
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.22)", "rgba(0,0,0,0.82)"]}
                locations={[0, 0.3, 1]}
                style={styles.pkgOverlay}
              />

              {/* Top badges */}
              <View style={styles.pkgTop}>
                {pkg.numDaysNight ? (
                  <View style={styles.durationPill}>
                    <Ionicons name="time-outline" size={11} color="#fff" />
                    <Text style={styles.durationPillText}>{pkg.numDaysNight}</Text>
                  </View>
                ) : null}
                {pkg.tourCategory ? (
                  <View style={styles.categoryPill}>
                    <Text style={styles.categoryPillText}>{pkg.tourCategory}</Text>
                  </View>
                ) : null}
              </View>

              {/* Bottom content */}
              <View style={styles.pkgBottom}>
                <View style={styles.pkgBottomLeft}>
                  <View style={styles.locRow}>
                    <Ionicons name="location-sharp" size={11} color="rgba(255,255,255,0.75)" />
                    <Text style={styles.locText}>{pkg.location?.label || ""}</Text>
                  </View>
                  <Text style={styles.pkgTitle} numberOfLines={2}>{pkg.tourPackageName || "Tour Package"}</Text>
                  {pkg._count?.itineraries > 0 && (
                    <View style={styles.itinRow}>
                      <Ionicons name="map-outline" size={11} color="rgba(255,255,255,0.7)" />
                      <Text style={styles.itinText}>{pkg._count.itineraries} day itinerary</Text>
                    </View>
                  )}
                </View>
                <View style={styles.pkgBottomRight}>
                  <View style={styles.priceBadge}>
                    {pkg.pricePerAdult ? (
                      <>
                        <Text style={styles.priceFrom}>from</Text>
                        <Text style={styles.priceValue}>₹{Number(pkg.pricePerAdult).toLocaleString("en-IN")}</Text>
                        <Text style={styles.pricePer}>/ person</Text>
                      </>
                    ) : (
                      <Text style={styles.priceContact}>Get Quote</Text>
                    )}
                  </View>
                  <View style={styles.arrowCircle}>
                    <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {/* ── Popular Destinations ──────────────────────────────────── */}
      {destinations.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEye}>EXPLORE</Text>
              <Text style={styles.sectionTitle}>Popular Destinations</Text>
            </View>
            <Pressable style={styles.seeAll} onPress={() => router.push("/(tabs)/explore")}>
              <Text style={styles.seeAllText}>See All</Text>
              <Ionicons name="arrow-forward" size={13} color={Colors.primary} />
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.destRow}>
            {destinations.slice(0, 8).map((dest) => (
              <Pressable
                key={dest.id}
                style={styles.destCard}
                onPress={() => router.push({ pathname: "/(tabs)/explore", params: { locationId: dest.id } })}
              >
                {dest.imageUrl ? (
                  <Image source={{ uri: dest.imageUrl }} style={styles.destImage} />
                ) : (
                  <LinearGradient colors={[Colors.gradient1, Colors.gradient2]} style={styles.destImage} />
                )}
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.78)"]}
                  style={styles.destGrad}
                >
                  <Text style={styles.destName} numberOfLines={2}>{dest.label}</Text>
                  <View style={styles.destMeta}>
                    <Ionicons name="briefcase-outline" size={10} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.destCount}>{dest._count?.tourPackages || 0} pkg</Text>
                  </View>
                </LinearGradient>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Tour Categories ───────────────────────────────────────── */}
      {categories.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEye}>BROWSE BY TYPE</Text>
              <Text style={styles.sectionTitle}>Tour Categories</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
            {categories.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => router.push({ pathname: "/(tabs)/explore", params: { category: cat } })}
              >
                <LinearGradient
                  colors={[Colors.gradient1, Colors.gradient2]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.catChip}
                >
                  <Ionicons name="compass-outline" size={14} color="#fff" />
                  <Text style={styles.catChipText}>{cat}</Text>
                </LinearGradient>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Why Us ───────────────────────────────────────────────── */}
      <View style={styles.whySection}>
        <Text style={styles.sectionEye}>WHY TRAVEL WITH US</Text>
        <Text style={styles.whyTitle}>The Aagam Difference</Text>
        {[
          { icon: "sparkles" as const,        title: "Handcrafted Itineraries", desc: "Every trip meticulously planned by our experts." },
          { icon: "shield-checkmark" as const, title: "Safe & Secure",           desc: "Your safety is our top priority, always." },
          { icon: "headset" as const,          title: "24/7 Support",            desc: "Dedicated team available round the clock." },
          { icon: "chatbubbles" as const,      title: "Live Trip Chat",          desc: "Stay connected with your group in-app." },
        ].map((f) => (
          <View key={f.title} style={styles.featureRow}>
            <LinearGradient colors={[Colors.gradient1, Colors.gradient2]} style={styles.featureIcon}>
              <Ionicons name={f.icon} size={20} color="#fff" />
            </LinearGradient>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <View style={styles.ctaWrap}>
        <LinearGradient
          colors={[Colors.gradient1, Colors.gradient2]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.ctaCard}
        >
          <View style={styles.ctaIconWrap}>
            <Ionicons name="airplane" size={26} color="#fff" />
          </View>
          <Text style={styles.ctaTitle}>Ready for Your Next Adventure?</Text>
          <Text style={styles.ctaSub}>Our travel experts craft personalised itineraries just for you</Text>
          <View style={styles.ctaBtns}>
            <Pressable style={styles.ctaBtn} onPress={() => Linking.openURL(`tel:${PHONE_NUMBER}`)}>
              <Ionicons name="call" size={16} color={Colors.primary} />
              <Text style={styles.ctaBtnText}>Call Us</Text>
            </Pressable>
            <Pressable
              style={[styles.ctaBtn, styles.ctaBtnWA]}
              onPress={() => Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}?text=Hi, I would like to plan a tour.`)}
            >
              <Ionicons name="logo-whatsapp" size={16} color="#fff" />
              <Text style={[styles.ctaBtnText, { color: "#fff" }]}>WhatsApp</Text>
            </Pressable>
          </View>
        </LinearGradient>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background },
  loadingText: { marginTop: Spacing.md, color: Colors.textSecondary, fontSize: FontSize.md },

  // ── Hero
  hero: { paddingTop: 56, paddingBottom: 44, paddingHorizontal: Spacing.xl },
  heroBrand: { fontSize: FontSize.xs, fontWeight: "700", color: "rgba(255,255,255,0.7)", letterSpacing: 3, marginBottom: Spacing.sm },
  heroTitle: { fontSize: FontSize.hero, fontWeight: "800", color: "#fff", lineHeight: 42, marginBottom: Spacing.xs },
  heroSubtitle: { fontSize: FontSize.md, color: "rgba(255,255,255,0.85)", marginBottom: Spacing.xl, lineHeight: 22 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 13,
  },
  searchInput: { flex: 1, fontSize: FontSize.md, color: Colors.text },

  // ── Ledge
  ledge: { height: 24, backgroundColor: Colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -24 },

  // ── Stats
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginTop: -Spacing.xs,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    gap: 3,
    ...Shadows.medium,
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 2 },
  statValue: { fontSize: FontSize.lg, fontWeight: "800", color: Colors.text },
  statLabel: { fontSize: 10, color: Colors.textSecondary, textAlign: "center" },

  // ── Section header
  section: { paddingBottom: Spacing.md },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    paddingTop: Spacing.md,
  },
  sectionEye: { fontSize: 10, fontWeight: "700", color: Colors.primary, letterSpacing: 1.5, marginBottom: 3 },
  sectionTitle: { fontSize: FontSize.xl, fontWeight: "700", color: Colors.text },
  seeAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  seeAllText: { fontSize: FontSize.xs, fontWeight: "700", color: Colors.primary },

  // ── Package card (full-bleed)
  pkgCard: {
    height: 220,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    ...Shadows.medium,
  },
  pkgImage: { position: "absolute", width: "100%", height: "100%" },
  pkgOverlay: { position: "absolute", left: 0, right: 0, bottom: 0, height: "75%" },
  pkgTop: {
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
  pkgBottomLeft: { flex: 1, marginRight: Spacing.sm },
  locRow: { flexDirection: "row", alignItems: "center", gap: 3, marginBottom: 4 },
  locText: { fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: "500" },
  pkgTitle: { fontSize: FontSize.lg, fontWeight: "800", color: "#fff", lineHeight: 22, marginBottom: 4 },
  itinRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  itinText: { fontSize: 11, color: "rgba(255,255,255,0.7)" },
  pkgBottomRight: { alignItems: "flex-end", gap: Spacing.xs },
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
  arrowCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#fff", justifyContent: "center", alignItems: "center" },

  // ── Destinations
  destRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  destCard: { width: 140, height: 180, borderRadius: BorderRadius.lg, overflow: "hidden", ...Shadows.medium },
  destImage: { width: "100%", height: "100%" },
  destGrad: { position: "absolute", bottom: 0, left: 0, right: 0, padding: Spacing.sm, paddingTop: 40 },
  destName: { fontSize: FontSize.sm, fontWeight: "700", color: "#fff", lineHeight: 18 },
  destMeta: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  destCount: { fontSize: 10, color: "rgba(255,255,255,0.8)" },

  // ── Categories
  catRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  catChip: { flexDirection: "row", alignItems: "center", gap: Spacing.xs, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full },
  catChipText: { fontSize: FontSize.sm, fontWeight: "700", color: "#fff" },

  // ── Why Us
  whySection: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    padding: Spacing.xl,
    backgroundColor: Colors.primaryBg,
    borderRadius: BorderRadius.xl,
  },
  whyTitle: { fontSize: FontSize.xl, fontWeight: "700", color: Colors.text, marginBottom: Spacing.lg, marginTop: 4 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginBottom: Spacing.md },
  featureIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  featureText: { flex: 1 },
  featureTitle: { fontSize: FontSize.md, fontWeight: "700", color: Colors.text },
  featureDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },

  // ── CTA
  ctaWrap: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl },
  ctaCard: { borderRadius: BorderRadius.xl, padding: Spacing.xl, alignItems: "center" },
  ctaIconWrap: { width: 56, height: 56, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center", marginBottom: Spacing.md },
  ctaTitle: { fontSize: FontSize.xl, fontWeight: "800", color: "#fff", textAlign: "center", marginBottom: Spacing.xs, lineHeight: 28 },
  ctaSub: { fontSize: FontSize.sm, color: "rgba(255,255,255,0.85)", textAlign: "center", lineHeight: 20, marginBottom: Spacing.lg },
  ctaBtns: { flexDirection: "row", gap: Spacing.md },
  ctaBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs, backgroundColor: "#fff", borderRadius: BorderRadius.lg, paddingVertical: Spacing.md },
  ctaBtnText: { fontSize: FontSize.sm, fontWeight: "700", color: Colors.primary },
  ctaBtnWA: { backgroundColor: "#25D366" },
});
