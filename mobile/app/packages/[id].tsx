import { useEffect, useState, useCallback } from "react";
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
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { travelApi } from "@/lib/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function PackageDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
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
        <Ionicons name="alert-circle" size={48} color={Colors.textTertiary} />
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
            <View style={[styles.heroImage, styles.placeholderImage]}>
              <Ionicons name="image" size={48} color="#fff" />
            </View>
          )}

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
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{pkg.tourCategory}</Text>
            </View>
          )}
          <Text style={styles.packageName}>
            {pkg.tourPackageName || "Tour Package"}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="location" size={14} color={Colors.primary} />
              <Text style={styles.metaText}>{pkg.location?.label}</Text>
            </View>
            {pkg.numDaysNight && (
              <View style={styles.metaItem}>
                <Ionicons name="time" size={14} color={Colors.primary} />
                <Text style={styles.metaText}>{pkg.numDaysNight}</Text>
              </View>
            )}
            {itineraries.length > 0 && (
              <View style={styles.metaItem}>
                <Ionicons name="calendar" size={14} color={Colors.primary} />
                <Text style={styles.metaText}>{itineraries.length} Days</Text>
              </View>
            )}
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabBar}>
          {[
            { key: "itinerary" as const, label: "Itinerary", icon: "calendar" },
            { key: "inclusions" as const, label: "Inclusions", icon: "checkmark-circle" },
            { key: "policies" as const, label: "Policies", icon: "document-text" },
          ].map((tab) => (
            <Pressable
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={tab.icon as any}
                size={16}
                color={activeTab === tab.key ? Colors.primary : Colors.textTertiary}
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
                        <View style={styles.dayBadge}>
                          <Text style={styles.dayBadgeText}>
                            D{day.dayNumber || index + 1}
                          </Text>
                        </View>
                        <View style={styles.dayTitleWrap}>
                          <Text style={styles.dayTitle}>
                            {day.itineraryTitle || `Day ${day.dayNumber || index + 1}`}
                          </Text>
                          {day.hotel && (
                            <Text style={styles.dayHotel}>
                              🏨 {day.hotel.name}
                            </Text>
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
                              <Text style={styles.activityTitle}>
                                🎯 {act.activityTitle}
                              </Text>
                              {act.activityDescription && (
                                <Text style={styles.activityDesc}>
                                  {act.activityDescription}
                                </Text>
                              )}
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
                  <Text style={styles.listTitle}>✅ Inclusions</Text>
                  {inclusions.map((item, i) => (
                    <Text key={i} style={styles.listItem}>• {item}</Text>
                  ))}
                </View>
              )}
              {exclusions.length > 0 && (
                <View style={styles.listSection}>
                  <Text style={styles.listTitleRed}>❌ Exclusions</Text>
                  {exclusions.map((item, i) => (
                    <Text key={i} style={styles.listItem}>• {item}</Text>
                  ))}
                </View>
              )}
            </View>
          )}

          {activeTab === "policies" && (
            <View>
              {cancellationPolicy.length > 0 && (
                <View style={styles.listSection}>
                  <Text style={styles.listTitle}>Cancellation Policy</Text>
                  {cancellationPolicy.map((item, i) => (
                    <Text key={i} style={styles.listItem}>• {item}</Text>
                  ))}
                </View>
              )}
              {paymentPolicy.length > 0 && (
                <View style={styles.listSection}>
                  <Text style={styles.listTitle}>Payment Policy</Text>
                  {paymentPolicy.map((item, i) => (
                    <Text key={i} style={styles.listItem}>• {item}</Text>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <View>
          {displayPrice ? (
            <>
              <Text style={styles.ctaPriceLabel}>Starting from</Text>
              <Text style={styles.ctaPrice}>
                ₹{Number(displayPrice).toLocaleString("en-IN")}
                <Text style={styles.ctaPriceUnit}>/person</Text>
              </Text>
            </>
          ) : (
            <Text style={styles.ctaPriceLabel}>Contact for pricing</Text>
          )}
        </View>
        <Pressable
          style={styles.ctaButton}
          onPress={() => {
            Linking.openURL(
              `https://wa.me/?text=Hi, I'm interested in: ${pkg.tourPackageName}`
            );
          }}
        >
          <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
          <Text style={styles.ctaButtonText}>Enquire Now</Text>
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
  errorText: { fontSize: FontSize.md, color: Colors.textSecondary },

  // Image gallery
  imageContainer: { position: "relative" },
  heroImage: { width: SCREEN_WIDTH, height: 300 },
  placeholderImage: {
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
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
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  dotActive: { backgroundColor: "#fff", width: 20 },

  // Info
  infoSection: { padding: Spacing.xl },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  categoryText: {
    fontSize: FontSize.xs,
    fontWeight: "600",
    color: Colors.primary,
  },
  packageName: {
    fontSize: FontSize.xxxl,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.lg },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: FontSize.sm, color: Colors.textSecondary },

  // Tabs
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.lg,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: Colors.primary },
  tabText: { fontSize: FontSize.sm, color: Colors.textTertiary, fontWeight: "500" },
  tabTextActive: { color: Colors.primary, fontWeight: "600" },
  tabContent: { padding: Spacing.xl },
  emptyTab: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: "center",
    paddingVertical: Spacing.xxxl,
  },

  // Day cards
  dayCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  dayBadge: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryBg,
    justifyContent: "center",
    alignItems: "center",
  },
  dayBadgeText: { fontSize: FontSize.sm, fontWeight: "700", color: Colors.primary },
  dayTitleWrap: { flex: 1 },
  dayTitle: { fontSize: FontSize.md, fontWeight: "600", color: Colors.text },
  dayHotel: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  dayDescription: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    lineHeight: 20,
  },
  activitiesSection: { marginTop: Spacing.md },
  activityItem: {
    backgroundColor: Colors.primaryBg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  activityTitle: { fontSize: FontSize.sm, fontWeight: "600", color: Colors.primaryDark },
  activityDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 4 },

  // Inclusions
  inclusionsGrid: { gap: Spacing.xl },
  listSection: { gap: Spacing.sm },
  listTitle: { fontSize: FontSize.lg, fontWeight: "600", color: Colors.text },
  listTitleRed: { fontSize: FontSize.lg, fontWeight: "600", color: Colors.error },
  listItem: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 22 },

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
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  ctaPriceLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  ctaPrice: { fontSize: FontSize.xxl, fontWeight: "700", color: Colors.text },
  ctaPriceUnit: { fontSize: FontSize.xs, fontWeight: "400", color: Colors.textSecondary },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  ctaButtonText: { fontSize: FontSize.md, fontWeight: "600", color: "#fff" },
});
