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
  Dimensions,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from "@/constants/theme";
import { travelApi } from "@/lib/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const PHONE_NUMBER = "+919724444701";
const WHATSAPP_NUMBER = "919724444701"; // Without +, for wa.me

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

      if (destResult.status === "fulfilled") {
        setDestinations(destResult.value.destinations || []);
      }

      if (pkgResult.status === "fulfilled") {
        const pkgs = pkgResult.value.packages || [];
        setPackages(pkgs);
        const cats = [
          ...new Set(pkgs.map((p: any) => p.tourCategory).filter(Boolean)),
        ] as string[];
        setCategories(cats);
      } else {
        console.error("Failed to load packages:", pkgResult.reason);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push({
        pathname: "/(tabs)/explore",
        params: { q: searchQuery.trim() },
      });
    }
  };

  const handleCategoryTap = (cat: string) => {
    router.push({
      pathname: "/(tabs)/explore",
      params: { category: cat },
    });
  };

  const handleCall = () => {
    Linking.openURL(`tel:${PHONE_NUMBER}`);
  };

  const handleWhatsApp = () => {
    Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}?text=Hi, I would like to plan a tour.`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Discovering amazing places...</Text>
      </View>
    );
  }

  const trendingPackages = packages;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchData();
          }}
          tintColor={Colors.primary}
        />
      }
    >
      {/* Hero Section with Gradient */}
      <LinearGradient
        colors={[Colors.gradient1, Colors.gradient2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroContent}>
          <Text style={styles.heroBrand}>AAGAM HOLIDAYS</Text>
          <Text style={styles.heroTitle}>
            Discover Your{"\n"}Next Adventure
          </Text>
          <Text style={styles.heroSubtitle}>
            Handcrafted tours to stunning destinations
          </Text>

          {/* Premium Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchIconWrap}>
              <Ionicons name="search" size={16} color="#fff" />
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Where do you want to go?"
              placeholderTextColor={Colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
          </View>
        </View>
      </LinearGradient>

      {/* Curved bottom overlay */}
      <View style={styles.curveOverlay} />

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        {[
          { icon: "map", label: "Destinations", value: `${destinations.length}+` },
          { icon: "briefcase", label: "Packages", value: "50+" },
          { icon: "heart", label: "Happy Travelers", value: "10K+" },
        ].map((stat) => (
          <View key={stat.label} style={styles.statCard}>
            <View style={styles.statIconWrap}>
              <Ionicons name={stat.icon as any} size={18} color={Colors.primary} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Trending Packages — shown first so users see them immediately */}
      {trendingPackages.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionLabel}>FEATURED</Text>
              <Text style={styles.sectionTitle}>Trending Packages</Text>
            </View>
            <Pressable
              style={styles.seeAllBtn}
              onPress={() => router.push("/(tabs)/explore")}
            >
              <Text style={styles.seeAllText}>See All</Text>
              <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
            </Pressable>
          </View>

          {trendingPackages.map((pkg) => (
            <Pressable
              key={pkg.id}
              style={styles.packageCard}
              onPress={() => router.push(`/packages/${pkg.slug || pkg.id}`)}
            >
              <View style={styles.packageImageWrap}>
                {pkg.images?.[0]?.url ? (
                  <Image
                    source={{ uri: pkg.images[0].url }}
                    style={styles.packageImage}
                  />
                ) : (
                  <LinearGradient
                    colors={[Colors.gradient1, Colors.gradient2]}
                    style={[styles.packageImage, { justifyContent: "center", alignItems: "center" }]}
                  >
                    <Ionicons name="image-outline" size={40} color="rgba(255,255,255,0.5)" />
                  </LinearGradient>
                )}
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.4)"]}
                  style={styles.packageImageOverlay}
                />
                {pkg.tourCategory && (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{pkg.tourCategory}</Text>
                  </View>
                )}
                {pkg.numDaysNight && (
                  <View style={styles.durationBadge}>
                    <Ionicons name="time-outline" size={11} color="#fff" />
                    <Text style={styles.durationBadgeText}>{pkg.numDaysNight}</Text>
                  </View>
                )}
              </View>
              <View style={styles.packageInfo}>
                <View style={styles.packageAccent} />
                <View style={styles.packageDetails}>
                  <View style={styles.packageLocationRow}>
                    <Ionicons name="location" size={12} color={Colors.primary} />
                    <Text style={styles.packageLocation}>{pkg.location?.label}</Text>
                  </View>
                  <Text style={styles.packageName} numberOfLines={2}>
                    {pkg.tourPackageName || "Tour Package"}
                  </Text>
                  <View style={styles.packageFooter}>
                    {pkg.pricePerAdult ? (
                      <View>
                        <Text style={styles.priceLabel}>Starting from</Text>
                        <Text style={styles.priceValue}>
                          ₹{Number(pkg.pricePerAdult).toLocaleString("en-IN")}
                          <Text style={styles.priceUnit}> /person</Text>
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.priceLabel}>Contact for pricing</Text>
                    )}
                    <View style={styles.arrowBtn}>
                      <Ionicons name="arrow-forward" size={16} color="#fff" />
                    </View>
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {/* Popular Destinations */}
      {destinations.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionLabel}>EXPLORE</Text>
              <Text style={styles.sectionTitle}>Popular Destinations</Text>
            </View>
            <Pressable
              style={styles.seeAllBtn}
              onPress={() => router.push("/(tabs)/explore")}
            >
              <Text style={styles.seeAllText}>See All</Text>
              <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {destinations.slice(0, 8).map((dest) => (
              <Pressable
                key={dest.id}
                style={styles.destinationCard}
                onPress={() => router.push(`/destinations/${dest.id}`)}
              >
                <Image
                  source={{ uri: dest.imageUrl }}
                  style={styles.destinationImage}
                />
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.75)"]}
                  style={styles.destinationGradient}
                >
                  <Text style={styles.destinationName}>{dest.label}</Text>
                  <View style={styles.destinationMeta}>
                    <Ionicons name="briefcase-outline" size={10} color="rgba(255,255,255,0.85)" />
                    <Text style={styles.destinationCount}>
                      {dest._count?.tourPackages || 0} Packages
                    </Text>
                  </View>
                </LinearGradient>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Browse by Category */}
      {categories.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionLabel}>BROWSE BY TYPE</Text>
              <Text style={styles.sectionTitle}>Tour Categories</Text>
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryChipList}
          >
            {categories.map((cat) => (
              <Pressable
                key={cat}
                style={styles.categoryChip}
                onPress={() => handleCategoryTap(cat)}
              >
                <LinearGradient
                  colors={[Colors.gradient1, Colors.gradient2]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.categoryChipGradient}
                >
                  <Ionicons name="compass-outline" size={14} color="#fff" />
                  <Text style={styles.categoryChipText}>{cat}</Text>
                </LinearGradient>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Why Choose Us */}
      <LinearGradient
        colors={[Colors.primaryBg, "#fff1e6"]}
        style={styles.whySection}
      >
        <Text style={styles.sectionLabel}>WHY TRAVEL WITH US</Text>
        <Text style={styles.whyTitle}>The Aagam Difference</Text>

        {[
          { icon: "sparkles", title: "Handcrafted Itineraries", desc: "Every trip is meticulously planned by our travel experts." },
          { icon: "shield-checkmark", title: "Safe & Secure", desc: "Your safety is our priority with highest standards." },
          { icon: "headset", title: "24/7 Support", desc: "Dedicated support team available round the clock." },
          { icon: "chatbubbles", title: "Live Trip Chat", desc: "Stay connected with your tour group via in-app chat." },
        ].map((feature) => (
          <View key={feature.title} style={styles.featureCard}>
            <LinearGradient
              colors={[Colors.gradient1, Colors.gradient2]}
              style={styles.featureIcon}
            >
              <Ionicons name={feature.icon as any} size={22} color="#fff" />
            </LinearGradient>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDesc}>{feature.desc}</Text>
            </View>
          </View>
        ))}
      </LinearGradient>

      {/* Plan Your Trip CTA */}
      <View style={styles.ctaSection}>
        <LinearGradient
          colors={[Colors.gradient1, Colors.gradient2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ctaCard}
        >
          <View style={styles.ctaIconWrap}>
            <Ionicons name="airplane" size={28} color="#fff" />
          </View>
          <Text style={styles.ctaTitle}>Ready for Your Next Adventure?</Text>
          <Text style={styles.ctaSubtitle}>
            Our travel experts craft personalized itineraries just for you
          </Text>
          <View style={styles.ctaButtons}>
            <Pressable style={styles.ctaButton} onPress={handleCall}>
              <Ionicons name="call" size={16} color={Colors.primary} />
              <Text style={styles.ctaButtonText}>Call Us</Text>
            </Pressable>
            <Pressable style={[styles.ctaButton, styles.ctaButtonWhatsApp]} onPress={handleWhatsApp}>
              <Ionicons name="logo-whatsapp" size={16} color="#fff" />
              <Text style={[styles.ctaButtonText, styles.ctaButtonTextWhatsApp]}>WhatsApp</Text>
            </Pressable>
          </View>
        </LinearGradient>
      </View>

      {/* Bottom spacer for floating tab bar */}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: Spacing.md,
    color: Colors.textSecondary,
    fontSize: FontSize.md,
  },

  // Hero
  hero: {
    paddingTop: 60,
    paddingBottom: 40,
  },
  heroContent: {
    paddingHorizontal: Spacing.xxl,
  },
  heroBrand: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 3,
    marginBottom: Spacing.sm,
  },
  heroTitle: {
    fontSize: FontSize.hero,
    fontWeight: "800",
    color: "#fff",
    lineHeight: 42,
    marginBottom: Spacing.sm,
  },
  heroSubtitle: {
    fontSize: FontSize.lg,
    color: "rgba(255,255,255,0.85)",
    marginBottom: Spacing.xxl,
    lineHeight: 24,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  searchIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    paddingVertical: Spacing.xs,
  },

  // Curved overlay
  curveOverlay: {
    height: 24,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.sm,
    ...Shadows.medium,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primaryBg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  statValue: { fontSize: FontSize.xl, fontWeight: "800", color: Colors.text },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },

  // Section
  section: { paddingVertical: Spacing.lg },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    color: Colors.primary,
    letterSpacing: 2,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: FontSize.xxl,
    fontWeight: "700",
    color: Colors.text,
  },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
  },
  seeAllText: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.primary,
  },

  // Category chips
  categoryChipList: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  categoryChip: {
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  categoryChipGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  categoryChipText: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: "#fff",
  },

  // Destination cards
  horizontalList: { paddingHorizontal: Spacing.xl, gap: Spacing.md },
  destinationCard: {
    width: 180,
    height: 220,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    ...Shadows.medium,
  },
  destinationImage: { width: "100%", height: "100%" },
  destinationGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    paddingTop: 60,
  },
  destinationName: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: "#fff",
  },
  destinationMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  destinationCount: {
    fontSize: FontSize.xs,
    color: "rgba(255,255,255,0.85)",
  },

  // Spotlight card
  spotlightCard: {
    marginHorizontal: Spacing.xl,
    height: 280,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    ...Shadows.heavy,
  },
  spotlightImage: {
    width: "100%",
    height: "100%",
  },
  spotlightOverlay: {
    position: "absolute",
    inset: 0,
    justifyContent: "space-between",
    padding: Spacing.xl,
  },
  spotlightBadgeRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  spotlightBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  spotlightBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    color: "#fff",
  },
  spotlightDurationBadge: {
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  spotlightDurationText: {
    fontSize: FontSize.xs,
    color: "#fff",
    fontWeight: "600",
  },
  spotlightInfo: {
    gap: 6,
  },
  spotlightLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  spotlightLocation: {
    fontSize: FontSize.sm,
    color: "rgba(255,255,255,0.8)",
  },
  spotlightName: {
    fontSize: FontSize.xxl,
    fontWeight: "800",
    color: "#fff",
    lineHeight: 28,
  },
  spotlightFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 4,
  },
  spotlightPriceLabel: {
    fontSize: FontSize.xs,
    color: "rgba(255,255,255,0.7)",
  },
  spotlightPrice: {
    fontSize: FontSize.xl,
    fontWeight: "800",
    color: "#fff",
  },
  spotlightPriceUnit: {
    fontSize: FontSize.xs,
    fontWeight: "400",
    color: "rgba(255,255,255,0.7)",
  },
  spotlightArrowBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  // Package cards
  packageCard: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background,
    overflow: "hidden",
    ...Shadows.medium,
  },
  packageImageWrap: { position: "relative" },
  packageImage: { width: "100%", height: 200 },
  packageImageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  categoryBadge: {
    position: "absolute",
    top: Spacing.md,
    left: Spacing.md,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  categoryBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },
  durationBadge: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  durationBadgeText: {
    fontSize: FontSize.xs,
    color: "#fff",
    fontWeight: "600",
  },
  packageInfo: {
    flexDirection: "row",
  },
  packageAccent: {
    width: 4,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  packageDetails: {
    flex: 1,
    padding: Spacing.lg,
  },
  packageLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  packageLocation: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  packageName: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: Spacing.md,
    lineHeight: 22,
  },
  packageFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.md,
  },
  priceLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  priceValue: { fontSize: FontSize.xl, fontWeight: "800", color: Colors.primary },
  priceUnit: { fontSize: FontSize.xs, fontWeight: "400", color: Colors.textSecondary },
  arrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  // Why section
  whySection: {
    padding: Spacing.xl,
    marginTop: Spacing.lg,
    marginHorizontal: Spacing.xl,
    borderRadius: BorderRadius.xl,
  },
  whyTitle: {
    fontSize: FontSize.xxl,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: Spacing.xl,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  featureText: { flex: 1 },
  featureTitle: { fontSize: FontSize.md, fontWeight: "700", color: Colors.text },
  featureDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 3, lineHeight: 19 },

  // CTA section
  ctaSection: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  ctaCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    alignItems: "center",
  },
  ctaIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  ctaTitle: {
    fontSize: FontSize.xxl,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    marginBottom: Spacing.sm,
    lineHeight: 30,
  },
  ctaSubtitle: {
    fontSize: FontSize.md,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  ctaButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  ctaButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: "#fff",
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  ctaButtonText: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.primary,
  },
  ctaButtonWhatsApp: {
    backgroundColor: "#25D366",
  },
  ctaButtonTextWhatsApp: {
    color: "#fff",
  },
});
