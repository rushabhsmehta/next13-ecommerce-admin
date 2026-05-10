import { useMemo, useState } from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  Colors,
  Spacing,
  FontSize,
  BorderRadius,
  Shadows,
} from "@/constants/theme";
import { splitPackageName } from "@/lib/rich-text";

export type HomePackage = {
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

export const PACKAGE_CARD_CAROUSEL_WIDTH = 268;

type Props = {
  pkg: HomePackage;
  onPress: () => void;
  testID?: string;
  /** Horizontal carousel strip vs full-width list */
  variant?: "list" | "carousel";
};

export function PackageCard({ pkg, onPress, testID, variant = "list" }: Props) {
  const isCarousel = variant === "carousel";
  const imageUrl = pkg.images?.[0]?.url;
  const [imageFailed, setImageFailed] = useState(false);
  const displayPrice = pkg.pricePerAdult || pkg.price;
  const priceNum =
    displayPrice != null && String(displayPrice).trim() !== ""
      ? Number(displayPrice)
      : NaN;
  const formattedPrice = Number.isFinite(priceNum)
    ? `₹${priceNum.toLocaleString("en-IN")}`
    : null;
  const nameParts = useMemo(
    () => splitPackageName(pkg.tourPackageName ?? "Tour Package"),
    [pkg.tourPackageName]
  );

  return (
    <Pressable
      testID={testID}
      style={[styles.card, isCarousel && styles.cardCarousel]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${nameParts.title} package`}
      accessibilityHint="View package details and enquire"
    >
      <View style={[styles.imageWrap, isCarousel && styles.imageWrapCarousel]}>
        {imageUrl && !imageFailed ? (
          <Image
            source={{ uri: imageUrl }}
            style={[styles.image, isCarousel && styles.imageCarousel]}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <View
            style={[styles.image, isCarousel && styles.imageCarousel, styles.imageFallback]}
          >
            <Ionicons name="image-outline" size={32} color={Colors.textTertiary} />
            <Text style={styles.imageFallbackText} numberOfLines={1}>
              {pkg.location?.label || "Photo coming soon"}
            </Text>
          </View>
        )}

        {imageUrl && !imageFailed ? (
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.62)"]}
            locations={[0, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.imageGradient}
            pointerEvents="none"
          />
        ) : null}

        {pkg.numDaysNight ? (
          <View style={styles.durationBadge}>
            <Ionicons name="time-outline" size={10} color="#fff" />
            <Text style={styles.durationText}>{pkg.numDaysNight}</Text>
          </View>
        ) : null}

        {pkg.tourCategory ? (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{pkg.tourCategory}</Text>
          </View>
        ) : null}

        {pkg.location?.label && imageUrl && !imageFailed ? (
          <View style={styles.locationRow}>
            <Ionicons name="location" size={11} color="rgba(255,255,255,0.92)" />
            <Text style={styles.locationText} numberOfLines={1}>
              {pkg.location.label}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.body, isCarousel && styles.bodyCarousel]}>
        <Text style={[styles.name, isCarousel && styles.nameCarousel]} numberOfLines={2}>
          {nameParts.title}
        </Text>
        {nameParts.subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {nameParts.subtitle}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <View style={styles.trustRow}>
            <Ionicons name="ribbon-outline" size={14} color={Colors.primary} />
            <Text style={styles.trustLabel}>Curated tour</Text>
          </View>

          {formattedPrice ? (
            <View style={styles.priceBlock}>
              <Text style={styles.pricePrefix}>From </Text>
              <Text style={styles.price}>{formattedPrice}</Text>
              <Text style={styles.priceUnit}>/person</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background,
    overflow: "hidden",
    ...Shadows.medium,
  },
  cardCarousel: {
    width: PACKAGE_CARD_CAROUSEL_WIDTH,
    marginHorizontal: 0,
    marginTop: 0,
    marginRight: Spacing.sm,
    borderRadius: BorderRadius.lg,
    ...Shadows.light,
  },
  imageWrap: { position: "relative" },
  /** Fixed square + clip avoids RN Image percentage/aspectRatio gaps on carousel cards */
  imageWrapCarousel: {
    width: PACKAGE_CARD_CAROUSEL_WIDTH,
    height: PACKAGE_CARD_CAROUSEL_WIDTH,
    overflow: "hidden",
    backgroundColor: Colors.surfaceAlt,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
  },
  image: { width: "100%", height: 210 },
  imageCarousel: {
    width: PACKAGE_CARD_CAROUSEL_WIDTH,
    height: PACKAGE_CARD_CAROUSEL_WIDTH,
  },
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
  bodyCarousel: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    gap: 6,
  },
  name: {
    fontSize: FontSize.lg,
    fontWeight: "700",
    color: Colors.text,
    lineHeight: 22,
  },
  nameCarousel: {
    fontSize: FontSize.md,
    lineHeight: 19,
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
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
    marginRight: 8,
  },
  trustLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  priceBlock: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    maxWidth: "52%",
  },
  pricePrefix: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: "600",
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
