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
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { travelApi } from "@/lib/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function HomeScreen() {
  const router = useRouter();
  const [destinations, setDestinations] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [destData, pkgData] = await Promise.all([
        travelApi.getDestinations(),
        travelApi.getPackages({ limit: 6 }),
      ]);
      setDestinations(destData.destinations || []);
      setPackages(pkgData.packages || []);
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
      router.push(`/packages/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Discovering amazing places...</Text>
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
          onRefresh={() => {
            setRefreshing(true);
            fetchData();
          }}
          tintColor={Colors.primary}
        />
      }
    >
      {/* Hero Section */}
      <View style={styles.hero}>
        <View style={styles.heroOverlay}>
          <Text style={styles.heroTitle}>Discover Your{"\n"}Next Adventure</Text>
          <Text style={styles.heroSubtitle}>
            Handcrafted tours to stunning destinations
          </Text>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={Colors.textTertiary} />
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
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { icon: "map", label: "Destinations", value: `${destinations.length}+` },
          { icon: "calendar", label: "Packages", value: `${packages.length}+` },
          { icon: "people", label: "Happy Travelers", value: "10K+" },
        ].map((stat) => (
          <View key={stat.label} style={styles.statItem}>
            <Ionicons name={stat.icon as any} size={20} color={Colors.primary} />
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Featured Destinations */}
      {destinations.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionLabel}>EXPLORE</Text>
              <Text style={styles.sectionTitle}>Popular Destinations</Text>
            </View>
            <Pressable onPress={() => router.push("/(tabs)/destinations")}>
              <Text style={styles.seeAll}>See All →</Text>
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
                <View style={styles.destinationOverlay}>
                  <Text style={styles.destinationName}>{dest.label}</Text>
                  <Text style={styles.destinationCount}>
                    {dest._count?.tourPackages || 0} Packages
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Trending Packages */}
      {packages.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionLabel}>FEATURED</Text>
              <Text style={styles.sectionTitle}>Trending Packages</Text>
            </View>
            <Pressable onPress={() => router.push("/(tabs)/explore")}>
              <Text style={styles.seeAll}>See All →</Text>
            </Pressable>
          </View>

          {packages.slice(0, 6).map((pkg) => (
            <Pressable
              key={pkg.id}
              style={styles.packageCard}
              onPress={() => router.push(`/packages/${pkg.slug || pkg.id}`)}
            >
              <Image
                source={{ uri: pkg.images?.[0]?.url }}
                style={styles.packageImage}
              />
              {pkg.tourCategory && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{pkg.tourCategory}</Text>
                </View>
              )}
              {pkg.numDaysNight && (
                <View style={styles.durationBadge}>
                  <Ionicons name="time-outline" size={12} color="#fff" />
                  <Text style={styles.durationBadgeText}>{pkg.numDaysNight}</Text>
                </View>
              )}
              <View style={styles.packageInfo}>
                <Text style={styles.packageLocation}>
                  <Ionicons name="location" size={12} color={Colors.primary} />{" "}
                  {pkg.location?.label}
                </Text>
                <Text style={styles.packageName} numberOfLines={2}>
                  {pkg.tourPackageName || "Tour Package"}
                </Text>
                <View style={styles.packageFooter}>
                  {pkg.pricePerAdult ? (
                    <View>
                      <Text style={styles.priceLabel}>Starting from</Text>
                      <Text style={styles.priceValue}>
                        ₹{Number(pkg.pricePerAdult).toLocaleString("en-IN")}
                        <Text style={styles.priceUnit}>/person</Text>
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.priceLabel}>Contact for pricing</Text>
                  )}
                  <Ionicons
                    name="arrow-forward-circle"
                    size={28}
                    color={Colors.primary}
                  />
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {/* Why Choose Us */}
      <View style={styles.whySection}>
        <Text style={styles.sectionLabel}>WHY TRAVEL WITH US</Text>
        <Text style={styles.whyTitle}>The Aagam Holidays Difference</Text>

        {[
          { icon: "sparkles", title: "Handcrafted Itineraries", desc: "Every trip is meticulously planned by our travel experts." },
          { icon: "shield-checkmark", title: "Safe & Secure", desc: "Your safety is our priority with highest standards." },
          { icon: "headset", title: "24/7 Support", desc: "Dedicated support team available round the clock." },
          { icon: "chatbubbles", title: "Live Trip Chat", desc: "Stay connected with your tour group via in-app chat." },
        ].map((feature) => (
          <View key={feature.title} style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Ionicons name={feature.icon as any} size={24} color={Colors.primary} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDesc}>{feature.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={{ height: 40 }} />
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
    height: 280,
    backgroundColor: Colors.primaryDark,
    justifyContent: "flex-end",
  },
  heroOverlay: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  heroTitle: {
    fontSize: FontSize.hero,
    fontWeight: "800",
    color: "#fff",
    lineHeight: 38,
    marginBottom: Spacing.sm,
  },
  heroSubtitle: {
    fontSize: FontSize.lg,
    color: "rgba(255,255,255,0.8)",
    marginBottom: Spacing.lg,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.sm,
  },
  statItem: { alignItems: "center", gap: 2 },
  statValue: { fontSize: FontSize.xl, fontWeight: "700", color: Colors.text },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },

  // Section
  section: { paddingVertical: Spacing.xl },
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
    letterSpacing: 1,
    marginBottom: 2,
  },
  sectionTitle: { fontSize: FontSize.xxl, fontWeight: "700", color: Colors.text },
  seeAll: { fontSize: FontSize.sm, fontWeight: "600", color: Colors.primary },

  // Destination cards (horizontal scroll)
  horizontalList: { paddingHorizontal: Spacing.xl, gap: Spacing.md },
  destinationCard: {
    width: 160,
    height: 200,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  destinationImage: { width: "100%", height: "100%" },
  destinationOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  destinationName: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: "#fff",
  },
  destinationCount: {
    fontSize: FontSize.xs,
    color: "rgba(255,255,255,0.8)",
  },

  // Package cards
  packageCard: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
  },
  packageImage: { width: "100%", height: 180 },
  categoryBadge: {
    position: "absolute",
    top: Spacing.md,
    left: Spacing.md,
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  categoryBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    color: Colors.primary,
  },
  durationBadge: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  durationBadgeText: { fontSize: FontSize.xs, color: "#fff", fontWeight: "500" },
  packageInfo: { padding: Spacing.lg },
  packageLocation: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  packageName: {
    fontSize: FontSize.lg,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: Spacing.md,
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
  priceValue: { fontSize: FontSize.xl, fontWeight: "700", color: Colors.primary },
  priceUnit: { fontSize: FontSize.xs, fontWeight: "400", color: Colors.textSecondary },

  // Why section
  whySection: {
    padding: Spacing.xl,
    backgroundColor: Colors.primaryBg,
    marginTop: Spacing.lg,
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
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryBg,
    justifyContent: "center",
    alignItems: "center",
  },
  featureText: { flex: 1 },
  featureTitle: { fontSize: FontSize.md, fontWeight: "600", color: Colors.text },
  featureDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
});
