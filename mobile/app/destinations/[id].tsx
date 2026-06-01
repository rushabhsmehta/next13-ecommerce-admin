import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  Pressable,
  Animated,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius, Shadows } from "@/constants/theme";
import { travelApi } from "@/lib/api";

export default function DestinationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [destinationName, setDestinationName] = useState("");
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

  const loadPackages = async () => {
    if (!id) return;
    try {
      const data = await travelApi.getPackages({ locationId: id });
      setPackages(data.packages || []);
      if (data.packages?.length > 0) {
        setDestinationName(data.packages[0].location?.label || "Destination");
      }
    } catch (error) {
      console.error("Failed to load packages:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadPackages();
    }
  }, [id]);

  const renderPackage = ({ item }: { item: any }) => {
    const imageUrl = item.images?.[0]?.url?.trim();

    return (
      <Pressable
        style={styles.card}
        onPress={() => router.push(`/packages/${item.slug || item.id}` as never)}
        accessibilityRole="button"
        accessibilityLabel={`View package ${item.tourPackageName || "Tour Package"}`}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.cardImage}
            accessibilityLabel="Package image"
          />
        ) : (
          <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
            <Ionicons name="image-outline" size={24} color={Colors.textTertiary} />
          </View>
        )}
      <View style={styles.cardBody}>
        <Text style={styles.name} numberOfLines={2}>
          {item.tourPackageName || "Tour Package"}
        </Text>
        {item.numDaysNight && (
          <Text style={styles.duration}>
            <Ionicons name="time-outline" size={12} color={Colors.textSecondary} />{" "}
            {item.numDaysNight}
          </Text>
        )}
        {item.pricePerAdult && (
          <Text style={styles.price}>
            ₹{Number(item.pricePerAdult).toLocaleString("en-IN")}/person
          </Text>
        )}
      </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Animated.View
          style={[styles.skeletonTitle, { opacity: skeletonOpacity }]}
        />
        {[1, 2, 3, 4].map((i) => (
          <Animated.View
            key={i}
            style={[styles.skeletonCard, { opacity: skeletonOpacity }]}
          >
            <View style={styles.skeletonCardImage} />
            <View style={styles.skeletonCardBody}>
              <View style={[styles.skeletonLine, { width: "70%" }]} />
              <View style={[styles.skeletonLine, { width: "45%", marginTop: 6 }]} />
              <View style={[styles.skeletonLine, { width: "55%", marginTop: 6 }]} />
            </View>
          </Animated.View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Packages in {destinationName || "this destination"}
      </Text>
      <FlatList
        data={packages}
        keyExtractor={(item) => item.id}
        renderItem={renderPackage}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Ionicons name="compass-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No packages available yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: "700",
    color: Colors.text,
    padding: Spacing.xl,
  },
  listContent: { padding: Spacing.lg, gap: Spacing.md },
  card: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: "row",
  },
  cardImage: { width: 120, height: 120, backgroundColor: Colors.surfaceAlt },
  cardImagePlaceholder: { alignItems: "center", justifyContent: "center" },
  cardBody: { flex: 1, padding: Spacing.md, justifyContent: "center" },
  name: { fontSize: FontSize.md, fontWeight: "600", color: Colors.text, marginBottom: 4 },
  duration: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 4 },
  price: { fontSize: FontSize.md, fontWeight: "700", color: Colors.primary },
  emptyText: { fontSize: FontSize.md, color: Colors.textSecondary },
  skeletonTitle: {
    height: 28,
    width: 180,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.xl,
    marginVertical: Spacing.lg,
  },
  skeletonCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    ...Shadows.light,
  },
  skeletonCardImage: { width: 120, height: 120, backgroundColor: Colors.surfaceAlt },
  skeletonCardBody: { flex: 1, padding: Spacing.md, justifyContent: "center" },
  skeletonLine: { height: 14, borderRadius: 6, backgroundColor: Colors.border },
});
