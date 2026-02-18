import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Linking,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from "@/constants/theme";
import { travelApi } from "@/lib/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function PackageDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [pkg, setPkg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([0]));
  const [activeTab, setActiveTab] = useState<"itinerary" | "inclusions" | "policies">("itinerary");

  useEffect(() => {
    if (id) {
      loadPackage();
    }
  }, [id]);

  const loadPackage = async () => {
    try {
      const data = await travelApi.getPackageBySlug(id!);
      setPkg(data);
    } catch (error) {
      console.error("Failed to load package:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (index: number) => {
    const next = new Set(expandedDays);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setExpandedDays(next);
  };

  const parseJsonContent = (content: any): string[] => {
    if (!content) return [];
    if (typeof content === "string") {
      try { content = JSON.parse(content); } catch { return [content]; }
    }
    if (Array.isArray(content)) {
      return content.map((item: any) => {
        if (typeof item === "string") return item;
        if (item?.content) return item.content;
        if (item?.text) return item.text;
        return String(item);
      }).filter(Boolean);
    }
    if (typeof content === "object" && content?.type === "doc" && content.content) {
      return content.content.flatMap((node: any) => {
        if (node.type === "paragraph" && node.content) {
          return node.content.map((c: any) => c.text || "").join("");
        }
        return "";
      }).filter(Boolean);
    }
    return [];
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!pkg) {
    return (
      <View style={styles.centered}>
        <View style={styles.errorIconWrap}>
          <Ionicons name="alert-circle" size={32} color={Colors.primary} />
        </View>
        <Text style={styles.errorText}>Package not found</Text>
      </View>
    );
  }

  const images = pkg.images || [];
  const itineraries = pkg.itineraries || [];
  const inclusions = parseJsonContent(pkg.inclusions);
  const exclusions = parseJsonContent(pkg.exclusions);
  const cancellationPolicy = parseJsonContent(pkg.cancellationPolicy);
  const paymentPolicy = parseJsonContent(pkg.paymentPolicy);
  const displayPrice = pkg.pricePerAdult || pkg.price;

  const tabs = [
    { key: "itinerary" as const, label: "Itinerary", icon: "calendar" },
    { key: "inclusions" as const, label: "Inclusions", icon: "checkmark-circle" },
    { key: "policies" as const, label: "Policies", icon: "document-text" },
  ];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <View style={styles.imageContainer}>
          {images.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(
                  e.nativeEvent.contentOffset.x / SCREEN_WIDTH
                );
                setActiveImageIndex(index);
              }}
            >
              {images.map((img: any, i: number) => (
                <Image
                  key={img.id || i}
                  source={{ uri: img.url }}
                  style={styles.heroImage}
                />
              ))}
            </ScrollView>
          ) : (
            <LinearGradient
              colors={[Colors.gradient1, Colors.gradient2]}
              style={[styles.heroImage, styles.placeholderImage]}
            >
              <Ionicons name="image" size={48} color="rgba(255,255,255,0.5)" />
            </LinearGradient>
          )}

          {/* Gradient overlay for dots */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.4)"]}
            style={styles.imageBottomGradient}
          />

          {/* Dots */}
          {images.length > 1 && (
            <View style={styles.dotsContainer}>
              {images.map((_: any, i: number) => (
                <View
                  key={i}
                  style={[styles.dot, i === activeImageIndex && styles.dotActive]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Package Info */}
        <View style={styles.infoSection}>
          {pkg.tourCategory && (
            <LinearGradient
              colors={[Colors.gradient1, Colors.gradient2]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.categoryBadge}
            >
              <Text style={styles.categoryText}>{pkg.tourCategory}</Text>
            </LinearGradient>
          )}
          <Text style={styles.packageName}>
            {pkg.tourPackageName || "Tour Package"}
          </Text>

          <View style={styles.metaRow}>
            {[
              { icon: "location", text: pkg.location?.label },
              { icon: "time", text: pkg.numDaysNight },
              itineraries.length > 0 ? { icon: "calendar", text: `${itineraries.length} Days` } : null,
            ].filter(Boolean).map((meta: any, i) => (
              <View key={i} style={styles.metaItem}>
                <View style={styles.metaIconWrap}>
                  <Ionicons name={meta.icon} size={12} color={Colors.primary} />
                </View>
                <Text style={styles.metaText}>{meta.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Tab Navigation — Pill Style */}
        <View style={styles.tabBar}>
          {tabs.map((tab) => (
            <Pressable
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={tab.icon as any}
                size={14}
                color={activeTab === tab.key ? "#fff" : Colors.textTertiary}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === "itinerary" && (
            <View>
              {itineraries.length === 0 ? (
                <Text style={styles.emptyTab}>Itinerary coming soon.</Text>
              ) : (
                itineraries.map((day: any, index: number) => {
                  const isExpanded = expandedDays.has(index);
                  return (
                    <Pressable
                      key={day.id}
                      style={styles.dayCard}
                      onPress={() => toggleDay(index)}
                    >
                      <View style={styles.dayHeader}>
                        <LinearGradient
                          colors={[Colors.gradient1, Colors.gradient2]}
                          style={styles.dayBadge}
                        >
                          <Text style={styles.dayBadgeText}>
                            D{day.dayNumber || index + 1}
                          </Text>
                        </LinearGradient>
                        <View style={styles.dayTitleWrap}>
                          <Text style={styles.dayTitle}>
                            {day.itineraryTitle || `Day ${day.dayNumber || index + 1}`}
                          </Text>
                          {day.hotel && (
                            <View style={styles.hotelRow}>
                              <Ionicons name="bed-outline" size={11} color={Colors.textSecondary} />
                              <Text style={styles.dayHotel}>{day.hotel.name}</Text>
                            </View>
                          )}
                        </View>
                        <Ionicons
                          name={isExpanded ? "chevron-up" : "chevron-down"}
                          size={18}
                          color={Colors.textTertiary}
                        />
                      </View>
                      {isExpanded && day.itineraryDescription && (
                        <Text style={styles.dayDescription}>
                          {day.itineraryDescription}
                        </Text>
                      )}
                      {isExpanded && day.activities?.length > 0 && (
                        <View style={styles.activitiesSection}>
                          {day.activities.map((act: any) => (
                            <View key={act.id} style={styles.activityItem}>
                              <View style={styles.activityDot} />
                              <View style={styles.activityContent}>
                                <Text style={styles.activityTitle}>
                                  {act.activityTitle}
                                </Text>
                                {act.activityDescription && (
                                  <Text style={styles.activityDesc}>
                                    {act.activityDescription}
                                  </Text>
                                )}
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </Pressable>
                  );
                })
              )}
            </View>
          )}

          {activeTab === "inclusions" && (
            <View style={styles.inclusionsGrid}>
              {inclusions.length > 0 && (
                <View style={styles.listSection}>
                  <View style={styles.listTitleRow}>
                    <View style={[styles.listTitleIcon, { backgroundColor: Colors.primaryBg }]}>
                      <Ionicons name="checkmark" size={14} color={Colors.primary} />
                    </View>
                    <Text style={styles.listTitle}>Inclusions</Text>
                  </View>
                  {inclusions.map((item, i) => (
                    <View key={i} style={styles.listItemRow}>
                      <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                      <Text style={styles.listItem}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}
              {exclusions.length > 0 && (
                <View style={styles.listSection}>
                  <View style={styles.listTitleRow}>
                    <View style={[styles.listTitleIcon, { backgroundColor: "#fef2f2" }]}>
                      <Ionicons name="close" size={14} color={Colors.error} />
                    </View>
                    <Text style={styles.listTitleRed}>Exclusions</Text>
                  </View>
                  {exclusions.map((item, i) => (
                    <View key={i} style={styles.listItemRow}>
                      <Ionicons name="close-circle" size={14} color={Colors.error} />
                      <Text style={styles.listItem}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {activeTab === "policies" && (
            <View>
              {cancellationPolicy.length > 0 && (
                <View style={styles.listSection}>
                  <View style={styles.listTitleRow}>
                    <View style={[styles.listTitleIcon, { backgroundColor: "#fef3c7" }]}>
                      <Ionicons name="alert-circle" size={14} color={Colors.warning} />
                    </View>
                    <Text style={styles.listTitle}>Cancellation Policy</Text>
                  </View>
                  {cancellationPolicy.map((item, i) => (
                    <View key={i} style={styles.listItemRow}>
                      <View style={styles.bulletDot} />
                      <Text style={styles.listItem}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}
              {paymentPolicy.length > 0 && (
                <View style={styles.listSection}>
                  <View style={styles.listTitleRow}>
                    <View style={[styles.listTitleIcon, { backgroundColor: Colors.primaryBg }]}>
                      <Ionicons name="card" size={14} color={Colors.primary} />
                    </View>
                    <Text style={styles.listTitle}>Payment Policy</Text>
                  </View>
                  {paymentPolicy.map((item, i) => (
                    <View key={i} style={styles.listItemRow}>
                      <View style={styles.bulletDot} />
                      <Text style={styles.listItem}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <View>
          {displayPrice ? (
            <>
              <Text style={styles.ctaPriceLabel}>Starting from</Text>
              <Text style={styles.ctaPrice}>
                ₹{Number(displayPrice).toLocaleString("en-IN")}
                <Text style={styles.ctaPriceUnit}> /person</Text>
              </Text>
            </>
          ) : (
            <Text style={styles.ctaPriceLabel}>Contact for pricing</Text>
          )}
        </View>
        <Pressable
          onPress={() => {
            Linking.openURL(
              `https://wa.me/?text=Hi, I'm interested in: ${pkg.tourPackageName}`
            );
          }}
        >
          <LinearGradient
            colors={[Colors.gradient1, Colors.gradient2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaButton}
          >
            <Ionicons name="logo-whatsapp" size={18} color="#fff" />
            <Text style={styles.ctaButtonText}>Enquire Now</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.md,
  },
  errorIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryBg,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: { fontSize: FontSize.md, color: Colors.textSecondary },

  // Image gallery
  imageContainer: { position: "relative" },
  heroImage: { width: SCREEN_WIDTH, height: 320 },
  placeholderImage: {
    justifyContent: "center",
    alignItems: "center",
  },
  imageBottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  dotsContainer: {
    position: "absolute",
    bottom: Spacing.lg,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  dotActive: { backgroundColor: "#fff", width: 24, borderRadius: 4 },

  // Info
  infoSection: { padding: Spacing.xl },
  categoryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.md,
  },
  categoryText: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },
  packageName: {
    fontSize: FontSize.xxxl,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: Spacing.lg,
    lineHeight: 32,
  },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.md },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.primaryBg,
    justifyContent: "center",
    alignItems: "center",
  },
  metaText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: "500" },

  // Tabs — pill style
  tabBar: {
    flexDirection: "row",
    marginHorizontal: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: { fontSize: FontSize.sm, color: Colors.textTertiary, fontWeight: "500" },
  tabTextActive: { color: "#fff", fontWeight: "700" },
  tabContent: { padding: Spacing.xl },
  emptyTab: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: "center",
    paddingVertical: Spacing.xxxl,
  },

  // Day cards
  dayCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    ...Shadows.light,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  dayBadge: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  dayBadgeText: { fontSize: FontSize.sm, fontWeight: "800", color: "#fff" },
  dayTitleWrap: { flex: 1 },
  dayTitle: { fontSize: FontSize.md, fontWeight: "700", color: Colors.text },
  hotelRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  dayHotel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  dayDescription: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    lineHeight: 21,
  },
  activitiesSection: { marginTop: Spacing.md, gap: Spacing.sm },
  activityItem: {
    flexDirection: "row",
    gap: Spacing.md,
    alignItems: "flex-start",
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primaryLight,
    marginTop: 6,
  },
  activityContent: { flex: 1 },
  activityTitle: { fontSize: FontSize.sm, fontWeight: "600", color: Colors.text },
  activityDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },

  // Inclusions
  inclusionsGrid: { gap: Spacing.xxl },
  listSection: { gap: Spacing.sm },
  listTitleRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginBottom: Spacing.sm },
  listTitleIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  listTitle: { fontSize: FontSize.lg, fontWeight: "700", color: Colors.text },
  listTitleRed: { fontSize: FontSize.lg, fontWeight: "700", color: Colors.error },
  listItemRow: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm, paddingLeft: 4 },
  listItem: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 22, flex: 1 },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.textTertiary,
    marginTop: 8,
  },

  // Bottom CTA
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    paddingBottom: Spacing.xxl,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    ...Shadows.heavy,
  },
  ctaPriceLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  ctaPrice: { fontSize: FontSize.xxl, fontWeight: "800", color: Colors.text },
  ctaPriceUnit: { fontSize: FontSize.xs, fontWeight: "400", color: Colors.textSecondary },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.full,
  },
  ctaButtonText: { fontSize: FontSize.md, fontWeight: "700", color: "#fff" },
});
