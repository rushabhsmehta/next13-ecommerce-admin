import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  Pressable,
  Dimensions,
  Linking,
  Share,
  Modal,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system/legacy";
import { downloadAndShareBrochurePdf } from "@/lib/share-brochure-pdf";
import { captureException, trackEvent } from "@/lib/analytics";
import {
  isPackageSaved,
  removeSavedPackage,
  savePackage,
} from "@/lib/saved-packages";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from "@/constants/theme";
import { travelApi } from "@/lib/api";
import { SkeletonPackageDetail } from "@/components/skeleton/SkeletonLoader";
import { AppHeader } from "@/components/ui/AppHeader";
import { MetaChip } from "@/components/ui/MetaChip";
import {
  extractDistanceDuration,
  extractPlainText,
  extractPlainTextLines,
  splitPackageName,
} from "@/lib/rich-text";

import {
  WHATSAPP_BUSINESS_NUMBER_E164,
  buildWaMeUrl,
} from "@/constants/whatsapp";
import { API_BASE_URL, getTravelPackageUrl } from "@/constants/api";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const HERO_HEIGHT = Math.min(SCREEN_HEIGHT * 0.42, 360);
const PHONE_NUMBER = WHATSAPP_BUSINESS_NUMBER_E164;

type TabKey = "itinerary" | "inclusions" | "policies";

const TABS: { key: TabKey; label: string }[] = [
  { key: "itinerary", label: "Itinerary" },
  { key: "inclusions", label: "Inclusions" },
  { key: "policies", label: "Policies" },
];

function formatTravelPrice(value: unknown): string | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return `₹${n.toLocaleString("en-IN")}`;
}

