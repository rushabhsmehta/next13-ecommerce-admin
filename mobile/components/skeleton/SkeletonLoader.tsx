import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { Colors, BorderRadius, Spacing } from "@/constants/theme";

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export function SkeletonLoader({
  width = "100%",
  height = 16,
  borderRadius = BorderRadius.md,
  style,
}: SkeletonLoaderProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width: width as any, height, borderRadius, opacity },
        style,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

interface SkeletonCardProps {
  imageHeight?: number;
  bodyPadding?: number;
}

export function SkeletonCard({ imageHeight = 210, bodyPadding = Spacing.lg }: SkeletonCardProps) {
  return (
    <View style={cardStyles.card}>
      <SkeletonLoader width="100%" height={imageHeight} borderRadius={0} />
      <View style={[cardStyles.body, { padding: bodyPadding }]}>
        <SkeletonLoader width="78%" height={14} style={cardStyles.line} />
        <SkeletonLoader width="52%" height={14} style={cardStyles.line} />
        <View style={cardStyles.footer}>
          <SkeletonLoader width={60} height={12} borderRadius={6} />
          <SkeletonLoader width={80} height={12} borderRadius={6} />
        </View>
      </View>
    </View>
  );
}

interface SkeletonRowProps {
  count?: number;
  gap?: number;
}

export function SkeletonRow({ count = 3, gap = Spacing.md }: SkeletonRowProps) {
  return (
    <View style={[rowStyles.row, { gap }]}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={rowStyles.item}>
          <SkeletonLoader width={80} height={80} borderRadius={BorderRadius.lg} />
          <SkeletonLoader width={60} height={12} style={{ marginTop: Spacing.sm }} />
          <SkeletonLoader width={40} height={10} style={{ marginTop: 4 }} />
        </View>
      ))}
    </View>
  );
}

interface SkeletonListItemProps {
  count?: number;
}

export function SkeletonListItem({ count = 5 }: SkeletonListItemProps) {
  return (
    <View style={listStyles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={listStyles.item}>
          <SkeletonLoader width={48} height={48} borderRadius={24} />
          <View style={listStyles.content}>
            <SkeletonLoader width="60%" height={14} />
            <SkeletonLoader width="40%" height={12} style={{ marginTop: 6 }} />
          </View>
          <SkeletonLoader width={40} height={12} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: Colors.surfaceAlt,
  },
});

const cardStyles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  body: {
    paddingTop: Spacing.md + 2,
    paddingBottom: Spacing.lg,
  },
  line: {
    marginBottom: 6,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
  },
  item: {
    alignItems: "center",
  },
});

const listStyles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    gap: 2,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  content: {
    flex: 1,
    gap: 4,
  },
});

interface SkeletonPackageDetailProps {
  insetsTop?: number;
}

export function SkeletonPackageDetail({ insetsTop = 0 }: SkeletonPackageDetailProps) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <View style={pkgStyles.container}>
      <Animated.View style={[pkgStyles.image, { opacity }]} />
      <View style={[pkgStyles.imageGradient, { opacity: 0.5 }]} />
      <View style={{ paddingTop: Spacing.xl }}>
        <Animated.View style={[pkgStyles.categoryBadge, { opacity }]} />
        <Animated.View style={[pkgStyles.title, { opacity }]} />
        <Animated.View style={[pkgStyles.metaRow, { opacity }]} />
        <View style={pkgStyles.tabBar}>
          {[1, 2, 3].map((i) => (
            <Animated.View key={i} style={[pkgStyles.tab, { opacity }]} />
          ))}
        </View>
        <View style={pkgStyles.content}>
          {[1, 2, 3, 4].map((i) => (
            <Animated.View key={i} style={[pkgStyles.contentLine, { opacity }]} />
          ))}
        </View>
      </View>
    </View>
  );
}

const pkgStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  image: { width: "100%", height: 320, backgroundColor: Colors.surfaceAlt },
  imageGradient: { position: "absolute", top: 0, left: 0, right: 0, height: 96, backgroundColor: Colors.surfaceAlt },
  categoryBadge: { height: 24, width: 80, borderRadius: BorderRadius.full, backgroundColor: Colors.surfaceAlt, marginHorizontal: Spacing.xl, marginBottom: Spacing.md },
  title: { height: 28, width: "70%", backgroundColor: Colors.surfaceAlt, borderRadius: BorderRadius.md, marginHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  metaRow: { height: 40, width: "50%", backgroundColor: Colors.surfaceAlt, borderRadius: BorderRadius.md, marginHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  tabBar: { flexDirection: "row", marginHorizontal: Spacing.xl, backgroundColor: Colors.surfaceAlt, borderRadius: BorderRadius.lg, padding: 4 },
  tab: { flex: 1, height: 36, borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceAlt },
  content: { padding: Spacing.xl, gap: Spacing.md },
  contentLine: { height: 16, backgroundColor: Colors.surfaceAlt, borderRadius: BorderRadius.sm },
});