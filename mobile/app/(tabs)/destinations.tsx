import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { travelApi } from "@/lib/api";

export default function DestinationsScreen() {
  const router = useRouter();
  const [destinations, setDestinations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDestinations = useCallback(async () => {
    try {
      const data = await travelApi.getDestinations();
      setDestinations(data.destinations || []);
    } catch (error) {
      console.error("Failed to load destinations:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDestinations();
  }, [fetchDestinations]);

  const renderDestination = ({ item }: { item: any }) => (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/destinations/${item.id}`)}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />
      <View style={styles.overlay}>
        <Text style={styles.cardTitle}>{item.label}</Text>
        <Text style={styles.cardCount}>
          {item._count?.tourPackages || 0} Packages Available
        </Text>
        <View style={styles.arrowContainer}>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </View>
      </View>
    </Pressable>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>
        Choose from our handpicked destinations across the globe
      </Text>

      <FlatList
        data={destinations}
        keyExtractor={(item) => item.id}
        renderItem={renderDestination}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchDestinations();
            }}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <Ionicons name="map-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No destinations available yet</Text>
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
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  listContent: { padding: Spacing.md },
  row: { gap: Spacing.md, marginBottom: Spacing.md },
  card: {
    flex: 1,
    height: 200,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  cardImage: { width: "100%", height: "100%" },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  cardTitle: { fontSize: FontSize.lg, fontWeight: "700", color: "#fff" },
  cardCount: { fontSize: FontSize.xs, color: "rgba(255,255,255,0.8)" },
  arrowContainer: {
    position: "absolute",
    right: Spacing.md,
    top: Spacing.md,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
});