function formatOfferDate(value: unknown): string | null {
  if (!value) return null;
  const date = new Date(String(value));
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function PackageDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [pkg, setPkg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([0]));
  const [activeTab, setActiveTab] = useState<TabKey>("itinerary");
  const [heroErrored, setHeroErrored] = useState<Set<number>>(new Set());
  const [routeExpanded, setRouteExpanded] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    if (id) loadPackage();
  }, [id]);

  useEffect(() => {
    if (!pkg?.id) return;
    void isPackageSaved(pkg.id).then(setIsSaved);
    trackEvent("package_view", {
      packageId: pkg.id,
      slug: pkg.slug ?? null,
      location: pkg.location?.label ?? null,
    });
  }, [pkg?.id, pkg?.slug, pkg?.location?.label]);

  const loadPackage = async () => {
    try {
      const data = await travelApi.getPackageBySlug(id!);
      setPkg(data);
    } catch (error) {
      console.error("Failed to load package:", error);
      captureException(error, { screen: "package_detail", packageId: id });
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

  const nameParts = useMemo(
    () => splitPackageName(pkg?.tourPackageName ?? ""),
    [pkg?.tourPackageName]
  );

  const inclusions = useMemo(() => extractPlainTextLines(pkg?.inclusions), [pkg]);
  const exclusions = useMemo(() => extractPlainTextLines(pkg?.exclusions), [pkg]);
  const cancellationPolicy = useMemo(
    () => extractPlainTextLines(pkg?.cancellationPolicy),
    [pkg]
  );
  const paymentPolicy = useMemo(
    () => extractPlainTextLines(pkg?.paymentPolicy),
    [pkg]
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <SkeletonPackageDetail />
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

  const images: { id?: string; url?: string }[] = (pkg.images || []).filter((img: { id?: string; url?: string }) =>
    img.url?.trim()
  );
  const itineraries: any[] = pkg.itineraries || [];
  const isOfferActive = Boolean(pkg.isOfferActive);
  const displayPrice = isOfferActive
    ? pkg.offerPrice || pkg.pricePerAdult || pkg.price
    : pkg.pricePerAdult || pkg.price;
  const formattedPrice = formatTravelPrice(displayPrice);
  const formattedOriginalPrice = isOfferActive ? formatTravelPrice(pkg.offerOriginalPrice) : null;
  const offerEndsAt = formatOfferDate(pkg.offerEndsAt);
  const offerTerms = Array.isArray(pkg.offerTerms) ? pkg.offerTerms : [];
  const pricingDetails = [
    { label: "Adult", value: pkg.pricePerAdult },
    { label: "Child with bed", value: pkg.pricePerChildOrExtraBed },
    { label: "Child 5-12 no bed", value: pkg.pricePerChild5to12YearsNoBed },
    { label: "Child under 5", value: pkg.pricePerChildwithSeatBelow5Years },
  ]
    .map((item) => ({ ...item, formatted: formatTravelPrice(item.value) }))
    .filter((item) => item.formatted);

  const packageUrl = getTravelPackageUrl(pkg.slug, pkg.id);
  const shareMessage = `${nameParts.title} - Aagam Holidays${
    isOfferActive ? `\n${pkg.offerBadge || "Limited offer"} available` : ""
  }\n${packageUrl}`;

  const openShareModal = () => setShareModalVisible(true);
  const closeShareModal = () => setShareModalVisible(false);

  const handleCopyPackageLink = async () => {
    try {
      await Clipboard.setStringAsync(packageUrl);
      closeShareModal();
      trackEvent("package_share", { channel: "copy", packageId: pkg.id });
      Alert.alert("Copied", "Package link copied to clipboard.");
    } catch {
      Alert.alert("Could not copy", "Please try again.");
    }
  };

  const handleWhatsAppPackageShare = () => {
    closeShareModal();
    trackEvent("package_share", { channel: "whatsapp", packageId: pkg.id });
    void Linking.openURL(buildWaMeUrl(shareMessage));
  };

  const handleNativeSharePackage = async () => {
    try {
      closeShareModal();
      trackEvent("package_share", { channel: "native", packageId: pkg.id });
      await Share.share(
        Platform.OS === "ios"
          ? {
              title: nameParts.title,
              message: shareMessage,
              url: packageUrl,
            }
          : { title: nameParts.title, message: shareMessage }
      );
    } catch {
      /* user dismissed share sheet */
    }
  };

  const handleShareBrochurePdf = async () => {
    const brochureSlug = pkg.slug || pkg.id;
    const pdfUrl = `${API_BASE_URL}/api/travel/package-brochure/${encodeURIComponent(brochureSlug)}`;
    const safeFile =
      String(brochureSlug).replace(/[^a-zA-Z0-9-_]/g, "_") || "package";
    const targetUri = `${FileSystem.cacheDirectory}brochure-${safeFile}.pdf`;
    try {
      setPdfLoading(true);
      const shared = await downloadAndShareBrochurePdf({
        pdfUrl,
        cacheFileUri: targetUri,
        dialogTitle: nameParts.title,
      });
      if (shared) {
        trackEvent("package_share", { channel: "brochure_pdf", packageId: pkg.id });
        closeShareModal();
      }
    } finally {
      setPdfLoading(false);
    }
  };

  const handleEnquire = () => {
    trackEvent("enquiry_start", { packageId: pkg.id, locationId: pkg.location?.id ?? null });
    const locationId = pkg.location?.id;
    const locationLabel = pkg.location?.label ?? "";
    const packageName = encodeURIComponent(extractPlainText(pkg.tourPackageName) ?? "");
    if (locationId) {
      if (isOfferActive) {
        trackEvent("offer_enquiry_start", { packageId: pkg.id, locationId });
      }
      router.push(
        `/packages/enquiry?locationId=${locationId}&locationLabel=${encodeURIComponent(locationLabel)}&packageName=${packageName}&packageId=${encodeURIComponent(pkg.id)}${isOfferActive ? "&source=offer" : ""}` as never
      );
    } else {
      Linking.openURL(
        buildWaMeUrl(`Hi, I'm interested in: ${nameParts.title}`)
      );
    }
  };

  const handleToggleSaved = async () => {
    if (!pkg?.id) return;
    if (isSaved) {
      await removeSavedPackage(pkg.id);
      setIsSaved(false);
      trackEvent("package_unsaved", { packageId: pkg.id });
      return;
    }
    await savePackage({
      id: pkg.id,
      slug: pkg.slug ?? null,
      title: nameParts.title || "Tour Package",
      subtitle: nameParts.subtitle || null,
      imageUrl: images[0]?.url ?? null,
      locationLabel: pkg.location?.label ?? null,
      duration: nameParts.duration || pkg.numDaysNight || null,
      price: formattedPrice,
    });
    setIsSaved(true);
    trackEvent("package_saved", { packageId: pkg.id });
  };

  const stickyBarPaddingBottom = Math.max(insets.bottom, 12) + 8;
  const stickyBarHeight = 90 + stickyBarPaddingBottom;

  return (
    <View testID="package-detail-screen" style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        testID="package-detail-scroll"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: stickyBarHeight + Spacing.md }}
      >
        {/* Hero gallery */}
        <View style={styles.imageContainer}>
          {images.length > 0 ? (
            <ScrollView
              testID="package-image-gallery"
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setActiveImageIndex(index);
              }}
            >
              {images.map((img, i) => {
                const failed = heroErrored.has(i);
                if (failed || !img.url) {
                  return (
                    <View key={img.id || i} style={[styles.heroImage, styles.heroFallback]}>
                      <Ionicons
                        name="image-outline"
                        size={40}
                        color={Colors.textTertiary}
                      />
                      <Text style={styles.heroFallbackText}>
                        {pkg.location?.label || "Image unavailable"}
                      </Text>
                    </View>
                  );
                }
                return (
                  <Image
                    key={img.id || i}
                    source={{ uri: img.url }}
                    style={styles.heroImage}
                    resizeMode="cover"
                    onError={() =>
                      setHeroErrored((prev) => new Set(prev).add(i))
                    }
                    accessibilityLabel="Package image"
                  />
                );
              })}
            </ScrollView>
          ) : (
            <View style={[styles.heroImage, styles.heroFallback]}>
              <Ionicons name="image-outline" size={40} color={Colors.textTertiary} />
              <Text style={styles.heroFallbackText}>
                {pkg.location?.label || "Image unavailable"}
              </Text>
            </View>
          )}

          <LinearGradient
            colors={["rgba(0,0,0,0.45)", "transparent"]}
            style={styles.imageTopGradient}
            pointerEvents="none"
          />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.35)"]}
            style={styles.imageBottomGradient}
            pointerEvents="none"
          />

          <AppHeader
            onBack={() => router.back()}
            onShare={openShareModal}
            onSave={() => void handleToggleSaved()}
            isSaved={isSaved}
          />

          {images.length > 1 && (
            <View style={styles.imageCounter}>
              <Ionicons name="images-outline" size={11} color="#fff" />
              <Text style={styles.imageCounterText}>
                {activeImageIndex + 1}/{images.length}
              </Text>
            </View>
          )}

          {images.length > 1 && (
            <View style={styles.dotsContainer}>
              {images.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === activeImageIndex && styles.dotActive]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Title block */}
        <View style={styles.infoSection}>
          <View style={styles.chipRow}>
            {pkg.tourCategory ? (
              <MetaChip label={pkg.tourCategory} variant="solid" />
            ) : null}
            {pkg.location?.label ? (
              <MetaChip icon="location" label={pkg.location.label} />
            ) : null}
            {(pkg.numDaysNight || itineraries.length > 0) && (
              <MetaChip
                icon="time-outline"
                label={
                  nameParts.duration ||
                  pkg.numDaysNight ||
                  `${itineraries.length} Days`
                }
              />
            )}
          </View>

          <Text style={styles.packageName}>
            {nameParts.title || "Tour Package"}
          </Text>
          {nameParts.subtitle && (
            <Text style={styles.packageSubtitle}>{nameParts.subtitle}</Text>
          )}

          {nameParts.route && (
            <Pressable
              onPress={() => setRouteExpanded((v) => !v)}
              style={styles.routeRow}
              accessibilityRole="button"
              accessibilityLabel="Toggle route details"
              hitSlop={6}
            >
              <Ionicons
                name="map-outline"
                size={14}
                color={Colors.textSecondary}
              />
              <Text
                style={styles.routeText}
                numberOfLines={routeExpanded ? undefined : 1}
              >
                {nameParts.route}
              </Text>
            </Pressable>
          )}

          {isOfferActive ? (
            <View style={styles.offerPanel}>
              <View style={styles.offerPanelTop}>
                <View style={styles.offerIconWrap}>
                  <Ionicons name="pricetag" size={16} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.offerBadgeText}>
                    {pkg.offerBadge || "Limited Offer"}
                  </Text>
                  <Text style={styles.offerTitle}>
                    {pkg.offerTitle || "Special package offer"}
                  </Text>
                </View>
              </View>
              {pkg.offerSubtitle ? (
                <Text style={styles.offerSubtitle}>{pkg.offerSubtitle}</Text>
              ) : null}
              <View style={styles.offerPriceRow}>
                {formattedPrice ? (
                  <Text style={styles.offerPrice}>{formattedPrice}</Text>
                ) : null}
                {formattedOriginalPrice && formattedOriginalPrice !== formattedPrice ? (
                  <Text style={styles.offerOriginalPrice}>{formattedOriginalPrice}</Text>
                ) : null}
                {offerEndsAt ? (
                  <Text style={styles.offerValidity}>Valid till {offerEndsAt}</Text>
                ) : null}
              </View>
              {offerTerms.length > 0 ? (
                <Text style={styles.offerTerms} numberOfLines={2}>
                  {offerTerms.slice(0, 2).join(" · ")}
                </Text>
              ) : null}
            </View>
          ) : null}

          {pricingDetails.length > 0 ? (
            <View style={styles.pricingDetailsPanel}>
              <Text style={styles.pricingDetailsTitle}>Pricing Details</Text>
              {pricingDetails.map((item) => (
                <View key={item.label} style={styles.pricingDetailsRow}>
                  <Text style={styles.pricingDetailsLabel}>{item.label}</Text>
                  <Text style={styles.pricingDetailsValue}>{item.formatted}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {/* Underline tabs */}
        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                testID={`tab-${tab.key}`}
                style={styles.tab}
                onPress={() => setActiveTab(tab.key)}
                accessibilityRole="tab"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[styles.tabText, active && styles.tabTextActive]}
                >
                  {tab.label}
                </Text>
                <View
                  style={[styles.tabUnderline, active && styles.tabUnderlineActive]}
                />
              </Pressable>
            );
          })}
        </View>

        {/* Tab content */}
        <View style={styles.tabContent}>
          {activeTab === "itinerary" && (
            <View testID="itinerary-content">
              {itineraries.length === 0 ? (
                <Text style={styles.emptyTab}>Itinerary coming soon.</Text>
              ) : (
                itineraries.map((day, index) => {
                  const isExpanded = expandedDays.has(index);
                  const dayImages = (day.itineraryImages || []).filter((img: any) =>
                    img.url?.trim()
                  );
                  const hotel = day.hotel;
                  const hotelImages = (hotel?.images || []).filter((img: any) =>
                    img.url?.trim()
                  );
                  const activities = day.activities || [];
                  const titleParts = extractDistanceDuration(day.itineraryTitle);
                  const description = extractPlainText(day.itineraryDescription);

                  return (
                    <View key={day.id} style={styles.dayCard}>
                      <Pressable
                        style={styles.dayHeader}
                        onPress={() => toggleDay(index)}
                        accessibilityRole="button"
                        accessibilityLabel={`Day ${day.dayNumber || index + 1}: ${titleParts.cleanedTitle}`}
                        accessibilityHint="Tap to expand the day details"
                        accessibilityState={{ expanded: isExpanded }}
                      >
                        <LinearGradient
                          colors={[Colors.gradient1, Colors.gradient2]}
                          style={styles.dayBadge}
                        >
                          <Text style={styles.dayBadgeText}>
                            D{day.dayNumber || index + 1}
                          </Text>
                        </LinearGradient>
                        <View style={styles.dayTitleWrap}>
                          <Text style={styles.dayTitle} numberOfLines={2}>
                            {titleParts.cleanedTitle ||
                              `Day ${day.dayNumber || index + 1}`}
                          </Text>
                          {(titleParts.distance || titleParts.duration || hotel) && (
                            <View style={styles.dayChipRow}>
                              {titleParts.distance && (
                                <View style={styles.dayInlineChip}>
                                  <Ionicons
                                    name="car-outline"
                                    size={10}
                                    color={Colors.primary}
                                  />
                                  <Text style={styles.dayInlineChipText}>
                                    {titleParts.distance}
                                  </Text>
                                </View>
                              )}
                              {titleParts.duration && (
                                <View style={styles.dayInlineChip}>
                                  <Ionicons
                                    name="time-outline"
                                    size={10}
                                    color={Colors.primary}
                                  />
                                  <Text style={styles.dayInlineChipText}>
                                    {titleParts.duration}
                                  </Text>
                                </View>
                              )}
                              {hotel && (
                                <View style={styles.dayInlineChip}>
                                  <Ionicons
                                    name="bed-outline"
                                    size={10}
                                    color={Colors.primary}
                                  />
                                  <Text
                                    style={styles.dayInlineChipText}
                                    numberOfLines={1}
                                  >
                                    {hotel.name}
                                  </Text>
                                </View>
                              )}
                            </View>
                          )}
                        </View>
                        <Ionicons
                          name={isExpanded ? "chevron-up" : "chevron-down"}
                          size={18}
                          color={Colors.textTertiary}
                        />
                      </Pressable>

                      {isExpanded && (
                        <View style={styles.dayExpandedContent}>
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
                                  resizeMode="cover"
                                  accessibilityLabel="Day itinerary image"
                                />
                              ))}
                            </ScrollView>
                          )}

                          {description ? (
                            <Text style={styles.dayDescription}>{description}</Text>
                          ) : null}

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
                                        resizeMode="cover"
                                        accessibilityLabel="Hotel image"
                                      />
                                    ))}
                                  </ScrollView>
                                ) : (
                                  <View style={styles.hotelImagePlaceholder}>
                                    <Ionicons
                                      name="business-outline"
                                      size={24}
                                      color={Colors.textTertiary}
                                    />
                                  </View>
                                )}
                                <View style={styles.hotelInfo}>
                                  <Text style={styles.hotelName}>{hotel.name}</Text>
                                  <View style={styles.hotelMeta}>
                                    {day.roomCategory && (
                                      <View style={styles.hotelMetaChip}>
                                        <Ionicons
                                          name="bed-outline"
                                          size={10}
                                          color={Colors.primary}
                                        />
                                        <Text style={styles.hotelMetaText}>
                                          {day.roomCategory}
                                        </Text>
                                      </View>
                                    )}
                                    {day.mealsIncluded && (
                                      <View style={styles.hotelMetaChip}>
                                        <Ionicons
                                          name="restaurant-outline"
                                          size={10}
                                          color={Colors.primary}
                                        />
                                        <Text style={styles.hotelMetaText}>
                                          {day.mealsIncluded}
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                </View>
                              </View>
                            </View>
                          )}

                          {activities.length > 0 && (
                            <View style={styles.activitiesSection}>
                              <View style={styles.sectionLabelRow}>
                                <Ionicons name="flag" size={14} color={Colors.primary} />
                                <Text style={styles.sectionLabelText}>Activities</Text>
                              </View>
                              {activities.map((act: any) => {
                const actImages = (act.activityImages || []).filter((img: any) =>
                  img.url?.trim()
                );
                                const actDesc = extractPlainText(act.activityDescription);
                                const actTitle = extractPlainText(act.activityTitle);
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
                                            resizeMode="cover"
                                            accessibilityLabel="Activity image"
                                          />
                                        ))}
                                      </ScrollView>
                                    )}
                                    <Text style={styles.activityTitle}>{actTitle}</Text>
                                    {actDesc ? (
                                      <Text style={styles.activityDesc}>{actDesc}</Text>
                                    ) : null}
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
            <View testID="inclusions-content" style={styles.inclusionsGrid}>
              {inclusions.length > 0 && (
                <View style={styles.listSection}>
                  <View style={styles.listTitleRow}>
                    <View
                      style={[styles.listTitleIcon, { backgroundColor: Colors.primaryBg }]}
                    >
                      <Ionicons name="checkmark" size={14} color={Colors.primary} />
                    </View>
                    <Text style={styles.listTitle}>Inclusions</Text>
                  </View>
                  {inclusions.map((item, i) => (
                    <Text key={i} style={styles.policyParagraph}>
                      {item}
                    </Text>
                  ))}
                </View>
              )}
              {exclusions.length > 0 && (
                <View style={styles.listSection}>
                  <View style={styles.listTitleRow}>
                    <View
                      style={[styles.listTitleIcon, { backgroundColor: "#fef2f2" }]}
                    >
                      <Ionicons name="close" size={14} color={Colors.error} />
                    </View>
                    <Text style={styles.listTitleRed}>Exclusions</Text>
                  </View>
                  {exclusions.map((item, i) => (
                    <Text key={i} style={styles.policyParagraph}>
                      {item}
                    </Text>
                  ))}
                </View>
              )}
              {inclusions.length === 0 && exclusions.length === 0 && (
                <Text style={styles.emptyTab}>No inclusions added yet.</Text>
              )}
            </View>
          )}

          {activeTab === "policies" && (
            <View testID="policies-content">
              {cancellationPolicy.length > 0 && (
                <View style={styles.listSection}>
                  <View style={styles.listTitleRow}>
                    <View
                      style={[styles.listTitleIcon, { backgroundColor: "#fef3c7" }]}
                    >
                      <Ionicons name="alert-circle" size={14} color={Colors.warning} />
                    </View>
                    <Text style={styles.listTitle}>Cancellation Policy</Text>
                  </View>
                  {cancellationPolicy.map((item, i) => (
                    <Text key={i} style={styles.policyParagraph}>
                      {item}
                    </Text>
                  ))}
                </View>
              )}
              {paymentPolicy.length > 0 && (
                <View style={styles.listSection}>
                  <View style={styles.listTitleRow}>
                    <View
                      style={[styles.listTitleIcon, { backgroundColor: Colors.primaryBg }]}
                    >
                      <Ionicons name="card" size={14} color={Colors.primary} />
                    </View>
                    <Text style={styles.listTitle}>Payment Policy</Text>
                  </View>
                  {paymentPolicy.map((item, i) => (
                    <Text key={i} style={styles.policyParagraph}>
                      {item}
                    </Text>
                  ))}
                </View>
              )}
              {cancellationPolicy.length === 0 && paymentPolicy.length === 0 && (
                <Text style={styles.emptyTab}>No policies added yet.</Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky bottom bar */}
      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: stickyBarPaddingBottom,
          },
        ]}
      >
        <Pressable
          style={styles.bottomCallButton}
          onPress={() => Linking.openURL(`tel:${PHONE_NUMBER}`)}
          accessibilityRole="button"
          accessibilityLabel="Call us"
          accessibilityHint="Opens the dialer to call Aagam Holidays"
          hitSlop={6}
        >
          <Ionicons name="call-outline" size={20} color={Colors.text} />
        </Pressable>
        <Pressable
          testID="package-detail-share-bar"
          style={styles.bottomCallButton}
          onPress={openShareModal}
          accessibilityRole="button"
          accessibilityLabel="Share package"
          accessibilityHint="Copy link, WhatsApp, brochure PDF, or other apps"
          hitSlop={6}
        >
          <Ionicons name="share-outline" size={20} color={Colors.text} />
        </Pressable>
        <View style={styles.bottomPriceBlock}>
          {formattedPrice ? (
            <>
              <Text style={styles.ctaPriceLabel}>{isOfferActive ? "Offer" : "From"}</Text>
              <View style={styles.ctaPriceRow}>
                <Text style={styles.ctaPrice}>{formattedPrice}</Text>
                <Text style={styles.ctaPriceUnit}>/person</Text>
              </View>
              {formattedOriginalPrice && formattedOriginalPrice !== formattedPrice ? (
                <Text style={styles.ctaOriginalPrice}>{formattedOriginalPrice}</Text>
              ) : null}
            </>
          ) : (
            <>
              <Text style={styles.ctaPriceLabel}>Custom quote</Text>
              <Text style={styles.ctaPriceContact}>Tap to enquire</Text>
            </>
          )}
        </View>
        <Pressable
          testID="enquiry-cta"
          onPress={handleEnquire}
          accessibilityRole="button"
          accessibilityLabel="Enquire now"
          accessibilityHint="Opens the enquiry form for this package"
          style={({ pressed }) => [pressed && { opacity: 0.85 }]}
        >
          <LinearGradient
            colors={[Colors.gradient1, Colors.gradient2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaButton}
          >
            <Ionicons name="send" size={16} color="#fff" />
            <Text style={styles.ctaButtonText}>Enquire</Text>
          </LinearGradient>
        </Pressable>
      </View>

      <Modal
        visible={shareModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeShareModal}
      >
        <View style={styles.shareModalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={closeShareModal}
            accessibilityRole="button"
            accessibilityLabel="Dismiss share options"
          />
          <View style={styles.shareModalCard}>
            <Text style={styles.shareModalTitle}>Share package</Text>
            <Text style={styles.shareModalSubtitle} numberOfLines={2}>
              {nameParts.title}
            </Text>

            <Pressable
              testID="share-copy-link"
              style={styles.shareModalRow}
              onPress={() => void handleCopyPackageLink()}
              accessibilityRole="button"
              accessibilityLabel="Copy package link"
            >
              <Ionicons name="link-outline" size={22} color={Colors.primary} />
              <Text style={styles.shareModalRowText}>Copy link</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
            </Pressable>

            <Pressable
              testID="share-whatsapp"
              style={styles.shareModalRow}
              onPress={handleWhatsAppPackageShare}
              accessibilityRole="button"
              accessibilityLabel="Share via WhatsApp"
            >
              <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
              <Text style={styles.shareModalRowText}>WhatsApp</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
            </Pressable>

            <Pressable
              testID="share-native"
              style={styles.shareModalRow}
              onPress={() => void handleNativeSharePackage()}
              accessibilityRole="button"
              accessibilityLabel="Share with other apps"
            >
              <Ionicons name="share-social-outline" size={22} color={Colors.primary} />
              <Text style={styles.shareModalRowText}>More apps</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
            </Pressable>

            <Pressable
              testID="share-brochure-pdf"
              style={[styles.shareModalRow, pdfLoading && styles.shareModalRowDisabled]}
              onPress={() => void handleShareBrochurePdf()}
              disabled={pdfLoading}
              accessibilityRole="button"
              accessibilityLabel="Share brochure PDF"
              accessibilityHint="Downloads a short PDF overview of this package"
            >
              {pdfLoading ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons name="document-text-outline" size={22} color={Colors.primary} />
              )}
              <Text style={styles.shareModalRowText}>Brochure PDF</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
            </Pressable>

            <Pressable
              style={styles.shareModalCancel}
              onPress={closeShareModal}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.shareModalCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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

  // Hero
  imageContainer: { position: "relative" },
  heroImage: { width: SCREEN_WIDTH, height: HERO_HEIGHT },
  heroFallback: {
    backgroundColor: Colors.surfaceAlt,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.sm,
  },
  heroFallbackText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  imageTopGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 110,
  },
  imageBottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  imageCounter: {
    position: "absolute",
    bottom: Spacing.lg + 18,
    right: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.42)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  imageCounterText: {
    fontSize: FontSize.xs,
    color: "#fff",
    fontWeight: "700",
  },
  dotsContainer: {
    position: "absolute",
    bottom: Spacing.md,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  dotActive: { backgroundColor: "#fff", width: 18, borderRadius: 3 },

  // Title block
  infoSection: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 2,
  },
  packageName: {
    fontSize: FontSize.xxxl,
    fontWeight: "700",
    color: Colors.text,
    lineHeight: 32,
  },
  packageSubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: "500",
    marginTop: -2,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  routeText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  offerPanel: {
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: "#fcd34d",
    borderRadius: BorderRadius.lg,
    backgroundColor: "#fffbeb",
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  offerPanelTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  offerIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#f59e0b",
    alignItems: "center",
    justifyContent: "center",
  },
  offerBadgeText: {
    fontSize: FontSize.xs,
    color: "#92400e",
    fontWeight: "900",
    textTransform: "uppercase",
  },
  offerTitle: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: "800",
  },
  offerSubtitle: {
    fontSize: FontSize.sm,
    color: "#78350f",
    lineHeight: 19,
  },
  offerPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  offerPrice: { fontSize: FontSize.xl, color: "#b45309", fontWeight: "900" },
  offerOriginalPrice: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    fontWeight: "700",
    textDecorationLine: "line-through",
  },
  offerValidity: { fontSize: FontSize.xs, color: "#92400e", fontWeight: "800" },
  offerTerms: { fontSize: FontSize.xs, color: "#78350f", lineHeight: 17 },
  pricingDetailsPanel: {
    marginTop: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  pricingDetailsTitle: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  pricingDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  pricingDetailsLabel: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  pricingDetailsValue: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: "800",
  },

  // Tabs (underline)
  tabBar: {
    flexDirection: "row",
    marginTop: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    paddingHorizontal: Spacing.xl,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  tabText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  tabTextActive: { color: Colors.text, fontWeight: "700" },
  tabUnderline: {
    height: 3,
    width: "70%",
    backgroundColor: "transparent",
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  tabUnderlineActive: { backgroundColor: Colors.primary },

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
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    overflow: "hidden",
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
  },
  dayBadge: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  dayBadgeText: { fontSize: FontSize.xs + 1, fontWeight: "800", color: "#fff" },
  dayTitleWrap: { flex: 1, gap: 4 },
  dayTitle: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.text,
    lineHeight: 19,
  },
  dayChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  dayInlineChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    maxWidth: 160,
  },
  dayInlineChipText: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: "600",
  },

  dayExpandedContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },

  dayImagesList: { gap: Spacing.sm, marginBottom: Spacing.md },
  dayImage: {
    width: IMAGE_CARD_WIDTH,
    height: 160,
    borderRadius: BorderRadius.md,
  },

  dayDescription: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 21,
    marginBottom: Spacing.md,
  },

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
  hotelName: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 6,
  },
  hotelMeta: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  hotelMetaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  hotelMetaText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: "600" },

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

  // Inclusions / policies
  inclusionsGrid: { gap: Spacing.xxl },
  listSection: { gap: Spacing.sm },
  listTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  listTitleIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  listTitle: { fontSize: FontSize.lg, fontWeight: "700", color: Colors.text },
  listTitleRed: { fontSize: FontSize.lg, fontWeight: "700", color: Colors.error },
  listItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    paddingLeft: 4,
  },
  listItem: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
    flex: 1,
  },
  policyParagraph: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.textTertiary,
    marginTop: 8,
  },

  shareModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  shareModalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    zIndex: 2,
    elevation: 8,
    ...Shadows.heavy,
  },
  shareModalTitle: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingHorizontal: Spacing.md,
    marginBottom: 4,
  },
  shareModalSubtitle: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.text,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    lineHeight: 21,
  },
  shareModalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  shareModalRowDisabled: { opacity: 0.55 },
  shareModalRowText: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.text,
  },
  shareModalCancel: {
    marginTop: Spacing.xs,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  shareModalCancelText: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.textSecondary,
  },

  // Sticky bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    ...Shadows.heavy,
  },
  bottomCallButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: "center",
    alignItems: "center",
  },
  bottomPriceBlock: { flex: 1 },
  ctaPriceLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  ctaPriceRow: { flexDirection: "row", alignItems: "baseline", gap: 3 },
  ctaPrice: { fontSize: FontSize.xl, fontWeight: "800", color: Colors.text },
  ctaPriceUnit: {
    fontSize: FontSize.xs,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  ctaOriginalPrice: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: "600",
    textDecorationLine: "line-through",
  },
  ctaPriceContact: {
    fontSize: FontSize.sm,
    fontWeight: "700",
    color: Colors.text,
    marginTop: 1,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.full,
  },
  ctaButtonText: { fontSize: FontSize.md, fontWeight: "700", color: "#fff" },
});
