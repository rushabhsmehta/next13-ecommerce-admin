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
    if (id) loadPackage();
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
                const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setActiveImageIndex(index);
              }}
            >
              {images.map((img: any, i: number) => (
                <Image key={img.id || i} source={{ uri: img.url }} style={styles.heroImage} />
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
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.4)"]} style={styles.imageBottomGradient} />
          {images.length > 1 && (
            <View style={styles.dotsContainer}>
              {images.map((_: any, i: number) => (
                <View key={i} style={[styles.dot, i === activeImageIndex && styles.dotActive]} />
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
          <Text style={styles.packageName}>{pkg.tourPackageName || "Tour Package"}</Text>

          <View style={styles.metaRow}>
            {[
              pkg.location?.label ? { icon: "location", text: pkg.location.label } : null,
              pkg.numDaysNight ? { icon: "time", text: pkg.numDaysNight } : null,
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

        {/* Tab Navigation */}
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
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
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
                  const dayImages = day.itineraryImages || [];
                  const hotel = day.hotel;
                  const hotelImages = hotel?.images || [];
                  const activities = day.activities || [];

                  return (
                    <View key={day.id} style={styles.dayCard}>
                      {/* Day Header */}
                      <Pressable style={styles.dayHeader} onPress={() => toggleDay(index)}>
                        <LinearGradient
                          colors={[Colors.gradient1, Colors.gradient2]}
                          style={styles.dayBadge}
                        >
                          <Text style={styles.dayBadgeText}>D{day.dayNumber || index + 1}</Text>
                        </LinearGradient>
                        <View style={styles.dayTitleWrap}>
                          <Text style={styles.dayTitle}>
                            {day.itineraryTitle || `Day ${day.dayNumber || index + 1}`}
                          </Text>
                          {hotel && (
                            <View style={styles.hotelChip}>
                              <Ionicons name="bed-outline" size={10} color={Colors.primary} />
                              <Text style={styles.hotelChipText}>{hotel.name}</Text>
                            </View>
                          )}
                        </View>
                        <Ionicons
                          name={isExpanded ? "chevron-up" : "chevron-down"}
                          size={18}
                          color={Colors.textTertiary}
                        />
                      </Pressable>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <View style={styles.dayExpandedContent}>
                          {/* Day Images */}
                          {dayImages.length > 0 && (
                            <ScrollView
                              horizontal
                              showsHorizontalScrollIndicator={false}
                              contentContainerStyle={styles.dayImagesList}
                            >
                              {dayImages.map((img: any) => (
                                <Image
                                  key={img.id}
                                  source={{ uri: img.url }}
                                  style={styles.dayImage}
                                />
                              ))}
                            </ScrollView>
                          )}

                          {/* Description */}
                          {day.itineraryDescription && (
                            <Text style={styles.dayDescription}>{day.itineraryDescription}</Text>
                          )}

                          {/* Hotel Section */}
                          {hotel && (
                            <View style={styles.hotelSection}>
                              <View style={styles.sectionLabelRow}>
                                <Ionicons name="business" size={14} color={Colors.primary} />
                                <Text style={styles.sectionLabelText}>Accommodation</Text>
                              </View>
                              <View style={styles.hotelCard}>
                                {hotelImages.length > 0 ? (
                                  <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.hotelImagesList}
                                  >
                                    {hotelImages.map((img: any) => (
                                      <Image
                                        key={img.id}
                                        source={{ uri: img.url }}
                                        style={styles.hotelImage}
                                      />
                                    ))}
                                  </ScrollView>
                                ) : (
                                  <View style={styles.hotelImagePlaceholder}>
                                    <Ionicons name="business-outline" size={24} color={Colors.textTertiary} />
                                  </View>
                                )}
                                <View style={styles.hotelInfo}>
                                  <Text style={styles.hotelName}>{hotel.name}</Text>
                                  <View style={styles.hotelMeta}>
                                    {day.roomCategory && (
                                      <View style={styles.hotelMetaChip}>
                                        <Ionicons name="bed-outline" size={10} color={Colors.primary} />
                                        <Text style={styles.hotelMetaText}>{day.roomCategory}</Text>
                                      </View>
                                    )}
                                    {day.mealsIncluded && (
                                      <View style={styles.hotelMetaChip}>
                                        <Ionicons name="restaurant-outline" size={10} color={Colors.primary} />
                                        <Text style={styles.hotelMetaText}>{day.mealsIncluded}</Text>
                                      </View>
                                    )}
                                  </View>
                                </View>
                              </View>
                            </View>
                          )}

                          {/* Activities Section */}
                          {activities.length > 0 && (
                            <View style={styles.activitiesSection}>
                              <View style={styles.sectionLabelRow}>
                                <Ionicons name="flag" size={14} color={Colors.primary} />
                                <Text style={styles.sectionLabelText}>Activities</Text>
                              </View>
                              {activities.map((act: any) => {
                                const actImages = act.activityImages || [];
                                return (
                                  <View key={act.id} style={styles.activityCard}>
                                    {actImages.length > 0 && (
                                      <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={styles.activityImagesList}
                                      >
                                        {actImages.map((img: any) => (
                                          <Image
                                            key={img.id}
                                            source={{ uri: img.url }}
                                            style={styles.activityImage}
                                          />
                                        ))}
                                      </ScrollView>
                                    )}
                                    <Text style={styles.activityTitle}>{act.activityTitle}</Text>
                                    {act.activityDescription && (
                                      <Text style={styles.activityDesc}>{act.activityDescription}</Text>
                                    )}
                                  </View>
                                );
                              })}
                            </View>
                          )}
                        </View>
                      )}
                    </View>
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

const IMAGE_CARD_WIDTH = SCREEN_WIDTH * 0.65;

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
  placeholderImage: { justifyContent: "center", alignItems: "center" },
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

  // Tabs
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
  tabActive: { backgroundColor: Colors.primary },
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
    marginBottom: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    overflow: "hidden",
    ...Shadows.light,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.lg,
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
  hotelChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    alignSelf: "flex-start",
  },
  hotelChipText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: "500" },

  // Expanded day content
  dayExpandedContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },

  // Day images
  dayImagesList: { gap: Spacing.sm, marginBottom: Spacing.md },
  dayImage: {
    width: IMAGE_CARD_WIDTH,
    height: 160,
    borderRadius: BorderRadius.md,
  },

  // Description
  dayDescription: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 21,
    marginBottom: Spacing.md,
  },

  // Hotel section
  hotelSection: { marginBottom: Spacing.md },
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sectionLabelText: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.text,
    letterSpacing: 0.3,
  },
  hotelCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  hotelImagesList: { gap: Spacing.xs },
  hotelImage: {
    width: 200,
    height: 120,
    borderRadius: 0,
  },
  hotelImagePlaceholder: {
    height: 80,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: "center",
    alignItems: "center",
  },
  hotelInfo: { padding: Spacing.md },
  hotelName: { fontSize: FontSize.md, fontWeight: "700", color: Colors.text, marginBottom: 6 },
  hotelMeta: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  hotelMetaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  hotelMetaText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: "500" },

  // Activities section
  activitiesSection: { marginBottom: Spacing.sm },
  activityCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginBottom: Spacing.sm,
  },
  activityImagesList: { gap: Spacing.xs },
  activityImage: {
    width: 180,
    height: 100,
  },
  activityTitle: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.text,
    padding: Spacing.md,
    paddingBottom: 4,
  },
  activityDesc: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    lineHeight: 18,
  },

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
