import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";
import { travelApi } from "@/lib/api";

export default function DestinationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [destinationName, setDestinationName] = useState("");

  useEffect(() => {
    if (id) {
      loadPackages();
    }
  }, [id]);

  const loadPackages = async () => {
    try {
      const data = await travelApi.getPackages({ locationId: id! });
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

  const renderPackage = ({ item }: { item: any }) => (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/packages/${item.slug || item.id}`)}
    >
      <Image source={{ uri: item.images?.[0]?.url }} style={styles.cardImage} />
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
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
  cardImage: { width: 120, height: 120 },
  cardBody: { flex: 1, padding: Spacing.md, justifyContent: "center" },
  name: { fontSize: FontSize.md, fontWeight: "600", color: Colors.text, marginBottom: 4 },
  duration: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 4 },
  price: { fontSize: FontSize.md, fontWeight: "700", color: Colors.primary },
  emptyText: { fontSize: FontSize.md, color: Colors.textSecondary },
});
